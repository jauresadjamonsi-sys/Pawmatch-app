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
    <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
      {message && <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg text-sm">{message}</div>}
      {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">{error}</div>}

      <button onClick={handleGoogleLogin} className="w-full py-3 bg-white/10 border border-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition flex items-center justify-center gap-3 mb-4">
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        {t.loginGoogle}
      </button>
      <div className="relative mb-4">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
        <div className="relative flex justify-center text-sm"><span className="px-4 bg-[var(--c-card)] text-gray-500">{t.loginOr}</span></div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">{t.loginEmail}</label>
          <input id="email" name="email" type="email" required className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition" placeholder="toi@exemple.ch"/>
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">{t.loginPassword}</label>
          <input id="password" name="password" type="password" required minLength={6} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition" placeholder="••••••••"/>
        </div>
        <button type="submit" disabled={loading} className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition disabled:opacity-50">
          {loading ? t.loading : t.loginButton}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-500">
        <Link href="/forgot-password" className="text-orange-400 hover:underline">{t.loginForgot}</Link>
      </p>
      <p className="mt-3 text-center text-sm text-gray-500">
        {t.loginNoAccount} <Link href="/signup" className="text-orange-400 hover:underline font-medium">{t.loginCreate}</Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  const { t } = useAppContext();
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-orange-400">Pawly</h1>
          <p className="text-gray-400 mt-2">{t.loginTitle}</p>
        </div>
        <Suspense fallback={<p className="text-center text-gray-500">{t.loading}</p>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
