"use client";

import { useEffect, useRef } from "react";

/**
 * Heartbeat hook that keeps the current user's presence alive.
 * Call once in a top-level client component for authenticated users.
 */
export function usePresence() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    function ping() {
      fetch("/api/presence", { method: "POST" }).catch(() => {});
    }

    // Initial ping
    ping();

    // Heartbeat every 2 minutes
    intervalRef.current = setInterval(ping, 2 * 60 * 1000);

    // Ping on window focus
    function handleFocus() {
      ping();
    }

    window.addEventListener("focus", handleFocus);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);
}
