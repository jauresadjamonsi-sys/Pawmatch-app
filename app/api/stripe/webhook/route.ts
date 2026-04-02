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
    return NextResponse.json({ error: "Webhook signature invalide" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as any;
      const userId = session.metadata.supabase_user_id;
      const plan = session.metadata.plan;

      if (userId && plan) {
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        const endDate = new Date((subscription as any).current_period_end * 1000);

        await supabaseAdmin
          .from("profiles")
          .update({
            subscription: plan,
            stripe_customer_id: session.customer,
            subscription_end: endDate.toISOString(),
          })
          .eq("id", userId);
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as any;
      const customerId = subscription.customer;

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .single();

      if (profile) {
        const endDate = new Date(subscription.current_period_end * 1000);
        const status = subscription.status === "active" ? undefined : "free";

        await supabaseAdmin
          .from("profiles")
          .update({
            subscription_end: endDate.toISOString(),
            ...(status && { subscription: status }),
          })
          .eq("id", profile.id);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as any;
      const customerId = subscription.customer;

      await supabaseAdmin
        .from("profiles")
        .update({ subscription: "free", subscription_end: null })
        .eq("stripe_customer_id", customerId);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
