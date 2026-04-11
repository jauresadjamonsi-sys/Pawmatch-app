"use client";

import { useState, useEffect } from "react";

/**
 * UpdateBanner — Notifies users about ongoing maintenance or updates.
 *
 * Configure ACTIVE_UPDATES below to show/hide banners.
 * Set items to [] when no maintenance is active.
 */

type UpdateItem = {
  id: string;
  message: string;
  type: "maintenance" | "update" | "info";
  /** ISO date string — banner auto-hides after this date */
  expiresAt?: string;
};

// ====== CONFIGURE ACTIVE UPDATES HERE ======
const ACTIVE_UPDATES: UpdateItem[] = [
  // Example:
  // {
  //   id: "v2.5-perf",
  //   message: "Optimisation en cours — certaines pages peuvent etre lentes temporairement.",
  //   type: "maintenance",
  //   expiresAt: "2026-04-13T00:00:00Z",
  // },
];
// ============================================

const ICONS: Record<string, string> = {
  maintenance: "\u{1F6E0}\uFE0F",
  update: "\u{1F680}",
  info: "\u{1F4E2}",
};

const COLORS: Record<string, { bg: string; border: string; text: string }> = {
  maintenance: { bg: "rgba(250,204,21,0.08)", border: "rgba(250,204,21,0.25)", text: "#facc15" },
  update: { bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.25)", text: "#FBBF24" },
  info: { bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.25)", text: "#3b82f6" },
};

export default function UpdateBanner() {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("pawly_update_dismissed");
      if (raw) setDismissed(new Set(JSON.parse(raw)));
    } catch { /* ignore */ }
  }, []);

  function dismiss(id: string) {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    try { sessionStorage.setItem("pawly_update_dismissed", JSON.stringify([...next])); } catch { /* ignore */ }
  }

  const now = new Date();
  const visible = ACTIVE_UPDATES.filter(u => {
    if (dismissed.has(u.id)) return false;
    if (u.expiresAt && new Date(u.expiresAt) < now) return false;
    return true;
  });

  if (visible.length === 0) return null;

  return (
    <div className="px-4 pt-2 flex flex-col gap-2">
      {visible.map(u => {
        const c = COLORS[u.type] || COLORS.info;
        return (
          <div key={u.id} className="rounded-xl p-3 text-sm flex items-center gap-3" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
            <span className="text-lg flex-shrink-0">{ICONS[u.type] || ICONS.info}</span>
            <p className="flex-1 text-xs font-medium" style={{ color: "var(--c-text)" }}>{u.message}</p>
            <button onClick={() => dismiss(u.id)} className="text-xs opacity-60 hover:opacity-100 flex-shrink-0" style={{ color: "var(--c-text-muted)" }}>
              OK
            </button>
          </div>
        );
      })}
    </div>
  );
}
