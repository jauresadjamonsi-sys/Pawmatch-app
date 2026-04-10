"use client";

import { useState, useEffect } from "react";

type ChallengeData = {
  id: string;
  title: string;
  description: string;
  icon: string;
  target: number;
  reward: number;
  progress: number;
  completed: boolean;
  claimed: boolean;
};

export default function DailyChallenges({ userId }: { userId: string }) {
  const [challenges, setChallenges] = useState<ChallengeData[]>([]);
  const [weekly, setWeekly] = useState<ChallengeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimedReward, setClaimedReward] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/challenges")
      .then((r) => r.json())
      .then((d) => {
        setChallenges(d.daily || []);
        setWeekly(d.weekly || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [userId]);

  async function claimReward(challengeId: string, reward: number) {
    setClaimingId(challengeId);
    try {
      const res = await fetch("/api/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId }),
      });
      const data = await res.json();
      if (data.success) {
        setChallenges((prev) =>
          prev.map((c) => (c.id === challengeId ? { ...c, claimed: true } : c))
        );
        if (weekly?.id === challengeId) {
          setWeekly((w) => (w ? { ...w, claimed: true } : null));
        }
        setClaimedReward(reward);
        setTimeout(() => setClaimedReward(null), 2500);
      }
    } catch {}
    setClaimingId(null);
  }

  if (loading) {
    return <div className="rounded-2xl animate-shimmer" style={{ height: 140 }} />;
  }

  if (challenges.length === 0) return null;

  const allDailyClaimed = challenges.every((c) => c.claimed);

  return (
    <div className="glass rounded-2xl p-4 border border-[var(--c-border)] animate-slide-up relative overflow-hidden">
      {/* Claimed reward toast */}
      {claimedReward && (
        <div className="absolute top-2 right-2 z-10 animate-bounce-in">
          <span
            className="px-3 py-1 rounded-full text-xs font-bold text-white"
            style={{
              background: "linear-gradient(135deg, #f97316, #eab308)",
              boxShadow: "0 2px 12px rgba(249,115,22,0.4)",
            }}
          >
            +{claimedReward} PawCoins !
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎯</span>
          <h3 className="text-sm font-bold" style={{ color: "var(--c-text)" }}>
            Defis du jour
          </h3>
        </div>
        {allDailyClaimed && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 font-medium animate-badge-bounce">
            Tout complete ✓
          </span>
        )}
      </div>

      {/* Daily challenges */}
      <div className="space-y-2">
        {challenges.map((ch, i) => (
          <ChallengeRow
            key={ch.id}
            challenge={ch}
            claimingId={claimingId}
            onClaim={claimReward}
            delay={i * 0.08}
          />
        ))}
      </div>

      {/* Weekly challenge */}
      {weekly && (
        <div className="mt-3 pt-3 border-t border-[var(--c-border)]">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-xs">🏆</span>
            <span
              className="text-[10px] font-bold uppercase tracking-wider"
              style={{ color: "var(--c-text-muted)" }}
            >
              Defi de la semaine
            </span>
          </div>
          <ChallengeRow
            challenge={weekly}
            claimingId={claimingId}
            onClaim={claimReward}
            delay={0.3}
            isWeekly
          />
        </div>
      )}
    </div>
  );
}

function ChallengeRow({
  challenge: ch,
  claimingId,
  onClaim,
  delay,
  isWeekly,
}: {
  challenge: ChallengeData;
  claimingId: string | null;
  onClaim: (id: string, reward: number) => void;
  delay: number;
  isWeekly?: boolean;
}) {
  const pct = Math.min(100, (ch.progress / ch.target) * 100);

  return (
    <div
      className="flex items-center gap-3 p-2.5 rounded-xl transition-all animate-slide-up"
      style={{
        background: ch.claimed
          ? "rgba(34,197,94,0.06)"
          : isWeekly
          ? "rgba(139,92,246,0.06)"
          : "var(--c-card)",
        border: `1px solid ${
          ch.completed && !ch.claimed
            ? "rgba(249,115,22,0.3)"
            : ch.claimed
            ? "rgba(34,197,94,0.15)"
            : "var(--c-border)"
        }`,
        animationDelay: `${delay}s`,
      }}
    >
      <span className="text-xl w-8 text-center flex-shrink-0">{ch.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold" style={{ color: "var(--c-text)" }}>
          {ch.title}
        </p>
        <p className="text-[10px]" style={{ color: "var(--c-text-muted)" }}>
          {ch.description}
        </p>
        {/* Progress bar */}
        <div
          className="mt-1 h-1.5 rounded-full overflow-hidden"
          style={{ background: "var(--c-border)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${pct}%`,
              background: ch.completed
                ? "linear-gradient(90deg, #22c55e, #16a34a)"
                : isWeekly
                ? "linear-gradient(90deg, #8b5cf6, #a78bfa)"
                : "linear-gradient(90deg, #f97316, var(--c-accent))",
            }}
          />
        </div>
        <p className="text-[9px] mt-0.5" style={{ color: "var(--c-text-muted)" }}>
          {ch.progress}/{ch.target}
        </p>
      </div>
      {/* Reward / Claim */}
      {ch.claimed ? (
        <span className="text-sm text-green-400 font-bold flex-shrink-0">✓</span>
      ) : ch.completed ? (
        <button
          onClick={() => onClaim(ch.id, ch.reward)}
          disabled={claimingId === ch.id}
          className="btn-press px-3 py-1.5 rounded-full text-[10px] font-bold text-white flex-shrink-0"
          style={{
            background: "linear-gradient(135deg, #f97316, #eab308)",
            boxShadow: "0 2px 8px rgba(249,115,22,0.3)",
          }}
        >
          {claimingId === ch.id ? "..." : `+${ch.reward} 🪙`}
        </button>
      ) : (
        <span
          className="text-[10px] font-medium flex-shrink-0"
          style={{ color: "var(--c-text-muted)" }}
        >
          +{ch.reward} 🪙
        </span>
      )}
    </div>
  );
}
