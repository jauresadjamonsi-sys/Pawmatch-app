"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CANTONS } from "@/lib/cantons";
import Link from "next/link";

const EMOJI_MAP: Record<string, string> = {
  chien: "🐕", chat: "🐱", lapin: "🐰",
  oiseau: "🐦", rongeur: "🐹", autre: "🐾",
};

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
  const supabase = createClient();

  useEffect(() => {
    fetchAnimals();
  }, [species, canton]);

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
        <h1 className="text-3xl font-bold text-white mb-2">Ton prochain <span className="text-orange-400">pote</span></h1>
        <p className="text-gray-400 mb-6">Découvre les compagnons qui t'attendent en Suisse</p>

        {/* Filtres */}
        <div className="flex flex-wrap gap-3 mb-8">
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
          />
          <select
            value={species}
            onChange={(e) => setSpecies(e.target.value)}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-gray-300 text-sm focus:ring-2 focus:ring-orange-500 outline-none appearance-none"
          >
            {SPECIES_LIST.map((s) => (
              <option key={s.value} value={s.value} className="bg-[#1a1225]">{s.label}</option>
            ))}
          </select>
          <select
            value={canton}
            onChange={(e) => setCanton(e.target.value)}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-gray-300 text-sm focus:ring-2 focus:ring-orange-500 outline-none appearance-none"
          >
            <option value="" className="bg-[#1a1225]">Tous les cantons</option>
            {CANTONS.map((c) => (
              <option key={c.code} value={c.code} className="bg-[#1a1225]">{c.name} ({c.code})</option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="text-center text-gray-500 py-12">Chargement...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-5xl mb-4">🔍</p>
            <p className="text-gray-400">Aucun compagnon trouvé avec ces critères</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((animal) => (
              <Link href={"/animals/" + animal.id} key={animal.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:bg-white/10 transition group">
                <div className="aspect-square bg-[#2a1f3a] flex items-center justify-center overflow-hidden">
                  {animal.photo_url ? (
                    <img src={animal.photo_url} alt={animal.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <span className="text-5xl">{EMOJI_MAP[animal.species] || "🐾"}</span>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-white text-sm">{animal.name}</h3>
                    <span className="text-lg">{EMOJI_MAP[animal.species] || "🐾"}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">
                    {animal.breed || animal.species}
                  </p>
                  <div className="flex items-center gap-2">
                    {animal.canton && (
                      <span className="text-[10px] px-2 py-0.5 bg-orange-500/20 text-orange-300 rounded-full">{animal.canton}</span>
                    )}
                    {animal.city && (
                      <span className="text-[10px] text-gray-500">{animal.city}</span>
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
