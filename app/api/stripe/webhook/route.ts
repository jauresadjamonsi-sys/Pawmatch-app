import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// Fresh Stripe instance per request — avoids stale module-level key issues
function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-03-25.dahlia" as any,
  });
}

// Fresh Supabase admin client per request
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature")!;

  const stripeClient = getStripe();
  const supabaseAdmin = getSupabaseAdmin();

  let event;

  try {
    event = stripeClient.webhooks.constructEvent(
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

        // ═══ PawCoins one-time purchase ═══
        if (session.metadata?.type === "pawcoins") {
          const pcUserId = session.metadata.user_id;
          const coins = parseInt(session.metadata.coins || "0", 10);

          if (pcUserId && coins > 0) {
            const { data: pcProfile } = await supabaseAdmin
              .from("profiles")
              .select("pawcoins")
              .eq("id", pcUserId)
              .single();

            const currentBalance = pcProfile?.pawcoins ?? 0;
            const newBalance = currentBalance + coins;

            await Promise.all([
              supabaseAdmin
                .from("profiles")
                .update({ pawcoins: newBalance })
                .eq("id", pcUserId),
              supabaseAdmin.from("pawcoin_transactions").insert({
                user_id: pcUserId,
                amount: coins,
                type: "purchase",
                description: `Achat de ${coins} PawCoins`,
                balance_after: newBalance,
              }),
              supabaseAdmin.from("notifications").insert({
                user_id: pcUserId,
                type: "system",
                title: `+${coins} PawCoins!`,
                body: `Tes ${coins} PawCoins ont ete credites sur ton compte.`,
                link: "/wallet",
              }),
            ]);

            console.log(`[Webhook] ✅ PawCoins: +${coins} pour ${pcUserId} (solde: ${newBalance})`);
          }
          break;
        }

        // ═══ Subscription purchase ═══
        const userId = session.metadata?.supabase_user_id;
        const plan = session.metadata?.plan;

        if (userId && plan && session.subscription) {
          const subscription = await stripeClient.subscriptions.retrieve(session.subscription);
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
            } catch (err) {
              console.error("[Stripe Webhook] PostHog capture failed:", err);
            }
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
          const subscription = await stripeClient.subscriptions.retrieve(subscriptionId);
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

          // Déterminer le plan à partir du price ID — avec fallback hardcodé
          let plan: string | undefined;
          const priceId = subscription.items?.data?.[0]?.price?.id;
          const premiumPriceId = process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID || "price_1TIe70E9B4j15xUNkDDBwuAt";
          const proPriceId = process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || "price_1TIe71E9B4j15xUN6DplcQ4P";
          if (priceId === premiumPriceId) plan = "premium";
          else if (priceId === proPriceId) plan = "pro";

          const isCanceledOrUnpaid = subscription.status === "canceled" || subscription.status === "unpaid";

          await supabaseAdmin
            .from("profiles")
            .update({
              ...(isActive
                ? { subscription_end: endDate.toISOString() }
                : { subscription_end: isCanceledOrUnpaid ? null : endDate.toISOString() }),
              ...(!isActive && { subscription: "free" }),
              ...(isActive && plan && { subscription: plan }),
            })
            .eq("id", profile.id);

          console.log(`[Webhook] 🔄 Subscription updated ${profile.id}: ${isActive ? (plan || "unknown") : "free"} (${subscription.status})`);
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
    return NextResponse.json({ received: true, error: err.message });
  }

  return NextResponse.json({ received: true });
}
