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

type MediaType = "video" | "photo";
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
// Background gradients for text-only stories
// ---------------------------------------------------------------------------

const BG_GRADIENTS = [
  { label: "Violet", value: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
  { label: "Rose", value: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" },
  { label: "Ocean", value: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" },
  { label: "Nature", value: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)" },
  { label: "Sunset", value: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)" },
  { label: "Lavande", value: "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)" },
  { label: "Peach", value: "linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)" },
  { label: "Nuit", value: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)" },
  { label: "Feu", value: "linear-gradient(135deg, #f12711 0%, #f5af19 100%)" },
  { label: "Foret", value: "linear-gradient(135deg, #134e5e 0%, #71b280 100%)" },
];

// ---------------------------------------------------------------------------
// Pet stickers
// ---------------------------------------------------------------------------

const PET_STICKERS = [
  { emoji: "\uD83D\uDC3E", label: "Patte" },
  { emoji: "\uD83D\uDC15", label: "Chien" },
  { emoji: "\uD83D\uDC31", label: "Chat" },
  { emoji: "\uD83E\uDDB4", label: "Os" },
  { emoji: "\u2764\uFE0F", label: "Coeur" },
  { emoji: "\uD83D\uDD25", label: "Feu" },
  { emoji: "\u2B50", label: "Etoile" },
  { emoji: "\uD83C\uDF89", label: "Fete" },
  { emoji: "\uD83D\uDE0D", label: "Amour" },
  { emoji: "\uD83C\uDF1F", label: "Brille" },
  { emoji: "\uD83D\uDC95", label: "Coeurs" },
  { emoji: "\uD83C\uDF08", label: "Arc-en-ciel" },
];

// ---------------------------------------------------------------------------
// Duration options
// ---------------------------------------------------------------------------

const DURATION_OPTIONS = [
  { value: 5, label: "5s" },
  { value: 10, label: "10s" },
  { value: 15, label: "15s" },
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

  // Text-only story mode
  const [isTextOnly, setIsTextOnly] = useState(false);
  const [textOnlyContent, setTextOnlyContent] = useState("");
  const [selectedBgIdx, setSelectedBgIdx] = useState(0);

  // Sticker
  const [selectedSticker, setSelectedSticker] = useState<string | null>(null);

  // Duration for display
  const [storyDuration, setStoryDuration] = useState(5);

  // Text overlay
  const [textOverlay, setTextOverlay] = useState("");
  const [textStyleIdx, setTextStyleIdx] = useState(0);

  // Flow
  const [step, setStep] = useState<StepKey>("pet");
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Image crop state (drag-to-reframe in preview)
  const [imgNatural, setImgNatural] = useState({ w: 0, h: 0 });
  const [cropScale, setCropScale] = useState(1);
  const [cropPos, setCropPos] = useState({ x: 0, y: 0 });
  const cropDragRef = useRef({ active: false, sx: 0, sy: 0, ox: 0, oy: 0 });
  const cropPinchRef = useRef({ dist: 0, scale: 1 });
  const isPinching = useRef(false);
  const cropFrameRef = useRef<HTMLDivElement>(null);

  // Refs
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  // -----------------------------------------------------------------------
  // Load user's animals
  // -----------------------------------------------------------------------

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.push("/feed");
          return;
        }

        const { data, error: fetchErr } = await supabase
          .from("animals")
          .select("*")
          .eq("created_by", user.id)
          .order("created_at", { ascending: false });

        if (fetchErr) {
          console.error("[StoryCreate] fetch animals error:", fetchErr);
          setError(t.storiesLoadError || "Impossible de charger vos animaux. Reessayez.");
        }

        const list = (data as AnimalRow[] | null) || [];
        setAnimals(list);

        if (list.length === 1) {
          setSelectedAnimal(list[0]);
          setStep("media");
        }
      } catch (err) {
        console.error("[StoryCreate] unexpected error:", err);
        setError(t.storiesLoadError || "Erreur inattendue. Reessayez plus tard.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router, t]);

  // -----------------------------------------------------------------------
  // Cleanup object URLs on unmount
  // -----------------------------------------------------------------------

  useEffect(() => {
    return () => {
      if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl);
    };
  }, [mediaPreviewUrl]);

  // -----------------------------------------------------------------------
  // Image crop helpers (drag-to-reframe + pinch-to-zoom)
  // -----------------------------------------------------------------------

  const MIN_CROP_SCALE = 1;
  const MAX_CROP_SCALE = 4;

  function clampCropPos(dx: number, dy: number, s: number) {
    if (!cropFrameRef.current || imgNatural.w === 0) return { x: dx, y: dy };
    const rect = cropFrameRef.current.getBoundingClientRect();
    const cW = rect.width;
    const cH = rect.height;
    const baseScale = Math.max(cW / imgNatural.w, cH / imgNatural.h);
    const totalW = imgNatural.w * baseScale * s;
    const totalH = imgNatural.h * baseScale * s;
    const maxTx = Math.max(0, (totalW - cW) / 2);
    const maxTy = Math.max(0, (totalH - cH) / 2);
    return {
      x: Math.max(-maxTx, Math.min(maxTx, dx)),
      y: Math.max(-maxTy, Math.min(maxTy, dy)),
    };
  }

  function onCropPointerDown(e: React.PointerEvent) {
    if (isPinching.current) return;
    e.preventDefault();
    cropDragRef.current = { active: true, sx: e.clientX, sy: e.clientY, ox: cropPos.x, oy: cropPos.y };
  }

  function onCropPointerMove(e: React.PointerEvent) {
    if (!cropDragRef.current.active || isPinching.current) return;
    const dx = e.clientX - cropDragRef.current.sx + cropDragRef.current.ox;
    const dy = e.clientY - cropDragRef.current.sy + cropDragRef.current.oy;
    setCropPos(clampCropPos(dx, dy, cropScale));
  }

  function onCropPointerUp() {
    cropDragRef.current.active = false;
  }

  function onCropWheel(e: React.WheelEvent) {
    e.stopPropagation();
    const newScale = Math.max(MIN_CROP_SCALE, Math.min(MAX_CROP_SCALE, cropScale - e.deltaY * 0.002));
    setCropScale(newScale);
    setCropPos((prev) => clampCropPos(prev.x, prev.y, newScale));
  }

  function onCropTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      isPinching.current = true;
      cropDragRef.current.active = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      cropPinchRef.current = { dist: Math.hypot(dx, dy), scale: cropScale };
    }
  }

  function onCropTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && isPinching.current) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const newDist = Math.hypot(dx, dy);
      const ratio = newDist / (cropPinchRef.current.dist || 1);
      const newScale = Math.max(MIN_CROP_SCALE, Math.min(MAX_CROP_SCALE, cropPinchRef.current.scale * ratio));
      setCropScale(newScale);
      setCropPos((prev) => clampCropPos(prev.x, prev.y, newScale));
    }
  }

  function onCropTouchEnd(e: React.TouchEvent) {
    if (e.touches.length < 2) {
      isPinching.current = false;
    }
  }

  /** Crop the image to the visible 9:16 frame and return as JPEG Blob */
  async function cropImageToBlob(): Promise<Blob | null> {
    if (!cropFrameRef.current || !mediaPreviewUrl || imgNatural.w === 0) return null;

    const rect = cropFrameRef.current.getBoundingClientRect();
    const cW = rect.width;
    const cH = rect.height;

    const baseScale = Math.max(cW / imgNatural.w, cH / imgNatural.h);
    const totalScale = baseScale * cropScale;

    const totalW = imgNatural.w * totalScale;
    const totalH = imgNatural.h * totalScale;

    // Image center is at container center + user offset
    const imgLeft = (cW - totalW) / 2 + cropPos.x;
    const imgTop = (cH - totalH) / 2 + cropPos.y;

    // Source rect in natural image coordinates
    const srcX = Math.max(0, -imgLeft / totalScale);
    const srcY = Math.max(0, -imgTop / totalScale);
    const srcW = Math.min(imgNatural.w - srcX, cW / totalScale);
    const srcH = Math.min(imgNatural.h - srcY, cH / totalScale);

    const OUT_W = 1080;
    const OUT_H = 1920;

    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = OUT_W;
        canvas.height = OUT_H;
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(null); return; }
        ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, OUT_W, OUT_H);
        canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.92);
      };
      img.onerror = () => resolve(null);
      img.src = mediaPreviewUrl;
    });
  }

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
          setIsTextOnly(false);
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
        setMediaType("photo");
        setIsTextOnly(false);
        setVideoDuration(0);
        setCropScale(1);
        setCropPos({ x: 0, y: 0 });
        setImgNatural({ w: 0, h: 0 });
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
  // Start text-only story
  // -----------------------------------------------------------------------

  function handleTextOnlyMode() {
    setIsTextOnly(true);
    setMediaFile(null);
    setMediaPreviewUrl(null);
    setMediaType(null);
    setStep("preview");
  }

  // -----------------------------------------------------------------------
  // Publish story
  // -----------------------------------------------------------------------

  async function handlePublish() {
    if (!selectedAnimal) return;

    // Text-only story
    if (isTextOnly) {
      if (!textOnlyContent.trim() && !selectedSticker) {
        setError("Ajoute du texte ou un sticker pour ta story");
        return;
      }

      setPublishing(true);
      setError(null);

      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setPublishing(false);
          return;
        }

        const { error: insertError } = await supabase
          .from("stories")
          .insert({
            user_id: user.id,
            animal_id: selectedAnimal.id,
            media_url: null,
            media_type: null,
            caption: textOnlyContent || null,
            bg_gradient: BG_GRADIENTS[selectedBgIdx].value,
            text_color: TEXT_STYLES[textStyleIdx].color,
            sticker: selectedSticker || null,
            template: "text",
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          })
          .select("id")
          .single();

        if (insertError) {
          console.error("[StoryCreate] insert error:", insertError);
          setError("Erreur: " + insertError.message);
          setPublishing(false);
          return;
        }

        router.push("/stories");
      } catch (e) {
        console.error("[StoryCreate] publish error:", e);
        setError(t.storiesPublishError || "Erreur lors de la publication. Reessayez.");
        setPublishing(false);
      }
      return;
    }

    // Media story
    if (!mediaFile || !mediaType) return;

    setPublishing(true);
    setUploadProgress(0);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setPublishing(false);
        return;
      }

      // For images, apply the user's crop before uploading
      let fileToUpload: File | Blob = mediaFile;
      let contentType = mediaFile.type;
      let ext = getFileExtension(mediaFile) || (mediaType === "video" ? "mp4" : "jpg");

      if (mediaType === "photo" && imgNatural.w > 0) {
        const croppedBlob = await cropImageToBlob();
        if (croppedBlob) {
          fileToUpload = croppedBlob;
          contentType = "image/jpeg";
          ext = "jpg";
        }
      }

      const mediaFolder = mediaType === "video" ? "videos" : "photos";
      const storagePath = `${mediaFolder}/${user.id}/${Date.now()}.${ext}`;

      // Upload with progress simulation
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => (prev >= 90 ? prev : prev + Math.random() * 10));
      }, 200);

      const { error: uploadError } = await supabase.storage
        .from("stories")
        .upload(storagePath, fileToUpload, {
          contentType,
          upsert: false,
        });

      clearInterval(progressInterval);

      if (uploadError) {
        console.error("[StoryCreate] upload error:", uploadError);
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
      const { data: storyData, error: insertError } = await supabase
        .from("stories")
        .insert({
          user_id: user.id,
          animal_id: selectedAnimal.id,
          media_url: publicUrl,
          media_type: mediaType,
          caption: textOverlay || null,
          text_style: textOverlay ? TEXT_STYLES[textStyleIdx] : null,
          sticker: selectedSticker || null,
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })
        .select("id")
        .single();

      if (insertError) {
        console.error("[StoryCreate] insert error:", insertError);
        setError("Erreur: " + insertError.message);
        setPublishing(false);
        setUploadProgress(0);
        return;
      }

      // Notify all matched users (fire-and-forget)
      fetch("/api/stories/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          story_id: storyData?.id || null,
          animal_id: selectedAnimal.id,
          animal_name: selectedAnimal.name,
          media_type: mediaType,
        }),
      }).catch(() => {});

      router.push("/stories");
    } catch (e) {
      console.error("[StoryCreate] publish error:", e);
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
        className="min-h-screen px-4 pt-6 pb-32"
        style={{ background: "var(--c-deep)" }}
      >
        <div className="mx-auto max-w-lg space-y-4">
          {/* Skeleton step indicator */}
          <div className="flex items-center gap-2 justify-center mb-6">
            <div className="w-2.5 h-2.5 rounded-full glass animate-breathe" />
            <div className="w-8 h-[2px] glass rounded-full animate-breathe" style={{ animationDelay: "0.1s" }} />
            <div className="w-2.5 h-2.5 rounded-full glass animate-breathe" style={{ animationDelay: "0.15s" }} />
            <div className="w-8 h-[2px] glass rounded-full animate-breathe" style={{ animationDelay: "0.2s" }} />
            <div className="w-2.5 h-2.5 rounded-full glass animate-breathe" style={{ animationDelay: "0.25s" }} />
          </div>
          {/* Skeleton header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-full glass animate-breathe" />
            <div className="w-40 h-5 glass rounded-full animate-breathe" style={{ animationDelay: "0.1s" }} />
          </div>
          {/* Skeleton cards */}
          <div className="glass rounded-2xl animate-breathe" style={{ height: 80, animationDelay: "0.15s" }} />
          <div className="glass rounded-2xl animate-breathe" style={{ height: 80, animationDelay: "0.3s" }} />
          <div className="glass rounded-2xl animate-breathe" style={{ height: 80, animationDelay: "0.45s" }} />
        </div>
      </main>
    );
  }

  // -----------------------------------------------------------------------
  // No animals
  // -----------------------------------------------------------------------

  if (animals.length === 0) {
    return (
      <main
        className="min-h-screen px-4 pt-6 pb-32 flex items-center justify-center"
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
        className="min-h-screen px-4 md:px-6 pt-6 pb-32"
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
        className="min-h-screen px-4 md:px-6 pt-6 pb-32"
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
          <div className="grid grid-cols-1 gap-4 mb-4">
            {/* Camera button */}
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="rounded-2xl p-6 flex items-center gap-4 transition-all active:scale-[0.97]"
              style={{
                background: "var(--c-card)",
                border: "1px solid var(--c-border)",
              }}
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--c-accent)", color: "#fff" }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-sm" style={{ color: "var(--c-text)" }}>
                  {t.storiesCameraButton || "Filmer / Photo"}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--c-text-muted)" }}>
                  {t.storiesCameraHint || "Ouvrir la camera"}
                </p>
              </div>
            </button>

            {/* Gallery button */}
            <button
              onClick={() => galleryInputRef.current?.click()}
              className="rounded-2xl p-6 flex items-center gap-4 transition-all active:scale-[0.97]"
              style={{
                background: "var(--c-card)",
                border: "1px solid var(--c-border)",
              }}
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: "transparent",
                  border: "2px solid var(--c-accent)",
                  color: "var(--c-accent)",
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-sm" style={{ color: "var(--c-text)" }}>
                  {t.storiesGalleryButton || "Galerie"}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--c-text-muted)" }}>
                  {t.storiesGalleryHint || "Choisir depuis la galerie"}
                </p>
              </div>
            </button>

            {/* Text-only story button */}
            <button
              onClick={handleTextOnlyMode}
              className="rounded-2xl p-6 flex items-center gap-4 transition-all active:scale-[0.97]"
              style={{
                background: "linear-gradient(135deg, rgba(102,126,234,0.15) 0%, rgba(118,75,162,0.15) 100%)",
                border: "1px solid rgba(102,126,234,0.3)",
              }}
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 text-2xl"
                style={{
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                }}
              >
                Aa
              </div>
              <div>
                <p className="font-bold text-sm" style={{ color: "var(--c-text)" }}>
                  Story texte
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--c-text-muted)" }}>
                  Fond colore + texte + stickers
                </p>
              </div>
            </button>
          </div>

          {/* File size hints */}
          <div className="text-center space-y-1 mt-4">
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
  // Step 3: Text-only story preview
  // -----------------------------------------------------------------------

  if (step === "preview" && isTextOnly && selectedAnimal) {
    const currentStyle = TEXT_STYLES[textStyleIdx];

    return (
      <main
        className="min-h-screen px-4 md:px-6 pt-6 pb-32"
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
                  setIsTextOnly(false);
                }}
              />
              <h1 className="text-xl font-extrabold" style={{ color: "var(--c-text)" }}>
                Story texte
              </h1>
            </div>
            {/* Pet badge */}
            <span
              className="px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5"
              style={{
                background: "var(--c-card)",
                color: "var(--c-text)",
                border: "1px solid var(--c-border)",
              }}
            >
              {EMOJI_MAP[selectedAnimal.species] || "\uD83D\uDC3E"} {selectedAnimal.name}
            </span>
          </div>

          {/* 9:16 preview */}
          <div
            className="relative rounded-3xl overflow-hidden mb-5 mx-auto flex items-center justify-center"
            style={{
              aspectRatio: "9 / 16",
              maxHeight: "45vh",
              background: BG_GRADIENTS[selectedBgIdx].value,
            }}
          >
            {/* Sticker */}
            {selectedSticker && (
              <div className="absolute text-6xl" style={{ top: "20%", opacity: 0.9 }}>
                {selectedSticker}
              </div>
            )}

            {/* Text content */}
            {textOnlyContent && (
              <p
                className="text-2xl font-bold text-center leading-tight px-6 drop-shadow-lg whitespace-pre-line"
                style={{
                  fontFamily: currentStyle.fontFamily,
                  color: currentStyle.color,
                  textShadow: "0 2px 8px rgba(0,0,0,0.5)",
                }}
              >
                {textOnlyContent}
              </p>
            )}

            {/* Animal badge */}
            <div className="absolute bottom-3 left-3">
              <span
                className="px-3 py-1.5 rounded-full text-xs font-bold"
                style={{
                  background: "rgba(255,255,255,0.2)",
                  backdropFilter: "blur(8px)",
                  color: "#fff",
                }}
              >
                {selectedAnimal.name} {EMOJI_MAP[selectedAnimal.species] || "\uD83D\uDC3E"}
              </span>
            </div>

            {/* Duration badge */}
            <div className="absolute top-3 right-3">
              <span
                className="px-2.5 py-1 rounded-full text-xs font-bold"
                style={{
                  background: "rgba(0,0,0,0.5)",
                  color: "#fff",
                  backdropFilter: "blur(6px)",
                }}
              >
                {storyDuration}s
              </span>
            </div>
          </div>

          {/* Background color picker */}
          <div className="mb-4">
            <label className="block text-xs font-bold mb-2" style={{ color: "var(--c-text-muted)" }}>
              Fond
            </label>
            <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
              {BG_GRADIENTS.map((bg, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedBgIdx(idx)}
                  className="w-10 h-10 rounded-full flex-shrink-0 transition-all"
                  style={{
                    background: bg.value,
                    border: idx === selectedBgIdx ? "3px solid var(--c-accent)" : "2px solid transparent",
                    transform: idx === selectedBgIdx ? "scale(1.15)" : "scale(1)",
                    boxShadow: idx === selectedBgIdx ? "0 0 12px rgba(var(--c-accent-rgb, 139,92,246), 0.4)" : "none",
                  }}
                  aria-label={bg.label}
                />
              ))}
            </div>
          </div>

          {/* Text input */}
          <div className="mb-4">
            <label className="block text-xs font-bold mb-2" style={{ color: "var(--c-text-muted)" }}>
              Texte
            </label>
            <textarea
              value={textOnlyContent}
              onChange={(e) => setTextOnlyContent(e.target.value)}
              placeholder="Ecris quelque chose..."
              maxLength={150}
              rows={3}
              className="w-full rounded-xl p-4 text-sm resize-none outline-none"
              style={{
                background: "var(--c-card)",
                color: "var(--c-text)",
                border: "1px solid var(--c-border)",
              }}
            />
            <div className="flex justify-end mt-1">
              <span className="text-xs" style={{ color: "var(--c-text-muted)" }}>
                {textOnlyContent.length}/150
              </span>
            </div>
          </div>

          {/* Text style selector */}
          {textOnlyContent.length > 0 && (
            <div className="mb-4">
              <label className="block text-xs font-bold mb-2" style={{ color: "var(--c-text-muted)" }}>
                Style du texte
              </label>
              <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
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
            </div>
          )}

          {/* Sticker selection */}
          <div className="mb-4">
            <label className="block text-xs font-bold mb-2" style={{ color: "var(--c-text-muted)" }}>
              Sticker
            </label>
            <div className="flex gap-2 flex-wrap">
              {/* No sticker option */}
              <button
                onClick={() => setSelectedSticker(null)}
                className="w-11 h-11 rounded-xl flex items-center justify-center transition-all text-xs font-bold"
                style={{
                  background: !selectedSticker ? "var(--c-accent)" : "var(--c-card)",
                  color: !selectedSticker ? "#fff" : "var(--c-text-muted)",
                  border: "1px solid var(--c-border)",
                }}
              >
                ----
              </button>
              {PET_STICKERS.map((s) => (
                <button
                  key={s.emoji}
                  onClick={() => setSelectedSticker(s.emoji)}
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-xl transition-all"
                  style={{
                    background: selectedSticker === s.emoji ? "rgba(139,92,246,0.2)" : "var(--c-card)",
                    border: selectedSticker === s.emoji ? "2px solid var(--c-accent)" : "1px solid var(--c-border)",
                    transform: selectedSticker === s.emoji ? "scale(1.1)" : "scale(1)",
                  }}
                  aria-label={s.label}
                >
                  {s.emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Duration picker */}
          <div className="mb-5">
            <label className="block text-xs font-bold mb-2" style={{ color: "var(--c-text-muted)" }}>
              Duree d&apos;affichage
            </label>
            <div className="flex gap-2">
              {DURATION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setStoryDuration(opt.value)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
                  style={{
                    background: storyDuration === opt.value ? "var(--c-accent)" : "var(--c-card)",
                    color: storyDuration === opt.value ? "#fff" : "var(--c-text)",
                    border: storyDuration === opt.value ? "none" : "1px solid var(--c-border)",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

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
                setIsTextOnly(false);
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
              disabled={publishing}
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

  // -----------------------------------------------------------------------
  // Step 3: Media Preview + Text Overlay + Stickers + Publish
  // -----------------------------------------------------------------------

  if (step === "preview" && selectedAnimal && mediaPreviewUrl && mediaType) {
    const currentStyle = TEXT_STYLES[textStyleIdx];
    const isVideo = mediaType === "video";
    const isTooLong = isVideo && videoDuration > MAX_VIDEO_DURATION;

    return (
      <main
        className="min-h-screen px-4 md:px-6 pt-6 pb-32"
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
                  setCropScale(1);
                  setCropPos({ x: 0, y: 0 });
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
              maxHeight: "45vh",
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
              <div
                ref={cropFrameRef}
                className="absolute inset-0 overflow-hidden touch-none cursor-grab active:cursor-grabbing"
                onPointerDown={onCropPointerDown}
                onPointerMove={onCropPointerMove}
                onPointerUp={onCropPointerUp}
                onPointerLeave={onCropPointerUp}
                onWheel={onCropWheel}
                onTouchStart={onCropTouchStart}
                onTouchMove={onCropTouchMove}
                onTouchEnd={onCropTouchEnd}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mediaPreviewUrl}
                  alt={selectedAnimal.name}
                  draggable={false}
                  className="absolute inset-0 w-full h-full object-cover select-none"
                  style={{
                    transform: `translate(${cropPos.x}px, ${cropPos.y}px) scale(${cropScale})`,
                    transformOrigin: "center center",
                    pointerEvents: "none",
                  }}
                  onLoad={(e) => {
                    const el = e.target as HTMLImageElement;
                    if (el.naturalWidth && el.naturalHeight) {
                      setImgNatural({ w: el.naturalWidth, h: el.naturalHeight });
                    }
                  }}
                />
              </div>
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
                className="px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1"
                style={{
                  background: isVideo ? "rgba(139, 92, 246, 0.85)" : "rgba(0,0,0,0.5)",
                  color: "#fff",
                  backdropFilter: "blur(6px)",
                }}
              >
                {isVideo ? "\uD83C\uDFAC Video" : "PHOTO"}
              </span>
            </div>

            {/* Crop hint for images */}
            {!isVideo && (
              <div className="absolute bottom-3 right-3 z-10 pointer-events-none">
                <span
                  className="px-2.5 py-1 rounded-full text-[10px] font-semibold flex items-center gap-1"
                  style={{
                    background: "rgba(0,0,0,0.5)",
                    color: "rgba(255,255,255,0.8)",
                    backdropFilter: "blur(6px)",
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M6.13 1L6 16a2 2 0 0 0 2 2h15" />
                    <path d="M1 6.13L16 6a2 2 0 0 1 2 2v15" />
                  </svg>
                  Glisser pour recadrer
                </span>
              </div>
            )}

            {/* Sticker on preview */}
            {selectedSticker && (
              <div className="absolute z-10 text-5xl pointer-events-none" style={{ top: "15%", left: "50%", transform: "translateX(-50%)" }}>
                {selectedSticker}
              </div>
            )}

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

          {/* Sticker selection */}
          <div className="mb-4">
            <label className="block text-xs font-bold mb-2" style={{ color: "var(--c-text-muted)" }}>
              Sticker (optionnel)
            </label>
            <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
              {/* No sticker */}
              <button
                onClick={() => setSelectedSticker(null)}
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all text-[10px] font-bold"
                style={{
                  background: !selectedSticker ? "var(--c-accent)" : "var(--c-card)",
                  color: !selectedSticker ? "#fff" : "var(--c-text-muted)",
                  border: "1px solid var(--c-border)",
                }}
              >
                ----
              </button>
              {PET_STICKERS.map((s) => (
                <button
                  key={s.emoji}
                  onClick={() => setSelectedSticker(s.emoji)}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 transition-all"
                  style={{
                    background: selectedSticker === s.emoji ? "rgba(139,92,246,0.2)" : "var(--c-card)",
                    border: selectedSticker === s.emoji ? "2px solid var(--c-accent)" : "1px solid var(--c-border)",
                    transform: selectedSticker === s.emoji ? "scale(1.1)" : "scale(1)",
                  }}
                  aria-label={s.label}
                >
                  {s.emoji}
                </button>
              ))}
            </div>
          </div>

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
              className="flex gap-2 mb-4 overflow-x-auto pb-2"
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

          {/* Duration picker */}
          <div className="mb-5">
            <label className="block text-xs font-bold mb-2" style={{ color: "var(--c-text-muted)" }}>
              Duree d&apos;affichage {!isVideo && "(images)"}
            </label>
            <div className="flex gap-2">
              {DURATION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setStoryDuration(opt.value)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
                  style={{
                    background: storyDuration === opt.value ? "var(--c-accent)" : "var(--c-card)",
                    color: storyDuration === opt.value ? "#fff" : "var(--c-text)",
                    border: storyDuration === opt.value ? "none" : "1px solid var(--c-border)",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

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
                setCropScale(1);
                setCropPos({ x: 0, y: 0 });
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
