"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    // Supabase injects the session from the reset link automatically
    // We just need to check if a session exists
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setReady(true);
      } else {
        // Listen for auth state change (Supabase processes the hash fragment)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
          if (event === "PASSWORD_RECOVERY") {
            setReady(true);
          }
        });
        // Timeout: if no session after 5s, show error
        const timeout = setTimeout(() => {
          if (!ready) setError("Lien expiré ou invalide. Demande un nouveau lien de réinitialisation.");
        }, 5000);
        return () => {
          subscription.unsubscribe();
          clearTimeout(timeout);
        };
      }
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Le mot de passe doit faire au moins 6 caractères.");
      return;
    }
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push("/profile"), 3000);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--c-deep)" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold" style={{ color: "var(--c-accent)" }}>Pawly</h1>
          <p style={{ color: "var(--c-text-muted)" }} className="mt-2">Nouveau mot de passe</p>
        </div>

        <div className="rounded-2xl p-8" style={{
          background: "var(--c-card)",
          border: "1px solid var(--c-border)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
        }}>
          {success ? (
            <div className="text-center">
              <p className="text-5xl mb-4">✅</p>
              <h2 className="text-xl font-bold mb-2" style={{ color: "var(--c-text)" }}>Mot de passe modifié !</h2>
              <p className="text-sm mb-6" style={{ color: "var(--c-text-muted)" }}>
                Redirection vers ton profil...
              </p>
              <Link href="/profile" className="font-medium text-sm hover:underline" style={{ color: "var(--c-accent)" }}>
                Aller au profil
              </Link>
            </div>
          ) : !ready && !error ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 rounded-full mx-auto mb-4" style={{
                borderColor: "var(--c-border)",
                borderTopColor: "var(--c-accent)",
              }} />
              <p style={{ color: "var(--c-text-muted)" }} className="text-sm">
                Vérification du lien...
              </p>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 p-3 rounded-lg text-sm" style={{
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  color: "#ef4444",
                }}>
                  {error}
                </div>
              )}

              {ready && (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium mb-1" style={{ color: "var(--c-text-muted)" }}>
                      Nouveau mot de passe
                    </label>
                    <input
                      id="password"
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
                      style={{
                        background: "var(--c-deep)",
                        color: "var(--c-text)",
                        border: "1px solid var(--c-border)",
                      }}
                    />
                  </div>
                  <div>
                    <label htmlFor="confirm" className="block text-sm font-medium mb-1" style={{ color: "var(--c-text-muted)" }}>
                      Confirmer le mot de passe
                    </label>
                    <input
                      id="confirm"
                      type="password"
                      required
                      minLength={6}
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
                      style={{
                        background: "var(--c-deep)",
                        color: "var(--c-text)",
                        border: "1px solid var(--c-border)",
                      }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 font-semibold rounded-xl transition disabled:opacity-50"
                    style={{ background: "var(--c-accent)", color: "#fff" }}
                  >
                    {loading ? "Modification..." : "Changer le mot de passe"}
                  </button>
                </form>
              )}

              {!ready && error && (
                <div className="text-center mt-4">
                  <Link href="/forgot-password" className="font-medium text-sm hover:underline" style={{ color: "var(--c-accent)" }}>
                    Demander un nouveau lien
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
