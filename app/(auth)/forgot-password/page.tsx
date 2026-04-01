"use client";

import { useState } from "react";
import { resetPassword } from "../actions";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const result = await resetPassword(formData);
    if (result?.error) { setError(result.error); } else { setSuccess(true); }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-orange-400">Compaw</h1>
          <p className="text-gray-400 mt-2">Réinitialiser le mot de passe</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
          {success ? (
            <div className="text-center">
              <p className="text-5xl mb-4">📧</p>
              <h2 className="text-xl font-bold text-white mb-2">Email envoyé</h2>
              <p className="text-gray-400 text-sm mb-6">Si un compte existe avec cette adresse, vous recevrez un lien.</p>
              <Link href="/login" className="text-orange-400 hover:underline font-medium text-sm">Retour à la connexion</Link>
            </div>
          ) : (
            <>
              {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">{error}</div>}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                  <input id="email" name="email" type="email" required className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none" placeholder="toi@exemple.ch"/>
                </div>
                <button type="submit" disabled={loading} className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition disabled:opacity-50">
                  {loading ? "Envoi..." : "Envoyer le lien"}
                </button>
              </form>
              <p className="mt-6 text-center text-sm text-gray-500">
                <Link href="/login" className="text-orange-400 hover:underline font-medium">Retour à la connexion</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
