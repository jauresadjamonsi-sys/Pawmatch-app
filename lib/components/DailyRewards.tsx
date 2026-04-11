"use client";
import { useState, useEffect } from "react";

const DAILY_ACTIONS = [
  { id: "login", label: "Connexion du jour", coins: 2, emoji: "\uD83D\uDC4B" },
  { id: "swipe", label: "Flairer 5 profils", coins: 3, emoji: "\uD83D\uDC43" },
  { id: "story", label: "Poster une story", coins: 5, emoji: "\uD83D\uDCF8" },
  { id: "reel", label: "Poster un reel", coins: 8, emoji: "\uD83C\uDFAC" },
  { id: "message", label: "Envoyer un message", coins: 2, emoji: "\uD83D\uDCAC" },
  { id: "event", label: "Rejoindre un evenement", coins: 5, emoji: "\uD83D\uDCCD" },
];

export default function DailyRewards() {
  const [completed, setCompleted] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const today = new Date().toISOString().split("T")[0];
    const stored = localStorage.getItem("pawly_daily_" + today);
    if (stored) setCompleted(JSON.parse(stored));
  }, []);

  if (!mounted) return null;

  const totalEarnable = DAILY_ACTIONS.reduce((sum, a) => sum + a.coins, 0);
  const totalEarned = DAILY_ACTIONS.filter(a => completed.includes(a.id)).reduce((sum, a) => sum + a.coins, 0);

  return (
    <div className="rounded-2xl p-4" style={{ background: "var(--c-card)", border: "1px solid var(--c-border)" }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sm" style={{ color: "var(--c-text)" }}>
          Defis du jour
        </h3>
        <span className="text-xs font-medium" style={{ color: "var(--c-accent)" }}>
          {totalEarned}/{totalEarnable} PawCoins
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full mb-3" style={{ background: "rgba(251,191,36,0.1)" }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${(totalEarned / totalEarnable) * 100}%`,
            background: "linear-gradient(90deg, var(--c-accent), #FCD34D)",
          }} />
      </div>

      <div className="space-y-2">
        {DAILY_ACTIONS.map(action => {
          const done = completed.includes(action.id);
          return (
            <div key={action.id} className="flex items-center gap-3 py-1.5">
              <span className="text-lg">{action.emoji}</span>
              <span className="flex-1 text-sm"
                style={{ color: done ? "var(--c-text-muted)" : "var(--c-text)", textDecoration: done ? "line-through" : "none" }}>
                {action.label}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: done ? "rgba(34,197,94,0.15)" : "rgba(251,191,36,0.1)",
                  color: done ? "#22c55e" : "var(--c-accent)",
                }}>
                {done ? "\u2713" : `+${action.coins}`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
