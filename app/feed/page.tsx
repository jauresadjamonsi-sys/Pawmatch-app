"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import Image from "next/image";
import { EMOJI_MAP } from "@/lib/constants";

// Lazy-loaded non-critical components
const StoriesRing = dynamic(() => import("@/lib/components/StoriesRing"), { ssr: false });
const PushPrompt = dynamic(() => import("@/lib/components/PushPrompt"), { ssr: false });
const PromoSection = dynamic(() => import("@/lib/components/PromoSection"), { ssr: false });
const SmartCompanion = dynamic(() => import("@/lib/components/SmartCompanion"), { ssr: false });
const EmotionalFeedback = dynamic(() => import("@/lib/components/EmotionalFeedback"), { ssr: false });
const ReactionBar = dynamic(() => import("@/lib/components/ReactionBar"), { ssr: false });
const CommentSheet = dynamic(() => import("@/lib/components/CommentSheet"), { ssr: false });
const DailyChallenges = dynamic(() => import("@/lib/components/DailyChallenges"), { ssr: false });

// Tiny 1x1 blurred placeholder for dynamic images
const BLUR_PLACEHOLDER = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiNlMmRkZDUiLz48L3N2Zz4=";
import {
  type AnimalSpecies,
  getMood,
  getDailyFact,
  getDailyTip,
  getDailyChallenge,
  milestoneMessage,
  nextMilestone,
  dailySeed,
} from "@/lib/feed/data";
import {
  type Badge,
  ALL_BADGES,
  getNewlyEarnedBadges,
  getEarnedBadges,
} from "@/lib/feed/badges";
import { formatAge } from "@/lib/utils";
import type { ProfileRow, AnimalRow, Streak, ReelWithAuthor } from "@/lib/types";

// ---------------------------------------------------------------------------
// Feed scoring algorithm
// ---------------------------------------------------------------------------

type FeedItem = {
  type: "reel";
  data: ReelWithAuthor;
  score: number;
  created_at: string;
};

function computeRecencyBonus(createdAt: string): number {
  const ageMs = Date.now() - new Date(createdAt).getTime();
  const hours = ageMs / (1000 * 60 * 60);
  if (hours <= 24) return 20;
  if (hours <= 48) return 10;
  if (hours <= 168) return 5; // 7 days
  return 0;
}

function scoreFeedItem(item: { likes_count: number; comments_count: number; created_at: string }): number {
  return ((item.likes_count ?? 0) * 3) + ((item.comments_count ?? 0) * 5) + computeRecencyBonus(item.created_at);
}

// ---------------------------------------------------------------------------
// Streak helpers  (localStorage)
// ---------------------------------------------------------------------------

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getAndUpdateStreak(): Streak {
  const KEY = "pawly_streak";
  let streak: Streak = { count: 1, lastDate: todayStr() };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed: Streak = JSON.parse(raw);
      if (parsed.lastDate === todayStr()) return parsed;
      if (parsed.lastDate === yesterdayStr()) {
        streak = { count: parsed.count + 1, lastDate: todayStr() };
      }
    }
  } catch { /* corrupted */ }
  try { localStorage.setItem(KEY, JSON.stringify(streak)); } catch { /* full */ }
  return streak;
}

// ---------------------------------------------------------------------------
// Date & greeting
// ---------------------------------------------------------------------------

function formatDate(): string {
  const d = new Date();
  const days = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  const months = ["janvier", "f\u00e9vrier", "mars", "avril", "mai", "juin", "juillet", "ao\u00fbt", "septembre", "octobre", "novembre", "d\u00e9cembre"];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
}

function greetingWord(): string {
  const h = new Date().getHours();
  if (h < 6) return "Bonne nuit";
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon apr\u00e8s-midi";
  return "Bonsoir";
}

// ---------------------------------------------------------------------------
// Heart overlay for double-tap like
// ---------------------------------------------------------------------------

function HeartOverlay({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
      <svg className="w-20 h-20 animate-heart-burst text-red-500 drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FeedPage() {
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [animals, setAnimals] = useState<AnimalRow[]>([]);
  const [streak, setStreak] = useState<Streak>({ count: 0, lastDate: "" });
  const [matchCount, setMatchCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);
  const [nearbyAnimals, setNearbyAnimals] = useState<AnimalRow[]>([]);
  const [newMatches, setNewMatches] = useState(0);
  const [newBadges, setNewBadges] = useState<Badge[]>([]);
  const [earnedBadges, setEarnedBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [activeBadgeIdx, setActiveBadgeIdx] = useState(0);
  const [challengeDone, setChallengeDone] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [activeCard, setActiveCard] = useState(0);
  const [feedMode, setFeedMode] = useState<"algo" | "chrono">("algo");
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [suggestions, setSuggestions] = useState<AnimalRow[]>([]);
  const [likedReels, setLikedReels] = useState<Set<string>>(new Set());
  const [heartReelId, setHeartReelId] = useState<string | null>(null);
  const [heartBurstId, setHeartBurstId] = useState<string | null>(null);
  const [commentReelId, setCommentReelId] = useState<string | null>(null);
  const [emotionalFeedback, setEmotionalFeedback] = useState<{ type: "celebration" | "encouragement" | "streak" | "milestone" | "comeback"; count?: number } | null>(null);

  // -------------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------------
  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) { setLoading(false); return; }

      // Note: profiles table does NOT have a canton column — canton lives on animals
      // Stagger critical queries: profile+animals first, then counts
      const [profileRes, animalsRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, avatar_url, role, subscription, city, created_at").eq("id", user.id).single(),
        supabase.from("animals").select("id, name, species, breed, photo_url, canton, city, created_by, age_months, gender, traits").eq("created_by", user.id).order("created_at", { ascending: false }),
      ]);
      const [matchRes, msgRes] = await Promise.all([
        supabase.from("matches").select("*", { count: "exact", head: true }).or(`sender_user_id.eq.${user.id},receiver_user_id.eq.${user.id}`).then(r => r).catch(() => ({ count: 0 })),
        supabase.from("messages").select("*", { count: "exact", head: true }).eq("sender_id", user.id).then(r => r).catch(() => ({ count: 0 })),
      ]);

      const prof = (profileRes.data || null) as ProfileRow | null;
      const anims = ((animalsRes.data || []) as unknown) as AnimalRow[];
      const mCount = matchRes.count || 0;
      const msgCount = msgRes.count || 0;

      setProfile(prof);
      setAnimals(anims);
      setMatchCount(mCount);
      setMessageCount(msgCount);

      // Streak
      const s = getAndUpdateStreak();
      setStreak(s);

      // Badges
      const stats = { streakCount: s.count, matchCount: mCount, messageCount: msgCount, animalCount: anims.length };
      const nb = getNewlyEarnedBadges(stats);
      setNewBadges(nb);
      setEarnedBadges(getEarnedBadges(stats));
      if (nb.length > 0) {
        setActiveBadgeIdx(0);
        setShowBadgeModal(true);
      }

      // Emotional feedback triggers
      try {
        const lastFeedbackDate = localStorage.getItem("pawly_feedback_date");
        const todayDate = todayStr();
        if (lastFeedbackDate !== todayDate) {
          if (s.count >= 5 && s.count % 5 === 0) {
            setEmotionalFeedback({ type: "streak", count: s.count });
            localStorage.setItem("pawly_feedback_date", todayDate);
          } else if (s.count === 1 && s.lastDate !== yesterdayStr()) {
            setEmotionalFeedback({ type: "comeback" });
            localStorage.setItem("pawly_feedback_date", todayDate);
          } else if (mCount >= 10 && mCount % 10 === 0) {
            setEmotionalFeedback({ type: "milestone" });
            localStorage.setItem("pawly_feedback_date", todayDate);
          }
        }
      } catch { /* ignore */ }

      // Challenge done today?
      try {
        const doneKey = `pawly_challenge_${todayStr()}`;
        if (localStorage.getItem(doneKey) === "1") setChallengeDone(true);
      } catch { /* ignore */ }

      setLoading(false);

      // Secondary queries — staggered in 2 batches to prevent Supabase 503
      const myCanton = anims[0]?.canton;
      const nearbyQuery = myCanton
        ? supabase.from("animals").select("id, name, species, breed, photo_url, canton, city, created_by, age_months, gender, traits").eq("canton", myCanton).neq("created_by", user.id).order("created_at", { ascending: false }).limit(6)
        : supabase.from("animals").select("id, name, species, breed, photo_url, canton, city, created_by, age_months, gender, traits").neq("created_by", user.id).order("created_at", { ascending: false }).limit(6);

      // Batch 1: nearby + reels (most visible)
      const [nearbyRes, reelsRes] = await Promise.all([
        nearbyQuery.then(({ data }) => data).catch(() => null),
        supabase.from("reels").select("*").order("created_at", { ascending: false }).limit(20).then(({ data }) => data).catch(() => null),
      ]);

      // Batch 2: counts (less critical)
      const [newMatchesRes, matchedAnimalsRes] = await Promise.all([
        supabase.from("matches").select("*", { count: "exact", head: true }).or(`sender_user_id.eq.${user.id},receiver_user_id.eq.${user.id}`).gte("created_at", new Date(Date.now() - 48 * 3600000).toISOString()).then(({ count }) => count).catch(() => 0),
        supabase.from("matches").select("sender_animal_id, receiver_animal_id").or(`sender_user_id.eq.${user.id},receiver_user_id.eq.${user.id}`).then(({ data }) => data).catch(() => null),
      ]);

      if (nearbyRes) setNearbyAnimals(nearbyRes as unknown as AnimalRow[]);
      setNewMatches(newMatchesRes || 0);

      if (reelsRes) {
        const items: FeedItem[] = (reelsRes as unknown as ReelWithAuthor[]).map((reel) => ({
          type: "reel" as const,
          data: reel,
          score: scoreFeedItem(reel),
          created_at: reel.created_at,
        }));
        setFeedItems(items);
      }

      // Suggestions: filter out already-matched animals (depends on matchedAnimalsRes)
      if (matchedAnimalsRes) {
        const matchedAnimalIds = new Set<string>();
        (matchedAnimalsRes as { sender_animal_id: string; receiver_animal_id: string }[]).forEach((m) => {
          matchedAnimalIds.add(m.sender_animal_id);
          matchedAnimalIds.add(m.receiver_animal_id);
        });
        const myAnimalIds = anims.map((a) => a.id);
        const excludeIds = [...matchedAnimalIds, ...myAnimalIds];

        supabase
          .from("animals")
          .select("id, name, species, breed, photo_url, canton, city, created_by, age_months, gender, traits")
          .neq("created_by", user.id)
          .order("created_at", { ascending: false })
          .limit(12)
          .then(({ data: suggestData }) => {
            const filtered = ((suggestData || []) as unknown as AnimalRow[])
              .filter((a) => !excludeIds.includes(a.id))
              .slice(0, 4);
            setSuggestions(filtered);
          }).catch(() => {});
      }
    }

    load();
  }, []);

  // -------------------------------------------------------------------------
  // Derived values
  // -------------------------------------------------------------------------
  const firstName = profile?.full_name?.split(" ")[0] || "";
  const primarySpecies: AnimalSpecies = animals.length > 0 ? (animals[0].species as AnimalSpecies) : "chien";

  // Sorted feed items based on mode
  const sortedFeedItems = useMemo(() => {
    if (feedMode === "chrono") {
      return [...feedItems].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return [...feedItems].sort((a, b) => b.score - a.score);
  }, [feedItems, feedMode]);
  const milestone = milestoneMessage(streak.count);
  const next = nextMilestone(streak.count);
  const challengeText = getDailyChallenge();
  const tipText = getDailyTip(primarySpecies);
  const activeBadge = newBadges[activeBadgeIdx] || null;

  function markChallengeDone() {
    setChallengeDone(true);
    try { localStorage.setItem(`pawly_challenge_${todayStr()}`, "1"); } catch { /* ignore */ }
  }

  function dismissBadge() {
    if (activeBadgeIdx < newBadges.length - 1) {
      setActiveBadgeIdx((i) => i + 1);
    } else {
      setShowBadgeModal(false);
    }
  }

  function toggleLikeReel(reelId: string) {
    setLikedReels((prev) => {
      const updated = new Set(prev);
      if (updated.has(reelId)) {
        updated.delete(reelId);
      } else {
        updated.add(reelId);
      }
      return updated;
    });
    setHeartBurstId(reelId);
    setTimeout(() => setHeartBurstId(null), 600);
  }

  function handleDoubleTapReel(reelId: string) {
    if (!likedReels.has(reelId)) {
      toggleLikeReel(reelId);
    }
    setHeartReelId(reelId);
    setTimeout(() => setHeartReelId(null), 800);
  }

  function scrollToCard(idx: number) {
    setActiveCard(idx);
    const el = carouselRef.current?.children[idx] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }

  // -------------------------------------------------------------------------
  // Loading skeleton
  // -------------------------------------------------------------------------
  if (loading) {
    return (
      <main id="main-content" className="min-h-screen px-4 pt-6 pb-32" style={{ background: "var(--c-deep)" }}>
        <div className="mx-auto max-w-lg space-y-5 stagger-children">
          <div className="glass rounded-2xl p-5 animate-breathe" style={{ height: 80 }} />
          <div className="glass rounded-2xl animate-breathe" style={{ height: 260, animationDelay: "0.15s" }} />
          <div className="glass rounded-2xl p-5 animate-breathe" style={{ height: 90, animationDelay: "0.3s" }} />
          <div className="glass rounded-2xl p-5 animate-breathe" style={{ height: 100, animationDelay: "0.45s" }} />
          <div className="glass rounded-2xl p-5 animate-breathe" style={{ height: 120, animationDelay: "0.6s" }} />
        </div>
      </main>
    );
  }

  // -------------------------------------------------------------------------
  // Not authenticated
  // -------------------------------------------------------------------------
  if (!profile) {
    return (
      <main id="main-content" className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--c-deep)" }}>
        <div className="glass-strong rounded-3xl p-8 text-center max-w-sm animate-scale-in">
          <div className="text-5xl mb-4">{"\uD83D\uDC3E"}</div>
          <h1 className="text-2xl font-extrabold mb-2" style={{ color: "var(--c-text)" }}>Bienvenue sur Pawly</h1>
          <p className="text-sm mb-6" style={{ color: "var(--c-text-muted)" }}>Connecte-toi pour d&eacute;couvrir ton feed personnalis&eacute;.</p>
          <Link href="/login" className="btn-futuristic inline-block w-full text-center">Se connecter</Link>
        </div>
      </main>
    );
  }

  // -------------------------------------------------------------------------
  // Main Feed
  // -------------------------------------------------------------------------
  return (
    <>
      {/* Emotional Feedback Toast */}
      {emotionalFeedback && (
        <EmotionalFeedback
          type={emotionalFeedback.type}
          count={emotionalFeedback.count}
          show={!!emotionalFeedback}
          onDismiss={() => setEmotionalFeedback(null)}
        />
      )}

      <main id="main-content" className="min-h-screen px-4 pt-6 pb-32 page-enter" style={{ background: "var(--c-deep)" }}>
        <div className="mx-auto max-w-lg space-y-5 stagger-children">

          {/* ═══════ STORIES ═══════ */}
          <StoriesRing />

          {/* ═══════ SMART COMPANION — Pet Wellbeing Score ═══════ */}
          {profile?.id && animals.length > 0 && (
            <SmartCompanion userId={profile.id} />
          )}

          {/* ═══════ DAILY CHALLENGES ═══════ */}
          {profile?.id && (
            <DailyChallenges userId={profile.id} />
          )}

          {/* ═══════ PUSH NOTIFICATION PROMPT ═══════ */}
          <PushPrompt />

          {/* ═══════ FEED MODE TOGGLE ═══════ */}
          <div className="flex items-center justify-center gap-1 p-1 rounded-full mx-auto w-fit" style={{ background: "var(--c-glass, rgba(255,255,255,0.06))", backdropFilter: "blur(12px)", border: "1px solid var(--c-border)" }}>
            <button
              onClick={() => setFeedMode("algo")}
              className="px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300"
              style={{
                background: feedMode === "algo"
                  ? "linear-gradient(135deg, #FBBF24, #F59E0B)"
                  : "transparent",
                color: feedMode === "algo" ? "#fff" : "var(--c-text-muted)",
                boxShadow: feedMode === "algo" ? "0 2px 8px rgba(34, 197, 94,0.3)" : "none",
              }}
            >
              Algorithmique
            </button>
            <button
              onClick={() => setFeedMode("chrono")}
              className="px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300"
              style={{
                background: feedMode === "chrono"
                  ? "linear-gradient(135deg, #FBBF24, #F59E0B)"
                  : "transparent",
                color: feedMode === "chrono" ? "#fff" : "var(--c-text-muted)",
                boxShadow: feedMode === "chrono" ? "0 2px 8px rgba(34, 197, 94,0.3)" : "none",
              }}
            >
              Chronologique
            </button>
          </div>

          {/* ═══════ GREETING ═══════ */}
          <section className="glass rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute -top-6 -right-6 text-[80px] opacity-10 pointer-events-none select-none animate-paw-drift">{"\uD83D\uDC3E"}</div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--c-text-muted)" }}>{mounted ? formatDate() : "\u00A0"}</p>
            <h1 className="text-2xl font-extrabold gradient-text-animated">
              {mounted ? `${greetingWord()} ${firstName}` : "\u00A0"} {"\uD83D\uDC3E"}
            </h1>
            {profile.city && (
              <p className="text-xs mt-1" style={{ color: "var(--c-text-muted)" }}>{"\uD83D\uDCCD"} {profile.city}</p>
            )}
          </section>

          {/* ═══════ PROMO VIDEO ═══════ */}
          <PromoSection />

          {/* ═══════ MATCH ALERT ═══════ */}
          {newMatches > 0 && (
            <Link href="/matches" className="block glass rounded-2xl p-4 relative overflow-hidden border border-pink-500/20">
              <div className="absolute -top-4 -right-4 text-[60px] opacity-10 pointer-events-none select-none">{"\uD83D\uDC95"}</div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: "rgba(244,114,182,0.15)" }}>
                  {"\uD83D\uDC95"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold" style={{ color: "var(--c-text)" }}>
                    {newMatches} nouvelle{newMatches > 1 ? "s" : ""} demande{newMatches > 1 ? "s" : ""} de flair !
                  </p>
                  <p className="text-xs" style={{ color: "var(--c-text-muted)" }}>
                    Quelqu&apos;un veut conna&icirc;tre ton compagnon
                  </p>
                </div>
                <span className="text-lg" style={{ color: "var(--c-accent)" }}>{"\u2192"}</span>
              </div>
            </Link>
          )}

          {/* ═══════ PET CARDS (IMMERSIVE) ═══════ */}
          {animals.length > 0 && (
            <section>
              <h2 className="text-sm font-bold uppercase tracking-wider mb-3 px-1" style={{ color: "var(--c-text-muted)" }}>Mes compagnons</h2>
              <div
                ref={carouselRef}
                className="flex gap-4 overflow-x-auto scroll-snap-x pb-2 -mx-4 px-4"
                style={{ scrollbarWidth: "none" }}
                onScroll={(e) => {
                  const el = e.currentTarget;
                  const w = (el.children[0] as HTMLElement)?.offsetWidth || 1;
                  setActiveCard(Math.round(el.scrollLeft / (w + 16)));
                }}
              >
                {animals.map((animal) => {
                  const mood = getMood(animal.id, animal.traits || []);
                  const emoji = (EMOJI_MAP as Record<string, string>)[animal.species] || "\uD83D\uDC3E";
                  const fact = getDailyFact(animal.species as AnimalSpecies);

                  return (
                    <Link
                      href={`/animals/${animal.id}`}
                      key={animal.id}
                      className="glass rounded-2xl overflow-hidden flex-shrink-0 w-[85vw] max-w-[380px] block transition-transform active:scale-[0.98]"
                    >
                      {/* Big photo */}
                      <div className="relative aspect-[4/5] w-full">
                        {animal.photo_url ? (
                          <Image src={animal.photo_url} alt={animal.name} fill className="object-cover" sizes="(max-width:640px) 85vw, 380px" loading="lazy" placeholder="blur" blurDataURL={BLUR_PLACEHOLDER} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-6xl" style={{ background: "var(--c-card)" }}>{emoji}</div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                        {/* Name overlay */}
                        <div className="absolute bottom-3 left-4 right-4">
                          <h3 className="text-xl font-extrabold text-white drop-shadow-lg">{animal.name}</h3>
                          <p className="text-xs text-white/80">
                            {emoji} {animal.breed || animal.species}
                            {animal.age_months !== null && <span> &bull; {formatAge(animal.age_months)}</span>}
                          </p>
                        </div>
                        {/* Mood badge */}
                        <div className="absolute top-3 right-3 px-3 py-1.5 rounded-full backdrop-blur-md flex items-center gap-1.5" style={{ background: "rgba(0,0,0,0.45)" }}>
                          <span className="text-sm">{mood.emoji}</span>
                          <span className={`text-xs font-semibold ${mood.color}`}>{mood.label}</span>
                        </div>
                      </div>
                      {/* Fact */}
                      <div className="p-4">
                        <div className="rounded-xl px-3 py-2.5 text-xs leading-relaxed" style={{ background: "rgba(34, 197, 94,0.06)", color: "var(--c-text-muted)" }}>
                          <span className="font-bold" style={{ color: "var(--c-accent)" }}>{"\uD83D\uDCA1"} Le sais-tu ?</span>{" "}{fact}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
              {animals.length > 1 && (
                <div className="flex justify-center gap-1.5 mt-3">
                  {animals.map((_, i) => (
                    <button key={i} onClick={() => scrollToCard(i)} className="rounded-full transition-all duration-300" style={{ width: i === activeCard ? 20 : 6, height: 6, background: i === activeCard ? "var(--c-accent)" : "var(--c-border)" }} aria-label={`Animal ${i + 1}`} />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* No animals CTA */}
          {animals.length === 0 && (
            <section className="glass rounded-2xl p-6 text-center">
              <div className="text-5xl mb-3">{"\uD83D\uDC3E"}</div>
              <p className="text-base font-bold mb-1" style={{ color: "var(--c-text)" }}>Ajoute ton premier compagnon !</p>
              <p className="text-xs mb-4" style={{ color: "var(--c-text-muted)" }}>Ton feed personnalis&eacute; t&apos;attend.</p>
              <Link href="/profile/animals/new" className="btn-futuristic inline-block text-sm px-6 py-3">+ Ajouter un animal</Link>
            </section>
          )}

          {/* ═══════ SOCIAL DISCOVERY ═══════ */}
          {nearbyAnimals.length > 0 && (
            <Link href="/flairer" className="block glass rounded-2xl p-5 relative overflow-hidden border border-cyan-500/10">
              <div className="absolute -top-4 -right-4 text-[60px] opacity-10 pointer-events-none select-none">{"\uD83D\uDD0D"}</div>
              <h3 className="text-sm font-bold mb-3" style={{ color: "var(--c-text)" }}>
                {"\uD83D\uDD0D"} {nearbyAnimals.length} compagnon{nearbyAnimals.length > 1 ? "s" : ""} {animals[0]?.canton ? "dans ton canton" : "r\u00e9cents"}
              </h3>
              <div className="flex -space-x-2 mb-3">
                {nearbyAnimals.slice(0, 5).map((a, i) => (
                  <div key={a.id} className="w-10 h-10 rounded-full border-2 border-[var(--c-deep)] overflow-hidden flex-shrink-0 relative animate-slide-in-right" style={{ animationDelay: `${i * 0.1}s` }}>
                    {a.photo_url ? (
                      <Image src={a.photo_url} alt={a.name} fill className="object-cover" sizes="40px" loading="lazy" placeholder="blur" blurDataURL={BLUR_PLACEHOLDER} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm" style={{ background: "var(--c-card)" }}>
                        {(EMOJI_MAP as Record<string, string>)[a.species] || "\uD83D\uDC3E"}
                      </div>
                    )}
                  </div>
                ))}
                {nearbyAnimals.length > 5 && (
                  <div className="w-10 h-10 rounded-full border-2 border-[var(--c-deep)] flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: "var(--c-card)", color: "var(--c-text-muted)" }}>
                    +{nearbyAnimals.length - 5}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs" style={{ color: "var(--c-text-muted)" }}>
                  {nearbyAnimals.slice(0, 3).map((a) => a.name).join(", ")}{nearbyAnimals.length > 3 ? "..." : ""}
                </p>
                <span className="text-xs font-bold" style={{ color: "var(--c-accent)" }}>D&eacute;couvrir &rarr;</span>
              </div>
            </Link>
          )}

          {/* ═══════ ALGORITHMIC FEED (REELS) ═══════ */}
          {sortedFeedItems.length > 0 && (
            <section>
              <h2 className="text-sm font-bold uppercase tracking-wider mb-3 px-1" style={{ color: "var(--c-text-muted)" }}>
                {feedMode === "algo" ? "Tendances" : "Fil recent"}
              </h2>
              <div className="space-y-4">
                {sortedFeedItems.map((item, idx) => {
                  const reelId = item.data.id || `reel-${idx}`;
                  const isLiked = likedReels.has(reelId);
                  const likesCount = (item.data.likes_count ?? 0) + (isLiked ? 1 : 0);

                  return (
                  <div key={`feed-${idx}`} className="card-hover animate-slide-up" style={{ animationDelay: `${idx * 0.08}s` }}>
                    {/* Reel feed card */}
                    <div className="block glass rounded-2xl overflow-hidden transition-transform active:scale-[0.98]">
                      <div
                        className="relative aspect-[16/9] w-full cursor-pointer select-none"
                        onClick={() => {
                          const now = Date.now();
                          const el = document.getElementById(`reel-tap-${reelId}`);
                          const last = parseInt(el?.dataset.lastTap || "0", 10);
                          if (now - last < 300) {
                            handleDoubleTapReel(reelId);
                          }
                          if (el) el.dataset.lastTap = String(now);
                        }}
                        id={`reel-tap-${reelId}`}
                        data-last-tap="0"
                      >
                        <Link href="/reels" className="absolute inset-0 z-[1]" />
                        {item.data.thumbnail_url ? (
                          <Image src={item.data.thumbnail_url} alt={item.data.caption || "Reel"} fill className="object-cover" sizes="(max-width:640px) 100vw, 512px" loading="lazy" placeholder="blur" blurDataURL={BLUR_PLACEHOLDER} />
                        ) : item.data.animals?.photo_url ? (
                          <Image src={item.data.animals.photo_url} alt={item.data.animals.name || "Animal"} fill className="object-cover" sizes="(max-width:640px) 100vw, 512px" loading="lazy" placeholder="blur" blurDataURL={BLUR_PLACEHOLDER} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl" style={{ background: "var(--c-card)" }}>
                            {"\uD83C\uDFAC"}
                          </div>
                        )}
                        {/* Enhanced gradient overlay for readability */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/20" />
                        {/* Heart overlay on double-tap */}
                        <HeartOverlay show={heartReelId === reelId} />
                        {/* Score badge (algo mode) */}
                        {feedMode === "algo" && (
                          <div className="absolute top-2 right-2 px-2 py-1 rounded-full text-[10px] font-bold" style={{ background: "rgba(34, 197, 94,0.85)", color: "#fff" }}>
                            {item.score} pts
                          </div>
                        )}
                        {/* Author info */}
                        <div className="absolute bottom-2 left-3 right-3 flex items-center gap-2 z-[2]">
                          <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 border border-white/30">
                            {item.data.profiles?.avatar_url ? (
                              <Image src={item.data.profiles.avatar_url} alt="" width={28} height={28} className="object-cover w-full h-full" loading="lazy" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs" style={{ background: "var(--c-card)" }}>
                                {"\uD83D\uDC64"}
                              </div>
                            )}
                          </div>
                          <span className="text-xs font-bold text-white drop-shadow truncate">
                            {item.data.profiles?.full_name || "Utilisateur"}
                          </span>
                        </div>
                      </div>
                      <div className="p-3">
                        {item.data.caption && (
                          <p className="text-xs mb-2 line-clamp-2" style={{ color: "var(--c-text)" }}>{item.data.caption}</p>
                        )}
                        {/* Like + Views + Comment button row */}
                        <div className="flex items-center gap-4 text-[11px] mb-2" style={{ color: "var(--c-text-muted)" }}>
                          <button
                            className="flex items-center gap-1 btn-press transition-transform"
                            onClick={(e) => { e.preventDefault(); toggleLikeReel(reelId); }}
                          >
                            <span className={heartBurstId === reelId ? "animate-heart-burst inline-block" : "inline-block transition-transform"} style={{ color: isLiked ? "#ef4444" : "var(--c-text-muted)" }}>
                              {isLiked ? "\u2764\uFE0F" : "\uD83E\uDE76"}
                            </span>
                            <span className={heartBurstId === reelId ? "animate-count-up" : ""}>{likesCount}</span>
                          </button>
                          <button
                            className="flex items-center gap-1 btn-press transition-transform"
                            onClick={(e) => { e.preventDefault(); setCommentReelId(reelId); }}
                          >
                            <span>{"\uD83D\uDCAC"}</span>
                            <span>{item.data.comments_count ?? 0}</span>
                          </button>
                          <span>{"\uD83D\uDC41"} {item.data.views_count ?? 0}</span>
                        </div>
                        {/* Emoji reactions */}
                        <ReactionBar reelId={reelId} />
                      </div>
                    </div>

                    {/* ═══════ SUGGESTIONS POUR TOI (after 3rd item) ═══════ */}
                    {idx === 2 && suggestions.length > 0 && (
                      <section className="mt-4 glass rounded-2xl p-4 overflow-hidden animate-fade-in-scale" style={{ border: "1px solid var(--c-border)" }}>
                        <h3 className="text-sm font-bold mb-3" style={{ color: "var(--c-text)" }}>
                          {"\u2728"} Suggestions pour toi
                        </h3>
                        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
                          {suggestions.map((animal, sIdx) => (
                            <Link
                              key={animal.id}
                              href={`/animals/${animal.id}`}
                              className="flex-shrink-0 rounded-xl overflow-hidden transition-transform active:scale-95 animate-fade-in-scale"
                              style={{
                                animationDelay: `${sIdx * 0.1}s`,
                                width: 100,
                                background: "var(--c-glass, rgba(255,255,255,0.06))",
                                backdropFilter: "blur(12px)",
                                border: "1px solid var(--c-border)",
                              }}
                            >
                              <div className="relative w-full" style={{ height: 80 }}>
                                {animal.photo_url ? (
                                  <Image src={animal.photo_url} alt={animal.name} fill className="object-cover" sizes="100px" loading="lazy" placeholder="blur" blurDataURL={BLUR_PLACEHOLDER} />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-2xl" style={{ background: "var(--c-card)" }}>
                                    {(EMOJI_MAP as Record<string, string>)[animal.species] || "\uD83D\uDC3E"}
                                  </div>
                                )}
                              </div>
                              <div className="p-2">
                                <p className="text-[11px] font-bold truncate" style={{ color: "var(--c-text)" }}>{animal.name}</p>
                                <p className="text-[9px] truncate" style={{ color: "var(--c-text-muted)" }}>{animal.breed || animal.species}</p>
                                {animal.canton && (
                                  <p className="text-[9px] truncate" style={{ color: "var(--c-text-muted)" }}>{"\uD83D\uDCCD"} {animal.canton}</p>
                                )}
                                <span className="inline-block mt-1 text-[9px] font-bold" style={{ color: "var(--c-accent)" }}>Voir</span>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </section>
                    )}
                  </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ═══════ SUGGESTIONS (standalone when no feed items or < 3 items) ═══════ */}
          {(sortedFeedItems.length < 3 && suggestions.length > 0) && (
            <section className="glass rounded-2xl p-4 overflow-hidden animate-fade-in-scale" style={{ border: "1px solid var(--c-border)" }}>
              <h3 className="text-sm font-bold mb-3" style={{ color: "var(--c-text)" }}>
                {"\u2728"} Suggestions pour toi
              </h3>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
                {suggestions.map((animal, sIdx) => (
                  <Link
                    key={animal.id}
                    href={`/animals/${animal.id}`}
                    className="flex-shrink-0 rounded-xl overflow-hidden transition-transform active:scale-95 animate-fade-in-scale"
                    style={{
                      animationDelay: `${sIdx * 0.1}s`,
                      width: 100,
                      background: "var(--c-glass, rgba(255,255,255,0.06))",
                      backdropFilter: "blur(12px)",
                      border: "1px solid var(--c-border)",
                    }}
                  >
                    <div className="relative w-full" style={{ height: 80 }}>
                      {animal.photo_url ? (
                        <Image src={animal.photo_url} alt={animal.name} fill className="object-cover" sizes="100px" loading="lazy" placeholder="blur" blurDataURL={BLUR_PLACEHOLDER} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl" style={{ background: "var(--c-card)" }}>
                          {(EMOJI_MAP as Record<string, string>)[animal.species] || "\uD83D\uDC3E"}
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <p className="text-[11px] font-bold truncate" style={{ color: "var(--c-text)" }}>{animal.name}</p>
                      <p className="text-[9px] truncate" style={{ color: "var(--c-text-muted)" }}>{animal.breed || animal.species}</p>
                      {animal.canton && (
                        <p className="text-[9px] truncate" style={{ color: "var(--c-text-muted)" }}>{"\uD83D\uDCCD"} {animal.canton}</p>
                      )}
                      <span className="inline-block mt-1 text-[9px] font-bold" style={{ color: "var(--c-accent)" }}>Voir</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* ═══════ STREAK (ENHANCED) ═══════ */}
          <section className="glass rounded-2xl p-5 relative overflow-hidden">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl animate-pulse-glow" style={{ background: "linear-gradient(135deg, rgba(34, 197, 94,0.2), rgba(22,163,74,0.1))" }}>
                {streak.count >= 7 ? "\uD83D\uDD25" : "\u2B50"}
              </div>
              <div className="flex-1">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black gradient-text-warm">{streak.count}</span>
                  <span className="text-sm font-bold" style={{ color: "var(--c-text)" }}>{streak.count === 1 ? "jour" : "jours"}</span>
                </div>
                <p className="text-xs" style={{ color: "var(--c-text-muted)" }}>de suite sur Pawly</p>
                {/* Progress bar to next milestone */}
                {next && (
                  <div className="mt-2">
                    <div className="flex justify-between text-[10px] mb-1" style={{ color: "var(--c-text-muted)" }}>
                      <span>{streak.count}j</span>
                      <span>{next.label} ({next.target}j)</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--c-border)" }}>
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (streak.count / next.target) * 100)}%`, background: "var(--c-accent)" }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
            {milestone && (
              <div className="mt-3 rounded-xl px-3 py-2 text-xs font-medium animate-scale-in" style={{ background: "rgba(34, 197, 94,0.08)", color: "var(--c-accent)" }}>
                {milestone}
              </div>
            )}
          </section>

          {/* ═══════ BADGE COLLECTION ═══════ */}
          {earnedBadges.length > 0 && (
            <section className="glass rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold" style={{ color: "var(--c-text)" }}>{"\uD83C\uDFC6"} Mes badges</h2>
                <span className="text-xs font-semibold" style={{ color: "var(--c-text-muted)" }}>{earnedBadges.length}/{ALL_BADGES.length}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {ALL_BADGES.map((badge) => {
                  const earned = earnedBadges.some((b) => b.id === badge.id);
                  return (
                    <div
                      key={badge.id}
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all"
                      style={{
                        background: earned ? `${badge.color}22` : "var(--c-border)",
                        opacity: earned ? 1 : 0.3,
                        border: earned ? `1px solid ${badge.color}44` : "1px solid transparent",
                      }}
                      title={earned ? `${badge.name} — ${badge.description}` : "???"}
                    >
                      {earned ? badge.emoji : "\uD83D\uDD12"}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ═══════ DAILY CHALLENGE ═══════ */}
          <section className={`glass rounded-2xl p-5${!challengeDone ? " animate-wiggle" : ""}`} style={!challengeDone ? { animationIterationCount: 1 } : undefined}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: "rgba(168,85,247,0.1)" }}>
                {"\uD83C\uDFAF"}
              </div>
              <div className="flex-1">
                <h2 className="text-sm font-bold mb-1" style={{ color: "var(--c-text)" }}>D&eacute;fi du jour</h2>
                <p className="text-xs leading-relaxed mb-2" style={{ color: "var(--c-text-muted)" }}>{challengeText}</p>
                <button
                  onClick={markChallengeDone}
                  disabled={challengeDone}
                  className="text-xs font-bold px-4 py-1.5 rounded-full transition-all"
                  style={{
                    background: challengeDone ? "rgba(52,211,153,0.15)" : "rgba(168,85,247,0.1)",
                    color: challengeDone ? "#34D399" : "var(--c-accent)",
                    cursor: challengeDone ? "default" : "pointer",
                  }}
                >
                  {challengeDone ? "\u2713 Fait !" : "Marquer comme fait"}
                </button>
              </div>
            </div>
          </section>

          {/* ═══════ DAILY TIP ═══════ */}
          <section className="glass rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: "rgba(56,189,248,0.1)" }}>
                {"\uD83D\uDCDD"}
              </div>
              <div>
                <h2 className="text-sm font-bold mb-1" style={{ color: "var(--c-text)" }}>Conseil du jour</h2>
                <p className="text-xs leading-relaxed" style={{ color: "var(--c-text-muted)" }}>{tipText}</p>
              </div>
            </div>
          </section>

          {/* ═══════ WEEKLY STATS ═══════ */}
          <section className="glass rounded-2xl p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: "var(--c-text-muted)" }}>Cette semaine</h2>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Matchs", value: matchCount, icon: "\uD83D\uDC95", glow: "rgba(244,114,182,0.15)", href: "/matches" },
                { label: "Messages", value: messageCount, icon: "\uD83D\uDCAC", glow: "rgba(96,165,250,0.15)", href: "/matches" },
                { label: "Animaux", value: animals.length, icon: "\uD83D\uDC3E", glow: "rgba(34, 197, 94,0.15)", href: "/profile" },
              ].map((stat) => (
                <Link key={stat.label} href={stat.href} className="rounded-xl p-3 text-center block transition-transform active:scale-95 hover:scale-105" style={{ background: stat.glow }}>
                  <div className="text-xl mb-1">{stat.icon}</div>
                  <div className="text-2xl font-black gradient-text">{stat.value}</div>
                  <div className="text-[10px] font-semibold mt-0.5" style={{ color: "var(--c-text-muted)" }}>{stat.label}</div>
                </Link>
              ))}
            </div>
          </section>

          {/* ═══════ QUICK ACTIONS ═══════ */}
          <section>
            <h2 className="text-sm font-bold uppercase tracking-wider mb-3 px-1" style={{ color: "var(--c-text-muted)" }}>Actions rapides</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { emoji: "\uD83D\uDD0D", label: "Flairer", href: "/flairer", gradient: "linear-gradient(135deg, rgba(34, 197, 94,0.15), rgba(22,163,74,0.08))" },
                { emoji: "\uD83D\uDCAC", label: "Messages", href: "/matches", gradient: "linear-gradient(135deg, rgba(96,165,250,0.15), rgba(59,130,246,0.08))" },
                { emoji: "\uD83D\uDCCD", label: "Carte", href: "/carte", gradient: "linear-gradient(135deg, rgba(52,211,153,0.15), rgba(16,185,129,0.08))" },
                { emoji: "\uD83D\uDC3E", label: "Mon profil", href: "/profile", gradient: "linear-gradient(135deg, rgba(167,139,250,0.15), rgba(139,92,246,0.08))" },
              ].map((action) => (
                <Link key={action.href} href={action.href} className="glass card-futuristic rounded-2xl p-4 flex items-center gap-3 active:scale-95 transition-transform">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: action.gradient }}>{action.emoji}</div>
                  <span className="text-sm font-bold" style={{ color: "var(--c-text)" }}>{action.label}</span>
                </Link>
              ))}
            </div>
          </section>

          {/* ═══════ PAWDIRECTORY CTA ═══════ */}
          <section>
            <a href="https://pawdirectory.ch" target="_blank" rel="noopener noreferrer" className="glass gradient-border rounded-2xl p-5 flex items-center gap-4 active:scale-[0.98] transition-transform block">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: "rgba(34, 197, 94,0.12)" }}>{"\uD83C\uDFE5"}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold" style={{ color: "var(--c-text)" }}>Besoin d&apos;un v&eacute;to ?</p>
                <p className="text-xs" style={{ color: "var(--c-text-muted)" }}>Trouve un v&eacute;t&eacute;rinaire de confiance sur PawDirectory</p>
              </div>
              <span className="text-lg" style={{ color: "var(--c-accent)" }}>{"\u2192"}</span>
            </a>
          </section>

        </div>
      </main>

      {/* ═══════ BADGE CELEBRATION MODAL ═══════ */}
      {showBadgeModal && activeBadge && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 bg-black/60 backdrop-blur-sm" onClick={dismissBadge}>
          <div className="bg-[var(--c-card)] rounded-3xl p-8 max-w-xs w-full mx-4 text-center relative overflow-hidden shadow-2xl animate-bounce-in" onClick={(e) => e.stopPropagation()}>
            {/* Sparkles */}
            <div className="absolute inset-0 pointer-events-none">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1.5 h-1.5 rounded-full animate-ping"
                  style={{
                    background: activeBadge.color,
                    left: `${12 + ((i * 7) % 76)}%`,
                    top: `${8 + ((i * 13) % 55)}%`,
                    animationDelay: `${i * 0.12}s`,
                    animationDuration: "1.5s",
                  }}
                />
              ))}
            </div>
            <div className="text-6xl mb-4 animate-bounce">{activeBadge.emoji}</div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--c-text-muted)" }}>Nouveau badge !</p>
            <h3 className="text-2xl font-black mb-1" style={{ color: activeBadge.color }}>{activeBadge.name}</h3>
            <p className="text-sm mb-6" style={{ color: "var(--c-text-muted)" }}>{activeBadge.description}</p>
            <button onClick={dismissBadge} className="btn-futuristic w-full py-3 text-sm font-bold">
              {activeBadgeIdx < newBadges.length - 1 ? "Suivant \u2192" : "Super ! \uD83C\uDF89"}
            </button>
          </div>
        </div>
      )}
      {/* ═══════ COMMENT SHEET ═══════ */}
      <CommentSheet
        reelId={commentReelId || ""}
        isOpen={!!commentReelId}
        onClose={() => setCommentReelId(null)}
      />

      {/* Badge slide-down animation */}
      <style>{`
        @keyframes badgeSlideDown {
          0% { opacity: 0; transform: translateY(-40px) scale(0.9); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  );
}
