"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useAppContext } from "@/lib/contexts/AppContext";
import { usePawScore, type Achievement, type ScoreBreakdown } from "@/lib/hooks/usePawScore";
import Link from "next/link";

// ═══ Animated circular progress ring ═══
function ScoreRing({ score, maxScore }: { score: number; maxScore: number }) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 200);
    return () => clearTimeout(timer);
  }, []);

  // Animate the number counting up
  useEffect(() => {
    if (!mounted) return;
    const duration = 1500;
    const start = performance.now();
    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setAnimatedScore(Math.round(score * eased));
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [score, mounted]);

  const size = 220;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = maxScore > 0 ? score / maxScore : 0;
  const strokeDashoffset = circumference * (1 - (mounted ? progress : 0));

  return (
    <div className="relative flex items-center justify-center mx-auto" style={{ width: size, height: size }}>
      {/* Outer glow */}
      <div
        className="absolute inset-0 rounded-full blur-xl opacity-30"
        style={{ background: "var(--c-accent)" }}
      />

      <svg width={size} height={size} className="absolute inset-0" style={{ transform: "rotate(-90deg)" }}>
        {/* Background track */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="var(--c-border)" strokeWidth={strokeWidth} opacity={0.3}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="var(--c-accent)" strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{
            transition: "stroke-dashoffset 1.8s cubic-bezier(0.4, 0, 0.2, 1)",
            filter: "drop-shadow(0 0 8px var(--c-accent))",
          }}
        />
      </svg>

      {/* Center content */}
      <div className="relative flex flex-col items-center">
        <span
          className="font-black tabular-nums"
          style={{ color: "var(--c-text)", fontSize: 48, lineHeight: 1 }}
        >
          {animatedScore}
        </span>
        <span
          className="text-xs font-medium uppercase tracking-widest mt-1"
          style={{ color: "var(--c-text-muted)" }}
        >
          / {maxScore}
        </span>
      </div>
    </div>
  );
}

// ═══ Level badge with glow ═══
function LevelBadge({ label, emoji, active }: { label: string; emoji: string; active: boolean }) {
  return (
    <div
      className="relative flex items-center gap-2 rounded-full px-4 py-2"
      style={{
        background: active ? "var(--c-accent)" : "var(--c-card)",
        border: `1.5px solid ${active ? "var(--c-accent)" : "var(--c-border)"}`,
        color: active ? "#fff" : "var(--c-text-muted)",
      }}
    >
      {active && (
        <div
          className="absolute inset-0 rounded-full blur-md opacity-40"
          style={{ background: "var(--c-accent)" }}
        />
      )}
      <span className="relative text-lg">{emoji}</span>
      <span className="relative text-sm font-semibold">{label}</span>
    </div>
  );
}

// ═══ Breakdown bar ═══
function BreakdownRow({ label, icon, points, maxPoints }: {
  label: string; icon: string; points: number; maxPoints: number;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 400);
    return () => clearTimeout(timer);
  }, []);

  const pct = maxPoints > 0 ? Math.min(points / maxPoints, 1) * 100 : 0;

  return (
    <div className="flex items-center gap-3">
      <span className="text-lg flex-shrink-0 w-7 text-center">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium truncate" style={{ color: "var(--c-text)" }}>
            {label}
          </span>
          <span className="text-xs tabular-nums flex-shrink-0 ml-2" style={{ color: "var(--c-text-muted)" }}>
            {points}/{maxPoints}
          </span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--c-border)", opacity: 0.5 }}>
          <div
            className="h-full rounded-full"
            style={{
              background: "var(--c-accent)",
              width: mounted ? `${pct}%` : "0%",
              transition: "width 1.2s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ═══ Achievement card ═══
function AchievementCard({ achievement, t }: { achievement: Achievement; t: Record<string, string> }) {
  const unlockDate = achievement.unlockedAt
    ? new Date(achievement.unlockedAt).toLocaleDateString("fr-CH", { day: "numeric", month: "short" })
    : null;

  return (
    <div
      className="flex items-center gap-3 rounded-xl px-3 py-3"
      style={{
        background: achievement.unlocked ? "var(--c-card)" : "transparent",
        border: `1px solid ${achievement.unlocked ? "var(--c-border)" : "var(--c-border)"}`,
        opacity: achievement.unlocked ? 1 : 0.45,
      }}
    >
      <span
        className="text-2xl flex-shrink-0"
        style={{
          filter: achievement.unlocked ? "none" : "grayscale(1)",
        }}
      >
        {achievement.emoji}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate" style={{ color: "var(--c-text)" }}>
          {t[achievement.key] || achievement.id}
        </div>
        <div className="text-xs" style={{ color: "var(--c-text-muted)" }}>
          {achievement.unlocked
            ? (unlockDate ? `${t.scoreUnlocked || "Debloque"} ${unlockDate}` : (t.scoreUnlocked || "Debloque"))
            : `+${achievement.points} pts`
          }
        </div>
      </div>
      {achievement.unlocked && (
        <span className="text-green-500 text-sm flex-shrink-0">&#10003;</span>
      )}
    </div>
  );
}

// ═══ Next level progress ═══
function NextLevelBar({ score, currentMin, nextAt, t }: {
  score: number; currentMin: number; nextAt: number; t: Record<string, string>;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 600);
    return () => clearTimeout(timer);
  }, []);

  const range = nextAt - currentMin;
  const progress = range > 0 ? Math.min((score - currentMin) / range, 1) : 1;
  const remaining = Math.max(nextAt - score, 0);

  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: "var(--c-card)", border: "1px solid var(--c-border)" }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold" style={{ color: "var(--c-text)" }}>
          {t.scoreNext || "Prochain niveau"}
        </span>
        <span className="text-xs tabular-nums" style={{ color: "var(--c-text-muted)" }}>
          {remaining} pts
        </span>
      </div>
      <div className="h-3 rounded-full overflow-hidden" style={{ background: "var(--c-border)", opacity: 0.4 }}>
        <div
          className="h-full rounded-full"
          style={{
            background: `linear-gradient(90deg, var(--c-accent), var(--c-accent))`,
            width: mounted ? `${progress * 100}%` : "0%",
            transition: "width 1.4s cubic-bezier(0.4, 0, 0.2, 1)",
            boxShadow: "0 0 10px var(--c-accent)",
          }}
        />
      </div>
    </div>
  );
}

// ═══ Main page ═══
const LEVELS_DISPLAY = [
  { label: "Debutant",    emoji: "🐣" },
  { label: "Explorateur", emoji: "🐕" },
  { label: "Passionne",   emoji: "🦮" },
  { label: "Expert",      emoji: "🏆" },
  { label: "Legende",     emoji: "🌟" },
];

export default function ScorePage() {
  const { profile, loading: authLoading } = useAuth();
  const { t } = useAppContext();
  const {
    score, level, levelEmoji, levelIndex,
    nextLevelAt, currentLevelMin,
    breakdown, achievements, loading,
  } = usePawScore(profile?.id);

  // Category breakdown config
  const categories: { key: keyof ScoreBreakdown; icon: string; tKey: string; max: number }[] = [
    { key: "animals",  icon: "🐾", tKey: "scoreAnimals",  max: 250 },
    { key: "matches",  icon: "💕", tKey: "scoreMatches",  max: 200 },
    { key: "messages", icon: "💬", tKey: "scoreMessages", max: 100 },
    { key: "profile",  icon: "👤", tKey: "scoreProfile",  max: 100 },
    { key: "streak",   icon: "🔥", tKey: "scoreStreak",   max: 100 },
    { key: "events",   icon: "🎉", tKey: "scoreEvents",   max: 150 },
  ];

  if (authLoading || loading) {
    return (
      <main className="min-h-screen px-4 md:px-6 pb-28 pt-24 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-16 h-16 rounded-full border-4 border-t-transparent animate-spin"
            style={{ borderColor: "var(--c-border)", borderTopColor: "transparent" }}
          />
          <span style={{ color: "var(--c-text-muted)" }}>{t.loading || "Chargement..."}</span>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen px-4 md:px-6 pb-28 pt-24">
        <div className="max-w-md mx-auto text-center">
          <div className="text-5xl mb-4">🐾</div>
          <h1 className="text-xl font-bold mb-2" style={{ color: "var(--c-text)" }}>
            {t.matchesLoginRequired || "Connexion requise"}
          </h1>
          <p className="text-sm mb-6" style={{ color: "var(--c-text-muted)" }}>
            Connecte-toi pour voir ton PawScore
          </p>
          <Link
            href="/auth"
            className="inline-flex items-center gap-2 rounded-full px-6 py-3 font-semibold text-white"
            style={{ background: "var(--c-accent)" }}
          >
            {t.navLogin || "Connexion"}
          </Link>
        </div>
      </main>
    );
  }

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <main className="min-h-screen px-4 md:px-6 pb-28 pt-24">
      <div className="max-w-lg mx-auto">

        {/* ── Header ── */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-1">
            <button onClick={() => window.history.length > 1 ? window.history.back() : (window.location.href = "/feed")} aria-label="Retour" className="inline-flex items-center justify-center w-9 h-9 rounded-full transition-all active:scale-90 flex-shrink-0" style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--c-text)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <h1 className="text-2xl font-bold" style={{ color: "var(--c-text)" }}>
              {t.scoreTitle || "PawScore"}
            </h1>
          </div>
          <p className="text-sm" style={{ color: "var(--c-text-muted)" }}>
            {t.scoreLevel || "Ton niveau"} : {level} {levelEmoji}
          </p>
        </div>

        {/* ── Score Ring ── */}
        <div className="mb-8">
          <ScoreRing score={score} maxScore={1000} />
        </div>

        {/* ── Level badge row ── */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {LEVELS_DISPLAY.map((lvl, i) => (
            <LevelBadge
              key={lvl.label}
              label={lvl.label}
              emoji={lvl.emoji}
              active={i === levelIndex}
            />
          ))}
        </div>

        {/* ── Next level progress ── */}
        {levelIndex < LEVELS_DISPLAY.length - 1 && (
          <div className="mb-8">
            <NextLevelBar
              score={score}
              currentMin={currentLevelMin}
              nextAt={nextLevelAt}
              t={t}
            />
          </div>
        )}

        {/* ── Breakdown ── */}
        <div
          className="rounded-2xl p-5 mb-8"
          style={{ background: "var(--c-card)", border: "1px solid var(--c-border)" }}
        >
          <h2 className="text-base font-bold mb-4" style={{ color: "var(--c-text)" }}>
            {t.scoreBreakdown || "Repartition des points"}
          </h2>
          <div className="flex flex-col gap-4">
            {categories.map(cat => (
              <BreakdownRow
                key={cat.key}
                label={t[cat.tKey] || cat.key}
                icon={cat.icon}
                points={breakdown[cat.key]}
                maxPoints={cat.max}
              />
            ))}
          </div>
        </div>

        {/* ── Achievements ── */}
        <div
          className="rounded-2xl p-5"
          style={{ background: "var(--c-card)", border: "1px solid var(--c-border)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold" style={{ color: "var(--c-text)" }}>
              {t.scoreAchievements || "Succes"}
            </h2>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{
              background: "var(--c-accent)",
              color: "#fff",
            }}>
              {unlockedCount}/{achievements.length}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {achievements.map(a => (
              <AchievementCard key={a.id} achievement={a} t={t} />
            ))}
          </div>
        </div>

        {/* ── Back link ── */}
        <div className="text-center mt-8">
          <Link
            href="/profile"
            className="text-sm font-medium hover:opacity-70 transition-opacity"
            style={{ color: "var(--c-accent)" }}
          >
            &larr; {t.back || "Retour"}
          </Link>
        </div>
      </div>
    </main>
  );
}
