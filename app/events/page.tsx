"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
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

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCanton, setFilterCanton] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [joining, setJoining] = useState<string | null>(null);
  const { profile } = useAuth();
  const supabase = createClient();

  // Form state
  const [form, setForm] = useState({
    title: "", description: "", event_date: "", event_time: "10:00",
    location: "", canton: "", max_participants: "20", species: [] as string[],
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => { fetchEvents(); }, [filterCanton]);

  async function fetchEvents() {
    setLoading(true);
    let query = supabase
      .from("events")
      .select("*, organizer:created_by(full_name, email)")
      .gte("event_date", new Date().toISOString())
      .order("event_date", { ascending: true });

    if (filterCanton) query = query.eq("canton", filterCanton);

    const { data: eventsData } = await query;
    if (!eventsData) { setLoading(false); return; }

    // Get participant counts + join status
    const enriched = await Promise.all(eventsData.map(async (event) => {
      const { count } = await supabase
        .from("event_participants")
        .select("*", { count: "exact", head: true })
        .eq("event_id", event.id);

      let isJoined = false;
      if (profile) {
        const { data: joined } = await supabase
          .from("event_participants")
          .select("id")
          .eq("event_id", event.id)
          .eq("user_id", profile.id)
          .maybeSingle();
        isJoined = !!joined;
      }

      return { ...event, participant_count: count || 0, is_joined: isJoined };
    }));

    setEvents(enriched);
    setLoading(false);
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
    const dayStr = diff === 0 ? "Aujourd'hui" : diff === 1 ? "Demain" : `Dans ${diff} jours`;
    return {
      day: date.toLocaleDateString("fr-CH", { weekday: "long", day: "numeric", month: "long" }),
      time: date.toLocaleTimeString("fr-CH", { hour: "2-digit", minute: "2-digit" }),
      soon: dayStr,
      urgent: diff <= 3,
    };
  }

  const grouped = events.reduce((acc, event) => {
    const week = Math.floor((new Date(event.event_date).getTime() - Date.now()) / (7 * 24 * 60 * 60 * 1000));
    const key = week <= 0 ? "Cette semaine" : week === 1 ? "Semaine prochaine" : "Plus tard";
    if (!acc[key]) acc[key] = [];
    acc[key].push(event);
    return acc;
  }, {} as Record<string, Event[]>);

  return (
    <div className="min-h-screen bg-[#1a1225] pb-24">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideDown { from{opacity:0;transform:translateY(-10px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fadeUp 0.4s ease-out forwards; }
        .slide-down { animation: slideDown 0.3s ease-out forwards; }
        @keyframes pulse-green { 0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,0.3)} 50%{box-shadow:0 0 0 8px rgba(34,197,94,0)} }
        .pulse-green { animation: pulse-green 2s infinite; }
      `}} />

      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#1a1225]/90 backdrop-blur-xl border-b border-white/5 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Événements</h1>
            <p className="text-xs text-gray-500">Balades & rencontres en Suisse</p>
          </div>
          {profile && (
            <button onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-semibold rounded-full hover:from-orange-600 hover:to-orange-700 transition shadow-lg shadow-orange-500/20">
              + Créer
            </button>
          )}
        </div>

        {/* Canton filter */}
        <div className="max-w-2xl mx-auto mt-3 flex gap-2 overflow-x-auto pb-1">
          <button onClick={() => setFilterCanton("")}
            className={"flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition " +
              (!filterCanton ? "bg-orange-500/20 border border-orange-500/40 text-orange-300" : "bg-white/5 border border-white/10 text-gray-400 hover:border-orange-500/30")}>
            Toute la Suisse 🇨🇭
          </button>
          {CANTONS.slice(0, 10).map(c => (
            <button key={c.code} onClick={() => setFilterCanton(filterCanton === c.code ? "" : c.code)}
              className={"flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition " +
                (filterCanton === c.code ? "bg-orange-500/20 border border-orange-500/40 text-orange-300" : "bg-white/5 border border-white/10 text-gray-400 hover:border-orange-500/30")}>
              {c.code}
            </button>
          ))}
        </div>
      </div>

      {/* Create form modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="slide-down bg-gradient-to-br from-[#241d33] to-[#1a1225] border border-white/10 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">Créer un événement</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-500 hover:text-white">✕</button>
            </div>

            {createError && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm">{createError}</div>}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Titre *</label>
                <input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} required
                  placeholder="Balade dominicale au parc..."
                  className="w-full px-4 py-2.5 bg-[#1a1225] border border-white/10 rounded-xl text-white placeholder-gray-600 focus:ring-1 focus:ring-orange-500/50 outline-none text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Date *</label>
                  <input type="date" value={form.event_date} onChange={e => setForm(f => ({...f, event_date: e.target.value}))} required
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full px-3 py-2.5 bg-[#1a1225] border border-white/10 rounded-xl text-white focus:ring-1 focus:ring-orange-500/50 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Heure *</label>
                  <input type="time" value={form.event_time} onChange={e => setForm(f => ({...f, event_time: e.target.value}))}
                    className="w-full px-3 py-2.5 bg-[#1a1225] border border-white/10 rounded-xl text-white focus:ring-1 focus:ring-orange-500/50 outline-none text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Canton *</label>
                <select value={form.canton} onChange={e => setForm(f => ({...f, canton: e.target.value}))} required
                  className="w-full px-3 py-2.5 bg-[#1a1225] border border-white/10 rounded-xl text-white focus:ring-1 focus:ring-orange-500/50 outline-none text-sm">
                  <option value="">Sélectionne un canton</option>
                  {CANTONS.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Lieu *</label>
                <input value={form.location} onChange={e => setForm(f => ({...f, location: e.target.value}))} required
                  placeholder="Parc de la Grange, Genève"
                  className="w-full px-4 py-2.5 bg-[#1a1225] border border-white/10 rounded-xl text-white placeholder-gray-600 focus:ring-1 focus:ring-orange-500/50 outline-none text-sm" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Animaux bienvenus</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(SPECIES_EMOJI).map(([s, emoji]) => (
                    <button key={s} type="button" onClick={() => toggleSpecies(s)}
                      className={"px-3 py-1.5 rounded-full text-xs border transition " +
                        (form.species.includes(s) ? "bg-orange-500/20 border-orange-500/40 text-orange-300" : "bg-white/5 border-white/10 text-gray-400")}>
                      {emoji} {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Max participants</label>
                  <input type="number" value={form.max_participants} onChange={e => setForm(f => ({...f, max_participants: e.target.value}))}
                    min="2" max="200"
                    className="w-full px-3 py-2.5 bg-[#1a1225] border border-white/10 rounded-xl text-white focus:ring-1 focus:ring-orange-500/50 outline-none text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))}
                  placeholder="Décris l'événement, le point de rendez-vous..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-[#1a1225] border border-white/10 rounded-xl text-white placeholder-gray-600 focus:ring-1 focus:ring-orange-500/50 outline-none text-sm resize-none" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 bg-white/5 border border-white/10 text-gray-400 rounded-2xl text-sm">
                  Annuler
                </button>
                <button type="submit" disabled={creating}
                  className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-2xl text-sm disabled:opacity-50">
                  {creating ? "Création..." : "Créer 🎉"}
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
            <p className="text-gray-500 text-sm">Chargement des événements...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📅</div>
            <h2 className="text-xl font-bold text-white mb-2">Aucun événement</h2>
            <p className="text-gray-500 text-sm mb-6">
              {filterCanton ? `Pas d'événement dans ce canton pour l'instant.` : "Sois le premier à organiser une balade !"}
            </p>
            {profile && (
              <button onClick={() => setShowCreate(true)}
                className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition text-sm">
                Créer le premier événement 🎉
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([period, periodEvents]) => (
              <div key={period}>
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">{period}</h2>
                <div className="space-y-3">
                  {periodEvents.map((event, i) => {
                    const date = formatDate(event.event_date);
                    const isFull = event.participant_count >= event.max_participants;
                    const spotsLeft = event.max_participants - event.participant_count;
                    const cantonName = CANTONS.find(c => c.code === event.canton)?.name || event.canton;
                    const colorClass = CANTON_COLORS[event.canton.charCodeAt(0) % CANTON_COLORS.length];

                    return (
                      <div key={event.id} className={"fade-up bg-gradient-to-br " + colorClass + " border border-white/8 rounded-2xl p-5 transition hover:border-white/15"}
                        style={{ animationDelay: i * 0.05 + "s" }}>

                        {/* Top row */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {date.urgent && (
                                <span className="px-2 py-0.5 bg-orange-500/20 border border-orange-500/30 text-orange-300 rounded-full text-[10px] font-bold pulse-green">
                                  {date.soon}
                                </span>
                              )}
                              {event.species.length > 0 && (
                                <span className="text-sm">{event.species.slice(0, 3).map(s => SPECIES_EMOJI[s]).join("")}</span>
                              )}
                            </div>
                            <h3 className="font-bold text-white text-base leading-tight">{event.title}</h3>
                          </div>

                          {/* Join button */}
                          <button
                            onClick={() => handleJoin(event.id, event.is_joined || false)}
                            disabled={joining === event.id || (isFull && !event.is_joined)}
                            className={"flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition " +
                              (event.is_joined
                                ? "bg-green-500/20 border border-green-500/40 text-green-300 hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-300"
                                : isFull
                                ? "bg-white/5 border border-white/10 text-gray-600 cursor-not-allowed"
                                : "bg-orange-500 hover:bg-orange-600 text-white")}>
                            {joining === event.id ? "..." : event.is_joined ? "✓ Inscrit" : isFull ? "Complet" : "Participer"}
                          </button>
                        </div>

                        {/* Info */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            📅 {date.day} à {date.time}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-3">
                          <span className="px-2.5 py-1 bg-white/8 text-gray-300 rounded-full text-xs">📍 {event.location}</span>
                          <span className="px-2.5 py-1 bg-white/8 text-gray-300 rounded-full text-xs">🗺️ {cantonName}</span>
                          <span className={"px-2.5 py-1 rounded-full text-xs " +
                            (isFull ? "bg-red-500/15 text-red-400" : spotsLeft <= 3 ? "bg-orange-500/15 text-orange-300" : "bg-white/8 text-gray-300")}>
                            👥 {event.participant_count}/{event.max_participants}
                            {spotsLeft <= 5 && !isFull && <span className="ml-1 font-semibold">({spotsLeft} places restantes !)</span>}
                          </span>
                        </div>

                        {event.description && (
                          <p className="text-xs text-gray-400 leading-relaxed mb-3 line-clamp-2">{event.description}</p>
                        )}

                        {/* Capacity bar */}
                        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                          <div className={"h-full rounded-full transition-all duration-500 " +
                            (isFull ? "bg-red-500" : spotsLeft <= 3 ? "bg-orange-500" : "bg-green-500")}
                            style={{ width: (event.participant_count / event.max_participants * 100) + "%" }} />
                        </div>

                        <p className="text-[10px] text-gray-600 mt-2">
                          Organisé par {event.organizer?.full_name || event.organizer?.email || "Anonyme"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
