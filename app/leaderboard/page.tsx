"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import Link from "next/link";
import { EMOJI_MAP } from "@/lib/constants";

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
        const { data: profile } = await supabase.from("profiles").select("canton").eq("id", user.id).single();
        if (profile?.canton) setMyCanton(profile.canton);
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
          supabase.from("reel_likes").select("reel_id, reels!inner(animal_id)").in("reels.animal_id", animalIds).catch(() => ({ data: null })),
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
    <main id="main-content" className="max-w-2xl mx-auto px-4 py-6 pb-32">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-black gradient-text-warm mb-1">Classement</h1>
        <p className="text-sm" style={{ color: "var(--c-text-muted)" }}>Les animaux les plus populaires sur Pawly</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {[
          { key: "global", label: "Global" },
          { key: "canton", label: "Mon canton" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as "global" | "canton")}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
            style={{
              background: tab === t.key ? "linear-gradient(135deg, #f97316, #fb923c)" : "var(--c-glass)",
              color: tab === t.key ? "#fff" : "var(--c-text-muted)",
              border: tab === t.key ? "none" : "1px solid var(--c-border)",
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
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={{
              background: speciesFilter === sp.key ? "rgba(249,115,22,0.15)" : "var(--c-glass)",
              color: speciesFilter === sp.key ? "#f97316" : "var(--c-text-muted)",
              border: speciesFilter === sp.key ? "1.5px solid rgba(249,115,22,0.3)" : "1px solid var(--c-border)",
            }}
          >
            {sp.key !== "all" && (EMOJI_MAP[sp.key] || "")} {sp.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          <div className="flex justify-center gap-4">
            {[0, 1, 2].map(i => (
              <div key={i} className="glass rounded-2xl animate-breathe" style={{ width: 110, height: 150, animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="glass rounded-xl animate-breathe" style={{ height: 64, animationDelay: `${(i + 3) * 0.1}s` }} />
          ))}
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
            <PodiumCard entry={top3[1]} rank={1} />
          )}
          {/* 1st place */}
          {top3[0] && (
            <PodiumCard entry={top3[0]} rank={0} isFirst />
          )}
          {/* 3rd place */}
          {top3[2] && (
            <PodiumCard entry={top3[2]} rank={2} />
          )}
        </div>
      )}

      {/* Ranking list */}
      {!loading && rest.length > 0 && (
        <div className="space-y-2">
          {rest.map((entry, idx) => (
            <Link
              key={entry.id}
              href={`/animals/${entry.id}`}
              className="glass flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all hover:scale-[1.01]"
              style={{ textDecoration: "none" }}
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
                <span className="text-xs font-black px-2 py-0.5 rounded-full" style={{
                  background: "rgba(251,191,36,0.1)",
                  color: "#fbbf24",
                }}>
                  {entry.score}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
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
      <span className="text-2xl mb-1">{crowns[rank]}</span>

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
      <span className="mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{
        background: medal.bg,
        color: "#fff",
      }}>
        {entry.score} pts
      </span>
    </Link>
  );
}
