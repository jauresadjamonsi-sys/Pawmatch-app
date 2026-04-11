"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type PetFilter = {
  id: string;
  name: string;
  icon: string;
  category: "fun" | "seasonal" | "cute" | "cool";
  apply: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
};

const PET_FILTERS: PetFilter[] = [
  {
    id: "none", name: "Original", icon: "📷", category: "fun",
    apply: () => {},
  },
  {
    id: "warm", name: "Pawband Warm", icon: "🧡", category: "cute",
    apply: (ctx, w, h) => {
      ctx.fillStyle = "rgba(255,165,0,0.12)";
      ctx.fillRect(0, 0, w, h);
      // Vignette
      const grad = ctx.createRadialGradient(w/2, h/2, w*0.3, w/2, h/2, w*0.7);
      grad.addColorStop(0, "transparent");
      grad.addColorStop(1, "rgba(0,0,0,0.35)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    },
  },
  {
    id: "vintage", name: "Retro Paw", icon: "📼", category: "cool",
    apply: (ctx, w, h) => {
      const imgData = ctx.getImageData(0, 0, w, h);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        const avg = d[i] * 0.3 + d[i+1] * 0.59 + d[i+2] * 0.11;
        d[i] = Math.min(255, avg + 40);
        d[i+1] = Math.min(255, avg + 20);
        d[i+2] = avg;
      }
      ctx.putImageData(imgData, 0, 0);
      // Grain
      for (let x = 0; x < w; x += 3) {
        for (let y = 0; y < h; y += 3) {
          const noise = Math.random() * 30 - 15;
          ctx.fillStyle = `rgba(${noise > 0 ? 255 : 0},${noise > 0 ? 255 : 0},${noise > 0 ? 255 : 0},${Math.abs(noise)/255})`;
          ctx.fillRect(x, y, 3, 3);
        }
      }
    },
  },
  {
    id: "neon", name: "Neon Glow", icon: "💜", category: "cool",
    apply: (ctx, w, h) => {
      ctx.fillStyle = "rgba(139,92,246,0.15)";
      ctx.fillRect(0, 0, w, h);
      // Glow borders
      ctx.shadowColor = "#a78bfa";
      ctx.shadowBlur = 40;
      ctx.strokeStyle = "rgba(167,139,250,0.4)";
      ctx.lineWidth = 8;
      ctx.strokeRect(20, 20, w-40, h-40);
      ctx.shadowBlur = 0;
    },
  },
  {
    id: "golden", name: "Golden Hour", icon: "🌅", category: "cute",
    apply: (ctx, w, h) => {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, "rgba(255,200,50,0.15)");
      grad.addColorStop(0.5, "rgba(255,150,50,0.1)");
      grad.addColorStop(1, "rgba(255,100,50,0.2)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      // Sun flare
      const sunGrad = ctx.createRadialGradient(w*0.8, h*0.15, 0, w*0.8, h*0.15, w*0.3);
      sunGrad.addColorStop(0, "rgba(255,220,100,0.35)");
      sunGrad.addColorStop(1, "transparent");
      ctx.fillStyle = sunGrad;
      ctx.fillRect(0, 0, w, h);
    },
  },
  {
    id: "bw", name: "Noir & Blanc", icon: "🖤", category: "cool",
    apply: (ctx, w, h) => {
      const imgData = ctx.getImageData(0, 0, w, h);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        const avg = d[i] * 0.3 + d[i+1] * 0.59 + d[i+2] * 0.11;
        d[i] = avg;
        d[i+1] = avg;
        d[i+2] = avg;
      }
      ctx.putImageData(imgData, 0, 0);
      // Contrast boost
      ctx.globalCompositeOperation = "overlay";
      ctx.fillStyle = "rgba(128,128,128,0.1)";
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "source-over";
    },
  },
  {
    id: "spring", name: "Printemps", icon: "🌸", category: "seasonal",
    apply: (ctx, w, h) => {
      ctx.fillStyle = "rgba(255,182,193,0.1)";
      ctx.fillRect(0, 0, w, h);
      // Petals
      const petals = ["🌸", "🌺", "💮", "🌼"];
      ctx.font = `${Math.max(20, w * 0.04)}px serif`;
      for (let i = 0; i < 15; i++) {
        ctx.globalAlpha = 0.4 + Math.random() * 0.4;
        ctx.fillText(petals[i % petals.length], Math.random() * w, Math.random() * h);
      }
      ctx.globalAlpha = 1;
    },
  },
  {
    id: "snow", name: "Hiver Suisse", icon: "❄️", category: "seasonal",
    apply: (ctx, w, h) => {
      ctx.fillStyle = "rgba(200,220,255,0.12)";
      ctx.fillRect(0, 0, w, h);
      // Snowflakes
      ctx.font = `${Math.max(16, w * 0.03)}px serif`;
      for (let i = 0; i < 25; i++) {
        ctx.globalAlpha = 0.3 + Math.random() * 0.5;
        ctx.fillText("❄️", Math.random() * w, Math.random() * h);
      }
      ctx.globalAlpha = 1;
      // Frost border
      const grad = ctx.createRadialGradient(w/2, h/2, w*0.35, w/2, h/2, w*0.7);
      grad.addColorStop(0, "transparent");
      grad.addColorStop(1, "rgba(200,220,255,0.25)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    },
  },
  {
    id: "party", name: "Party Paw", icon: "🎉", category: "fun",
    apply: (ctx, w, h) => {
      // Rainbow overlay
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, "rgba(255,0,0,0.06)");
      grad.addColorStop(0.2, "rgba(255,165,0,0.06)");
      grad.addColorStop(0.4, "rgba(255,255,0,0.06)");
      grad.addColorStop(0.6, "rgba(0,255,0,0.06)");
      grad.addColorStop(0.8, "rgba(0,0,255,0.06)");
      grad.addColorStop(1, "rgba(128,0,255,0.06)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      // Confetti
      const confettiEmojis = ["🎉", "🎊", "✨", "⭐", "🎈"];
      ctx.font = `${Math.max(18, w * 0.035)}px serif`;
      for (let i = 0; i < 12; i++) {
        ctx.globalAlpha = 0.5 + Math.random() * 0.4;
        ctx.fillText(confettiEmojis[i % confettiEmojis.length], Math.random() * w, Math.random() * h);
      }
      ctx.globalAlpha = 1;
    },
  },
  {
    id: "love", name: "Pawband Love", icon: "❤️", category: "cute",
    apply: (ctx, w, h) => {
      ctx.fillStyle = "rgba(255,50,100,0.08)";
      ctx.fillRect(0, 0, w, h);
      // Hearts
      ctx.font = `${Math.max(18, w * 0.04)}px serif`;
      const hearts = ["❤️", "💕", "💗", "💖", "🩷"];
      for (let i = 0; i < 10; i++) {
        ctx.globalAlpha = 0.4 + Math.random() * 0.4;
        ctx.fillText(hearts[i % hearts.length], Math.random() * w, Math.random() * h);
      }
      ctx.globalAlpha = 1;
      // Vignette rose
      const grad = ctx.createRadialGradient(w/2, h/2, w*0.3, w/2, h/2, w*0.7);
      grad.addColorStop(0, "transparent");
      grad.addColorStop(1, "rgba(255,50,100,0.15)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    },
  },
  {
    id: "paw_stamp", name: "Paw Stamp", icon: "🐾", category: "fun",
    apply: (ctx, w, h) => {
      // Corner paw stamps
      ctx.font = `${Math.max(30, w * 0.08)}px serif`;
      ctx.globalAlpha = 0.3;
      ctx.fillText("🐾", w * 0.05, h * 0.12);
      ctx.fillText("🐾", w * 0.82, h * 0.12);
      ctx.fillText("🐾", w * 0.05, h * 0.92);
      ctx.fillText("🐾", w * 0.82, h * 0.92);
      // Frame
      ctx.globalAlpha = 0.6;
      ctx.strokeStyle = "rgba(249,115,22,0.5)";
      ctx.lineWidth = 4;
      ctx.setLineDash([12, 8]);
      ctx.strokeRect(15, 15, w-30, h-30);
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    },
  },
  {
    id: "dreamy", name: "Dreamy", icon: "💫", category: "cute",
    apply: (ctx, w, h) => {
      // Soft blur effect simulation
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.fillRect(0, 0, w, h);
      // Bokeh circles
      for (let i = 0; i < 8; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const r = 20 + Math.random() * 60;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, "rgba(255,255,255,0.15)");
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      // Sparkles
      ctx.font = `${Math.max(14, w * 0.025)}px serif`;
      for (let i = 0; i < 8; i++) {
        ctx.globalAlpha = 0.3 + Math.random() * 0.4;
        ctx.fillText("✨", Math.random() * w, Math.random() * h);
      }
      ctx.globalAlpha = 1;
    },
  },
];

const CATEGORIES = [
  { key: "all", label: "Tous", icon: "🎨" },
  { key: "fun", label: "Fun", icon: "🎉" },
  { key: "cute", label: "Mignon", icon: "💕" },
  { key: "cool", label: "Cool", icon: "😎" },
  { key: "seasonal", label: "Saison", icon: "🌸" },
];

export default function FiltersPage() {
  const [selectedFilter, setSelectedFilter] = useState<string>("none");
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [category, setCategory] = useState("all");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { profile } = useAuth();
  const supabase = createClient();

  const filteredFilters = PET_FILTERS.filter(
    f => category === "all" || f.category === category || f.id === "none"
  );

  // Apply filter to canvas
  const applyFilter = useCallback((filterId: string, img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const maxW = 800;
    const scale = img.width > maxW ? maxW / img.width : 1;
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const filter = PET_FILTERS.find(f => f.id === filterId);
    if (filter && filter.id !== "none") {
      filter.apply(ctx, canvas.width, canvas.height);
    }
  }, []);

  // Handle image upload
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    const img = new window.Image();
    img.onload = () => {
      setImage(img);
      applyFilter(selectedFilter, img);
    };
    img.src = url;
    setShowCamera(false);
    setSaved(false);
  };

  // Camera capture
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setShowCamera(true);
    } catch {
      alert("Impossible d'acceder a la camera");
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = video.videoWidth;
    tempCanvas.height = video.videoHeight;
    const ctx = tempCanvas.getContext("2d");
    ctx?.drawImage(video, 0, 0);
    const url = tempCanvas.toDataURL("image/jpeg", 0.9);
    // Stop camera
    streamRef.current?.getTracks().forEach(t => t.stop());
    setShowCamera(false);
    setImageUrl(url);
    const img = new window.Image();
    img.onload = () => {
      setImage(img);
      applyFilter(selectedFilter, img);
    };
    img.src = url;
    setSaved(false);
  };

  // Re-apply when filter changes
  useEffect(() => {
    if (image) applyFilter(selectedFilter, image);
  }, [selectedFilter, image, applyFilter]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  // Save/download filtered image
  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSaving(true);

    try {
      // Download locally
      const link = document.createElement("a");
      link.download = `pawly-${selectedFilter}-${Date.now()}.jpg`;
      link.href = canvas.toDataURL("image/jpeg", 0.92);
      link.click();
      setSaved(true);
    } catch (err) {
      console.error("[Filters] save error:", err);
    } finally {
      setSaving(false);
    }
  };

  // Share to stories
  const handleShareStory = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !profile) return;
    setSaving(true);
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const fileName = `story-${Date.now()}.jpg`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("stories")
          .upload(`${profile.id}/${fileName}`, blob, { contentType: "image/jpeg" });

        if (uploadError) {
          alert("Erreur upload: " + uploadError.message);
          setSaving(false);
          return;
        }

        const { data: urlData } = supabase.storage.from("stories").getPublicUrl(uploadData.path);

        await supabase.from("stories").insert({
          user_id: profile.id,
          media_url: urlData.publicUrl,
          text_content: `Filtre: ${PET_FILTERS.find(f => f.id === selectedFilter)?.name || "Original"}`,
          duration: 5,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        });

        setSaved(true);
        alert("Story publiee!");
        setSaving(false);
      }, "image/jpeg", 0.92);
    } catch (err) {
      console.error("[Filters] share error:", err);
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen pb-32" style={{ background: "var(--c-deep)" }}>
      {/* Header */}
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="flex items-center gap-3">
              <button onClick={() => window.history.length > 1 ? window.history.back() : (window.location.href = "/feed")} aria-label="Retour" className="inline-flex items-center justify-center w-9 h-9 rounded-full transition-all active:scale-90 flex-shrink-0" style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--c-text)" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
              </button>
              <h1 className="text-2xl font-extrabold gradient-text-warm">Filtres AR</h1>
            </div>
            <p className="text-xs text-[var(--c-text-muted)] mt-0.5">Embellissez les photos de votre animal</p>
          </div>
          <Link href="/stories/create" className="text-xs text-amber-300 hover:text-amber-200">
            Creer Story →
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4">
        {/* Image upload / camera area */}
        {!image && !showCamera && (
          <div className="rounded-3xl border-2 border-dashed border-[var(--c-border)] bg-[var(--c-card)] p-8 text-center">
            <p className="text-5xl mb-4">📸</p>
            <p className="text-lg font-semibold text-[var(--c-text)] mb-2">Choisissez une photo</p>
            <p className="text-sm text-[var(--c-text-muted)] mb-6">Prenez une photo ou importez depuis votre galerie</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => fileRef.current?.click()}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 text-white font-bold text-sm shadow-lg shadow-amber-400/25 hover:shadow-amber-400/40 transition-all"
              >
                Galerie
              </button>
              <button
                onClick={startCamera}
                className="px-6 py-3 rounded-2xl bg-[var(--c-card)] border border-[var(--c-border)] text-[var(--c-text)] font-bold text-sm hover:border-amber-400/30 transition-all"
              >
                Camera
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
          </div>
        )}

        {/* Camera view */}
        {showCamera && (
          <div className="rounded-3xl overflow-hidden bg-black relative">
            <video ref={videoRef} autoPlay playsInline muted className="w-full max-h-[60vh] object-cover" />
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
              <button
                onClick={() => { streamRef.current?.getTracks().forEach(t => t.stop()); setShowCamera(false); }}
                className="w-12 h-12 rounded-full bg-red-500/80 backdrop-blur flex items-center justify-center text-white"
              >
                ✕
              </button>
              <button
                onClick={capturePhoto}
                className="w-16 h-16 rounded-full bg-white border-4 border-amber-400 shadow-lg shadow-amber-400/40"
              />
            </div>
          </div>
        )}

        {/* Canvas preview + controls */}
        {image && (
          <div className="space-y-4">
            {/* Preview */}
            <div className="rounded-3xl overflow-hidden bg-[var(--c-card)] border border-[var(--c-border)] shadow-xl">
              <canvas ref={canvasRef} className="w-full" style={{ display: "block" }} />
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => { setImage(null); setImageUrl(null); setSaved(false); }}
                className="flex-1 py-3 rounded-2xl bg-[var(--c-card)] border border-[var(--c-border)] text-[var(--c-text)] text-sm font-medium hover:border-red-500/30 transition-all"
              >
                Changer photo
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 text-white text-sm font-bold shadow-lg shadow-amber-400/25 hover:shadow-amber-400/40 transition-all disabled:opacity-50"
              >
                {saving ? "..." : saved ? "Sauvegarde!" : "Telecharger"}
              </button>
              {profile && (
                <button
                  onClick={handleShareStory}
                  disabled={saving}
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-bold shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all disabled:opacity-50"
                >
                  Story
                </button>
              )}
            </div>

            {/* Category tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {CATEGORIES.map(c => (
                <button
                  key={c.key}
                  onClick={() => setCategory(c.key)}
                  className={
                    "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all " +
                    (category === c.key
                      ? "bg-amber-400 text-white shadow-lg shadow-amber-400/25"
                      : "bg-[var(--c-card)] text-[var(--c-text-muted)] border border-[var(--c-border)]")
                  }
                >
                  {c.icon} {c.label}
                </button>
              ))}
            </div>

            {/* Filter grid */}
            <div className="grid grid-cols-4 gap-2">
              {filteredFilters.map(f => (
                <button
                  key={f.id}
                  onClick={() => { setSelectedFilter(f.id); setSaved(false); }}
                  className={
                    "p-3 rounded-2xl text-center transition-all " +
                    (selectedFilter === f.id
                      ? "bg-amber-400/15 border-2 border-amber-400 shadow-lg shadow-amber-400/20 scale-105"
                      : "bg-[var(--c-card)] border border-[var(--c-border)] hover:border-amber-400/30 hover:scale-102")
                  }
                >
                  <p className="text-2xl mb-1">{f.icon}</p>
                  <p className="text-[10px] font-medium text-[var(--c-text)] truncate">{f.name}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
