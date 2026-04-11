"use client";

import { useState, useEffect, useRef } from "react";
import { usePawScore } from "@/lib/hooks/usePawScore";
import Link from "next/link";

/** Animate a number from 0 to `target` over `duration` ms using rAF */
function useCountUp(target: number, duration = 800, enabled = false) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled || target <= 0) { setDisplay(target); return; }
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, enabled]);

  return display;
}

type PawScoreBadgeProps = {
  userId?: string;
  size?: "sm" | "md";
};

export default function PawScoreBadge({ userId, size = "sm" }: PawScoreBadgeProps) {
  const { score, levelEmoji, nextLevelAt, currentLevelMin, loading } = usePawScore(userId);
  const [mounted, setMounted] = useState(false);
  const animatedScore = useCountUp(score, 800, mounted && !loading);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (loading || !userId) return null;

  // Progress within current level (0-1)
  const levelRange = nextLevelAt - currentLevelMin;
  const progress = levelRange > 0 ? Math.min((score - currentLevelMin) / levelRange, 1) : 1;

  const isSm = size === "sm";
  const ringSize = isSm ? 32 : 44;
  const strokeWidth = isSm ? 3 : 4;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - (mounted ? progress : 0));

  return (
    <Link href="/score" className="group flex items-center gap-1.5 no-underline" aria-label={`PawScore: ${score} points`} title="PawScore">
      <div className="relative flex items-center justify-center" style={{ width: ringSize, height: ringSize }}>
        <svg
          width={ringSize}
          height={ringSize}
          className="absolute inset-0"
          style={{ transform: "rotate(-90deg)" }}
          aria-hidden="true"
          role="img"
        >
          {/* Background ring */}
          <circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={radius}
            fill="none"
            stroke="var(--c-border)"
            strokeWidth={strokeWidth}
            opacity={0.5}
          />
          {/* Progress ring */}
          <circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={radius}
            fill="none"
            stroke="var(--c-accent)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)" }}
          />
        </svg>
        {/* Emoji center */}
        <span
          className="relative"
          aria-hidden="true"
          style={{
            fontSize: isSm ? 14 : 18,
            transform: mounted ? "scale(1)" : "scale(0)",
            transition: "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.6s",
          }}
        >
          {levelEmoji}
        </span>
      </div>
      {/* Score number */}
      <span
        className={`font-bold tabular-nums group-hover:opacity-80 transition-opacity score-number${mounted ? " animate-score-reveal" : ""}`}
        style={{
          color: "var(--c-accent)",
          fontSize: isSm ? 12 : 14,
          /* override score-number defaults for badge context */
          background: "none",
          WebkitBackgroundClip: "unset",
          WebkitTextFillColor: "var(--c-accent)",
          backgroundClip: "unset",
        }}
      >
        {animatedScore}
      </span>
    </Link>
  );
}
