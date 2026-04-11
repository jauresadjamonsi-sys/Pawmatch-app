"use client";

import { useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useAppContext } from "@/lib/contexts/AppContext";
import Link from "next/link";

export default function PricingPage() {
  const { profile, isAuthenticated } = useAuth();
  const { t } = useAppContext();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentPlan = profile?.subscription || "free";

  const PLANS = [
    {
      key: "free",
      name: "Paw",
      emoji: "🐾",
      price: t.pricingFree,
      period: "",
      features: [
        t.pricingFeat1Animal,
        t.pricingFeat3Matches,
        t.pricingFeat10Msg,
        t.pricingFeatCatalog,
        t.pricingFeatSpotlight1m,
      ],
      color: "rgba(255,255,255,0.06)",
      border: "rgba(255,255,255,0.1)",
      cta: t.pricingCurrent,
      disabled: true,
    },
    {
      key: "premium",
      name: "PawPlus",
      emoji: "✨",
      price: "CHF 4.90",
      period: t.pricingMonth,
      popular: true,
      features: [
        t.pricingFeat3Animals,
        t.pricingFeatUnlimitedMatches,
        t.pricingFeatUnlimitedMsg,
        t.pricingFeatSeeLikes,
        t.pricingFeatBadge,
        t.pricingFeatFilters,
        t.pricingFeatSpotlight24h,
      ],
      color: "rgba(255,107,53,0.08)",
      border: "rgba(255,107,53,0.3)",
      cta: t.pricingChoosePlus,
      disabled: false,
    },
    {
      key: "pro",
      name: "PawPro",
      emoji: "🚀",
      price: "CHF 9.90",
      period: t.pricingMonth,
      features: [
        t.pricingFeatUnlimitedAnimals,
        t.pricingFeatAllPlus,
        t.pricingFeatHighlight,
        t.pricingFeatStats,
        t.pricingFeatSupport,
        t.pricingFeatVIP,
        t.pricingFeatSpotlight24h,
      ],
      color: "rgba(139,92,246,0.08)",
      border: "rgba(139,92,246,0.3)",
      cta: t.pricingChoosePro,
      disabled: false,
    },
    {
      key: "gold",
      name: "PawlyApp Gold",
      emoji: "👑",
      price: "CHF 19.90",
      period: t.pricingMonth,
      recommended: true,
      features: [
        "Voir qui a swipe sur ton profil",
        "1 Boost gratuit par semaine",
        "Badge Gold exclusif",
        "Pas de publicites",
        "Acces prioritaire aux evenements",
        "Profil verifie automatiquement",
        "50 PawCoins/mois offerts",
        "Support prioritaire",
      ],
      color: "rgba(255,193,7,0.08)",
      border: "rgba(255,193,7,0.5)",
      cta: "Passer Gold",
      disabled: false,
    },
  ];

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
        body: JSON.stringify({ plan: planKey }),
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
        setLoading(null);
        return;
      }

      window.location.href = data.url;
    } catch {
      setError(t.pricingError);
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen py-8 px-4 pb-28" style={{ background: "var(--c-bg, #f9fafb)" }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <button onClick={() => window.history.length > 1 ? window.history.back() : (window.location.href = "/feed")} aria-label="Retour" className="inline-flex items-center justify-center w-9 h-9 rounded-full transition-all active:scale-90 flex-shrink-0" style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--c-text)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <h1 className="text-4xl font-bold" style={{ color: "var(--c-text, #111827)" }}>
              {t.pricingTitle}
            </h1>
          </div>
          <p className="text-lg max-w-md mx-auto" style={{ color: "var(--c-text-muted, #6b7280)" }}>
            {t.pricingDesc}
          </p>
        </div>

        {error && (
          <div className="mb-8 p-4 border rounded-xl text-sm text-center max-w-md mx-auto bg-red-500/10 border-red-500/30 text-red-500">
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PLANS.map((plan) => {
            const isCurrent = currentPlan === plan.key;
            const isPopular = (plan as any).popular;
            const isGold = (plan as any).recommended;

            return (
              <div
                key={plan.key}
                className={`relative rounded-2xl border-2 p-8 flex flex-col ${
                  isGold
                    ? "border-yellow-400 shadow-xl"
                    : isPopular
                    ? "border-amber-300 shadow-lg"
                    : ""
                }`}
                style={{
                  background: isGold
                    ? "linear-gradient(135deg, rgba(255,215,0,0.06) 0%, rgba(255,193,7,0.12) 50%, rgba(255,165,0,0.06) 100%)"
                    : "var(--c-card, #ffffff)",
                  borderColor: isGold ? "rgba(255,193,7,0.6)" : isPopular ? undefined : "var(--c-border, #f3f4f6)",
                  boxShadow: isGold
                    ? "0 0 30px rgba(255,193,7,0.15), 0 0 60px rgba(255,193,7,0.08), inset 0 1px 0 rgba(255,215,0,0.2)"
                    : undefined,
                }}
              >
                {isGold && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-5 py-1 text-white text-xs font-bold rounded-full uppercase tracking-wide"
                    style={{
                      background: "linear-gradient(135deg, #FBBF24, #F59E0B, #D97706)",
                      boxShadow: "0 2px 12px rgba(251,191,36,0.4)",
                    }}
                  >
                    Recommande
                  </div>
                )}

                {isPopular && !isGold && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-amber-400 text-white text-xs font-bold rounded-full uppercase tracking-wide">
                    {t.pricingPopular}
                  </div>
                )}

                <div className="text-center mb-6">
                  <span className="text-4xl mb-3 block">{plan.emoji}</span>
                  <h2
                    className="text-xl font-bold mb-1"
                    style={{
                      color: isGold ? "transparent" : "var(--c-text, #111827)",
                      background: isGold ? "linear-gradient(135deg, #FBBF24, #F59E0B)" : undefined,
                      WebkitBackgroundClip: isGold ? "text" : undefined,
                      WebkitTextFillColor: isGold ? "transparent" : undefined,
                    }}
                  >
                    {plan.name}
                  </h2>
                  <div className="flex items-baseline justify-center gap-1">
                    <span
                      className="text-3xl font-bold"
                      style={{
                        color: isGold ? "transparent" : "var(--c-text, #111827)",
                        background: isGold ? "linear-gradient(135deg, #FBBF24, #D97706)" : undefined,
                        WebkitBackgroundClip: isGold ? "text" : undefined,
                        WebkitTextFillColor: isGold ? "transparent" : undefined,
                      }}
                    >
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
                      style={{ color: isGold ? "var(--c-text, #374151)" : "var(--c-text-muted, #4b5563)" }}
                    >
                      <svg
                        className={`w-5 h-5 flex-shrink-0 ${
                          isGold ? "text-yellow-500" : isPopular ? "text-amber-400" : "text-amber-400"
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
                    {t.pricingCurrent}
                  </div>
                ) : plan.key === "free" ? (
                  <div
                    className="w-full py-3 font-medium rounded-xl text-center text-sm"
                    style={{ background: "var(--c-bg, #f9fafb)", color: "var(--c-text-muted, #9ca3af)" }}
                  >
                    {t.pricingIncluded}
                  </div>
                ) : (
                  <button
                    onClick={() => handleSubscribe(plan.key)}
                    disabled={loading === plan.key}
                    className={`w-full py-3 font-semibold rounded-xl transition text-sm disabled:opacity-50 ${
                      isGold
                        ? "text-white"
                        : isPopular
                        ? "bg-amber-400 hover:bg-amber-500 text-white"
                        : "text-white"
                    }`}
                    style={
                      isGold
                        ? {
                            background: "linear-gradient(135deg, #FBBF24, #F59E0B, #D97706)",
                            boxShadow: "0 4px 20px rgba(251,191,36,0.3)",
                          }
                        : !isPopular
                        ? { background: "var(--c-text, #111827)" }
                        : undefined
                    }
                  >
                    {loading === plan.key ? t.pricingRedirect : plan.cta}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <p className="text-sm" style={{ color: "var(--c-text-muted, #9ca3af)" }}>
            {t.pricingNote}
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--c-text-muted, #9ca3af)" }}>
            {t.pricingSecure}
          </p>
        </div>

        {/* ═══════════════════════════════════════
            WHY PAWLY VS GOOGLE / CHATGPT
            ═══════════════════════════════════════ */}
        <div className="mt-20 mb-8">
          <h2 className="text-2xl sm:text-3xl font-black text-center mb-3" style={{ color: "var(--c-text, #111827)" }}>
            {t.whyTitle}
          </h2>
          <p className="text-center text-sm mb-10 max-w-lg mx-auto" style={{ color: "var(--c-text-muted, #6b7280)" }}>
            {t.whySwiss}
          </p>

          {/* Comparison table */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Google */}
            <div className="rounded-2xl border-2 p-6" style={{ background: "var(--c-card, #ffffff)", borderColor: "var(--c-border, #f3f4f6)" }}>
              <div className="text-center mb-5">
                <span className="text-3xl block mb-2">🔍</span>
                <h3 className="font-bold text-lg" style={{ color: "var(--c-text, #111827)" }}>Google</h3>
                <p className="text-xs mt-1" style={{ color: "var(--c-text-muted, #9ca3af)" }}>{t.whyGoogle}</p>
              </div>
              <ul className="space-y-2.5 text-sm" style={{ color: "var(--c-text-muted, #6b7280)" }}>
                {[t.whyFeat1, t.whyFeat2, t.whyFeat3, t.whyFeat4, t.whyFeat5, t.whyFeat6, t.whyFeat7, t.whyFeat8].map((feat, i) => (
                  <li key={i} className="flex items-center gap-2.5">
                    <span className={i < 2 ? "text-yellow-500" : "text-red-400"}>{i < 2 ? "⚠️" : "❌"}</span>
                    <span className={i >= 2 ? "line-through opacity-50" : ""}>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* ChatGPT */}
            <div className="rounded-2xl border-2 p-6" style={{ background: "var(--c-card, #ffffff)", borderColor: "var(--c-border, #f3f4f6)" }}>
              <div className="text-center mb-5">
                <span className="text-3xl block mb-2">🤖</span>
                <h3 className="font-bold text-lg" style={{ color: "var(--c-text, #111827)" }}>ChatGPT</h3>
                <p className="text-xs mt-1" style={{ color: "var(--c-text-muted, #9ca3af)" }}>{t.whyChatGPT}</p>
              </div>
              <ul className="space-y-2.5 text-sm" style={{ color: "var(--c-text-muted, #6b7280)" }}>
                {[t.whyFeat1, t.whyFeat2, t.whyFeat3, t.whyFeat4, t.whyFeat5, t.whyFeat6, t.whyFeat7, t.whyFeat8].map((feat, i) => (
                  <li key={i} className="flex items-center gap-2.5">
                    <span className={i >= 6 ? "text-yellow-500" : "text-red-400"}>{i >= 6 ? "⚠️" : "❌"}</span>
                    <span className={i < 6 ? "line-through opacity-50" : ""}>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* PawlyApp */}
            <div className="rounded-2xl border-2 p-6 relative" style={{ background: "rgba(251,191,36,0.04)", borderColor: "rgba(251,191,36,0.4)" }}>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-amber-400 text-white text-xs font-bold rounded-full uppercase tracking-wide">
                PawlyApp
              </div>
              <div className="text-center mb-5">
                <span className="text-3xl block mb-2">🐾</span>
                <h3 className="font-bold text-lg" style={{ color: "var(--c-text, #111827)" }}>PawlyApp</h3>
                <p className="text-xs mt-1 font-semibold" style={{ color: "var(--c-accent, #FBBF24)" }}>{t.whySwiss}</p>
              </div>
              <ul className="space-y-2.5 text-sm" style={{ color: "var(--c-text, #374151)" }}>
                {[t.whyFeat1, t.whyFeat2, t.whyFeat3, t.whyFeat4, t.whyFeat5, t.whyFeat6, t.whyFeat7, t.whyFeat8].map((feat, i) => (
                  <li key={i} className="flex items-center gap-2.5">
                    <span className="text-amber-400">✅</span>
                    <span className="font-medium">{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="text-center mt-8">
            <Link href="/signup" className="inline-block px-8 py-3 bg-amber-400 hover:bg-amber-500 text-white font-bold rounded-xl transition text-sm">
              {t.heroStartFree}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
