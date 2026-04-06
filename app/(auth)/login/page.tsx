"use client";

import { Suspense, useState } from "react";
import { login } from "../actions";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { posthog } from "@/lib/posthog";
import { useAppContext } from "@/lib/contexts/AppContext";

function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const message = searchParams.get("message");
  const supabase = createClient();
  const { t } = useAppContext();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const result = await login(formData);
    if (result?.error) { setError(result.error); setLoading(false); }
    else { posthog.capture("user_logged_in", { method: "email" }); }
  }

  async function handleGoogleLogin() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/auth/callback" },
    });
    if (error) setError(error.message);
  }

  return (
    <div className="glass-strong rounded-2xl p-8 animate-slide-up" style={{
      border: "1px solid var(--c-border)",
      boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
    }}>
      {message && (
        <div className="mb-4 p-3 rounded-lg text-sm animate-slide-up"
          style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", color: "#22c55e" }}>
          {message}
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 rounded-lg text-sm animate-slide-up"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" }}>
          {error}
        </div>
      )}

      {/* Google login */}
      <button
        onClick={handleGoogleLogin}
        className="glass w-full py-3 font-semibold rounded-xl flex items-center justify-center gap-3 mb-4 transition hover:opacity-80"
        style={{ border: "1px solid var(--c-border)", color: "var(--c-text)" }}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        {t.loginGoogle}
      </button>

      {/* Divider */}
      <div className="relative mb-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full" style={{ height: 1, background: "var(--c-border)" }} />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4" style={{ background: "var(--c-card)", color: "var(--c-text-muted)" }}>{t.loginOr}</span>
        </div>
      </div>

      {/* Email form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1" style={{ color: "var(--c-text-muted)" }}>{t.loginEmail}</label>
          <input
            id="email" name="email" type="email" required
            className="input-futuristic w-full"
            placeholder="toi@exemple.ch"
            style={{ background: "var(--c-deep)", color: "var(--c-text)", border: "1px solid var(--c-border)" }}
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1" style={{ color: "var(--c-text-muted)" }}>{t.loginPassword}</label>
          <input
            id="password" name="password" type="password" required minLength={6}
            className="input-futuristic w-full"
            placeholder="••••••••"
            style={{ background: "var(--c-deep)", color: "var(--c-text)", border: "1px solid var(--c-border)" }}
          />
        </div>
        <button
          type="submit" disabled={loading}
          className="btn-futuristic neon-orange w-full py-3 font-semibold rounded-xl disabled:opacity-50"
        >
          {loading ? t.loading : t.loginButton}
        </button>
      </form>

      <p className="mt-4 text-center text-sm" style={{ color: "var(--c-text-muted)" }}>
        <Link href="/forgot-password" className="hover:underline" style={{ color: "var(--c-accent)" }}>
          {t.loginForgot}
        </Link>
      </p>
      <p className="mt-3 text-center text-sm" style={{ color: "var(--c-text-muted)" }}>
        {t.loginNoAccount}{" "}
        <Link href="/signup" className="font-medium" style={{ color: "var(--c-accent)" }}>
          {t.loginCreate}
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  const { t } = useAppContext();
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ position: "relative", overflow: "hidden", background: "var(--c-deep)" }}>
      {/* Aurora background */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse at 20% 50%, rgba(249,115,22,0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(167,139,250,0.08) 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, rgba(13,148,136,0.06) 0%, transparent 50%)",
        pointerEvents: "none",
      }} />

      <div className="w-full max-w-md" style={{ position: "relative", zIndex: 1 }}>
        <div className="text-center mb-8 animate-slide-up">
          <h1 className="text-4xl font-bold" style={{ color: "var(--c-accent)" }}>
            Pawly
          </h1>
          <p className="mt-2" style={{ color: "var(--c-text-muted)" }}>{t.loginTitle}</p>
        </div>
        <Suspense fallback={<p className="text-center" style={{ color: "var(--c-text-muted)" }}>{t.loading}</p>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
