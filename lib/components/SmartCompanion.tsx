"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import Image from "next/image";

type AnimalHealth = {
  id: string;
  name: string;
  species: string;
  photo_url: string | null;
  age_months: number | null;
  score: number;
  status: "excellent" | "good" | "average" | "low";
  statusEmoji: string;
  statusColor: string;
  insights: string[];
  recommendation: string;
  cta: { label: string; href: string };
};

// Compute a "wellbeing score" based on activity data
function computeScore(data: {
  matchesThisWeek: number;
  reelsThisWeek: number;
  daysActive: number;
  hasPhoto: boolean;
  ageMonths: number | null;
  totalMatches: number;
}): { score: number; insights: string[]; recommendation: string; cta: { label: string; href: string } } {
  let score = 50; // base
  const insights: string[] = [];

  // Activity bonus
  if (data.matchesThisWeek >= 3) {
    score += 15;
  } else if (data.matchesThisWeek >= 1) {
    score += 8;
  } else {
    insights.push("Aucune rencontre cette semaine");
  }

  // Social bonus
  if (data.reelsThisWeek >= 2) {
    score += 12;
  } else if (data.reelsThisWeek >= 1) {
    score += 6;
  } else {
    insights.push("Pas de contenu partage cette semaine");
  }

  // Regular usage
  if (data.daysActive >= 5) {
    score += 10;
  } else if (data.daysActive >= 3) {
    score += 5;
  } else {
    insights.push("Activite en baisse cette semaine");
  }

  // Photo bonus
  if (data.hasPhoto) {
    score += 5;
  } else {
    insights.push("Ajoutez une photo pour plus de visibilite");
  }

  // Overall engagement
  if (data.totalMatches >= 10) {
    score += 8;
  } else if (data.totalMatches >= 5) {
    score += 4;
  }

  score = Math.min(100, Math.max(10, score));

  // Recommendation based on lowest factor
  let recommendation = "Continuez comme ca, votre compagnon est actif !";
  let cta = { label: "Explorer les Reels", href: "/reels" };

  if (data.matchesThisWeek === 0) {
    recommendation = "Trouvez un copain de balade pour votre animal !";
    cta = { label: "Trouver un copain", href: "/flairer" };
  } else if (data.reelsThisWeek === 0) {
    recommendation = "Partagez un moment avec votre compagnon";
    cta = { label: "Creer un Reel", href: "/reels/create" };
  } else if (data.daysActive < 3) {
    recommendation = "Revenez plus souvent pour booster la visibilite";
    cta = { label: "Voir le feed", href: "/feed" };
  } else if (!data.hasPhoto) {
    recommendation = "Une belle photo augmente les chances de match de 3x !";
    cta = { label: "Ajouter une photo", href: "/profile/animals/new" };
  } else if (score >= 80) {
    recommendation = "Participez a un evenement pres de chez vous";
    cta = { label: "Evenements", href: "/explore" };
  }

  return { score, insights, recommendation, cta };
}

function getStatus(score: number): { status: AnimalHealth["status"]; emoji: string; color: string; label: string } {
  if (score >= 85) return { status: "excellent", emoji: "🟢", color: "#22c55e", label: "Excellent" };
  if (score >= 65) return { status: "good", emoji: "🔵", color: "#3b82f6", label: "Bon" };
  if (score >= 45) return { status: "average", emoji: "🟡", color: "#eab308", label: "Moyen" };
  return { status: "low", emoji: "🔴", color: "#ef4444", label: "A ameliorer" };
}

export default function SmartCompanion({ userId }: { userId: string }) {
  const [animal, setAnimal] = useState<AnimalHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, [userId]);

  async function loadData() {
    try {
      // Get user's first animal
      const { data: animals } = await supabase
        .from("animals")
        .select("id, name, species, photo_url, age_months")
        .eq("created_by", userId)
        .order("created_at", { ascending: true })
        .limit(1);

      if (!animals || animals.length === 0) {
        setLoading(false);
        return;
      }

      const pet = animals[0];
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Fetch activity data in parallel
      const [matchesRes, reelsRes, totalMatchesRes] = await Promise.all([
        supabase.from("matches")
          .select("id", { count: "exact", head: true })
          .or(`sender_user_id.eq.${userId},receiver_user_id.eq.${userId}`)
          .gte("created_at", weekAgo.toISOString()),
        supabase.from("reels")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .gte("created_at", weekAgo.toISOString()),
        supabase.from("matches")
          .select("id", { count: "exact", head: true })
          .or(`sender_user_id.eq.${userId},receiver_user_id.eq.${userId}`),
      ]);

      // Estimate active days (simplified: check if there are recent actions)
      const daysActive = Math.min(7, (matchesRes.count || 0) + (reelsRes.count || 0));

      const { score, insights, recommendation, cta } = computeScore({
        matchesThisWeek: matchesRes.count || 0,
        reelsThisWeek: reelsRes.count || 0,
        daysActive,
        hasPhoto: !!pet.photo_url,
        ageMonths: pet.age_months,
        totalMatches: totalMatchesRes.count || 0,
      });

      const { status, emoji, color, label } = getStatus(score);

      setAnimal({
        id: pet.id,
        name: pet.name,
        species: pet.species,
        photo_url: pet.photo_url,
        age_months: pet.age_months,
        score,
        status,
        statusEmoji: emoji,
        statusColor: color,
        insights,
        recommendation,
        cta,
      });
    } catch (err) {
      console.error("[SmartCompanion] error:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading || !animal || dismissed) return null;

  const progressWidth = `${animal.score}%`;
  const speciesEmoji = animal.species?.toLowerCase().includes("chien") ? "🐕" :
    animal.species?.toLowerCase().includes("chat") ? "🐱" :
    animal.species?.toLowerCase().includes("lapin") ? "🐰" : "🐾";

  return (
    <div className="rounded-2xl overflow-hidden mb-5" style={{
      background: "var(--c-card)",
      border: "1px solid var(--c-border)",
      boxShadow: `0 0 20px ${animal.statusColor}15`,
    }}>
      {/* Header gradient accent */}
      <div className="h-1" style={{ background: `linear-gradient(90deg, ${animal.statusColor}, var(--c-accent))` }} />

      <div className="p-4">
        {/* Top row: avatar + name + score */}
        <div className="flex items-center gap-3 mb-3">
          {animal.photo_url ? (
            <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0" style={{ border: `2px solid ${animal.statusColor}40` }}>
              <Image src={animal.photo_url} alt={animal.name} width={48} height={48} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-2xl" style={{
              background: `${animal.statusColor}15`,
              border: `2px solid ${animal.statusColor}40`,
            }}>
              {speciesEmoji}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-[var(--c-text)] truncate">{animal.name} aujourd&apos;hui</p>
              <button onClick={() => setDismissed(true)} className="text-[var(--c-text-muted)] hover:text-[var(--c-text)] transition-colors p-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs" style={{ color: animal.statusColor }}>{animal.statusEmoji} {getStatus(animal.score).label}</span>
              <span className="text-lg font-black" style={{ color: animal.statusColor }}>{animal.score}</span>
              <span className="text-[10px] text-[var(--c-text-muted)]">/ 100</span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 rounded-full mb-3" style={{ background: "var(--c-border)" }}>
          <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{
            width: progressWidth,
            background: `linear-gradient(90deg, ${animal.statusColor}, var(--c-accent))`,
            boxShadow: `0 0 8px ${animal.statusColor}50`,
          }} />
        </div>

        {/* Insights */}
        {animal.insights.length > 0 && (
          <div className="mb-3 space-y-1">
            {animal.insights.slice(0, 2).map((insight, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span style={{ color: animal.score >= 65 ? "#eab308" : "#ef4444" }}>
                  {animal.score >= 65 ? "💡" : "⚠️"}
                </span>
                <span className="text-[var(--c-text-muted)]">{insight}</span>
              </div>
            ))}
          </div>
        )}

        {/* Recommendation */}
        <div className="flex items-center gap-2 p-2.5 rounded-xl mb-3" style={{
          background: `${animal.statusColor}08`,
          border: `1px solid ${animal.statusColor}20`,
        }}>
          <span className="text-lg">💡</span>
          <p className="text-xs text-[var(--c-text)] flex-1">{animal.recommendation}</p>
        </div>

        {/* CTA */}
        <Link
          href={animal.cta.href}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02] active:scale-95"
          style={{
            background: `linear-gradient(135deg, ${animal.statusColor}, var(--c-accent))`,
            boxShadow: `0 4px 15px ${animal.statusColor}30`,
          }}
        >
          {animal.cta.label}
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
