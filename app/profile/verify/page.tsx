"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function VerifyProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [verified, setVerified] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkVerification() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/login");
          return;
        }
        const { data: profile } = await supabase
          .from("profiles")
          .select("verified_photo")
          .eq("id", user.id)
          .single();
        setVerified(!!profile?.verified_photo);
      } catch {
        setVerified(false);
      }
      setLoading(false);
    }
    checkVerification();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setError(null);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(selected);
  }

  async function handleSubmit() {
    if (!file) {
      setError("Selectionne une photo pour continuer");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("photo", file);
      const res = await fetch("/api/verify-photo", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erreur lors de la verification");
      }
      setSuccess(true);
      setTimeout(() => router.push("/profile"), 2000);
    } catch (err: any) {
      setError(err.message || "Erreur lors de la verification");
    }
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--c-bg,var(--c-deep))] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Already verified
  if (verified) {
    return (
      <div className="min-h-screen bg-[var(--c-bg,var(--c-deep))] px-4 py-6 pb-32">
        <div className="max-w-md mx-auto">
          <Link
            href="/profile"
            className="inline-flex items-center gap-1 text-sm text-[var(--c-text-muted)] mb-6 hover:text-[var(--c-text)] transition"
          >
            &larr; Retour au profil
          </Link>
          <div className="glass-strong rounded-2xl p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: "rgba(59,130,246,0.15)", border: "2px solid rgba(59,130,246,0.4)" }}>
              <span className="text-4xl">&#x2714;&#xFE0F;</span>
            </div>
            <h1 className="text-xl font-bold text-[var(--c-text)] mb-2">Profil deja verifie !</h1>
            <p className="text-sm text-[var(--c-text-muted)] mb-4">
              Ton profil a ete verifie avec succes. Tu possedes le badge verifie.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)" }}>
              <span style={{ color: "#3b82f6", fontSize: "18px" }}>&#x2714;&#xFE0F;</span>
              <span className="text-sm font-bold" style={{ color: "#3b82f6" }}>Badge verifie</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success state with confetti animation
  if (success) {
    return (
      <div className="min-h-screen bg-[var(--c-bg,var(--c-deep))] px-4 py-6 pb-32">
        <div className="max-w-md mx-auto">
          <div className="glass-strong rounded-2xl p-8 text-center relative overflow-hidden">
            {/* Confetti particles */}
            <div className="confetti-container">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="confetti-piece"
                  style={{
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 0.5}s`,
                    backgroundColor: ["#22C55E", "#3b82f6", "#22c55e", "#a78bfa", "#fbbf24"][i % 5],
                  }}
                />
              ))}
            </div>
            <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center animate-bounce" style={{ background: "rgba(34,197,94,0.15)", border: "2px solid rgba(34,197,94,0.4)" }}>
              <span className="text-4xl">&#x1F389;</span>
            </div>
            <h1 className="gradient-text-warm text-2xl font-black mb-2">Verification reussie !</h1>
            <p className="text-sm text-[var(--c-text-muted)]">
              Tu as obtenu le badge verifie et +15 PawCoins. Redirection...
            </p>
          </div>
        </div>

        <style>{`
          .confetti-container {
            position: absolute;
            inset: 0;
            pointer-events: none;
            overflow: hidden;
          }
          .confetti-piece {
            position: absolute;
            top: -10px;
            width: 8px;
            height: 8px;
            border-radius: 2px;
            animation: confetti-fall 1.5s ease-out forwards;
          }
          @keyframes confetti-fall {
            0% {
              transform: translateY(0) rotate(0deg) scale(1);
              opacity: 1;
            }
            100% {
              transform: translateY(400px) rotate(720deg) scale(0.5);
              opacity: 0;
            }
          }
        `}</style>
      </div>
    );
  }

  // Main verification flow
  return (
    <div className="min-h-screen bg-[var(--c-bg,var(--c-deep))] px-4 py-6 pb-32">
      <div className="max-w-md mx-auto">
        <Link
          href="/profile"
          className="inline-flex items-center gap-1 text-sm text-[var(--c-text-muted)] mb-6 hover:text-[var(--c-text)] transition"
        >
          &larr; Retour au profil
        </Link>

        {/* Header */}
        <div className="text-center mb-8">
          <span className="text-5xl block mb-3">&#x1F4F8;</span>
          <h1 className="gradient-text-warm text-2xl font-black mb-2">
            Verification de profil
          </h1>
          <p className="text-sm text-[var(--c-text-muted)]">
            Prends un selfie avec ton animal pour obtenir le badge verifie
          </p>
        </div>

        {/* Benefits */}
        <div className="glass rounded-2xl p-5 mb-6" style={{ border: "1px solid var(--c-border)" }}>
          <h3 className="text-sm font-bold text-[var(--c-text)] mb-3">Avantages de la verification</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.25)" }}>
                <span style={{ color: "#3b82f6", fontSize: "16px" }}>&#x2714;&#xFE0F;</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--c-text)]">Badge bleu verifie</p>
                <p className="text-xs text-[var(--c-text-muted)]">Visible sur ton profil et tes annonces</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.25)" }}>
                <span style={{ fontSize: "16px" }}>&#x1FA99;</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--c-text)]">+15 PawCoins</p>
                <p className="text-xs text-[var(--c-text-muted)]">Bonus de verification offert</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.25)" }}>
                <span style={{ fontSize: "16px" }}>&#x1F91D;</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--c-text)]">Plus de confiance</p>
                <p className="text-xs text-[var(--c-text-muted)]">Les autres utilisateurs te feront plus confiance</p>
              </div>
            </div>
          </div>
        </div>

        {/* Photo upload */}
        <div className="glass-strong rounded-2xl p-6 mb-6" style={{ border: "1px solid var(--c-border)" }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />

          {preview ? (
            <div className="mb-4">
              <div className="relative w-full aspect-square rounded-xl overflow-hidden mb-3" style={{ border: "2px solid var(--c-border)" }}>
                <Image
                  src={preview}
                  alt="Apercu de la photo"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 400px"
                />
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2 text-sm font-medium rounded-xl transition glass"
                style={{ color: "var(--c-text-muted)", border: "1px solid var(--c-border)" }}
              >
                Changer la photo
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-12 rounded-xl text-center transition hover:scale-[1.01]"
              style={{
                border: "2px dashed var(--c-border)",
                background: "var(--c-glass)",
              }}
            >
              <span className="block text-4xl mb-2">&#x1F4F7;</span>
              <p className="text-sm font-semibold text-[var(--c-text)]">
                Prends un selfie avec ton animal
              </p>
              <p className="text-xs text-[var(--c-text-muted)] mt-1">
                Touche pour ouvrir l&apos;appareil photo
              </p>
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div
            className="rounded-xl p-3 mb-4 text-center text-sm font-medium"
            style={{
              background: "rgba(239,68,68,0.15)",
              color: "#fca5a5",
              border: "1px solid rgba(239,68,68,0.3)",
            }}
          >
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!file || submitting}
          className="w-full py-3.5 rounded-xl font-bold text-sm transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
          style={{
            background: file
              ? "linear-gradient(135deg, #3b82f6, #2563eb)"
              : "var(--c-glass)",
            color: file ? "#fff" : "var(--c-text-muted)",
            boxShadow: file ? "0 4px 20px rgba(59,130,246,0.3)" : "none",
          }}
        >
          {submitting ? (
            <span className="inline-flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Verification en cours...
            </span>
          ) : (
            "Verifier mon profil"
          )}
        </button>
      </div>
    </div>
  );
}
