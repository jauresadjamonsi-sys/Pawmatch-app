"use client";

import { useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { MessageRow } from "@/lib/services/messages";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Subscribes to real-time INSERT events on the messages table for a given match.
 * Calls `onNewMessage` whenever a new message arrives, enabling instant chat updates.
 * Also calls `onReconnect` when the channel recovers from a disconnection so the
 * consumer can re-fetch all messages to fill any gap.
 */
export function useRealtimeMessages(
  matchId: string | null,
  {
    onNewMessage,
    onReconnect,
  }: {
    onNewMessage: (msg: MessageRow) => void;
    onReconnect?: () => void;
  }
) {
  const supabase = createClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  // Stable refs so the subscription callback always sees the latest handlers
  const onNewMessageRef = useRef(onNewMessage);
  const onReconnectRef = useRef(onReconnect);
  onNewMessageRef.current = onNewMessage;
  onReconnectRef.current = onReconnect;

  useEffect(() => {
    if (!matchId) return;

    // Clean up any prior channel for this match (e.g. StrictMode double-mount)
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`messages:${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const msg = payload.new as MessageRow;
          onNewMessageRef.current(msg);
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          // Successfully connected / reconnected
        }
        if (status === "CHANNEL_ERROR") {
          // Supabase will auto-reconnect; when it does we'll get SUBSCRIBED again
          // and the consumer should re-fetch to fill any gap.
          onReconnectRef.current?.();
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [matchId]); // eslint-disable-line react-hooks/exhaustive-deps
}
