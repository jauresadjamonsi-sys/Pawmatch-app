import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

// Fresh Stripe instance per request — matches existing pattern
function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-03-25.dahlia" as any,
  });
}

const COIN_PACKS = [
  { id: "pack_50", coins: 50, price: 290, label: "50 PawCoins", popular: false },
  { id: "pack_150", coins: 150, price: 690, label: "150 PawCoins", popular: true },
  { id: "pack_500", coins: 500, price: 1990, label: "500 PawCoins", popular: false },
  { id: "pack_1200", coins: 1200, price: 3990, label: "1200 PawCoins", popular: false },
];

// GET — return available packs (public)
export async function GET() {
  return NextResponse.json({ packs: COIN_PACKS });
}

// POST — create Stripe checkout session for a one-time coin pack purchase
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
    }

    const { packId } = await request.json();
    const pack = COIN_PACKS.find((p) => p.id === packId);

    if (!pack) {
      return NextResponse.json({ error: "Pack invalide" }, { status: 400 });
    }

    // Get or create Stripe customer (same pattern as checkout route)
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id, email")
      .eq("id", user.id)
      .single();

    let customerId = profile?.stripe_customer_id;

    if (customerId) {
      try {
        await getStripe().customers.retrieve(customerId);
      } catch {
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
    const baseUrl = allowedOrigins.includes(origin || "") ? origin : "https://www.pawlyapp.ch";

    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "chf",
            product_data: {
              name: pack.label,
              description: `${pack.coins} PawCoins pour ton compte PawlyApp`,
              images: ["https://www.pawlyapp.ch/icon-512x512.png"],
            },
            unit_amount: pack.price,
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: "pawcoins",
        user_id: user.id,
        pack_id: pack.id,
        coins: pack.coins.toString(),
      },
      success_url: `${baseUrl}/wallet?purchase=success&coins=${pack.coins}`,
      cancel_url: `${baseUrl}/wallet?purchase=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("[PawCoins] Stripe checkout error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
