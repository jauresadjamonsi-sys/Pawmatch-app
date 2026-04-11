"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { useAppContext } from "@/lib/contexts/AppContext";
import { getMyMatches, respondToMatch } from "@/lib/services/matches";
import type { MatchWithAnimals } from "@/lib/types";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";
import PresenceDot from "@/lib/components/PresenceDot";
import Link from "next/link";
import Image from "next/image";
import { EMOJI_MAP } from "@/lib/constants";

const SPECIES_GLOW: Record<string, string> = {
  chien: "neon-green",
  chat: "neon-purple",
  lapin: "neon-cyan",
  oiseau: "neon-cyan",
  rongeur: "neon-purple",
  autre: "neon-green",
};

const SPECIES_RING: Record<string, string> = {
  chien: "ring-amber-400/60 shadow-[0_0_15px_rgba(251,191,36,0.3)]",
  chat: "ring-purple-400/60 shadow-[0_0_15px_rgba(167,139,250,0.3)]",
  lapin: "ring-cyan-400/60 shadow-[0_0_15px_rgba(56,189,248,0.3)]",
  oiseau: "ring-cyan-400/60 shadow-[0_0_15px_rgba(56,189,248,0.3)]",
  rongeur: "ring-purple-400/60 shadow-[0_0_15px_rgba(167,139,250,0.3)]",
  autre: "ring-amber-400/60 shadow-[0_0_15px_rgba(251,191,36,0.3)]",
};

const CONFETTI_COLORS = ["#FBBF24","#4ADE80","#FCD34D","#34d399","#60a5fa","#f472b6","#a78bfa"];
const CONFETTI_SHAPES = ["circle", "square", "star", "heart", "paw"];

function CoupDeTruffe({ match, onClose, t }: { match: MatchWithAnimals; onClose: () => void; t: Record<string, string> }) {
  const [confetti, setConfetti] = useState<Array<{id:number;x:number;color:string;size:number;delay:number;duration:number;shape:string;rotation:number}>>([]);

  useEffect(() => {
    const items = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: Math.random() * 12 + 5,
      delay: Math.random() * 2.5,
      duration: Math.random() * 3 + 2,
      shape: CONFETTI_SHAPES[Math.floor(Math.random() * CONFETTI_SHAPES.length)],
      rotation: Math.random() * 720,
    }));
    setConfetti(items);

    // Play match celebration sound (first 6 seconds)
    let cleanAudio: (() => void) | null = null;
    try {
      const audio = new Audio("/match-sound.mp3");
      audio.volume = 0.6;
      audio.play().catch(() => {});
      const stopTimer = setTimeout(() => { audio.pause(); audio.currentTime = 0; }, 6000);
      cleanAudio = () => { clearTimeout(stopTimer); audio.pause(); };
    } catch {}

    const timer = setTimeout(onClose, 5000);
    return () => { clearTimeout(timer); if (cleanAudio) cleanAudio(); };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md"
      onClick={onClose}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes confettiFall {
          0% { transform: translateY(-20px) rotate(0deg) scale(1); opacity: 1; }
          50% { opacity: 1; }
          100% { transform: translateY(100vh) rotate(1080deg) scale(0.5); opacity: 0; }
        }
        @keyframes truffePop {
          0% { transform: scale(0) rotate(-10deg); opacity: 0; }
          60% { transform: scale(1.2) rotate(5deg); opacity: 1; }
          80% { transform: scale(0.95) rotate(-2deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes pawBeat {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 8px rgba(34, 197, 94,0.4)); }
          50% { transform: scale(1.2); filter: drop-shadow(0 0 20px rgba(34, 197, 94,0.7)); }
        }
        @keyframes slideUp {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes ringPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94,0.4), 0 0 20px rgba(34, 197, 94,0.2); }
          50% { box-shadow: 0 0 0 8px rgba(34, 197, 94,0), 0 0 30px rgba(34, 197, 94,0.4); }
        }
        .confetti-piece { animation: confettiFall linear infinite; }
        .truffe-pop { animation: truffePop 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        .paw-beat { animation: pawBeat 1s ease-in-out infinite; }
        .slide-up { animation: slideUp 0.5s ease-out forwards; opacity: 0; }
        .ring-pulse { animation: ringPulse 2s ease-in-out infinite; }
      `}} />

      {/* Confetti with variety */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {confetti.map((c) => (
          <div key={c.id} className="confetti-piece absolute top-0"
            style={{
              left: c.x + "%",
              width: c.size + "px",
              height: c.size + "px",
              backgroundColor: c.shape === "star" || c.shape === "heart" || c.shape === "paw" ? "transparent" : c.color,
              borderRadius: c.shape === "circle" ? "50%" : c.shape === "square" ? "2px" : "0",
              animationDelay: c.delay + "s",
              animationDuration: c.duration + "s",
              transform: `rotate(${c.rotation}deg)`,
              fontSize: c.shape === "heart" ? c.size * 1.2 + "px" : c.shape === "paw" ? c.size * 1.2 + "px" : c.shape === "star" ? c.size * 1.2 + "px" : undefined,
            }}>
            {c.shape === "heart" && "❤️"}
            {c.shape === "star" && "✨"}
            {c.shape === "paw" && "🐾"}
          </div>
        ))}
      </div>

      {/* Card */}
      <div className="relative truffe-pop glass-strong p-6 md:p-10 text-center max-w-sm mx-4 neon-green"
        onClick={(e) => e.stopPropagation()}>

        {/* Animated gradient border */}
        <div className="absolute inset-0 rounded-[24px] gradient-border pointer-events-none" />

        {/* Background glow */}
        <div className="absolute inset-0 rounded-[24px] bg-amber-400/5 blur-2xl" />

        {/* Paw */}
        <div className="paw-beat text-7xl mb-4">🐾</div>

        {/* Title */}
        <h2 className="slide-up text-3xl font-extrabold gradient-text-warm mb-1"
          style={{ animationDelay: "0.2s" }}>
          {t.matchesCoup}
        </h2>
        <p className="slide-up text-[var(--c-text-muted)] text-sm mb-6" style={{ animationDelay: "0.3s" }}>
          {t.matchesMutual} 🎉
        </p>

        {/* Animals */}
        <div className="slide-up flex items-center justify-center gap-4 mb-6" style={{ animationDelay: "0.4s" }}>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-amber-400/20 ring-2 ring-amber-400/50 flex items-center justify-center overflow-hidden mx-auto mb-1 ring-pulse relative">
              {match.sender_animal.photo_url
                ? <Image src={match.sender_animal.photo_url} alt={match.sender_animal.name} fill className="object-cover" sizes="(max-width: 768px) 64px, 64px" />
                : <span className="text-2xl">{EMOJI_MAP[match.sender_animal.species] || "🐾"}</span>}
            </div>
            <p className="text-xs text-[var(--c-text)] font-semibold">{match.sender_animal.name}</p>
          </div>

          <div className="text-3xl paw-beat">💥</div>

          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-pink-500/20 ring-2 ring-pink-500/50 flex items-center justify-center overflow-hidden mx-auto mb-1 ring-pulse relative">
              {match.receiver_animal.photo_url
                ? <Image src={match.receiver_animal.photo_url} alt={match.receiver_animal.name} fill className="object-cover" sizes="(max-width: 768px) 64px, 64px" />
                : <span className="text-2xl">{EMOJI_MAP[match.receiver_animal.species] || "🐾"}</span>}
            </div>
            <p className="text-xs text-[var(--c-text)] font-semibold">{match.receiver_animal.name}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="slide-up flex gap-3" style={{ animationDelay: "0.5s" }}>
          <Link href={"/matches/" + match.id}
            className="flex-1 py-3 btn-futuristic text-center text-sm">
            {t.matchesChat}
          </Link>
          <button onClick={onClose}
            className="px-4 py-3 glass text-[var(--c-text-muted)] text-sm hover:bg-[var(--c-card)] transition-all duration-300">
            {t.matchesLater}
          </button>
        </div>

        <p className="text-[10px] text-[var(--c-text-muted)] mt-4">{t.matchesAutoClose}</p>
      </div>
    </div>
  );
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<MatchWithAnimals[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coupDeTruffe, setCoupDeTruffe] = useState<MatchWithAnimals | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "received" | "confirmed" | "pending">("all");
  const supabase = createClient();
  const { profile, loading: authLoading } = useAuth();
  const { t } = useAppContext();

  // Collect all other-user IDs for presence (must be before early returns for hooks rule)
  const otherUserIds = profile
    ? matches.map((m) => m.sender_user_id === profile.id ? m.receiver_user_id : m.sender_user_id).filter(Boolean)
    : [];
  const { onlineMap } = useOnlineStatus(otherUserIds);

  useEffect(() => {
    if (profile) fetchMatches();
    else if (!authLoading) setLoading(false);
  }, [profile, authLoading]);

  async function fetchMatches() {
    setLoading(true);
    const result = await getMyMatches(supabase, profile!.id);
    if (result.error) {
      setError(result.error);
    } else {
      setMatches(result.data || []);
    }
    setLoading(false);
  }

  async function handleRespond(matchId: string, response: "accepted" | "rejected") {
    const result = await respondToMatch(supabase, matchId, response);
    if (result.error) {
      setError(result.error);
    } else {
      await fetchMatches();
      if (response === "accepted") {
        const result2 = await getMyMatches(supabase, profile!.id);
        const acceptedMatch = (result2.data || []).find(m => m.id === matchId);
        if (acceptedMatch) setCoupDeTruffe(acceptedMatch);
      }
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[var(--c-deep,#1a1225)] flex items-center justify-center">
        <div className="aurora-bg" />
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
            <div className="absolute inset-0 w-14 h-14 rounded-full neon-green animate-breathe" />
          </div>
          <p className="text-[var(--c-text-muted)] text-sm animate-breathe">{t.loading}</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[var(--c-deep,#1a1225)] flex items-center justify-center">
        <div className="aurora-bg" />
        <div className="glass-strong p-8 text-center max-w-md animate-scale-in">
          <div className="gradient-border absolute inset-0 pointer-events-none rounded-[24px]" />
          <h2 className="text-xl font-bold gradient-text mb-2">{t.matchesLoginRequired}</h2>
          <p className="text-[var(--c-text-muted)]">{t.matchesLoginMsg}</p>
        </div>
      </div>
    );
  }

  // Deduplicate accepted matches — mutual matches create 2 DB rows (A→B + B→A)
  const acceptedRaw = matches.filter((m) => m.status === "accepted");
  const seenPairs = new Set<string>();
  const accepted = acceptedRaw.filter((m) => {
    const key = [m.sender_animal_id, m.receiver_animal_id].sort().join("-");
    if (seenPairs.has(key)) return false;
    seenPairs.add(key);
    return true;
  });

  // Build set of accepted pair keys to exclude from pending
  const acceptedPairKeys = new Set(accepted.map((m) =>
    [m.sender_animal_id, m.receiver_animal_id].sort().join("-")
  ));

  // Filter pending — exclude pairs that already have an accepted match
  const pendingReceived = matches.filter((m) => {
    if (m.status !== "pending" || m.receiver_user_id !== profile.id) return false;
    const key = [m.sender_animal_id, m.receiver_animal_id].sort().join("-");
    return !acceptedPairKeys.has(key);
  });
  const pendingSent = matches.filter((m) => {
    if (m.status !== "pending" || m.sender_user_id !== profile.id) return false;
    const key = [m.sender_animal_id, m.receiver_animal_id].sort().join("-");
    return !acceptedPairKeys.has(key);
  });

  const filteredSections = {
    all: { pendingReceived, accepted, pendingSent },
    received: { pendingReceived, accepted: [], pendingSent: [] },
    confirmed: { pendingReceived: [], accepted, pendingSent: [] },
    pending: { pendingReceived: [], accepted: [], pendingSent },
  };

  const current = filteredSections[activeTab];

  function AnimalBadge({ animal, isNew, userId }: { animal: { name: string; species: string; breed: string | null; photo_url: string | null }; isNew?: boolean; userId?: string }) {
    const ringClass = SPECIES_RING[animal.species] || SPECIES_RING.autre;
    return (
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className={`w-12 h-12 rounded-full bg-[var(--c-card)] flex items-center justify-center overflow-hidden flex-shrink-0 ring-2 ${ringClass} transition-all duration-500 relative`}>
            {animal.photo_url
              ? <Image src={animal.photo_url} alt={animal.name} fill className="object-cover" sizes="(max-width: 768px) 48px, 48px" />
              : <span className="text-xl">{EMOJI_MAP[animal.species] || "🐾"}</span>}
          </div>
          {userId && (
            <span className="absolute -bottom-0.5 -right-0.5">
              <PresenceDot isOnline={onlineMap.get(userId) ?? false} size="sm" />
            </span>
          )}
        </div>
        <div>
          <p className="font-semibold text-[var(--c-text,white)] text-sm">{animal.name}</p>
          <p className="text-xs text-[var(--c-text-muted)]">
            {animal.species.charAt(0).toUpperCase() + animal.species.slice(1)}
            {animal.breed ? " · " + animal.breed : ""}
          </p>
        </div>
      </div>
    );
  }

  const tabs = [
    { key: "all" as const, label: t.matchesTitle || "Tous", count: matches.length },
    { key: "received" as const, label: t.matchesReceived || "Reçus", count: pendingReceived.length },
    { key: "confirmed" as const, label: t.matchesConfirmed || "Confirmés", count: accepted.length },
    { key: "pending" as const, label: t.matchesPending || "En attente", count: pendingSent.length },
  ];

  return (
    <div className="min-h-screen bg-[var(--c-deep,#1a1225)] p-6 page-transition animate-page-in">
      <div className="aurora-bg" />

      {coupDeTruffe && (
        <CoupDeTruffe match={coupDeTruffe} onClose={() => setCoupDeTruffe(null)} t={t} />
      )}

      <div className="max-w-3xl mx-auto relative">
        {/* Title */}
        <div className="flex items-center gap-3 mb-2 animate-slide-up">
          <button onClick={() => window.history.length > 1 ? window.history.back() : (window.location.href = "/feed")} aria-label="Retour" className="inline-flex items-center justify-center w-9 h-9 rounded-full transition-all active:scale-90" style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--c-text)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <h1 className="text-3xl font-extrabold gradient-text mb-0">
            {t.matchesTitle}
          </h1>
        </div>
        <p className="text-[var(--c-text-muted)] text-sm mb-6 animate-slide-up" style={{ animationDelay: "0.05s" }}>
          {matches.length > 0
            ? `${matches.length} match${matches.length > 1 ? "s" : ""}`
            : ""}
        </p>

        {error && (
          <div className="mb-4 p-3 glass border-red-500/30 text-red-400 rounded-xl text-sm animate-scale-in"
            style={{ borderColor: "rgba(239,68,68,0.3)" }}>
            {error}
          </div>
        )}

        {/* Filter tabs */}
        {matches.length > 0 && (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`
                  glass px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap
                  transition-all duration-300 flex items-center gap-2
                  ${activeTab === tab.key
                    ? "neon-green text-amber-200 border-amber-400/40 bg-amber-400/10"
                    : "text-[var(--c-text-muted)] hover:text-[var(--c-text)] hover:bg-[var(--c-card)]"
                  }
                `}
                style={activeTab === tab.key ? { borderColor: "rgba(34, 197, 94,0.4)" } : {}}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`
                    px-1.5 py-0.5 rounded-full text-xs font-bold
                    ${activeTab === tab.key ? "bg-amber-400/30 text-amber-200" : "bg-[var(--c-card)] text-[var(--c-text-muted)]"}
                  `}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Demandes reçues */}
        {current.pendingReceived.length > 0 && (
          <div className="mb-8 animate-slide-up" style={{ animationDelay: "0.15s" }}>
            <h2 className="text-sm font-semibold text-[var(--c-text-muted)] uppercase tracking-widest mb-3 flex items-center gap-2">
              {t.matchesReceived}
              <span className="px-2 py-0.5 bg-amber-400/20 text-amber-200 rounded-full normal-case text-xs neon-green">
                {current.pendingReceived.length}
              </span>
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-breathe ml-1" />
            </h2>
            <div className="space-y-3 stagger-children">
              {current.pendingReceived.map((match) => (
                <div key={match.id} className="glass-living blob-card gradient-border p-5 animate-card-in">
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                      <AnimalBadge animal={match.sender_animal} isNew userId={match.sender_user_id} />
                      <span className="text-amber-400 font-bold animate-float">→</span>
                      <AnimalBadge animal={match.receiver_animal} userId={match.receiver_user_id} />
                    </div>
                    <p className="text-sm text-[var(--c-text-muted)] mb-4">
                      {match.sender_profile.full_name || match.sender_profile.email} {t.matchesWants} {match.sender_animal.name} {t.matchesMeet} {match.receiver_animal.name}
                    </p>
                    <div className="flex gap-3">
                      <button onClick={() => handleRespond(match.id, "accepted")}
                        className="flex-1 py-2.5 font-semibold rounded-xl transition-all duration-300 text-sm text-white
                          bg-gradient-to-r from-amber-400 to-amber-500 animate-glow
                          hover:shadow-[0_0_20px_rgba(52,211,153,0.4)] hover:scale-[1.02] active:scale-[0.98]">
                        {t.matchesAccept}
                      </button>
                      <button onClick={() => handleRespond(match.id, "rejected")}
                        className="flex-1 py-2.5 glass text-[var(--c-text-muted)] font-semibold rounded-xl transition-all duration-300 text-sm
                          hover:bg-[var(--c-card)] hover:text-[var(--c-text)] active:scale-[0.98]">
                        {t.matchesDecline}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Matchs confirmés */}
        {current.accepted.length > 0 && (
          <div className="mb-8 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <h2 className="text-sm font-semibold text-[var(--c-text-muted)] uppercase tracking-widest mb-3 flex items-center gap-2">
              {t.matchesConfirmed}
              <span className="px-2 py-0.5 bg-amber-400/20 text-amber-300 rounded-full normal-case text-xs">
                {current.accepted.length}
              </span>
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-breathe ml-1" />
            </h2>
            <div className="space-y-3 stagger-children">
              {current.accepted.map((match) => {
                const isMe = match.sender_user_id === profile.id;
                const myAnimal = isMe ? match.sender_animal : match.receiver_animal;
                const theirAnimal = isMe ? match.receiver_animal : match.sender_animal;
                return (
                  <div key={match.id} className="glass-living blob-card p-5 animate-card-in"
                    style={{ borderColor: "rgba(52,211,153,0.2)" }}>
                    <div className="flex items-center gap-3 mb-3">
                      <AnimalBadge animal={myAnimal} />
                      <span className="text-amber-300 font-bold text-lg animate-breathe">♥</span>
                      <AnimalBadge animal={theirAnimal} userId={isMe ? match.receiver_user_id : match.sender_user_id} />
                    </div>
                    <div className="flex gap-3 mt-3">
                      <button onClick={() => setCoupDeTruffe(match)}
                        className="px-4 py-2 glass text-amber-200 rounded-xl text-xs font-semibold
                          hover:neon-green hover:bg-amber-400/10 transition-all duration-300"
                        style={{ borderColor: "rgba(34, 197, 94,0.3)" }}>
                        {"🐾 " + t.matchesCoup}
                      </button>
                      <Link href={"/matches/" + match.id}
                        className="flex-1 py-2 btn-futuristic text-center text-sm">
                        {t.matchesChat}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* En attente */}
        {current.pendingSent.length > 0 && (
          <div className="mb-8 animate-slide-up" style={{ animationDelay: "0.25s" }}>
            <h2 className="text-sm font-semibold text-[var(--c-text-muted)] uppercase tracking-widest mb-3 flex items-center gap-2">
              {t.matchesPending}
              <span className="px-2 py-0.5 bg-[var(--c-card)] text-[var(--c-text-muted)] rounded-full normal-case text-xs">
                {current.pendingSent.length}
              </span>
              <span className="w-2 h-2 rounded-full bg-amber-300 animate-breathe ml-1" />
            </h2>
            <div className="space-y-3 stagger-children">
              {current.pendingSent.map((match) => (
                <div key={match.id} className="glass-living blob-card p-5">
                  <div className="flex items-center gap-3">
                    <AnimalBadge animal={match.sender_animal} userId={match.sender_user_id} />
                    <span className="text-[var(--c-text-muted)] font-bold animate-breathe">→</span>
                    <AnimalBadge animal={match.receiver_animal} userId={match.receiver_user_id} />
                  </div>
                  <p className="text-xs text-[var(--c-text-muted)] mt-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-breathe" />
                    {t.matchesWaiting} {match.receiver_profile.full_name || match.receiver_profile.email}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {matches.length === 0 && (
          <div className="text-center py-16 animate-scale-in">
            {/* Floating emojis background */}
            <div className="relative mb-8">
              <div className="absolute -top-4 left-1/4 text-3xl animate-float" style={{ animationDelay: "0s" }}>💕</div>
              <div className="absolute -top-2 right-1/4 text-2xl animate-float" style={{ animationDelay: "0.5s" }}>🐾</div>
              <div className="absolute top-6 left-1/3 text-2xl animate-float" style={{ animationDelay: "1s" }}>✨</div>
              <div className="absolute top-4 right-1/3 text-3xl animate-float" style={{ animationDelay: "1.5s" }}>💛</div>
              <p className="text-6xl relative z-10 animate-float">💕</p>
            </div>
            <p className="text-2xl font-extrabold gradient-text-warm mb-2">{t.matchesNone}</p>
            <p className="text-[var(--c-text-muted)] mt-2 text-sm max-w-xs mx-auto">{t.matchesBrowse}</p>
            <Link href="/animals"
              className="inline-block mt-6 btn-futuristic animate-pulse-glow">
              {t.matchesDiscover}
            </Link>
          </div>
        )}

        {/* Empty filtered state */}
        {matches.length > 0 && current.pendingReceived.length === 0 && current.accepted.length === 0 && current.pendingSent.length === 0 && (
          <div className="text-center py-12 animate-scale-in">
            <p className="text-4xl mb-3 animate-float">🔍</p>
            <p className="text-[var(--c-text-muted)] text-sm">Aucun match dans cette catégorie</p>
          </div>
        )}
      </div>
    </div>
  );
}
