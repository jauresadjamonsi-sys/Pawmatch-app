"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { uploadAnimalPhoto } from "@/lib/services/animals";
import { validateAnimal } from "@/lib/validations/animal";
import { BREEDS } from "@/lib/breeds";
import { CANTONS } from "@/lib/cantons";
import { CITIES } from "@/lib/cities";
import { TRAITS } from "@/lib/traits";

const SPECIES = ["chien", "chat", "lapin", "oiseau", "rongeur", "autre"];
const GENDERS = ["male", "femelle", "inconnu"];

export default function NewMyAnimalPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [selectedSpecies, setSelectedSpecies] = useState("chien");
  const [selectedCanton, setSelectedCanton] = useState("");
  const [customBreed, setCustomBreed] = useState(false);
  const [customCity, setCustomCity] = useState(false);
  const [selectedTraits, setSelectedTraits] = useState<string[]>([]);
  const router = useRouter();
  const supabase = createClient();
  const { profile, loading: authLoading, isAuthenticated } = useAuth();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPreview(URL.createObjectURL(file));
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

    let photo_url: string | null = null;

    if (photoFile) {
      const uploadResult = await uploadAnimalPhoto(supabase, photoFile);
      if (uploadResult.error) {
        setError(uploadResult.error);
        setLoading(false);
        return;
      }
      photo_url = uploadResult.data;
    }

    const breed = customBreed
      ? (form.get("breed_custom") as string) || null
      : (form.get("breed") as string) || null;

    const city = customCity
      ? (form.get("city_custom") as string) || null
      : (form.get("city") as string) || null;

    const animalData = {
      name: form.get("name") as string,
      species: form.get("species") as string,
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
    };

    const { error: validationError } = validateAnimal(animalData);
    if (validationError) {
      setError(validationError);
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from("animals").insert({
      ...animalData,
      created_by: profile?.id,
    });

    if (insertError) {
      setError("Erreur lors de la creation: " + insertError.message);
      setLoading(false);
      return;
    }

    router.push("/profile");
  }

  if (authLoading) {
    return <p className="text-center py-12 text-gray-500">Chargement...</p>;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Connexion requise</h2>
          <p className="text-gray-600">Connectez-vous pour ajouter votre compagnon.</p>
        </div>
      </div>
    );
  }

  const breedsList = BREEDS[selectedSpecies] || [];
  const traitsList = TRAITS[selectedSpecies] || [];
  const citiesList = selectedCanton ? (CITIES[selectedCanton] || []) : [];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Ajouter mon compagnon</h1>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                <input name="name" type="text" required className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none" placeholder="Rex" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Espece *</label>
                <select name="species" required value={selectedSpecies} onChange={(e) => { setSelectedSpecies(e.target.value); setCustomBreed(false); setSelectedTraits([]); }} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none">
                  {SPECIES.map((s) => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Race</label>
              {!customBreed ? (
                <div className="flex gap-2">
                  <select name="breed" className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none">
                    <option value="">-- Selectionner une race --</option>
                    {breedsList.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => setCustomBreed(true)} className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition text-sm font-medium whitespace-nowrap">
                    Autre
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input name="breed_custom" type="text" className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none" placeholder="Saisir la race manuellement" />
                  <button type="button" onClick={() => setCustomBreed(false)} className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition text-sm font-medium whitespace-nowrap">
                    Liste
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Genre</label>
                <select name="gender" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none">
                  {GENDERS.map((g) => (
                    <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Canton</label>
                <select name="canton" value={selectedCanton} onChange={(e) => { setSelectedCanton(e.target.value); setCustomCity(false); }} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none">
                  <option value="">-- Selectionner --</option>
                  {CANTONS.map((c) => (
                    <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
              {!selectedCanton ? (
                <p className="text-sm text-gray-400 px-4 py-3 border border-gray-200 rounded-xl bg-gray-50">Selectionnez d'abord un canton</p>
              ) : !customCity ? (
                <div className="flex gap-2">
                  <select name="city" className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none">
                    <option value="">-- Selectionner une ville --</option>
                    {citiesList.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => setCustomCity(true)} className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition text-sm font-medium whitespace-nowrap">
                    Autre
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input name="city_custom" type="text" className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none" placeholder="Saisir la ville manuellement" />
                  <button type="button" onClick={() => setCustomCity(false)} className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition text-sm font-medium whitespace-nowrap">
                    Liste
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Age (mois)</label>
                <input name="age_months" type="number" min="0" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none" placeholder="12" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Poids (kg)</label>
                <input name="weight_kg" type="number" step="0.1" min="0" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none" placeholder="5.2" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Traits de caractere</label>
              <div className="flex flex-wrap gap-2">
                {traitsList.map((trait) => (
                  <button
                    key={trait}
                    type="button"
                    onClick={() => toggleTrait(trait)}
                    className={"px-3 py-1.5 rounded-full text-sm font-medium transition " + (selectedTraits.includes(trait) ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}
                  >
                    {trait}
                  </button>
                ))}
              </div>
              {selectedTraits.length > 0 && (
                <p className="text-xs text-gray-400 mt-2">{selectedTraits.length} trait{selectedTraits.length > 1 ? "s" : ""} selectionne{selectedTraits.length > 1 ? "s" : ""}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Photo</label>
              {preview ? (
                <div className="relative">
                  <img src={preview} alt="Preview" className="w-full max-h-64 object-cover rounded-xl" />
                  <button type="button" onClick={() => { setPreview(null); setPhotoFile(null); }} className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 transition">✕</button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => document.getElementById("photo-gallery")?.click()} className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-orange-400 transition cursor-pointer">
                    <p className="text-3xl mb-2">🖼️</p>
                    <p className="text-gray-600 text-sm font-medium">Galerie photo</p>
                  </button>
                  <button type="button" onClick={() => document.getElementById("photo-camera")?.click()} className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-orange-400 transition cursor-pointer">
                    <p className="text-3xl mb-2">📸</p>
                    <p className="text-gray-600 text-sm font-medium">Prendre une photo</p>
                  </button>
                </div>
              )}
              <input id="photo-gallery" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} className="hidden" />
              <input id="photo-camera" type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea name="description" rows={4} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none resize-none" placeholder="Parlez-nous de votre compagnon..." />
            </div>

            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input name="vaccinated" type="checkbox" className="w-5 h-5 rounded text-orange-500 focus:ring-orange-500" />
                <span className="text-sm text-gray-700">Vaccine</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input name="sterilized" type="checkbox" className="w-5 h-5 rounded text-orange-500 focus:ring-orange-500" />
                <span className="text-sm text-gray-700">Sterilise</span>
              </label>
            </div>

            <button type="submit" disabled={loading} className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition disabled:opacity-50">
              {loading ? "Ajout en cours..." : "Ajouter mon compagnon"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
