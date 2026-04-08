import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

// Fresh Stripe instance per request — avoids stale module-level key issues
function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-03-25.dahlia" as any,
  });
}

// Server-side price lookup — no NEXT_PUBLIC_ dependency
const PRICE_IDS: Record<string, string> = {
  premium: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID || process.env.STRIPE_PREMIUM_PRICE_ID || "price_1TIe70E9B4j15xUNkDDBwuAt",
  pro: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || process.env.STRIPE_PRO_PRICE_ID || "price_1TIe71E9B4j15xUN6DplcQ4P",
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non connecté" }, { status: 401 });
    }

    const body = await request.json();
    const plan = body.plan;
    // Resolve price ID: server-side lookup from plan name, fallback to client-sent priceId
    const priceId = PRICE_IDS[plan] || body.priceId;

    if (!priceId) {
      return NextResponse.json({ error: "Plan invalide" }, { status: 400 });
    }

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    let customerId = profile?.stripe_customer_id;

    // Validate existing customer still exists in Stripe (handles test→live migration)
    if (customerId) {
      try {
        await getStripe().customers.retrieve(customerId);
      } catch {
        // Customer doesn't exist in current Stripe mode — reset it
        customerId = null;
      }
    }

    if (!customerId) {
      const customer = await getStripe().customers.create({
        email: profile?.email || user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;

      await supabase
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
    }

    const origin = request.headers.get("origin");
    const allowedOrigins = ["https://pawlyapp.ch", "https://www.pawlyapp.ch", "http://localhost:3000"];
    const baseUrl = allowedOrigins.includes(origin || "") ? origin : "https://pawlyapp.ch";

    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/profile?upgraded=true`,
      cancel_url: `${baseUrl}/pricing`,
      metadata: { supabase_user_id: user.id, plan },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Stripe checkout error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
