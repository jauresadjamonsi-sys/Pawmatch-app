"use client";

import { useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { createAnimal, uploadAnimalPhoto } from "@/lib/services/animals";
import { BREEDS } from "@/lib/breeds";
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
  // Crop state
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropTarget, setCropTarget] = useState<"animal" | "verif" | null>(null);
  const router = useRouter();
  const { t } = useAppContext();
  const supabase = createClient();

  const breedList = BREEDS[species] || [];

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

    // Save verification photo to profile
    await supabase.from("profiles").update({
      verification_photo_url,
      verification_status: "submitted",
      verification_submitted_at: new Date().toISOString(),
    }).eq("id", user.id);

    setStep(4); // go to success
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">

        {/* Step indicator */}
        <div className="flex justify-center gap-2 mb-8">
          {[1, 2, 3, 4].map((s) => (
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
                  <p className="text-[10px] text-orange-400 mt-1 font-medium">Obligatoire *</p>
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

            <button onClick={() => {
                if (!name.trim()) { setError("Donne un nom a ton animal."); return; }
                if (!photoFile) { setError("La photo de ton animal est obligatoire."); return; }
                setError(null); setStep(3);
              }}
              disabled={!name.trim() || !photoFile}
              className="w-full mt-5 py-3.5 font-bold rounded-xl text-white transition disabled:opacity-40"
              style={{ background: "#f97316" }}>
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
                      <p className="text-xs text-[var(--c-text-muted)] mt-1">Visible par l'equipe Pawly uniquement</p>
                    </div>
                  )}
                </div>

                <label className="w-full cursor-pointer">
                  <div className="w-full py-3 text-center font-bold rounded-xl transition border-2"
                    style={{
                      background: verifPreview ? "rgba(34,197,94,0.08)" : "var(--c-bg)",
                      borderColor: verifPreview ? "rgba(34,197,94,0.3)" : "var(--c-border)",
                      color: verifPreview ? "#22c55e" : "var(--c-text-muted)",
                    }}>
                    {verifPreview ? "✅ Photo prise — Changer" : "📸 Prendre / Choisir une photo"}
                  </div>
                  <input type="file" accept="image/*" onChange={handleVerifPhotoChange} className="hidden" />
                </label>

                <div className="w-full p-3 rounded-xl text-xs leading-relaxed" style={{
                  background: "rgba(249,115,22,0.06)",
                  border: "1px solid rgba(249,115,22,0.15)",
                  color: "var(--c-text-muted)",
                }}>
                  <strong style={{ color: "var(--c-accent)" }}>Pourquoi ?</strong> Cette photo nous permet de verifier que tu es bien le proprietaire. Elle ne sera <strong>jamais publiee</strong> — seule l'equipe Pawly y a acces.
                </div>
              </div>
            </div>

            <button onClick={handleFinish} disabled={loading || !verifFile}
              className="w-full mt-5 py-3.5 font-bold rounded-xl text-white transition disabled:opacity-40"
              style={{ background: "#f97316" }}>
              {loading ? "Creation en cours..." : "Valider mon inscription"}
            </button>

            <div className="flex justify-between mt-3">
              <button onClick={() => setStep(2)} className="text-sm text-[var(--c-text-muted)] hover:text-[var(--c-text)] transition">
                ← Retour
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Success! */}
        {step === 4 && (
          <div className="text-center fade-in-up">
            <style dangerouslySetInnerHTML={{ __html: `@keyframes fadeInUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}.fade-in-up{animation:fadeInUp .6s ease-out forwards}@keyframes confettiBurst{0%{transform:scale(0);opacity:1}100%{transform:scale(1.5);opacity:0}}.confetti-burst{animation:confettiBurst 1s ease-out forwards}` }} />
            <div className="text-7xl mb-4">🎉</div>
            <h1 className="text-2xl font-extrabold text-[var(--c-text)] mb-2">{t.onboardReady}</h1>
            <p className="text-sm text-[var(--c-text-muted)] mb-2">
              <span className="font-bold" style={{ color: "var(--c-accent, #f97316)" }}>{name}</span> {t.onboardReadyMsg}
            </p>
            <p className="text-xs text-[var(--c-text-muted)] mb-2">Ta photo de verification sera examinee sous 24h.</p>
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
