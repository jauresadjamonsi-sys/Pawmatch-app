"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { getAnimalById, AnimalRow } from "@/lib/services/animals";
import { detectPersonality } from "@/lib/services/personality";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useAppContext } from "@/lib/contexts/AppContext";
import { EMOJI_MAP } from "@/lib/constants";

// --- Types ---

type MoodEntry = {
  id: string;
  mood: string;
  energy: number;
  note: string | null;
  created_at: string;
};

type AnimalWithHealth = AnimalRow & {
  next_vaccine_date?: string | null;
  last_vet_visit?: string | null;
  photos?: string[];
};

// --- Constants ---

const MOODS = [
  { value: "excellent", emoji: "🤩", label: "Super", color: "#22c55e", score: 5 },
  { value: "happy", emoji: "😊", label: "Content", color: "#84cc16", score: 4 },
  { value: "neutral", emoji: "😐", label: "Normal", color: "#f59e0b", score: 3 },
  { value: "tired", emoji: "😴", label: "Fatigué", color: "#f97316", score: 2 },
  { value: "sick", emoji: "🤒", label: "Malade", color: "#ef4444", score: 1 },
];

// --- Helpers ---

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function monthsSince(dateStr: string): number {
  return Math.round((Date.now() - new Date(dateStr).getTime()) / (30 * 86400000));
}

function getIdealWeight(species: string, breed: string | null): { min: number; max: number } | null {
  if (species !== "chien") return null;
  const ranges: Record<string, [number, number]> = {
    "Berger": [25, 40], "Labrador": [25, 36], "Golden": [25, 34], "Husky": [20, 30],
    "Bouledogue": [8, 14], "Caniche": [3, 6], "Chihuahua": [1.5, 3], "Yorkshire": [2, 3.5],
    "Bichon": [3, 6], "Beagle": [9, 14], "Border": [14, 22], "Jack Russell": [5, 8],
    "Malinois": [25, 35], "Rottweiler": [35, 60], "Shih Tzu": [4, 8], "Boxer": [25, 35],
  };
  if (!breed) return { min: 5, max: 40 };
  for (const [key, range] of Object.entries(ranges)) {
    if (breed.includes(key)) return { min: range[0], max: range[1] };
  }
  return { min: 5, max: 40 };
}

function computePawCareScore(animal: AnimalWithHealth, moodEntries: MoodEntry[]): number {
  let score = 40; // base

  // Profile completeness (+20 max)
  const fields = [animal.weight_kg, animal.breed, animal.age_months, animal.description, animal.city, animal.canton];
  const filled = fields.filter(Boolean).length;
  score += Math.round((filled / fields.length) * 20);

  // Vaccine status (+15 max)
  if (animal.next_vaccine_date) {
    const days = daysUntil(animal.next_vaccine_date);
    if (days > 30) score += 15;
    else if (days > 0) score += 8;
    else score -= 5;
  }

  // Vet visit (+15 max)
  if (animal.last_vet_visit) {
    const months = monthsSince(animal.last_vet_visit);
    if (months <= 6) score += 15;
    else if (months <= 12) score += 8;
    else score -= 5;
  }

  // Mood trend (+10 max)
  if (moodEntries.length >= 3) {
    const recentAvg = moodEntries.slice(0, 3).reduce((sum, e) => {
      const m = MOODS.find(m => m.value === e.mood);
      return sum + (m?.score || 3);
    }, 0) / 3;
    if (recentAvg >= 4) score += 10;
    else if (recentAvg >= 3) score += 5;
    else score -= 5;
  }

  return Math.max(0, Math.min(100, score));
}

function getScoreColor(score: number): string {
  if (score >= 75) return "#22c55e";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
}

function getScoreLabel(score: number): string {
  if (score >= 75) return "Excellent";
  if (score >= 50) return "À surveiller";
  return "Attention requise";
}

type Alert = {
  icon: string;
  title: string;
  description: string;
  severity: "red" | "orange" | "green";
  cta?: { label: string; href: string };
};

function generateAlerts(animal: AnimalWithHealth, moodEntries: MoodEntry[]): Alert[] {
  const alerts: Alert[] = [];

  // Vaccine reminder
  if (animal.next_vaccine_date) {
    const days = daysUntil(animal.next_vaccine_date);
    if (days < 0) {
      alerts.push({
        icon: "🚨", title: "Vaccin en retard",
        description: `Le vaccin est en retard de ${Math.abs(days)} jours. Prenez rendez-vous rapidement.`,
        severity: "red",
        cta: { label: "Trouver un véto", href: "https://pawdirectory.ch/annuaire?category=V%C3%A9t%C3%A9rinaire" },
      });
    } else if (days <= 30) {
      alerts.push({
        icon: "💉", title: "Rappel vaccin",
        description: `Prochain vaccin dans ${days} jours. Pensez à prendre rendez-vous.`,
        severity: "orange",
        cta: { label: "Trouver un véto", href: "https://pawdirectory.ch/annuaire?category=V%C3%A9t%C3%A9rinaire" },
      });
    }
  }

  // Vet visit
  if (animal.last_vet_visit) {
    const months = monthsSince(animal.last_vet_visit);
    if (months > 12) {
      alerts.push({
        icon: "🏥", title: "Visite vétérinaire recommandée",
        description: `Dernière visite il y a ${months} mois. Un bilan de santé annuel est recommandé.`,
        severity: "red",
        cta: { label: "Trouver un véto", href: "https://pawdirectory.ch/annuaire?category=V%C3%A9t%C3%A9rinaire" },
      });
    } else if (months > 6) {
      alerts.push({
        icon: "🏥", title: "Visite vétérinaire recommandée",
        description: `Dernière visite il y a ${months} mois. Pensez au check-up semestriel.`,
        severity: "orange",
        cta: { label: "Trouver un véto", href: "https://pawdirectory.ch/annuaire?category=V%C3%A9t%C3%A9rinaire" },
      });
    }
  } else {
    alerts.push({
      icon: "🏥", title: "Visite vétérinaire inconnue",
      description: "Renseignez la date de dernière visite pour un meilleur suivi.",
      severity: "orange",
    });
  }

  // Mood declining
  if (moodEntries.length >= 3) {
    const recent3 = moodEntries.slice(0, 3).map(e => MOODS.find(m => m.value === e.mood)?.score || 3);
    const isDecline = recent3[0] < recent3[1] && recent3[1] < recent3[2];
    if (isDecline) {
      alerts.push({
        icon: "😔", title: "Humeur en baisse",
        description: `L'humeur de ${animal.name} semble décliner ces derniers jours. Surveillez son comportement.`,
        severity: "orange",
      });
    }
    const avg = recent3.reduce((a, b) => a + b, 0) / 3;
    if (avg <= 2) {
      alerts.push({
        icon: "🤒", title: "Humeur préoccupante",
        description: `${animal.name} ne semble pas en forme. Consultez un vétérinaire si cela persiste.`,
        severity: "red",
        cta: { label: "Trouver un véto", href: "https://pawdirectory.ch/annuaire?category=V%C3%A9t%C3%A9rinaire" },
      });
    }
  }

  // Weight check
  if (animal.weight_kg && animal.species === "chien") {
    const ideal = getIdealWeight(animal.species, animal.breed);
    if (ideal) {
      const mid = (ideal.min + ideal.max) / 2;
      const diff = ((animal.weight_kg - mid) / mid) * 100;
      if (diff > 25) {
        alerts.push({
          icon: "⚖️", title: "Poids à surveiller",
          description: `${animal.weight_kg} kg — en surpoids significatif. Consultez votre véto pour un régime adapté.`,
          severity: "red",
          cta: { label: "Trouver un véto", href: "https://pawdirectory.ch/annuaire?category=V%C3%A9t%C3%A9rinaire" },
        });
      } else if (diff > 10) {
        alerts.push({
          icon: "⚖️", title: "Poids à surveiller",
          description: `${animal.weight_kg} kg — légèrement au-dessus du poids idéal. Surveillez l'alimentation.`,
          severity: "orange",
        });
      }
    }
  }

  // Deworming reminder (dogs every 3 months)
  if (animal.species === "chien") {
    alerts.push({
      icon: "💊", title: "Vermifuge recommandé",
      description: "Les chiens doivent être vermifugés tous les 3 mois. Vérifiez la date du dernier traitement.",
      severity: "green",
    });
  }

  // All good
  if (alerts.length === 0) {
    alerts.push({
      icon: "✅", title: "Tout va bien !",
      description: `${animal.name} est en bonne santé. Continuez ainsi !`,
      severity: "green",
    });
  }

  // Sort by severity
  const order = { red: 0, orange: 1, green: 2 };
  alerts.sort((a, b) => order[a.severity] - order[b.severity]);

  return alerts;
}

function computeProfileCompletion(animal: AnimalWithHealth): { percent: number; missing: string[] } {
  const checks: { field: string; label: string; filled: boolean }[] = [
    { field: "name", label: "Nom", filled: !!animal.name },
    { field: "breed", label: "Race", filled: !!animal.breed },
    { field: "age_months", label: "Age", filled: !!animal.age_months },
    { field: "weight_kg", label: "Poids", filled: !!animal.weight_kg },
    { field: "description", label: "Description", filled: !!animal.description },
    { field: "photo_url", label: "Photo", filled: !!animal.photo_url },
    { field: "city", label: "Ville", filled: !!animal.city },
    { field: "canton", label: "Canton", filled: !!animal.canton },
    { field: "traits", label: "Traits de caractère", filled: (animal.traits || []).length > 0 },
    { field: "next_vaccine_date", label: "Prochain vaccin", filled: !!animal.next_vaccine_date },
    { field: "last_vet_visit", label: "Dernière visite véto", filled: !!animal.last_vet_visit },
  ];
  const filled = checks.filter(c => c.filled).length;
  const missing = checks.filter(c => !c.filled).map(c => c.label);
  return { percent: Math.round((filled / checks.length) * 100), missing };
}

// --- Timeline ---

type TimelineEvent = {
  date: string;
  type: "vaccine" | "vet" | "mood";
  label: string;
  color: string;
  emoji: string;
};

function buildTimeline(animal: AnimalWithHealth, moodEntries: MoodEntry[]): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  if (animal.next_vaccine_date) {
    events.push({
      date: animal.next_vaccine_date,
      type: "vaccine",
      label: "Prochain vaccin",
      color: "#8b5cf6",
      emoji: "💉",
    });
  }

  if (animal.last_vet_visit) {
    events.push({
      date: animal.last_vet_visit,
      type: "vet",
      label: "Visite vétérinaire",
      color: "#3b82f6",
      emoji: "🏥",
    });
  }

  moodEntries.slice(0, 7).forEach(entry => {
    const moodData = MOODS.find(m => m.value === entry.mood);
    events.push({
      date: entry.created_at.split("T")[0],
      type: "mood",
      label: `Humeur : ${moodData?.label || entry.mood}`,
      color: moodData?.color || "#9ca3af",
      emoji: moodData?.emoji || "😐",
    });
  });

  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return events;
}

// --- Mood Trend ---

function getMoodTrend(entries: MoodEntry[]): "up" | "down" | "stable" {
  if (entries.length < 2) return "stable";
  const recent = entries.slice(0, Math.min(4, entries.length));
  const scores = recent.map(e => MOODS.find(m => m.value === e.mood)?.score || 3);
  const first = scores[scores.length - 1];
  const last = scores[0];
  if (last > first) return "up";
  if (last < first) return "down";
  return "stable";
}

// =============================================================
// COMPONENT
// =============================================================

export default function PawCareHubPage() {
  const [animal, setAnimal] = useState<AnimalWithHealth | null>(null);
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMoodForm, setShowMoodForm] = useState(false);
  const [moodValue, setMoodValue] = useState("");
  const [moodEnergy, setMoodEnergy] = useState(3);
  const [moodNote, setMoodNote] = useState("");
  const [moodSending, setMoodSending] = useState(false);

  const params = useParams();
  const supabase = createClient();
  const { profile } = useAuth();
  const { lang } = useAppContext();

  useEffect(() => {
    async function load() {
      const result = await getAnimalById(supabase, params.id as string);
      if (result.data) {
        setAnimal(result.data as AnimalWithHealth);
        document.title = result.data.name + " — PawCare Hub";
      }

      // Fetch mood entries
      const { data: moods } = await supabase
        .from("mood_entries")
        .select("*")
        .eq("animal_id", params.id as string)
        .order("created_at", { ascending: false })
        .limit(14);
      setMoodEntries(moods || []);
      setLoading(false);
    }
    load();
  }, [params.id]);

  async function handleMoodSubmit() {
    if (!moodValue || !profile) return;
    setMoodSending(true);
    await supabase.from("mood_entries").insert({
      animal_id: params.id,
      user_id: profile.id,
      mood: moodValue,
      energy: moodEnergy,
      note: moodNote || null,
    });
    // Refresh
    const { data: moods } = await supabase
      .from("mood_entries")
      .select("*")
      .eq("animal_id", params.id as string)
      .order("created_at", { ascending: false })
      .limit(14);
    setMoodEntries(moods || []);
    setShowMoodForm(false);
    setMoodValue("");
    setMoodEnergy(3);
    setMoodNote("");
    setMoodSending(false);
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--c-text-muted)" }}>Chargement...</p>
      </div>
    );
  }

  if (!animal) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--c-text-muted)" }}>Animal introuvable</p>
      </div>
    );
  }

  const personality = detectPersonality(animal.traits || []);
  const pawCareScore = computePawCareScore(animal, moodEntries);
  const scoreColor = getScoreColor(pawCareScore);
  const scoreLabel = getScoreLabel(pawCareScore);
  const alerts = generateAlerts(animal, moodEntries);
  const timeline = buildTimeline(animal, moodEntries);
  const profileCompletion = computeProfileCompletion(animal);
  const moodTrend = getMoodTrend(moodEntries);
  const circumference = 2 * Math.PI * 52;
  const scoreOffset = circumference - (pawCareScore / 100) * circumference;

  const severityBg = { red: "rgba(239,68,68,0.08)", orange: "rgba(245,158,11,0.08)", green: "rgba(34,197,94,0.08)" };
  const severityBorder = { red: "rgba(239,68,68,0.2)", orange: "rgba(245,158,11,0.2)", green: "rgba(34,197,94,0.2)" };
  const severityText = { red: "#dc2626", orange: "#d97706", green: "#16a34a" };

  return (
    <div style={{ minHeight: "100vh", padding: "24px 16px", background: "var(--c-deep)" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>

        {/* Back link */}
        <Link href={"/animals/" + animal.id} style={{ color: "var(--c-accent)", fontSize: 13, textDecoration: "none", fontWeight: 600 }}>
          ← Retour au profil
        </Link>

        {/* ====== HEADER ====== */}
        <div style={{
          marginTop: 16, background: "var(--c-card)", borderRadius: 20, border: "1.5px solid var(--c-border)",
          padding: 24, display: "flex", alignItems: "center", gap: 20,
        }}>
          {/* Photo */}
          <div style={{
            width: 72, height: 72, borderRadius: "50%", overflow: "hidden", flexShrink: 0,
            background: "var(--c-border)", display: "flex", alignItems: "center", justifyContent: "center",
            border: `3px solid ${scoreColor}40`, position: "relative",
          }}>
            {animal.photo_url ? (
              <Image src={animal.photo_url} alt={animal.name} fill className="object-cover" sizes="(max-width: 768px) 72px, 72px" />
            ) : (
              <span style={{ fontSize: 32 }}>{EMOJI_MAP[animal.species] || "🐾"}</span>
            )}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: "var(--c-text)", margin: 0 }}>{animal.name}</h1>
            <p style={{ fontSize: 13, color: "var(--c-text-muted)", margin: "2px 0 0" }}>
              {animal.breed || animal.species} {animal.age_months ? `· ${Math.floor(animal.age_months / 12)} ans` : ""}
            </p>
          </div>

          {/* PawCare Score circle */}
          <div style={{ position: "relative", width: 80, height: 80, flexShrink: 0 }}>
            <svg width="80" height="80" viewBox="0 0 120 120" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="60" cy="60" r="52" fill="none" stroke="var(--c-border)" strokeWidth="7" />
              <circle cx="60" cy="60" r="52" fill="none" stroke={scoreColor} strokeWidth="7"
                strokeDasharray={circumference} strokeDashoffset={scoreOffset}
                strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s ease" }} />
            </svg>
            <div style={{
              position: "absolute", inset: 0, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontSize: 24, fontWeight: 900, color: scoreColor }}>{pawCareScore}</span>
              <span style={{ fontSize: 7, fontWeight: 700, color: "var(--c-text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>PawCare</span>
            </div>
          </div>
        </div>

        {/* Score label */}
        <div style={{ textAlign: "center", marginTop: 8, marginBottom: 20 }}>
          <span style={{
            fontSize: 12, fontWeight: 700, color: scoreColor,
            padding: "3px 14px", borderRadius: 50, background: `${scoreColor}15`,
          }}>
            {scoreLabel}
          </span>
        </div>

        {/* ====== SMART ALERTS ====== */}
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: "var(--c-text)", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>{"🔔"}</span> Alertes intelligentes
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {alerts.map((alert, i) => (
              <div key={i} style={{
                background: severityBg[alert.severity], border: `1.5px solid ${severityBorder[alert.severity]}`,
                borderRadius: 14, padding: 14,
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <span style={{ fontSize: 20, flexShrink: 0, lineHeight: 1 }}>{alert.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 13, color: severityText[alert.severity], marginBottom: 2 }}>
                      {alert.title}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--c-text-muted)", lineHeight: 1.5 }}>
                      {alert.description}
                    </div>
                    {alert.cta && (
                      <a href={alert.cta.href} target="_blank" rel="noopener noreferrer" style={{
                        display: "inline-block", marginTop: 8, padding: "6px 14px", borderRadius: 8,
                        background: "#0D9488", color: "#fff", fontSize: 12, fontWeight: 700,
                        textDecoration: "none", transition: "opacity 0.2s",
                      }}>
                        {alert.cta.label} →
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ====== MOOD TREND ====== */}
        <div style={{
          background: "var(--c-card)", borderRadius: 16, border: "1.5px solid var(--c-border)",
          padding: 20, marginBottom: 20,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h2 style={{ fontSize: 15, fontWeight: 800, color: "var(--c-text)", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>{"😊"}</span> Humeur de {animal.name}
            </h2>
            <span style={{
              fontSize: 18,
              color: moodTrend === "up" ? "#22c55e" : moodTrend === "down" ? "#ef4444" : "#f59e0b",
            }}>
              {moodTrend === "up" ? "↗️" : moodTrend === "down" ? "↘️" : "➡️"}
            </span>
          </div>

          {/* Mood bars for last 7 days */}
          {moodEntries.length > 0 ? (
            <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 80, marginBottom: 14 }}>
              {Array.from({ length: 7 }).map((_, i) => {
                const date = new Date();
                date.setDate(date.getDate() - (6 - i));
                const dateStr = date.toISOString().split("T")[0];
                const entry = moodEntries.find(e => e.created_at.startsWith(dateStr));
                const moodData = entry ? MOODS.find(m => m.value === entry.mood) : null;
                const barHeight = moodData ? (moodData.score / 5) * 60 + 8 : 8;
                const dayNames = ["D", "L", "M", "M", "J", "V", "S"];

                return (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    {moodData && (
                      <span style={{ fontSize: 14 }}>{moodData.emoji}</span>
                    )}
                    <div style={{
                      width: "100%", borderRadius: 6, transition: "all 0.3s",
                      height: barHeight,
                      background: moodData ? moodData.color : "var(--c-border)",
                      opacity: entry ? 1 : 0.25,
                    }} />
                    <span style={{ fontSize: 10, color: "var(--c-text-muted)", fontWeight: 600 }}>
                      {dayNames[date.getDay()]}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: "var(--c-text-muted)", textAlign: "center", padding: "16px 0" }}>
              Aucune donnée d'humeur. Commencez le suivi !
            </p>
          )}

          {/* Mood form or button */}
          {!showMoodForm ? (
            <button onClick={() => setShowMoodForm(true)} style={{
              width: "100%", padding: 12, borderRadius: 12, border: "none", cursor: "pointer",
              background: "linear-gradient(135deg, #f97316, #ea580c)", color: "#fff",
              fontWeight: 700, fontSize: 13,
            }}>
              Enregistrer l'humeur
            </button>
          ) : (
            <div style={{
              background: "rgba(249,115,22,0.06)", border: "1.5px solid rgba(249,115,22,0.15)",
              borderRadius: 14, padding: 16,
            }}>
              <p style={{ fontWeight: 700, fontSize: 13, color: "var(--c-text)", marginBottom: 12 }}>
                Comment va {animal.name} aujourd'hui ?
              </p>
              <div style={{ display: "flex", gap: 8, marginBottom: 14, justifyContent: "center" }}>
                {MOODS.map(m => (
                  <button key={m.value} onClick={() => setMoodValue(m.value)} style={{
                    width: 52, height: 52, borderRadius: 14,
                    border: moodValue === m.value ? `2px solid ${m.color}` : "2px solid var(--c-border)",
                    background: moodValue === m.value ? `${m.color}15` : "var(--c-card)",
                    cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center",
                    justifyContent: "center", gap: 2,
                    transform: moodValue === m.value ? "scale(1.1)" : "scale(1)",
                    transition: "all 0.2s",
                  }}>
                    <span style={{ fontSize: 22 }}>{m.emoji}</span>
                    <span style={{ fontSize: 8, fontWeight: 700, color: m.color }}>{m.label}</span>
                  </button>
                ))}
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--c-text)" }}>Énergie</span>
                  <span style={{ fontSize: 11, color: "var(--c-text-muted)" }}>
                    {["Très calme", "Calme", "Normal", "Actif", "Survolté"][moodEnergy - 1]}
                  </span>
                </div>
                <input type="range" min="1" max="5" value={moodEnergy}
                  onChange={e => setMoodEnergy(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "#f97316" }} />
              </div>
              <textarea value={moodNote} onChange={e => setMoodNote(e.target.value)}
                placeholder="Note optionnelle..."
                rows={2} style={{
                  width: "100%", padding: "8px 12px", border: "1.5px solid var(--c-border)",
                  borderRadius: 8, fontSize: 12, resize: "none", marginBottom: 12,
                  background: "var(--c-card)", color: "var(--c-text)",
                }} />
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={handleMoodSubmit} disabled={!moodValue || moodSending} style={{
                  flex: 1, padding: 10, background: "#f97316", color: "#fff", border: "none",
                  borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer",
                  opacity: (!moodValue || moodSending) ? 0.5 : 1,
                }}>
                  {moodSending ? "..." : "Enregistrer"}
                </button>
                <button onClick={() => setShowMoodForm(false)} style={{
                  padding: "10px 16px", background: "var(--c-border)", color: "var(--c-text-muted)",
                  border: "none", borderRadius: 10, fontSize: 13, cursor: "pointer",
                }}>
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ====== HEALTH TIMELINE ====== */}
        {timeline.length > 0 && (
          <div style={{
            background: "var(--c-card)", borderRadius: 16, border: "1.5px solid var(--c-border)",
            padding: 20, marginBottom: 20,
          }}>
            <h2 style={{ fontSize: 15, fontWeight: 800, color: "var(--c-text)", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>{"📅"}</span> Timeline santé
            </h2>
            <div style={{ position: "relative", paddingLeft: 24 }}>
              {/* Vertical line */}
              <div style={{
                position: "absolute", left: 8, top: 4, bottom: 4, width: 2,
                background: "var(--c-border)", borderRadius: 1,
              }} />
              {timeline.slice(0, 8).map((event, i) => (
                <div key={i} style={{ position: "relative", paddingBottom: 16, display: "flex", alignItems: "flex-start", gap: 12 }}>
                  {/* Dot */}
                  <div style={{
                    position: "absolute", left: -20, top: 2, width: 14, height: 14, borderRadius: "50%",
                    background: event.color, border: "2px solid var(--c-card)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 8,
                  }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--c-text)" }}>
                      {event.emoji} {event.label}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--c-text-muted)" }}>
                      {new Date(event.date).toLocaleDateString("fr-CH", { day: "numeric", month: "long", year: "numeric" })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ====== QUICK ACTIONS ====== */}
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: "var(--c-text)", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>{"⚡"}</span> Actions rapides
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { emoji: "🏥", label: "Trouver un véto", href: "https://pawdirectory.ch/annuaire?category=V%C3%A9t%C3%A9rinaire" },
              { emoji: "✂️", label: "Trouver un toiletteur", href: "https://pawdirectory.ch/annuaire?category=Toiletteur" },
              { emoji: "🎓", label: "Trouver un dresseur", href: "https://pawdirectory.ch/annuaire?category=Dresseur" },
              { emoji: "🦮", label: "Trouver un garde", href: "https://pawdirectory.ch/annuaire?category=Garde+%26+Promeneur" },
            ].map((action, i) => (
              <a key={i} href={action.href} target="_blank" rel="noopener noreferrer" style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 6, padding: 16, borderRadius: 14,
                background: "rgba(13,148,136,0.06)", border: "1.5px solid rgba(13,148,136,0.15)",
                textDecoration: "none", transition: "all 0.2s",
              }}>
                <span style={{ fontSize: 24 }}>{action.emoji}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#0D9488", textAlign: "center" }}>
                  {action.label}
                </span>
              </a>
            ))}
          </div>
          <a href="https://pawdirectory.ch" target="_blank" rel="noopener noreferrer" style={{
            display: "block", marginTop: 10, textAlign: "center", fontSize: 11,
            color: "#0D9488", fontWeight: 700, textDecoration: "none",
          }}>
            Tous les services sur PawDirectory →
          </a>
        </div>

        {/* ====== PROFILE COMPLETION ====== */}
        <div style={{
          background: "var(--c-card)", borderRadius: 16, border: "1.5px solid var(--c-border)",
          padding: 20, marginBottom: 20,
        }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: "var(--c-text)", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>{"📋"}</span> Profil de {animal.name}
          </h2>

          {/* Progress bar */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: "var(--c-text-muted)" }}>Complétude</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: profileCompletion.percent >= 80 ? "#22c55e" : profileCompletion.percent >= 50 ? "#f59e0b" : "#ef4444" }}>
                {profileCompletion.percent}%
              </span>
            </div>
            <div style={{ height: 8, background: "var(--c-border)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 4, transition: "width 0.8s ease",
                width: profileCompletion.percent + "%",
                background: profileCompletion.percent >= 80 ? "#22c55e" : profileCompletion.percent >= 50 ? "#f59e0b" : "#ef4444",
              }} />
            </div>
          </div>

          {/* Missing fields */}
          {profileCompletion.missing.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 11, color: "var(--c-text-muted)", marginBottom: 6 }}>Informations manquantes :</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {profileCompletion.missing.map((field, i) => (
                  <span key={i} style={{
                    fontSize: 11, padding: "3px 10px", borderRadius: 50,
                    background: "rgba(245,158,11,0.1)", color: "#d97706", fontWeight: 600,
                    border: "1px solid rgba(245,158,11,0.15)",
                  }}>
                    {field}
                  </span>
                ))}
              </div>
            </div>
          )}

          <Link href={"/animals/" + animal.id + "/edit"} style={{
            display: "block", width: "100%", padding: 12, borderRadius: 12,
            background: "var(--c-accent)", color: "#fff", fontWeight: 700, fontSize: 13,
            textDecoration: "none", textAlign: "center",
          }}>
            Compléter le profil
          </Link>
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", paddingBottom: 32 }}>
          <p style={{ fontSize: 11, color: "var(--c-text-muted)" }}>
            PawCare Hub — L'assistant santé de {animal.name}
          </p>
        </div>
      </div>
    </div>
  );
}
