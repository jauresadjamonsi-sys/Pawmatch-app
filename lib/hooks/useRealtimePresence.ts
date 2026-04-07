"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

type PresenceState = Record<string, boolean>;

/**
 * Tracks online/offline status for a set of user IDs using Supabase Realtime
 * Presence (server-managed). Falls back to the existing polling API on initial
 * load and only supplements with realtime events afterward.
 *
 * The current user also enters the presence channel so that *other* users
 * can see them as online.
 *
 * Usage:
 *   const { onlineMap } = useRealtimePresence(myUserId, [otherUserId1, otherUserId2]);
 *   const isOnline = onlineMap.get(someUserId) ?? false;
 */
export function useRealtimePresence(
  myUserId: string | null,
  trackedUserIds: string[]
) {
  const supabase = createClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [onlineMap, setOnlineMap] = useState<Map<string, boolean>>(new Map());
  const trackedKey = trackedUserIds.filter(Boolean).sort().join(",");

  useEffect(() => {
    if (!myUserId) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase.channel("presence:global", {
      config: { presence: { key: myUserId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ user_id: string }>();
        // Build a set of all online user_ids from the presence state
        const onlineSet = new Set<string>();
        for (const key of Object.keys(state)) {
          onlineSet.add(key);
        }

        setOnlineMap((prev) => {
          const next = new Map(prev);
          for (const uid of trackedUserIds) {
            next.set(uid, onlineSet.has(uid));
          }
          return next;
        });
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          // Track myself in the presence channel
          await channel.track({ user_id: myUserId, online_at: new Date().toISOString() });
        }
      });

    channelRef.current = channel;

    // Also do an initial fetch from the REST API to have data while presence
    // state propagates (presence sync may take a moment on first load).
    if (trackedKey) {
      fetch("/api/presence?users=" + encodeURIComponent(trackedKey))
        .then((r) => r.json())
        .then((data) => {
          if (data.presence) {
            setOnlineMap((prev) => {
              const next = new Map(prev);
              for (const [id, online] of Object.entries(data.presence)) {
                next.set(id, online as boolean);
              }
              return next;
            });
          }
        })
        .catch(() => {});
    }

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [myUserId, trackedKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return { onlineMap };
}
