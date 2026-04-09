"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import type { ReelWithAuthor } from "@/lib/types";

export default function ReelsPage() {
  const [reels, setReels] = useState<ReelWithAuthor[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchReels = useCallback(async (p: number) => {
    try {
      const res = await fetch(`/api/reels?page=${p}&mode=trending`);
      const data = await res.json();
      if (data.reels) {
        setReels(prev => p === 0 ? data.reels : [...prev, ...data.reels]);
        setHasMore(data.hasMore ?? false);
      }
    } catch {
      // Network error — show empty state
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchReels(0); }, [fetchReels]);

  // Infinite scroll — load more when near the end
  useEffect(() => {
    if (current >= reels.length - 3 && hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchReels(nextPage);
    }
  }, [current, reels.length, hasMore, loading, page, fetchReels]);

  // Snap scroll handling
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = parseInt(entry.target.getAttribute("data-index") || "0", 10);
            setCurrent(idx);
          }
        });
      },
      { root: container, threshold: 0.6 }
    );
    container.querySelectorAll("[data-index]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [reels]);

  if (loading && reels.length === 0) {
    return (
      <main id="main-content" className="fixed inset-0 z-40 flex items-center justify-center" style={{ background: "var(--c-deep, #0a0a0a)" }}>
        <div className="text-center">
          <div className="text-5xl mb-4 animate-pulse">🎬</div>
          <p className="text-sm font-medium" style={{ color: "var(--c-text-muted)" }}>Chargement des Reels...</p>
        </div>
      </main>
    );
  }

  if (reels.length === 0) {
    return (
      <main id="main-content" className="fixed inset-0 z-40 flex items-center justify-center" style={{ background: "var(--c-deep, #0a0a0a)" }}>
        <div className="text-center px-8">
          <div className="text-6xl mb-4">🎬</div>
          <h1 className="text-xl font-bold mb-2" style={{ color: "var(--c-text)" }}>PawReels</h1>
          <p className="text-sm mb-6" style={{ color: "var(--c-text-muted)" }}>
            Aucun Reel pour le moment. Sois le premier a partager une video de ton animal !
          </p>
          <Link
            href="/reels/create"
            className="inline-block px-6 py-3 rounded-full text-sm font-bold text-white"
            style={{ background: "linear-gradient(135deg, #f97316, #a78bfa)" }}
          >
            Poster un Reel
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main id="main-content" className="fixed inset-0 z-40" style={{ background: "#000" }}>
      <style>{`
        .reels-container { scroll-snap-type: y mandatory; overflow-y: scroll; height: 100%; -webkit-overflow-scrolling: touch; }
        .reels-container::-webkit-scrollbar { display: none; }
        .reel-item { scroll-snap-align: start; scroll-snap-stop: always; height: 100%; position: relative; }
        @keyframes heartPop { 0% { transform: scale(0); opacity: 1; } 50% { transform: scale(1.4); } 100% { transform: scale(1); opacity: 1; } }
      `}</style>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-4 pt-3 pb-2"
        style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.5), transparent)" }}>
        <Link href="/feed" className="text-white/80 hover:text-white transition-colors">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <h1 className="text-white font-bold text-base">PawReels</h1>
        <Link href="/reels/create" className="text-white/80 hover:text-white transition-colors">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </Link>
      </div>

      <div ref={containerRef} className="reels-container">
        {reels.map((reel, index) => (
          <ReelCard key={reel.id} reel={reel} index={index} isActive={index === current} />
        ))}
      </div>
    </main>
  );
}

function ReelCard({ reel, index, isActive }: { reel: ReelWithAuthor; index: number; isActive: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [liked, setLiked] = useState(reel.is_liked || false);
  const [likesCount, setLikesCount] = useState(reel.likes_count);
  const [showHeart, setShowHeart] = useState(false);
  const [paused, setPaused] = useState(false);
  const [showComments, setShowComments] = useState(false);

  // Play/pause based on visibility
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isActive && !paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isActive, paused]);

  async function toggleLike() {
    const newLiked = !liked;
    setLiked(newLiked);
    setLikesCount(prev => prev + (newLiked ? 1 : -1));
    if (newLiked) { setShowHeart(true); setTimeout(() => setShowHeart(false), 800); }
    await fetch(`/api/reels/${reel.id}/like`, { method: "POST" });
  }

  function handleDoubleTap() {
    if (!liked) toggleLike();
    else { setShowHeart(true); setTimeout(() => setShowHeart(false), 800); }
  }

  function togglePlay() {
    setPaused(p => !p);
  }

  const authorName = reel.profiles?.full_name || "Utilisateur";
  const authorAvatar = reel.profiles?.avatar_url;
  const animalName = reel.animals?.name;

  return (
    <div className="reel-item" data-index={index}>
      {/* Video */}
      <video
        ref={videoRef}
        src={reel.video_url}
        poster={reel.thumbnail_url || undefined}
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        onClick={togglePlay}
        onDoubleClick={handleDoubleTap}
      />

      {/* Pause indicator */}
      {paused && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-black/40 flex items-center justify-center">
            <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}

      {/* Double-tap heart */}
      {showHeart && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-7xl" style={{ animation: "heartPop 0.6s ease-out forwards" }}>❤️</span>
        </div>
      )}

      {/* Bottom gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-1/3 pointer-events-none"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)" }} />

      {/* Bottom info */}
      <div className="absolute bottom-16 md:bottom-6 left-0 right-16 px-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border-2 border-white/30"
            style={{ background: "rgba(255,255,255,0.1)" }}>
            {authorAvatar ? (
              <Image src={authorAvatar} alt={authorName} width={32} height={32} className="object-cover w-full h-full" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white">
                {authorName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <span className="text-white text-sm font-bold">{authorName}</span>
          {animalName && (
            <span className="text-white/60 text-xs">· {animalName}</span>
          )}
        </div>
        {reel.caption && (
          <p className="text-white text-sm leading-snug mb-1 line-clamp-2">{reel.caption}</p>
        )}
        {reel.hashtags && reel.hashtags.length > 0 && (
          <p className="text-white/50 text-xs">
            {reel.hashtags.map(h => `#${h}`).join(" ")}
          </p>
        )}
      </div>

      {/* Right action buttons */}
      <div className="absolute right-3 bottom-28 md:bottom-20 flex flex-col items-center gap-5">
        <button onClick={toggleLike} className="flex flex-col items-center">
          <div className="w-10 h-10 rounded-full bg-black/30 flex items-center justify-center backdrop-blur-sm">
            {liked ? (
              <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
            )}
          </div>
          <span className="text-white text-[10px] font-bold mt-1">{likesCount}</span>
        </button>

        <button onClick={() => setShowComments(true)} className="flex flex-col items-center">
          <div className="w-10 h-10 rounded-full bg-black/30 flex items-center justify-center backdrop-blur-sm">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
            </svg>
          </div>
          <span className="text-white text-[10px] font-bold mt-1">{reel.comments_count}</span>
        </button>

        <div className="flex flex-col items-center">
          <div className="w-10 h-10 rounded-full bg-black/30 flex items-center justify-center backdrop-blur-sm">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <span className="text-white text-[10px] font-bold mt-1">{reel.views_count}</span>
        </div>
      </div>

      {/* Comments drawer */}
      {showComments && <CommentsDrawer reelId={reel.id} onClose={() => setShowComments(false)} />}
    </div>
  );
}

function CommentsDrawer({ reelId, onClose }: { reelId: string; onClose: () => void }) {
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch(`/api/reels/${reelId}/comments`)
      .then(r => r.json())
      .then(d => { setComments(d.comments || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [reelId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    const res = await fetch(`/api/reels/${reelId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text.trim() }),
    });
    const data = await res.json();
    if (data.comment) {
      setComments(prev => [...prev, data.comment]);
      setText("");
    }
    setSending(false);
  }

  return (
    <div className="absolute inset-0 z-50 flex items-end" onClick={onClose}>
      <div
        className="w-full rounded-t-3xl overflow-hidden"
        style={{ background: "var(--c-card, rgba(20,16,32,0.98))", maxHeight: "60vh", animation: "slideUp 0.3s ease-out" }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>

        <div className="flex justify-center py-3">
          <div className="w-10 h-1 rounded-full" style={{ background: "var(--c-border)" }} />
        </div>

        <h3 className="px-5 pb-2 text-sm font-bold" style={{ color: "var(--c-text)" }}>
          Commentaires
        </h3>

        <div className="px-5 overflow-y-auto" style={{ maxHeight: "40vh" }}>
          {loading ? (
            <p className="text-center py-8 text-xs" style={{ color: "var(--c-text-muted)" }}>Chargement...</p>
          ) : comments.length === 0 ? (
            <p className="text-center py-8 text-xs" style={{ color: "var(--c-text-muted)" }}>Aucun commentaire pour le moment</p>
          ) : (
            <div className="space-y-3 pb-3">
              {comments.map((c: any) => (
                <div key={c.id} className="flex gap-2">
                  <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold"
                    style={{ background: "var(--c-glass)", color: "var(--c-accent)" }}>
                    {(c.profiles?.full_name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs">
                      <span className="font-bold" style={{ color: "var(--c-text)" }}>{c.profiles?.full_name || "Utilisateur"}</span>
                      <span className="ml-2" style={{ color: "var(--c-text-muted)" }}>{c.content}</span>
                    </p>
                    <p className="text-[9px] mt-0.5" style={{ color: "var(--c-text-muted)" }}>
                      {new Date(c.created_at).toLocaleDateString("fr-CH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={submit} className="px-5 pb-6 pt-2 flex gap-2" style={{ borderTop: "1px solid var(--c-border)" }}>
          <input
            type="text"
            placeholder="Ajouter un commentaire..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            className="flex-1 px-4 py-2.5 rounded-full text-sm outline-none"
            style={{ background: "var(--c-glass, rgba(255,255,255,0.05))", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            className="px-4 py-2.5 rounded-full text-sm font-bold text-white transition-all"
            style={{
              background: text.trim() ? "linear-gradient(135deg, #f97316, #a78bfa)" : "var(--c-border)",
              opacity: text.trim() ? 1 : 0.5,
            }}
          >
            {sending ? "..." : "Envoyer"}
          </button>
        </form>
      </div>
    </div>
  );
}
