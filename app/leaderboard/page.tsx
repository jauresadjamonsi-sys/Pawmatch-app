"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import Link from "next/link";
import { EMOJI_MAP } from "@/lib/constants";

/** Inline animated score component using rAF count-up */
function AnimatedScore({ value, duration = 800, className, style }: {
  value: number; duration?: number;
  className?: string; style?: React.CSSProperties;
}) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number>(0);
  const [started, setStarted] = useState(false);
  const elRef = useRef<HTMLSpanElement>(null);

  // Start animation when element enters viewport
  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setStarted(true); obs.disconnect(); }
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!started || value <= 0) { setDisplay(value); return; }
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setDisplay(Math.round(eased * value));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration, started]);

  return (
    <span ref={elRef} className={`animate-score-reveal score-number ${className || ""}`} style={style}>
      {display}
    </span>
  );
}

type LeaderEntry = {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  photo_url: string | null;
  canton: string | null;
  city: string | null;
  created_by: string;
  match_count: number;
  like_count: number;
  score: number;
};

const SPECIES_CHIPS = [
  { key: "all", label: "Tous" },
  { key: "chien", label: "Chiens" },
  { key: "chat", label: "Chats" },
  { key: "lapin", label: "Lapins" },
  { key: "hamster", label: "Hamsters" },
  { key: "oiseau", label: "Oiseaux" },
  { key: "reptile", label: "Reptiles" },
];

const MEDAL_COLORS = [
  { bg: "linear-gradient(135deg, #fbbf24, #f59e0b)", border: "rgba(251,191,36,0.5)", shadow: "rgba(251,191,36,0.3)", label: "1er" },
  { bg: "linear-gradient(135deg, #d1d5db, #9ca3af)", border: "rgba(156,163,175,0.5)", shadow: "rgba(156,163,175,0.3)", label: "2e" },
  { bg: "linear-gradient(135deg, #d97706, #b45309)", border: "rgba(217,119,6,0.5)", shadow: "rgba(217,119,6,0.3)", label: "3e" },
];

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"global" | "canton">("global");
  const [speciesFilter, setSpeciesFilter] = useState("all");
  const [myCanton, setMyCanton] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Canton lives on animals, not profiles — get user's first animal's canton
        const { data: animals } = await supabase.from("animals").select("canton").eq("created_by", user.id).limit(1);
        if (animals?.[0]?.canton) setMyCanton(animals[0].canton);
      }
    }
    loadUser();
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // Get animals with their match counts
        let query = supabase
          .from("animals")
          .select("id, name, species, breed, photo_url, canton, city, created_by")
          .limit(50);

        if (tab === "canton" && myCanton) {
          query = query.eq("canton", myCanton);
        }
        if (speciesFilter !== "all") {
          query = query.eq("species", speciesFilter);
        }

        const { data: animals, error } = await query;
        if (error || !animals) { setLoading(false); return; }

        // Get match counts for these animals
        const animalIds = animals.map(a => a.id);

        const [matchRes, likeRes] = await Promise.all([
          supabase.from("matches").select("sender_animal_id, receiver_animal_id").or(
            animalIds.map(id => `sender_animal_id.eq.${id},receiver_animal_id.eq.${id}`).join(",")
          ),
          supabase.from("reel_likes").select("reel_id, reels!inner(animal_id)").in("reel_id", animalIds).catch(() => ({ data: null })),
        ]);

        // Count matches per animal
        const matchCounts: Record<string, number> = {};
        (matchRes.data || []).forEach((m: any) => {
          if (animalIds.includes(m.sender_animal_id)) {
            matchCounts[m.sender_animal_id] = (matchCounts[m.sender_animal_id] || 0) + 1;
          }
          if (animalIds.includes(m.receiver_animal_id)) {
            matchCounts[m.receiver_animal_id] = (matchCounts[m.receiver_animal_id] || 0) + 1;
          }
        });

        // Count likes per animal
        const likeCounts: Record<string, number> = {};
        if (likeRes && (likeRes as any).data) {
          ((likeRes as any).data || []).forEach((l: any) => {
            const aid = l.reels?.animal_id;
            if (aid) likeCounts[aid] = (likeCounts[aid] || 0) + 1;
          });
        }

        // Build entries with scores
        const scored: LeaderEntry[] = animals.map(a => ({
          ...a,
          match_count: matchCounts[a.id] || 0,
          like_count: likeCounts[a.id] || 0,
          score: (matchCounts[a.id] || 0) * 10 + (likeCounts[a.id] || 0) * 3,
        }));

        scored.sort((a, b) => b.score - a.score);
        setEntries(scored);
      } catch {
        // silently fail
      }
      setLoading(false);
    }
    load();
  }, [tab, speciesFilter, myCanton]);

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <main id="main-content" className="min-h-screen pb-32" style={{ background: "var(--c-deep)" }}>
     <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-3 mb-1">
          <button onClick={() => window.history.length > 1 ? window.history.back() : (window.location.href = "/feed")} aria-label="Retour" className="inline-flex items-center justify-center w-9 h-9 rounded-full transition-all active:scale-90 flex-shrink-0" style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--c-text)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <h1 className="text-3xl font-black gradient-text-warm">Classement</h1>
        </div>
        <p className="text-sm" style={{ color: "var(--c-text-muted)" }}>Les animaux les plus populaires sur Pawly</p>
      </div>

      {/* Tabs */}
      <div className="relative flex gap-2 mb-4">
        {[
          { key: "global", label: "Global" },
          { key: "canton", label: "Mon canton" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as "global" | "canton")}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ease-out"
            style={{
              background: tab === t.key ? "linear-gradient(135deg, #F59E0B, #4ADE80)" : "var(--c-glass)",
              color: tab === t.key ? "#fff" : "var(--c-text-muted)",
              border: tab === t.key ? "none" : "1px solid var(--c-border)",
              transform: tab === t.key ? "scale(1.02)" : "scale(1)",
              boxShadow: tab === t.key ? "0 4px 15px rgba(34, 197, 94,0.25)" : "none",
            }}
          >
            {t.key === "global" ? "🌍 " : "📍 "}{t.label}
          </button>
        ))}
      </div>

      {/* Species chips */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
        {SPECIES_CHIPS.map((sp) => (
          <button
            key={sp.key}
            onClick={() => setSpeciesFilter(sp.key)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 ease-out"
            style={{
              background: speciesFilter === sp.key ? "rgba(34, 197, 94,0.15)" : "var(--c-glass)",
              color: speciesFilter === sp.key ? "#F59E0B" : "var(--c-text-muted)",
              border: speciesFilter === sp.key ? "1.5px solid rgba(34, 197, 94,0.3)" : "1px solid var(--c-border)",
              transform: speciesFilter === sp.key ? "scale(1.08)" : "scale(1)",
            }}
          >
            {sp.key !== "all" && (EMOJI_MAP[sp.key] || "")} {sp.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          <div className="flex justify-center gap-4 stagger-children">
            {[0, 1, 2].map(i => (
              <div key={i} className="rounded-2xl animate-shimmer overflow-hidden" style={{ width: 110, height: 150 }}>
                <div className="w-full h-full" style={{ background: "var(--c-glass)" }} />
              </div>
            ))}
          </div>
          <div className="stagger-children space-y-2">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="rounded-xl animate-shimmer overflow-hidden" style={{ height: 64 }}>
                <div className="w-full h-full" style={{ background: "var(--c-glass)" }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && entries.length === 0 && (
        <div className="glass rounded-2xl p-10 text-center">
          <p className="text-4xl mb-3">🏆</p>
          <p className="text-sm font-semibold" style={{ color: "var(--c-text-muted)" }}>
            {tab === "canton" && !myCanton
              ? "Configure ton canton dans ton profil pour voir le classement local."
              : "Aucun animal trouve. Reviens bientot !"}
          </p>
        </div>
      )}

      {/* Podium */}
      {!loading && top3.length > 0 && (
        <div className="flex justify-center items-end gap-3 mb-6">
          {/* 2nd place */}
          {top3[1] && (
            <div className="animate-bounce-in" style={{ animationDelay: "0.2s", animationFillMode: "both" }}>
              <PodiumCard entry={top3[1]} rank={1} />
            </div>
          )}
          {/* 1st place */}
          {top3[0] && (
            <div className="animate-bounce-in" style={{ animationDelay: "0s", animationFillMode: "both" }}>
              <PodiumCard entry={top3[0]} rank={0} isFirst />
            </div>
          )}
          {/* 3rd place */}
          {top3[2] && (
            <div className="animate-bounce-in" style={{ animationDelay: "0.4s", animationFillMode: "both" }}>
              <PodiumCard entry={top3[2]} rank={2} />
            </div>
          )}
        </div>
      )}

      {/* Ranking list */}
      {!loading && rest.length > 0 && (
        <div className="space-y-2 stagger-children">
          {rest.map((entry, idx) => (
            <Link
              key={entry.id}
              href={`/animals/${entry.id}`}
              className="glass flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all hover:scale-[1.01] animate-slide-up"
              style={{ textDecoration: "none", animationDelay: `${idx * 0.05}s`, animationFillMode: "both" }}
            >
              {/* Rank */}
              <span className="text-sm font-black w-7 text-center" style={{ color: "var(--c-text-muted)" }}>
                {idx + 4}
              </span>

              {/* Photo */}
              <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0" style={{ border: "2px solid var(--c-border)" }}>
                {entry.photo_url ? (
                  <Image src={entry.photo_url} alt={entry.name} fill className="object-cover" sizes="40px" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-lg" style={{ background: "var(--c-glass)" }}>
                    {EMOJI_MAP[entry.species] || "🐾"}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate" style={{ color: "var(--c-text)" }}>
                  {EMOJI_MAP[entry.species] || "🐾"} {entry.name}
                </p>
                <p className="text-[10px] truncate" style={{ color: "var(--c-text-muted)" }}>
                  {entry.breed || entry.species}{entry.canton ? ` · ${entry.canton}` : ""}
                </p>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-[10px] font-semibold" style={{ color: "var(--c-text-muted)" }}>
                  🐾 {entry.match_count}
                </span>
                <span className="text-[10px] font-semibold" style={{ color: "var(--c-text-muted)" }}>
                  ❤️ {entry.like_count}
                </span>
                <AnimatedScore value={entry.score} className="text-xs font-black px-2 py-0.5 rounded-full" style={{
                  background: "rgba(251,191,36,0.1)",
                  color: "#fbbf24",
                  /* override score-number gradient for inline use */
                  backgroundClip: "unset",
                  WebkitBackgroundClip: "unset",
                  WebkitTextFillColor: "#fbbf24",
                  fontSize: "inherit",
                  fontWeight: "inherit",
                  lineHeight: "inherit",
                  letterSpacing: "inherit",
                }} />
              </div>
            </Link>
          ))}
        </div>
      )}
     </div>
    </main>
  );
}

function PodiumCard({ entry, rank, isFirst }: { entry: LeaderEntry; rank: number; isFirst?: boolean }) {
  const medal = MEDAL_COLORS[rank];
  const crowns = ["👑", "🥈", "🥉"];

  return (
    <Link
      href={`/animals/${entry.id}`}
      className="flex flex-col items-center text-center transition-all hover:scale-105"
      style={{ textDecoration: "none", width: isFirst ? 130 : 110 }}
    >
      {/* Crown / medal */}
      <span className={`text-2xl mb-1 ${isFirst ? "animate-wiggle" : ""}`}>{crowns[rank]}</span>

      {/* Photo */}
      <div
        className="relative rounded-full overflow-hidden mb-2"
        style={{
          width: isFirst ? 80 : 64,
          height: isFirst ? 80 : 64,
          border: `3px solid`,
          borderColor: medal.border,
          boxShadow: `0 4px 15px ${medal.shadow}`,
        }}
      >
        {entry.photo_url ? (
          <Image src={entry.photo_url} alt={entry.name} fill className="object-cover" sizes={isFirst ? "80px" : "64px"} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl" style={{ background: medal.bg }}>
            {EMOJI_MAP[entry.species] || "🐾"}
          </div>
        )}
      </div>

      {/* Name */}
      <p className="text-xs font-black truncate w-full" style={{ color: "var(--c-text)" }}>
        {entry.name}
      </p>
      <p className="text-[10px] truncate w-full" style={{ color: "var(--c-text-muted)" }}>
        {entry.breed || entry.species}
      </p>

      {/* Score badge */}
      <span className="mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full animate-score-reveal" style={{
        background: medal.bg,
        color: "#fff",
      }}>
        <AnimatedScore value={entry.score} className="" style={{
          background: "none",
          backgroundClip: "unset",
          WebkitBackgroundClip: "unset",
          WebkitTextFillColor: "#fff",
          fontSize: "inherit",
          fontWeight: "inherit",
          lineHeight: "inherit",
          letterSpacing: "inherit",
        }} /> pts
      </span>
    </Link>
  );
}
