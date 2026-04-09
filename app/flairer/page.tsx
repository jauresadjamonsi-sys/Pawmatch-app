"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { sendMatchWithLimit } from "@/lib/services/matches";
import { computeCompatibility, sortByCompatibility, getProximityLabel } from "@/lib/services/compatibility";
import { CANTONS } from "@/lib/cantons";
import Link from "next/link";
import Image from "next/image";
import BlockReportModal from "@/lib/components/BlockReportModal";
import SuperFlairModal from "@/lib/components/SuperFlairModal";
import CompatibilityBadge from "@/lib/components/CompatibilityBadge";
import { formatAge } from "@/lib/utils";
import type { AnimalRow, AnimalWithCompat } from "@/lib/types";

const SPECIES: Record<string, string> = {
  chien: "Chien", chat: "Chat", lapin: "Lapin",
  oiseau: "Oiseau", rongeur: "Rongeur", autre: "Autre",
};

const CONFETTI_COLORS = ["#f97316","#fb923c","#fbbf24","#34d399","#60a5fa","#f472b6","#a78bfa"];

let _audioCtx: AudioContext | null = null;
function getAudioCtx() {
  if (!_audioCtx || _audioCtx.state === "closed") {
    _audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return _audioCtx;
}

function playSound(type: "like"|"pass"|"superlike"|"streak") {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    if (type === "like") {
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(780, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.start(); osc.stop(ctx.currentTime + 0.2);
    } else if (type === "pass") {
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start(); osc.stop(ctx.currentTime + 0.15);
    } else if (type === "superlike") {
      [0, 0.08, 0.16].forEach((delay, i) => {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.frequency.setValueAtTime([520,660,780][i], ctx.currentTime + delay);
        g.gain.setValueAtTime(0.15, ctx.currentTime + delay);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.15);
        o.start(ctx.currentTime + delay); o.stop(ctx.currentTime + delay + 0.15);
      });
    } else if (type === "streak") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(); osc.stop(ctx.currentTime + 0.3);
    }
  } catch {}
}

function vibrate(pattern: number[]) { try { navigator.vibrate?.(pattern); } catch {} }

type Particle = { id: number; x: number; y: number; vx: number; vy: number; color: string; size: number; emoji?: string };

export default function FlairerPage() {
  const [animals, setAnimals] = useState<AnimalWithCompat[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [myAnimals, setMyAnimals] = useState<AnimalRow[]>([]);
  const [activeMyAnimal, setActiveMyAnimal] = useState<AnimalRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matchSuccess, setMatchSuccess] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [swipeDirection, setSwipeDirection] = useState<"left"|"right"|"super"|null>(null);
  const [dragX, setDragX] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [streak, setStreak] = useState(0);
  const [showStreak, setShowStreak] = useState(false);
  const [streakLabel, setStreakLabel] = useState("");
  const [isSuperLike, setIsSuperLike] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);
  const FREE_LIMIT = 3;
  const midnightRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [userCanton, setUserCanton] = useState<string | null>(null);
  const [showCoupDeTruffe, setShowCoupDeTruffe] = useState(false);
  const [mutualMatchData, setMutualMatchData] = useState<any>(null);
  const [showBlockReport, setShowBlockReport] = useState(false);
  const [showSuperFlairModal, setShowSuperFlairModal] = useState(false);
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const [verifiedOwners, setVerifiedOwners] = useState<Set<string>>(new Set());
  const [cardEntering, setCardEntering] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  const { profile, isAuthenticated, loading: authLoading } = useAuth();

  useEffect(() => { if (!authLoading) { fetchData(); detectCanton(); } }, [authLoading]);

  // Auto-reset likeCount at midnight for users who keep the app open
  useEffect(() => {
    function scheduleReset() {
      const now = new Date();
      const nextMidnight = new Date(now);
      nextMidnight.setDate(nextMidnight.getDate() + 1);
      nextMidnight.setHours(0, 0, 0, 0);
      const msUntilMidnight = nextMidnight.getTime() - now.getTime();
      midnightRef.current = setTimeout(() => {
        setLikeCount(0);
        setShowPaywall(false);
        scheduleReset(); // schedule again for the next day
      }, msUntilMidnight);
    }
    scheduleReset();
    return () => { if (midnightRef.current) clearTimeout(midnightRef.current); };
  }, []);

  async function detectCanton() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const url = 'https://nominatim.openstreetmap.org/reverse?lat=' + pos.coords.latitude + '&lon=' + pos.coords.longitude + '&format=json';
        const res = await fetch(url);
        const data = await res.json();
        const state = data.address && data.address.state ? data.address.state : '';
        const postcode = data.address && data.address.postcode ? data.address.postcode : '';
        let detected: string | null = null;
        if (state.includes('Vaud')) detected = 'VD';
        else if (state.includes('Gen')) detected = 'GE';
        else if (state.includes('Bern')) detected = 'BE';
        else if (state.includes('Zürich') || state.includes('Zurich')) detected = 'ZH';
        else if (state.includes('Fribourg') || state.includes('Freiburg')) detected = 'FR';
        else if (state.includes('Valais') || state.includes('Wallis')) detected = 'VS';
        else if (state.includes('Neuch')) detected = 'NE';
        else if (state.includes('Ticino') || state.includes('Tessin')) detected = 'TI';
        else if (state.includes('Basel-Stadt')) detected = 'BS';
        else if (state.includes('Basel-Land')) detected = 'BL';
        else if (state.includes('Luzern') || state.includes('Lucerne')) detected = 'LU';
        else if (state.includes('St. Gallen') || state.includes('Saint-Gall')) detected = 'SG';
        else if (state.includes('Aargau') || state.includes('Argovie')) detected = 'AG';
        else if (state.includes('Graubünden') || state.includes('Grisons')) detected = 'GR';
        else if (state.includes('Thurgau') || state.includes('Thurgovie')) detected = 'TG';
        else if (state.includes('Solothurn') || state.includes('Soleure')) detected = 'SO';
        else if (state.includes('Schwyz')) detected = 'SZ';
        else if (state.includes('Zug') || state.includes('Zoug')) detected = 'ZG';
        else if (state.includes('Schaffhausen') || state.includes('Schaffhouse')) detected = 'SH';
        else if (state.includes('Jura')) detected = 'JU';
        else if (state.includes('Appenzell')) detected = 'AR';
        else if (state.includes('Glarus') || state.includes('Glaris')) detected = 'GL';
        else if (state.includes('Nidwalden') || state.includes('Nidwald')) detected = 'NW';
        else if (state.includes('Obwalden') || state.includes('Obwald')) detected = 'OW';
        else if (state.includes('Uri')) detected = 'UR';
        if (!detected && postcode) {
          const pc = parseInt(postcode);
          if (pc >= 1000 && pc <= 1899) detected = 'VD';
          else if (pc >= 1200 && pc <= 1299) detected = 'GE';
          else if (pc >= 1600 && pc <= 1799) detected = 'FR';
          else if (pc >= 2000 && pc <= 2499) detected = 'NE';
          else if (pc >= 3000 && pc <= 3999) detected = 'BE';
          else if (pc >= 4000 && pc <= 4199) detected = 'BS';
          else if (pc >= 5000 && pc <= 5699) detected = 'AG';
          else if (pc >= 6000 && pc <= 6199) detected = 'LU';
          else if (pc >= 6300 && pc <= 6399) detected = 'ZG';
          else if (pc >= 6800 && pc <= 6999) detected = 'TI';
          else if (pc >= 7000 && pc <= 7999) detected = 'GR';
          else if (pc >= 8000 && pc <= 8499) detected = 'ZH';
          else if (pc >= 9000 && pc <= 9499) detected = 'SG';
        }
        if (detected) setUserCanton(detected);
      } catch(e) {
        // Geolocation error — silent
      }
    }, function(err) {
      // Geolocation permission denied — silent
    }, { enableHighAccuracy: false, timeout: 10000 });
  }

  async function fetchData() {
    let blocked: string[] = [];
    if (profile) {
      const { data: blocks } = await supabase
        .from("blocks")
        .select("blocked_id")
        .eq("blocker_id", profile.id);
      const { data: blockedBy } = await supabase
        .from("blocks")
        .select("blocker_id")
        .eq("blocked_id", profile.id);
      blocked = [
        ...(blocks || []).map((b: any) => b.blocked_id),
        ...(blockedBy || []).map((b: any) => b.blocker_id),
      ];
      setBlockedIds(blocked);
    }

    // Fetch animals + already-liked in parallel
    const animalsQuery = supabase
      .from("animals")
      .select("id, name, species, breed, age_months, gender, photo_url, extra_photos, canton, city, traits, created_by, weight_kg, description")
      .order("created_at", { ascending: false })
      .limit(100);

    let alreadyLiked: string[] = [];
    const likesQuery = profile
      ? supabase.from("matches").select("receiver_animal_id").eq("sender_user_id", profile.id)
      : Promise.resolve({ data: [] });

    const [{ data: allAnimals }, { data: sentMatches }] = await Promise.all([animalsQuery, likesQuery]);
    alreadyLiked = (sentMatches || []).map((m: any) => m.receiver_animal_id);

    const filtered = (allAnimals || []).filter((a: any) =>
      a.created_by !== profile?.id &&
      !blocked.includes(a.created_by || "") &&
      !alreadyLiked.includes(a.id)
    ) as unknown as AnimalRow[];

    if (profile) {
      const { data: mine } = await supabase.from("animals").select("id, name, species, photo_url, traits, breed, age_months, gender, canton, city, created_by, extra_photos, weight_kg, description").eq("created_by", profile.id);
      const myList = (mine || []) as unknown as AnimalRow[];
      setMyAnimals(myList);
      const primary = myList[0] || null;
      setActiveMyAnimal(primary);

      // Load today's real match count from DB
      const todayMidnight = new Date();
      todayMidnight.setHours(0, 0, 0, 0);
      const { count: todayCount } = await supabase
        .from("matches")
        .select("*", { count: "exact", head: true })
        .eq("sender_user_id", profile.id)
        .gte("created_at", todayMidnight.toISOString());
      setLikeCount(todayCount || 0);

      if (primary) {
        const sorted = sortByCompatibility(primary, filtered) as unknown as AnimalWithCompat[];
        setAnimals(sorted);
      } else {
        setAnimals(filtered.sort(() => Math.random() - 0.5) as unknown as AnimalWithCompat[]);
      }
    } else {
      setAnimals(filtered.sort(() => Math.random() - 0.5) as unknown as AnimalWithCompat[]);
    }

    // Fetch verified owners for badge display
    const ownerIds = [...new Set(filtered.map(a => a.created_by).filter(Boolean))] as string[];
    if (ownerIds.length > 0) {
      const { data: verifiedProfiles } = await supabase
        .from("profiles")
        .select("id")
        .in("id", ownerIds)
        .eq("verified_photo", true);
      if (verifiedProfiles) {
        setVerifiedOwners(new Set(verifiedProfiles.map((p: any) => p.id)));
      }
    }

    setLoading(false);
  }

  useEffect(() => {
    if (!activeMyAnimal || animals.length === 0) return;
    const base = animals.map(({ compatibility, ...a }) => a as AnimalRow);
    const sorted = sortByCompatibility(activeMyAnimal, base) as unknown as AnimalWithCompat[];
    setAnimals(sorted);
    setCurrentIndex(0);
  }, [activeMyAnimal]);

  function spawnParticles(x: number, y: number, type: "like"|"super"|"pass") {
    const colors = type === "like" ? ["#f97316","#fb923c","#fbbf24","#f472b6","#ef4444"]
      : type === "super" ? ["#60a5fa","#a78bfa","#34d399","#fbbf24","#f97316"]
      : ["#6b7280","#9ca3af"];
    const emojis = type === "like" ? ["❤️","🐾","✨","💛","🧡"] : type === "super" ? ["⚡","💙","🌟","💫","🔥"] : [];
    const count = type === "pass" ? 8 : 20;
    const newP: Particle[] = Array.from({ length: count }, (_, i) => ({
      id: Date.now() + i, x, y,
      vx: (Math.random() - 0.5) * (type === "super" ? 16 : 12),
      vy: -(Math.random() * (type === "super" ? 14 : 10) + 4),
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * (type === "super" ? 20 : 14) + 8,
      emoji: emojis.length > 0 && Math.random() > 0.4 ? emojis[Math.floor(Math.random() * emojis.length)] : undefined,
    }));
    setParticles(prev => [...prev, ...newP]);
    setTimeout(() => setParticles(prev => prev.filter(p => !newP.find(np => np.id === p.id))), 900);
  }

  function triggerStreak(count: number) {
    const labels: Record<number, string> = { 3:"🔥 x3 En feu !", 5:"⚡ x5 Instinct !", 7:"🌟 x7 Magnétique !", 10:"💥 x10 LÉGENDAIRE !" };
    if (labels[count]) {
      setStreakLabel(labels[count]); setShowStreak(true);
      playSound("streak"); vibrate([50,30,50]);
      setTimeout(() => setShowStreak(false), 1800);
    }
  }

  function handlePass() {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      spawnParticles(rect.left + 60, rect.top + 60, "pass");
    }
    const skippedAnimal = animals[currentIndex];
    if (skippedAnimal) {
      try { const { posthog } = require("@/lib/posthog"); posthog.capture("animal_skipped", { animal_id: skippedAnimal.id, species: skippedAnimal.species, canton: skippedAnimal.canton }); } catch {}
    }
    playSound("pass"); vibrate([30]); setStreak(0);
    setSwipeDirection("left");
    setTimeout(() => {
      setSwipeDirection(null); setDragX(0); setDragY(0);
      setCardEntering(true);
      setCurrentIndex(i => i + 1);
      setTimeout(() => setCardEntering(false), 400);
    }, 320);
  }

  function handleLike(isSuper = false) {
    if (!isAuthenticated) { window.location.href = "/login"; return; }
    if (myAnimals.length === 0) { window.location.href = "/profile/animals/new"; return; }
    setIsSuperLike(isSuper);
    setShowMatchModal(true);
  }

  async function handleMatch(myAnimalId: string) {
    const animal = animals[currentIndex];
    if (!animal || !profile) return;
    if (likeCount >= FREE_LIMIT && (!profile?.subscription || profile.subscription === "free")) { setShowPaywall(true); return; }
    setMatchError(null);
    const result = await sendMatchWithLimit(supabase, myAnimalId, animal.id, profile.id, animal.created_by || "NONE", profile.subscription || "free");
    if (result.error) { setMatchError(result.error); return; }
    try { const { posthog } = require("@/lib/posthog"); posthog.capture("animal_liked", { animal_id: animal.id, species: animal.species, canton: animal.canton, is_super: isSuperLike, mutual: !!result.mutualMatch }); } catch {}

    if (result.mutualMatch && result.data) {
      setMutualMatchData(result.data);
      setShowCoupDeTruffe(true);
      // Play match celebration sound (first 6 seconds)
      try {
        const matchAudio = new Audio("/match-sound.mp3");
        matchAudio.volume = 0.6;
        matchAudio.play().catch(() => {});
        setTimeout(() => { matchAudio.pause(); matchAudio.currentTime = 0; }, 6000);
      } catch {}
    }

    const newStreak = streak + 1;
    setStreak(newStreak); setLikeCount(l => l + 1);
    triggerStreak(newStreak);

    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      spawnParticles(rect.left + rect.width / 2, rect.top + rect.height / 3, isSuperLike ? "super" : "like");
    }
    playSound(isSuperLike ? "superlike" : "like");
    vibrate(isSuperLike ? [40,20,40,20,80] : [40,20,40]);

    setMatchSuccess(true);
    setTimeout(() => {
      setMatchSuccess(false); setShowMatchModal(false); setIsSuperLike(false);
      setSwipeDirection(isSuperLike ? "super" : "right");
      setTimeout(() => {
        setSwipeDirection(null); setDragX(0); setDragY(0);
        setCardEntering(true);
        setCurrentIndex(i => i + 1);
        setTimeout(() => setCardEntering(false), 400);
      }, 320);
    }, 1200);
  }

  function onTouchStart(e: React.TouchEvent) { startX.current = e.touches[0].clientX; startY.current = e.touches[0].clientY; setIsDragging(true); }
  function onTouchMove(e: React.TouchEvent) { if (!isDragging) return; setDragX(e.touches[0].clientX - startX.current); setDragY(e.touches[0].clientY - startY.current); }
  function onTouchEnd() {
    setIsDragging(false);
    if (dragY < -80 && Math.abs(dragX) < 60) { handleLike(true); setDragX(0); setDragY(0); }
    else if (dragX > 100) { handleLike(); if (!isAuthenticated || myAnimals.length === 0) { setDragX(0); setDragY(0); } }
    else if (dragX < -100) { handlePass(); }
    else { setDragX(0); setDragY(0); }
  }
  function onMouseDown(e: React.MouseEvent) { startX.current = e.clientX; startY.current = e.clientY; setIsDragging(true); }
  function onMouseMove(e: React.MouseEvent) { if (!isDragging) return; setDragX(e.clientX - startX.current); setDragY(e.clientY - startY.current); }
  function onMouseUp() {
    setIsDragging(false);
    if (dragY < -80 && Math.abs(dragX) < 60) { handleLike(true); setDragX(0); setDragY(0); }
    else if (dragX > 100) { handleLike(); if (!isAuthenticated || myAnimals.length === 0) { setDragX(0); setDragY(0); } }
    else if (dragX < -100) { handlePass(); }
    else { setDragX(0); setDragY(0); }
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--c-deep,#1a1225)]">
        <div className="aurora-bg" />
        <div className="text-center">
          <div className="relative">
            <div className="text-5xl mb-4 animate-float">{"🐾"}</div>
            <div className="absolute inset-0 blur-xl bg-orange-500/20 rounded-full animate-breathe" />
          </div>
          <p className="text-[var(--c-text-muted)] text-sm animate-breathe mt-2">Calcul des compatibilités...</p>
        </div>
      </div>
    );
  }

  const animal = animals[currentIndex] as AnimalWithCompat | undefined;
  const nextAnimal = animals[currentIndex + 1];
  const compat = animal?.compatibility;

  // Show friendly prompt if authenticated user has no animals
  if (isAuthenticated && myAnimals.length === 0 && !loading && !authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--c-deep,#1a1225)]">
        <div className="aurora-bg" />
        <div className="text-center max-w-sm animate-scale-in">
          <div className="relative mb-6">
            <div className="text-6xl animate-float">{"🐾"}</div>
            <div className="absolute inset-0 blur-2xl bg-orange-500/15 rounded-full animate-breathe" />
          </div>
          <h2 className="text-2xl font-bold gradient-text-warm mb-2">Ajoute ton premier compagnon !</h2>
          <p className="text-[var(--c-text-muted)] mb-6 text-sm leading-relaxed">
            Pour commencer a flairer et trouver des compagnons compatibles, cree le profil de ton animal.
          </p>
          <Link href="/profile/animals/new" className="inline-block btn-futuristic animate-pulse-glow">
            Ajouter mon compagnon
          </Link>
          <p className="mt-4 text-xs text-[var(--c-text-muted)]">Ca prend moins de 30 secondes !</p>
        </div>
      </div>
    );
  }

  if (!animal) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--c-deep,#1a1225)]">
        <div className="aurora-bg" />
        <div className="text-center max-w-sm animate-scale-in">
          {/* Floating emojis */}
          <div className="relative mb-8 h-20">
            <div className="absolute -top-6 left-1/4 text-3xl animate-float" style={{ animationDelay: "0s" }}>{"🐾"}</div>
            <div className="absolute -top-2 right-1/4 text-2xl animate-float" style={{ animationDelay: "0.6s" }}>{"✨"}</div>
            <div className="absolute top-8 left-[15%] text-2xl animate-float" style={{ animationDelay: "1.2s" }}>{"💕"}</div>
            <div className="absolute top-6 right-[15%] text-3xl animate-float" style={{ animationDelay: "0.3s" }}>{"🌟"}</div>
            <div className="text-6xl relative z-10 pt-2">{"🐾"}</div>
          </div>
          <h2 className="text-2xl font-bold gradient-text mb-2">Tu as tout flairé !</h2>
          <p className="text-[var(--c-text-muted)] mb-2 text-sm">Reviens demain pour de nouveaux profils.</p>
          {likeCount > 0 && <p className="text-[var(--c-text-muted)] mb-2 text-sm">Tu as flairé <span className="font-bold gradient-text-warm">{likeCount}</span> compagnons.</p>}
          {streak >= 3 && <p className="text-sm font-semibold mb-4 gradient-text-warm">Streak max : {streak} !</p>}

          <div className="glass-strong p-5 mt-6 mb-4 text-left">
            <p className="text-xs font-semibold text-[var(--c-text-muted)] uppercase tracking-wider mb-3">En attendant...</p>
            <div className="flex flex-col gap-3 stagger-children">
              <Link href="/events" className="flex items-center gap-3 text-sm text-[var(--c-text)] hover:text-orange-400 transition-colors duration-300">
                <span className="text-lg">{"📅"}</span> Découvre les événements près de toi
              </Link>
              <Link href="/carte" className="flex items-center gap-3 text-sm text-[var(--c-text)] hover:text-orange-400 transition-colors duration-300">
                <span className="text-lg">{"🗺️"}</span> Explore la carte des animaux
              </Link>
              <Link href="/matches" className="flex items-center gap-3 text-sm text-[var(--c-text)] hover:text-orange-400 transition-colors duration-300">
                <span className="text-lg">{"💬"}</span> Consulte tes matchs
              </Link>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <Link href="/animals" className="btn-futuristic text-sm !py-2.5 !px-5">Explorer</Link>
            <button onClick={() => { fetchData(); setCurrentIndex(0); setStreak(0); setLikeCount(0); }}
              className="px-5 py-2.5 glass text-[var(--c-text)] rounded-2xl transition-all duration-300 text-sm hover:bg-[var(--c-card)]">
              Recommencer
            </button>
          </div>
        </div>
      </div>
    );
  }

  const cantonName = animal.canton ? CANTONS.find(c => c.code === animal.canton)?.name : null;
  const rotation = dragX * 0.08;
  const likeOpacity = Math.min(Math.max(dragX / 80, 0), 1);
  const passOpacity = Math.min(Math.max(-dragX / 80, 0), 1);
  const superOpacity = Math.min(Math.max(-dragY / 60, 0), 1);
  const nextCardScale = 0.93 + (Math.abs(dragX) / 1000) * 0.07;

  const cardStyle = swipeDirection
    ? {
        transform: swipeDirection === "left" ? "translateX(-130%) rotate(-25deg)"
          : swipeDirection === "super" ? "translateY(-130%) scale(1.05)"
          : "translateX(130%) rotate(25deg)",
        transition: "transform 0.32s cubic-bezier(0.25,0.46,0.45,0.94), opacity 0.32s ease",
        opacity: 0,
      }
    : cardEntering
    ? {
        transform: "scale(0.9)",
        opacity: 0,
        transition: "none",
      }
    : {
        transform: `translateX(${dragX}px) translateY(${dragY}px) rotate(${rotation}deg)`,
        transition: isDragging ? "none" : "transform 0.4s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease",
        boxShadow: likeOpacity > 0
          ? `0 0 ${40 * likeOpacity}px rgba(52,211,153,${0.4 * likeOpacity}), 0 0 ${80 * likeOpacity}px rgba(52,211,153,${0.15 * likeOpacity})`
          : passOpacity > 0 ? `0 0 ${40 * passOpacity}px rgba(239,68,68,${0.4 * passOpacity}), 0 0 ${80 * passOpacity}px rgba(239,68,68,${0.15 * passOpacity})`
          : superOpacity > 0 ? `0 0 ${40 * superOpacity}px rgba(167,139,250,${0.4 * superOpacity}), 0 0 ${80 * superOpacity}px rgba(167,139,250,${0.15 * superOpacity})`
          : "0 20px 60px rgba(0,0,0,0.4), 0 0 40px rgba(249,115,22,0.05)",
      };

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-4 bg-[var(--c-deep,#1a1225)] select-none overflow-hidden page-transition">
      <div className="aurora-bg" />

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes particleFly { 0%{transform:translate(0,0) scale(1);opacity:1} 100%{transform:translate(var(--vx),var(--vy)) scale(0);opacity:0} }
        @keyframes streakPop { 0%{transform:scale(0.5) translateY(20px);opacity:0} 30%{transform:scale(1.2) translateY(-5px);opacity:1} 70%{transform:scale(1) translateY(0);opacity:1} 100%{transform:scale(0.8) translateY(-10px);opacity:0} }
        @keyframes compatIn { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes scoreGrow { from{width:0} to{width:var(--score-w)} }
        @keyframes shimmerBar { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes cardEntrance { 0%{transform:scale(0.85);opacity:0} 100%{transform:scale(1);opacity:1} }
        .particle{animation:particleFly 0.8s ease-out forwards}
        .streak-pop{animation:streakPop 1.8s ease-in-out forwards}
        .compat-in{animation:compatIn 0.4s ease-out forwards}
        .score-bar{animation:scoreGrow 0.8s 0.2s ease-out forwards;width:0}
        .shimmer-bar{background:linear-gradient(90deg,transparent 40%,rgba(255,255,255,0.15) 50%,transparent 60%);background-size:200% 100%;animation:shimmerBar 2.5s linear infinite}
        .card-enter{animation:cardEntrance 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards}
      `}} />

      {/* Particules */}
      <div className="fixed inset-0 pointer-events-none z-[200]">
        {particles.map(p => (
          <div key={p.id} className="particle absolute flex items-center justify-center"
            style={{ left:p.x, top:p.y, "--vx":p.vx*60+"px", "--vy":p.vy*60+"px", width:p.size, height:p.size, fontSize:p.emoji?p.size*1.2:undefined, backgroundColor:p.emoji?"transparent":p.color, borderRadius:p.emoji?0:"50%" } as any}>
            {p.emoji}
          </div>
        ))}
      </div>

      {/* Streak */}
      {showStreak && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[150] streak-pop">
          <div className="glass-strong neon-orange text-[var(--c-text)] font-extrabold text-xl px-6 py-3 shadow-2xl">
            {streakLabel}
          </div>
        </div>
      )}

      {/* Coup de Truffe */}
      {showCoupDeTruffe && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md" onClick={() => setShowCoupDeTruffe(false)}>
          <div className="relative glass-strong neon-orange p-6 md:p-10 text-center max-w-sm mx-4 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="absolute inset-0 rounded-[24px] gradient-border pointer-events-none" />
            <div className="text-7xl mb-4 animate-float">{"🐾"}</div>
            <h2 className="text-3xl font-extrabold gradient-text-warm mb-1">Coup de Truffe !</h2>
            <p className="text-[var(--c-text-muted)] text-sm mb-4">Match mutuel avec {animal?.name} {"🎉"}</p>
            <div className="text-left text-xs text-[var(--c-text-muted)] bg-[var(--c-bg)]/40 rounded-xl p-3 mb-5 space-y-1.5">
              <p className="font-semibold text-[var(--c-text)] text-sm mb-1">{"🤝"} Charte Pawly</p>
              <p>{"🐶"} Respecte les animaux et leurs humains</p>
              <p>{"💬"} Sois bienveillant(e) dans tes messages</p>
              <p>{"📍"} Organise vos rencontres dans des lieux publics</p>
              <p>{"🚫"} Signale tout comportement inapproprie</p>
            </div>
            <div className="flex gap-3">
              {mutualMatchData && (
                <Link href={"/matches/" + mutualMatchData.id} className="flex-1 py-3 btn-futuristic text-center text-sm">{"💬"} Discuter</Link>
              )}
              <button onClick={() => setShowCoupDeTruffe(false)} className="px-4 py-3 glass text-[var(--c-text-muted)] text-sm hover:bg-[var(--c-card)] transition-all duration-300">Plus tard</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="w-full max-w-md flex items-center justify-between mb-3 relative z-10 animate-slide-up">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold gradient-text-warm">Flairer</h1>
          {streak >= 3 && (
            <span className="px-2 py-0.5 glass text-orange-300 rounded-full text-xs font-bold neon-orange"
              style={{ borderColor: "rgba(249,115,22,0.3)" }}>
              {"🔥"} {"×"}{streak}
            </span>
          )}
        </div>

        {/* Sélecteur animal actif */}
        {myAnimals.length > 1 && (
          <select value={activeMyAnimal?.id || ""} onChange={e => setActiveMyAnimal(myAnimals.find(a => a.id === e.target.value) || null)}
            className="text-xs input-futuristic !py-1 !px-3 !rounded-full">
            {myAnimals.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        )}

        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--c-text-muted)]">{animals.length - currentIndex} restants</span>
          <div className="w-16 h-1.5 glass rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{
                width: (currentIndex / Math.max(animals.length, 1)) * 100 + "%",
                background: "linear-gradient(90deg, #F97316, #A78BFA, #38BDF8)",
              }} />
          </div>
        </div>
      </div>

      {/* Card stack */}
      <div className="w-full max-w-md relative" style={{ height: "62vh" }}>
        {nextAnimal && (
          <div className="absolute inset-0 rounded-3xl overflow-hidden glass"
            style={{ transform:`scale(${nextCardScale}) translateY(${(1-nextCardScale)*30}px)`, transition:isDragging?"none":"transform 0.4s ease", zIndex:1, opacity:0.5 }}>
            <div className="w-full h-full bg-[var(--c-deep,#1a1225)] flex items-center justify-center relative">
              {nextAnimal.photo_url
                ? <Image src={nextAnimal.photo_url} alt="" fill className="object-cover opacity-50" draggable={false} sizes="(max-width: 768px) 100vw, 448px" />
                : <span className="text-[var(--c-text-muted)] text-4xl font-bold">{(nextAnimal as AnimalRow).name?.charAt(0)}</span>}
            </div>
          </div>
        )}

        {/* Swipe indicator overlays with neon glows */}
        {likeOpacity > 0.2 && (
          <div className="absolute top-8 left-6 z-20 rounded-2xl rotate-[-12deg] px-5 py-2 font-black text-base text-white"
            style={{
              opacity: likeOpacity,
              background: "linear-gradient(135deg, rgba(52,211,153,0.9), rgba(16,185,129,0.9))",
              boxShadow: `0 0 ${30 * likeOpacity}px rgba(52,211,153,0.5)`,
              border: "2px solid rgba(52,211,153,0.6)",
            }}>
            {"❤️"} FLAIRER !
          </div>
        )}
        {passOpacity > 0.2 && (
          <div className="absolute top-8 right-6 z-20 rounded-2xl rotate-[12deg] px-5 py-2 font-black text-base text-white"
            style={{
              opacity: passOpacity,
              background: "linear-gradient(135deg, rgba(239,68,68,0.9), rgba(220,38,38,0.9))",
              boxShadow: `0 0 ${30 * passOpacity}px rgba(239,68,68,0.5)`,
              border: "2px solid rgba(239,68,68,0.6)",
            }}>
            PASSER {"✕"}
          </div>
        )}
        {superOpacity > 0.2 && (
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 z-20 rounded-2xl px-5 py-2 font-black text-base text-white"
            style={{
              opacity: superOpacity,
              background: "linear-gradient(135deg, rgba(96,165,250,0.9), rgba(167,139,250,0.9))",
              boxShadow: `0 0 ${30 * superOpacity}px rgba(167,139,250,0.5)`,
              border: "2px solid rgba(167,139,250,0.6)",
            }}>
            {"⚡"} SUPER FLAIR !
          </div>
        )}

        {/* Main card with glassmorphism */}
        <div ref={cardRef}
          className={`absolute inset-0 glass-strong rounded-3xl overflow-hidden cursor-grab active:cursor-grabbing z-10 ${cardEntering ? "card-enter" : ""}`}
          style={cardStyle}
          onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
          onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp}
          onMouseLeave={() => { if (isDragging) { setIsDragging(false); setDragX(0); setDragY(0); } }}>

          {/* Photo — FULL card with overlay info at bottom */}
          <div className="absolute inset-0 relative overflow-hidden bg-[var(--c-deep,#1a1225)]">
            {animal.photo_url
              ? <Image src={animal.photo_url} alt={animal.name} fill className="object-cover" draggable={false} sizes="(max-width: 768px) 100vw, 448px" />
              : <div className="w-full h-full flex items-center justify-center text-6xl font-bold text-[var(--c-text-muted)]">{animal.name?.charAt(0)}</div>}

            {/* Gradient overlay — stronger at bottom for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

            {/* Report button */}
            {animal.created_by && (
              <button
                onClick={(e) => { e.stopPropagation(); setShowBlockReport(true); }}
                className="absolute top-3 left-3 z-20 p-2 rounded-full glass transition-all duration-300 hover:bg-red-500/20 hover:shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                title="Signaler"
              >
                <svg className="w-4 h-4 text-[var(--c-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                </svg>
              </button>
            )}

            {/* Compatibility badge with neon glow */}
            {compat && activeMyAnimal && (
              <div className="compat-in absolute top-3 right-3 z-10">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass font-bold"
                  style={{
                    boxShadow: `0 0 15px ${compat.color}40, 0 0 30px ${compat.color}15`,
                    borderColor: compat.color + "50",
                  }}>
                  <div className="w-2 h-2 rounded-full animate-breathe" style={{ backgroundColor: compat.color, boxShadow: `0 0 8px ${compat.color}` }} />
                  <span className="text-[var(--c-text)] font-bold text-xs">{compat.score}%</span>
                  <span className="text-xs font-medium" style={{ color: compat.color }}>{compat.label}</span>
                </div>
              </div>
            )}

            {likeOpacity > 0 && <div className="absolute inset-0 bg-green-500/10 mix-blend-overlay" style={{ opacity:likeOpacity }} />}
            {passOpacity > 0 && <div className="absolute inset-0 bg-red-500/10 mix-blend-overlay" style={{ opacity:passOpacity }} />}
            {superOpacity > 0 && <div className="absolute inset-0 bg-purple-500/15 mix-blend-overlay" style={{ opacity:superOpacity }} />}

            {/* Info overlay at bottom of card — all info ON the photo */}
            <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
              {/* Compatibility meter */}
              {compat && activeMyAnimal && (
                <div className="mb-3 p-2.5 rounded-xl backdrop-blur-md" style={{ background: "rgba(0,0,0,0.35)" }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-white/70 uppercase tracking-wider">Compatibilite avec {activeMyAnimal.name}</span>
                    <span className="text-xs font-bold" style={{ color: compat.color, textShadow: `0 0 10px ${compat.color}60` }}>{compat.score}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden relative">
                    <div className="score-bar h-full rounded-full relative" style={{ "--score-w": compat.score + "%", backgroundColor: compat.color } as any}>
                      <div className="absolute inset-0 shimmer-bar rounded-full" />
                    </div>
                  </div>
                  {compat.reasons.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {compat.reasons.map((r: string) => (
                        <span key={r} className="text-[9px] px-2 py-0.5 rounded-full text-white/60" style={{ background: "rgba(255,255,255,0.1)" }}>{r}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-1">
                <h2 className="text-2xl font-extrabold text-white drop-shadow-lg">{animal.name}</h2>
                {animal.created_by && verifiedOwners.has(animal.created_by) && (
                  <span title="Profil verifie" className="inline-flex items-center">
                    <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </span>
                )}
              </div>
              <p className="text-sm text-white/70 mb-2">{SPECIES[animal.species] || animal.species}{animal.breed ? " · " + animal.breed : ""}</p>

              <div className="flex flex-wrap gap-1.5">
                {animal.canton && <span className="px-2.5 py-1 rounded-full text-xs font-medium text-orange-300 backdrop-blur-sm" style={{ background: "rgba(249,115,22,0.2)" }}>{cantonName || animal.canton}</span>}
                {userCanton && animal.canton && <span className="px-2.5 py-1 rounded-full text-xs font-bold text-green-400 backdrop-blur-sm" style={{ background: "rgba(52,211,153,0.15)" }}>{getProximityLabel(userCanton, animal.canton)}</span>}
                {animal.city && <span className="px-2.5 py-1 rounded-full text-xs text-white/60 backdrop-blur-sm" style={{ background: "rgba(255,255,255,0.1)" }}>{animal.city}</span>}
                <span className="px-2.5 py-1 rounded-full text-xs text-white/60 backdrop-blur-sm" style={{ background: "rgba(255,255,255,0.1)" }}>{formatAge(animal.age_months)}</span>
              <span className="px-2.5 py-1 rounded-full text-xs text-white/60 backdrop-blur-sm" style={{ background: "rgba(255,255,255,0.1)" }}>{animal.gender === "male" ? "Male" : animal.gender === "femelle" ? "Femelle" : "Inconnu"}</span>
              </div>
              {animal.traits?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {animal.traits.slice(0, 4).map(t => (
                    <span key={t} className="px-2 py-0.5 rounded-full text-[10px] text-purple-300 backdrop-blur-sm" style={{ background: "rgba(167,139,250,0.15)" }}>{t}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons with neon glows */}
      <div className="flex items-center gap-5 mt-5 relative z-10">
        {/* Pass button - red neon glow on hover */}
        <button onClick={handlePass}
          className="w-14 h-14 glass rounded-full flex items-center justify-center
            transition-all duration-300 group
            hover:shadow-[0_0_25px_rgba(239,68,68,0.4),0_0_50px_rgba(239,68,68,0.15)]
            hover:border-red-500/40 hover:scale-110 active:scale-95"
          style={{ borderColor: "var(--c-border)" }}>
          <svg className="w-6 h-6 text-[var(--c-text-muted)] group-hover:text-red-400 transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Super like button - purple neon glow on hover */}
        <button onClick={() => handleLike(true)}
          className="w-12 h-12 glass rounded-full flex items-center justify-center
            transition-all duration-300 group
            hover:shadow-[0_0_25px_rgba(167,139,250,0.4),0_0_50px_rgba(167,139,250,0.15)]
            hover:border-purple-500/40 hover:scale-110 active:scale-95"
          style={{ borderColor: "rgba(167,139,250,0.3)", background: "rgba(167,139,250,0.08)" }}>
          <span className="text-xl group-hover:scale-110 transition-transform duration-300">{"⚡"}</span>
        </button>

        {/* Like button - green/orange neon glow */}
        <button onClick={() => handleLike()}
          className="w-16 h-16 rounded-full flex items-center justify-center
            transition-all duration-300
            hover:scale-110 active:scale-95 animate-pulse-glow"
          style={{
            background: "linear-gradient(135deg, #F97316, #EA580C)",
            boxShadow: "0 0 20px rgba(249,115,22,0.3), 0 0 60px rgba(249,115,22,0.1)",
          }}>
          <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
          </svg>
        </button>

        {/* Undo button */}
        <button onClick={() => { if (currentIndex > 0) { setCurrentIndex(i => i - 1); setStreak(0); } }}
          className="w-12 h-12 glass rounded-full flex items-center justify-center
            transition-all duration-300 group
            hover:bg-[var(--c-card)] hover:scale-110 active:scale-95"
          style={{ borderColor: "var(--c-border)" }}>
          <svg className="w-4 h-4 text-[var(--c-text-muted)] group-hover:text-[var(--c-text-muted)] transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
          </svg>
        </button>
      </div>

      <div className="flex items-center gap-3 mt-3 relative z-10">
        <p className="text-[var(--c-text-muted)] text-[10px]">{"←"} Passer {"·"} {"❤️"} Flairer {"·"} {"⚡"} Super Flair</p>
        {isAuthenticated && myAnimals.length > 0 && animal && (
          <button
            onClick={() => setShowSuperFlairModal(true)}
            className="text-[10px] font-bold px-2.5 py-1 rounded-full transition-all"
            style={{ background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.3)", color: "#a78bfa" }}
          >
            ⚡ 15 🪙
          </button>
        )}
      </div>

      {/* Paywall modal */}
      {showPaywall && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="relative glass-strong neon-orange p-8 max-w-sm w-full text-center animate-scale-in">
            <div className="absolute inset-0 rounded-[24px] gradient-border pointer-events-none" />
            <div className="text-5xl mb-4 animate-float">{"🐾"}</div>
            <h2 className="text-xl font-extrabold gradient-text-warm mb-2">3 matchs gratuits utilisés !</h2>
            {isAuthenticated ? (
              <>
                <p className="text-sm text-[var(--c-text-muted)] mb-6">Tes 3 matchs quotidiens sont épuisés. Ils se renouvellent automatiquement demain, ou passe à PawPlus pour des matchs illimités !</p>
                <div className="flex flex-col gap-3">
                  <a href="/pricing" className="w-full py-3 btn-futuristic text-center text-sm">
                    {"⚡"} Passer à PawPlus — matchs illimités
                  </a>
                  <button onClick={() => setShowPaywall(false)} className="text-xs text-[var(--c-text-muted)] mt-2 hover:text-[var(--c-text-muted)] transition-colors">
                    Revenir demain avec 3 nouveaux matchs
                  </button>
                </div>
                <p className="text-[10px] text-[var(--c-text-muted)] mt-4">{"✓"} Renouvellement chaque jour à minuit {"·"} {"⚡"} Illimité avec PawPlus</p>
              </>
            ) : (
              <>
                <p className="text-sm text-[var(--c-text-muted)] mb-6">Crée un compte gratuit pour profiter de 3 matchs par jour, renouvelés chaque matin !</p>
                <div className="flex flex-col gap-3">
                  <a href="/signup" className="w-full py-3 btn-futuristic text-center text-sm">
                    {"🚀"} Créer un compte gratuit
                  </a>
                  <a href="/login" className="w-full py-3 glass text-center text-[var(--c-text-muted)] font-bold text-sm hover:bg-[var(--c-card)] transition-all duration-300">
                    Déjà un compte ? Se connecter
                  </a>
                  <button onClick={() => setShowPaywall(false)} className="text-xs text-[var(--c-text-muted)] mt-2 hover:text-[var(--c-text-muted)] transition-colors">
                    Continuer sans compte (limité)
                  </button>
                </div>
                <p className="text-[10px] text-[var(--c-text-muted)] mt-4">{"✓"} Gratuit {"·"} {"✓"} Sans carte {"·"} {"✓"} 3 matchs/jour renouvelés</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Match modal */}
      {showMatchModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="glass-strong max-w-md w-full p-6 shadow-2xl animate-scale-in">
            {matchSuccess ? (
              <div className="text-center py-4">
                <div className="text-5xl mb-3 animate-float">{isSuperLike ? "⚡" : "❤️"}</div>
                <h3 className="text-xl font-bold gradient-text-warm mb-1">{isSuperLike ? "Super Flair envoyé !" : "Flair envoyé !"}</h3>
                <p className="text-[var(--c-text-muted)] text-sm">{animal.name} sera bientôt prévenu</p>
                {streak >= 3 && <p className="text-sm font-bold mt-2 gradient-text-warm">{"🔥"} Streak {"×"}{streak} !</p>}
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-4">
                  {isSuperLike && <span className="text-2xl">{"⚡"}</span>}
                  <div>
                    <h3 className="text-lg font-bold gradient-text">Avec quel compagnon ?</h3>
                    <p className="text-sm text-[var(--c-text-muted)]">Qui va rencontrer {animal.name} ?</p>
                  </div>
                </div>
                {compat && (
                  <div className="mb-4 p-3 glass rounded-2xl flex items-center gap-3"
                    style={{ borderColor: compat.color + "40", boxShadow: `0 0 15px ${compat.color}15` }}>
                    <span className="text-2xl">{"🤝"}</span>
                    <div>
                      <p className="text-sm font-bold" style={{ color: compat.color, textShadow: `0 0 8px ${compat.color}40` }}>{compat.score}% {"—"} {compat.label}</p>
                      <p className="text-xs text-[var(--c-text-muted)]">{compat.reasons[0]}</p>
                    </div>
                  </div>
                )}
                {matchError && <div className="mb-4 p-3 glass text-red-400 rounded-xl text-sm" style={{ borderColor: "rgba(239,68,68,0.3)" }}>{matchError}</div>}
                <div className="space-y-2 mb-4 max-h-60 overflow-y-auto stagger-children">
                  {myAnimals.map(myAnimal => {
                    const c = computeCompatibility(myAnimal, animal);
                    return (
                      <button key={myAnimal.id} onClick={() => handleMatch(myAnimal.id)}
                        className="w-full flex items-center gap-3 p-3 glass card-futuristic rounded-2xl text-left">
                        <div className="w-12 h-12 rounded-full bg-[var(--c-deep,#1a1225)] ring-2 ring-orange-400/50 flex items-center justify-center overflow-hidden flex-shrink-0 relative
                          shadow-[0_0_10px_rgba(249,115,22,0.2)]">
                          {myAnimal.photo_url
                            ? <Image src={myAnimal.photo_url} alt={myAnimal.name} fill className="object-cover" sizes="(max-width: 768px) 48px, 48px" />
                            : <span className="text-sm font-bold text-[var(--c-text-muted)]">{myAnimal.name?.charAt(0)}</span>}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-[var(--c-text,white)] text-sm">{myAnimal.name}</p>
                          <p className="text-xs text-[var(--c-text-muted)]">{myAnimal.species}{myAnimal.breed ? " · " + myAnimal.breed : ""}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold" style={{ color: c.color, textShadow: `0 0 8px ${c.color}40` }}>{c.score}%</span>
                          <p className="text-[10px] text-[var(--c-text-muted)]">{c.label}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <button onClick={() => { setShowMatchModal(false); setMatchError(null); setIsSuperLike(false); setDragX(0); setDragY(0); }}
                  className="w-full py-2.5 glass text-[var(--c-text-muted)] font-medium rounded-2xl transition-all duration-300 text-sm hover:bg-[var(--c-card)]">
                  Annuler
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Super Flair modal */}
      {showSuperFlairModal && animal && animal.created_by && myAnimals.length > 0 && (
        <SuperFlairModal
          senderAnimalId={activeMyAnimal?.id || myAnimals[0].id}
          receiverAnimalId={animal.id}
          receiverUserId={animal.created_by}
          receiverName={animal.name}
          onClose={() => setShowSuperFlairModal(false)}
        />
      )}

      {/* Block/Report modal */}
      {showBlockReport && animal && animal.created_by && (
        <BlockReportModal
          targetUserId={animal.created_by}
          targetAnimalId={animal.id}
          targetName={animal.name}
          onClose={() => setShowBlockReport(false)}
          onBlocked={() => {
            setShowBlockReport(false);
            setSwipeDirection("left");
            setTimeout(() => {
              setSwipeDirection(null);
              setDragX(0);
              setDragY(0);
              setCardEntering(true);
              setCurrentIndex(i => i + 1);
              setTimeout(() => setCardEntering(false), 400);
            }, 320);
          }}
        />
      )}
    </div>
  );
}
