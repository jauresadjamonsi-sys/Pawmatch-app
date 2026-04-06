"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useAppContext } from "@/lib/contexts/AppContext";
import { EMOJI_MAP } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AnimalSpecies = "chien" | "chat" | "lapin" | "oiseau" | "rongeur" | "autre";

interface AnimalRow {
  id: string;
  name: string;
  species: AnimalSpecies;
  breed: string | null;
  photo_url: string | null;
  traits: string[];
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

interface Template {
  id: string;
  labelKey: string;
  fallback: string;
  emoji: string;
  gradient: string;
}

const TEMPLATES: Template[] = [
  {
    id: "day-in-life",
    labelKey: "storiesDayInLife",
    fallback: "Une journee avec",
    emoji: "\u2600\uFE0F",
    gradient: "linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)",
  },
  {
    id: "before-after",
    labelKey: "storiesBeforeAfter",
    fallback: "Avant / Apres",
    emoji: "\uD83D\uDD04",
    gradient: "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
  },
  {
    id: "milestone",
    labelKey: "storiesMilestone",
    fallback: "Etape importante",
    emoji: "\uD83C\uDFC6",
    gradient: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  },
  {
    id: "ask-me",
    labelKey: "storiesAskMe",
    fallback: "Pose-moi une question",
    emoji: "\u2753",
    gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  },
];

// ---------------------------------------------------------------------------
// Text style presets
// ---------------------------------------------------------------------------

interface TextStyle {
  fontFamily: string;
  color: string;
  label: string;
}

const TEXT_STYLES: TextStyle[] = [
  { fontFamily: "system-ui, sans-serif", color: "#ffffff", label: "Classic" },
  { fontFamily: "Georgia, serif", color: "#fef08a", label: "Warm" },
  { fontFamily: "'Courier New', monospace", color: "#a5f3fc", label: "Retro" },
  { fontFamily: "system-ui, sans-serif", color: "#f9a8d4", label: "Pink" },
  { fontFamily: "system-ui, sans-serif", color: "#86efac", label: "Nature" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StoryCreatePage() {
  const router = useRouter();
  const { t } = useAppContext();
  const [animals, setAnimals] = useState<AnimalRow[]>([]);
  const [selectedAnimal, setSelectedAnimal] = useState<AnimalRow | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [textOverlay, setTextOverlay] = useState("");
  const [textStyleIdx, setTextStyleIdx] = useState(0);
  const [step, setStep] = useState<"pet" | "template" | "edit" | "preview">("pet");
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  // -----------------------------------------------------------------------
  // Load user's animals
  // -----------------------------------------------------------------------

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/feed");
        return;
      }

      const { data } = await supabase
        .from("animals")
        .select("id, name, species, breed, photo_url, traits")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });

      const list = (data as AnimalRow[] | null) || [];
      setAnimals(list);

      if (list.length === 1) {
        setSelectedAnimal(list[0]);
        setStep("template");
      }

      setLoading(false);
    }

    load();
  }, [router]);

  // -----------------------------------------------------------------------
  // Publish story
  // -----------------------------------------------------------------------

  async function handlePublish() {
    if (!selectedAnimal || !selectedTemplate) return;

    setPublishing(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("stories").insert({
        user_id: user.id,
        animal_id: selectedAnimal.id,
        template: selectedTemplate.id,
        text_overlay: textOverlay,
        text_style: TEXT_STYLES[textStyleIdx],
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

      router.push("/stories");
    } catch {
      // If the stories table doesn't exist yet, just redirect
      router.push("/stories");
    } finally {
      setPublishing(false);
    }
  }

  // -----------------------------------------------------------------------
  // Loading
  // -----------------------------------------------------------------------

  if (loading) {
    return (
      <main
        className="min-h-screen px-4 pt-6 pb-28 flex items-center justify-center"
        style={{ background: "var(--c-deep)" }}
      >
        <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--c-border)", borderTopColor: "transparent" }} />
      </main>
    );
  }

  // -----------------------------------------------------------------------
  // No animals
  // -----------------------------------------------------------------------

  if (animals.length === 0) {
    return (
      <main
        className="min-h-screen px-4 pt-6 pb-28 flex items-center justify-center"
        style={{ background: "var(--c-deep)" }}
      >
        <div className="text-center">
          <div className="text-5xl mb-4">{"\uD83D\uDC3E"}</div>
          <p className="text-sm font-semibold mb-4" style={{ color: "var(--c-text)" }}>
            {t.storiesNoAnimals || "Ajoute un animal pour creer des stories"}
          </p>
          <button
            onClick={() => router.push("/profile/animals/new")}
            className="btn-futuristic inline-block text-sm px-6 py-3"
          >
            + {t.animalAddButton || "Ajouter"}
          </button>
        </div>
      </main>
    );
  }

  // -----------------------------------------------------------------------
  // Step 1: Select Pet
  // -----------------------------------------------------------------------

  if (step === "pet") {
    return (
      <main className="min-h-screen px-4 md:px-6 pt-6 pb-28" style={{ background: "var(--c-deep)" }}>
        <div className="mx-auto max-w-lg">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => router.push("/feed")}
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: "var(--c-card)", color: "var(--c-text)" }}
              aria-label={t.storiesBack || "Retour"}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-extrabold" style={{ color: "var(--c-text)" }}>
              {t.storiesSelectPet || "Choisir un animal"}
            </h1>
          </div>

          {/* Pet list */}
          <div className="space-y-3">
            {animals.map((animal) => {
              const emoji = EMOJI_MAP[animal.species] || "\uD83D\uDC3E";
              return (
                <button
                  key={animal.id}
                  onClick={() => {
                    setSelectedAnimal(animal);
                    setStep("template");
                  }}
                  className="w-full flex items-center gap-4 rounded-2xl p-4 transition-all active:scale-[0.98]"
                  style={{
                    background: "var(--c-card)",
                    border: "1px solid var(--c-border)",
                  }}
                >
                  <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
                    {animal.photo_url ? (
                      <Image
                        src={animal.photo_url}
                        alt={animal.name}
                        width={56}
                        height={56}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center text-2xl"
                        style={{ background: "var(--c-border)" }}
                      >
                        {emoji}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-bold" style={{ color: "var(--c-text)" }}>
                      {animal.name}
                    </p>
                    <p className="text-xs" style={{ color: "var(--c-text-muted)" }}>
                      {emoji} {animal.breed || animal.species}
                    </p>
                  </div>
                  <svg
                    width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                    style={{ color: "var(--c-text-muted)" }}
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              );
            })}
          </div>
        </div>
      </main>
    );
  }

  // -----------------------------------------------------------------------
  // Step 2: Select Template
  // -----------------------------------------------------------------------

  if (step === "template") {
    return (
      <main className="min-h-screen px-4 md:px-6 pt-6 pb-28" style={{ background: "var(--c-deep)" }}>
        <div className="mx-auto max-w-lg">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => animals.length > 1 ? setStep("pet") : router.push("/feed")}
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: "var(--c-card)", color: "var(--c-text)" }}
              aria-label={t.storiesBack || "Retour"}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-extrabold" style={{ color: "var(--c-text)" }}>
              {t.storiesTemplate || "Modele"}
            </h1>
          </div>

          {/* Selected pet banner */}
          {selectedAnimal && (
            <div
              className="rounded-2xl p-3 mb-5 flex items-center gap-3"
              style={{ background: "var(--c-card)", border: "1px solid var(--c-border)" }}
            >
              <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                {selectedAnimal.photo_url ? (
                  <Image
                    src={selectedAnimal.photo_url}
                    alt={selectedAnimal.name}
                    width={40}
                    height={40}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-lg"
                    style={{ background: "var(--c-border)" }}
                  >
                    {EMOJI_MAP[selectedAnimal.species] || "\uD83D\uDC3E"}
                  </div>
                )}
              </div>
              <p className="font-bold text-sm" style={{ color: "var(--c-text)" }}>
                {selectedAnimal.name}
              </p>
            </div>
          )}

          {/* Template grid */}
          <div className="grid grid-cols-2 gap-3">
            {TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.id}
                onClick={() => {
                  setSelectedTemplate(tmpl);
                  setTextOverlay("");
                  setStep("edit");
                }}
                className="rounded-2xl p-5 text-center transition-all active:scale-[0.96] aspect-square flex flex-col items-center justify-center"
                style={{ background: tmpl.gradient }}
              >
                <span className="text-4xl mb-3">{tmpl.emoji}</span>
                <span className="text-[var(--c-text)] text-sm font-bold drop-shadow-md">
                  {t[tmpl.labelKey] || tmpl.fallback}
                </span>
              </button>
            ))}
          </div>
        </div>
      </main>
    );
  }

  // -----------------------------------------------------------------------
  // Step 3: Edit (add text overlay)
  // -----------------------------------------------------------------------

  if (step === "edit" && selectedAnimal && selectedTemplate) {
    const currentStyle = TEXT_STYLES[textStyleIdx];

    return (
      <main className="min-h-screen px-4 md:px-6 pt-6 pb-28" style={{ background: "var(--c-deep)" }}>
        <div className="mx-auto max-w-lg">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => setStep("template")}
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: "var(--c-card)", color: "var(--c-text)" }}
              aria-label={t.storiesBack || "Retour"}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-extrabold" style={{ color: "var(--c-text)" }}>
              {t.storiesAddText || "Ajouter du texte"}
            </h1>
          </div>

          {/* Live preview card */}
          <div
            className="relative rounded-3xl overflow-hidden mb-6 aspect-[9/16] max-h-[60vh] mx-auto"
            style={{ background: selectedTemplate.gradient }}
          >
            {selectedAnimal.photo_url && (
              <Image
                src={selectedAnimal.photo_url}
                alt={selectedAnimal.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 400px"
              />
            )}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.5) 100%)",
              }}
            />

            {/* Template label */}
            <div className="absolute top-4 left-4 z-10">
              <span
                className="px-3 py-1 rounded-full text-xs font-bold text-[var(--c-text)]"
                style={{ background: "rgba(255,255,255,0.2)", backdropFilter: "blur(8px)" }}
              >
                {selectedTemplate.emoji} {t[selectedTemplate.labelKey] || selectedTemplate.fallback}
              </span>
            </div>

            {/* Text overlay display */}
            <div className="absolute inset-0 flex items-center justify-center p-6 z-10">
              {textOverlay ? (
                <p
                  className="text-2xl font-bold text-center leading-tight drop-shadow-lg"
                  style={{
                    fontFamily: currentStyle.fontFamily,
                    color: currentStyle.color,
                  }}
                >
                  {textOverlay}
                </p>
              ) : (
                <p className="text-[var(--c-text-muted)] text-lg font-medium text-center">
                  {t.storiesTextPlaceholder || "Ecris quelque chose..."}
                </p>
              )}
            </div>

            {/* Pet name badge */}
            <div className="absolute bottom-4 left-4 z-10">
              <span
                className="px-3 py-1.5 rounded-full text-xs font-bold text-[var(--c-text)]"
                style={{ background: "rgba(255,255,255,0.2)", backdropFilter: "blur(8px)" }}
              >
                {selectedAnimal.name} {EMOJI_MAP[selectedAnimal.species] || "\uD83D\uDC3E"}
              </span>
            </div>
          </div>

          {/* Text input */}
          <textarea
            value={textOverlay}
            onChange={(e) => setTextOverlay(e.target.value)}
            placeholder={t.storiesTextPlaceholder || "Ecris quelque chose..."}
            maxLength={120}
            rows={2}
            className="w-full rounded-xl p-4 text-sm resize-none mb-4 outline-none"
            style={{
              background: "var(--c-card)",
              color: "var(--c-text)",
              border: "1px solid var(--c-border)",
            }}
          />

          {/* Text style selector */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
            {TEXT_STYLES.map((style, idx) => (
              <button
                key={idx}
                onClick={() => setTextStyleIdx(idx)}
                className="flex-shrink-0 w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center text-xs font-bold"
                style={{
                  background: style.color,
                  borderColor: idx === textStyleIdx ? "var(--c-accent)" : "transparent",
                  transform: idx === textStyleIdx ? "scale(1.15)" : "scale(1)",
                }}
                aria-label={style.label}
              >
                <span className="mix-blend-difference text-white">Aa</span>
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => setStep("preview")}
              className="flex-1 rounded-xl py-3 text-sm font-bold transition-all active:scale-[0.97]"
              style={{ background: "var(--c-card)", color: "var(--c-text)", border: "1px solid var(--c-border)" }}
            >
              {t.storiesPreview || "Apercu"}
            </button>
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="flex-1 rounded-xl py-3 text-sm font-bold text-white transition-all active:scale-[0.97] disabled:opacity-50"
              style={{ background: "var(--c-accent)" }}
            >
              {publishing ? "..." : (t.storiesPublish || "Publier")}
            </button>
          </div>
        </div>
      </main>
    );
  }

  // -----------------------------------------------------------------------
  // Step 4: Full-screen Preview
  // -----------------------------------------------------------------------

  if (step === "preview" && selectedAnimal && selectedTemplate) {
    const currentStyle = TEXT_STYLES[textStyleIdx];

    return (
      <div
        className="fixed inset-0 z-[9999]"
        style={{ width: "100vw", height: "100vh", background: "#000" }}
      >
        {/* Background */}
        {selectedAnimal.photo_url ? (
          <Image
            src={selectedAnimal.photo_url}
            alt={selectedAnimal.name}
            fill
            className="object-cover"
            sizes="100vw"
          />
        ) : (
          <div className="absolute inset-0" style={{ background: selectedTemplate.gradient }} />
        )}

        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.6) 100%)",
          }}
        />

        {/* Fake progress bar (static) */}
        <div className="absolute top-0 left-0 right-0 flex gap-1 px-3 pt-3">
          <div className="flex-1 h-[3px] rounded-full" style={{ background: "rgba(255,255,255,0.5)" }} />
        </div>

        {/* Top bar */}
        <div className="absolute top-8 left-0 right-0 px-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-[var(--c-border)] flex-shrink-0">
              {selectedAnimal.photo_url ? (
                <Image
                  src={selectedAnimal.photo_url}
                  alt={selectedAnimal.name}
                  width={40}
                  height={40}
                  className="object-cover w-full h-full"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-lg"
                  style={{ background: selectedTemplate.gradient }}
                >
                  {EMOJI_MAP[selectedAnimal.species] || "\uD83D\uDC3E"}
                </div>
              )}
            </div>
            <p className="text-[var(--c-text)] text-sm font-bold">{selectedAnimal.name}</p>
          </div>
        </div>

        {/* Template label */}
        <div className="absolute top-20 left-4 z-10">
          <span
            className="px-3 py-1 rounded-full text-xs font-bold text-[var(--c-text)]"
            style={{ background: "rgba(255,255,255,0.2)", backdropFilter: "blur(8px)" }}
          >
            {selectedTemplate.emoji} {t[selectedTemplate.labelKey] || selectedTemplate.fallback}
          </span>
        </div>

        {/* Text overlay */}
        <div className="absolute inset-0 flex items-center justify-center px-8 z-10">
          {textOverlay && (
            <p
              className="text-3xl font-bold text-center leading-tight drop-shadow-lg"
              style={{
                fontFamily: currentStyle.fontFamily,
                color: currentStyle.color,
              }}
            >
              {textOverlay}
            </p>
          )}
        </div>

        {/* Bottom actions */}
        <div className="absolute bottom-8 left-0 right-0 px-4 flex gap-3 z-10">
          <button
            onClick={() => setStep("edit")}
            className="flex-1 rounded-xl py-3 text-sm font-bold transition-all active:scale-[0.97]"
            style={{ background: "rgba(255,255,255,0.2)", backdropFilter: "blur(10px)", color: "#fff" }}
          >
            {t.storiesBack || "Retour"}
          </button>
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="flex-1 rounded-xl py-3 text-sm font-bold text-white transition-all active:scale-[0.97] disabled:opacity-50"
            style={{ background: "var(--c-accent)" }}
          >
            {publishing ? "..." : (t.storiesPublish || "Publier")}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
