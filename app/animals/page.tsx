"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CANTONS } from "@/lib/cantons";
import Link from "next/link";
import { EMOJI_MAP } from "@/lib/constants";

const SPECIES_LIST = [
  { value: "", label: "Toutes les espèces" },
  { value: "chien", label: "🐕 Chiens" },
  { value: "chat", label: "🐱 Chats" },
  { value: "lapin", label: "🐰 Lapins" },
  { value: "oiseau", label: "🐦 Oiseaux" },
  { value: "rongeur", label: "🐹 Rongeurs" },
  { value: "autre", label: "🐾 Autres" },
];

export default function AnimalsPage() {
  const [animals, setAnimals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [species, setSpecies] = useState("");
  const [canton, setCanton] = useState("");
  const [search, setSearch] = useState("");
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const supabase = createClient();

  useEffect(() => {
    fetchBlockedUsers();
  }, []);

  useEffect(() => {
    fetchAnimals();
  }, [species, canton]);

  async function fetchBlockedUsers() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: blocks } = await supabase
        .from("blocks")
        .select("blocked_id")
        .eq("blocker_id", user.id);
      const { data: blockedBy } = await supabase
        .from("blocks")
        .select("blocker_id")
        .eq("blocked_id", user.id);
      setBlockedIds([
        ...(blocks || []).map((b: any) => b.blocked_id),
        ...(blockedBy || []).map((b: any) => b.blocker_id),
      ]);
    } catch {}
  }

  async function fetchAnimals() {
    setLoading(true);
    let query = supabase.from("animals").select("*").order("created_at", { ascending: false });
    if (species) query = query.eq("species", species);
    if (canton) query = query.eq("canton", canton);
    const { data } = await query;
    setAnimals(data || []);
    setLoading(false);
  }

  const filtered = animals.filter((a) => {
    // Filter out blocked users
    if (blockedIds.length > 0 && a.created_by && blockedIds.includes(a.created_by)) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      a.name?.toLowerCase().includes(s) ||
      a.breed?.toLowerCase().includes(s) ||
      a.city?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="min-h-screen px-6 py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-[var(--c-text)] mb-2">Ton prochain <span className="text-orange-400">pote</span></h1>
        <p className="text-[var(--c-text-muted)] mb-6">Découvre les compagnons qui t'attendent en Suisse</p>

        {/* Filtres */}
        <div className="flex flex-wrap gap-3 mb-8">
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 bg-white/5 border border-[var(--c-border)] rounded-xl text-[var(--c-text)] placeholder-[var(--c-text-muted)] text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
          />
          <select
            value={species}
            onChange={(e) => setSpecies(e.target.value)}
            className="px-4 py-2 bg-white/5 border border-[var(--c-border)] rounded-xl text-[var(--c-text-muted)] text-sm focus:ring-2 focus:ring-orange-500 outline-none appearance-none"
          >
            {SPECIES_LIST.map((s) => (
              <option key={s.value} value={s.value} className="bg-[var(--c-deep)]">{s.label}</option>
            ))}
          </select>
          <select
            value={canton}
            onChange={(e) => setCanton(e.target.value)}
            className="px-4 py-2 bg-white/5 border border-[var(--c-border)] rounded-xl text-[var(--c-text-muted)] text-sm focus:ring-2 focus:ring-orange-500 outline-none appearance-none"
          >
            <option value="" className="bg-[var(--c-deep)]">Tous les cantons</option>
            {CANTONS.map((c) => (
              <option key={c.code} value={c.code} className="bg-[var(--c-deep)]">{c.name} ({c.code})</option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="text-center text-[var(--c-text-muted)] py-12">Chargement...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-5xl mb-4">🔍</p>
            <p className="text-[var(--c-text-muted)]">Aucun compagnon trouvé avec ces critères</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((animal) => (
              <Link href={"/animals/" + animal.id} key={animal.id} className="bg-white/5 border border-[var(--c-border)] rounded-2xl overflow-hidden hover:bg-white/10 transition group">
                <div className="aspect-square bg-[var(--c-card)] flex items-center justify-center overflow-hidden">
                  {animal.photo_url ? (
                    <img src={animal.photo_url} alt={animal.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <span className="text-5xl">{EMOJI_MAP[animal.species] || "🐾"}</span>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-[var(--c-text)] text-sm">{animal.name}</h3>
                    <span className="text-lg">{EMOJI_MAP[animal.species] || "🐾"}</span>
                  </div>
                  <p className="text-xs text-[var(--c-text-muted)] mb-2">
                    {animal.breed || animal.species}
                  </p>
                  <div className="flex items-center gap-2">
                    {animal.canton && (
                      <span className="text-[10px] px-2 py-0.5 bg-orange-500/20 text-orange-300 rounded-full">{animal.canton}</span>
                    )}
                    {animal.city && (
                      <span className="text-[10px] text-[var(--c-text-muted)]">{animal.city}</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
