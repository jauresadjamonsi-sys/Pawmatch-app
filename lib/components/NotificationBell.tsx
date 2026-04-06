"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "@/lib/contexts/AppContext";
import { useNotifications } from "@/lib/hooks/useNotifications";

const BELL_CSS = `
@keyframes bellWiggle {
  0%   { transform: rotate(0deg); }
  15%  { transform: rotate(14deg); }
  30%  { transform: rotate(-12deg); }
  45%  { transform: rotate(10deg); }
  60%  { transform: rotate(-8deg); }
  75%  { transform: rotate(4deg); }
  100% { transform: rotate(0deg); }
}
.bell-wiggle {
  animation: bellWiggle 0.6s ease-in-out;
}
`;

export default function NotificationBell() {
  const { unreadCount } = useNotifications({ realtime: true, limit: 1 });
  const [wiggle, setWiggle] = useState(false);
  const prevCountRef = useRef(unreadCount);
  const router = useRouter();
  const { t } = useAppContext();

  // Trigger wiggle when unread count increases
  useEffect(() => {
    if (unreadCount > prevCountRef.current) {
      setWiggle(true);
      const timeout = setTimeout(() => setWiggle(false), 700);
      return () => clearTimeout(timeout);
    }
    prevCountRef.current = unreadCount;
  }, [unreadCount]);

  const displayCount = unreadCount > 9 ? "9+" : unreadCount > 0 ? String(unreadCount) : null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: BELL_CSS }} />
      <button
        onClick={() => router.push("/notifications")}
        className="relative p-2 rounded-full transition hover:bg-[var(--c-card)]"
        aria-label={t.notifTitle}
      >
        <svg
          className={
            "w-5 h-5 text-[var(--c-text-muted)] transition-colors" +
            (wiggle ? " bell-wiggle" : "")
          }
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
        {displayCount && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold text-white bg-red-500 rounded-full leading-none animate-pulse">
            {displayCount}
          </span>
        )}
      </button>
    </>
  );
}
