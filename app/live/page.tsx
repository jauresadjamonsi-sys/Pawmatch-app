"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import Link from "next/link";
import Image from "next/image";

type LiveStream = {
  id: string;
  user_id: string;
  title: string;
  species_filter: string | null;
  thumbnail_url: string | null;
  viewer_count: number;
  is_live: boolean;
  started_at: string;
  profiles: { id: string; full_name: string; avatar_url: string | null; canton: string | null } | null;
};

const SPECIES_FILTERS = [
  { key: "all", label: "Tous", icon: "🌍" },
  { key: "chien", label: "Chiens", icon: "🐕" },
  { key: "chat", label: "Chats", icon: "🐱" },
  { key: "autre", label: "Autres", icon: "🐾" },
];

export default function LivePage() {
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const { profile } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    fetchStreams();
    // Refresh every 15 seconds
    const interval = setInterval(fetchStreams, 15000);
    return () => clearInterval(interval);
  }, []);

  async function fetchStreams() {
    try {
      const res = await fetch("/api/live");
      const data = await res.json();
      setStreams(data.streams || []);
    } catch {
      console.error("[Live] fetch error");
    } finally {
      setLoading(false);
    }
  }

  const filteredStreams = filter === "all"
    ? streams
    : streams.filter(s => s.species_filter?.toLowerCase().includes(filter));

  const formatDuration = (startedAt: string) => {
    const ms = Date.now() - new Date(startedAt).getTime();
    const mins = Math.floor(ms / 60000);
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) return `${hrs}h${mins % 60}min`;
    return `${mins}min`;
  };

  return (
    <div className="min-h-screen pb-32" style={{ background: "var(--c-deep)" }}>
      {/* Header */}
      <div className="max-w-4xl mx-auto px-4 pt-6 pb-4">
        <div className="flex items-center justify-between mb-1">
          <div>
            <div className="flex items-center gap-3">
              <button onClick={() => window.history.length > 1 ? window.history.back() : (window.location.href = "/feed")} aria-label="Retour" className="inline-flex items-center justify-center w-9 h-9 rounded-full transition-all active:scale-90 flex-shrink-0" style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--c-text)" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
              </button>
            <h1 className="text-2xl font-extrabold gradient-text-warm flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
              </span>
              Lives
            </h1>
            <p className="text-xs text-[var(--c-text-muted)] mt-0.5">
              {streams.length} live{streams.length > 1 ? "s" : ""} en cours
            </p>
          </div>
          </div>
          {profile && (
            <Link
              href="/live/broadcast"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-pink-500 text-white text-sm font-bold shadow-lg shadow-red-500/25 hover:shadow-red-500/40 hover:scale-[1.02] transition-all flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              Go Live
            </Link>
          )}
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
          {SPECIES_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={
                "px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all " +
                (filter === f.key
                  ? "bg-red-500 text-white shadow-lg shadow-red-500/25"
                  : "bg-[var(--c-card)] text-[var(--c-text-muted)] border border-[var(--c-border)] hover:border-red-500/30")
              }
            >
              {f.icon} {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4">
        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-3 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
          </div>
        )}

        {/* Streams grid */}
        {!loading && filteredStreams.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStreams.map(stream => (
              <Link
                key={stream.id}
                href={`/live/broadcast?watch=${stream.id}`}
                className="rounded-2xl overflow-hidden bg-[var(--c-card)] border border-[var(--c-border)] hover:border-red-500/30 hover:shadow-xl hover:shadow-red-500/10 transition-all group"
              >
                {/* Thumbnail */}
                <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 relative">
                  {stream.thumbnail_url ? (
                    <Image src={stream.thumbnail_url} alt={stream.title} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-4xl mb-2">📡</p>
                        <p className="text-xs text-white/50">En direct</p>
                      </div>
                    </div>
                  )}
                  {/* Live badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    LIVE
                  </div>
                  {/* Viewer count */}
                  <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/60 backdrop-blur text-white text-[10px] px-2 py-1 rounded-full">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                    {stream.viewer_count}
                  </div>
                  {/* Duration */}
                  <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur text-white text-[10px] px-2 py-1 rounded-full">
                    {formatDuration(stream.started_at)}
                  </div>
                </div>
                {/* Info */}
                <div className="p-3">
                  <div className="flex items-center gap-2.5">
                    {stream.profiles?.avatar_url ? (
                      <Image src={stream.profiles.avatar_url} alt="" width={32} height={32} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                        {stream.profiles?.full_name?.[0] || "?"}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[var(--c-text)] truncate group-hover:text-red-400 transition-colors">
                        {stream.title}
                      </p>
                      <p className="text-xs text-[var(--c-text-muted)] truncate">
                        {stream.profiles?.full_name || "Anonyme"}
                        {stream.profiles?.canton ? ` · ${stream.profiles.canton}` : ""}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredStreams.length === 0 && (
          <div className="text-center py-20">
            <p className="text-6xl mb-4">📡</p>
            <p className="text-xl font-bold text-[var(--c-text)]">Aucun live en cours</p>
            <p className="text-sm text-[var(--c-text-muted)] mt-2">
              Soyez le premier a partager un moment avec votre animal !
            </p>
            {profile && (
              <Link
                href="/live/broadcast"
                className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-2xl bg-gradient-to-r from-red-500 to-pink-500 text-white font-bold text-sm shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-all"
              >
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                Lancer un live
              </Link>
            )}
            {!profile && (
              <Link href="/login" className="inline-block mt-6 text-sm text-green-400 hover:text-green-300">
                Connectez-vous pour lancer un live
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
