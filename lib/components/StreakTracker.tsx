"use client";
import { useEffect, useState } from "react";

export default function StreakTracker() {
  const [streak, setStreak] = useState(0);
  const [todayClaimed, setTodayClaimed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showReward, setShowReward] = useState(false);

  useEffect(() => {
    setMounted(true);
    const data = localStorage.getItem("pawly_streak");
    if (data) {
      const parsed = JSON.parse(data);
      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

      if (parsed.lastDate === today) {
        setStreak(parsed.count);
        setTodayClaimed(true);
      } else if (parsed.lastDate === yesterday) {
        setStreak(parsed.count);
        // Streak alive but not claimed today
      } else {
        // Streak broken
        setStreak(0);
        localStorage.setItem("pawly_streak", JSON.stringify({ count: 0, lastDate: "" }));
      }
    }
  }, []);

  function claimToday() {
    const today = new Date().toISOString().split("T")[0];
    const newStreak = streak + 1;
    setStreak(newStreak);
    setTodayClaimed(true);
    setShowReward(true);
    localStorage.setItem("pawly_streak", JSON.stringify({ count: newStreak, lastDate: today }));

    // Add PawCoins reward
    const coins = Number(localStorage.getItem("pawly_coins") || "0");
    const bonus = newStreak >= 7 ? 10 : newStreak >= 3 ? 5 : 2;
    localStorage.setItem("pawly_coins", String(coins + bonus));

    setTimeout(() => setShowReward(false), 3000);
  }

  if (!mounted) return null;

  return (
    <div className="rounded-2xl p-4 relative overflow-hidden"
      style={{ background: "var(--c-card)", border: "1px solid var(--c-border)" }}>

      {/* Reward animation */}
      {showReward && (
        <div className="absolute inset-0 flex items-center justify-center z-10 animate-pulse"
          style={{ background: "rgba(251,191,36,0.1)" }}>
          <span className="text-2xl font-bold" style={{ color: "var(--c-accent)" }}>
            +{streak >= 7 ? 10 : streak >= 3 ? 5 : 2} PawCoins!
          </span>
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sm" style={{ color: "var(--c-text)" }}>
          Serie quotidienne
        </h3>
        <span className="text-xs font-medium px-2 py-0.5 rounded-full"
          style={{ background: "rgba(251,191,36,0.15)", color: "var(--c-accent)" }}>
          {streak} jour{streak !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Week visualization */}
      <div className="flex gap-1.5 mb-3">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="flex-1 h-2 rounded-full transition-all"
            style={{
              background: i < streak % 7
                ? "var(--c-accent)"
                : "rgba(251,191,36,0.1)",
            }} />
        ))}
      </div>

      {!todayClaimed ? (
        <button onClick={claimToday}
          className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-95"
          style={{
            background: "linear-gradient(135deg, var(--c-accent), #FCD34D)",
            color: "#1a1714",
          }}>
          Reclamer la recompense du jour
        </button>
      ) : (
        <p className="text-center text-xs" style={{ color: "var(--c-text-muted)" }}>
          Recompense du jour reclamee ! Reviens demain
        </p>
      )}

      {/* Milestone indicators */}
      {streak >= 3 && (
        <p className="text-center text-xs mt-2" style={{ color: "var(--c-accent)" }}>
          {streak >= 30 ? "Legendaire ! 30 jours !" :
           streak >= 14 ? "Incroyable ! 2 semaines !" :
           streak >= 7 ? "1 semaine complete !" :
           "3 jours, continue !"}
        </p>
      )}
    </div>
  );
}
