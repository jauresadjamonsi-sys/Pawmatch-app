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
      price: "CHF 19.90",
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
      price: "CHF 49.90",
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
      setError(t.pricingError);
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen py-12 px-4" style={{ background: "var(--c-bg, #f9fafb)" }}>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4" style={{ color: "var(--c-text, #111827)" }}>
            {t.pricingTitle}
          </h1>
          <p className="text-lg max-w-md mx-auto" style={{ color: "var(--c-text-muted, #6b7280)" }}>
            {t.pricingDesc}
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
                    {t.pricingPopular}
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
                      isPopular
                        ? "bg-orange-500 hover:bg-orange-600 text-white"
                        : "text-white"
                    }`}
                    style={!isPopular ? { background: "var(--c-text, #111827)" } : undefined}
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

            {/* Pawly */}
            <div className="rounded-2xl border-2 p-6 relative" style={{ background: "rgba(249,115,22,0.04)", borderColor: "rgba(249,115,22,0.4)" }}>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-orange-500 text-white text-xs font-bold rounded-full uppercase tracking-wide">
                Pawly
              </div>
              <div className="text-center mb-5">
                <span className="text-3xl block mb-2">🐾</span>
                <h3 className="font-bold text-lg" style={{ color: "var(--c-text, #111827)" }}>Pawly</h3>
                <p className="text-xs mt-1 font-semibold" style={{ color: "var(--c-accent, #f97316)" }}>{t.whySwiss}</p>
              </div>
              <ul className="space-y-2.5 text-sm" style={{ color: "var(--c-text, #374151)" }}>
                {[t.whyFeat1, t.whyFeat2, t.whyFeat3, t.whyFeat4, t.whyFeat5, t.whyFeat6, t.whyFeat7, t.whyFeat8].map((feat, i) => (
                  <li key={i} className="flex items-center gap-2.5">
                    <span className="text-green-500">✅</span>
                    <span className="font-medium">{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="text-center mt-8">
            <Link href="/signup" className="inline-block px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition text-sm">
              {t.heroStartFree}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
