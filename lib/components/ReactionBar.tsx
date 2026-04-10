"use client";

import { useState, useCallback } from "react";

const EMOJIS = [
  { key: "paw", emoji: "\uD83D\uDC3E", label: "Paw" },
  { key: "heart", emoji: "\u2764\uFE0F", label: "Coeur" },
  { key: "laugh", emoji: "\uD83D\uDE02", label: "Rire" },
  { key: "wow", emoji: "\uD83D\uDE2E", label: "Wow" },
  { key: "sad", emoji: "\uD83D\uDE22", label: "Triste" },
] as const;

type Props = {
  reelId: string;
  initialCounts?: Record<string, number>;
  initialUserReactions?: string[];
};

export default function ReactionBar({ reelId, initialCounts = {}, initialUserReactions = [] }: Props) {
  const [counts, setCounts] = useState<Record<string, number>>(initialCounts);
  const [userReactions, setUserReactions] = useState<Set<string>>(new Set(initialUserReactions));
  const [animating, setAnimating] = useState<string | null>(null);

  const toggleReaction = useCallback(async (emoji: string) => {
    const isActive = userReactions.has(emoji);

    // Optimistic update
    setUserReactions((prev) => {
      const next = new Set(prev);
      if (isActive) next.delete(emoji);
      else next.add(emoji);
      return next;
    });
    setCounts((prev) => ({
      ...prev,
      [emoji]: Math.max(0, (prev[emoji] || 0) + (isActive ? -1 : 1)),
    }));

    // Animation
    setAnimating(emoji);
    setTimeout(() => setAnimating(null), 400);

    // Server sync
    try {
      const res = await fetch(`/api/reels/${reelId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
      if (!res.ok) throw new Error("Failed");
    } catch {
      // Revert on error
      setUserReactions((prev) => {
        const next = new Set(prev);
        if (isActive) next.add(emoji);
        else next.delete(emoji);
        return next;
      });
      setCounts((prev) => ({
        ...prev,
        [emoji]: Math.max(0, (prev[emoji] || 0) + (isActive ? 1 : -1)),
      }));
    }
  }, [reelId, userReactions]);

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {EMOJIS.map(({ key, emoji }) => {
        const isActive = userReactions.has(key);
        const count = counts[key] || 0;
        return (
          <button
            key={key}
            onClick={() => toggleReaction(key)}
            aria-label={`${key} ${isActive ? "retirer" : "ajouter"}`}
            className={`btn-press flex items-center gap-0.5 px-2 py-1 rounded-full text-xs transition-all duration-200 ${
              isActive
                ? "border border-orange-500/30"
                : "border border-[var(--c-border)] hover:border-orange-500/20"
            } ${animating === key ? "animate-heart-burst" : ""}`}
            style={{
              background: isActive
                ? "rgba(249,115,22,0.15)"
                : "var(--c-card)",
            }}
          >
            <span
              className="text-sm transition-transform duration-200"
              style={{ transform: isActive ? "scale(1.15)" : "scale(1)" }}
            >
              {emoji}
            </span>
            {count > 0 && (
              <span
                className="text-[10px] font-medium"
                style={{
                  color: isActive ? "var(--c-accent, #f97316)" : "var(--c-text-muted)",
                }}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
