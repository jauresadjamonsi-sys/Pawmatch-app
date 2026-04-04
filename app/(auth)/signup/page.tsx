"use client";

import { useState } from "react";
import { signup } from "../actions";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const result = await signup(formData);
    if (result?.error) { setError(result.error); setLoading(false); }
  }

  async function handleGoogleSignup() {
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
          <h1 className="text-4xl font-bold text-orange-400">Pawly</h1>
          <p className="text-gray-400 mt-2">Crée ton compte</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
          {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">{error}</div>}

          

          <form onSubmit={handleSubmit} className="space-y-5">
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
