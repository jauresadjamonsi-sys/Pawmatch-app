"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export type NotificationType =
  | "match"
  | "message"
  | "event"
  | "system"
  | "reminder";

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

export type NotificationFilter =
  | "all"
  | "match"
  | "message"
  | "event"
  | "system";

interface UseNotificationsOptions {
  realtime?: boolean;
  limit?: number;
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const { realtime = true, limit = 50 } = options;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const supabaseRef = useRef(createClient());
  const channelRef = useRef<any>(null);

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabaseRef.current.auth.getUser();
      setUserId(user?.id ?? null);
      if (!user) setLoading(false);
    }
    getUser();
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabaseRef.current
        .from("notifications")
        .select("id, user_id, type, title, body, link, read, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (!error && data) {
        setNotifications(data as Notification[]);
        setUnreadCount(data.filter((n: Notification) => !n.read).length);
      }
    } catch {
      // Table might not exist yet — silently ignore
    } finally {
      setLoading(false);
    }
  }, [userId, limit]);

  const fetchUnreadCount = useCallback(async () => {
    if (!userId) return;
    try {
      const { count } = await supabaseRef.current
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("read", false);
      setUnreadCount(count ?? 0);
    } catch {
      // silently ignore
    }
  }, [userId]);

  useEffect(() => {
    if (userId) fetchNotifications();
  }, [userId, fetchNotifications]);

  // Supabase real-time subscription — wrapped in try/catch to NEVER crash the app
  useEffect(() => {
    if (!userId || !realtime) return;

    try {
      const channel = supabaseRef.current
        .channel(`notifs-${userId}`);

      // Set up listeners BEFORE subscribing
      channel.on(
        "postgres_changes" as any,
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload: any) => {
          const newNotif = payload.new as Notification;
          setNotifications((prev) => [newNotif, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      );

      channel.on(
        "postgres_changes" as any,
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload: any) => {
          const updated = payload.new as Notification;
          setNotifications((prev) =>
            prev.map((n) => (n.id === updated.id ? updated : n))
          );
          fetchUnreadCount();
        }
      );

      // Subscribe with error handling
      channel.subscribe((status: string) => {
        if (status === "CHANNEL_ERROR") {
          // Realtime not enabled on this table — fall back to polling
          console.warn("Notifications realtime not available, using polling");
          supabaseRef.current.removeChannel(channel);
        }
      });

      channelRef.current = channel;
    } catch (e) {
      // Never crash the app for realtime issues
      console.warn("Notifications realtime setup failed:", e);
    }

    return () => {
      if (channelRef.current) {
        try {
          supabaseRef.current.removeChannel(channelRef.current);
        } catch {}
        channelRef.current = null;
      }
    };
  }, [userId, realtime, fetchUnreadCount]);

  // Polling fallback: refresh on focus
  useEffect(() => {
    function handleFocus() { fetchUnreadCount(); }
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [fetchUnreadCount]);

  const markAsRead = useCallback(
    async (notifId: string) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      try {
        await fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: [notifId] }),
        });
      } catch { fetchNotifications(); }
    },
    [fetchNotifications]
  );

  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
    } catch { fetchNotifications(); }
  }, [fetchNotifications]);

  const dismiss = useCallback(
    async (notifId: string) => {
      setNotifications((prev) => prev.filter((n) => n.id !== notifId));
      try {
        await supabaseRef.current
          .from("notifications")
          .delete()
          .eq("id", notifId)
          .eq("user_id", userId);
      } catch { fetchNotifications(); }
    },
    [userId, fetchNotifications]
  );

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    dismiss,
    refetch: fetchNotifications,
  };
}
