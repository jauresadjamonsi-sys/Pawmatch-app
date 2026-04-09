"use client";

import { useState, useEffect } from "react";
import { usePushNotifications } from "@/lib/hooks/usePushNotifications";

const DISMISSED_KEY = "pawly_push_dismissed";

export default function PushPrompt() {
  const { permission, subscribed, subscribe } = usePushNotifications();
  const [dismissed, setDismissed] = useState(true); // default hidden
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Don't show if notifications are not supported
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    // Don't show if already granted or denied
    if (Notification.permission === "granted") return;
    if (Notification.permission === "denied") return;

    // Don't show if user dismissed
    try {
      if (localStorage.getItem(DISMISSED_KEY) === "1") return;
    } catch {
      // localStorage unavailable
    }

    setDismissed(false);
    // Small delay for entrance animation
    const t = setTimeout(() => setVisible(true), 300);
    return () => clearTimeout(t);
  }, []);

  // Hide once subscribed or if permission changed
  useEffect(() => {
    if (subscribed || permission === "granted") {
      setVisible(false);
    }
  }, [subscribed, permission]);

  async function handleActivate() {
    setLoading(true);
    try {
      await subscribe();
    } catch {
      // Permission denied or error -- banner will stay but user can dismiss
    }
    setLoading(false);
  }

  function handleDismiss() {
    setVisible(false);
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // ignore
    }
    // Remove from DOM after animation
    setTimeout(() => setDismissed(true), 400);
  }

  if (dismissed) return null;

  return (
    <div
      className="rounded-2xl p-4 mb-4 transition-all duration-400"
      style={{
        background:
          "linear-gradient(135deg, rgba(249,115,22,0.15), rgba(167,139,250,0.12))",
        border: "1px solid var(--c-border)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(-8px)",
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg"
          style={{
            background: "linear-gradient(135deg, #f97316, #ea580c)",
          }}
        >
          {"\uD83D\uDD14"}
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-semibold mb-0.5"
            style={{ color: "var(--c-text)" }}
          >
            Active les notifications
          </p>
          <p
            className="text-xs leading-relaxed"
            style={{ color: "var(--c-text-muted)" }}
          >
            Pour ne rien rater : nouveaux matches, messages et events.
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="shrink-0 p-1 rounded-full opacity-50 hover:opacity-100 transition-opacity"
          style={{ color: "var(--c-text-muted)" }}
          aria-label="Fermer"
        >
          {"\u2715"}
        </button>
      </div>
      <button
        onClick={handleActivate}
        disabled={loading}
        className="mt-3 w-full py-2 rounded-xl text-sm font-bold text-white transition-all duration-200"
        style={{
          background: loading
            ? "rgba(249,115,22,0.4)"
            : "linear-gradient(135deg, #f97316, #ea580c)",
          cursor: loading ? "wait" : "pointer",
        }}
      >
        {loading ? "Activation..." : "Activer"}
      </button>
    </div>
  );
}
