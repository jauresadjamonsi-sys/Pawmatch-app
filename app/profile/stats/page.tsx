"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAppContext } from "@/lib/contexts/AppContext";

interface Stats {
  animals: number;
  matchesTotal: number;
  matchesAccepted: number;
  matchesPending: number;
  messages: number;
  events: number;
  daysSinceSignup: number;
  profileCompletion: number;
  monthlyActivity: { label: string; matches: number; messages: number }[];
}

const EMPTY_STATS: Stats = {
  animals: 0,
  matchesTotal: 0,
  matchesAccepted: 0,
  matchesPending: 0,
  messages: 0,
  events: 0,
  daysSinceSignup: 0,
  profileCompletion: 0,
  monthlyActivity: [],
};

function StatCard({
  icon,
  value,
  label,
  sublabel,
  colorClass,
  delay,
}: {
  icon: string;
  value: number | string;
  label: string;
  sublabel?: string;
  colorClass: string;
  delay: number;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={`rounded-2xl border border-[var(--c-border)] p-4 transition-all duration-500 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
      style={{ backgroundColor: "var(--c-card)" }}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-3 ${colorClass}`}>
        {icon}
      </div>
      <p className="text-2xl font-black text-[var(--c-text)]">{value}</p>
      <p className="text-xs font-semibold text-[var(--c-text-muted)] uppercase tracking-wide">{label}</p>
      {sublabel && (
        <p className="text-[10px] text-[var(--c-text-muted)] mt-1">{sublabel}</p>
      )}
    </div>
  );
}

function ActivityBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => setWidth(max > 0 ? (value / max) * 100 : 0), 200);
    return () => clearTimeout(timer);
  }, [value, max]);

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-[var(--c-text-muted)] w-8 text-right font-medium">{label}</span>
      <div className="flex-1 h-6 rounded-lg overflow-hidden" style={{ backgroundColor: "var(--c-border)" }}>
        <div
          className="h-full rounded-lg transition-all duration-700 ease-out flex items-center justify-end pr-2"
          style={{ width: `${Math.max(width, value > 0 ? 8 : 0)}%`, backgroundColor: color }}
        >
          {value > 0 && <span className="text-[10px] font-bold text-white">{value}</span>}
        </div>
      </div>
    </div>
  );
}

export default function StatsPage() {
  const { t } = useAppContext();
  const router = useRouter();
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      try {
        // Fetch profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        // Fetch animals count
        const { count: animalCount } = await supabase
          .from("animals")
          .select("*", { count: "exact", head: true })
          .eq("created_by", user.id);

        // Fetch matches
        const { count: matchesTotal } = await supabase
          .from("matches")
          .select("*", { count: "exact", head: true })
          .or(`sender_user_id.eq.${user.id},receiver_user_id.eq.${user.id}`);

        const { count: matchesAccepted } = await supabase
          .from("matches")
          .select("*", { count: "exact", head: true })
          .or(`sender_user_id.eq.${user.id},receiver_user_id.eq.${user.id}`)
          .eq("status", "accepted");

        const { count: matchesPending } = await supabase
          .from("matches")
          .select("*", { count: "exact", head: true })
          .or(`sender_user_id.eq.${user.id},receiver_user_id.eq.${user.id}`)
          .eq("status", "pending");

        // Fetch messages count
        const { count: messageCount } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("sender_id", user.id);

        // Fetch events joined count
        const { count: eventCount } = await supabase
          .from("event_participants")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);

        // Account age
        const daysSinceSignup = profile?.created_at
          ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / 86400000)
          : 0;

        // Profile completion
        const fields = ["full_name", "phone", "city", "avatar_url"];
        const filled = fields.filter((f) => profile?.[f]).length;
        const profileCompletion = Math.round((filled / fields.length) * 100);

        // Monthly activity (last 6 months)
        const months: { label: string; start: Date; end: Date }[] = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
          months.push({
            label: d.toLocaleDateString("default", { month: "short" }),
            start: d,
            end,
          });
        }

        const { data: recentMatches } = await supabase
          .from("matches")
          .select("created_at")
          .or(`sender_user_id.eq.${user.id},receiver_user_id.eq.${user.id}`)
          .gte("created_at", months[0].start.toISOString());

        const { data: recentMessages } = await supabase
          .from("messages")
          .select("created_at")
          .eq("sender_id", user.id)
          .gte("created_at", months[0].start.toISOString());

        const monthlyActivity = months.map((m) => {
          const mMatches = (recentMatches || []).filter((r) => {
            const d = new Date(r.created_at);
            return d >= m.start && d <= m.end;
          }).length;
          const mMessages = (recentMessages || []).filter((r) => {
            const d = new Date(r.created_at);
            return d >= m.start && d <= m.end;
          }).length;
          return { label: m.label, matches: mMatches, messages: mMessages };
        });

        setStats({
          animals: animalCount || 0,
          matchesTotal: matchesTotal || 0,
          matchesAccepted: matchesAccepted || 0,
          matchesPending: matchesPending || 0,
          messages: messageCount || 0,
          events: eventCount || 0,
          daysSinceSignup,
          profileCompletion,
          monthlyActivity,
        });
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--c-bg,var(--c-deep))] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--c-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const maxActivity = Math.max(
    ...stats.monthlyActivity.map((m) => m.matches + m.messages),
    1
  );

  return (
    <div className="min-h-screen bg-[var(--c-bg,var(--c-deep))] px-4 py-6 pb-28">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/profile"
            className="w-10 h-10 rounded-xl bg-[var(--c-card)] border border-[var(--c-border)] flex items-center justify-center text-[var(--c-text)] hover:opacity-80 transition"
          >
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-xl font-bold text-[var(--c-text)]">{t.statsTitle || "Mes statistiques"}</h1>
        </div>

        {/* Stat cards grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
          <StatCard
            icon="🐾"
            value={stats.animals}
            label={t.statsAnimals || "Animaux"}
            colorClass="bg-teal-500/20 text-teal-400"
            delay={0}
          />
          <StatCard
            icon="💕"
            value={stats.matchesTotal}
            label={t.statsMatches || "Matches"}
            sublabel={`${stats.matchesAccepted} ${t.statsAccepted || "acceptés"} · ${stats.matchesPending} ${t.statsPending || "en attente"}`}
            colorClass="bg-orange-500/20 text-orange-400"
            delay={80}
          />
          <StatCard
            icon="💬"
            value={stats.messages}
            label={t.statsMessages || "Messages"}
            colorClass="bg-green-500/20 text-green-400"
            delay={160}
          />
          <StatCard
            icon="🎉"
            value={stats.events}
            label={t.statsEvents || "Événements"}
            colorClass="bg-purple-500/20 text-purple-400"
            delay={240}
          />
          <StatCard
            icon="📅"
            value={stats.daysSinceSignup}
            label={t.statsMember || "Membre depuis"}
            sublabel={`${stats.daysSinceSignup} ${t.statsDays || "jours"}`}
            colorClass="bg-blue-500/20 text-blue-400"
            delay={320}
          />
          <StatCard
            icon="✅"
            value={`${stats.profileCompletion}%`}
            label={t.statsProfile || "Profil complété"}
            colorClass="bg-emerald-500/20 text-emerald-400"
            delay={400}
          />
        </div>

        {/* Activity summary */}
        <div
          className="rounded-2xl border border-[var(--c-border)] p-5"
          style={{ backgroundColor: "var(--c-card)" }}
        >
          <h2 className="text-base font-bold text-[var(--c-text)] mb-4">
            {t.statsActivity || "Activité récente"}
          </h2>
          <div className="space-y-2.5">
            {stats.monthlyActivity.map((m) => (
              <div key={m.label} className="space-y-1">
                <ActivityBar
                  label={m.label}
                  value={m.matches + m.messages}
                  max={maxActivity}
                  color="var(--c-accent)"
                />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-[var(--c-border)]">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "var(--c-accent)" }} />
              <span className="text-[10px] text-[var(--c-text-muted)] font-medium">
                {t.statsMatches || "Matches"} + {t.statsMessages || "Messages"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
