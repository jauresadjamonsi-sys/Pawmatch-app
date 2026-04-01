"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { getAnimalById, updateAnimal, deleteAnimal, uploadAnimalPhoto, AnimalRow } from "@/lib/services/animals";
import { BREEDS } from "@/lib/breeds";
import { CANTONS } from "@/lib/cantons";
import { CITIES } from "@/lib/cities";
import { TRAITS } from "@/lib/traits";

const SPECIES = ["chien", "chat", "lapin", "oiseau", "rongeur", "autre"];
const GENDERS = ["male", "femelle", "inconnu"];
const STATUSES = [
  { value: "disponible", label: "Disponible" },
  { value: "en_cours", label: "En cours" },
  { value: "adopte", label: "Matche" },
];

export default function EditAnimalPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [animal, setAnimal] = useState<AnimalRow | null>(null);
  const [selectedSpecies, setSelectedSpecies] = useState("chien");
  const [selectedCanton, setSelectedCanton] = useState("");
  const [customBreed, setCustomBreed] = useState(false);
  const [customCity, setCustomCity] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [selectedTraits, setSelectedTraits] = useState<string[]>([]);
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();
  const { isAdmin, loading: authLoading } = useAuth();

  useEffect(() => {
    async function fetchAnimal() {
      const id = params.id as string;
      const result = await getAnimalById(supabase, id);
      if (result.data) {
        setAnimal(result.data);
        setSelectedSpecies(result.data.species);
        setSelectedCanton(result.data.canton || "");
        if (result.data.photo_url) setPreview(result.data.photo_url);
        if (result.data.traits) setSelectedTraits(result.data.traits);
        const breedsList = BREEDS[result.data.species] || [];
        if (result.data.breed && !breedsList.includes(result.data.breed)) {
          setCustomBreed(true);
        }
        if (result.data.canton && result.data.city) {
          const citiesList = CITIES[result.data.canton] || [];
          if (!citiesList.includes(result.data.city)) {
            setCustomCity(true);
          }
        }
      } else {
        setError(result.error);
      }
      setLoading(false);
    }
    fetchAnimal();
  }, [params.id]);

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
    setSaving(true);
    setError(null);

    const form = new FormData(e.currentTarget);

    let photo_url = animal?.photo_url || null;

    if (photoFile) {
      const uploadResult = await uploadAnimalPhoto(supabase, photoFile);
      if (uploadResult.error) {
        setError(uploadResult.error);
        setSaving(false);
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

    const id = params.id as string;
    const result = await updateAnimal(supabase, id, {
      name: form.get("name") as string,
      species: form.get("species") as string,
      breed,
      age_months: form.get("age_months") ? Number(form.get("age_months")) : null,
      gender: form.get("gender") as string,
      status: form.get("status") as string,
      description: (form.get("description") as string) || null,
      photo_url,
      city,
      canton: (form.get("canton") as string) || null,
      weight_kg: form.get("weight_kg") ? Number(form.get("weight_kg")) : null,
      vaccinated: form.get("vaccinated") === "on",
      sterilized: form.get("sterilized") === "on",
      traits: selectedTraits,
    });

    if (result.error) {
      setError(result.error);
      setSaving(false);
      return;
    }

    router.push("/animals/" + id);
  }

  async function handleDelete() {
    if (!confirm("Supprimer cet animal ? Cette action est irreversible.")) return;

    const id = params.id as string;
    const result = await deleteAnimal(supabase, id);

    if (result.error) {
      setError(result.error);
      return;
    }

    router.push("/animals");
  }

  if (authLoading || loading) {
    return <p className="text-center py-12 text-gray-500">Chargement...</p>;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Acces refuse</h2>
          <p className="text-gray-600">Seuls les administrateurs peuvent modifier les animaux.</p>
        </div>
      </div>
    );
  }

  if (!animal) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Animal introuvable</h2>
          <p className="text-gray-600">Cet animal n'existe pas ou a ete supprime.</p>
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
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Modifier {animal.name}</h1>

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
                <input name="name" type="text" required defaultValue={animal.name} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none" />
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
                  <select name="breed" defaultValue={animal.breed || ""} className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none">
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
                  <input name="breed_custom" type="text" defaultValue={animal.breed || ""} className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none" placeholder="Saisir la race manuellement" />
                  <button type="button" onClick={() => setCustomBreed(false)} className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition text-sm font-medium whitespace-nowrap">
                    Liste
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Genre</label>
                <select name="gender" defaultValue={animal.gender} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none">
                  {GENDERS.map((g) => (
                    <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                <select name="status" defaultValue={animal.status} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none">
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Canton</label>
                <select name="canton" value={selectedCanton} onChange={(e) => { setSelectedCanton(e.target.value); setCustomCity(false); }} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none">
                  <option value="">-- Selectionner --</option>
                  {CANTONS.map((c) => (
                    <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
                {!selectedCanton ? (
                  <p className="text-sm text-gray-400 px-4 py-3 border border-gray-200 rounded-xl bg-gray-50">Selectionnez un canton</p>
                ) : !customCity ? (
                  <div className="flex gap-2">
                    <select name="city" defaultValue={animal.city || ""} className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none">
                      <option value="">-- Selectionner --</option>
                      {citiesList.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <button type="button" onClick={() => setCustomCity(true)} className="px-3 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition text-xs font-medium">
                      Autre
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input name="city_custom" type="text" defaultValue={animal.city || ""} className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none" placeholder="Saisir la ville" />
                    <button type="button" onClick={() => setCustomCity(false)} className="px-3 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition text-xs font-medium">
                      Liste
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Age (mois)</label>
                <input name="age_months" type="number" min="0" defaultValue={animal.age_months || ""} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Poids (kg)</label>
                <input name="weight_kg" type="number" step="0.1" min="0" defaultValue={animal.weight_kg || ""} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none" />
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
              <textarea name="description" rows={4} defaultValue={animal.description || ""} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none resize-none" />
            </div>

            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input name="vaccinated" type="checkbox" defaultChecked={animal.vaccinated} className="w-5 h-5 rounded text-orange-500 focus:ring-orange-500" />
                <span className="text-sm text-gray-700">Vaccine</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input name="sterilized" type="checkbox" defaultChecked={animal.sterilized} className="w-5 h-5 rounded text-orange-500 focus:ring-orange-500" />
                <span className="text-sm text-gray-700">Sterilise</span>
              </label>
            </div>

            <button type="submit" disabled={saving} className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition disabled:opacity-50">
              {saving ? "Sauvegarde..." : "Sauvegarder les modifications"}
            </button>
          </form>

          <button onClick={handleDelete} className="w-full mt-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 font-semibold rounded-xl transition">
            Supprimer cet animal
          </button>
        </div>
      </div>
    </div>
  );
}
