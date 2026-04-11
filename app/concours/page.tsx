"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import Image from "next/image";
import Link from "next/link";

// ── Types ──────────────────────────────────────────────
type ContestEntry = {
  id: string;
  animal_id: string;
  photo_url: string;
  vote_count: number;
  created_at: string;
  animal: {
    id: string;
    name: string;
    breed: string | null;
    canton: string | null;
    photo_url: string | null;
  } | null;
  has_voted?: boolean;
};

type UserAnimal = {
  id: string;
  name: string;
  photo_url: string | null;
  species: string;
};

// ── Hardcoded active contest ──────────────────────────
const ACTIVE_CONTEST = {
  id: "avril-2026",
  title: "Le plus bel animal de Suisse - Avril 2026",
  endDate: new Date("2026-04-30T23:59:59"),
  rules: [
    "1 photo par animal",
    "Votes illimites",
    "Ouvert a tous les animaux inscrits sur Pawly",
  ],
};

function useCountdown(target: Date) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const diff = Math.max(0, target.getTime() - now.getTime());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  return { days, hours, minutes, seconds, isOver: diff === 0 };
}

// ── Main page ─────────────────────────────────────────
export default function ConcoursPage() {
  const [entries, setEntries] = useState<ContestEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState<string | null>(null);
  const [showParticipate, setShowParticipate] = useState(false);
  const [myAnimals, setMyAnimals] = useState<UserAnimal[]>([]);
  const [loadingAnimals, setLoadingAnimals] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { profile } = useAuth();
  const supabase = createClient();
  const countdown = useCountdown(ACTIVE_CONTEST.endDate);

  // ── Fetch entries ──
  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/contests");
      const data = await res.json();
      if (data.entries) {
        setEntries(data.entries);
      }
    } catch (err) {
      console.error("[Concours] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // ── Vote toggle ──
  async function handleVote(entryId: string) {
    if (!profile) {
      window.location.href = "/login";
      return;
    }
    setVoting(entryId);
    try {
      const res = await fetch("/api/contests/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entry_id: entryId }),
      });
      if (res.ok) {
        await fetchEntries();
      }
    } catch (err) {
      console.error("[Concours] vote error:", err);
    } finally {
      setVoting(null);
    }
  }

  // ── Open participate modal ──
  async function openParticipateModal() {
    if (!profile) {
      window.location.href = "/login";
      return;
    }
    setShowParticipate(true);
    setLoadingAnimals(true);
    setSubmitError(null);

    const { data: animals } = await supabase
      .from("animals")
      .select("id, name, photo_url, species")
      .eq("created_by", profile.id);

    setMyAnimals(animals || []);
    setLoadingAnimals(false);
  }

  // ── Handle photo selection ──
  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  // ── Submit entry ──
  async function handleSubmitEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || !selectedAnimal || !photoFile) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const formData = new FormData();
      formData.append("animal_id", selectedAnimal);
      formData.append("photo", photoFile);

      const res = await fetch("/api/contests", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || "Erreur lors de la soumission");
        setSubmitting(false);
        return;
      }

      // Reset and close modal
      setShowParticipate(false);
      setSelectedAnimal(null);
      setPhotoFile(null);
      setPhotoPreview(null);
      await fetchEntries();
    } catch (err) {
      console.error("[Concours] submit error:", err);
      setSubmitError("Erreur inattendue. Reessayez.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Top 5 leaderboard ──
  const leaderboard = [...entries]
    .sort((a, b) => b.vote_count - a.vote_count)
    .slice(0, 5);

  const MEDAL = ["🥇", "🥈", "🥉", "4.", "5."];

  return (
    <main className="min-h-screen pb-32" style={{ background: "var(--c-deep)" }}>
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* ══ Header ══ */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <button onClick={() => window.history.length > 1 ? window.history.back() : (window.location.href = "/feed")} aria-label="Retour" className="inline-flex items-center justify-center w-9 h-9 rounded-full transition-all active:scale-90 flex-shrink-0" style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--c-text)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <h1 className="text-3xl md:text-4xl font-extrabold gradient-text-warm">
              Concours Pawly
            </h1>
          </div>
          <p className="text-[var(--c-text-muted)] text-sm md:text-base">
            Vote pour le plus bel animal !
          </p>
        </div>

        {/* ══ Active contest info ══ */}
        <div className="glass-strong rounded-2xl p-6 border border-[var(--c-border)] mb-8">
          <h2 className="text-lg md:text-xl font-bold text-[var(--c-text)] mb-3">
            {ACTIVE_CONTEST.title}
          </h2>

          {/* Countdown */}
          <div className="flex flex-wrap gap-3 mb-4">
            {[
              { label: "jours", value: countdown.days },
              { label: "heures", value: countdown.hours },
              { label: "min", value: countdown.minutes },
              { label: "sec", value: countdown.seconds },
            ].map((unit) => {
              const isUrgent = countdown.days === 0 && countdown.hours === 0;
              return (
                <div
                  key={unit.label}
                  className={`flex flex-col items-center px-4 py-2 rounded-xl bg-[var(--c-glass)] min-w-[60px] transition-all ${isUrgent ? "animate-pulse" : ""}`}
                  style={isUrgent ? { boxShadow: "0 0 12px rgba(239,68,68,0.3)", borderColor: "rgba(239,68,68,0.3)" } : {}}
                >
                  <span className={`text-xl font-bold ${isUrgent ? "text-red-400" : "text-[var(--c-text)]"}`}>
                    {String(unit.value).padStart(2, "0")}
                  </span>
                  <span className="text-[10px] text-[var(--c-text-muted)] uppercase tracking-wider">
                    {unit.label}
                  </span>
                </div>
              );
            })}
            {countdown.isOver && (
              <span className="self-center text-sm font-semibold text-amber-400">
                Concours termine !
              </span>
            )}
          </div>

          {/* Rules */}
          <div className="flex flex-wrap gap-2 mb-4">
            {ACTIVE_CONTEST.rules.map((rule) => (
              <span
                key={rule}
                className="text-xs px-3 py-1.5 rounded-full bg-[var(--c-glass)] text-[var(--c-text-muted)]"
              >
                {rule}
              </span>
            ))}
          </div>

          {/* Participate button */}
          {!countdown.isOver && (
            <button
              onClick={openParticipateModal}
              className="btn-press px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white text-sm font-bold shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-all"
            >
              Participer au concours
            </button>
          )}
        </div>

        {/* ══ Layout: entries + leaderboard ══ */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* ── Photo grid ── */}
          <div className="flex-1">
            <h3 className="text-lg font-bold text-[var(--c-text)] mb-4">
              Participants ({entries.length})
            </h3>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 stagger-children">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-2xl animate-shimmer overflow-hidden" style={{ border: "1px solid var(--c-border)" }}>
                    <div className="aspect-square w-full" style={{ background: "var(--c-glass)" }} />
                    <div className="p-4 space-y-3">
                      <div className="flex justify-between">
                        <div className="h-4 rounded-lg w-1/3" style={{ background: "var(--c-glass)" }} />
                        <div className="h-3 rounded-lg w-1/4" style={{ background: "var(--c-glass)" }} />
                      </div>
                      <div className="h-9 rounded-xl w-full" style={{ background: "var(--c-glass)" }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : entries.length === 0 ? (
              <div className="glass-strong rounded-2xl p-10 text-center">
                <div className="text-4xl mb-3">📸</div>
                <p className="text-[var(--c-text)] font-semibold mb-1">
                  Aucun participant pour l&apos;instant
                </p>
                <p className="text-[var(--c-text-muted)] text-sm">
                  Sois le premier a inscrire ton animal !
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 stagger-children">
                {entries.map((entry, entryIdx) => (
                  <div
                    key={entry.id}
                    className="glass-strong rounded-2xl overflow-hidden border border-[var(--c-border)] card-hover animate-fade-in-scale"
                    style={{ animationDelay: `${entryIdx * 0.08}s`, animationFillMode: "both" }}
                  >
                    {/* Photo */}
                    <div className="relative aspect-square w-full bg-[var(--c-deep)] overflow-hidden">
                      <Image
                        src={entry.photo_url}
                        alt={entry.animal?.name || "Photo concours"}
                        fill
                        className="object-cover transition-transform duration-500 ease-out hover:scale-110"
                        sizes="(max-width: 640px) 100vw, 50vw"
                      />
                    </div>

                    {/* Info */}
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-1">
                        <Link
                          href={`/animals/${entry.animal_id}`}
                          className="font-bold text-[var(--c-text)] hover:text-amber-400 transition-colors"
                        >
                          {entry.animal?.name || "Animal"}
                        </Link>
                        <span className="text-xs text-[var(--c-text-muted)]">
                          {entry.vote_count}{" "}
                          {entry.vote_count === 1 ? "vote" : "votes"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-[var(--c-text-muted)] mb-3">
                        {entry.animal?.breed && (
                          <span>{entry.animal.breed}</span>
                        )}
                        {entry.animal?.breed && entry.animal?.canton && (
                          <span className="w-1 h-1 rounded-full bg-[var(--c-text-muted)] opacity-40" />
                        )}
                        {entry.animal?.canton && (
                          <span>📍 {entry.animal.canton}</span>
                        )}
                      </div>

                      {/* Vote button */}
                      <button
                        onClick={() => handleVote(entry.id)}
                        disabled={voting === entry.id || countdown.isOver}
                        className={
                          "btn-press w-full py-2 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-1.5 relative overflow-hidden " +
                          (entry.has_voted
                            ? "bg-gradient-to-r from-pink-500 to-red-500 text-white shadow-md shadow-pink-500/20"
                            : "border border-[var(--c-border)] text-[var(--c-text-muted)] hover:border-pink-400/50 hover:text-pink-400 hover:bg-pink-500/10")
                        }
                      >
                        <svg
                          className="w-4 h-4"
                          fill={entry.has_voted ? "currentColor" : "none"}
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                          />
                        </svg>
                        {voting === entry.id
                          ? "..."
                          : entry.has_voted
                            ? "Vote !"
                            : "Voter"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Leaderboard sidebar ── */}
          {leaderboard.length > 0 && (
            <div className="lg:w-72 shrink-0">
              <div className="glass-strong rounded-2xl p-5 border border-[var(--c-border)] sticky top-8">
                <h3 className="text-base font-bold text-[var(--c-text)] mb-4">
                  Classement
                </h3>
                <div className="flex flex-col gap-3 stagger-children">
                  {leaderboard.map((entry, idx) => (
                    <div
                      key={entry.id}
                      className="flex items-center gap-3 animate-slide-up"
                      style={{ animationDelay: `${idx * 0.1}s`, animationFillMode: "both" }}
                    >
                      <span className="text-lg w-7 text-center">
                        {MEDAL[idx]}
                      </span>
                      <div className="relative w-10 h-10 rounded-full overflow-hidden bg-[var(--c-glass)] shrink-0 border border-[var(--c-border)]">
                        {entry.animal?.photo_url || entry.photo_url ? (
                          <Image
                            src={entry.animal?.photo_url || entry.photo_url}
                            alt={entry.animal?.name || "Animal"}
                            fill
                            className="object-cover"
                            sizes="40px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sm text-[var(--c-text-muted)]">
                            🐾
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[var(--c-text)] truncate">
                          {entry.animal?.name || "Animal"}
                        </p>
                        <p className="text-xs text-[var(--c-text-muted)]">
                          {entry.vote_count}{" "}
                          {entry.vote_count === 1 ? "vote" : "votes"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══ Participate Modal ══ */}
      {showParticipate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowParticipate(false);
          }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Modal */}
          <div className="relative w-full max-w-md glass-strong rounded-2xl p-6 border border-[var(--c-border)] shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-[var(--c-text)]">
                Participer au concours
              </h2>
              <button
                onClick={() => setShowParticipate(false)}
                className="p-1.5 rounded-full hover:bg-[var(--c-glass)] transition-colors text-[var(--c-text-muted)]"
                aria-label="Fermer"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmitEntry} className="flex flex-col gap-4">
              {/* Select animal */}
              <div>
                <label className="text-sm font-medium text-[var(--c-text)] mb-2 block">
                  Choisis ton animal
                </label>
                {loadingAnimals ? (
                  <div className="py-4 text-center text-sm text-[var(--c-text-muted)]">
                    Chargement...
                  </div>
                ) : myAnimals.length === 0 ? (
                  <div className="py-4 text-center">
                    <p className="text-sm text-[var(--c-text-muted)] mb-2">
                      Tu n&apos;as pas encore d&apos;animal enregistre.
                    </p>
                    <Link
                      href="/profile/animals/new"
                      className="text-sm text-amber-400 hover:underline"
                    >
                      Ajouter un animal
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {myAnimals.map((animal) => (
                      <button
                        key={animal.id}
                        type="button"
                        onClick={() => setSelectedAnimal(animal.id)}
                        className={
                          "flex items-center gap-2 p-3 rounded-xl transition-all text-left " +
                          (selectedAnimal === animal.id
                            ? "bg-amber-500/20 ring-2 ring-amber-500 border-transparent"
                            : "border border-[var(--c-border)] hover:border-amber-500/30")
                        }
                      >
                        <div className="relative w-10 h-10 rounded-full overflow-hidden bg-[var(--c-glass)] shrink-0">
                          {animal.photo_url ? (
                            <Image
                              src={animal.photo_url}
                              alt={animal.name}
                              fill
                              className="object-cover"
                              sizes="40px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-sm">
                              🐾
                            </div>
                          )}
                        </div>
                        <span className="text-sm font-medium text-[var(--c-text)] truncate">
                          {animal.name}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Photo upload */}
              <div>
                <label className="text-sm font-medium text-[var(--c-text)] mb-2 block">
                  Photo du concours
                </label>
                {photoPreview ? (
                  <div className="relative">
                    <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-[var(--c-deep)]">
                      <Image
                        src={photoPreview}
                        alt="Apercu"
                        fill
                        className="object-cover"
                        sizes="400px"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoFile(null);
                        setPhotoPreview(null);
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-2 py-8 rounded-xl border-2 border-dashed border-[var(--c-border)] hover:border-amber-500/30 cursor-pointer transition-colors">
                    <svg
                      className="w-8 h-8 text-[var(--c-text-muted)]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
                      />
                    </svg>
                    <span className="text-sm text-[var(--c-text-muted)]">
                      Choisir une photo
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Error */}
              {submitError && (
                <p className="text-red-400 text-sm text-center">
                  {submitError}
                </p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={
                  submitting || !selectedAnimal || !photoFile || myAnimals.length === 0
                }
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {submitting ? "Envoi en cours..." : "Soumettre ma participation"}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
