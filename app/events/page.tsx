"use client";
// Build cache buster: v2 — events discover + all cantons wrap
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { useAppContext } from "@/lib/contexts/AppContext";
import { CANTONS } from "@/lib/cantons";
import Link from "next/link";

type Event = {
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

type DiscoveredEvent = {
  id: string;
  title: string;
  snippet: string;
  url: string;
  source: string;
  canton: string;
  image?: string;
};

type CuratedSource = {
  name: string;
  url: string;
  description: string;
};

const SPECIES_EMOJI: Record<string, string> = {
  chien: "🐕", chat: "🐱", lapin: "🐰",
  oiseau: "🐦", rongeur: "🐹", autre: "🐾",
};

const CANTON_COLORS = [
  "from-orange-500/20 to-orange-600/10",
  "from-blue-500/20 to-blue-600/10",
  "from-green-500/20 to-green-600/10",
  "from-purple-500/20 to-purple-600/10",
  "from-pink-500/20 to-pink-600/10",
];

// Approximate canton center coordinates for geolocation matching
const CANTON_COORDS: Record<string, { lat: number; lng: number }> = {
  AG: { lat: 47.39, lng: 8.04 }, AI: { lat: 47.33, lng: 9.41 },
  AR: { lat: 47.38, lng: 9.28 }, BE: { lat: 46.95, lng: 7.45 },
  BL: { lat: 47.48, lng: 7.73 }, BS: { lat: 47.56, lng: 7.59 },
  FR: { lat: 46.80, lng: 7.15 }, GE: { lat: 46.20, lng: 6.14 },
  GL: { lat: 47.04, lng: 9.07 }, GR: { lat: 46.85, lng: 9.53 },
  JU: { lat: 47.35, lng: 7.16 }, LU: { lat: 47.05, lng: 8.31 },
  NE: { lat: 46.99, lng: 6.93 }, NW: { lat: 46.96, lng: 8.37 },
  OW: { lat: 46.90, lng: 8.25 }, SG: { lat: 47.42, lng: 9.37 },
  SH: { lat: 47.70, lng: 8.64 }, SO: { lat: 47.21, lng: 7.54 },
  SZ: { lat: 47.02, lng: 8.65 }, TG: { lat: 47.57, lng: 9.10 },
  TI: { lat: 46.19, lng: 8.95 }, UR: { lat: 46.88, lng: 8.64 },
  VD: { lat: 46.52, lng: 6.63 }, VS: { lat: 46.23, lng: 7.36 },
  ZG: { lat: 47.17, lng: 8.52 }, ZH: { lat: 47.38, lng: 8.54 },
};

function findNearestCanton(lat: number, lng: number): string {
  let nearest = "";
  let minDist = Infinity;
  for (const [code, coords] of Object.entries(CANTON_COORDS)) {
    const d = Math.sqrt((lat - coords.lat) ** 2 + (lng - coords.lng) ** 2);
    if (d < minDist) { minDist = d; nearest = code; }
  }
  return nearest;
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCanton, setFilterCanton] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [joining, setJoining] = useState<string | null>(null);
  const { profile } = useAuth();
  const { t, lang } = useAppContext();
  const supabase = createClient();

  // Form state
  const [form, setForm] = useState({
    title: "", description: "", event_date: "", event_time: "10:00",
    location: "", canton: "", max_participants: "20", species: [] as string[],
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [detectedCanton, setDetectedCanton] = useState<string | null>(null);
  const [geoStatus, setGeoStatus] = useState<"idle" | "loading" | "done" | "denied">("idle");
  const [discoveredEvents, setDiscoveredEvents] = useState<DiscoveredEvent[]>([]);
  const [curatedSources, setCuratedSources] = useState<CuratedSource[]>([]);
  const [googleSearchUrl, setGoogleSearchUrl] = useState<string>("");
  const [discoverLoading, setDiscoverLoading] = useState(false);

  // Geolocation: auto-detect canton on mount
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    setGeoStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const canton = findNearestCanton(pos.coords.latitude, pos.coords.longitude);
        setDetectedCanton(canton);
        setFilterCanton(canton);
        setGeoStatus("done");
      },
      () => { setGeoStatus("denied"); },
      { timeout: 8000, maximumAge: 300000 }
    );
  }, []);

  useEffect(() => { fetchEvents(); fetchDiscover(); }, [filterCanton]);

  async function fetchEvents() {
    setLoading(true);
    try {
    let query = supabase
      .from("events")
      .select("*, organizer:created_by(*)")
      .gte("event_date", new Date().toISOString())
      .order("event_date", { ascending: true });

    if (filterCanton) query = query.eq("canton", filterCanton);

    const { data: eventsData, error } = await query;
    if (!eventsData || error) { setLoading(false); return; }

    // Batch queries for participant counts + join status (avoids N+1)
    const eventIds = eventsData.map(e => e.id);

    const { data: allParticipants } = await supabase
      .from("event_participants")
      .select("event_id")
      .in("event_id", eventIds);

    const countMap: Record<string, number> = {};
    for (const p of allParticipants || []) {
      countMap[p.event_id] = (countMap[p.event_id] || 0) + 1;
    }

    const joinedSet = new Set<string>();
    if (profile) {
      const { data: userParticipations } = await supabase
        .from("event_participants")
        .select("event_id")
        .eq("user_id", profile.id)
        .in("event_id", eventIds);
      for (const p of userParticipations || []) {
        joinedSet.add(p.event_id);
      }
    }

    const enriched = eventsData.map(event => ({
      ...event,
      participant_count: countMap[event.id] || 0,
      is_joined: joinedSet.has(event.id),
    }));

    setEvents(enriched);
    } catch (err) {
      console.error("[Events] fetchEvents error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchDiscover() {
    setDiscoverLoading(true);
    try {
      const params = filterCanton ? `?canton=${filterCanton}` : "";
      const res = await fetch(`/api/events/discover${params}`);
      if (res.ok) {
        const data = await res.json();
        setDiscoveredEvents(data.events || []);
        setCuratedSources(data.sources || []);
        setGoogleSearchUrl(data.searchUrl || "");
      }
    } catch { /* ignore */ }
    setDiscoverLoading(false);
  }

  async function handleJoin(eventId: string, isJoined: boolean) {
    if (!profile) { window.location.href = "/login"; return; }
    setJoining(eventId);

    if (isJoined) {
      await supabase.from("event_participants").delete()
        .eq("event_id", eventId).eq("user_id", profile.id);
    } else {
      await supabase.from("event_participants").insert({
        event_id: eventId, user_id: profile.id,
      });
    }

    await fetchEvents();
    setJoining(null);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
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
      created_by: profile.id,
    });

    setCreating(false);
    if (error) { setCreateError(error.message); return; }
    setShowCreate(false);
    setForm({ title:"", description:"", event_date:"", event_time:"10:00", location:"", canton:"", max_participants:"20", species:[] });
    fetchEvents();
  }

  function toggleSpecies(s: string) {
    setForm(f => ({
      ...f,
      species: f.species.includes(s) ? f.species.filter(x => x !== s) : [...f.species, s],
    }));
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const locale = lang === "de" ? "de-CH" : lang === "it" ? "it-CH" : lang === "en" ? "en-GB" : "fr-CH";
    const dayStr = diff === 0 ? t.eventsToday : diff === 1 ? t.eventsTomorrow : t.eventsInDays.replace("{n}", String(diff));
    return {
      day: date.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" }),
      time: date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }),
      soon: dayStr,
      urgent: diff <= 3,
    };
  }

  const grouped = events.reduce((acc, event) => {
    const week = Math.floor((new Date(event.event_date).getTime() - Date.now()) / (7 * 24 * 60 * 60 * 1000));
    const key = week <= 0 ? t.eventsThisWeek : week === 1 ? t.eventsNextWeek : t.eventsLater;
    if (!acc[key]) acc[key] = [];
    acc[key].push(event);
    return acc;
  }, {} as Record<string, Event[]>);

  return (
    <div className="min-h-screen bg-[var(--c-deep)] pb-24">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideDown { from{opacity:0;transform:translateY(-10px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fadeUp 0.4s ease-out forwards; }
        .slide-down { animation: slideDown 0.3s ease-out forwards; }
        @keyframes pulse-green { 0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,0.3)} 50%{box-shadow:0 0 0 8px rgba(34,197,94,0)} }
        .pulse-green { animation: pulse-green 2s infinite; }
      `}} />

      {/* Header */}
      <div className="sticky top-0 z-10 backdrop-blur-xl border-b border-[var(--c-border)] px-4 py-4" style={{ background: "var(--c-deep)" }}>
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--c-text)]">{t.eventsTitle}</h1>
            <p className="text-xs" style={{ color: "var(--c-text-muted)" }}>{t.eventsSub2}</p>
          </div>
          {profile && (
            <button onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-semibold rounded-full hover:from-orange-600 hover:to-orange-700 transition shadow-lg shadow-orange-500/20">
              {t.eventsCreate}
            </button>
          )}
        </div>

        {/* Canton filter — dropdown */}
        <div className="max-w-2xl mx-auto mt-3 flex items-center gap-2 pb-1">
          <select
            value={filterCanton}
            onChange={(e) => setFilterCanton(e.target.value)}
            className="flex-1 px-4 py-2.5 bg-[var(--c-card)] border border-[var(--c-border)] rounded-xl text-sm text-[var(--c-text)] focus:ring-1 focus:ring-orange-500/50 outline-none appearance-none"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23999' viewBox='0 0 16 16'%3E%3Cpath d='M1.5 5.5l6.5 6 6.5-6'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}
          >
            <option value="">{t.eventsAll}</option>
            {detectedCanton && (
              <option value={detectedCanton}>{"\uD83D\uDCCD"} Pres de moi — {CANTONS.find(c => c.code === detectedCanton)?.name || detectedCanton}</option>
            )}
            {CANTONS.map(c => (
              <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
            ))}
          </select>
          {geoStatus === "loading" && (
            <span className="text-xs text-[var(--c-text-muted)] animate-pulse whitespace-nowrap">
              {"\uD83D\uDCCD"} Localisation...
            </span>
          )}
        </div>
      </div>

      {/* Create form modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="slide-down bg-gradient-to-br from-[var(--c-card)] to-[var(--c-deep)] border border-[var(--c-border)] rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-[var(--c-text)]">{t.eventsCreateTitle}</h2>
              <button onClick={() => setShowCreate(false)} className="text-[var(--c-text-muted)] hover:text-[var(--c-text)]">✕</button>
            </div>

            {createError && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm">{createError}</div>}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--c-text-muted)] mb-1.5">{t.eventsEventTitle} *</label>
                <input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} required
                  placeholder="Balade dominicale au parc..."
                  className="w-full px-4 py-2.5 bg-[var(--c-deep)] border border-[var(--c-border)] rounded-xl text-[var(--c-text)] placeholder-[var(--c-text-muted)] focus:ring-1 focus:ring-orange-500/50 outline-none text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--c-text-muted)] mb-1.5">{t.eventsDate} *</label>
                  <input type="date" value={form.event_date} onChange={e => setForm(f => ({...f, event_date: e.target.value}))} required
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full px-3 py-2.5 bg-[var(--c-deep)] border border-[var(--c-border)] rounded-xl text-[var(--c-text)] focus:ring-1 focus:ring-orange-500/50 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--c-text-muted)] mb-1.5">{t.eventsTime} *</label>
                  <input type="time" value={form.event_time} onChange={e => setForm(f => ({...f, event_time: e.target.value}))}
                    className="w-full px-3 py-2.5 bg-[var(--c-deep)] border border-[var(--c-border)] rounded-xl text-[var(--c-text)] focus:ring-1 focus:ring-orange-500/50 outline-none text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--c-text-muted)] mb-1.5">Canton *</label>
                <select value={form.canton} onChange={e => setForm(f => ({...f, canton: e.target.value}))} required
                  className="w-full px-3 py-2.5 bg-[var(--c-deep)] border border-[var(--c-border)] rounded-xl text-[var(--c-text)] focus:ring-1 focus:ring-orange-500/50 outline-none text-sm">
                  <option value="">{t.eventsSelectCanton}</option>
                  {CANTONS.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--c-text-muted)] mb-1.5">{t.eventsLocation} *</label>
                <input value={form.location} onChange={e => setForm(f => ({...f, location: e.target.value}))} required
                  placeholder="Parc de la Grange, Genève"
                  className="w-full px-4 py-2.5 bg-[var(--c-deep)] border border-[var(--c-border)] rounded-xl text-[var(--c-text)] placeholder-[var(--c-text-muted)] focus:ring-1 focus:ring-orange-500/50 outline-none text-sm" />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--c-text-muted)] mb-1.5">{t.eventsAnimals}</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(SPECIES_EMOJI).map(([s, emoji]) => (
                    <button key={s} type="button" onClick={() => toggleSpecies(s)}
                      className={"px-3 py-1.5 rounded-full text-xs border transition " +
                        (form.species.includes(s) ? "bg-orange-500/20 border-orange-500/40 text-orange-300" : "bg-[var(--c-card)] border-[var(--c-border)] text-[var(--c-text-muted)]")}>
                      {emoji} {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--c-text-muted)] mb-1.5">{t.eventsMax}</label>
                  <input type="number" value={form.max_participants} onChange={e => setForm(f => ({...f, max_participants: e.target.value}))}
                    min="2" max="200"
                    className="w-full px-3 py-2.5 bg-[var(--c-deep)] border border-[var(--c-border)] rounded-xl text-[var(--c-text)] focus:ring-1 focus:ring-orange-500/50 outline-none text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--c-text-muted)] mb-1.5">{t.eventsDescription}</label>
                <textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))}
                  placeholder="Décris l'événement, le point de rendez-vous..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-[var(--c-deep)] border border-[var(--c-border)] rounded-xl text-[var(--c-text)] placeholder-[var(--c-text-muted)] focus:ring-1 focus:ring-orange-500/50 outline-none text-sm resize-none" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 bg-[var(--c-card)] border border-[var(--c-border)] text-[var(--c-text-muted)] rounded-2xl text-sm">
                  {t.eventsCancel}
                </button>
                <button type="submit" disabled={creating}
                  className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-2xl text-sm disabled:opacity-50">
                  {creating ? t.eventsCreating : t.eventsCreateBtn}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Events list */}
      <div className="max-w-2xl mx-auto px-4 pt-6">
        {loading ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3 animate-bounce">🐾</div>
            <p className="text-[var(--c-text-muted)] text-sm">{t.eventsLoading}</p>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-16">
            {/* Real date calendar icon */}
            <div className="inline-flex flex-col items-center justify-center w-16 h-16 rounded-2xl border-2 border-orange-500/30 bg-[var(--c-card)] mb-4 shadow-sm">
              <span className="text-[10px] font-bold uppercase text-orange-500 leading-none mt-1">{new Date().toLocaleDateString(lang === "de" ? "de-CH" : lang === "en" ? "en-GB" : "fr-CH", { month: "short" })}</span>
              <span className="text-2xl font-extrabold text-[var(--c-text)] leading-none">{new Date().getDate()}</span>
            </div>
            <h2 className="text-xl font-bold text-[var(--c-text)] mb-2">{t.eventsNone}</h2>
            <p className="text-[var(--c-text-muted)] text-sm mb-6">
              {filterCanton ? t.eventsNoInCanton : t.eventsBeFirst}
            </p>
            {profile && (
              <button onClick={() => setShowCreate(true)}
                className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition text-sm">
                {t.eventsCreateFirst}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([period, periodEvents]) => (
              <div key={period}>
                <h2 className="text-xs font-semibold text-[var(--c-text-muted)] uppercase tracking-widest mb-3">{period}</h2>
                <div className="space-y-3">
                  {periodEvents.map((event, i) => {
                    const date = formatDate(event.event_date);
                    const isFull = (event.participant_count || 0) >= (event.max_participants || 0);
                    const spotsLeft = (event.max_participants || 0) - (event.participant_count || 0);
                    const cantonName = CANTONS.find(c => c.code === event.canton)?.name || event.canton;
                    const colorClass = CANTON_COLORS[event.canton.charCodeAt(0) % CANTON_COLORS.length];

                    return (
                      <div key={event.id} className={"fade-up bg-gradient-to-br " + colorClass + " border border-[var(--c-border)] rounded-2xl p-5 transition hover:border-[var(--c-border)]"}
                        style={{ animationDelay: i * 0.05 + "s" }}>

                        {/* Top row */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              {detectedCanton && event.canton === detectedCanton && (
                                <span className="px-2 py-0.5 bg-green-500/20 border border-green-500/30 text-green-300 rounded-full text-[10px] font-bold">
                                  {"\uD83D\uDCCD"} Pr&egrave;s de toi
                                </span>
                              )}
                              {date.urgent && (
                                <span className="px-2 py-0.5 bg-orange-500/20 border border-orange-500/30 text-orange-300 rounded-full text-[10px] font-bold pulse-green">
                                  {date.soon}
                                </span>
                              )}
                              {event.species.length > 0 && (
                                <span className="text-sm">{event.species.slice(0, 3).map(s => SPECIES_EMOJI[s]).join("")}</span>
                              )}
                            </div>
                            <h3 className="font-bold text-[var(--c-text)] text-base leading-tight">{event.title}</h3>
                          </div>

                          {/* Join button */}
                          <button
                            onClick={() => handleJoin(event.id, event.is_joined || false)}
                            disabled={joining === event.id || (isFull && !event.is_joined)}
                            className={"flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition " +
                              (event.is_joined
                                ? "bg-green-500/20 border border-green-500/40 text-green-300 hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-300"
                                : isFull
                                ? "bg-[var(--c-card)] border border-[var(--c-border)] text-[var(--c-text-muted)] cursor-not-allowed"
                                : "bg-orange-500 hover:bg-orange-600 text-white")}>
                            {joining === event.id ? "..." : event.is_joined ? t.eventsJoined : isFull ? t.eventsFull : t.eventsJoin}
                          </button>
                        </div>

                        {/* Info */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          <span className="flex items-center gap-1 text-xs text-[var(--c-text-muted)]">
                            📅 {date.day} {t.eventsAt} {date.time}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-3">
                          <span className="px-2.5 py-1 bg-[var(--c-card)] text-[var(--c-text-muted)] rounded-full text-xs">📍 {event.location}</span>
                          <span className="px-2.5 py-1 bg-[var(--c-card)] text-[var(--c-text-muted)] rounded-full text-xs">🗺️ {cantonName}</span>
                          <span className={"px-2.5 py-1 rounded-full text-xs " +
                            (isFull ? "bg-red-500/15 text-red-400" : spotsLeft <= 3 ? "bg-orange-500/15 text-orange-300" : "bg-[var(--c-card)] text-[var(--c-text-muted)]")}>
                            👥 {event.participant_count}/{event.max_participants}
                            {spotsLeft <= 5 && !isFull && <span className="ml-1 font-semibold">({spotsLeft} {t.eventsSpotsLeft})</span>}
                          </span>
                        </div>

                        {event.description && (
                          <p className="text-xs text-[var(--c-text-muted)] leading-relaxed mb-3 line-clamp-2">{event.description}</p>
                        )}

                        {/* Capacity bar */}
                        <div className="w-full h-1 bg-[var(--c-card)] rounded-full overflow-hidden">
                          <div className={"h-full rounded-full transition-all duration-500 " +
                            (isFull ? "bg-red-500" : spotsLeft <= 3 ? "bg-orange-500" : "bg-green-500")}
                            style={{ width: ((event.participant_count || 0) / (event.max_participants || 1) * 100) + "%" }} />
                        </div>

                        <p className="text-[10px] text-[var(--c-text-muted)] mt-2">
                          {t.eventsOrganizedBy} {event.organizer?.full_name || event.organizer?.email || t.eventsAnonymous}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ═══ DISCOVERED EVENTS SECTION ═══ */}
        <div className="mt-10 mb-4">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-lg font-bold text-[var(--c-text)]">{"🔍"} Evenements decouverts</h2>
            {discoverLoading && <span className="text-xs text-[var(--c-text-muted)] animate-pulse">Recherche...</span>}
          </div>
          <p className="text-xs text-[var(--c-text-muted)] mb-4">
            Evenements pour animaux trouves sur le web {filterCanton ? `dans le canton de ${CANTONS.find(c => c.code === filterCanton)?.name || filterCanton}` : "en Suisse"}
          </p>

          {discoveredEvents.length > 0 ? (
            <div className="space-y-3">
              {discoveredEvents.map((ev, i) => (
                <a key={ev.id} href={ev.url} target="_blank" rel="noopener noreferrer"
                  className="fade-up block bg-[var(--c-card)] border border-[var(--c-border)] rounded-2xl p-4 hover:border-orange-500/30 transition-all group"
                  style={{ animationDelay: i * 0.05 + "s" }}>
                  <div className="flex gap-3">
                    {ev.image && (
                      <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-[var(--c-deep)]">
                        <img src={ev.image} alt="" className="w-full h-full object-cover" loading="lazy" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 bg-blue-500/15 border border-blue-500/25 text-blue-300 rounded-full text-[10px] font-semibold">
                          {"🌐"} Web
                        </span>
                        <span className="text-[10px] text-[var(--c-text-muted)] truncate">{ev.source}</span>
                      </div>
                      <h3 className="text-sm font-semibold text-[var(--c-text)] line-clamp-1 group-hover:text-orange-400 transition-colors">{ev.title}</h3>
                      <p className="text-xs text-[var(--c-text-muted)] line-clamp-2 mt-0.5">{ev.snippet}</p>
                    </div>
                    <div className="flex-shrink-0 flex items-center">
                      <span className="text-[var(--c-text-muted)] group-hover:text-orange-400 transition-colors text-sm">{"→"}</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          ) : !discoverLoading ? (
            <div className="bg-[var(--c-card)] border border-[var(--c-border)] rounded-2xl p-6 text-center">
              <p className="text-sm text-[var(--c-text-muted)] mb-3">Aucun evenement externe trouve pour cette zone</p>
              {googleSearchUrl && (
                <a href={googleSearchUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/15 border border-blue-500/25 text-blue-300 rounded-xl text-sm font-medium hover:bg-blue-500/25 transition">
                  {"🔍"} Rechercher sur Google
                </a>
              )}
            </div>
          ) : null}
        </div>

        {/* ═══ CURATED SOURCES ═══ */}
        {curatedSources.length > 0 && (
          <div className="mt-8 mb-10">
            <h3 className="text-xs font-semibold text-[var(--c-text-muted)] uppercase tracking-widest mb-3">{"📌"} Sources recommandees</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {curatedSources.map((src, i) => (
                <a key={i} href={src.url} target="_blank" rel="noopener noreferrer"
                  className="block bg-[var(--c-card)] border border-[var(--c-border)] rounded-xl p-3 hover:border-orange-500/30 transition-all group">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/15 border border-purple-500/25 text-purple-300 rounded-full font-semibold">
                      {"⭐"}
                    </span>
                    <span className="text-sm font-semibold text-[var(--c-text)] group-hover:text-orange-400 transition-colors truncate">{src.name}</span>
                  </div>
                  <p className="text-[11px] text-[var(--c-text-muted)] line-clamp-2">{src.description}</p>
                </a>
              ))}
            </div>
            {googleSearchUrl && (
              <div className="mt-4 text-center">
                <a href={googleSearchUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/25 text-[var(--c-text)] rounded-xl text-sm font-medium hover:from-blue-500/30 hover:to-purple-500/30 transition">
                  {"🔍"} Voir plus sur Google
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
