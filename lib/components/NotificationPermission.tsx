"use client";

import { useState, useEffect } from "react";
import { useAppContext } from "@/lib/contexts/AppContext";
import { usePushNotifications } from "@/lib/hooks/usePushNotifications";

const STORAGE_KEY = "pawly_notif_banner_dismissed";

export default function NotificationPermission() {
  const [visible, setVisible] = useState(false);
  const { permission, subscribe } = usePushNotifications();
  const { t } = useAppContext();
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    // Only show if push is supported, permission not yet granted, and user hasn't dismissed
    if (typeof window === "undefined") return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
    if (permission === "granted") return;
    if (permission === "denied") return;

    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed) return;

    setVisible(true);
  }, [permission]);

  if (!visible) return null;

  function handleDismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  async function handleEnable() {
    setSubscribing(true);
    const success = await subscribe();
    setSubscribing(false);
    if (success) {
      setVisible(false);
    }
  }

  return (
    <div
      className="mx-4 mb-4 rounded-2xl border p-4 flex items-center gap-3 transition-all"
      style={{
        background:
          "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(167,139,250,0.08))",
        borderColor: "var(--c-border)",
      }}
    >
      <span className="text-2xl shrink-0">🔔</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--c-text)]">
          {t.notifEnable}
        </p>
        <p className="text-xs text-[var(--c-text-muted)] mt-0.5">
          {t.notifEnableDesc}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleDismiss}
          className="p-1.5 rounded-full text-[var(--c-text-muted)] hover:text-[var(--c-text)] transition"
          aria-label="Fermer"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
        <button
          onClick={handleEnable}
          disabled={subscribing}
          className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-bold rounded-full hover:from-amber-600 hover:to-amber-700 transition shadow-lg shadow-amber-500/20 disabled:opacity-50"
        >
          {subscribing ? "..." : t.notifEnableBtn}
        </button>
      </div>
    </div>
  );
}
