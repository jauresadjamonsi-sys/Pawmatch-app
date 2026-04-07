"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

const TYPING_TIMEOUT_MS = 3_000; // show "typing..." for 3s after last signal
const THROTTLE_MS = 2_000; // don't send typing signal more than once per 2s

/**
 * Bidirectional typing indicator using Supabase Realtime Broadcast.
 *
 * - `sendTyping()` — call this on every keystroke (throttled internally).
 * - `isOtherTyping` — true when the other user is typing.
 *
 * Uses broadcast (not postgres_changes) so no database writes are needed
 * for the ephemeral typing signal, which is much cheaper and lower-latency.
 */
export function useTypingIndicator(
  matchId: string | null,
  myUserId: string | null
) {
  const supabase = createClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const lastSentRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!matchId || !myUserId) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`typing:${matchId}`)
      .on("broadcast", { event: "typing" }, (payload) => {
        const senderId = payload.payload?.user_id;
        if (senderId && senderId !== myUserId) {
          setIsOtherTyping(true);

          // Clear previous timeout
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => {
            setIsOtherTyping(false);
          }, TYPING_TIMEOUT_MS);
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [matchId, myUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Call on every keystroke. Internally throttled so it only broadcasts
   * once every THROTTLE_MS.
   */
  const sendTyping = useCallback(() => {
    if (!channelRef.current || !myUserId) return;
    const now = Date.now();
    if (now - lastSentRef.current < THROTTLE_MS) return;
    lastSentRef.current = now;

    channelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: { user_id: myUserId },
    });
  }, [myUserId]);

  return { isOtherTyping, sendTyping };
}
