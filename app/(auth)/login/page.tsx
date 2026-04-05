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
      border: "1px solid rgba(255,255,255,0.08)",
      boxShadow: "0 8px 32px rgba(0,0,0,0.3), 0 0 60px rgba(249,115,22,0.04)",
    }}>
      {message && (
        <div
          className="mb-4 p-3 rounded-lg text-sm animate-slide-up"
          style={{
            background: "rgba(34,197,94,0.08)",
            border: "1px solid rgba(34,197,94,0.2)",
            color: "#22c55e",
            boxShadow: "0 0 12px rgba(34,197,94,0.06)",
          }}
        >
          {message}
        </div>
      )}
      {error && (
        <div
          className="mb-4 p-3 rounded-lg text-sm animate-slide-up"
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)",
            color: "#f87171",
            boxShadow: "0 0 12px rgba(239,68,68,0.06)",
            animation: "loginShake 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          {error}
        </div>
      )}

      {/* Google login - glass pill */}
      <button
        onClick={handleGoogleLogin}
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
        {t.loginGoogle}
      </button>

      {/* Divider */}
      <div className="relative mb-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full" style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)" }} />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 text-gray-500" style={{ background: "var(--c-card, rgba(10,8,18,0.9))" }}>{t.loginOr}</span>
        </div>
      </div>

      {/* Email form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">{t.loginEmail}</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="input-futuristic w-full"
            placeholder="toi@exemple.ch"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">{t.loginPassword}</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            className="input-futuristic w-full"
            placeholder="&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="btn-futuristic neon-orange w-full py-3 font-semibold rounded-xl disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg, rgba(249,115,22,0.85), rgba(234,88,12,0.95))",
            color: "#fff",
            boxShadow: "0 0 24px rgba(249,115,22,0.25)",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          {loading ? t.loading : t.loginButton}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-500">
        <Link href="/forgot-password" className="neon-orange hover:underline" style={{ transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)" }}>
          {t.loginForgot}
        </Link>
      </p>
      <p className="mt-3 text-center text-sm text-gray-500">
        {t.loginNoAccount}{" "}
        <Link href="/signup" className="gradient-text font-medium" style={{ transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)" }}>
          {t.loginCreate}
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  const { t } = useAppContext();
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ position: "relative", overflow: "hidden" }}>
      {/* Aurora background */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: "radial-gradient(ellipse at 20% 50%, rgba(249,115,22,0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(167,139,250,0.08) 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, rgba(13,148,136,0.06) 0%, transparent 50%)",
        pointerEvents: "none",
      }} />

      {/* Floating particles */}
      <div className="login-particle" style={{ top: "15%", left: "10%", animationDelay: "0s" }} />
      <div className="login-particle" style={{ top: "70%", right: "15%", animationDelay: "2s" }} />
      <div className="login-particle" style={{ bottom: "20%", left: "60%", animationDelay: "4s" }} />

      <div className="w-full max-w-md" style={{ position: "relative", zIndex: 1 }}>
        <div className="text-center mb-8 animate-slide-up">
          <h1 className="text-4xl font-bold gradient-text" style={{
            background: "linear-gradient(135deg, #f97316, #a78bfa)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            filter: "drop-shadow(0 0 20px rgba(249,115,22,0.2))",
          }}>
            Pawly
          </h1>
          <p className="text-gray-400 mt-2">{t.loginTitle}</p>
        </div>
        <Suspense fallback={<p className="text-center text-gray-500">{t.loading}</p>}>
          <LoginForm />
        </Suspense>
      </div>

      <style>{`
        .login-particle {
          position: absolute;
          width: 3px;
          height: 3px;
          border-radius: 50%;
          background: rgba(249,115,22,0.25);
          pointer-events: none;
          animation: loginParticle 8s ease-in-out infinite;
        }
        @keyframes loginParticle {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.2; }
          25% { transform: translateY(-20px) translateX(10px); opacity: 0.5; }
          50% { transform: translateY(-10px) translateX(-8px); opacity: 0.3; }
          75% { transform: translateY(-25px) translateX(5px); opacity: 0.4; }
        }
        @keyframes loginShake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        .glass button:hover, .login-google-btn:hover {
          background: rgba(255,255,255,0.08) !important;
          border-color: rgba(255,255,255,0.15) !important;
        }
      `}</style>
    </div>
  );
}
