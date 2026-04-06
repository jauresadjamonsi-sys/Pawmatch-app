"use client";

import { useState, useEffect } from "react";
import { signup } from "../actions";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { posthog } from "@/lib/posthog";
import { useAppContext } from "@/lib/contexts/AppContext";

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [referralCode, setReferralCode] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const supabase = createClient();
  const { t } = useAppContext();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      localStorage.setItem("pawly_referral", ref);
      setReferralCode(ref);
    } else {
      const stored = localStorage.getItem("pawly_referral");
      if (stored) setReferralCode(stored);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const result = await signup(formData);
    if (result?.error) { setError(result.error); setLoading(false); }
    else {
      posthog.capture("user_signed_up", { method: "email" });
      const ref = localStorage.getItem("pawly_referral");
      if (ref) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await fetch("/api/referral/validate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ referral_code: ref, referred_user_id: user.id }),
            });
            localStorage.removeItem("pawly_referral");
          }
        } catch {}
      }
    }
  }

  async function handleGoogleSignup() {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) localStorage.setItem("pawly_referral", ref);
    posthog.capture("user_signed_up", { method: "google" });
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/auth/callback" },
    });
    if (error) setError(error.message);
  }

  const totalSteps = 3;

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ position: "relative", overflow: "hidden" }}>
      {/* Aurora background */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: "radial-gradient(ellipse at 30% 40%, rgba(167,139,250,0.08) 0%, transparent 50%), radial-gradient(ellipse at 70% 70%, rgba(249,115,22,0.08) 0%, transparent 50%), radial-gradient(ellipse at 50% 20%, rgba(13,148,136,0.06) 0%, transparent 50%)",
        pointerEvents: "none",
      }} />

      {/* Floating particles */}
      <div className="signup-particle" style={{ top: "20%", left: "8%", animationDelay: "0s" }} />
      <div className="signup-particle" style={{ top: "65%", right: "12%", animationDelay: "3s" }} />
      <div className="signup-particle" style={{ bottom: "25%", left: "55%", animationDelay: "1.5s" }} />

      <div className="w-full max-w-md" style={{ position: "relative", zIndex: 1 }}>
        <div className="text-center mb-8 animate-slide-up">
          <span className="text-4xl block mb-2" style={{ filter: "drop-shadow(0 0 12px rgba(249,115,22,0.2))" }}>🐾</span>
          <h1 className="text-4xl font-bold" style={{
            background: "linear-gradient(135deg, #f97316, #a78bfa)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            filter: "drop-shadow(0 0 20px rgba(249,115,22,0.2))",
          }}>
            Pawly
          </h1>
          <p className="text-[var(--c-text)] mt-2 font-semibold">{t.signupTitle}</p>
          <p className="text-[var(--c-text-muted)] text-sm mt-1">{t.signupSub}</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-0 mb-6 animate-slide-up" style={{ animationDelay: "0.05s" }}>
          {[1, 2, 3].map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 700,
                  transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                  background: s <= step
                    ? "linear-gradient(135deg, rgba(249,115,22,0.8), rgba(167,139,250,0.8))"
                    : "rgba(255,255,255,0.05)",
                  color: s <= step ? "#fff" : "var(--c-text-muted)",
                  border: s <= step
                    ? "1px solid rgba(249,115,22,0.4)"
                    : "1px solid rgba(255,255,255,0.1)",
                  boxShadow: s <= step ? "0 0 12px rgba(249,115,22,0.2)" : "none",
                }}
              >
                {s}
              </div>
              {i < totalSteps - 1 && (
                <div
                  style={{
                    width: 40,
                    height: 2,
                    borderRadius: 1,
                    transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                    background: s < step
                      ? "linear-gradient(90deg, rgba(249,115,22,0.6), rgba(167,139,250,0.6))"
                      : "rgba(255,255,255,0.08)",
                  }}
                />
              )}
            </div>
          ))}
        </div>

        <div className="glass-strong rounded-2xl p-8 animate-slide-up" style={{
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.3), 0 0 60px rgba(167,139,250,0.04)",
          animationDelay: "0.1s",
        }}>
          {error && (
            <div
              className="mb-4 p-3 rounded-lg text-sm"
              style={{
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.2)",
                color: "#f87171",
                boxShadow: "0 0 12px rgba(239,68,68,0.06)",
                animation: "signupShake 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              {error}
            </div>
          )}

          {/* Google signup - glass pill */}
          <button
            onClick={handleGoogleSignup}
            className="glass w-full py-3 text-white font-semibold rounded-xl flex items-center justify-center gap-3 mb-4"
            style={{
              border: "1px solid rgba(255,255,255,0.1)",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {t.signupGoogle}
          </button>

          {/* Divider */}
          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full" style={{ height: 1, background: "var(--c-border)" }} />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 text-[var(--c-text-muted)]" style={{ background: "var(--c-card)" }}>{t.loginOr}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <input type="hidden" name="referred_by" value={typeof window !== "undefined" ? localStorage.getItem("pawly_referral") || "" : ""} />

            <div className="animate-slide-up" style={{ animationDelay: "0.15s" }}>
              <label htmlFor="fullName" className="block text-sm font-medium text-[var(--c-text-muted)] mb-1">{t.signupName}</label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                className="input-futuristic w-full"
                placeholder="Jean Dupont"
                onFocus={() => setStep(1)}
              />
            </div>
            <div className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
              <label htmlFor="email" className="block text-sm font-medium text-[var(--c-text-muted)] mb-1">{t.loginEmail}</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="input-futuristic w-full"
                placeholder="toi@exemple.ch"
                onFocus={() => setStep(2)}
              />
            </div>
            <div className="animate-slide-up" style={{ animationDelay: "0.25s" }}>
              <label htmlFor="password" className="block text-sm font-medium text-[var(--c-text-muted)] mb-1">{t.loginPassword}</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                className="input-futuristic w-full"
                placeholder="&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;"
                onFocus={() => setStep(3)}
              />
            </div>

            {/* Referral code field with special glass highlight */}
            {referralCode && (
              <div
                className="animate-slide-up glass rounded-xl p-3"
                style={{
                  border: "1px solid rgba(167,139,250,0.25)",
                  boxShadow: "0 0 16px rgba(167,139,250,0.08)",
                  animationDelay: "0.3s",
                }}
              >
                <p className="text-xs text-[var(--c-text-muted)] mb-1">Code parrainage</p>
                <p className="text-sm font-bold" style={{
                  background: "linear-gradient(135deg, #a78bfa, #f97316)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}>
                  {referralCode}
                </p>
              </div>
            )}

            {/* Consent checkbox */}
            <div className="flex items-start gap-3 animate-slide-up" style={{ animationDelay: "0.3s" }}>
              <input
                type="checkbox"
                id="acceptTerms"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-1 accent-orange-500"
                style={{ width: 16, height: 16, flexShrink: 0 }}
              />
              <label htmlFor="acceptTerms" className="text-xs text-[var(--c-text-muted)] leading-relaxed cursor-pointer">
                J&apos;accepte les{" "}
                <a href="/legal/cgu" target="_blank" className="underline text-orange-400 hover:text-orange-300">
                  Conditions Generales d&apos;Utilisation
                </a>{" "}
                et la{" "}
                <a href="/legal/privacy" target="_blank" className="underline text-orange-400 hover:text-orange-300">
                  Politique de Confidentialite
                </a>
                . Je confirme avoir au moins 18 ans.
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || !acceptedTerms}
              className="btn-futuristic neon-orange w-full py-3 font-semibold rounded-xl disabled:opacity-50 animate-slide-up"
              style={{
                background: "linear-gradient(135deg, rgba(249,115,22,0.85), rgba(234,88,12,0.95))",
                color: "#fff",
                boxShadow: "0 0 24px rgba(249,115,22,0.25)",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                animationDelay: "0.35s",
              }}
            >
              {loading ? t.loading : t.signupButton}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[var(--c-text-muted)] animate-slide-up" style={{ animationDelay: "0.4s" }}>
            {t.signupHasAccount}{" "}
            <Link href="/login" className="gradient-text font-medium" style={{ transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)" }}>
              {t.signupLogin}
            </Link>
          </p>
        </div>
      </div>

      <style>{`
        .signup-particle {
          position: absolute;
          width: 3px;
          height: 3px;
          border-radius: 50%;
          background: rgba(167,139,250,0.25);
          pointer-events: none;
          animation: signupParticle 9s ease-in-out infinite;
        }
        @keyframes signupParticle {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.2; }
          25% { transform: translateY(-18px) translateX(8px); opacity: 0.5; }
          50% { transform: translateY(-8px) translateX(-6px); opacity: 0.3; }
          75% { transform: translateY(-22px) translateX(4px); opacity: 0.4; }
        }
        @keyframes signupShake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}
