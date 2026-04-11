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
          <h1 className="text-4xl font-bold text-amber-300">Pawly</h1>
          <p className="text-[var(--c-text-muted)] mt-2">Réinitialiser le mot de passe</p>
        </div>
        <div className="bg-[var(--c-card)] border border-[var(--c-border)] rounded-2xl p-8">
          {success ? (
            <div className="text-center">
              <p className="text-5xl mb-4">📧</p>
              <h2 className="text-xl font-bold text-[var(--c-text)] mb-2">Email envoyé</h2>
              <p className="text-[var(--c-text-muted)] text-sm mb-6">Si un compte existe avec cette adresse, vous recevrez un lien.</p>
              <Link href="/login" className="text-amber-300 hover:underline font-medium text-sm">Retour à la connexion</Link>
            </div>
          ) : (
            <>
              {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">{error}</div>}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-[var(--c-text-muted)] mb-1">Email</label>
                  <input id="email" name="email" type="email" required className="w-full px-4 py-3 bg-[var(--c-card)] border border-[var(--c-border)] rounded-xl text-[var(--c-text)] placeholder-[var(--c-text-muted)] focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none" placeholder="toi@exemple.ch"/>
                </div>
                <button type="submit" disabled={loading} className="w-full py-3 bg-amber-400 hover:bg-amber-500 text-white font-semibold rounded-xl transition disabled:opacity-50">
                  {loading ? "Envoi..." : "Envoyer le lien"}
                </button>
              </form>
              <p className="mt-6 text-center text-sm text-[var(--c-text-muted)]">
                <Link href="/login" className="text-amber-300 hover:underline font-medium">Retour à la connexion</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
