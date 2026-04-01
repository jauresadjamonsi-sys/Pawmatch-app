"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { listAnimals, AnimalRow } from "@/lib/services/animals";
import { CANTONS } from "@/lib/cantons";
import Link from "next/link";

const SPECIES_OPTIONS = [
  { value: "", label: "Toutes les especes" },
  { value: "chien", label: "Chien" },
  { value: "chat", label: "Chat" },
  { value: "lapin", label: "Lapin" },
  { value: "oiseau", label: "Oiseau" },
  { value: "rongeur", label: "Rongeur" },
  { value: "autre", label: "Autre" },
];

const EMOJI_MAP: Record<string, string> = {
  chien: "🐕",
  chat: "🐱",
  lapin: "🐰",
  oiseau: "🐦",
  rongeur: "🐹",
  autre: "🐾",
};

export default function AnimalsPage() {
  const [animals, setAnimals] = useState<AnimalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [species, setSpecies] = useState("");
  const [canton, setCanton] = useState("");
  const [search, setSearch] = useState("");
  const supabase = createClient();
  const { isAdmin } = useAuth();

  useEffect(() => {
    fetchAnimals();
  }, [species, canton]);

  async function fetchAnimals() {
    setLoading(true);
    setError(null);

    const result = await listAnimals(supabase, {
      species: species || undefined,
      canton: canton || undefined,
      status: "disponible",
    });

    if (result.error) {
      setError(result.error);
    } else {
      setAnimals(result.data || []);
    }
    setLoading(false);
  }

  const filtered = animals.filter((a) => {
    const term = search.toLowerCase();
    return (
      a.name.toLowerCase().includes(term) ||
      (a.breed && a.breed.toLowerCase().includes(term)) ||
      (a.city && a.city.toLowerCase().includes(term))
    );
  });

  function formatAge(months: number | null) {
    if (!months) return "Age inconnu";
    if (months < 12) return months + " mois";
    const years = Math.floor(months / 12);
    const rest = months % 12;
    if (rest > 0) return years + " an" + (years > 1 ? "s" : "") + " " + rest + " mois";
    return years + " an" + (years > 1 ? "s" : "");
  }

  function getCantonName(code: string | null) {
    if (!code) return null;
    return CANTONS.find((c) => c.code === code)?.name || code;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Ton prochain pote</h1>
          {isAdmin && (
            <Link href="/admin/animals/new" className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition text-sm">
              + Ajouter
            </Link>
          )}
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom, race ou ville..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
          />
          <select
            value={species}
            onChange={(e) => setSpecies(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
          >
            {SPECIES_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            value={canton}
            onChange={(e) => setCanton(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
          >
            <option value="">Tous les cantons</option>
            {CANTONS.map((c) => (
              <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="text-center text-gray-500 py-12">Chargement...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-6xl mb-4">🔍</p>
            <p className="text-xl text-gray-500">Aucun animal trouve</p>
            <p className="text-gray-400 mt-2">
              {species || canton || search
                ? "Essayez de modifier vos filtres."
                : "Ajoutez votre premier animal."}
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">{filtered.length} animal{filtered.length > 1 ? "x" : ""} disponible{filtered.length > 1 ? "s" : ""}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((animal) => (
                <Link key={animal.id} href={"/animals/" + animal.id} className="bg-white rounded-2xl shadow-md hover:shadow-lg transition overflow-hidden group">
                  <div className="h-48 bg-gray-100 flex items-center justify-center">
                    {animal.photo_url ? (
                      <img src={animal.photo_url} alt={animal.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-6xl">{EMOJI_MAP[animal.species] || "🐾"}</span>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-xl font-bold text-gray-900 group-hover:text-orange-500 transition">{animal.name}</h2>
                      <span className="text-sm bg-green-100 text-green-700 px-2 py-1 rounded-full">Disponible</span>
                    </div>
                    <p className="text-gray-600 text-sm">
                      {animal.species.charAt(0).toUpperCase() + animal.species.slice(1)}
                      {animal.breed ? " - " + animal.breed : ""}
                    </p>
                    <div className="flex items-center gap-3 mt-3 text-sm text-gray-500">
                      <span>{formatAge(animal.age_months)}</span>
                      {(animal.city || animal.canton) && (
                        <span>
                          📍 {animal.city || ""}{animal.city && animal.canton ? ", " : ""}{animal.canton || ""}
                        </span>
                      )}
                      {animal.gender !== "inconnu" && <span>{animal.gender === "male" ? "♂️" : "♀️"}</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
