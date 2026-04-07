import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature")!;

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("[Webhook] Signature invalide:", err.message);
    return NextResponse.json({ error: "Webhook signature invalide" }, { status: 400 });
  }

  console.log("[Webhook] Event reçu:", event.type);

  try {
    switch (event.type) {
      // ═══ Premier paiement réussi ═══
      case "checkout.session.completed": {
        const session = event.data.object as any;
        const userId = session.metadata?.supabase_user_id;
        const plan = session.metadata?.plan;

        if (userId && plan && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          const endDate = new Date((subscription as any).current_period_end * 1000);

          const { error } = await supabaseAdmin
            .from("profiles")
            .update({
              subscription: plan,
              stripe_customer_id: session.customer,
              subscription_end: endDate.toISOString(),
            })
            .eq("id", userId);

          if (error) {
            console.error("[Webhook] Erreur update checkout:", error);
          } else {
            console.log(`[Webhook] ✅ ${userId} → ${plan} jusqu'au ${endDate.toLocaleDateString()}`);
            // PostHog server-side tracking
            try {
              const phKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
              const phHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com";
              if (phKey) {
                await fetch(`${phHost}/capture/`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ api_key: phKey, event: "subscription_started", distinct_id: userId, properties: { plan, amount: session.amount_total } }),
                });
              }
            } catch {}
          }
        }
        break;
      }

      // ═══ Renouvellement mensuel réussi ═══
      case "invoice.paid": {
        const invoice = event.data.object as any;
        const customerId = invoice.customer;
        const subscriptionId = invoice.subscription;

        if (customerId && subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const endDate = new Date((subscription as any).current_period_end * 1000);

          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("*")
            .eq("stripe_customer_id", customerId)
            .single();

          if (profile) {
            await supabaseAdmin
              .from("profiles")
              .update({ subscription_end: endDate.toISOString() })
              .eq("id", profile.id);

            console.log(`[Webhook] ✅ Renouvellement ${profile.id} jusqu'au ${endDate.toLocaleDateString()}`);
          }
        }
        break;
      }

      // ═══ Échec de paiement ═══
      case "invoice.payment_failed": {
        const invoice = event.data.object as any;
        const customerId = invoice.customer;

        if (customerId) {
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("*")
            .eq("stripe_customer_id", customerId)
            .single();

          if (profile) {
            console.log(`[Webhook] ⚠️ Paiement échoué pour ${profile.id}`);
            // On ne downgrade pas tout de suite — Stripe retente 3 fois
            // Le downgrade se fera via customer.subscription.deleted si tous les retries échouent
          }
        }
        break;
      }

      // ═══ Mise à jour abonnement (upgrade/downgrade) ═══
      case "customer.subscription.updated": {
        const subscription = event.data.object as any;
        const customerId = subscription.customer;

        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("*")
          .eq("stripe_customer_id", customerId)
          .single();

        if (profile) {
          const endDate = new Date(subscription.current_period_end * 1000);
          const isActive = subscription.status === "active" || subscription.status === "trialing";

          // Déterminer le plan à partir du price ID
          let plan: string | undefined;
          const priceId = subscription.items?.data?.[0]?.price?.id;
          if (priceId === process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID) plan = "premium";
          else if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID) plan = "pro";

          await supabaseAdmin
            .from("profiles")
            .update({
              subscription_end: endDate.toISOString(),
              ...(!isActive && { subscription: "free" }),
              ...(isActive && plan && { subscription: plan }),
            })
            .eq("id", profile.id);

          console.log(`[Webhook] 🔄 Subscription updated ${profile.id}: ${plan || "unknown"} (${subscription.status})`);
        }
        break;
      }

      // ═══ Annulation abonnement ═══
      case "customer.subscription.deleted": {
        const subscription = event.data.object as any;
        const customerId = subscription.customer;

        const { error } = await supabaseAdmin
          .from("profiles")
          .update({ subscription: "free", subscription_end: null })
          .eq("stripe_customer_id", customerId);

        if (!error) {
          console.log(`[Webhook] ❌ Subscription annulée pour customer ${customerId}`);
        }
        break;
      }
    }
  } catch (err: any) {
    console.error("[Webhook] Erreur traitement:", err.message);
    // On retourne 200 quand même pour que Stripe ne retente pas
    return NextResponse.json({ received: true, error: err.message });
  }

  return NextResponse.json({ received: true });
}
