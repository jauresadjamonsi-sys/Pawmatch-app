"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { EMOJI_MAP } from "@/lib/constants";

type Tab = "trending" | "nearby" | "new" | "species";
const SPECIES_FILTERS = ["chien", "chat", "lapin", "oiseau", "rongeur", "autre"];

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

export default function ExplorePage() {
  const [tab, setTab] = useState<Tab>("trending");
  const [animals, setAnimals] = useState<ExploreAnimal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [speciesFilter, setSpeciesFilter] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const supabase = createClient();
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
          // Sort by most recent activity (proxy for trending)
          query = query.order("created_at", { ascending: false }).limit(30);
          break;
        case "new":
          query = query.order("created_at", { ascending: false }).limit(30);
          break;
        case "nearby":
          // Would use geolocation in production; for now sort by canton
          query = query.order("canton", { ascending: true }).limit(30);
          break;
        case "species":
          query = query.order("species", { ascending: true }).order("created_at", { ascending: false }).limit(30);
          break;
      }

      const { data } = await query;
      setAnimals((data || []) as ExploreAnimal[]);
      setLoading(false);
    }
    load();
  }, [tab, speciesFilter, search]);

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "trending", label: "Tendance", icon: "🔥" },
    { key: "new", label: "Nouveaux", icon: "✨" },
    { key: "nearby", label: "Proches", icon: "📍" },
    { key: "species", label: "Espece", icon: "🐾" },
  ];

  return (
    <main id="main-content" className="max-w-4xl mx-auto px-4 py-5 pb-32">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-black mb-1" style={{ color: "var(--c-text)" }}>Explorer</h1>
        <p className="text-sm" style={{ color: "var(--c-text-muted)" }}>Decouvre de nouveaux animaux et profiles</p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--c-text-muted)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          type="text"
          placeholder="Rechercher par nom, race, canton..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-2xl text-sm outline-none"
          style={{ background: "var(--c-glass, rgba(255,255,255,0.05))", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all"
            style={{
              background: tab === t.key ? "linear-gradient(135deg, #f97316, #a78bfa)" : "var(--c-glass, rgba(255,255,255,0.05))",
              color: tab === t.key ? "#fff" : "var(--c-text-muted)",
              border: tab === t.key ? "none" : "1px solid var(--c-border)",
            }}
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Species filter chips */}
      {tab === "species" && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
          {SPECIES_FILTERS.map((sp) => (
            <button
              key={sp}
              onClick={() => setSpeciesFilter(speciesFilter === sp ? null : sp)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all"
              style={{
                background: speciesFilter === sp ? "rgba(249,115,22,0.15)" : "var(--c-glass, rgba(255,255,255,0.05))",
                color: speciesFilter === sp ? "#f97316" : "var(--c-text-muted)",
                border: `1px solid ${speciesFilter === sp ? "rgba(249,115,22,0.3)" : "var(--c-border)"}`,
              }}
            >
              <span>{(EMOJI_MAP as any)[sp] || "🐾"}</span>
              {sp.charAt(0).toUpperCase() + sp.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl animate-pulse" style={{ background: "var(--c-glass)", aspectRatio: "3/4" }} />
          ))}
        </div>
      ) : animals.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🔍</div>
          <p className="text-sm" style={{ color: "var(--c-text-muted)" }}>
            {search ? "Aucun resultat pour cette recherche" : "Aucun animal trouve"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {animals.map((animal) => (
            <Link key={animal.id} href={`/animals/${animal.id}`} className="group">
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
                    {(EMOJI_MAP as any)[animal.species] || "🐾"}
                  </div>
                )}

                {/* Gradient overlay */}
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%)" }} />

                {/* Info */}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-white text-sm font-bold truncate">{animal.name}</p>
                  <p className="text-white/70 text-[10px] truncate">
                    {animal.breed || animal.species}{animal.canton ? ` · ${animal.canton}` : ""}
                  </p>
                </div>

                {/* Species badge */}
                <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-sm">
                  {(EMOJI_MAP as any)[animal.species] || "🐾"}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
