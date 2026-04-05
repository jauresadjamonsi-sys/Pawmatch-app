"use client";

import { useState, useEffect } from "react";
import { signup } from "../actions";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { posthog } from "@/lib/posthog";

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  // Capture referral code from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      localStorage.setItem("pawly_referral", ref);
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
      // Process referral after signup
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
    // Store referral before OAuth redirect
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

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-4xl block mb-2">🐾</span>
          <h1 className="text-4xl font-bold text-orange-400">Pawly</h1>
          <p className="text-[var(--c-text)] mt-2 font-semibold">Cree ton compte gratuitement</p>
          <p className="text-[var(--c-text-muted)] text-sm mt-1">Rejois des proprietaires en Suisse</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
          {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">{error}</div>}

          

          
      <button onClick={handleGoogleSignup} className="w-full py-3 bg-white/10 border border-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition flex items-center justify-center gap-3 mb-4">
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        S'inscrire avec Google
      </button>
      <div className="relative mb-4">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
        <div className="relative flex justify-center text-sm"><span className="px-4 bg-[var(--c-card)] text-gray-500">ou par email</span></div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
            <input type="hidden" name="referred_by" value={typeof window !== "undefined" ? localStorage.getItem("pawly_referral") || "" : ""} />
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-300 mb-1">Nom complet</label>
              <input id="fullName" name="fullName" type="text" required className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition" placeholder="Jean Dupont"/>
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">Email</label>
              <input id="email" name="email" type="email" required className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition" placeholder="toi@exemple.ch"/>
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">Mot de passe</label>
              <input id="password" name="password" type="password" required minLength={6} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition" placeholder="Minimum 6 caractères"/>
            </div>
            <button type="submit" disabled={loading} className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition disabled:opacity-50">
              {loading ? "Création..." : "Créer mon compte"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Déjà un compte ? <Link href="/login" className="text-orange-400 hover:underline font-medium">Se connecter</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
