"use client";

import { useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { createAnimal, uploadAnimalPhoto } from "@/lib/services/animals";
import { BREEDS } from "@/lib/breeds";
import { useRouter } from "next/navigation";
import { useAppContext } from "@/lib/contexts/AppContext";

const SPECIES_OPTIONS = [
  { value: "chien", emoji: "🐕", label: "Chien" },
  { value: "chat", emoji: "🐱", label: "Chat" },
  { value: "lapin", emoji: "🐰", label: "Lapin" },
  { value: "oiseau", emoji: "🐦", label: "Oiseau" },
  { value: "rongeur", emoji: "🐹", label: "Rongeur" },
  { value: "autre", emoji: "🐾", label: "Autre" },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [species, setSpecies] = useState("");
  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { t } = useAppContext();
  const supabase = createClient();

  const breedList = BREEDS[species] || [];

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  }

  async function handleFinish() {
    if (!name.trim()) { setError(t.onboardNameError); return; }
    setLoading(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    let photo_url = null;
    if (photoFile) {
      const uploadResult = await uploadAnimalPhoto(supabase, photoFile);
      if (uploadResult.error) { setError(uploadResult.error); setLoading(false); return; }
      photo_url = uploadResult.data;
    }

    const result = await createAnimal(supabase, {
      name: name.trim(),
      species: species || "chien",
      breed: breed || null,
      age_months: null,
      gender: "inconnu",
      description: null,
      photo_url,
      city: null,
      canton: null,
      weight_kg: null,
      vaccinated: false,
      sterilized: false,
      traits: [],
    }, user.id);

    if (result.error) { setError(result.error); setLoading(false); return; }
    setStep(3);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">

        {/* Step indicator */}
        <div className="flex justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className={"h-1.5 rounded-full transition-all duration-500 " + (s <= step ? "w-10" : "w-6")}
              style={{ background: s <= step ? "var(--c-accent, #f97316)" : "var(--c-border)" }} />
          ))}
        </div>

        {/* Step 1: Welcome + species selection */}
        {step === 1 && (
          <div className="text-center fade-in-up">
            <style dangerouslySetInnerHTML={{ __html: `@keyframes fadeInUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}.fade-in-up{animation:fadeInUp .6s ease-out forwards}` }} />
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="text-2xl font-extrabold text-[var(--c-text)] mb-2">{t.onboardWelcome}</h1>
            <p className="text-sm text-[var(--c-text-muted)] mb-8">{t.onboardSpecies}</p>

            <div className="grid grid-cols-3 gap-3 mb-6">
              {SPECIES_OPTIONS.map((s) => (
                <button key={s.value} type="button" onClick={() => setSpecies(s.value)}
                  className={"flex flex-col items-center gap-1.5 p-4 rounded-2xl border-2 transition-all " +
                    (species === s.value
                      ? "border-[var(--c-accent)] bg-[var(--c-accent)]/10 scale-105"
                      : "border-[var(--c-border)] bg-[var(--c-card)] hover:border-[var(--c-accent)]/50")}>
                  <span className="text-3xl">{s.emoji}</span>
                  <span className={"text-xs font-semibold " + (species === s.value ? "text-[var(--c-accent)]" : "text-[var(--c-text-muted)]")}>{s.label}</span>
                </button>
              ))}
            </div>

            <button onClick={() => { if (species) setStep(2); }}
              disabled={!species}
              className="w-full py-3.5 font-bold rounded-xl text-white transition disabled:opacity-40"
              style={{ background: "#f97316" }}>
              {t.onboardContinue}
            </button>

            <button onClick={() => router.push("/profile")}
              className="mt-3 text-sm text-[var(--c-text-muted)] hover:text-[var(--c-text)] transition">
              {t.onboardSkip}
            </button>
          </div>
        )}

        {/* Step 2: Name, breed, photo */}
        {step === 2 && (
          <div className="fade-in-up">
            <style dangerouslySetInnerHTML={{ __html: `@keyframes fadeInUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}.fade-in-up{animation:fadeInUp .6s ease-out forwards}` }} />
            <div className="text-center mb-6">
              <span className="text-5xl block mb-2">{SPECIES_OPTIONS.find(s => s.value === species)?.emoji || "🐾"}</span>
              <h1 className="text-2xl font-extrabold text-[var(--c-text)] mb-1">{t.onboardTellUs}</h1>
              <p className="text-sm text-[var(--c-text-muted)]">{t.onboardMinimum}</p>
            </div>

            {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">{error}</div>}

            <div className="bg-[var(--c-card)] border border-[var(--c-border)] rounded-2xl p-6 space-y-5">
              {/* Photo */}
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-[var(--c-bg)] border-2 border-dashed border-[var(--c-border)] flex items-center justify-center overflow-hidden flex-shrink-0 relative">
                  {photoPreview ? (
                    <Image src={photoPreview} alt="preview" fill className="object-cover" unoptimized sizes="80px" />
                  ) : (
                    <span className="text-2xl">📷</span>
                  )}
                </div>
                <div>
                  <label className="inline-block px-4 py-2 bg-[var(--c-bg)] hover:bg-[var(--c-border)] text-[var(--c-text-muted)] text-sm rounded-xl transition cursor-pointer border border-[var(--c-border)]">
                    {t.onboardAddPhoto}
                    <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                  </label>
                  <p className="text-[10px] text-[var(--c-text-muted)] mt-1">{t.onboardOptional}</p>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-[var(--c-text)] mb-1">{t.onboardNamePlaceholder} *</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-[var(--c-bg)] border border-[var(--c-border)] rounded-xl text-[var(--c-text)] placeholder-[var(--c-text-muted)] focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition"
                  placeholder={t.onboardNameEx} autoFocus />
              </div>

              {/* Breed */}
              {breedList.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-[var(--c-text)] mb-1">{t.onboardBreed}</label>
                  <select value={breed} onChange={(e) => setBreed(e.target.value)}
                    className="w-full px-4 py-3 bg-[var(--c-bg)] border border-[var(--c-border)] rounded-xl text-[var(--c-text-muted)] focus:ring-2 focus:ring-orange-500 outline-none appearance-none">
                    <option value="">{t.onboardSelect}</option>
                    {breedList.map((b: string) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <button onClick={handleFinish} disabled={loading || !name.trim()}
              className="w-full mt-5 py-3.5 font-bold rounded-xl text-white transition disabled:opacity-40"
              style={{ background: "#f97316" }}>
              {loading ? t.onboardCreating : t.onboardAddCompanion}
            </button>

            <div className="flex justify-between mt-3">
              <button onClick={() => setStep(1)} className="text-sm text-[var(--c-text-muted)] hover:text-[var(--c-text)] transition">
                ← {t.onboardBack}
              </button>
              <button onClick={() => router.push("/profile")}
                className="text-sm text-[var(--c-text-muted)] hover:text-[var(--c-text)] transition">
                {t.onboardSkip}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Success! */}
        {step === 3 && (
          <div className="text-center fade-in-up">
            <style dangerouslySetInnerHTML={{ __html: `@keyframes fadeInUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}.fade-in-up{animation:fadeInUp .6s ease-out forwards}@keyframes confettiBurst{0%{transform:scale(0);opacity:1}100%{transform:scale(1.5);opacity:0}}.confetti-burst{animation:confettiBurst 1s ease-out forwards}` }} />
            <div className="text-7xl mb-4">🎉</div>
            <h1 className="text-2xl font-extrabold text-[var(--c-text)] mb-2">{t.onboardReady}</h1>
            <p className="text-sm text-[var(--c-text-muted)] mb-2">
              <span className="font-bold" style={{ color: "var(--c-accent, #f97316)" }}>{name}</span> {t.onboardReadyMsg}
            </p>
            <p className="text-xs text-[var(--c-text-muted)] mb-8">{t.onboardComplete}</p>

            <div className="flex flex-col gap-3">
              <button onClick={() => router.push("/flairer")}
                className="w-full py-3.5 font-bold rounded-xl text-white"
                style={{ background: "#f97316", boxShadow: "0 0 30px rgba(249,115,22,0.3)" }}>
                {t.onboardStart}
              </button>
              <button onClick={() => router.push("/profile")}
                className="w-full py-3 bg-[var(--c-card)] border border-[var(--c-border)] text-[var(--c-text-muted)] font-medium rounded-xl transition">
                {t.onboardProfile}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
