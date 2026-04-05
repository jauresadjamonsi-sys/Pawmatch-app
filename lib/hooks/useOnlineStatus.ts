"use client";

import { useEffect, useState, useRef } from "react";

/**
 * Fetches and polls online status for an array of user IDs.
 * Returns a Map of userId -> isOnline and a loading flag.
 */
export function useOnlineStatus(userIds: string[]) {
  const [onlineMap, setOnlineMap] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Stable key to detect when userIds actually change
  const idsKey = userIds.filter(Boolean).sort().join(",");

  useEffect(() => {
    if (!idsKey) {
      setOnlineMap(new Map());
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchPresence() {
      try {
        const res = await fetch("/api/presence?users=" + encodeURIComponent(idsKey));
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const map = new Map<string, boolean>();
        if (data.presence) {
          for (const [id, online] of Object.entries(data.presence)) {
            map.set(id, online as boolean);
          }
        }
        setOnlineMap(map);
      } catch {
        // Silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchPresence();

    // Poll every 60 seconds
    intervalRef.current = setInterval(fetchPresence, 60 * 1000);

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [idsKey]);

  return { onlineMap, loading };
}
