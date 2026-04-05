"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { createAnimal, uploadAnimalPhoto } from "@/lib/services/animals";
import { CANTONS } from "@/lib/cantons";
import { CITIES } from "@/lib/cities";
import { BREEDS } from "@/lib/breeds";
import { TRAITS } from "@/lib/traits";
import { useRouter } from "next/navigation";

const SPECIES_LIST = [
  { value: "chien", label: "🐕 Chien" },
  { value: "chat", label: "🐱 Chat" },
  { value: "lapin", label: "🐰 Lapin" },
  { value: "oiseau", label: "🐦 Oiseau" },
  { value: "rongeur", label: "🐹 Rongeur" },
  { value: "autre", label: "🐾 Autre" },
];

export default function NewAnimalPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [species, setSpecies] = useState("chien");
  const [selectedCanton, setSelectedCanton] = useState("");
  const [customCity, setCustomCity] = useState(false);
  const [customBreed, setCustomBreed] = useState(false);
  const [selectedTraits, setSelectedTraits] = useState<string[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  const breedList = BREEDS[species] || [];
  const traitList = TRAITS[species] || [];
  const cantonCities = selectedCanton ? CITIES[selectedCanton] || [] : [];

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  }

  function toggleTrait(trait: string) {
    setSelectedTraits((prev) =>
      prev.includes(trait) ? prev.filter((t) => t !== trait) : [...prev, trait]
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    let photo_url = null;

    if (photoFile) {
      const uploadResult = await uploadAnimalPhoto(supabase, photoFile);
      if (uploadResult.error) { setError(uploadResult.error); setLoading(false); return; }
      photo_url = uploadResult.data;
    }

    const breed = customBreed
      ? (form.get("breed_custom") as string) || null
      : (form.get("breed") as string) || null;

    const city = customCity
      ? (form.get("city_custom") as string) || null
      : (form.get("city") as string) || null;

    const { data: { user } } = await supabase.auth.getUser();

    // Check animal limit
    const { data: profileData } = await supabase.from("profiles").select("subscription").eq("id", user?.id).single();
    const { checkAnimalLimit } = await import("@/lib/services/limits");
    const limitCheck = await checkAnimalLimit(supabase, user?.id || "", profileData?.subscription || "free");
    if (!limitCheck.allowed) { setError(limitCheck.error || "Limite atteinte"); setLoading(false); return; }
    const result = await createAnimal(supabase, {
      name: form.get("name") as string,
      species,
      breed,
      age_months: form.get("age_months") ? Number(form.get("age_months")) : null,
      gender: form.get("gender") as string,
      description: (form.get("description") as string) || null,
      photo_url,
      city,
      canton: (form.get("canton") as string) || null,
      weight_kg: form.get("weight_kg") ? Number(form.get("weight_kg")) : null,
      vaccinated: form.get("vaccinated") === "on",
      sterilized: form.get("sterilized") === "on",
      traits: selectedTraits,
    }, user?.id);

    if (result.error) { setError(result.error); setLoading(false); return; }
    // If this is the user's first animal, redirect to flairer for immediate engagement
    const { count } = await supabase.from("animals").select("*", { count: "exact", head: true }).eq("created_by", user?.id);
    if (count && count <= 1) {
      router.push("/flairer");
    } else {
      router.push("/profile");
    }
  }

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-white mb-2">Ajouter mon compagnon</h1>
        <p className="text-gray-400 text-sm mb-6">Crée le profil de ton animal pour commencer à flairer</p>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Photo */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Photo</label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-[#2a1f3a] border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden">
                  {photoPreview ? (
                    <img src={photoPreview} alt="preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl text-gray-600">📷</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <label className="px-4 py-2 bg-white/10 hover:bg-white/20 text-gray-300 text-sm rounded-xl transition cursor-pointer border border-white/10">
                    Galerie
                    <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                  </label>
                  <label className="px-4 py-2 bg-white/10 hover:bg-white/20 text-gray-300 text-sm rounded-xl transition cursor-pointer border border-white/10">
                    Caméra
                    <input type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} className="hidden" />
                  </label>
                </div>
              </div>
            </div>

            {/* Nom */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Nom *</label>
              <input name="name" type="text" required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition"
                placeholder="Comment s'appelle ton compagnon ?" />
            </div>

            {/* Espèce */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Espèce *</label>
              <div className="grid grid-cols-3 gap-2">
                {SPECIES_LIST.map((s) => (
                  <button key={s.value} type="button" onClick={() => { setSpecies(s.value); setCustomBreed(false); setSelectedTraits([]); }}
                    className={"px-3 py-2 rounded-xl text-sm font-medium transition border " +
                      (species === s.value
                        ? "bg-orange-500/20 border-orange-500/50 text-orange-300"
                        : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10")
                    }>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Race */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Race</label>
              {customBreed ? (
                <input name="breed_custom" type="text"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition"
                  placeholder="Quelle race ?" />
              ) : (
                <select name="breed" onChange={(e) => { if (e.target.value === "__other") setCustomBreed(true); }}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-300 focus:ring-2 focus:ring-orange-500 outline-none appearance-none">
                  <option value="" className="bg-[#1a1225]">Sélectionner</option>
                  {breedList.map((b: string) => (
                    <option key={b} value={b} className="bg-[#1a1225]">{b}</option>
                  ))}
                  <option value="__other" className="bg-[#1a1225]">Autre race...</option>
                </select>
              )}
            </div>

            {/* Âge + Genre + Poids */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Âge (mois)</label>
                <input name="age_months" type="number" min="0"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Genre</label>
                <select name="gender"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-300 focus:ring-2 focus:ring-orange-500 outline-none appearance-none">
                  <option value="inconnu" className="bg-[#1a1225]">Inconnu</option>
                  <option value="male" className="bg-[#1a1225]">Mâle</option>
                  <option value="femelle" className="bg-[#1a1225]">Femelle</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Poids (kg)</label>
                <input name="weight_kg" type="number" step="0.1" min="0"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition" />
              </div>
            </div>

            {/* Canton + Ville */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Canton</label>
                <select name="canton" value={selectedCanton} onChange={(e) => { setSelectedCanton(e.target.value); setCustomCity(false); }}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-300 focus:ring-2 focus:ring-orange-500 outline-none appearance-none">
                  <option value="" className="bg-[#1a1225]">Canton</option>
                  {CANTONS.map((c) => (
                    <option key={c.code} value={c.code} className="bg-[#1a1225]">{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Ville</label>
                {customCity ? (
                  <input name="city_custom" type="text"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition"
                    placeholder="Votre ville" />
                ) : (
                  <select name="city" onChange={(e) => { if (e.target.value === "__other") setCustomCity(true); }}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-300 focus:ring-2 focus:ring-orange-500 outline-none appearance-none">
                    <option value="" className="bg-[#1a1225]">Ville</option>
                    {cantonCities.map((city: string) => (
                      <option key={city} value={city} className="bg-[#1a1225]">{city}</option>
                    ))}
                    <option value="__other" className="bg-[#1a1225]">Autre...</option>
                  </select>
                )}
              </div>
            </div>

            {/* Santé */}
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="vaccinated" className="w-4 h-4 rounded bg-white/5 border-white/10 text-orange-500 focus:ring-orange-500" />
                <span className="text-sm text-gray-300">Vacciné</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="sterilized" className="w-4 h-4 rounded bg-white/5 border-white/10 text-orange-500 focus:ring-orange-500" />
                <span className="text-sm text-gray-300">Stérilisé</span>
              </label>
            </div>

            {/* Traits */}
            {traitList.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Caractère</label>
                <div className="flex flex-wrap gap-2">
                  {traitList.map((trait: string) => (
                    <button key={trait} type="button" onClick={() => toggleTrait(trait)}
                      className={"px-3 py-1.5 rounded-full text-xs font-medium transition border " +
                        (selectedTraits.includes(trait)
                          ? "bg-orange-500/20 border-orange-500/50 text-orange-300"
                          : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10")
                      }>
                      {trait}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
              <textarea name="description" rows={3}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition resize-none"
                placeholder="Décris ton compagnon en quelques mots..." />
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition disabled:opacity-50 text-lg">
              {loading ? "Création..." : "Ajouter mon compagnon"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
