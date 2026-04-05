"use client";

import { useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import Link from "next/link";

const PLANS = [
  {
    key: "free",
    name: "Paw",
    emoji: "🐾",
    price: "Gratuit",
    period: "",
    features: [
      "1 animal",
      "3 matchs par jour",
      "10 messages par jour",
      "Accès au catalogue",
    ],
    color: "rgba(255,255,255,0.06)",
    border: "rgba(255,255,255,0.1)",
    cta: "Plan actuel",
    disabled: true,
  },
  {
    key: "premium",
    name: "PawPlus",
    emoji: "✨",
    price: "CHF 4.90",
    period: "/mois",
    popular: true,
    features: [
      "3 animaux",
      "Matchs illimités",
      "Messages illimités",
      "Voir qui t'a liké",
      "Badge Premium",
      "Filtres avancés",
    ],
    color: "rgba(255,107,53,0.08)",
    border: "rgba(255,107,53,0.3)",
    cta: "Choisir PawPlus",
    disabled: false,
  },
  {
    key: "pro",
    name: "PawPro",
    emoji: "🚀",
    price: "CHF 9.90",
    period: "/mois",
    features: [
      "Animaux illimités",
      "Tout PawPlus inclus",
      "Profil mis en avant",
      "Statistiques de visites",
      "Support prioritaire",
      "Accès événements VIP",
    ],
    color: "rgba(139,92,246,0.08)",
    border: "rgba(139,92,246,0.3)",
    cta: "Choisir PawPro",
    disabled: false,
  },
];

export default function PricingPage() {
  const { profile, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentPlan = profile?.subscription || "free";

  async function handleSubscribe(planKey: string) {
    if (!isAuthenticated) {
      window.location.href = "/login";
      return;
    }

    setLoading(planKey);
    setError(null);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: planKey,
          priceId:
            planKey === "premium"
              ? process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID
              : process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
        }),
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
        setLoading(null);
        return;
      }

      window.location.href = data.url;
    } catch {
      setError("Erreur inattendue. Réessayez.");
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen py-12 px-4" style={{ background: "var(--c-bg, #f9fafb)" }}>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4" style={{ color: "var(--c-text, #111827)" }}>
            Choisis ton plan
          </h1>
          <p className="text-lg max-w-md mx-auto" style={{ color: "var(--c-text-muted, #6b7280)" }}>
            Débloque toutes les fonctionnalités de Pawly et connecte-toi avec
            encore plus de compagnons.
          </p>
        </div>

        {error && (
          <div className="mb-8 p-4 border rounded-xl text-sm text-center max-w-md mx-auto bg-red-500/10 border-red-500/30 text-red-500">
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((plan) => {
            const isCurrent = currentPlan === plan.key;
            const isPopular = plan.popular;

            return (
              <div
                key={plan.key}
                className={`relative rounded-2xl border-2 p-8 flex flex-col ${
                  isPopular
                    ? "border-orange-400 shadow-lg"
                    : ""
                }`}
                style={{
                  background: "var(--c-card, #ffffff)",
                  borderColor: isPopular ? undefined : "var(--c-border, #f3f4f6)",
                }}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-orange-500 text-white text-xs font-bold rounded-full uppercase tracking-wide">
                    Populaire
                  </div>
                )}

                <div className="text-center mb-6">
                  <span className="text-4xl mb-3 block">{plan.emoji}</span>
                  <h2 className="text-xl font-bold mb-1" style={{ color: "var(--c-text, #111827)" }}>
                    {plan.name}
                  </h2>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-3xl font-bold" style={{ color: "var(--c-text, #111827)" }}>
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className="text-sm" style={{ color: "var(--c-text-muted, #9ca3af)" }}>
                        {plan.period}
                      </span>
                    )}
                  </div>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-3 text-sm"
                      style={{ color: "var(--c-text-muted, #4b5563)" }}
                    >
                      <svg
                        className={`w-5 h-5 flex-shrink-0 ${
                          isPopular ? "text-orange-500" : "text-green-500"
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <div
                    className="w-full py-3 font-semibold rounded-xl text-center text-sm"
                    style={{ background: "var(--c-border, #f3f4f6)", color: "var(--c-text-muted, #6b7280)" }}
                  >
                    Plan actuel
                  </div>
                ) : plan.key === "free" ? (
                  <div
                    className="w-full py-3 font-medium rounded-xl text-center text-sm"
                    style={{ background: "var(--c-bg, #f9fafb)", color: "var(--c-text-muted, #9ca3af)" }}
                  >
                    Inclus
                  </div>
                ) : (
                  <button
                    onClick={() => handleSubscribe(plan.key)}
                    disabled={loading === plan.key}
                    className={`w-full py-3 font-semibold rounded-xl transition text-sm disabled:opacity-50 ${
                      isPopular
                        ? "bg-orange-500 hover:bg-orange-600 text-white"
                        : "text-white"
                    }`}
                    style={!isPopular ? { background: "var(--c-text, #111827)" } : undefined}
                  >
                    {loading === plan.key ? "Redirection..." : plan.cta}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <p className="text-sm" style={{ color: "var(--c-text-muted, #9ca3af)" }}>
            Tous les prix sont en CHF. Annulation possible à tout moment.
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--c-text-muted, #9ca3af)" }}>
            Paiement sécurisé par Stripe. Aucune donnée bancaire stockée sur nos serveurs.
          </p>
        </div>
      </div>
    </div>
  );
}
