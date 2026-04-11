"use client";

import { useState, useEffect } from "react";

// ============================================
// TRANSLATIONS
// ============================================
const T: Record<string, { title: string; cta: string }> = {
  fr: {
    title: "Bientôt disponible sur iOS — Soyez les premiers informés !",
    cta: "Me notifier",
  },
  de: {
    title: "Bald verfügbar auf iOS — Seien Sie die Ersten, die es erfahren!",
    cta: "Benachrichtigen",
  },
  it: {
    title: "Presto disponibile su iOS — Siate i primi a saperlo!",
    cta: "Avvisami",
  },
  en: {
    title: "Coming soon on iOS — Be the first to know!",
    cta: "Notify me",
  },
};

const STORAGE_KEY = "pawly_ios_banner_dismissed";
const DISMISS_TTL = 1000 * 60 * 60 * 24 * 7; // 7 days

function getLang(): string {
  try {
    return localStorage.getItem("pawly_lang") || "fr";
  } catch {
    return "fr";
  }
}

function isIOSDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes("Mac") && "ontouchend" in document);
}

function isDismissed(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    return Date.now() - parseInt(raw, 10) < DISMISS_TTL;
  } catch {
    return false;
  }
}

export default function IOSBanner() {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Only show on iOS, only if not dismissed recently
    if (!isIOSDevice() || isDismissed()) return;

    // Already installed as PWA — skip
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true;
    if (standalone) return;

    setVisible(true);
    // Trigger slide-down animation after mount
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setMounted(true));
    });
  }, []);

  function dismiss() {
    setMounted(false);
    // Wait for the slide-up animation to finish before removing from DOM
    setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, String(Date.now()));
      } catch { /* ignore */ }
      setVisible(false);
    }, 300);
  }

  function handleNotify() {
    window.location.href = "mailto:contact@pawband.ch?subject=Notify%20me%20for%20iOS%20app&body=I%20want%20to%20be%20notified%20when%20PawBand%20is%20available%20on%20iOS!";
  }

  if (!visible) return null;

  const lang = getLang();
  const t = T[lang] || T.fr;

  return (
    <div
      style={{
        overflow: "hidden",
        maxHeight: mounted ? 120 : 0,
        opacity: mounted ? 1 : 0,
        transition: "max-height 0.4s ease, opacity 0.3s ease",
      }}
    >
      <div
        style={{
          background: "var(--c-card)",
          borderBottom: "1px solid var(--c-border)",
          padding: "12px 16px",
          paddingTop: "max(12px, env(safe-area-inset-top))",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        {/* Apple logo */}
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          style={{ flexShrink: 0 }}
          aria-hidden="true"
        >
          <path
            d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C4.24 16.7 4.89 10.83 8.7 10.6c1.26.07 2.13.72 2.91.77.98-.2 1.92-.77 2.97-.7 1.26.1 2.2.6 2.82 1.52-2.58 1.54-1.97 4.93.37 5.87-.46 1.2-1.04 2.39-1.72 3.22zM12.03 10.47c-.13-2.23 1.66-4.15 3.74-4.33.28 2.45-2.2 4.28-3.74 4.33z"
            fill="var(--c-text)"
          />
        </svg>

        {/* Text */}
        <p
          style={{
            flex: 1,
            fontSize: 13,
            fontWeight: 600,
            color: "var(--c-text)",
            margin: 0,
            lineHeight: 1.4,
            minWidth: 180,
          }}
        >
          {t.title}
        </p>

        {/* CTA button */}
        <button
          onClick={handleNotify}
          style={{
            padding: "8px 20px",
            background: "var(--c-accent)",
            color: "#fff",
            border: "none",
            borderRadius: 50,
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            whiteSpace: "nowrap",
            minHeight: 40,
            flexShrink: 0,
          }}
        >
          {t.cta}
        </button>

        {/* Dismiss button */}
        <button
          onClick={dismiss}
          aria-label="Fermer"
          style={{
            background: "none",
            border: "none",
            color: "var(--c-text-muted)",
            fontSize: 18,
            cursor: "pointer",
            padding: 4,
            lineHeight: 1,
            flexShrink: 0,
            minWidth: 32,
            minHeight: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          &times;
        </button>
      </div>
    </div>
  );
}
