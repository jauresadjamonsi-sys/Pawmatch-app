"use client";

import { useEffect, useState, useRef } from "react";

/**
 * VisitCounter — subtle badge showing total visitors.
 * On mount it POSTs to /api/visit (once per session) and
 * animates a count-up from 0 to the real number.
 */
export default function VisitCounter() {
  const [count, setCount] = useState(0);
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function track() {
      try {
        const alreadyTracked = sessionStorage.getItem("pawly_visit_tracked");

        if (!alreadyTracked) {
          // First visit this session — increment
          const res = await fetch("/api/visit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ site: "pawlyapp" }),
          });
          const json = await res.json();
          if (!cancelled) {
            setCount(json.count ?? 0);
            sessionStorage.setItem("pawly_visit_tracked", "1");
          }
        } else {
          // Already tracked — just fetch the count
          const res = await fetch("/api/visit?site=pawlyapp");
          const json = await res.json();
          if (!cancelled) setCount(json.count ?? 0);
        }
      } catch {
        // silently fail — counter is non-critical
      }
    }

    track();
    return () => { cancelled = true; };
  }, []);

  // Animated count-up
  useEffect(() => {
    if (count === 0) return;

    const duration = 1200; // ms
    const start = performance.now();
    const from = 0;
    const to = count;

    function step(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out quad
      const eased = 1 - (1 - progress) * (1 - progress);
      const current = Math.round(from + (to - from) * eased);
      setDisplay(current);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    }

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [count]);

  if (count === 0) return null;

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 12px",
        borderRadius: 20,
        background: "var(--c-card)",
        border: "1px solid var(--c-border)",
        fontSize: 12,
        fontWeight: 600,
        color: "var(--c-text-muted)",
        opacity: 0.85,
        transition: "opacity 0.3s",
      }}
    >
      <span style={{ fontSize: 14 }}>{"👀"}</span>
      <span style={{ color: "var(--c-accent)", fontVariantNumeric: "tabular-nums" }}>
        {display.toLocaleString("fr-CH")}
      </span>
      <span>visiteurs</span>
    </div>
  );
}
