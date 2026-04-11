"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { createAnimal, uploadAnimalPhoto } from "@/lib/services/animals";
import { BREEDS } from "@/lib/breeds";
import { CANTONS } from "@/lib/cantons";
import { useRouter } from "next/navigation";
import { useAppContext } from "@/lib/contexts/AppContext";
import ImageCropper from "@/lib/components/ImageCropper";

const SPECIES_OPTIONS = [
  { value: "chien", emoji: "🐕", label: "Chien" },
  { value: "chat", emoji: "🐱", label: "Chat" },
  { value: "lapin", emoji: "🐰", label: "Lapin" },
  { value: "oiseau", emoji: "🐦", label: "Oiseau" },
  { value: "rongeur", emoji: "🐹", label: "Rongeur" },
  { value: "autre", emoji: "🐾", label: "Autre" },
];

const PERSONALITY_TRAITS = [
  "Joueur", "Calme", "Sociable", "Timide", "Energique", "Protecteur",
  "Curieux", "Independant", "Affectueux", "Dominant", "Docile", "Gourmand",
];

// Approximate canton center coordinates for geolocation matching
const CANTON_COORDS: Record<string, { lat: number; lng: number }> = {
  AG: { lat: 47.39, lng: 8.04 }, AI: { lat: 47.33, lng: 9.41 },
  AR: { lat: 47.38, lng: 9.28 }, BE: { lat: 46.95, lng: 7.45 },
  BL: { lat: 47.48, lng: 7.73 }, BS: { lat: 47.56, lng: 7.59 },
  FR: { lat: 46.80, lng: 7.15 }, GE: { lat: 46.20, lng: 6.14 },
  GL: { lat: 47.04, lng: 9.07 }, GR: { lat: 46.85, lng: 9.53 },
  JU: { lat: 47.35, lng: 7.16 }, LU: { lat: 47.05, lng: 8.31 },
  NE: { lat: 46.99, lng: 6.93 }, NW: { lat: 46.96, lng: 8.37 },
  OW: { lat: 46.90, lng: 8.25 }, SG: { lat: 47.42, lng: 9.37 },
  SH: { lat: 47.70, lng: 8.64 }, SO: { lat: 47.21, lng: 7.54 },
  SZ: { lat: 47.02, lng: 8.65 }, TG: { lat: 47.57, lng: 9.10 },
  TI: { lat: 46.19, lng: 8.95 }, UR: { lat: 46.88, lng: 8.64 },
  VD: { lat: 46.52, lng: 6.63 }, VS: { lat: 46.23, lng: 7.36 },
  ZG: { lat: 47.17, lng: 8.52 }, ZH: { lat: 47.38, lng: 8.54 },
};

function findNearestCanton(lat: number, lng: number): string {
  let nearest = "";
  let minDist = Infinity;
  for (const [code, coords] of Object.entries(CANTON_COORDS)) {
    const d = Math.sqrt((lat - coords.lat) ** 2 + (lng - coords.lng) ** 2);
    if (d < minDist) { minDist = d; nearest = code; }
  }
  return nearest;
}

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [species, setSpecies] = useState("");
  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  // Verification photo (owner + animal)
  const [verifFile, setVerifFile] = useState<File | null>(null);
  const [verifPreview, setVerifPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Referral state
  const [referralCode, setReferralCode] = useState("");
  const [referralLoading, setReferralLoading] = useState(false);
  const [referralApplied, setReferralApplied] = useState(false);
  const [referralError, setReferralError] = useState<string | null>(null);
  const [referralName, setReferralName] = useState<string | null>(null);
  // Crop state
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropTarget, setCropTarget] = useState<"animal" | "verif" | null>(null);
  // New fields
  const [canton, setCanton] = useState("");
  const [city, setCity] = useState("");
  const [ageMonths, setAgeMonths] = useState<number | "">("");
  const [gender, setGender] = useState("inconnu");
  const [traits, setTraits] = useState<string[]>([]);
  const router = useRouter();
  const { t } = useAppContext();
  const supabase = createClient();

  const breedList = BREEDS[species] || [];

  // Geolocation: auto-detect canton on mount
  useEffect(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const detected = findNearestCanton(pos.coords.latitude, pos.coords.longitude);
        if (detected && !canton) setCanton(detected);
      },
      () => { /* denied or error — ignore */ },
      { timeout: 8000, maximumAge: 300000 }
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleTrait(trait: string) {
    setTraits((prev) => {
      if (prev.includes(trait)) return prev.filter((t) => t !== trait);
      if (prev.length >= 5) return prev;
      return [...prev, trait];
    });
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setCropFile(file);
      setCropTarget("animal");
    }
    e.target.value = "";
  }

  function handleVerifPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setCropFile(file);
      setCropTarget("verif");
    }
    e.target.value = "";
  }

  function handleCropConfirm(blob: Blob) {
    const file = new File([blob], "cropped.jpg", { type: "image/jpeg" });
    if (cropTarget === "animal") {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(blob));
    } else if (cropTarget === "verif") {
      setVerifFile(file);
      setVerifPreview(URL.createObjectURL(blob));
    }
    setCropFile(null);
    setCropTarget(null);
  }

  async function handleFinish() {
    if (!name.trim()) { setError("Donne un nom a ton animal."); return; }
    if (!photoFile) { setError("La photo de ton animal est obligatoire."); return; }
    if (!verifFile) { setError("La photo avec toi et ton animal est obligatoire pour valider ton compte."); return; }
    setLoading(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    // Upload animal photo (optional)
    let photo_url = null;
    if (photoFile) {
      const uploadResult = await uploadAnimalPhoto(supabase, photoFile);
      if (uploadResult.error) { setError(uploadResult.error); setLoading(false); return; }
      photo_url = uploadResult.data;
    }

    // Upload verification photo (REQUIRED)
    let verification_photo_url = null;
    try {
      const ext = verifFile.name.split('.').pop() || 'jpg';
      const path = `verifications/${user.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("photos").upload(path, verifFile, {
        cacheControl: "3600",
        upsert: false,
      });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("photos").getPublicUrl(path);
      verification_photo_url = urlData.publicUrl;
    } catch (e: any) {
      setError("Erreur upload photo de verification: " + (e.message || "Reessaie."));
      setLoading(false);
      return;
    }

    // Create the animal
    const result = await createAnimal(supabase, {
      name: name.trim(),
      species: species || "chien",
      breed: breed || null,
      age_months: ageMonths === "" ? null : ageMonths,
      gender: gender || "inconnu",
      description: null,
      photo_url,
      city: city.trim() || null,
      canton: canton || null,
      weight_kg: null,
      vaccinated: false,
      sterilized: false,
      traits,
    }, user.id);

    if (result.error) { setError(result.error); setLoading(false); return; }

    // Save verification photo to profile
    await supabase.from("profiles").update({
      verification_photo_url,
      verification_status: "submitted",
      verification_submitted_at: new Date().toISOString(),
    }).eq("id", user.id);

    setStep(4); // go to referral step
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">

        {/* Step indicator */}
        <div className="flex justify-center gap-2 mb-8">
          {[1, 2, 3, 4, 5, 6].map((s) => (
            <div key={s} className={"h-1.5 rounded-full transition-all duration-500 " + (s <= step ? "w-10" : "w-6")}
              style={{ background: s <= step ? "var(--c-accent, #FBBF24)" : "var(--c-border)" }} />
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
              style={{ background: "#FBBF24" }}>
              {t.onboardContinue}
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
              {/* Photo animal */}
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
                    Photo de l'animal
                    <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                  </label>
                  <p className="text-[10px] text-amber-300 mt-1 font-medium">Obligatoire *</p>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-[var(--c-text)] mb-1">{t.onboardNamePlaceholder} *</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-[var(--c-bg)] border border-[var(--c-border)] rounded-xl text-[var(--c-text)] placeholder-[var(--c-text-muted)] focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none transition"
                  placeholder={t.onboardNameEx} autoFocus />
              </div>

              {/* Breed */}
              {breedList.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-[var(--c-text)] mb-1">{t.onboardBreed}</label>
                  <select value={breed} onChange={(e) => setBreed(e.target.value)}
                    className="w-full px-4 py-3 bg-[var(--c-bg)] border border-[var(--c-border)] rounded-xl text-[var(--c-text-muted)] focus:ring-2 focus:ring-amber-400 outline-none appearance-none">
                    <option value="">{t.onboardSelect}</option>
                    {breedList.map((b: string) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Age & Gender row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--c-text)] mb-1">Age (mois)</label>
                  <input type="number" min={0} max={360} value={ageMonths} onChange={(e) => setAgeMonths(e.target.value === "" ? "" : parseInt(e.target.value, 10))}
                    className="w-full px-4 py-3 bg-[var(--c-bg)] border border-[var(--c-border)] rounded-xl text-[var(--c-text)] placeholder-[var(--c-text-muted)] focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none transition"
                    placeholder="Ex: 24" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--c-text)] mb-1">Genre</label>
                  <select value={gender} onChange={(e) => setGender(e.target.value)}
                    className="w-full px-4 py-3 bg-[var(--c-bg)] border border-[var(--c-border)] rounded-xl text-[var(--c-text-muted)] focus:ring-2 focus:ring-amber-400 outline-none appearance-none">
                    <option value="inconnu">Inconnu</option>
                    <option value="male">Male</option>
                    <option value="femelle">Femelle</option>
                  </select>
                </div>
              </div>

              {/* Canton & City row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--c-text)] mb-1">Canton</label>
                  <select value={canton} onChange={(e) => setCanton(e.target.value)}
                    className="w-full px-4 py-3 bg-[var(--c-bg)] border border-[var(--c-border)] rounded-xl text-[var(--c-text-muted)] focus:ring-2 focus:ring-amber-400 outline-none appearance-none">
                    <option value="">Selectionner</option>
                    {CANTONS.map((c) => (
                      <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--c-text)] mb-1">Ville</label>
                  <input type="text" value={city} onChange={(e) => setCity(e.target.value)}
                    className="w-full px-4 py-3 bg-[var(--c-bg)] border border-[var(--c-border)] rounded-xl text-[var(--c-text)] placeholder-[var(--c-text-muted)] focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none transition"
                    placeholder="Ex: Lausanne" />
                </div>
              </div>

              {/* Personality traits */}
              <div>
                <label className="block text-sm font-medium text-[var(--c-text)] mb-1">Personnalite <span className="text-xs text-[var(--c-text-muted)] font-normal">(max 5)</span></label>
                <div className="grid grid-cols-3 gap-2">
                  {PERSONALITY_TRAITS.map((trait) => {
                    const selected = traits.includes(trait);
                    return (
                      <button key={trait} type="button" onClick={() => toggleTrait(trait)}
                        className={"px-3 py-2 text-xs font-semibold rounded-xl border-2 transition-all " +
                          (selected
                            ? "border-[var(--c-accent)] bg-[var(--c-accent)]/10 text-[var(--c-accent)]"
                            : "border-[var(--c-border)] bg-[var(--c-bg)] text-[var(--c-text-muted)] hover:border-[var(--c-accent)]/50")}>
                        {trait}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <button onClick={() => {
                if (!name.trim()) { setError("Donne un nom a ton animal."); return; }
                if (!photoFile) { setError("La photo de ton animal est obligatoire."); return; }
                setError(null); setStep(3);
              }}
              disabled={!name.trim() || !photoFile}
              className="w-full mt-5 py-3.5 font-bold rounded-xl text-white transition disabled:opacity-40"
              style={{ background: "#FBBF24" }}>
              Continuer
            </button>

            <div className="flex justify-between mt-3">
              <button onClick={() => setStep(1)} className="text-sm text-[var(--c-text-muted)] hover:text-[var(--c-text)] transition">
                ← Retour
              </button>
            </div>
          </div>
        )}

        {/* Step 3: VERIFICATION PHOTO — obligatoire */}
        {step === 3 && (
          <div className="fade-in-up">
            <style dangerouslySetInnerHTML={{ __html: `@keyframes fadeInUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}.fade-in-up{animation:fadeInUp .6s ease-out forwards}` }} />
            <div className="text-center mb-6">
              <span className="text-5xl block mb-2">📸</span>
              <h1 className="text-2xl font-extrabold text-[var(--c-text)] mb-2">Photo de verification</h1>
              <p className="text-sm text-[var(--c-text-muted)] leading-relaxed">
                Pour garantir la securite de la communaute, prends une <strong className="text-[var(--c-text)]">photo de toi avec ton animal</strong>.
              </p>
            </div>

            {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">{error}</div>}

            <div className="bg-[var(--c-card)] border border-[var(--c-border)] rounded-2xl p-6">
              {/* Verification photo upload */}
              <div className="flex flex-col items-center gap-4">
                <div className="w-full aspect-[4/3] rounded-2xl bg-[var(--c-bg)] border-2 border-dashed flex items-center justify-center overflow-hidden relative"
                  style={{ borderColor: verifPreview ? "var(--c-accent)" : "var(--c-border)" }}>
                  {verifPreview ? (
                    <Image src={verifPreview} alt="Photo de verification" fill className="object-cover" unoptimized sizes="400px" />
                  ) : (
                    <div className="text-center p-6">
                      <span className="text-5xl block mb-3">🤳</span>
                      <p className="text-sm font-semibold text-[var(--c-text)]">Toi + ton animal</p>
                      <p className="text-xs text-[var(--c-text-muted)] mt-1">Visible par l'equipe PawlyApp uniquement</p>
                    </div>
                  )}
                </div>

                <label className="w-full cursor-pointer">
                  <div className="w-full py-3 text-center font-bold rounded-xl transition border-2"
                    style={{
                      background: verifPreview ? "rgba(251,191,36,0.08)" : "var(--c-bg)",
                      borderColor: verifPreview ? "rgba(251,191,36,0.3)" : "var(--c-border)",
                      color: verifPreview ? "#FBBF24" : "var(--c-text-muted)",
                    }}>
                    {verifPreview ? "✅ Photo prise — Changer" : "📸 Prendre / Choisir une photo"}
                  </div>
                  <input type="file" accept="image/*" onChange={handleVerifPhotoChange} className="hidden" />
                </label>

                <div className="w-full p-3 rounded-xl text-xs leading-relaxed" style={{
                  background: "rgba(34, 197, 94,0.06)",
                  border: "1px solid rgba(34, 197, 94,0.15)",
                  color: "var(--c-text-muted)",
                }}>
                  <strong style={{ color: "var(--c-accent)" }}>Pourquoi ?</strong> Cette photo nous permet de verifier que tu es bien le proprietaire. Elle ne sera <strong>jamais publiee</strong> — seule l'equipe PawlyApp y a acces.
                </div>
              </div>
            </div>

            <button onClick={handleFinish} disabled={loading || !verifFile}
              className="w-full mt-5 py-3.5 font-bold rounded-xl text-white transition disabled:opacity-40"
              style={{ background: "#FBBF24" }}>
              {loading ? "Creation en cours..." : "Valider mon inscription"}
            </button>

            <div className="flex justify-between mt-3">
              <button onClick={() => setStep(2)} className="text-sm text-[var(--c-text-muted)] hover:text-[var(--c-text)] transition">
                ← Retour
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Referral code */}
        {step === 4 && (
          <div className="fade-in-up">
            <style dangerouslySetInnerHTML={{ __html: `@keyframes fadeInUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}.fade-in-up{animation:fadeInUp .6s ease-out forwards}@keyframes coinPop{0%{transform:scale(0) rotate(-20deg);opacity:0}60%{transform:scale(1.2) rotate(5deg);opacity:1}100%{transform:scale(1) rotate(0deg);opacity:1}}.coin-pop{animation:coinPop .5s ease-out forwards}` }} />
            <div className="text-center mb-6">
              <span className="text-5xl block mb-2">🎁</span>
              <h1 className="text-2xl font-extrabold text-[var(--c-text)] mb-2">As-tu un code de parrainage ?</h1>
              <p className="text-sm text-[var(--c-text-muted)]">
                Entre le code d&apos;un ami et recois <strong className="text-[var(--c-accent)]">+10 PawCoins</strong> pour bien demarrer !
              </p>
            </div>

            <div className="glass rounded-2xl p-6 space-y-4" style={{ background: "var(--c-card)", border: "1px solid var(--c-border)" }}>
              {referralApplied ? (
                <div className="text-center py-4">
                  <div className="coin-pop inline-flex items-center justify-center w-16 h-16 rounded-full mb-3" style={{ background: "linear-gradient(135deg, #FBBF24, #F59E0B)", boxShadow: "0 4px 20px rgba(251,191,36,0.3)" }}>
                    <span className="text-2xl">🪙</span>
                  </div>
                  <p className="text-lg font-bold text-[var(--c-text)] mb-1">+10 PawCoins</p>
                  <p className="text-sm text-[var(--c-text-muted)]">
                    Merci ! Parraine par <strong className="text-[var(--c-accent)]">{referralName || "un ami"}</strong>
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-[var(--c-text)] mb-1.5">Code de parrainage</label>
                    <input
                      type="text"
                      value={referralCode}
                      onChange={(e) => { setReferralCode(e.target.value); setReferralError(null); }}
                      className="w-full px-4 py-3 bg-[var(--c-bg)] border border-[var(--c-border)] rounded-xl text-[var(--c-text)] placeholder-[var(--c-text-muted)] focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none transition"
                      placeholder="Ex: a1b2c3d4"
                      disabled={referralLoading}
                    />
                  </div>
                  {referralError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">{referralError}</div>
                  )}
                  <button
                    onClick={async () => {
                      if (!referralCode.trim()) { setReferralError("Entre un code de parrainage."); return; }
                      setReferralLoading(true);
                      setReferralError(null);
                      try {
                        const res = await fetch("/api/referral", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ code: referralCode.trim() }),
                        });
                        const data = await res.json();
                        if (!res.ok || data.error) {
                          setReferralError(data.error || "Code invalide.");
                        } else {
                          setReferralApplied(true);
                          setReferralName(data.referrer_name || null);
                        }
                      } catch {
                        setReferralError("Erreur reseau, reessaie.");
                      }
                      setReferralLoading(false);
                    }}
                    disabled={referralLoading || !referralCode.trim()}
                    className="w-full py-3 font-bold rounded-xl text-white transition disabled:opacity-40"
                    style={{ background: "#FBBF24" }}
                  >
                    {referralLoading ? "Verification..." : "Appliquer"}
                  </button>
                </>
              )}
            </div>

            <button
              onClick={() => setStep(5)}
              className="w-full mt-4 py-3.5 font-bold rounded-xl text-white transition"
              style={{ background: referralApplied ? "#FBBF24" : "var(--c-text, #111827)" }}
            >
              {referralApplied ? "Continuer" : "Passer"}
            </button>
          </div>
        )}

        {/* Step 5: Feature discovery */}
        {step === 5 && (
          <div className="fade-in-up">
            <style dangerouslySetInnerHTML={{ __html: `@keyframes fadeInUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}.fade-in-up{animation:fadeInUp .6s ease-out forwards}@keyframes featureSlideIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}` }} />
            <div className="text-center mb-8">
              <span className="text-5xl block mb-2">🚀</span>
              <h1 className="text-2xl font-extrabold text-[var(--c-text)] mb-2">Decouvre PawlyApp</h1>
              <p className="text-sm text-[var(--c-text-muted)]">
                Tout ce dont tu as besoin pour ton compagnon
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: "🎬", title: "Reels", desc: "Videos courtes de la communaute", delay: "0s" },
                { icon: "👃", title: "Flairer", desc: "Swipe et trouve des compagnons", delay: "0.1s" },
                { icon: "👥", title: "Groupes", desc: "Rejoins des groupes par passion", delay: "0.2s" },
                { icon: "📅", title: "Evenements", desc: "Balades et rencontres pres de toi", delay: "0.3s" },
              ].map((feat) => (
                <div
                  key={feat.title}
                  className="glass rounded-2xl p-5 text-center"
                  style={{
                    background: "var(--c-card)",
                    border: "1px solid var(--c-border)",
                    animation: `featureSlideIn 0.5s ease-out ${feat.delay} both`,
                  }}
                >
                  <span className="text-3xl block mb-2">{feat.icon}</span>
                  <h3 className="font-bold text-sm text-[var(--c-text)] mb-1">{feat.title}</h3>
                  <p className="text-xs text-[var(--c-text-muted)] leading-relaxed">{feat.desc}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => setStep(6)}
              className="btn-futuristic w-full mt-6 py-3.5 font-bold rounded-xl text-white transition"
              style={{ background: "#FBBF24", boxShadow: "0 0 30px rgba(34, 197, 94,0.3)" }}
            >
              C&apos;est parti !
            </button>
          </div>
        )}

        {/* Step 6: Success! */}
        {step === 6 && (
          <div className="text-center fade-in-up">
            <style dangerouslySetInnerHTML={{ __html: `@keyframes fadeInUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}.fade-in-up{animation:fadeInUp .6s ease-out forwards}@keyframes confettiBurst{0%{transform:scale(0);opacity:1}100%{transform:scale(1.5);opacity:0}}.confetti-burst{animation:confettiBurst 1s ease-out forwards}` }} />
            <div className="text-7xl mb-4">🎉</div>
            <h1 className="text-2xl font-extrabold text-[var(--c-text)] mb-2">{t.onboardReady}</h1>
            <p className="text-sm text-[var(--c-text-muted)] mb-2">
              <span className="font-bold" style={{ color: "var(--c-accent, #FBBF24)" }}>{name}</span> {t.onboardReadyMsg}
            </p>
            <p className="text-xs text-[var(--c-text-muted)] mb-2">Ta photo de verification sera examinee sous 24h.</p>
            <p className="text-xs text-[var(--c-text-muted)] mb-8">{t.onboardComplete}</p>

            <div className="flex flex-col gap-3">
              <button onClick={() => router.push("/flairer")}
                className="w-full py-3.5 font-bold rounded-xl text-white"
                style={{ background: "#FBBF24", boxShadow: "0 0 30px rgba(34, 197, 94,0.3)" }}>
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

      {/* Crop modal */}
      {cropFile && cropTarget && (
        <ImageCropper
          file={cropFile}
          aspectRatio={cropTarget === "animal" ? 1 : 4 / 3}
          outputWidth={cropTarget === "animal" ? 800 : 1024}
          title={cropTarget === "animal" ? "Recadrer la photo" : "Recadrer la verification"}
          onConfirm={handleCropConfirm}
          onCancel={() => { setCropFile(null); setCropTarget(null); }}
        />
      )}
    </div>
  );
}
