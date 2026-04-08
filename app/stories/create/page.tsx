"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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

type MediaType = "video" | "image";
type StepKey = "pet" | "media" | "preview";

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
// Constants
// ---------------------------------------------------------------------------

const MAX_VIDEO_DURATION = 30; // seconds
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const VIDEO_EXTENSIONS = ["mp4", "webm", "mov", "quicktime"];
const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "heic"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getFileExtension(file: File): string {
  const parts = file.name.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
}

function isVideoFile(file: File): boolean {
  return file.type.startsWith("video/") || VIDEO_EXTENSIONS.includes(getFileExtension(file));
}

function isImageFile(file: File): boolean {
  return file.type.startsWith("image/") || IMAGE_EXTENSIONS.includes(getFileExtension(file));
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StoryCreatePage() {
  const router = useRouter();
  const { t } = useAppContext();

  // Data
  const [animals, setAnimals] = useState<AnimalRow[]>([]);
  const [selectedAnimal, setSelectedAnimal] = useState<AnimalRow | null>(null);

  // Media
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<MediaType | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);

  // Text overlay
  const [textOverlay, setTextOverlay] = useState("");
  const [textStyleIdx, setTextStyleIdx] = useState(0);

  // Flow
  const [step, setStep] = useState<StepKey>("pet");
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  // -----------------------------------------------------------------------
  // Load user's animals
  // -----------------------------------------------------------------------

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/feed");
        return;
      }

      const { data } = await supabase
        .from("animals")
        .select("*")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });

      const list = (data as AnimalRow[] | null) || [];
      setAnimals(list);

      if (list.length === 1) {
        setSelectedAnimal(list[0]);
        setStep("media");
      }

      setLoading(false);
    }

    load();
  }, [router]);

  // -----------------------------------------------------------------------
  // Cleanup object URLs on unmount
  // -----------------------------------------------------------------------

  useEffect(() => {
    return () => {
      if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl);
    };
  }, [mediaPreviewUrl]);

  // -----------------------------------------------------------------------
  // Handle file selection
  // -----------------------------------------------------------------------

  const handleFileSelected = useCallback(
    (file: File) => {
      setError(null);

      // Determine type
      if (isVideoFile(file)) {
        if (file.size > MAX_VIDEO_SIZE) {
          setError(t.storiesVideoTooLarge || "La video ne doit pas depasser 50 Mo");
          return;
        }

        const url = URL.createObjectURL(file);

        // Get video duration
        const tempVideo = document.createElement("video");
        tempVideo.preload = "metadata";
        tempVideo.onloadedmetadata = () => {
          const dur = tempVideo.duration;
          setVideoDuration(dur);
          URL.revokeObjectURL(tempVideo.src);

          if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl);
          setMediaFile(file);
          setMediaPreviewUrl(url);
          setMediaType("video");
          setStep("preview");
        };
        tempVideo.onerror = () => {
          URL.revokeObjectURL(url);
          setError(t.storiesInvalidVideo || "Format video non supporte");
        };
        tempVideo.src = url;
      } else if (isImageFile(file)) {
        if (file.size > MAX_IMAGE_SIZE) {
          setError(t.storiesImageTooLarge || "L'image ne doit pas depasser 10 Mo");
          return;
        }

        if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl);
        const url = URL.createObjectURL(file);
        setMediaFile(file);
        setMediaPreviewUrl(url);
        setMediaType("image");
        setVideoDuration(0);
        setStep("preview");
      } else {
        setError(t.storiesUnsupportedFormat || "Format non supporte. Utilisez JPG, PNG, WEBP, MP4, MOV ou WEBM.");
      }
    },
    [mediaPreviewUrl, t]
  );

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileSelected(file);
      // Reset input so user can re-select same file
      e.target.value = "";
    },
    [handleFileSelected]
  );

  // -----------------------------------------------------------------------
  // Publish story
  // -----------------------------------------------------------------------

  async function handlePublish() {
    if (!selectedAnimal || !mediaFile || !mediaType) return;

    setPublishing(true);
    setUploadProgress(0);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Build storage path
      const ext = getFileExtension(mediaFile) || (mediaType === "video" ? "mp4" : "jpg");
      const storagePath = `${user.id}/${Date.now()}.${ext}`;

      // Upload with progress simulation
      // Supabase JS v2 upload doesn't expose native XHR progress,
      // so we simulate incremental progress then jump to 100 on success.
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 10;
        });
      }, 200);

      const { error: uploadError } = await supabase.storage
        .from("stories")
        .upload(storagePath, mediaFile, {
          contentType: mediaFile.type,
          upsert: false,
        });

      clearInterval(progressInterval);

      if (uploadError) {
        setError(t.storiesUploadError || "Erreur lors du telechargement. Reessayez.");
        setPublishing(false);
        setUploadProgress(0);
        return;
      }

      setUploadProgress(100);

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("stories").getPublicUrl(storagePath);

      // Insert story row
      await supabase.from("stories").insert({
        user_id: user.id,
        animal_id: selectedAnimal.id,
        media_url: publicUrl,
        media_type: mediaType,
        caption: textOverlay || null,
        text_style: textOverlay ? TEXT_STYLES[textStyleIdx] : null,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

      router.push("/stories");
    } catch {
      setError(t.storiesPublishError || "Erreur lors de la publication. Reessayez.");
      setPublishing(false);
      setUploadProgress(0);
    }
  }

  // -----------------------------------------------------------------------
  // Step indicator
  // -----------------------------------------------------------------------

  const STEPS: StepKey[] = ["pet", "media", "preview"];
  const currentStepIndex = STEPS.indexOf(step);

  function StepIndicator() {
    return (
      <div className="flex items-center gap-2 mb-6 justify-center">
        {STEPS.map((s, idx) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full transition-all duration-300"
              style={{
                background:
                  idx <= currentStepIndex ? "var(--c-accent)" : "var(--c-border)",
                transform: idx === currentStepIndex ? "scale(1.3)" : "scale(1)",
              }}
            />
            {idx < STEPS.length - 1 && (
              <div
                className="w-8 h-[2px] rounded-full transition-all duration-300"
                style={{
                  background:
                    idx < currentStepIndex ? "var(--c-accent)" : "var(--c-border)",
                }}
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Back button helper
  // -----------------------------------------------------------------------

  function BackButton({ onClick }: { onClick: () => void }) {
    return (
      <button
        onClick={onClick}
        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: "var(--c-card)", color: "var(--c-text)" }}
        aria-label={t.storiesBack || "Retour"}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
      </button>
    );
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
        <div
          className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: "var(--c-border)", borderTopColor: "transparent" }}
        />
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
          <p
            className="text-sm font-semibold mb-4"
            style={{ color: "var(--c-text)" }}
          >
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
      <main
        className="min-h-screen px-4 md:px-6 pt-6 pb-28"
        style={{ background: "var(--c-deep)" }}
      >
        <div className="mx-auto max-w-lg">
          <StepIndicator />

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <BackButton onClick={() => router.push("/feed")} />
            <h1
              className="text-xl font-extrabold"
              style={{ color: "var(--c-text)" }}
            >
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
                    setStep("media");
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
                    <p
                      className="text-xs"
                      style={{ color: "var(--c-text-muted)" }}
                    >
                      {emoji} {animal.breed || animal.species}
                    </p>
                  </div>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
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
  // Step 2: Capture / Upload Media
  // -----------------------------------------------------------------------

  if (step === "media") {
    return (
      <main
        className="min-h-screen px-4 md:px-6 pt-6 pb-28"
        style={{ background: "var(--c-deep)" }}
      >
        <div className="mx-auto max-w-lg">
          <StepIndicator />

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <BackButton
              onClick={() =>
                animals.length > 1 ? setStep("pet") : router.push("/feed")
              }
            />
            <h1
              className="text-xl font-extrabold"
              style={{ color: "var(--c-text)" }}
            >
              {t.storiesMedia || "Photo ou video"}
            </h1>
          </div>

          {/* Selected pet banner */}
          {selectedAnimal && (
            <div
              className="rounded-2xl p-3 mb-6 flex items-center gap-3"
              style={{
                background: "var(--c-card)",
                border: "1px solid var(--c-border)",
              }}
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
              <p
                className="font-bold text-sm"
                style={{ color: "var(--c-text)" }}
              >
                {selectedAnimal.name}
              </p>
            </div>
          )}

          {/* Two big capture buttons */}
          <div className="grid grid-cols-1 gap-4 mb-6">
            {/* Camera button */}
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="rounded-2xl p-8 flex flex-col items-center justify-center gap-4 transition-all active:scale-[0.97]"
              style={{
                background: "var(--c-card)",
                border: "1px solid var(--c-border)",
              }}
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: "var(--c-accent)", color: "#fff" }}
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </div>
              <div className="text-center">
                <p
                  className="font-bold text-base"
                  style={{ color: "var(--c-text)" }}
                >
                  {t.storiesCameraButton || "Filmer / Photo"}
                </p>
                <p
                  className="text-xs mt-1"
                  style={{ color: "var(--c-text-muted)" }}
                >
                  {t.storiesCameraHint || "Ouvrir la camera"}
                </p>
              </div>
            </button>

            {/* Gallery button */}
            <button
              onClick={() => galleryInputRef.current?.click()}
              className="rounded-2xl p-8 flex flex-col items-center justify-center gap-4 transition-all active:scale-[0.97]"
              style={{
                background: "var(--c-card)",
                border: "1px solid var(--c-border)",
              }}
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{
                  background: "transparent",
                  border: "2px solid var(--c-accent)",
                  color: "var(--c-accent)",
                }}
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
              <div className="text-center">
                <p
                  className="font-bold text-base"
                  style={{ color: "var(--c-text)" }}
                >
                  {t.storiesGalleryButton || "Galerie"}
                </p>
                <p
                  className="text-xs mt-1"
                  style={{ color: "var(--c-text-muted)" }}
                >
                  {t.storiesGalleryHint || "Choisir depuis la galerie"}
                </p>
              </div>
            </button>
          </div>

          {/* File size hints */}
          <div className="text-center space-y-1">
            <p className="text-xs" style={{ color: "var(--c-text-muted)" }}>
              {t.storiesVideoLimit || "Video : max 30s, 50 Mo"}
              {" | "}
              {t.storiesImageLimit || "Image : max 10 Mo"}
            </p>
            <p className="text-xs" style={{ color: "var(--c-text-muted)" }}>
              JPG, PNG, WEBP, HEIC, MP4, MOV, WEBM
            </p>
          </div>

          {/* Error */}
          {error && (
            <div
              className="mt-4 rounded-xl p-3 text-center text-sm font-medium"
              style={{
                background: "rgba(239, 68, 68, 0.15)",
                color: "#ef4444",
                border: "1px solid rgba(239, 68, 68, 0.3)",
              }}
            >
              {error}
            </div>
          )}

          {/* Hidden file inputs */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="video/*,image/*"
            capture="environment"
            className="hidden"
            onChange={onInputChange}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="video/*,image/*"
            className="hidden"
            onChange={onInputChange}
          />
        </div>
      </main>
    );
  }

  // -----------------------------------------------------------------------
  // Step 3: Preview + Text Overlay + Publish
  // -----------------------------------------------------------------------

  if (step === "preview" && selectedAnimal && mediaPreviewUrl && mediaType) {
    const currentStyle = TEXT_STYLES[textStyleIdx];
    const isVideo = mediaType === "video";
    const isTooLong = isVideo && videoDuration > MAX_VIDEO_DURATION;

    return (
      <main
        className="min-h-screen px-4 md:px-6 pt-6 pb-28"
        style={{ background: "var(--c-deep)" }}
      >
        <div className="mx-auto max-w-lg">
          <StepIndicator />

          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <BackButton
                onClick={() => {
                  setStep("media");
                  setError(null);
                }}
              />
              <h1
                className="text-xl font-extrabold"
                style={{ color: "var(--c-text)" }}
              >
                {t.storiesPreview || "Apercu"}
              </h1>
            </div>

            {/* Pet badge */}
            {selectedAnimal && (
              <span
                className="px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5"
                style={{
                  background: "var(--c-card)",
                  color: "var(--c-text)",
                  border: "1px solid var(--c-border)",
                }}
              >
                {EMOJI_MAP[selectedAnimal.species] || "\uD83D\uDC3E"}{" "}
                {selectedAnimal.name}
              </span>
            )}
          </div>

          {/* 9:16 preview container */}
          <div
            className="relative rounded-3xl overflow-hidden mb-5 mx-auto"
            style={{
              aspectRatio: "9 / 16",
              maxHeight: "55vh",
              background: "#000",
            }}
          >
            {/* Media */}
            {isVideo ? (
              <video
                ref={videoPreviewRef}
                src={mediaPreviewUrl}
                autoPlay
                muted
                loop
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <Image
                src={mediaPreviewUrl}
                alt={selectedAnimal.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 400px"
                unoptimized
              />
            )}

            {/* Dark gradient overlay */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.05) 40%, rgba(0,0,0,0.4) 100%)",
              }}
            />

            {/* Video duration badge */}
            {isVideo && videoDuration > 0 && (
              <div className="absolute top-3 right-3 z-10">
                <span
                  className="px-2.5 py-1 rounded-full text-xs font-bold"
                  style={{
                    background: isTooLong
                      ? "rgba(239, 68, 68, 0.85)"
                      : "rgba(0,0,0,0.5)",
                    color: "#fff",
                    backdropFilter: "blur(6px)",
                  }}
                >
                  {formatDuration(videoDuration)}
                  {isTooLong && ` / ${MAX_VIDEO_DURATION}s max`}
                </span>
              </div>
            )}

            {/* Media type indicator */}
            <div className="absolute top-3 left-3 z-10">
              <span
                className="px-2.5 py-1 rounded-full text-xs font-bold"
                style={{
                  background: "rgba(0,0,0,0.5)",
                  color: "#fff",
                  backdropFilter: "blur(6px)",
                }}
              >
                {isVideo ? "VIDEO" : "PHOTO"}
              </span>
            </div>

            {/* Text overlay display */}
            {textOverlay && (
              <div className="absolute inset-0 flex items-center justify-center p-6 z-10 pointer-events-none">
                <p
                  className="text-2xl font-bold text-center leading-tight drop-shadow-lg"
                  style={{
                    fontFamily: currentStyle.fontFamily,
                    color: currentStyle.color,
                    textShadow: "0 2px 8px rgba(0,0,0,0.6)",
                  }}
                >
                  {textOverlay}
                </p>
              </div>
            )}

            {/* Pet name badge on preview */}
            <div className="absolute bottom-3 left-3 z-10">
              <span
                className="px-3 py-1.5 rounded-full text-xs font-bold"
                style={{
                  background: "rgba(255,255,255,0.2)",
                  backdropFilter: "blur(8px)",
                  color: "#fff",
                }}
              >
                {selectedAnimal.name}{" "}
                {EMOJI_MAP[selectedAnimal.species] || "\uD83D\uDC3E"}
              </span>
            </div>
          </div>

          {/* Trim warning for long videos */}
          {isTooLong && (
            <div
              className="rounded-xl p-3 mb-4 text-center text-sm font-medium"
              style={{
                background: "rgba(234, 179, 8, 0.15)",
                color: "#eab308",
                border: "1px solid rgba(234, 179, 8, 0.3)",
              }}
            >
              {t.storiesVideoTooLong ||
                `La video depasse ${MAX_VIDEO_DURATION}s. Seules les ${MAX_VIDEO_DURATION} premieres secondes seront utilisees.`}
            </div>
          )}

          {/* Text overlay input */}
          <div className="mb-4">
            <label
              className="block text-xs font-bold mb-2"
              style={{ color: "var(--c-text-muted)" }}
            >
              {t.storiesAddText || "Ajouter du texte"}{" "}
              <span className="font-normal">
                ({t.storiesOptional || "optionnel"})
              </span>
            </label>
            <textarea
              value={textOverlay}
              onChange={(e) => setTextOverlay(e.target.value)}
              placeholder={t.storiesTextPlaceholder || "Ecris quelque chose..."}
              maxLength={120}
              rows={2}
              className="w-full rounded-xl p-4 text-sm resize-none outline-none"
              style={{
                background: "var(--c-card)",
                color: "var(--c-text)",
                border: "1px solid var(--c-border)",
              }}
            />
            <div className="flex justify-end mt-1">
              <span
                className="text-xs"
                style={{ color: "var(--c-text-muted)" }}
              >
                {textOverlay.length}/120
              </span>
            </div>
          </div>

          {/* Text style selector */}
          {textOverlay.length > 0 && (
            <div
              className="flex gap-2 mb-5 overflow-x-auto pb-2"
              style={{ scrollbarWidth: "none" }}
            >
              {TEXT_STYLES.map((style, idx) => (
                <button
                  key={idx}
                  onClick={() => setTextStyleIdx(idx)}
                  className="flex-shrink-0 w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center text-xs font-bold"
                  style={{
                    background: style.color,
                    borderColor:
                      idx === textStyleIdx ? "var(--c-accent)" : "transparent",
                    transform: idx === textStyleIdx ? "scale(1.15)" : "scale(1)",
                  }}
                  aria-label={style.label}
                >
                  <span className="mix-blend-difference text-white">Aa</span>
                </button>
              ))}
            </div>
          )}

          {/* Upload progress bar */}
          {publishing && uploadProgress > 0 && (
            <div className="mb-4">
              <div
                className="w-full h-2 rounded-full overflow-hidden"
                style={{ background: "var(--c-border)" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(uploadProgress, 100)}%`,
                    background: "var(--c-accent)",
                  }}
                />
              </div>
              <p
                className="text-xs text-center mt-1.5"
                style={{ color: "var(--c-text-muted)" }}
              >
                {uploadProgress < 100
                  ? t.storiesUploading || "Telechargement en cours..."
                  : t.storiesPublishing || "Publication..."}
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div
              className="mb-4 rounded-xl p-3 text-center text-sm font-medium"
              style={{
                background: "rgba(239, 68, 68, 0.15)",
                color: "#ef4444",
                border: "1px solid rgba(239, 68, 68, 0.3)",
              }}
            >
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                setStep("media");
                setError(null);
              }}
              disabled={publishing}
              className="flex-1 rounded-xl py-3.5 text-sm font-bold transition-all active:scale-[0.97] disabled:opacity-50"
              style={{
                background: "var(--c-card)",
                color: "var(--c-text)",
                border: "1px solid var(--c-border)",
              }}
            >
              {t.storiesChangeMedia || "Changer"}
            </button>
            <button
              onClick={handlePublish}
              disabled={publishing || isTooLong}
              className="flex-1 rounded-xl py-3.5 text-sm font-bold text-white transition-all active:scale-[0.97] disabled:opacity-50"
              style={{ background: "var(--c-accent)" }}
            >
              {publishing
                ? t.storiesPublishing || "Publication..."
                : t.storiesPublish || "Publier"}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return null;
}
