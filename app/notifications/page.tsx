"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "@/lib/contexts/AppContext";
import {
  useNotifications,
  type Notification,
  type NotificationFilter,
} from "@/lib/hooks/useNotifications";
import NotificationPermission from "@/lib/components/NotificationPermission";

const TYPE_ICONS: Record<string, string> = {
  match: "🤝",
  message: "💬",
  event: "📅",
  system: "🔔",
  reminder: "💊",
};

const FILTER_TO_TYPES: Record<NotificationFilter, string[] | null> = {
  all: null,
  match: ["match"],
  message: ["message"],
  event: ["event"],
  system: ["system", "reminder"],
};

const PAGE_CSS = `
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes slideOut {
  to { opacity: 0; transform: translateX(100%); height: 0; padding: 0; margin: 0; overflow: hidden; }
}
.fade-up { animation: fadeUp 0.35s ease-out forwards; }
.slide-out { animation: slideOut 0.3s ease-in forwards; }
`;

export default function NotificationsPage() {
  const router = useRouter();
  const { t } = useAppContext();
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    dismiss,
  } = useNotifications({ realtime: true, limit: 50 });

  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [dismissing, setDismissing] = useState<Set<string>>(new Set());
  const touchStartRef = useRef<{ id: string; x: number } | null>(null);

  const filters: { key: NotificationFilter; label: string }[] = [
    { key: "all", label: t.notifAll },
    { key: "match", label: t.notifMatches },
    { key: "message", label: t.notifMessages },
    { key: "event", label: t.notifEvents },
    { key: "system", label: t.notifSystem },
  ];

  const filtered = notifications.filter((n) => {
    const types = FILTER_TO_TYPES[filter];
    if (!types) return true;
    return types.includes(n.type);
  });

  // Mark notification as read when tapped
  const handleTap = useCallback(
    async (notif: Notification) => {
      if (!notif.read) {
        await markAsRead(notif.id);
      }
      if (notif.link) {
        router.push(notif.link);
      }
    },
    [markAsRead, router]
  );

  // Swipe to dismiss handlers (mobile)
  function handleTouchStart(notifId: string, e: React.TouchEvent) {
    touchStartRef.current = { id: notifId, x: e.touches[0].clientX };
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (!touchStartRef.current) return;
    const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
    if (deltaX > 100) {
      // Swiped right - dismiss
      const id = touchStartRef.current.id;
      setDismissing((prev) => new Set(prev).add(id));
      setTimeout(() => {
        dismiss(id);
        setDismissing((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }, 300);
    }
    touchStartRef.current = null;
  }

  // Relative time formatting
  function timeAgo(date: string): string {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return t.notifNow;
    if (mins < 60) return `il y a ${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `il y a ${days}j`;
    const weeks = Math.floor(days / 7);
    return `il y a ${weeks}sem`;
  }

  // Group notifications by time period
  function groupByTime(notifs: Notification[]) {
    const now = Date.now();
    const groups: Record<string, Notification[]> = {};

    for (const n of notifs) {
      const diff = now - new Date(n.created_at).getTime();
      const hours = diff / (1000 * 60 * 60);
      let key: string;

      if (hours < 24) key = t.notifToday;
      else if (hours < 48) key = t.notifYesterday;
      else if (hours < 168) key = t.notifThisWeek;
      else key = t.notifOlder;

      if (!groups[key]) groups[key] = [];
      groups[key].push(n);
    }

    return groups;
  }

  const grouped = groupByTime(filtered);

  return (
    <div className="min-h-screen bg-[var(--c-deep)] pb-28">
      <style dangerouslySetInnerHTML={{ __html: PAGE_CSS }} />

      {/* Header */}
      <div
        className="sticky top-0 z-10 border-b px-4 pt-4 pb-3"
        style={{
          background: "var(--c-deep)",
          borderColor: "var(--c-border)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        <div className="max-w-2xl mx-auto">
          {/* Top row: back button + title + mark all */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="p-1.5 rounded-full hover:bg-[var(--c-card)] transition"
                aria-label="Retour"
              >
                <svg
                  className="w-5 h-5 text-[var(--c-text)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 19.5L8.25 12l7.5-7.5"
                  />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-bold text-[var(--c-text)]">
                  {t.notifTitle}
                </h1>
                {unreadCount > 0 && (
                  <p className="text-xs text-[var(--c-text-muted)]">
                    {unreadCount} {t.notifUnread}
                  </p>
                )}
              </div>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs font-medium text-[var(--c-accent)] hover:underline transition"
              >
                {t.notifMarkAll}
              </button>
            )}
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={
                  "flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 " +
                  (filter === f.key
                    ? "bg-[var(--c-accent)]/15 border border-[var(--c-accent)]/40 text-[var(--c-accent)]"
                    : "bg-[var(--c-card)] border border-[var(--c-border)] text-[var(--c-text-muted)] hover:border-[var(--c-accent)]/30")
                }
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Push permission banner */}
      <div className="max-w-2xl mx-auto pt-4">
        <NotificationPermission />
      </div>

      {/* Notifications list */}
      <div className="max-w-2xl mx-auto px-4 pt-2">
        {loading ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3 animate-bounce">🔔</div>
            <p className="text-[var(--c-text-muted)] text-sm">
              {t.notifLoading}
            </p>
          </div>
        ) : filtered.length === 0 ? (
          /* Empty state */
          <div className="text-center py-20">
            <div className="text-6xl mb-4">
              {filter === "match"
                ? "🐾"
                : filter === "message"
                ? "💬"
                : filter === "event"
                ? "📅"
                : "🔔"}
            </div>
            <h2 className="text-lg font-bold text-[var(--c-text)] mb-2">
              {t.notifEmpty}
            </h2>
            <p className="text-sm text-[var(--c-text-muted)] max-w-xs mx-auto">
              {t.notifEmptyDesc}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([period, notifs]) => (
              <div key={period}>
                <h2 className="text-[11px] font-semibold text-[var(--c-text-muted)] uppercase tracking-widest mb-2 px-1">
                  {period}
                </h2>
                <div className="space-y-2">
                  {notifs.map((notif, i) => (
                    <div
                      key={notif.id}
                      className={
                        "fade-up" + (dismissing.has(notif.id) ? " slide-out" : "")
                      }
                      style={{ animationDelay: `${i * 0.03}s` }}
                      onTouchStart={(e) => handleTouchStart(notif.id, e)}
                      onTouchEnd={handleTouchEnd}
                    >
                      <button
                        onClick={() => handleTap(notif)}
                        className="w-full text-left rounded-2xl border p-4 flex gap-3 items-start transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
                        style={{
                          background: !notif.read
                            ? "linear-gradient(135deg, rgba(249,115,22,0.06), rgba(167,139,250,0.04))"
                            : "var(--c-card)",
                          borderColor: !notif.read
                            ? "rgba(249,115,22,0.15)"
                            : "var(--c-border)",
                          boxShadow: !notif.read
                            ? "0 2px 12px rgba(249,115,22,0.06)"
                            : "0 1px 4px rgba(0,0,0,0.04)",
                        }}
                      >
                        {/* Icon */}
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                          style={{
                            background: !notif.read
                              ? "rgba(249,115,22,0.1)"
                              : "rgba(255,255,255,0.05)",
                          }}
                        >
                          {TYPE_ICONS[notif.type] || TYPE_ICONS.system}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={
                                "text-sm leading-tight " +
                                (!notif.read
                                  ? "font-semibold text-[var(--c-text)]"
                                  : "text-[var(--c-text-muted)]")
                              }
                            >
                              {notif.title}
                            </span>
                            {!notif.read && (
                              <span className="shrink-0 w-2 h-2 rounded-full bg-[var(--c-accent)]" />
                            )}
                          </div>
                          {notif.body && (
                            <p className="text-xs text-[var(--c-text-muted)] mt-1 line-clamp-2 leading-relaxed">
                              {notif.body}
                            </p>
                          )}
                          <span className="text-[10px] text-[var(--c-text-muted)] mt-1.5 block opacity-70">
                            {timeAgo(notif.created_at)}
                          </span>
                        </div>

                        {/* Chevron */}
                        {notif.link && (
                          <svg
                            className="w-4 h-4 text-[var(--c-text-muted)] shrink-0 mt-1 opacity-40"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M8.25 4.5l7.5 7.5-7.5 7.5"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Swipe hint on mobile */}
        {!loading && filtered.length > 0 && (
          <p className="md:hidden text-center text-[10px] text-[var(--c-text-muted)] mt-6 opacity-50">
            {t.notifSwipeHint}
          </p>
        )}
      </div>
    </div>
  );
}
