"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { AnimalRow } from "@/lib/types";

type TaggedAnimal = { id: string; name: string; photo_url: string | null };

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

  // --- Tag animals state ---
  const [taggedAnimals, setTaggedAnimals] = useState<TaggedAnimal[]>([]);
  const [tagSearch, setTagSearch] = useState("");
  const [tagResults, setTagResults] = useState<TaggedAnimal[]>([]);
  const [tagSearching, setTagSearching] = useState(false);
  const tagDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- @mention autocomplete state ---
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionResults, setMentionResults] = useState<TaggedAnimal[]>([]);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const mentionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const captionRef = useRef<HTMLTextAreaElement>(null);

  // --- Debounced tag search ---
  const searchAnimals = useCallback(async (query: string) => {
    if (query.length < 2) { setTagResults([]); setTagSearching(false); return; }
    setTagSearching(true);
    const { data } = await supabase
      .from("animals")
      .select("id, name, photo_url")
      .ilike("name", `%${query}%`)
      .limit(8);
    const results = (data || []) as TaggedAnimal[];
    setTagResults(results.filter((r) => !taggedAnimals.some((t) => t.id === r.id)));
    setTagSearching(false);
  }, [taggedAnimals, supabase]);

  useEffect(() => {
    if (tagDebounceRef.current) clearTimeout(tagDebounceRef.current);
    if (!tagSearch.trim()) { setTagResults([]); return; }
    tagDebounceRef.current = setTimeout(() => searchAnimals(tagSearch.trim()), 350);
    return () => { if (tagDebounceRef.current) clearTimeout(tagDebounceRef.current); };
  }, [tagSearch, searchAnimals]);

  function addTag(animal: TaggedAnimal) {
    if (taggedAnimals.length >= 5) return;
    if (taggedAnimals.some((t) => t.id === animal.id)) return;
    setTaggedAnimals((prev) => [...prev, animal]);
    setTagSearch("");
    setTagResults([]);
  }

  function removeTag(id: string) {
    setTaggedAnimals((prev) => prev.filter((t) => t.id !== id));
  }

  // --- @mention detection in caption ---
  const handleCaptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setCaption(val);

    // Detect @mention at cursor position
    const cursorPos = e.target.selectionStart || val.length;
    const textBeforeCursor = val.slice(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w{1,30})$/);

    if (mentionMatch) {
      const query = mentionMatch[1];
      setMentionQuery(query);
      if (mentionDebounceRef.current) clearTimeout(mentionDebounceRef.current);
      mentionDebounceRef.current = setTimeout(async () => {
        if (query.length < 1) { setMentionResults([]); setShowMentionDropdown(false); return; }
        const { data } = await supabase
          .from("animals")
          .select("id, name, photo_url")
          .ilike("name", `%${query}%`)
          .limit(5);
        setMentionResults((data || []) as TaggedAnimal[]);
        setShowMentionDropdown(true);
      }, 300);
    } else {
      setMentionQuery(null);
      setShowMentionDropdown(false);
      setMentionResults([]);
    }
  }, [supabase]);

  function insertMention(animal: TaggedAnimal) {
    if (!captionRef.current) return;
    const textarea = captionRef.current;
    const cursorPos = textarea.selectionStart || caption.length;
    const textBeforeCursor = caption.slice(0, cursorPos);
    const textAfterCursor = caption.slice(cursorPos);
    const beforeMention = textBeforeCursor.replace(/@\w{0,30}$/, "");
    const newCaption = `${beforeMention}@${animal.name} ${textAfterCursor}`;
    setCaption(newCaption);
    setShowMentionDropdown(false);
    setMentionResults([]);
    setMentionQuery(null);
    // Also auto-tag this animal if not already tagged and under limit
    if (taggedAnimals.length < 5 && !taggedAnimals.some((t) => t.id === animal.id)) {
      setTaggedAnimals((prev) => [...prev, animal]);
    }
    // Refocus textarea
    setTimeout(() => {
      textarea.focus();
      const newPos = beforeMention.length + animal.name.length + 2;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  }

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
      // Check caption for inappropriate content
      if (caption.trim()) {
        const modRes = await fetch("/api/moderate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: caption, type: "reel_caption" }),
        });
        const modResult = await modRes.json();
        if (!modResult.safe) {
          setError(modResult.reason);
          setUploading(false);
          return;
        }
      }

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
          tagged_animals: taggedAnimals.map((t) => t.id),
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
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "rgba(34, 197, 94,0.1)" }}>
                <svg className="w-8 h-8" style={{ color: "#FBBF24" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
                    background: selectedAnimal === a.id ? "rgba(34, 197, 94,0.15)" : "var(--c-glass, rgba(255,255,255,0.05))",
                    border: `1.5px solid ${selectedAnimal === a.id ? "rgba(34, 197, 94,0.4)" : "var(--c-border)"}`,
                  }}
                >
                  <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 relative" style={{ background: "var(--c-glass)" }}>
                    {a.photo_url ? (
                      <Image src={a.photo_url} alt={a.name} fill className="object-cover" sizes="28px" />
                    ) : (
                      <span className="text-sm flex items-center justify-center w-full h-full">🐾</span>
                    )}
                  </div>
                  <span className="text-xs font-semibold" style={{ color: selectedAnimal === a.id ? "#FBBF24" : "var(--c-text)" }}>
                    {a.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Caption */}
        <div className="relative">
          <label className="text-xs font-bold uppercase tracking-wider mb-2 block" style={{ color: "var(--c-text-muted)" }}>
            Legende
          </label>
          <textarea
            ref={captionRef}
            value={caption}
            onChange={handleCaptionChange}
            placeholder="Raconte ce moment... Utilise @ pour mentionner un animal"
            maxLength={300}
            rows={3}
            className="w-full px-4 py-3 rounded-2xl text-sm outline-none resize-none"
            style={{ background: "var(--c-glass, rgba(255,255,255,0.05))", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
          />
          <p className="text-right text-[10px] mt-1" style={{ color: "var(--c-text-muted)" }}>{caption.length}/300</p>

          {/* @mention autocomplete dropdown */}
          {showMentionDropdown && mentionResults.length > 0 && (
            <div
              className="absolute left-0 right-0 z-20 rounded-xl overflow-hidden shadow-lg"
              style={{ background: "var(--c-card, #fff)", border: "1px solid var(--c-border)", top: "100%", marginTop: 4 }}
            >
              {mentionResults.map((animal) => (
                <button
                  key={animal.id}
                  type="button"
                  onClick={() => insertMention(animal)}
                  className="flex items-center gap-2 w-full px-3 py-2 text-left transition-colors hover:opacity-80"
                  style={{ borderBottom: "1px solid var(--c-border)" }}
                >
                  <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 relative" style={{ background: "var(--c-glass)" }}>
                    {animal.photo_url ? (
                      <Image src={animal.photo_url} alt={animal.name} fill className="object-cover" sizes="24px" />
                    ) : (
                      <span className="text-xs flex items-center justify-center w-full h-full">🐾</span>
                    )}
                  </div>
                  <span className="text-xs font-semibold" style={{ color: "var(--c-text)" }}>@{animal.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tag animals */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider mb-2 block" style={{ color: "var(--c-text-muted)" }}>
            Taguer un animal ({taggedAnimals.length}/5)
          </label>
          {/* Tagged chips */}
          {taggedAnimals.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {taggedAnimals.map((t) => (
                <span
                  key={t.id}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold"
                  style={{ background: "rgba(34, 197, 94,0.12)", border: "1px solid rgba(34, 197, 94,0.3)", color: "var(--c-text)" }}
                >
                  <span className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0 relative" style={{ background: "var(--c-glass)" }}>
                    {t.photo_url ? (
                      <Image src={t.photo_url} alt={t.name} fill className="object-cover" sizes="20px" />
                    ) : (
                      <span className="text-[10px] flex items-center justify-center w-full h-full">🐾</span>
                    )}
                  </span>
                  {t.name}
                  <button
                    type="button"
                    onClick={() => removeTag(t.id)}
                    className="ml-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[10px] transition-colors"
                    style={{ background: "rgba(0,0,0,0.15)", color: "var(--c-text-muted)" }}
                    aria-label={`Retirer ${t.name}`}
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}
          {/* Search input */}
          {taggedAnimals.length < 5 && (
            <div className="relative">
              <input
                type="text"
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
                placeholder="Chercher un animal par nom..."
                className="w-full px-4 py-3 rounded-2xl text-sm outline-none"
                style={{ background: "var(--c-glass, rgba(255,255,255,0.05))", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
              />
              {tagSearching && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px]" style={{ color: "var(--c-text-muted)" }}>...</span>
              )}
              {/* Search results dropdown */}
              {tagResults.length > 0 && (
                <div
                  className="absolute left-0 right-0 z-20 mt-1 rounded-xl overflow-hidden shadow-lg"
                  style={{ background: "var(--c-card, #fff)", border: "1px solid var(--c-border)" }}
                >
                  {tagResults.map((animal) => (
                    <button
                      key={animal.id}
                      type="button"
                      onClick={() => addTag(animal)}
                      className="flex items-center gap-2 w-full px-3 py-2 text-left transition-colors hover:opacity-80"
                      style={{ borderBottom: "1px solid var(--c-border)" }}
                    >
                      <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 relative" style={{ background: "var(--c-glass)" }}>
                        {animal.photo_url ? (
                          <Image src={animal.photo_url} alt={animal.name} fill className="object-cover" sizes="28px" />
                        ) : (
                          <span className="text-sm flex items-center justify-center w-full h-full">🐾</span>
                        )}
                      </div>
                      <span className="text-xs font-semibold" style={{ color: "var(--c-text)" }}>{animal.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
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
            background: videoFile ? "linear-gradient(135deg, #FBBF24, #FACC15)" : "var(--c-border)",
            boxShadow: videoFile ? "0 4px 20px rgba(34, 197, 94,0.3)" : "none",
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
