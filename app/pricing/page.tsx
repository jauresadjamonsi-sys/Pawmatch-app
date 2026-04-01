"use client";

import { useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";

const PLANS = [
  {
    name: "Paw",
    tier: "gratuit",
    price: "Gratuit",
    period: "",
    features: ["1 animal", "3 matchs par jour", "10 messages par jour", "Acces au catalogue"],
    cta: null,
    popular: false,
    border: "border-white/10",
    bg: "bg-white/5",
    accent: "text-gray-500",
  },
  {
    name: "PawPlus",
    tier: "premium",
    price: "CHF 4.90",
    period: "/mois",
    priceId: "price_1THU72EMj8OWJcwzCJdkKfSm",
    features: ["3 animaux", "Matchs illimites", "Messages illimites", "Voir qui a like", "Badge Premium", "Filtres avances"],
    cta: "Passer a PawPlus",
    popular: true,
    border: "border-orange-500/50",
    bg: "bg-orange-500/5",
    accent: "text-orange-400",
  },
  {
    name: "PawPro",
    tier: "pro",
    price: "CHF 9.90",
    period: "/mois",
    priceId: "price_1THU7nEMj8OWJcwz3jEa15py",
    features: ["Animaux illimites", "Tout PawPlus inclus", "Profil mis en avant", "Statistiques de visites", "Support prioritaire"],
    cta: "Passer a PawPro",
    popular: false,
    border: "border-purple-500/50",
    bg: "bg-purple-500/5",
    accent: "text-purple-400",
  },
];

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();

  async function handleSubscribe(priceId: string) {
    if (!isAuthenticated) { window.location.href = "/login"; return; }
    setLoading(priceId);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      const data = await res.json();
      if (data.url) { window.location.href = data.url; } else { setError(data.error || "Erreur inattendue"); }
    } catch { setError("Erreur de connexion"); }
    setLoading(null);
  }

  return (
    <div className="min-h-screen py-16 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-3">Choisis ton plan <span className="text-orange-400">Compaw</span></h1>
          <p className="text-gray-400 text-lg">Commence gratuitement, evolue quand tu es pret</p>
        </div>
        {error && <div className="max-w-md mx-auto mb-8 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm text-center">{error}</div>}
        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <div key={plan.name} className={"rounded-2xl border-2 p-8 relative " + plan.bg + " " + plan.border + (plan.popular ? " scale-105" : "")}>
              {plan.popular && (<div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs font-bold px-4 py-1 rounded-full">Populaire</div>)}
              <p className={"text-xs uppercase tracking-widest mb-3 " + plan.accent}>{plan.tier}</p>
              <h2 className="text-xl font-bold text-white mb-2">{plan.name}</h2>
              <div className="mb-6">
                <span className="text-3xl font-bold text-white">{plan.price}</span>
                <span className="text-gray-500 text-sm">{plan.period}</span>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                    <svg className="w-4 h-4 text-orange-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                    {f}
                  </li>
                ))}
              </ul>
              {plan.cta && plan.priceId ? (
                <button onClick={() => handleSubscribe(plan.priceId!)} disabled={loading === plan.priceId}
                  className={"w-full py-3 font-semibold rounded-xl transition disabled:opacity-50 " + (plan.popular ? "bg-orange-500 hover:bg-orange-600 text-white" : "bg-white/10 hover:bg-white/20 text-white border border-white/10")}>
                  {loading === plan.priceId ? "Redirection..." : plan.cta}
                </button>
              ) : (
                <div className="w-full py-3 text-center text-gray-600 font-medium text-sm">Plan actuel</div>
              )}
            </div>
          ))}
        </div>
        <p className="text-center text-gray-600 text-sm mt-8">Annulable a tout moment. Paiement securise par Stripe.</p>
      </div>
    </div>
  );
}
