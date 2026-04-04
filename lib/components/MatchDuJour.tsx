"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { detectPersonality } from "@/lib/services/personality";

const EMOJI_MAP: Record<string, string> = {
  chien: "🐕", chat: "🐱", lapin: "🐰",
  oiseau: "🐦", rongeur: "🐹", autre: "🐾",
};

const LABELS: Record<string, Record<string, string>> = {
  fr: { title: "Match du jour", sub: "Notre recommandation pour", cta: "Voir le profil →", loading: "Recherche en cours..." },
  de: { title: "Match des Tages", sub: "Unsere Empfehlung für", cta: "Profil ansehen →", loading: "Suche läuft..." },
  it: { title: "Match del giorno", sub: "La nostra raccomandazione per", cta: "Vedi il profilo →", loading: "Ricerca in corso..." },
  en: { title: "Match of the day", sub: "Our recommendation for", cta: "View profile →", loading: "Searching..." },
};

type MatchData = {
  animal: {
    id: string; name: string; species: string; breed: string | null;
    photo_url: string | null; canton: string | null; city: string | null; traits: string[];
  };
  compatibility: { score: number; label: string; color: string; reasons: string[] };
  myAnimalName: string;
};

export function MatchDuJour({ lang }: { lang: string }) {
  const [match, setMatch] = useState<MatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const l = LABELS[lang] || LABELS.fr;

  useEffect(() => {
    fetch("/api/match-du-jour")
      .then(r => r.json())
      .then(data => { setMatch(data.match); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="bg-[var(--c-card)] border border-[var(--c-border)] rounded-2xl p-5 text-center">
      <span className="text-2xl animate-pulse">🐾</span>
      <p className="text-xs text-[var(--c-text-muted)] mt-2">{l.loading}</p>
    </div>
  );

  if (!match) return null;

  const personality = detectPersonality(match.animal.traits || []);

  return (
    <div className="bg-[var(--c-card)] border-2 rounded-2xl p-5 overflow-hidden relative" style={{ borderColor: match.compatibility.color + "40" }}>
      {/* Shimmer */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: `linear-gradient(135deg, transparent, ${match.compatibility.color}08, transparent)`,
      }} />

      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">⭐</span>
            <div>
              <h3 className="font-extrabold text-sm text-[var(--c-text)]">{l.title}</h3>
              <p className="text-[10px] text-[var(--c-text-muted)]">{l.sub} {match.myAnimalName}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xl font-black" style={{ color: match.compatibility.color }}>{match.compatibility.score}%</span>
            <p className="text-[9px] font-bold" style={{ color: match.compatibility.color }}>{match.compatibility.label}</p>
          </div>
        </div>

        {/* Animal card */}
        <Link href={"/animals/" + match.animal.id} className="flex items-center gap-4 bg-[var(--c-deep)] rounded-xl p-3 mb-3">
          <div className="w-14 h-14 rounded-full overflow-hidden border-2 flex-shrink-0" style={{ borderColor: match.compatibility.color }}>
            {match.animal.photo_url
              ? <img src={match.animal.photo_url} alt={match.animal.name} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center bg-[var(--c-card)] text-2xl">{EMOJI_MAP[match.animal.species] || "🐾"}</div>}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-[var(--c-text)] truncate">{match.animal.name}</p>
            <p className="text-[10px] text-[var(--c-text-muted)]">{match.animal.breed || match.animal.species}</p>
            {match.animal.canton && (
              <span className="text-[9px] px-2 py-0.5 rounded-full mt-1 inline-block" style={{
                background: match.compatibility.color + "15", color: match.compatibility.color,
              }}>📍 {match.animal.city || match.animal.canton}</span>
            )}
          </div>
          <div className="text-center flex-shrink-0">
            <span className="text-[10px] px-2 py-1 rounded-full font-bold" style={{
              background: personality.bgColor, color: personality.color, border: `1px solid ${personality.color}40`,
            }}>{personality.emoji}</span>
          </div>
        </Link>

        {/* Reasons */}
        {match.compatibility.reasons.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {match.compatibility.reasons.map((r, i) => (
              <span key={i} className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{
                color: match.compatibility.color, borderColor: match.compatibility.color + "40",
                background: match.compatibility.color + "10", border: "1px solid",
              }}>✓ {r}</span>
            ))}
          </div>
        )}

        {/* CTA */}
        <Link href={"/animals/" + match.animal.id}
          className="block w-full py-2.5 rounded-xl text-center text-xs font-bold text-white"
          style={{ background: match.compatibility.color }}>
          {l.cta}
        </Link>
      </div>
    </div>
  );
}
