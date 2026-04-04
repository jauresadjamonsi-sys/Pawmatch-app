"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

type AlertProps = {
  animalId: string;
  animalName: string;
  species: string;
  userId: string;
};

export function ActivityAlert({ animalId, animalName, species, userId }: AlertProps) {
  const [moodCount, setMoodCount] = useState(0);
  const [lastMood, setLastMood] = useState<string | null>(null);
  const [daysSinceMood, setDaysSinceMood] = useState<number>(99);
  const [matchesToday, setMatchesToday] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      // Dernier mood
      const { data: moods } = await supabase
        .from("mood_entries")
        .select("mood, created_at")
        .eq("animal_id", animalId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (moods && moods.length > 0) {
        setLastMood(moods[0].mood);
        const days = Math.floor((Date.now() - new Date(moods[0].created_at).getTime()) / 86400000);
        setDaysSinceMood(days);
      }

      // Nombre de moods cette semaine
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const { count } = await supabase
        .from("mood_entries")
        .select("*", { count: "exact", head: true })
        .eq("animal_id", animalId)
        .gte("created_at", weekAgo.toISOString());
      setMoodCount(count || 0);

      // Matchs récents
      const { count: mc } = await supabase
        .from("matches")
        .select("*", { count: "exact", head: true })
        .eq("status", "accepted")
        .gte("created_at", new Date(Date.now() - 86400000 * 2).toISOString());
      setMatchesToday(mc || 0);
    }
    load();
  }, []);

  const alerts: { emoji: string; text: string; type: "fomo" | "coaching" | "positive" }[] = [];

  // FOMO — matchs récents
  if (matchesToday > 0) {
    alerts.push({
      emoji: "🔥",
      text: `${matchesToday} nouveau${matchesToday > 1 ? "x" : ""} copain${matchesToday > 1 ? "s" : ""} trouvé${matchesToday > 1 ? "s" : ""} près de chez toi ces dernières 48h !`,
      type: "fomo",
    });
  }

  // Coaching — pas de mood aujourd'hui
  if (daysSinceMood >= 1) {
    if (daysSinceMood === 1) {
      alerts.push({
        emoji: "📝",
        text: `Tu n'as pas noté l'humeur de ${animalName} aujourd'hui. Un suivi régulier détecte les problèmes tôt.`,
        type: "coaching",
      });
    } else if (daysSinceMood >= 3 && daysSinceMood < 99) {
      alerts.push({
        emoji: "⚠️",
        text: `${daysSinceMood} jours sans noter l'humeur de ${animalName}. Ton streak est en danger ! 🔥`,
        type: "coaching",
      });
    }
  }

  // Positive reinforcement
  if (moodCount >= 5) {
    alerts.push({
      emoji: "🏆",
      text: `${moodCount} humeurs notées cette semaine — tu es un super propriétaire ! ${animalName} a de la chance.`,
      type: "positive",
    });
  }

  // Intelligence émotionnelle — analyse du dernier mood
  if (lastMood === "sick" || lastMood === "tired") {
    alerts.push({
      emoji: "💛",
      text: lastMood === "sick"
        ? `${animalName} ne se sentait pas bien dernièrement. Surveillez son appétit et son énergie. Si ça persiste, consultez un véto.`
        : `${animalName} semblait fatigué. Assurez-vous qu'il dort assez (${species === "chien" ? "12-14h" : "15-18h"} par jour) et réduisez l'activité.`,
      type: "coaching",
    });
  }

  if (alerts.length === 0) return null;

  const typeStyles = {
    fomo: { bg: "linear-gradient(135deg, #FDF2F8, #FCE7F3)", border: "#F9A8D4", text: "#9D174D" },
    coaching: { bg: "linear-gradient(135deg, #EFF6FF, #DBEAFE)", border: "#93C5FD", text: "#1E40AF" },
    positive: { bg: "linear-gradient(135deg, #F0FDF4, #DCFCE7)", border: "#86EFAC", text: "#166534" },
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
      {alerts.map((alert, i) => {
        const style = typeStyles[alert.type];
        return (
          <div key={i} style={{
            background: style.bg, border: `1.5px solid ${style.border}`,
            borderRadius: 14, padding: "12px 14px",
            display: "flex", alignItems: "flex-start", gap: 10,
            animation: "fadeIn 0.5s ease",
          }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>{alert.emoji}</span>
            <p style={{ fontSize: 12, color: style.text, lineHeight: 1.6, margin: 0, fontWeight: 600 }}>
              {alert.text}
            </p>
          </div>
        );
      })}
    </div>
  );
}
