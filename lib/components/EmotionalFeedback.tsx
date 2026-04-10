"use client";
import { useEffect, useState, useCallback } from "react";

type FeedbackType = "celebration" | "encouragement" | "streak" | "milestone" | "comeback";

const FEEDBACK_CONFIG: Record<FeedbackType, { emoji: string; messages: string[]; color: string }> = {
  celebration: {
    emoji: "\uD83C\uDF89",
    messages: ["Super semaine !", "Tu g\u00e8res !", "Bravo \uD83D\uDC4F", "Continue comme \u00e7a !"],
    color: "rgba(34, 197, 94, 0.15)",
  },
  encouragement: {
    emoji: "\uD83D\uDCAA",
    messages: ["Tu peux le faire !", "Encore un petit effort !", "Presque l\u00e0 !"],
    color: "rgba(250, 204, 21, 0.15)",
  },
  streak: {
    emoji: "\uD83D\uDD25",
    messages: ["S\u00e9rie en feu !", "{count} jours d'affil\u00e9e !", "Inarr\u00eatable !"],
    color: "rgba(34, 197, 94, 0.15)",
  },
  milestone: {
    emoji: "\uD83C\uDFC6",
    messages: ["Niveau sup\u00e9rieur !", "Nouveau record !", "Impressionnant !"],
    color: "rgba(139, 92, 246, 0.15)",
  },
  comeback: {
    emoji: "\uD83D\uDC4B",
    messages: ["Content de te revoir !", "Tu nous as manqu\u00e9 !", "Bon retour !"],
    color: "rgba(34, 197, 94, 0.15)",
  },
};

export default function EmotionalFeedback({
  type,
  count,
  show,
  onDismiss,
  autoDismiss = 4000,
}: {
  type: FeedbackType;
  count?: number;
  show: boolean;
  onDismiss?: () => void;
  autoDismiss?: number;
}) {
  const [visible, setVisible] = useState(false);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    onDismiss?.();
  }, [onDismiss]);

  useEffect(() => {
    if (show) {
      setVisible(true);
      if (autoDismiss > 0) {
        const timer = setTimeout(() => {
          handleDismiss();
        }, autoDismiss);
        return () => clearTimeout(timer);
      }
    }
  }, [show, autoDismiss, handleDismiss]);

  if (!visible) return null;

  const config = FEEDBACK_CONFIG[type];
  const msg = config.messages[Math.floor(Math.random() * config.messages.length)]
    .replace("{count}", String(count || 0));

  return (
    <div
      className="fixed top-20 left-1/2 z-50 animate-emotional-bounce-in"
      style={{ transform: "translateX(-50%)" }}
      onClick={handleDismiss}
      role="status"
      aria-live="polite"
    >
      <div
        className="flex items-center gap-3 px-5 py-3 rounded-2xl border backdrop-blur-xl shadow-2xl cursor-pointer"
        style={{
          background: config.color,
          borderColor: "rgba(255,255,255,0.1)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        }}
      >
        <span className="text-2xl animate-emotional-wiggle">{config.emoji}</span>
        <span className="text-sm font-bold" style={{ color: "var(--c-text)" }}>{msg}</span>
      </div>
    </div>
  );
}
