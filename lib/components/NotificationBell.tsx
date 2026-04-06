"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "@/lib/contexts/AppContext";

interface Notification {
  id: string;
  type: "match" | "message" | "event" | "system" | "reminder";
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

const TYPE_ICONS: Record<Notification["type"], string> = {
  match: "🤝",
  message: "💬",
  event: "📅",
  system: "🔔",
  reminder: "💊",
};

const POLL_INTERVAL = 30_000;

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { t } = useAppContext();

  const unreadCount = notifications.filter((n) => !n.read).length;

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) setNotifications(data);
    } catch {
      // silently ignore fetch errors
    }
  }, []);

  // Initial fetch + polling
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const markAllRead = async () => {
    setLoading(true);
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleClick = async (notif: Notification) => {
    if (!notif.read) {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [notif.id] }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
      );
    }
    setOpen(false);
    if (notif.link) {
      router.push(notif.link);
    }
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-full transition hover:bg-white/10"
        aria-label={t.notifTitle}
      >
        <svg
          className="w-5 h-5 text-[var(--c-text-muted)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold text-white bg-red-500 rounded-full leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-80 max-h-[420px] overflow-y-auto rounded-xl border shadow-2xl z-50"
          style={{
            background: "var(--c-card)",
            borderColor: "var(--c-border)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--c-border)]">
            <h3 className="text-sm font-semibold text-[var(--c-text)]">
              {t.notifTitle}
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                disabled={loading}
                className="text-xs text-[var(--c-accent)] hover:underline disabled:opacity-50"
              >
                {t.notifMarkAll}
              </button>
            )}
          </div>

          {/* List */}
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[var(--c-text-muted)]">
              {t.notifEmpty}
            </div>
          ) : (
            <ul>
              {notifications.map((notif) => (
                <li key={notif.id}>
                  <button
                    onClick={() => handleClick(notif)}
                    className="w-full text-left px-4 py-3 flex gap-3 items-start transition"
                    style={{
                      background: !notif.read ? "rgba(249,115,22,0.06)" : undefined,
                    }}
                  >
                    <span className="text-lg mt-0.5 shrink-0">
                      {TYPE_ICONS[notif.type] || TYPE_ICONS.system}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={
                            "text-sm truncate " +
                            (!notif.read
                              ? "font-semibold text-[var(--c-text)]"
                              : "text-[var(--c-text-muted)]")
                          }
                        >
                          {notif.title}
                        </span>
                        {!notif.read && (
                          <span className="shrink-0 text-[9px] font-bold text-[var(--c-accent)] uppercase">
                            {t.notifNew}
                          </span>
                        )}
                      </div>
                      {notif.body && (
                        <p className="text-xs text-[var(--c-text-muted)] truncate mt-0.5">
                          {notif.body}
                        </p>
                      )}
                      <span className="text-[10px] text-[var(--c-text-muted)] mt-1 block">
                        {timeAgo(notif.created_at)}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
