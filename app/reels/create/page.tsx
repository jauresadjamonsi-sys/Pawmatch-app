"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { AnimalRow } from "@/lib/types";

export default function CreateReelPage() {
  const [animals, setAnimals] = useState<AnimalRow[]>([]);
  const [selectedAnimal, setSelectedAnimal] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);
      const { data } = await supabase.from("animals").select("*").eq("created_by", user.id);
      setAnimals(data || []);
      if (data && data.length > 0) setSelectedAnimal(data[0].id);
    }
    load();
  }, []);

  function handleVideoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) { setError("Seuls les fichiers video sont acceptes"); return; }
    if (file.size > 100 * 1024 * 1024) { setError("Fichier trop lourd (max 100 MB)"); return; }
    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!videoFile || !userId) return;
    setUploading(true);
    setError(null);

    try {
      // Upload video to Supabase Storage
      const ext = videoFile.name.split(".").pop() || "mp4";
      const path = `reels/${userId}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("photos").upload(path, videoFile, { upsert: true });
      if (uploadErr) throw new Error(uploadErr.message);

      const { data: urlData } = supabase.storage.from("photos").getPublicUrl(path);
      const video_url = urlData.publicUrl;

      // Parse hashtags
      const tags = hashtags
        .split(/[,\s#]+/)
        .map(t => t.trim().toLowerCase())
        .filter(Boolean);

      // Create reel via API
      const res = await fetch("/api/reels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video_url,
          caption: caption.trim() || null,
          hashtags: tags,
          animal_id: selectedAnimal,
          duration_seconds: 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de la creation");

      setSuccess(true);
      setTimeout(() => router.push("/reels"), 2000);
    } catch (err: any) {
      setError(err.message);
    }
    setUploading(false);
  }

  if (success) {
    return (
      <main id="main-content" className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--c-deep)" }}>
        <div className="text-center animate-scale-in">
          <div className="text-6xl mb-4">🎬</div>
          <h1 className="text-2xl font-black mb-2" style={{ color: "var(--c-text)" }}>Reel publie !</h1>
          <p className="text-sm mb-2" style={{ color: "#34d399" }}>+10 PawCoins gagnes 🪙</p>
          <p className="text-xs" style={{ color: "var(--c-text-muted)" }}>Redirection vers les Reels...</p>
        </div>
      </main>
    );
  }

  return (
    <main id="main-content" className="max-w-lg mx-auto px-4 py-6 pb-32">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/reels" className="p-2 rounded-full transition-all" style={{ color: "var(--c-text-muted)" }}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <h1 className="text-xl font-black" style={{ color: "var(--c-text)" }}>Nouveau Reel</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Video upload */}
        <div>
          <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={handleVideoSelect} />
          {videoPreview ? (
            <div className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: "9/16", maxHeight: "50vh" }}>
              <video src={videoPreview} className="w-full h-full object-cover" controls playsInline />
              <button
                type="button"
                onClick={() => { setVideoFile(null); setVideoPreview(null); }}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white"
              >
                &times;
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full rounded-2xl flex flex-col items-center justify-center gap-3 transition-all"
              style={{
                aspectRatio: "9/16",
                maxHeight: "50vh",
                background: "var(--c-glass, rgba(255,255,255,0.05))",
                border: "2px dashed var(--c-border)",
              }}
            >
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "rgba(249,115,22,0.1)" }}>
                <svg className="w-8 h-8" style={{ color: "#f97316" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold" style={{ color: "var(--c-text)" }}>Ajouter une video</p>
                <p className="text-[10px] mt-1" style={{ color: "var(--c-text-muted)" }}>MP4, MOV — Max 100 MB</p>
              </div>
            </button>
          )}
        </div>

        {/* Select animal */}
        {animals.length > 0 && (
          <div>
            <label className="text-xs font-bold uppercase tracking-wider mb-2 block" style={{ color: "var(--c-text-muted)" }}>
              Quel animal ?
            </label>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {animals.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setSelectedAnimal(a.id)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl whitespace-nowrap transition-all flex-shrink-0"
                  style={{
                    background: selectedAnimal === a.id ? "rgba(249,115,22,0.15)" : "var(--c-glass, rgba(255,255,255,0.05))",
                    border: `1.5px solid ${selectedAnimal === a.id ? "rgba(249,115,22,0.4)" : "var(--c-border)"}`,
                  }}
                >
                  <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 relative" style={{ background: "var(--c-glass)" }}>
                    {a.photo_url ? (
                      <Image src={a.photo_url} alt={a.name} fill className="object-cover" sizes="28px" />
                    ) : (
                      <span className="text-sm flex items-center justify-center w-full h-full">🐾</span>
                    )}
                  </div>
                  <span className="text-xs font-semibold" style={{ color: selectedAnimal === a.id ? "#f97316" : "var(--c-text)" }}>
                    {a.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Caption */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider mb-2 block" style={{ color: "var(--c-text-muted)" }}>
            Legende
          </label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Raconte ce moment..."
            maxLength={300}
            rows={3}
            className="w-full px-4 py-3 rounded-2xl text-sm outline-none resize-none"
            style={{ background: "var(--c-glass, rgba(255,255,255,0.05))", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
          />
          <p className="text-right text-[10px] mt-1" style={{ color: "var(--c-text-muted)" }}>{caption.length}/300</p>
        </div>

        {/* Hashtags */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider mb-2 block" style={{ color: "var(--c-text-muted)" }}>
            Hashtags
          </label>
          <input
            type="text"
            value={hashtags}
            onChange={(e) => setHashtags(e.target.value)}
            placeholder="#pawly #monchien #cute"
            className="w-full px-4 py-3 rounded-2xl text-sm outline-none"
            style={{ background: "var(--c-glass, rgba(255,255,255,0.05))", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
          />
        </div>

        {error && (
          <p className="text-center text-sm text-red-400 px-3 py-2 rounded-xl" style={{ background: "rgba(239,68,68,0.1)" }}>{error}</p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={!videoFile || uploading}
          className="w-full py-3.5 rounded-2xl text-sm font-bold text-white transition-all"
          style={{
            background: videoFile ? "linear-gradient(135deg, #f97316, #a78bfa)" : "var(--c-border)",
            boxShadow: videoFile ? "0 4px 20px rgba(249,115,22,0.3)" : "none",
            opacity: uploading ? 0.7 : 1,
            cursor: !videoFile || uploading ? "not-allowed" : "pointer",
          }}
        >
          {uploading ? "Publication en cours..." : "🎬 Publier le Reel (+10 🪙)"}
        </button>
      </form>
    </main>
  );
}
