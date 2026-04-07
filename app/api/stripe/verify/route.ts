import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ subscription: "free" });

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json({ subscription: profile?.subscription || "free" });
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: profile.stripe_customer_id,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length > 0) {
      const priceId = subscriptions.data[0].items.data[0].price.id;
      let plan = "free";
      if (priceId === process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID) plan = "premium";
      if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID) plan = "pro";

      if (plan !== profile.subscription) {
        await supabase.from("profiles").update({ subscription: plan }).eq("id", user.id);
      }
      return NextResponse.json({ subscription: plan });
    }

    return NextResponse.json({ subscription: "free" });
  } catch {
    return NextResponse.json({ subscription: "free" });
  }
}
