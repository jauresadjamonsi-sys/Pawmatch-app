"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { createAnimal, uploadAnimalPhoto } from "@/lib/services/animals";
import { CANTONS } from "@/lib/cantons";
import { CITIES } from "@/lib/cities";
import { BREEDS } from "@/lib/breeds";
import { TRAITS } from "@/lib/traits";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAppContext } from "@/lib/contexts/AppContext";

const SPECIES_LIST = [
  { value: "chien", label: "🐕 Chien" },
  { value: "chat", label: "🐱 Chat" },
  { value: "lapin", label: "🐰 Lapin" },
  { value: "oiseau", label: "🐦 Oiseau" },
  { value: "rongeur", label: "🐹 Rongeur" },
  { value: "autre", label: "🐾 Autre" },
];

type PhotoEntry = { file: File; preview: string; tag: "with_owner" | "animal_only" };

export default function NewAnimalPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [species, setSpecies] = useState("chien");
  const [selectedCanton, setSelectedCanton] = useState("");
  const [customCity, setCustomCity] = useState(false);
  const [customBreed, setCustomBreed] = useState(false);
  const [selectedTraits, setSelectedTraits] = useState<string[]>([]);
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [dietType, setDietType] = useState("");
  const supabase = createClient();
  const router = useRouter();
  const { t } = useAppContext();

  const breedList = BREEDS[species] || [];
  const traitList = TRAITS[species] || [];
  const cantonCities = selectedCanton ? CITIES[selectedCanton] || [] : [];

  const hasOwnerPhoto = photos.some((p) => p.tag === "with_owner");

  function handleAddPhoto(e: React.ChangeEvent<HTMLInputElement>, tag: "with_owner" | "animal_only") {
    const file = e.target.files?.[0];
    if (!file || photos.length >= 5) return;
    setPhotos((prev) => [...prev, { file, preview: URL.createObjectURL(file), tag }]);
    e.target.value = "";
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  function toggleTrait(trait: string) {
    setSelectedTraits((prev) =>
      prev.includes(trait) ? prev.filter((t) => t !== trait) : [...prev, trait]
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!hasOwnerPhoto) {
      setError(t.animalPhotoWithOwner);
      return;
    }
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);

    // Upload all photos
    const uploadedUrls: string[] = [];
    for (const photo of photos) {
      const uploadResult = await uploadAnimalPhoto(supabase, photo.file);
      if (uploadResult.error) { setError(uploadResult.error); setLoading(false); return; }
      if (uploadResult.data) uploadedUrls.push(uploadResult.data);
    }

    const photo_url = uploadedUrls[0] || null;

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
      diet_type: dietType || null,
      food_brand: (form.get("food_brand") as string) || null,
      treats: (form.get("treats") as string) || null,
      allergies: (form.get("allergies") as string) || null,
      extra_photos: uploadedUrls.slice(1),
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
    <div className="min-h-screen px-4 py-6 pb-28">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-[var(--c-text)] mb-2">{t.animalAddTitle}</h1>
        <p className="text-[var(--c-text-muted)] text-sm mb-6">{t.animalAddSub}</p>

        <div className="bg-white/5 border border-[var(--c-border)] rounded-2xl p-6">
          {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Photos section */}
            <div>
              <label className="block text-sm font-medium text-[var(--c-text-muted)] mb-2">{t.animalPhoto} *</label>

              {/* Owner photo requirement banner */}
              <div className={"mb-3 p-3 rounded-xl border text-sm " + (hasOwnerPhoto ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-amber-500/10 border-amber-500/20 text-amber-400")}>
                <div className="font-bold mb-1">{t.animalPhotoWithOwner}</div>
                <div className="text-xs opacity-80">{t.animalPhotoWithOwnerHint}</div>
              </div>

              {/* Photo grid */}
              <div className="flex flex-wrap gap-3 mb-3">
                {photos.map((photo, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-[var(--c-border)]">
                    <Image src={photo.preview} alt={`photo-${i}`} fill className="object-cover" unoptimized sizes="80px" />
                    <span className={"absolute bottom-0 left-0 right-0 text-[9px] font-bold text-center py-0.5 " + (photo.tag === "with_owner" ? "bg-green-600 text-[var(--c-text)]" : "bg-white/80 text-gray-700")}>
                      {photo.tag === "with_owner" ? t.animalPhotoTagOwner : t.animalPhotoTagAnimal}
                    </span>
                    <button type="button" onClick={() => removePhoto(i)}
                      className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-[var(--c-text)] rounded-full text-xs font-bold flex items-center justify-center">×</button>
                  </div>
                ))}
                {photos.length === 0 && (
                  <div className="w-20 h-20 rounded-2xl bg-[var(--c-card)] border-2 border-dashed border-[var(--c-border)] flex items-center justify-center">
                    <span className="text-2xl text-[var(--c-text-muted)]">📷</span>
                  </div>
                )}
              </div>

              {/* Add photo buttons */}
              {photos.length < 5 && (
                <div className="space-y-2">
                  {/* With owner - highlighted if none yet */}
                  <div className={"flex gap-2 p-2 rounded-xl border " + (!hasOwnerPhoto ? "border-amber-500/40 bg-amber-500/5" : "border-[var(--c-border)] bg-white/5")}>
                    <span className="text-xs text-[var(--c-text-muted)] flex items-center gap-1 w-28 shrink-0">🤝 {t.animalPhotoTagOwner}</span>
                    <label className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-[var(--c-text-muted)] text-xs rounded-lg transition cursor-pointer border border-[var(--c-border)]">
                      {t.animalGallery}
                      <input type="file" accept="image/*" onChange={(e) => handleAddPhoto(e, "with_owner")} className="hidden" />
                    </label>
                    <label className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-[var(--c-text-muted)] text-xs rounded-lg transition cursor-pointer border border-[var(--c-border)]">
                      {t.animalCamera}
                      <input type="file" accept="image/*" capture="environment" onChange={(e) => handleAddPhoto(e, "with_owner")} className="hidden" />
                    </label>
                  </div>
                  {/* Animal only */}
                  <div className="flex gap-2 p-2 rounded-xl border border-[var(--c-border)] bg-white/5">
                    <span className="text-xs text-[var(--c-text-muted)] flex items-center gap-1 w-28 shrink-0">🐾 {t.animalPhotoTagAnimal}</span>
                    <label className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-[var(--c-text-muted)] text-xs rounded-lg transition cursor-pointer border border-[var(--c-border)]">
                      {t.animalGallery}
                      <input type="file" accept="image/*" onChange={(e) => handleAddPhoto(e, "animal_only")} className="hidden" />
                    </label>
                    <label className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-[var(--c-text-muted)] text-xs rounded-lg transition cursor-pointer border border-[var(--c-border)]">
                      {t.animalCamera}
                      <input type="file" accept="image/*" capture="environment" onChange={(e) => handleAddPhoto(e, "animal_only")} className="hidden" />
                    </label>
                  </div>
                </div>
              )}
              <p className="text-[10px] text-[var(--c-text-muted)] mt-1">{photos.length}/5 — {t.animalMaxPhotos}</p>
            </div>

            {/* Nom */}
            <div>
              <label className="block text-sm font-medium text-[var(--c-text-muted)] mb-1">{t.animalName} *</label>
              <input name="name" type="text" required
                className="w-full px-4 py-3 bg-white/5 border border-[var(--c-border)] rounded-xl text-[var(--c-text)] placeholder-[var(--c-text-muted)] focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition"
                placeholder="Comment s'appelle ton compagnon ?" />
            </div>

            {/* Espèce */}
            <div>
              <label className="block text-sm font-medium text-[var(--c-text-muted)] mb-2">{t.animalSpecies} *</label>
              <div className="grid grid-cols-3 gap-2">
                {SPECIES_LIST.map((s) => (
                  <button key={s.value} type="button" onClick={() => { setSpecies(s.value); setCustomBreed(false); setSelectedTraits([]); }}
                    className={"px-3 py-2 rounded-xl text-sm font-medium transition border " +
                      (species === s.value
                        ? "bg-orange-500/20 border-orange-500/50 text-orange-300"
                        : "bg-white/5 border-[var(--c-border)] text-[var(--c-text-muted)] hover:bg-white/10")
                    }>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Race */}
            <div>
              <label className="block text-sm font-medium text-[var(--c-text-muted)] mb-1">{t.animalBreed}</label>
              {customBreed ? (
                <input name="breed_custom" type="text"
                  className="w-full px-4 py-3 bg-white/5 border border-[var(--c-border)] rounded-xl text-[var(--c-text)] placeholder-[var(--c-text-muted)] focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition"
                  placeholder="Quelle race ?" />
              ) : (
                <select name="breed" onChange={(e) => { if (e.target.value === "__other") setCustomBreed(true); }}
                  className="w-full px-4 py-3 bg-white/5 border border-[var(--c-border)] rounded-xl text-[var(--c-text-muted)] focus:ring-2 focus:ring-orange-500 outline-none appearance-none">
                  <option value="" className="bg-[var(--c-deep)]">Sélectionner</option>
                  {breedList.map((b: string) => (
                    <option key={b} value={b} className="bg-[var(--c-deep)]">{b}</option>
                  ))}
                  <option value="__other" className="bg-[var(--c-deep)]">Autre race...</option>
                </select>
              )}
            </div>

            {/* Âge + Genre + Poids */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-[var(--c-text-muted)] mb-1">{t.animalAge}</label>
                <input name="age_months" type="number" min="0"
                  className="w-full px-4 py-3 bg-white/5 border border-[var(--c-border)] rounded-xl text-[var(--c-text)] focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--c-text-muted)] mb-1">{t.animalGender}</label>
                <select name="gender"
                  className="w-full px-4 py-3 bg-white/5 border border-[var(--c-border)] rounded-xl text-[var(--c-text-muted)] focus:ring-2 focus:ring-orange-500 outline-none appearance-none">
                  <option value="inconnu" className="bg-[var(--c-deep)]">{t.animalUnknown}</option>
                  <option value="male" className="bg-[var(--c-deep)]">{t.animalMale}</option>
                  <option value="femelle" className="bg-[var(--c-deep)]">{t.animalFemale}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--c-text-muted)] mb-1">{t.animalWeight}</label>
                <input name="weight_kg" type="number" step="0.1" min="0"
                  className="w-full px-4 py-3 bg-white/5 border border-[var(--c-border)] rounded-xl text-[var(--c-text)] focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition" />
              </div>
            </div>

            {/* Canton + Ville */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-[var(--c-text-muted)] mb-1">Canton</label>
                <select name="canton" value={selectedCanton} onChange={(e) => { setSelectedCanton(e.target.value); setCustomCity(false); }}
                  className="w-full px-4 py-3 bg-white/5 border border-[var(--c-border)] rounded-xl text-[var(--c-text-muted)] focus:ring-2 focus:ring-orange-500 outline-none appearance-none">
                  <option value="" className="bg-[var(--c-deep)]">Canton</option>
                  {CANTONS.map((c) => (
                    <option key={c.code} value={c.code} className="bg-[var(--c-deep)]">{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--c-text-muted)] mb-1">Ville</label>
                {customCity ? (
                  <input name="city_custom" type="text"
                    className="w-full px-4 py-3 bg-white/5 border border-[var(--c-border)] rounded-xl text-[var(--c-text)] placeholder-[var(--c-text-muted)] focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition"
                    placeholder="Votre ville" />
                ) : (
                  <select name="city" onChange={(e) => { if (e.target.value === "__other") setCustomCity(true); }}
                    className="w-full px-4 py-3 bg-white/5 border border-[var(--c-border)] rounded-xl text-[var(--c-text-muted)] focus:ring-2 focus:ring-orange-500 outline-none appearance-none">
                    <option value="" className="bg-[var(--c-deep)]">Ville</option>
                    {cantonCities.map((city: string) => (
                      <option key={city} value={city} className="bg-[var(--c-deep)]">{city}</option>
                    ))}
                    <option value="__other" className="bg-[var(--c-deep)]">Autre...</option>
                  </select>
                )}
              </div>
            </div>

            {/* Santé */}
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="vaccinated" className="w-4 h-4 rounded bg-white/5 border-[var(--c-border)] text-orange-500 focus:ring-orange-500" />
                <span className="text-sm text-[var(--c-text-muted)]">{t.animalVaccinated}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="sterilized" className="w-4 h-4 rounded bg-white/5 border-[var(--c-border)] text-orange-500 focus:ring-orange-500" />
                <span className="text-sm text-[var(--c-text-muted)]">{t.animalSterilized}</span>
              </label>
            </div>

            {/* Traits */}
            {traitList.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-[var(--c-text-muted)] mb-2">{t.animalCharacter}</label>
                <div className="flex flex-wrap gap-2">
                  {traitList.map((trait: string) => (
                    <button key={trait} type="button" onClick={() => toggleTrait(trait)}
                      className={"px-3 py-1.5 rounded-full text-xs font-medium transition border " +
                        (selectedTraits.includes(trait)
                          ? "bg-orange-500/20 border-orange-500/50 text-orange-300"
                          : "bg-white/5 border-[var(--c-border)] text-[var(--c-text-muted)] hover:bg-white/10")
                      }>
                      {trait}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Alimentation */}
            <div className="border-t border-[var(--c-border)] pt-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🍖</span>
                <label className="text-sm font-bold text-[var(--c-text)]">{t.dietTitle}</label>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-400 font-bold">{t.dietNew}</span>
              </div>

              {/* Type d'alimentation */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-[var(--c-text-muted)] mb-2">{t.dietType}</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "croquettes", label: `🥣 ${t.dietCroquettes}` },
                    { value: "barf", label: `🥩 ${t.dietBarf}` },
                    { value: "patee", label: `🥫 ${t.dietPatee}` },
                    { value: "mixte", label: `🔄 ${t.dietMixte}` },
                    { value: "fait_maison", label: `👨‍🍳 ${t.dietHomemade}` },
                    { value: "autre", label: `🍽️ ${t.dietOther}` },
                  ].map((d) => (
                    <button key={d.value} type="button"
                      onClick={() => setDietType((prev) => prev === d.value ? "" : d.value)}
                      className={"px-3 py-2 rounded-xl text-sm font-medium transition border " +
                        (dietType === d.value
                          ? "bg-teal-500/20 border-teal-500/50 text-teal-300"
                          : "bg-white/5 border-[var(--c-border)] text-[var(--c-text-muted)] hover:bg-white/10")
                      }>
                      {d.label}
                    </button>
                  ))}
                </div>
                <input type="hidden" name="diet_type" value={dietType} />
              </div>

              {/* Marque de nourriture */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-[var(--c-text-muted)] mb-1">{t.dietBrand}</label>
                <input name="food_brand" type="text"
                  className="w-full px-4 py-3 bg-white/5 border border-[var(--c-border)] rounded-xl text-[var(--c-text)] placeholder-[var(--c-text-muted)] focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition"
                  placeholder={t.dietBrandPlaceholder} />
              </div>

              {/* Friandises */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-[var(--c-text-muted)] mb-1">{t.dietTreats}</label>
                <input name="treats" type="text"
                  className="w-full px-4 py-3 bg-white/5 border border-[var(--c-border)] rounded-xl text-[var(--c-text)] placeholder-[var(--c-text-muted)] focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition"
                  placeholder={t.dietTreatsPlaceholder} />
              </div>

              {/* Allergies */}
              <div>
                <label className="block text-sm font-medium text-[var(--c-text-muted)] mb-1">{t.dietAllergies}</label>
                <input name="allergies" type="text"
                  className="w-full px-4 py-3 bg-white/5 border border-[var(--c-border)] rounded-xl text-[var(--c-text)] placeholder-[var(--c-text-muted)] focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition"
                  placeholder={t.dietAllergiesPlaceholder} />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-[var(--c-text-muted)] mb-1">{t.animalDescription}</label>
              <textarea name="description" rows={3}
                className="w-full px-4 py-3 bg-white/5 border border-[var(--c-border)] rounded-xl text-[var(--c-text)] placeholder-[var(--c-text-muted)] focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition resize-none"
                placeholder="Décris ton compagnon en quelques mots..." />
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading || !hasOwnerPhoto}
              className={"w-full py-3 font-semibold rounded-xl transition text-lg " +
                (hasOwnerPhoto
                  ? "bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50"
                  : "bg-gray-600 text-[var(--c-text-muted)] cursor-not-allowed")
              }>
              {loading ? t.animalCreating : !hasOwnerPhoto ? t.animalPhotoWithOwner : t.animalAddButton}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
