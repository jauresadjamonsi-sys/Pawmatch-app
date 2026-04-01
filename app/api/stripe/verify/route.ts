import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
export async function GET() {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ subscription: "free" });
    const { data: profile } = await supabase.from("profiles").select("stripe_customer_id, subscription").eq("id", user.id).single();
    if (!profile?.stripe_customer_id) return NextResponse.json({ subscription: profile?.subscription || "free" });
    const subscriptions = await stripe.subscriptions.list({ customer: profile.stripe_customer_id, status: "active", limit: 1 });
    if (subscriptions.data.length > 0) {
      const priceId = subscriptions.data[0].items.data[0].price.id;
      let plan = "free";
      if (priceId === "price_1THU72EMj8OWJcwzCJdkKfSm") plan = "premium";
      if (priceId === "price_1THU7nEMj8OWJcwz3jEa15py") plan = "pro";
      if (plan !== profile.subscription) await supabase.from("profiles").update({ subscription: plan }).eq("id", user.id);
      return NextResponse.json({ subscription: plan });
    }
    return NextResponse.json({ subscription: "free" });
  } catch { return NextResponse.json({ subscription: "free" }); }
}
