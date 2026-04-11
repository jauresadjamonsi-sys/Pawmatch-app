"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

type MoodProps = {
  animalId: string;
  animalName: string;
  userId: string;
  isOwner: boolean;
};

const MOODS = [
  { value: "excellent", emoji: "🤩", label: "Super", color: "#F59E0B" },
  { value: "happy", emoji: "😊", label: "Content", color: "#84cc16" },
  { value: "neutral", emoji: "😐", label: "Normal", color: "#f59e0b" },
  { value: "tired", emoji: "😴", label: "Fatigué", color: "#F59E0B" },
  { value: "sick", emoji: "🤒", label: "Malade", color: "#ef4444" },
];

const ENERGY_LABELS = ["Très calme", "Calme", "Normal", "Actif", "Survolté"];

export function MoodTracker({ animalId, animalName, userId, isOwner }: MoodProps) {
  const [entries, setEntries] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [mood, setMood] = useState("");
  const [energy, setEnergy] = useState(3);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [todayDone, setTodayDone] = useState(false);
  const supabase = createClient();

  useEffect(() => { fetchEntries(); }, []);

  async function fetchEntries() {
    const { data } = await supabase
      .from("mood_entries")
      .select("*")
      .eq("animal_id", animalId)
      .order("created_at", { ascending: false })
      .limit(14);
    setEntries(data || []);

    // Check if today already logged
    const today = new Date().toISOString().split("T")[0];
    const done = (data || []).some((e: any) => e.created_at.startsWith(today));
    setTodayDone(done);
  }

  async function handleSubmit() {
    if (!mood) return;
    setSending(true);
    await supabase.from("mood_entries").insert({
      animal_id: animalId,
      user_id: userId,
      mood,
      energy,
      note: note || null,
    });
    setShowForm(false);
    setMood("");
    setEnergy(3);
    setNote("");
    setSending(false);
    fetchEntries();
  }

  if (!isOwner) return null;

  const lastEntry = entries[0];
  const lastMood = lastEntry ? MOODS.find(m => m.value === lastEntry.mood) : null;

  // Calculate streak
  let streak = 0;
  const now = new Date();
  for (let i = 0; i < entries.length; i++) {
    const d = new Date(entries[i].created_at);
    const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diff <= i + 1) streak++;
    else break;
  }

  // Mood distribution last 7 days
  const last7 = entries.filter(e => {
    const d = new Date(e.created_at);
    return (now.getTime() - d.getTime()) / 86400000 <= 7;
  });

  return (
    <div style={{ background: "#fff", borderRadius: 20, border: "1.5px solid rgba(249,115,22,0.15)", padding: 20, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>😊</span>
          <h3 style={{ fontWeight: 800, fontSize: 15, margin: 0 }}>Humeur de {animalName}</h3>
        </div>
        {streak > 1 && (
          <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 50, background: "#FEF3C7", color: "#92400E" }}>
            🔥 {streak}j de suite
          </span>
        )}
      </div>

      {/* Dernier mood + mini graph */}
      {entries.length > 0 && (
        <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
          {/* Dernier mood */}
          <div style={{ background: "#F9FAFB", borderRadius: 14, padding: 14, flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Aujourd'hui</div>
            {todayDone && lastMood ? (
              <div>
                <span style={{ fontSize: 32 }}>{lastMood.emoji}</span>
                <div style={{ fontSize: 12, fontWeight: 700, color: lastMood.color, marginTop: 4 }}>{lastMood.label}</div>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: "#9ca3af" }}>Pas encore noté</div>
            )}
          </div>

          {/* Mini timeline derniers 7 jours */}
          <div style={{ background: "#F9FAFB", borderRadius: 14, padding: 14, flex: 2 }}>
            <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>7 derniers jours</div>
            <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 40 }}>
              {Array.from({ length: 7 }).map((_, i) => {
                const date = new Date();
                date.setDate(date.getDate() - (6 - i));
                const dateStr = date.toISOString().split("T")[0];
                const entry = entries.find((e: any) => e.created_at.startsWith(dateStr));
                const moodData = entry ? MOODS.find(m => m.value === entry.mood) : null;
                const energyHeight = entry ? (entry.energy / 5) * 36 + 4 : 4;

                return (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                    <div style={{
                      width: "100%", borderRadius: 4, transition: "all 0.3s",
                      height: energyHeight,
                      background: moodData ? moodData.color : "#e5e7eb",
                      opacity: entry ? 1 : 0.3,
                    }} />
                    <span style={{ fontSize: 8, color: "#9ca3af" }}>
                      {["D", "L", "M", "M", "J", "V", "S"][date.getDay()]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bouton ou formulaire */}
      {!showForm ? (
        <button onClick={() => setShowForm(true)} disabled={todayDone}
          style={{
            width: "100%", padding: 12, borderRadius: 12, border: "none", cursor: todayDone ? "default" : "pointer",
            background: todayDone ? "#F3F4F6" : "linear-gradient(135deg, #F59E0B, #D97706)",
            color: todayDone ? "#9ca3af" : "#fff", fontWeight: 700, fontSize: 13,
            opacity: todayDone ? 0.6 : 1,
          }}>
          {todayDone ? "✅ Humeur notée aujourd'hui" : "📝 Noter l'humeur de " + animalName}
        </button>
      ) : (
        <div style={{ background: "#FFFBEB", border: "1.5px solid #FDE68A", borderRadius: 14, padding: 16 }}>
          <p style={{ fontWeight: 800, fontSize: 13, marginBottom: 12 }}>Comment va {animalName} aujourd'hui ?</p>

          {/* Mood selection */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14, justifyContent: "center" }}>
            {MOODS.map(m => (
              <button key={m.value} onClick={() => setMood(m.value)}
                style={{
                  width: 52, height: 52, borderRadius: 14, border: mood === m.value ? `2px solid ${m.color}` : "2px solid #e5e7eb",
                  background: mood === m.value ? `${m.color}15` : "#fff",
                  cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
                  transform: mood === m.value ? "scale(1.1)" : "scale(1)", transition: "all 0.2s",
                }}>
                <span style={{ fontSize: 22 }}>{m.emoji}</span>
                <span style={{ fontSize: 8, fontWeight: 700, color: m.color }}>{m.label}</span>
              </button>
            ))}
          </div>

          {/* Energy slider */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#374151" }}>⚡ Énergie</span>
              <span style={{ fontSize: 11, color: "#6b7280" }}>{ENERGY_LABELS[energy - 1]}</span>
            </div>
            <input type="range" min="1" max="5" value={energy} onChange={e => setEnergy(Number(e.target.value))}
              style={{ width: "100%", accentColor: "#F59E0B" }} />
          </div>

          {/* Note */}
          <textarea value={note} onChange={e => setNote(e.target.value)}
            placeholder="Note optionnelle (ex: a beaucoup joué, mange peu...)"
            rows={2} style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 12, resize: "none", marginBottom: 12 }} />

          {/* Actions */}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleSubmit} disabled={!mood || sending}
              style={{ flex: 1, padding: 10, background: "#F59E0B", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: (!mood || sending) ? 0.5 : 1 }}>
              {sending ? "..." : "Enregistrer"}
            </button>
            <button onClick={() => setShowForm(false)}
              style={{ padding: "10px 16px", background: "#F3F4F6", color: "#6b7280", border: "none", borderRadius: 10, fontSize: 13, cursor: "pointer" }}>
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
