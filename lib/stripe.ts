import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-03-31.basil",
});

export const PLANS = {
  free: {
    name: "Paw",
    price: 0,
    animals: 1,
    matchesPerDay: 3,
    messagesPerDay: 10,
  },
  premium: {
    name: "PawPlus",
    price: 490,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID,
    animals: 3,
    matchesPerDay: -1,
    messagesPerDay: -1,
  },
  pro: {
    name: "PawPro",
    price: 990,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
    animals: -1,
    matchesPerDay: -1,
    messagesPerDay: -1,
  },
};
