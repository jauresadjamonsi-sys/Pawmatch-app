"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateAnimal, getAnimalById, uploadAnimalPhoto } from "@/lib/services/animals";
import { CANTONS } from "@/lib/cantons";
import { CITIES } from "@/lib/cities";
import { BREEDS } from "@/lib/breeds";
import { TRAITS } from "@/lib/traits";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { useAppContext } from "@/lib/contexts/AppContext";
import ImageCropper from "@/lib/components/ImageCropper";

const SPECIES_LIST = [
  { value: "chien", label: "🐕 Chien" },
  { value: "chat", label: "🐱 Chat" },
  { value: "lapin", label: "🐰 Lapin" },
  { value: "oiseau", label: "🐦 Oiseau" },
  { value: "rongeur", label: "🐹 Rongeur" },
  { value: "autre", label: "🐾 Autre" },
];

type PhotoEntry = { url?: string; file?: File; preview: string; tag: "with_owner" | "animal_only" };

export default function EditAnimalPage() {
  const [animal, setAnimal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
  const params = useParams();
  const { t } = useAppContext();

  const hasOwnerPhoto = photos.some((p) => p.tag === "with_owner");

  // Crop state
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropTag, setCropTag] = useState<"with_owner" | "animal_only">("animal_only");

  useEffect(() => {
    async function load() {
      const result = await getAnimalById(supabase, params.id as string);
      if (result.data) {
        const a = result.data;
        setAnimal(a);
        setSpecies(a.species);
        setSelectedTraits(a.traits || []);
        setSelectedCanton(a.canton || "");
        setDietType(a.diet_type || "");

        // Load existing photos
        const existingPhotos: PhotoEntry[] = [];
        if (a.photo_url) {
          // Assume main photo is with_owner if it already existed (existing users get grace)
          existingPhotos.push({ url: a.photo_url, preview: a.photo_url, tag: "with_owner" });
        }
        if ((a as any).extra_photos?.length) {
          for (const url of (a as any).extra_photos) {
            existingPhotos.push({ url, preview: url, tag: "animal_only" });
          }
        }
        setPhotos(existingPhotos);

        if (a.city && a.canton) {
          const cities = CITIES[a.canton] || [];
          if (!cities.includes(a.city)) setCustomCity(true);
        }
        if (a.breed) {
          const breeds = BREEDS[a.species] || [];
          if (!breeds.includes(a.breed)) setCustomBreed(true);
        }
      }
      setLoading(false);
    }
    load();
  }, [params.id]);

  function handleAddPhoto(e: React.ChangeEvent<HTMLInputElement>, tag: "with_owner" | "animal_only") {
    const file = e.target.files?.[0];
    if (!file || photos.length >= 5) return;
    setCropFile(file);
    setCropTag(tag);
    e.target.value = "";
  }

  function handleCropConfirm(blob: Blob) {
    const file = new File([blob], "cropped.jpg", { type: "image/jpeg" });
    setPhotos((prev) => [...prev, { file, preview: URL.createObjectURL(blob), tag: cropTag }]);
    setCropFile(null);
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  function toggleTrait(trait: string) {
    setSelectedTraits((prev) => prev.includes(trait) ? prev.filter((t) => t !== trait) : [...prev, trait]);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!hasOwnerPhoto) {
      setError(t.animalPhotoWithOwner);
      return;
    }
    setSaving(true);
    setError(null);

    const form = new FormData(e.currentTarget);

    // Upload new photos, keep existing URLs
    const uploadedUrls: string[] = [];
    for (const photo of photos) {
      if (photo.url) {
        uploadedUrls.push(photo.url);
      } else if (photo.file) {
        const uploadResult = await uploadAnimalPhoto(supabase, photo.file);
        if (uploadResult.error) { setError(uploadResult.error); setSaving(false); return; }
        if (uploadResult.data) uploadedUrls.push(uploadResult.data);
      }
    }

    const photo_url = uploadedUrls[0] || null;

    const breed = customBreed ? (form.get("breed_custom") as string) || null : (form.get("breed") as string) || null;
    const city = customCity ? (form.get("city_custom") as string) || null : (form.get("city") as string) || null;

    const result = await updateAnimal(supabase, params.id as string, {
      name: form.get("name") as string,
      species,
      breed,
      age_months: (form.get("age_years") || form.get("age_extra_months"))
        ? (parseInt(form.get("age_years") as string || "0", 10) * 12 +
           parseInt(form.get("age_extra_months") as string || "0", 10))
        : null,
      gender: form.get("gender") as string,
      description: (form.get("description") as string) || null,
      photo_url,
      city,
      canton: (form.get("canton") as string) || null,
      weight_kg: form.get("weight_kg") ? Number(form.get("weight_kg")) : null,
      vaccinated: form.get("vaccinated") === "on",
      sterilized: form.get("sterilized") === "on",
      pedigree: (form.get("pedigree") as string) || null,
      traits: selectedTraits,
      extra_photos: uploadedUrls.slice(1),
      diet_type: dietType || null,
      food_brand: (form.get("food_brand") as string) || null,
      treats: (form.get("treats") as string) || null,
      allergies: (form.get("allergies") as string) || null,
    });

    if (result.error) { setError(result.error); setSaving(false); return; }
    router.push("/animals/" + params.id);
  }

  if (loading) return <p className="text-center py-12 text-[var(--c-text-muted)]">Chargement...</p>;
  if (!animal) return <p className="text-center py-12 text-[var(--c-text-muted)]">Animal introuvable</p>;

  const breedList = BREEDS[species] || [];
  const traitList = TRAITS[species] || [];
  const cantonCities = selectedCanton ? CITIES[selectedCanton] || [] : [];

  return (
    <div className="min-h-screen px-4 py-6 pb-28">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => window.history.length > 1 ? window.history.back() : (window.location.href = "/feed")} aria-label="Retour" className="inline-flex items-center justify-center w-9 h-9 rounded-full transition-all active:scale-90 flex-shrink-0" style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--c-text)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <h1 className="text-2xl font-bold text-[var(--c-text)]">{t.animalSaveButton} — {animal.name}</h1>
        </div>
        <p className="text-[var(--c-text-muted)] text-sm mb-6 ml-12">{t.animalAddSub}</p>

        <div className="bg-[var(--c-card)] border border-[var(--c-border)] rounded-2xl p-6">
          {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Photos section */}
            <div>
              <label className="block text-sm font-medium text-[var(--c-text-muted)] mb-2">{t.animalPhoto} *</label>

              {/* Owner photo requirement banner */}
              <div className={"mb-3 p-3 rounded-xl border text-sm " + (hasOwnerPhoto ? "bg-amber-500/10 border-amber-500/20 text-amber-400" : "bg-amber-500/10 border-amber-500/20 text-amber-400")}>
                <div className="font-bold mb-1">{t.animalPhotoWithOwner}</div>
                <div className="text-xs opacity-80">{t.animalPhotoWithOwnerHint}</div>
              </div>

              {/* Photo grid */}
              <div className="flex flex-wrap gap-3 mb-3">
                {photos.map((photo, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-[var(--c-border)]">
                    <Image src={photo.preview} alt={`photo-${i}`} fill className="object-cover" unoptimized sizes="80px" />
                    <span className={"absolute bottom-0 left-0 right-0 text-[9px] font-bold text-center py-0.5 " + (photo.tag === "with_owner" ? "bg-amber-600 text-[var(--c-text)]" : "bg-[var(--c-card)] text-gray-700")}>
                      {photo.tag === "with_owner" ? t.animalPhotoTagOwner : t.animalPhotoTagAnimal}
                    </span>
                    <button type="button" onClick={() => removePhoto(i)}
                      className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-[var(--c-text)] rounded-full text-xs font-bold flex items-center justify-center">×</button>
                  </div>
                ))}
              </div>

              {/* Add photo buttons */}
              {photos.length < 5 && (
                <div className="space-y-2">
                  <div className={"flex gap-2 p-2 rounded-xl border " + (!hasOwnerPhoto ? "border-amber-500/40 bg-amber-500/5" : "border-[var(--c-border)] bg-[var(--c-card)]")}>
                    <span className="text-xs text-[var(--c-text-muted)] flex items-center gap-1 w-28 shrink-0">🤝 {t.animalPhotoTagOwner}</span>
                    <label className="px-3 py-1.5 bg-[var(--c-card)] hover:bg-[var(--c-card)] text-[var(--c-text-muted)] text-xs rounded-lg transition cursor-pointer border border-[var(--c-border)]">
                      {t.animalGallery}
                      <input type="file" accept="image/*" onChange={(e) => handleAddPhoto(e, "with_owner")} className="hidden" />
                    </label>
                    <label className="px-3 py-1.5 bg-[var(--c-card)] hover:bg-[var(--c-card)] text-[var(--c-text-muted)] text-xs rounded-lg transition cursor-pointer border border-[var(--c-border)]">
                      {t.animalCamera}
                      <input type="file" accept="image/*" onChange={(e) => handleAddPhoto(e, "with_owner")} className="hidden" />
                    </label>
                  </div>
                  <div className="flex gap-2 p-2 rounded-xl border border-[var(--c-border)] bg-[var(--c-card)]">
                    <span className="text-xs text-[var(--c-text-muted)] flex items-center gap-1 w-28 shrink-0">🐾 {t.animalPhotoTagAnimal}</span>
                    <label className="px-3 py-1.5 bg-[var(--c-card)] hover:bg-[var(--c-card)] text-[var(--c-text-muted)] text-xs rounded-lg transition cursor-pointer border border-[var(--c-border)]">
                      {t.animalGallery}
                      <input type="file" accept="image/*" onChange={(e) => handleAddPhoto(e, "animal_only")} className="hidden" />
                    </label>
                    <label className="px-3 py-1.5 bg-[var(--c-card)] hover:bg-[var(--c-card)] text-[var(--c-text-muted)] text-xs rounded-lg transition cursor-pointer border border-[var(--c-border)]">
                      {t.animalCamera}
                      <input type="file" accept="image/*" onChange={(e) => handleAddPhoto(e, "animal_only")} className="hidden" />
                    </label>
                  </div>
                </div>
              )}
              <p className="text-[10px] text-[var(--c-text-muted)] mt-1">{photos.length}/5 — {t.animalMaxPhotos}</p>
            </div>

            {/* Nom */}
            <div>
              <label className="block text-sm font-medium text-[var(--c-text-muted)] mb-1">{t.animalName} *</label>
              <input name="name" type="text" required defaultValue={animal.name}
                className="w-full px-4 py-3 bg-[var(--c-card)] border border-[var(--c-border)] rounded-xl text-[var(--c-text)] focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition" />
            </div>

            {/* Espèce */}
            <div>
              <label className="block text-sm font-medium text-[var(--c-text-muted)] mb-2">{t.animalSpecies} *</label>
              <div className="grid grid-cols-3 gap-2">
                {SPECIES_LIST.map((s) => (
                  <button key={s.value} type="button" onClick={() => { setSpecies(s.value); setCustomBreed(false); setSelectedTraits([]); }}
                    className={"px-3 py-2 rounded-xl text-sm font-medium transition border " +
                      (species === s.value ? "bg-amber-500/20 border-amber-500/50 text-amber-300" : "bg-[var(--c-card)] border-[var(--c-border)] text-[var(--c-text-muted)] hover:bg-[var(--c-card)]")}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Race */}
            <div>
              <label className="block text-sm font-medium text-[var(--c-text-muted)] mb-1">{t.animalBreed}</label>
              {customBreed ? (
                <input name="breed_custom" type="text" defaultValue={animal.breed || ""}
                  className="w-full px-4 py-3 bg-[var(--c-card)] border border-[var(--c-border)] rounded-xl text-[var(--c-text)] focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition" />
              ) : (
                <select name="breed" defaultValue={animal.breed || ""} onChange={(e) => { if (e.target.value === "__other") setCustomBreed(true); }}
                  className="w-full px-4 py-3 bg-[var(--c-card)] border border-[var(--c-border)] rounded-xl text-[var(--c-text-muted)] focus:ring-2 focus:ring-amber-500 outline-none appearance-none">
                  <option value="" className="bg-[var(--c-deep)]">{t.animalSelect}</option>
                  {breedList.map((b: string) => (<option key={b} value={b} className="bg-[var(--c-deep)]">{b}</option>))}
                  <option value="__other" className="bg-[var(--c-deep)]">{t.animalOtherBreed}</option>
                </select>
              )}
            </div>

            {/* Âge + Genre + Poids */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-[var(--c-text-muted)] mb-1">{t.animalAge}</label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-xs text-[var(--c-text-muted)] mb-1">Années</label>
                    <input name="age_years" type="number" min="0" max="30" placeholder="0"
                      defaultValue={animal.age_months ? Math.floor(animal.age_months / 12) : ""}
                      className="w-full px-3 py-3 bg-[var(--c-card)] border border-[var(--c-border)] rounded-xl text-[var(--c-text)] focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-[var(--c-text-muted)] mb-1">Mois</label>
                    <input name="age_extra_months" type="number" min="0" max="11" placeholder="0"
                      defaultValue={animal.age_months ? animal.age_months % 12 : ""}
                      className="w-full px-3 py-3 bg-[var(--c-card)] border border-[var(--c-border)] rounded-xl text-[var(--c-text)] focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--c-text-muted)] mb-1">{t.animalGender}</label>
                <select name="gender" defaultValue={animal.gender}
                  className="w-full px-4 py-3 bg-[var(--c-card)] border border-[var(--c-border)] rounded-xl text-[var(--c-text-muted)] focus:ring-2 focus:ring-amber-500 outline-none appearance-none">
                  <option value="inconnu" className="bg-[var(--c-deep)]">{t.animalUnknown}</option>
                  <option value="male" className="bg-[var(--c-deep)]">{t.animalMale}</option>
                  <option value="femelle" className="bg-[var(--c-deep)]">{t.animalFemale}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--c-text-muted)] mb-1">{t.animalWeight}</label>
                <input name="weight_kg" type="number" step="0.1" min="0" defaultValue={animal.weight_kg || ""}
                  className="w-full px-4 py-3 bg-[var(--c-card)] border border-[var(--c-border)] rounded-xl text-[var(--c-text)] focus:ring-2 focus:ring-amber-500 outline-none transition" />
              </div>
            </div>

            {/* Canton + Ville */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-[var(--c-text-muted)] mb-1">{t.animalCanton}</label>
                <select name="canton" value={selectedCanton} onChange={(e) => { setSelectedCanton(e.target.value); setCustomCity(false); }}
                  className="w-full px-4 py-3 bg-[var(--c-card)] border border-[var(--c-border)] rounded-xl text-[var(--c-text-muted)] focus:ring-2 focus:ring-amber-500 outline-none appearance-none">
                  <option value="" className="bg-[var(--c-deep)]">{t.animalCanton}</option>
                  {CANTONS.map((c) => (<option key={c.code} value={c.code} className="bg-[var(--c-deep)]">{c.name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--c-text-muted)] mb-1">{t.animalCity}</label>
                {customCity ? (
                  <input name="city_custom" type="text" defaultValue={animal.city || ""}
                    className="w-full px-4 py-3 bg-[var(--c-card)] border border-[var(--c-border)] rounded-xl text-[var(--c-text)] focus:ring-2 focus:ring-amber-500 outline-none transition" />
                ) : (
                  <select name="city" defaultValue={animal.city || ""} onChange={(e) => { if (e.target.value === "__other") setCustomCity(true); }}
                    className="w-full px-4 py-3 bg-[var(--c-card)] border border-[var(--c-border)] rounded-xl text-[var(--c-text-muted)] focus:ring-2 focus:ring-amber-500 outline-none appearance-none">
                    <option value="" className="bg-[var(--c-deep)]">{t.animalCity}</option>
                    {cantonCities.map((c: string) => (<option key={c} value={c} className="bg-[var(--c-deep)]">{c}</option>))}
                    <option value="__other" className="bg-[var(--c-deep)]">{t.animalOther}</option>
                  </select>
                )}
              </div>
            </div>

            {/* Pedigree */}
            <div>
              <label className="block text-sm font-medium text-[var(--c-text-muted)] mb-1">Pedigree / LOF / LOSH</label>
              <input type="text" name="pedigree" defaultValue={animal.pedigree || ""} placeholder="Ex: LOF 123456, SHSB/LOS 789..." className="w-full bg-[var(--c-card)] border border-[var(--c-border)] rounded-xl px-4 py-2.5 text-sm text-[var(--c-text)] focus:ring-1 focus:ring-amber-500 outline-none" />
            </div>

            {/* Sante */}
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="vaccinated" defaultChecked={animal.vaccinated} className="w-4 h-4 rounded bg-[var(--c-card)] border-[var(--c-border)] text-amber-500 focus:ring-amber-500" />
                <span className="text-sm text-[var(--c-text-muted)]">{t.animalVaccinated}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="sterilized" defaultChecked={animal.sterilized} className="w-4 h-4 rounded bg-[var(--c-card)] border-[var(--c-border)] text-amber-500 focus:ring-amber-500" />
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
                        (selectedTraits.includes(trait) ? "bg-amber-500/20 border-amber-500/50 text-amber-300" : "bg-[var(--c-card)] border-[var(--c-border)] text-[var(--c-text-muted)] hover:bg-[var(--c-card)]")}>
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
              </div>

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
                          : "bg-[var(--c-card)] border-[var(--c-border)] text-[var(--c-text-muted)] hover:bg-[var(--c-card)]")
                      }>
                      {d.label}
                    </button>
                  ))}
                </div>
                <input type="hidden" name="diet_type" value={dietType} />
              </div>

              <div className="mb-3">
                <label className="block text-sm font-medium text-[var(--c-text-muted)] mb-1">{t.dietBrand}</label>
                <input name="food_brand" type="text" defaultValue={animal.food_brand || ""}
                  className="w-full px-4 py-3 bg-[var(--c-card)] border border-[var(--c-border)] rounded-xl text-[var(--c-text)] placeholder-[var(--c-text-muted)] focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition"
                  placeholder={t.dietBrandPlaceholder} />
              </div>

              <div className="mb-3">
                <label className="block text-sm font-medium text-[var(--c-text-muted)] mb-1">{t.dietTreats}</label>
                <input name="treats" type="text" defaultValue={animal.treats || ""}
                  className="w-full px-4 py-3 bg-[var(--c-card)] border border-[var(--c-border)] rounded-xl text-[var(--c-text)] placeholder-[var(--c-text-muted)] focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition"
                  placeholder={t.dietTreatsPlaceholder} />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--c-text-muted)] mb-1">{t.dietAllergies}</label>
                <input name="allergies" type="text" defaultValue={animal.allergies || ""}
                  className="w-full px-4 py-3 bg-[var(--c-card)] border border-[var(--c-border)] rounded-xl text-[var(--c-text)] placeholder-[var(--c-text-muted)] focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition"
                  placeholder={t.dietAllergiesPlaceholder} />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-[var(--c-text-muted)] mb-1">{t.animalDescription}</label>
              <textarea name="description" rows={3} defaultValue={animal.description || ""}
                className="w-full px-4 py-3 bg-[var(--c-card)] border border-[var(--c-border)] rounded-xl text-[var(--c-text)] placeholder-[var(--c-text-muted)] focus:ring-2 focus:ring-amber-500 outline-none transition resize-none" />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button type="submit" disabled={saving || !hasOwnerPhoto}
                className={"flex-1 py-3 font-semibold rounded-xl transition " +
                  (hasOwnerPhoto
                    ? "bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50"
                    : "bg-gray-600 text-[var(--c-text-muted)] cursor-not-allowed")
                }>
                {saving ? t.animalSaving : !hasOwnerPhoto ? t.animalPhotoWithOwner : t.animalSaveButton}
              </button>
              <button type="button" onClick={() => router.push("/animals/" + params.id)}
                className="px-6 py-3 bg-[var(--c-card)] hover:bg-[var(--c-card)] text-[var(--c-text-muted)] font-medium rounded-xl transition border border-[var(--c-border)]">
                {t.animalCancel}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Crop modal */}
      {cropFile && (
        <ImageCropper
          file={cropFile}
          aspectRatio={1}
          outputWidth={800}
          title="Recadrer la photo"
          onConfirm={handleCropConfirm}
          onCancel={() => setCropFile(null)}
        />
      )}
    </div>
  );
}
