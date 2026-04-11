"use client";
import { useEffect, useState } from "react";

interface SmartNotif {
  type: string;
  title: string;
  body: string;
  emoji: string;
  priority: number;
}

export default function SmartNotifCard() {
  const [notifs, setNotifs] = useState<SmartNotif[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetch("/api/notifications/smart")
      .then(r => r.json())
      .then(d => setNotifs(d.notifications || []))
      .catch(() => {});
  }, []);

  if (!mounted || notifs.length === 0) return null;

  const visible = notifs.filter(n => !dismissed.has(n.type));
  if (visible.length === 0) return null;

  const top = visible[0];

  const typeColors: Record<string, string> = {
    match: "rgba(251,191,36,0.15)",
    message: "rgba(99,102,241,0.15)",
    discovery: "rgba(14,165,233,0.15)",
    profile: "rgba(251,191,36,0.1)",
    content: "rgba(252,211,77,0.15)",
  };

  return (
    <div className="rounded-2xl p-4 relative overflow-hidden transition-all"
      style={{
        background: typeColors[top.type] || "var(--c-card)",
        border: "1px solid var(--c-border)"
      }}>
      <button onClick={() => setDismissed(prev => new Set([...prev, top.type]))}
        className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center text-xs"
        style={{ background: "rgba(255,255,255,0.1)", color: "var(--c-text-muted)" }}>
        {"\u2715"}
      </button>
      <div className="flex items-start gap-3">
        <span className="text-2xl">{top.emoji}</span>
        <div>
          <h4 className="font-bold text-sm" style={{ color: "var(--c-text)" }}>{top.title}</h4>
          <p className="text-xs mt-0.5" style={{ color: "var(--c-text-muted)" }}>{top.body}</p>
        </div>
      </div>
    </div>
  );
}
