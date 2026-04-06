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
  /** Auto-subscribe to Supabase real-time changes */
  realtime?: boolean;
  /** Limit the number of notifications fetched */
  limit?: number;
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const { realtime = true, limit = 50 } = options;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const supabaseRef = useRef(createClient());

  // Get user on mount
  useEffect(() => {
    async function getUser() {
      const {
        data: { user },
      } = await supabaseRef.current.auth.getUser();
      setUserId(user?.id ?? null);
      if (!user) setLoading(false);
    }
    getUser();
  }, []);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabaseRef.current
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (!error && data) {
        setNotifications(data as Notification[]);
        setUnreadCount(data.filter((n: Notification) => !n.read).length);
      }
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, [userId, limit]);

  // Fetch unread count only (lightweight)
  const fetchUnreadCount = useCallback(async () => {
    if (!userId) return;
    try {
      const { count } = await supabaseRef.current
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("read", false);

      setUnreadCount(count ?? 0);
    } catch {
      // silently ignore
    }
  }, [userId]);

  // Initial fetch when userId is known
  useEffect(() => {
    if (userId) {
      fetchNotifications();
    }
  }, [userId, fetchNotifications]);

  // Supabase real-time subscription
  useEffect(() => {
    if (!userId || !realtime) return;

    const channel = supabaseRef.current
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications((prev) => [newNotif, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updated = payload.new as Notification;
          setNotifications((prev) =>
            prev.map((n) => (n.id === updated.id ? updated : n))
          );
          // Recalculate unread count
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabaseRef.current.removeChannel(channel);
    };
  }, [userId, realtime, fetchUnreadCount]);

  // Auto-refresh on window focus
  useEffect(() => {
    function handleFocus() {
      fetchUnreadCount();
    }
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [fetchUnreadCount]);

  // Mark single notification as read
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
      } catch {
        // revert on error
        fetchNotifications();
      }
    },
    [fetchNotifications]
  );

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);

    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
    } catch {
      fetchNotifications();
    }
  }, [fetchNotifications]);

  // Delete/dismiss a notification
  const dismiss = useCallback(
    async (notifId: string) => {
      setNotifications((prev) => prev.filter((n) => n.id !== notifId));

      try {
        await supabaseRef.current
          .from("notifications")
          .delete()
          .eq("id", notifId)
          .eq("user_id", userId);
      } catch {
        fetchNotifications();
      }
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
