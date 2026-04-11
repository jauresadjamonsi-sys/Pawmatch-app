"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { EMOJI_MAP } from "@/lib/constants";
import { CANTONS } from "@/lib/cantons";

type Tab = "trending" | "nearby" | "new" | "species" | "events";
const SPECIES_FILTERS = ["chien", "chat", "lapin", "oiseau", "rongeur", "autre"];

const SPECIES_EMOJI: Record<string, string> = {
  chien: "🐕", chat: "🐱", lapin: "🐰",
  oiseau: "🐦", rongeur: "🐹", autre: "🐾",
};

const CANTON_COLORS = [
  "from-amber-400/20 to-amber-500/10",
  "from-blue-500/20 to-blue-600/10",
  "from-amber-400/20 to-amber-500/10",
  "from-purple-500/20 to-purple-600/10",
  "from-pink-500/20 to-pink-600/10",
];

interface ExploreAnimal {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  photo_url: string | null;
  canton: string | null;
  city: string | null;
  created_by: string;
  created_at: string;
  profiles?: { id: string; full_name: string | null; avatar_url: string | null } | null;
}

type EventItem = {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  location: string;
  canton: string;
  max_participants: number;
  species: string[];
  created_by: string;
  created_at: string;
  organizer?: { full_name: string | null; email: string };
  participant_count?: number;
  is_joined?: boolean;
};

export default function ExplorePage() {
  const [tab, setTab] = useState<Tab>("trending");
  const [animals, setAnimals] = useState<ExploreAnimal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [speciesFilter, setSpeciesFilter] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [topAnimals, setTopAnimals] = useState<{ id: string; name: string; species: string; photo_url: string | null }[]>([]);
  const [trending, setTrending] = useState<{hashtag: string; count: number}[]>([]);

  // Events state
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [filterCanton, setFilterCanton] = useState("");
  const [joining, setJoining] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", event_date: "", event_time: "10:00",
    location: "", canton: "", max_participants: "20", species: [] as string[],
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const supabase = createClient();

  /* Fetch top 3 for leaderboard widget */
  useEffect(() => {
    async function fetchTop() {
      const { data } = await supabase
        .from("animals")
        .select("id, name, species, photo_url")
        .order("created_at", { ascending: false })
        .limit(3);
      if (data) setTopAnimals(data);
    }
    fetchTop().catch(() => {});
  }, []);

  /* Fetch trending hashtags */
  useEffect(() => {
    fetch("/api/trending")
      .then(res => res.json())
      .then(data => { if (data.trending) setTrending(data.trending); })
      .catch(() => {});
  }, []);

  /* Fetch animals */
  useEffect(() => {
    if (tab === "events") return;
    async function load() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);

      let query = supabase
        .from("animals")
        .select("id, name, species, breed, photo_url, canton, city, created_by, created_at, profiles:created_by(id, full_name, avatar_url)")
        .eq("status", "disponible");

      if (speciesFilter) {
        query = query.eq("species", speciesFilter);
      }
      if (search.trim()) {
        query = query.or(`name.ilike.%${search.trim()}%,breed.ilike.%${search.trim()}%,canton.ilike.%${search.trim()}%`);
      }

      switch (tab) {
        case "trending":
          query = query.order("created_at", { ascending: false }).limit(30);
          break;
        case "new":
          query = query.order("created_at", { ascending: false }).limit(30);
          break;
        case "nearby":
          query = query.order("canton", { ascending: true }).limit(30);
          break;
        case "species":
          query = query.order("species", { ascending: true }).order("created_at", { ascending: false }).limit(30);
          break;
      }

      const { data, error } = await query;
      if (!error) setAnimals((data || []) as ExploreAnimal[]);
      setLoading(false);
    }
    load().catch(() => setLoading(false));
  }, [tab, speciesFilter, search]);

  /* Fetch events */
  useEffect(() => {
    if (tab !== "events") return;
    fetchEvents();
  }, [tab, filterCanton]);

  async function fetchEvents() {
    setEventsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);

      let query = supabase
        .from("events")
        .select("*, organizer:created_by(*)")
        .gte("event_date", new Date().toISOString())
        .order("event_date", { ascending: true });

      if (filterCanton) query = query.eq("canton", filterCanton);

      const { data: eventsData, error } = await query;
      if (error || !eventsData) { setEventsLoading(false); return; }

      const eventIds = eventsData.map(e => e.id);
      let countMap: Record<string, number> = {};
      const joinedSet = new Set<string>();

      if (eventIds.length > 0) {
        const { data: allParticipants } = await supabase
          .from("event_participants")
          .select("event_id")
          .in("event_id", eventIds);

        for (const p of allParticipants || []) {
          countMap[p.event_id] = (countMap[p.event_id] || 0) + 1;
        }

        if (user) {
          const { data: userParts } = await supabase
            .from("event_participants")
            .select("event_id")
            .eq("user_id", user.id)
            .in("event_id", eventIds);
          for (const p of userParts || []) joinedSet.add(p.event_id);
        }
      }

      setEvents(eventsData.map(e => ({
        ...e,
        participant_count: countMap[e.id] || 0,
        is_joined: joinedSet.has(e.id),
      })));
    } catch {
      // silent
    }
    setEventsLoading(false);
  }

  async function handleJoin(eventId: string, isJoined: boolean) {
    if (!currentUserId) { window.location.href = "/login"; return; }
    setJoining(eventId);
    if (isJoined) {
      await supabase.from("event_participants").delete().eq("event_id", eventId).eq("user_id", currentUserId);
    } else {
      await supabase.from("event_participants").insert({ event_id: eventId, user_id: currentUserId });
    }
    await fetchEvents();
    setJoining(null);
  }

  function toggleSpeciesForm(s: string) {
    setForm(f => ({
      ...f,
      species: f.species.includes(s) ? f.species.filter(x => x !== s) : [...f.species, s],
    }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUserId) return;
    setCreating(true); setCreateError(null);
    const eventDate = new Date(`${form.event_date}T${form.event_time}`);
    const { error } = await supabase.from("events").insert({
      title: form.title,
      description: form.description || null,
      event_date: eventDate.toISOString(),
      location: form.location,
      canton: form.canton,
      max_participants: parseInt(form.max_participants),
      species: form.species,
      created_by: currentUserId,
    });
    setCreating(false);
    if (error) { setCreateError(error.message); return; }
    setShowCreate(false);
    setForm({ title: "", description: "", event_date: "", event_time: "10:00", location: "", canton: "", max_participants: "20", species: [] });
    fetchEvents();
  }

  function formatEventDate(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const dayLabel = diff === 0 ? "Aujourd'hui" : diff === 1 ? "Demain" : `Dans ${diff} jours`;
    return {
      day: date.toLocaleDateString("fr-CH", { weekday: "long", day: "numeric", month: "long" }),
      time: date.toLocaleTimeString("fr-CH", { hour: "2-digit", minute: "2-digit" }),
      soon: dayLabel,
      urgent: diff <= 3,
    };
  }

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "trending", label: "Tendance", icon: "🔥" },
    { key: "new", label: "Nouveaux", icon: "✨" },
    { key: "nearby", label: "Proches", icon: "📍" },
    { key: "species", label: "Esp\u00e8ce", icon: "🐾" },
    { key: "events", label: "\u00c9v\u00e9nements", icon: "📅" },
  ];

  return (
    <main id="main-content" className="min-h-screen pb-32" style={{ background: "var(--c-deep)" }}>
     <div className="max-w-4xl mx-auto px-4 py-5">
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => window.history.length > 1 ? window.history.back() : (window.location.href = "/feed")} aria-label="Retour" className="inline-flex items-center justify-center w-9 h-9 rounded-full transition-all active:scale-90 flex-shrink-0" style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--c-text)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <h1 className="text-2xl font-black" style={{ color: "var(--c-text)" }}>Explorer</h1>
        </div>
        <p className="text-sm" style={{ color: "var(--c-text-muted)" }}>D&eacute;couvre animaux, profils et &eacute;v&eacute;nements</p>
      </div>

      {/* Top PawlyApp leaderboard mini-widget */}
      {topAnimals.length > 0 && (
        <div className="rounded-2xl p-4 mb-4" style={{ background: "var(--c-glass, rgba(255,255,255,0.05))", border: "1px solid var(--c-border)" }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold flex items-center gap-1.5" style={{ color: "var(--c-text)" }}>
              🏆 <span className="gradient-text-warm">Top PawlyApp</span>
            </span>
            <Link href="/leaderboard" className="text-[11px] font-semibold" style={{ color: "var(--c-text-muted)" }}>
              Voir le classement &rarr;
            </Link>
          </div>
          <div className="flex items-center justify-center gap-5">
            {topAnimals.map((a) => (
              <Link key={a.id} href={`/animals/${a.id}`} className="flex flex-col items-center gap-1.5">
                <div className="relative w-14 h-14 rounded-full overflow-hidden flex-shrink-0" style={{ border: "2px solid var(--c-border)" }}>
                  {a.photo_url ? (
                    <Image src={a.photo_url} alt={a.name} fill className="object-cover" sizes="56px" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xl" style={{ background: "var(--c-glass, rgba(255,255,255,0.08))" }}>
                      {EMOJI_MAP[a.species] || "🐾"}
                    </div>
                  )}
                </div>
                <span className="text-[11px] font-semibold truncate max-w-[60px] text-center" style={{ color: "var(--c-text)" }}>
                  {a.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Trending Hashtags */}
      {trending.length > 0 && (
        <div className="mb-4 overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-sm font-bold" style={{ color: "var(--c-text)" }}>
              <span className="gradient-text-warm"># Tendances</span>
            </span>
          </div>
          <div className="flex gap-2 pb-1">
            {trending.map((t) => (
              <button
                key={t.hashtag}
                onClick={() => { setSearch(`#${t.hashtag}`); setTab("trending"); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0"
                style={{
                  background: "var(--c-glass, rgba(255,255,255,0.05))",
                  border: "1px solid var(--c-border)",
                }}
              >
                <span style={{ background: "linear-gradient(135deg, #FBBF24, #FACC15)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  #{t.hashtag}
                </span>
                <span className="text-[10px] opacity-60" style={{ color: "var(--c-text-muted)" }}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search (hidden on events tab) */}
      {tab !== "events" && (
        <div className="relative mb-4">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--c-text-muted)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Rechercher par nom, race, canton..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-2xl text-sm outline-none transition-all duration-300 focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400/50"
            style={{ background: "var(--c-glass, rgba(255,255,255,0.05))", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-300 ease-out"
            style={{
              background: tab === t.key ? "linear-gradient(135deg, #FBBF24, #FACC15)" : "var(--c-glass, rgba(255,255,255,0.05))",
              color: tab === t.key ? "#fff" : "var(--c-text-muted)",
              border: tab === t.key ? "none" : "1px solid var(--c-border)",
              transform: tab === t.key ? "scale(1.05)" : "scale(1)",
              boxShadow: tab === t.key ? "0 4px 12px rgba(34, 197, 94,0.25)" : "none",
            }}
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Species filter chips */}
      {tab === "species" && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide stagger-children">
          {SPECIES_FILTERS.map((sp) => (
            <button
              key={sp}
              onClick={() => setSpeciesFilter(speciesFilter === sp ? null : sp)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-300 ease-out"
              style={{
                background: speciesFilter === sp ? "rgba(34, 197, 94,0.15)" : "var(--c-glass, rgba(255,255,255,0.05))",
                color: speciesFilter === sp ? "#FBBF24" : "var(--c-text-muted)",
                border: `1px solid ${speciesFilter === sp ? "rgba(34, 197, 94,0.3)" : "var(--c-border)"}`,
                transform: speciesFilter === sp ? "scale(1.08)" : "scale(1)",
              }}
            >
              <span>{EMOJI_MAP[sp] || "🐾"}</span>
              {sp.charAt(0).toUpperCase() + sp.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* ═══ EVENTS TAB CONTENT ═══ */}
      {tab === "events" ? (
        <div>
          {/* Canton filter + Create button */}
          <div className="flex gap-2 mb-4">
            <select
              value={filterCanton}
              onChange={(e) => setFilterCanton(e.target.value)}
              className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: "var(--c-glass, rgba(255,255,255,0.05))", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
            >
              <option value="">Tous les cantons</option>
              {CANTONS.map(c => (
                <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
              ))}
            </select>
            {currentUserId ? (
              <button
                onClick={() => setShowCreate(true)}
                className="px-4 py-2.5 rounded-xl text-sm font-bold text-white flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #FBBF24, #4ADE80)" }}
              >
                + Cr&eacute;er
              </button>
            ) : (
              <button
                onClick={async () => {
                  const s = createClient();
                  await s.auth.signInWithOAuth({
                    provider: "google",
                    options: { redirectTo: window.location.origin + "/auth/callback" },
                  });
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold flex-shrink-0"
                style={{ background: "var(--c-card)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Connexion
              </button>
            )}
          </div>

          {/* Events loading */}
          {eventsLoading ? (
            <div className="space-y-3 stagger-children">
              {[0, 1, 2].map(i => (
                <div key={i} className="glass-living blob-card animate-shimmer" style={{ height: 130 }} />
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex flex-col items-center justify-center w-16 h-16 rounded-2xl border-2 mb-4" style={{ borderColor: "rgba(34, 197, 94,0.3)", background: "var(--c-card)" }}>
                <span className="text-[10px] font-bold uppercase leading-none mt-1" style={{ color: "#FBBF24" }}>
                  {new Date().toLocaleDateString("fr-CH", { month: "short" })}
                </span>
                <span className="text-2xl font-extrabold leading-none" style={{ color: "var(--c-text)" }}>
                  {new Date().getDate()}
                </span>
              </div>
              <h2 className="text-lg font-bold mb-2" style={{ color: "var(--c-text)" }}>Aucun &eacute;v&eacute;nement &agrave; venir</h2>
              <p className="text-sm mb-4" style={{ color: "var(--c-text-muted)" }}>
                {filterCanton ? "Aucun \u00e9v\u00e9nement dans ce canton." : "Sois le premier \u00e0 organiser une sortie !"}
              </p>
              {currentUserId ? (
                <button
                  onClick={() => setShowCreate(true)}
                  className="px-6 py-3 text-white font-bold rounded-xl text-sm"
                  style={{ background: "linear-gradient(135deg, #FBBF24, #4ADE80)" }}
                >
                  Cr&eacute;er un &eacute;v&eacute;nement
                </button>
              ) : (
                <button
                  onClick={async () => {
                    const s = createClient();
                    await s.auth.signInWithOAuth({
                      provider: "google",
                      options: { redirectTo: window.location.origin + "/auth/callback" },
                    });
                  }}
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold mx-auto"
                  style={{ background: "var(--c-card)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  Se connecter pour participer
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event, i) => {
                const date = formatEventDate(event.event_date);
                const isFull = (event.participant_count || 0) >= (event.max_participants || 0);
                const spotsLeft = (event.max_participants || 0) - (event.participant_count || 0);
                const cantonName = CANTONS.find(c => c.code === event.canton)?.name || event.canton;
                const colorClass = CANTON_COLORS[event.canton.charCodeAt(0) % CANTON_COLORS.length];

                return (
                  <div key={event.id} className={`glass bg-gradient-to-br ${colorClass} rounded-2xl p-4 transition-all card-hover`}>
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {date.urgent && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "rgba(34, 197, 94,0.2)", color: "#4ADE80", border: "1px solid rgba(34, 197, 94,0.3)" }}>
                              {date.soon}
                            </span>
                          )}
                          {event.species.length > 0 && (
                            <span className="text-sm">{event.species.slice(0, 3).map(s => SPECIES_EMOJI[s] || "🐾").join("")}</span>
                          )}
                        </div>
                        <h3 className="font-bold text-sm" style={{ color: "var(--c-text)" }}>{event.title}</h3>
                      </div>
                      <button
                        onClick={() => handleJoin(event.id, event.is_joined || false)}
                        disabled={joining === event.id || (isFull && !event.is_joined)}
                        className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                        style={{
                          background: event.is_joined ? "rgba(251,191,36,0.15)" : isFull ? "var(--c-glass)" : "linear-gradient(135deg, #FBBF24, #4ADE80)",
                          color: event.is_joined ? "#FBBF24" : isFull ? "var(--c-text-muted)" : "#fff",
                          border: event.is_joined ? "1px solid rgba(251,191,36,0.3)" : "none",
                          cursor: isFull && !event.is_joined ? "not-allowed" : "pointer",
                          opacity: isFull && !event.is_joined ? 0.5 : 1,
                        }}
                      >
                        {joining === event.id ? "..." : event.is_joined ? "Inscrit" : isFull ? "Complet" : "Rejoindre"}
                      </button>
                    </div>

                    {/* Info badges */}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      <span className="text-[11px]" style={{ color: "var(--c-text-muted)" }}>{"\uD83D\uDCC5"} {date.day} &agrave; {date.time}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px]" style={{ background: "var(--c-glass)", color: "var(--c-text-muted)" }}>📍 {event.location}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px]" style={{ background: "var(--c-glass)", color: "var(--c-text-muted)" }}>🗺️ {cantonName}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] ${isFull ? "text-red-400" : "text-[var(--c-text-muted)]"}`} style={{ background: "var(--c-glass)" }}>
                        👥 {event.participant_count}/{event.max_participants}
                        {spotsLeft <= 5 && !isFull && ` (${spotsLeft} places)`}
                      </span>
                    </div>

                    {event.description && (
                      <p className="text-[11px] leading-relaxed line-clamp-2" style={{ color: "var(--c-text-muted)" }}>{event.description}</p>
                    )}

                    {/* Capacity bar */}
                    <div className="w-full h-1 rounded-full overflow-hidden mt-2" style={{ background: "var(--c-glass)" }}>
                      <div className={`h-full rounded-full transition-all ${isFull ? "bg-red-500" : spotsLeft <= 3 ? "bg-amber-400" : "bg-amber-400"}`}
                        style={{ width: `${((event.participant_count || 0) / (event.max_participants || 1)) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ═══ ANIMALS GRID ═══ */
        <>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 stagger-children">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl animate-shimmer overflow-hidden" style={{ aspectRatio: "3/4" }}>
                  <div className="w-full h-full" style={{ background: "var(--c-glass)" }} />
                </div>
              ))}
            </div>
          ) : animals.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">🔍</div>
              <p className="text-sm" style={{ color: "var(--c-text-muted)" }}>
                {search ? "Aucun r\u00e9sultat pour cette recherche" : "Aucun animal trouv\u00e9"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 stagger-children">
              {animals.map((animal) => (
                <Link key={animal.id} href={`/animals/${animal.id}`} className="group card-hover">
                  <div className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: "3/4" }}>
                    {animal.photo_url ? (
                      <Image
                        src={animal.photo_url}
                        alt={animal.name}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 768px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl" style={{ background: "var(--c-glass)" }}>
                        {EMOJI_MAP[animal.species] || "🐾"}
                      </div>
                    )}
                    <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%)" }} />
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-white text-sm font-bold truncate">{animal.name}</p>
                      <p className="text-white/70 text-[10px] truncate">
                        {animal.breed || animal.species}{animal.canton ? ` · ${animal.canton}` : ""}
                      </p>
                    </div>
                    <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-sm">
                      {EMOJI_MAP[animal.species] || "🐾"}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* ═══ CANTON DIRECTORY (Proches tab) ═══ */}
          {tab === "nearby" && (
            <div className="mt-6">
              <h2 className="text-sm font-bold mb-3" style={{ color: "var(--c-text)" }}>
                D&eacute;couvre par canton
              </h2>
              <div className="flex flex-wrap gap-2 stagger-children">
                {CANTONS.map((canton, i) => (
                  <Link
                    key={canton.code}
                    href={`/canton/${canton.code}`}
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:scale-105"
                    style={{
                      background: `linear-gradient(135deg, ${
                        ["rgba(251,191,36,0.1)", "rgba(167,139,250,0.1)", "rgba(59,130,246,0.1)", "rgba(251,191,36,0.1)", "rgba(236,72,153,0.1)"][i % 5]
                      }, ${
                        ["rgba(251,191,36,0.05)", "rgba(167,139,250,0.05)", "rgba(59,130,246,0.05)", "rgba(251,191,36,0.05)", "rgba(236,72,153,0.05)"][i % 5]
                      })`,
                      border: `1px solid ${
                        ["rgba(251,191,36,0.2)", "rgba(167,139,250,0.2)", "rgba(59,130,246,0.2)", "rgba(251,191,36,0.2)", "rgba(236,72,153,0.2)"][i % 5]
                      }`,
                      color: "var(--c-text-muted)",
                    }}
                  >
                    {canton.code} - {canton.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══ CREATE EVENT MODAL ═══ */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" style={{ background: "var(--c-card)", border: "1px solid var(--c-border)" }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold" style={{ color: "var(--c-text)" }}>Cr&eacute;er un &eacute;v&eacute;nement</h2>
              <button onClick={() => setShowCreate(false)} style={{ color: "var(--c-text-muted)" }}>✕</button>
            </div>

            {createError && <div className="mb-4 p-3 rounded-xl text-sm" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" }}>{createError}</div>}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--c-text-muted)" }}>Titre *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required
                  placeholder="Balade dominicale au parc..."
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: "var(--c-deep)", border: "1px solid var(--c-border)", color: "var(--c-text)" }} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--c-text-muted)" }}>Date *</label>
                  <input type="date" value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} required
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: "var(--c-deep)", border: "1px solid var(--c-border)", color: "var(--c-text)" }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--c-text-muted)" }}>Heure</label>
                  <input type="time" value={form.event_time} onChange={e => setForm(f => ({ ...f, event_time: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: "var(--c-deep)", border: "1px solid var(--c-border)", color: "var(--c-text)" }} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--c-text-muted)" }}>Canton *</label>
                <select value={form.canton} onChange={e => setForm(f => ({ ...f, canton: e.target.value }))} required
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: "var(--c-deep)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}>
                  <option value="">Choisir un canton</option>
                  {CANTONS.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--c-text-muted)" }}>Lieu *</label>
                <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} required
                  placeholder="Parc de la Grange, Geneve"
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: "var(--c-deep)", border: "1px solid var(--c-border)", color: "var(--c-text)" }} />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--c-text-muted)" }}>Animaux accept&eacute;s</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(SPECIES_EMOJI).map(([s, emoji]) => (
                    <button key={s} type="button" onClick={() => toggleSpeciesForm(s)}
                      className="px-3 py-1.5 rounded-full text-xs transition-all"
                      style={{
                        background: form.species.includes(s) ? "rgba(34, 197, 94,0.15)" : "var(--c-glass)",
                        color: form.species.includes(s) ? "#FBBF24" : "var(--c-text-muted)",
                        border: `1px solid ${form.species.includes(s) ? "rgba(34, 197, 94,0.3)" : "var(--c-border)"}`,
                      }}>
                      {emoji} {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--c-text-muted)" }}>Max participants</label>
                <input type="number" value={form.max_participants} onChange={e => setForm(f => ({ ...f, max_participants: e.target.value }))}
                  min="2" max="200"
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: "var(--c-deep)", border: "1px solid var(--c-border)", color: "var(--c-text)" }} />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--c-text-muted)" }}>Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="D&eacute;cris l'&eacute;v&eacute;nement, le point de rendez-vous..."
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none"
                  style={{ background: "var(--c-deep)", border: "1px solid var(--c-border)", color: "var(--c-text)" }} />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 rounded-2xl text-sm"
                  style={{ background: "var(--c-glass)", border: "1px solid var(--c-border)", color: "var(--c-text-muted)" }}>
                  Annuler
                </button>
                <button type="submit" disabled={creating}
                  className="flex-1 py-2.5 rounded-2xl text-sm font-bold text-white disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #FBBF24, #4ADE80)" }}>
                  {creating ? "..." : "Publier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
     </div>
    </main>
  );
}
