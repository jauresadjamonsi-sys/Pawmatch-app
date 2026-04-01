import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
export async function POST(request: Request) {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const body = await request.text();
    const sig = request.headers.get("stripe-signature")!;
    let event: Stripe.Event;
    try { event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!); } catch { return NextResponse.json({ error: "Signature invalide" }, { status: 400 }); }
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const subscriptionId = session.subscription as string;
      if (userId && subscriptionId) {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = sub.items.data[0].price.id;
        let plan = "free";
        if (priceId === "price_1THU72EMj8OWJcwzCJdkKfSm") plan = "premium";
        if (priceId === "price_1THU7nEMj8OWJcwz3jEa15py") plan = "pro";
        await supabaseAdmin.from("profiles").update({ subscription: plan, stripe_customer_id: session.customer as string, subscription_end: new Date(sub.items.data[0].current_period_end * 1000).toISOString() }).eq("id", userId);
      }
    }
    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;
      await supabaseAdmin.from("profiles").update({ subscription: "free", subscription_end: null }).eq("stripe_customer_id", sub.customer as string);
    }
    return NextResponse.json({ received: true });
  } catch { return NextResponse.json({ error: "Erreur webhook" }, { status: 500 }); }
}
