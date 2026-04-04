"use client";

import { Suspense, useState } from "react";
import { login } from "../actions";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const message = searchParams.get("message");
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const result = await login(formData);
    if (result?.error) { setError(result.error); setLoading(false); }
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

      

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">Email</label>
          <input id="email" name="email" type="email" required className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition" placeholder="toi@exemple.ch"/>
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">Mot de passe</label>
          <input id="password" name="password" type="password" required minLength={6} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition" placeholder="••••••••"/>
        </div>
        <button type="submit" disabled={loading} className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition disabled:opacity-50">
          {loading ? "Connexion..." : "Se connecter"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-500">
        <Link href="/forgot-password" className="text-orange-400 hover:underline">Mot de passe oublié ?</Link>
      </p>
      <p className="mt-3 text-center text-sm text-gray-500">
        Pas encore de compte ? <Link href="/signup" className="text-orange-400 hover:underline font-medium">Créer un compte</Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-orange-400">Pawly</h1>
          <p className="text-gray-400 mt-2">Connecte-toi à ton compte</p>
        </div>
        <Suspense fallback={<p className="text-center text-gray-500">Chargement...</p>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
