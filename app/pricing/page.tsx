"use client";

import { useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import Link from "next/link";

const PLANS = [
  {
    name: "Paw",
    price: "Gratuit",
    period: "",
    features: [
      "1 animal",
      "3 matchs par jour",
      "10 messages par jour",
      "Accès au catalogue",
    ],
    cta: null,
    popular: false,
    color: "bg-gray-50 border-gray-200",
  },
  {
    name: "PawPlus",
    price: "CHF 4.90",
    period: "/mois",
    priceId: "price_1THU72EMj8OWJcwzCJdkKfSm",
    features: [
      "3 animaux",
      "Matchs illimités",
      "Messages illimités",
      "Voir qui a liké",
      "Badge Premium",
      "Filtres avancés",
    ],
    cta: "Passer à PawPlus",
    popular: true,
    color: "bg-orange-50 border-orange-300",
  },
  {
    name: "PawPro",
    price: "CHF 9.90",
    period: "/mois",
    priceId: "price_1THU7nEMj8OWJcwz3jEa15py",
    features: [
      "Animaux illimités",
      "Tout PawPlus inclus",
      "Profil mis en avant",
      "Statistiques de visites",
      "Support prioritaire",
    ],
    cta: "Passer à PawPro",
    popular: false,
    color: "bg-purple-50 border-purple-300",
  },
];

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { profile, isAuthenticated } = useAuth();

  async function handleSubscribe(priceId: string) {
    if (!isAuthenticated) {
      window.location.href = "/login";
      return;
    }

    setLoading(priceId);
    setError(null);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Erreur inattendue");
      }
    } catch {
      setError("Erreur de connexion");
    }
    setLoading(null);
  }

  return (
    <div className="min-h-screen bg-gray-50 py-16 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Choisis ton plan Compaw
          </h1>
          <p className="text-gray-600 text-lg">
            Trouve le plan qui correspond à toi et ton compagnon
          </p>
        </div>

        {error && (
          <div className="max-w-md mx-auto mb-8 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={
                "rounded-2xl border-2 p-8 relative " +
                plan.color +
                (plan.popular ? " shadow-lg scale-105" : "")
              }
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs font-bold px-4 py-1 rounded-full">
                  Populaire
                </div>
              )}

              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {plan.name}
              </h2>
              <div className="mb-6">
                <span className="text-3xl font-bold text-gray-900">
                  {plan.price}
                </span>
                <span className="text-gray-500 text-sm">{plan.period}</span>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-green-500 font-bold">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              {plan.cta && plan.priceId ? (
                <button
                  onClick={() => handleSubscribe(plan.priceId!)}
                  disabled={loading === plan.priceId}
                  className={
                    "w-full py-3 font-semibold rounded-xl transition disabled:opacity-50 " +
                    (plan.popular
                      ? "bg-orange-500 hover:bg-orange-600 text-white"
                      : "bg-gray-900 hover:bg-gray-800 text-white")
                  }
                >
                  {loading === plan.priceId ? "Redirection..." : plan.cta}
                </button>
              ) : (
                <div className="w-full py-3 text-center text-gray-500 font-medium text-sm">
                  Plan actuel
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="text-center text-gray-400 text-sm mt-8">
          Annulable à tout moment. Paiement sécurisé par Stripe.
        </p>
      </div>
    </div>
  );
}
