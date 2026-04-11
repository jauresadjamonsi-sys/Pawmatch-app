"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import Image from "next/image";

type HealthRecord = {
  id: string;
  type: "vaccine" | "vet_visit" | "medication" | "weight" | "allergy" | "note";
  title: string;
  date: string;
  next_due: string | null;
  value: number | null;
  unit: string | null;
  status: string;
};

type HealthSummary = {
  overdueVaccines: number;
  upcomingVaccines: number;
  lastVetVisitDaysAgo: number | null;
  weightTrend: "stable" | "rising" | "falling" | "unknown";
  lastWeight: number | null;
  healthLines: string[];
};

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
  healthSummary: HealthSummary | null;
};

// Analyze health records into a summary
function analyzeHealthRecords(records: HealthRecord[]): HealthSummary {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const healthLines: string[] = [];

  // --- Overdue & upcoming vaccines ---
  const vaccines = records.filter((r) => r.type === "vaccine");
  const overdueVaccines = vaccines.filter(
    (r) => r.next_due && r.next_due < todayStr && r.status === "active"
  ).length;
  const upcomingVaccines = vaccines.filter((r) => {
    if (!r.next_due || r.status !== "active") return false;
    const dueDate = new Date(r.next_due);
    const diffDays = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 30;
  }).length;

  if (overdueVaccines > 0) {
    healthLines.push(`Vaccin en retard ! (${overdueVaccines})`);
  } else if (upcomingVaccines > 0) {
    healthLines.push(`Vaccin prevu bientot (${upcomingVaccines})`);
  } else if (vaccines.length > 0) {
    healthLines.push("Vaccins a jour");
  }

  // --- Last vet visit ---
  const vetVisits = records
    .filter((r) => r.type === "vet_visit")
    .sort((a, b) => b.date.localeCompare(a.date));
  let lastVetVisitDaysAgo: number | null = null;
  if (vetVisits.length > 0) {
    lastVetVisitDaysAgo = Math.floor(
      (now.getTime() - new Date(vetVisits[0].date).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (lastVetVisitDaysAgo > 365) {
      healthLines.push("Visite veto il y a plus d'un an");
    } else if (lastVetVisitDaysAgo > 180) {
      healthLines.push("Visite veto il y a plus de 6 mois");
    } else {
      healthLines.push("Visite veto recente");
    }
  }

  // --- Weight trend ---
  const weights = records
    .filter((r) => r.type === "weight" && r.value != null)
    .sort((a, b) => a.date.localeCompare(b.date));
  let weightTrend: HealthSummary["weightTrend"] = "unknown";
  let lastWeight: number | null = null;

  if (weights.length >= 2) {
    const recent = weights.slice(-3);
    lastWeight = recent[recent.length - 1].value;
    const first = recent[0].value!;
    const last = recent[recent.length - 1].value!;
    const changePct = ((last - first) / first) * 100;
    if (Math.abs(changePct) < 3) {
      weightTrend = "stable";
      healthLines.push("Poids stable");
    } else if (changePct > 0) {
      weightTrend = "rising";
      healthLines.push("Poids en hausse");
    } else {
      weightTrend = "falling";
      healthLines.push("Poids en baisse");
    }
  } else if (weights.length === 1) {
    lastWeight = weights[0].value;
  }

  return { overdueVaccines, upcomingVaccines, lastVetVisitDaysAgo, weightTrend, lastWeight, healthLines };
}

// Compute a "wellbeing score" based on activity + health data
function computeScore(data: {
  animalId: string;
  matchesThisWeek: number;
  reelsThisWeek: number;
  daysActive: number;
  hasPhoto: boolean;
  ageMonths: number | null;
  totalMatches: number;
  healthSummary: HealthSummary | null;
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

  // --- Health factors ---
  const hs = data.healthSummary;
  if (hs) {
    // Vaccine status
    if (hs.overdueVaccines > 0) {
      score -= 15;
      insights.push("Vaccin en retard !");
    } else if (hs.upcomingVaccines > 0) {
      score += 3;
    } else {
      score += 5;
    }

    // Vet visit recency
    if (hs.lastVetVisitDaysAgo != null) {
      if (hs.lastVetVisitDaysAgo <= 180) {
        score += 8;
      } else if (hs.lastVetVisitDaysAgo <= 365) {
        score += 3;
      } else {
        score -= 5;
        insights.push("Visite veto il y a plus d'un an");
      }
    }

    // Weight trend
    if (hs.weightTrend === "stable") {
      score += 5;
    } else if (hs.weightTrend === "rising" || hs.weightTrend === "falling") {
      score -= 3;
      insights.push(hs.weightTrend === "rising" ? "Poids en hausse" : "Poids en baisse");
    }
  }

  score = Math.min(100, Math.max(10, score));

  // Recommendation based on lowest factor — health takes priority
  let recommendation = "Continuez comme ca, votre compagnon est actif !";
  let cta = { label: "Explorer les Reels", href: "/reels" };

  if (hs && hs.overdueVaccines > 0) {
    recommendation = "Un vaccin est en retard, pensez a prendre rendez-vous !";
    cta = { label: "Voir le carnet sante", href: `/animals/${data.animalId}/health` };
  } else if (hs && hs.lastVetVisitDaysAgo != null && hs.lastVetVisitDaysAgo > 365) {
    recommendation = "Planifiez une visite chez le veterinaire";
    cta = { label: "Voir le carnet sante", href: `/animals/${data.animalId}/health` };
  } else if (data.matchesThisWeek === 0) {
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
  if (score >= 85) return { status: "excellent", emoji: "🟢", color: "#F59E0B", label: "Excellent" };
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

      // Fetch activity data + health records in parallel
      const [matchesRes, reelsRes, totalMatchesRes, healthRes] = await Promise.all([
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
        fetch(`/api/animals/${pet.id}/health`).then((r) =>
          r.ok ? r.json() : { records: [] }
        ),
      ]);

      // Analyze health records
      const healthRecords: HealthRecord[] = healthRes.records || [];
      const healthSummary = healthRecords.length > 0 ? analyzeHealthRecords(healthRecords) : null;

      // Estimate active days (simplified: check if there are recent actions)
      const daysActive = Math.min(7, (matchesRes.count || 0) + (reelsRes.count || 0));

      const { score, insights, recommendation, cta } = computeScore({
        animalId: pet.id,
        matchesThisWeek: matchesRes.count || 0,
        reelsThisWeek: reelsRes.count || 0,
        daysActive,
        hasPhoto: !!pet.photo_url,
        ageMonths: pet.age_months,
        totalMatches: totalMatchesRes.count || 0,
        healthSummary,
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
        healthSummary,
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

        {/* Health summary */}
        {animal.healthSummary && animal.healthSummary.healthLines.length > 0 && (
          <div className="glass animate-slide-up rounded-xl p-2.5 mb-3" style={{
            border: `1px solid var(--c-accent, #F59E0B)20`,
          }}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-sm">🩺</span>
              <span className="text-caption font-bold" style={{ color: "var(--c-accent, #F59E0B)" }}>
                Bilan sante
              </span>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {animal.healthSummary.healthLines.map((line, i) => {
                const isWarning = line.includes("retard") || line.includes("hausse") || line.includes("baisse") || line.includes("plus d'un an");
                return (
                  <span key={i} className="text-caption flex items-center gap-1" style={{
                    color: isWarning ? "#ef4444" : "var(--c-accent, #F59E0B)",
                  }}>
                    {isWarning ? "⚠️" : "✓"} {line}
                  </span>
                );
              })}
            </div>
            {animal.healthSummary.lastWeight != null && (
              <p className="text-caption mt-1" style={{ color: "var(--c-text-muted)" }}>
                Dernier poids : {animal.healthSummary.lastWeight} kg
              </p>
            )}
          </div>
        )}

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
