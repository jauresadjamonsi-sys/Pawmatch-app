"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { sendMatch } from "@/lib/services/matches";
import { computeCompatibility, sortByCompatibility, getProximityLabel } from "@/lib/services/compatibility";
import { CANTONS } from "@/lib/cantons";
import Link from "next/link";

const SPECIES: Record<string, string> = {
  chien: "Chien", chat: "Chat", lapin: "Lapin",
  oiseau: "Oiseau", rongeur: "Rongeur", autre: "Autre",
};

type Animal = {
  id: string; name: string; species: string; breed: string | null;
  age_months: number | null; gender: string; description: string | null;
  photo_url: string | null; canton: string | null; city: string | null;
  traits: string[]; created_by: string | null;
};

type AnimalWithCompat = Animal & {
  compatibility?: ReturnType<typeof computeCompatibility>;
};

const CONFETTI_COLORS = ["#f97316","#fb923c","#fbbf24","#34d399","#60a5fa","#f472b6","#a78bfa"];

function playSound(type: "like"|"pass"|"superlike"|"streak") {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
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
  const [myAnimals, setMyAnimals] = useState<Animal[]>([]);
  const [activeMyAnimal, setActiveMyAnimal] = useState<Animal | null>(null);
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
  const [userCanton, setUserCanton] = useState(null);
  const [showCoupDeTruffe, setShowCoupDeTruffe] = useState(false);
  const [mutualMatchData, setMutualMatchData] = useState<any>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  const { profile, isAuthenticated, loading: authLoading } = useAuth();

  useEffect(() => { if (!authLoading) { fetchData(); detectCanton(); } }, [authLoading]);

  
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
        // Détection par nom de canton
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
        // Fallback par code postal
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
        console.log("[Géoloc] Erreur:", e);
      }
    }, function(err) {
      console.log("[Géoloc] Permission refusée ou erreur:", err.message);
    }, { enableHighAccuracy: false, timeout: 10000 });
  }

  async function fetchData() {
    const { data: allAnimals } = await supabase
      .from("animals").select("*").eq("status", "disponible").order("created_at", { ascending: false });
    const filtered = (allAnimals || []).filter((a: Animal) => a.created_by !== profile?.id);

    if (profile) {
      const { data: mine } = await supabase.from("animals").select("*").eq("created_by", profile.id);
      const myList = mine || [];
      setMyAnimals(myList);
      const primary = myList[0] || null;
      setActiveMyAnimal(primary);

      // Trier par compatibilité si on a un animal principal
      if (primary) {
        const sorted = sortByCompatibility(primary, filtered);
        setAnimals(sorted);
      } else {
        setAnimals(filtered.sort(() => Math.random() - 0.5));
      }
    } else {
      setAnimals(filtered.sort(() => Math.random() - 0.5));
    }
    setLoading(false);
  }

  // Recalcul si on change d'animal actif
  useEffect(() => {
    if (!activeMyAnimal || animals.length === 0) return;
    const base = animals.map(({ compatibility, ...a }) => a as Animal);
    const sorted = sortByCompatibility(activeMyAnimal, base);
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
    playSound("pass"); vibrate([30]); setStreak(0);
    setSwipeDirection("left");
    setTimeout(() => { setSwipeDirection(null); setDragX(0); setDragY(0); setCurrentIndex(i => i + 1); }, 320);
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
    // Freemium — bloquer après FREE_LIMIT likes si non premium
    if (!isAuthenticated && likeCount >= FREE_LIMIT) { setShowPaywall(true); return; }
    setMatchError(null);
    const result = await sendMatch(supabase, myAnimalId, animal.id, profile.id, animal.created_by || "NONE");
    if (result.error) { setMatchError(result.error); return; }

    if (result.mutualMatch && result.data) {
      setMutualMatchData(result.data);
      setShowCoupDeTruffe(true);
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
      setTimeout(() => { setSwipeDirection(null); setDragX(0); setDragY(0); setCurrentIndex(i => i + 1); }, 320);
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

  function formatAge(months: number | null) {
    if (!months) return "Âge inconnu";
    if (months < 12) return months + " mois";
    const y = Math.floor(months / 12);
    return y + " an" + (y > 1 ? "s" : "");
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a1225]">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-bounce">🐾</div>
          <p className="text-gray-500 text-sm">Calcul des compatibilités...</p>
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
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4 animate-bounce">🐾</div>
          <h2 className="text-2xl font-bold text-[var(--c-text)] mb-2">Ajoute ton premier compagnon !</h2>
          <p className="text-[var(--c-text-muted)] mb-6 text-sm leading-relaxed">
            Pour commencer a flairer et trouver des compagnons compatibles, cree le profil de ton animal.
          </p>
          <Link href="/profile/animals/new" className="inline-block px-6 py-3 text-white font-bold rounded-xl transition text-sm" style={{background:"#f97316",boxShadow:"0 0 20px rgba(249,115,22,0.3)"}}>
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
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">🐾</div>
          <h2 className="text-2xl font-bold text-[var(--c-text)] mb-2">Tu as tout flaire !</h2>
          <p className="text-[var(--c-text-muted)] mb-2 text-sm">Reviens demain pour de nouveaux profils.</p>
          {likeCount > 0 && <p className="text-[var(--c-text-muted)] mb-2 text-sm">Tu as flaire <span style={{color:"var(--c-accent, #f97316)"}} className="font-bold">{likeCount}</span> compagnons.</p>}
          {streak >= 3 && <p style={{color:"var(--c-accent, #f97316)"}} className="text-sm font-semibold mb-4">Streak max : {streak} !</p>}

          <div className="bg-[var(--c-card)] border border-[var(--c-border)] rounded-2xl p-5 mt-6 mb-4 text-left">
            <p className="text-xs font-semibold text-[var(--c-text-muted)] uppercase tracking-wider mb-3">En attendant...</p>
            <div className="flex flex-col gap-3">
              <Link href="/events" className="flex items-center gap-3 text-sm text-[var(--c-text)] hover:text-[var(--c-accent)]">
                <span className="text-lg">📅</span> Decouvre les evenements pres de toi
              </Link>
              <Link href="/carte" className="flex items-center gap-3 text-sm text-[var(--c-text)] hover:text-[var(--c-accent)]">
                <span className="text-lg">🗺️</span> Explore la carte des animaux
              </Link>
              <Link href="/matches" className="flex items-center gap-3 text-sm text-[var(--c-text)] hover:text-[var(--c-accent)]">
                <span className="text-lg">💬</span> Consulte tes matchs
              </Link>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <Link href="/animals" className="px-5 py-2.5 text-white font-semibold rounded-xl transition text-sm" style={{background:"#f97316"}}>Explorer</Link>
            <button onClick={() => { setCurrentIndex(0); setStreak(0); setLikeCount(0); }}
              className="px-5 py-2.5 bg-[var(--c-card)] text-[var(--c-text)] rounded-xl transition text-sm border border-[var(--c-border)]">
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
        transition: "transform 0.32s cubic-bezier(0.25,0.46,0.45,0.94)",
        opacity: 0,
      }
    : {
        transform: `translateX(${dragX}px) translateY(${dragY}px) rotate(${rotation}deg)`,
        transition: isDragging ? "none" : "transform 0.4s cubic-bezier(0.34,1.56,0.64,1)",
        boxShadow: likeOpacity > 0
          ? `0 0 ${40 * likeOpacity}px rgba(249,115,22,${0.4 * likeOpacity})`
          : passOpacity > 0 ? `0 0 ${40 * passOpacity}px rgba(239,68,68,${0.3 * passOpacity})`
          : superOpacity > 0 ? `0 0 ${40 * superOpacity}px rgba(96,165,250,${0.4 * superOpacity})`
          : "0 20px 60px rgba(0,0,0,0.4)",
      };

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-4 bg-[#1a1225] select-none overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes particleFly { 0%{transform:translate(0,0) scale(1);opacity:1} 100%{transform:translate(var(--vx),var(--vy)) scale(0);opacity:0} }
        @keyframes streakPop { 0%{transform:scale(0.5) translateY(20px);opacity:0} 30%{transform:scale(1.2) translateY(-5px);opacity:1} 70%{transform:scale(1) translateY(0);opacity:1} 100%{transform:scale(0.8) translateY(-10px);opacity:0} }
        @keyframes compatIn { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes scoreGrow { from{width:0} to{width:var(--score-w)} }
        @keyframes pulseOrange { 0%,100%{box-shadow:0 0 0 0 rgba(249,115,22,0.4)} 50%{box-shadow:0 0 0 12px rgba(249,115,22,0)} }
        .particle{animation:particleFly 0.8s ease-out forwards}
        .streak-pop{animation:streakPop 1.8s ease-in-out forwards}
        .compat-in{animation:compatIn 0.4s ease-out forwards}
        .score-bar{animation:scoreGrow 0.8s 0.2s ease-out forwards;width:0}
        .like-pulse{animation:pulseOrange 1.5s infinite}
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
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white font-extrabold text-xl px-6 py-3 rounded-2xl shadow-2xl shadow-orange-500/40">
            {streakLabel}
          </div>
        </div>
      )}

      {/* Coup de Truffe */}
      {showCoupDeTruffe && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setShowCoupDeTruffe(false)}>
          <div className="bg-gradient-to-br from-[#241d33] to-[#1a1225] border border-orange-500/30 rounded-3xl p-10 text-center max-w-sm mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="text-7xl mb-4 animate-bounce">🐾</div>
            <h2 className="text-3xl font-extrabold bg-gradient-to-r from-orange-400 to-orange-300 bg-clip-text text-transparent mb-1">Coup de Truffe !</h2>
            <p className="text-gray-400 text-sm mb-6">Match mutuel avec {animal?.name} 🎉</p>
            <div className="flex gap-3">
              {mutualMatchData && (
                <Link href={"/matches/" + mutualMatchData.id} className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-2xl text-sm">💬 Discuter</Link>
              )}
              <button onClick={() => setShowCoupDeTruffe(false)} className="px-4 py-3 bg-white/5 border border-white/10 text-gray-400 rounded-2xl text-sm">Plus tard</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="w-full max-w-md flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-white">Flairer</h1>
          {streak >= 3 && (
            <span className="px-2 py-0.5 bg-orange-500/20 border border-orange-500/30 text-orange-300 rounded-full text-xs font-bold">
              🔥 ×{streak}
            </span>
          )}
        </div>

        {/* Sélecteur animal actif */}
        {myAnimals.length > 1 && (
          <select value={activeMyAnimal?.id || ""} onChange={e => setActiveMyAnimal(myAnimals.find(a => a.id === e.target.value) || null)}
            className="text-xs bg-[#241d33] border border-white/10 text-gray-300 rounded-full px-3 py-1 outline-none">
            {myAnimals.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        )}

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{animals.length - currentIndex} restants</span>
          <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full transition-all duration-300"
              style={{ width: (currentIndex / Math.max(animals.length, 1)) * 100 + "%" }} />
          </div>
        </div>
      </div>

      {/* Card stack */}
      <div className="w-full max-w-md relative" style={{ height: "62vh" }}>
        {nextAnimal && (
          <div className="absolute inset-0 rounded-3xl overflow-hidden border border-white/5"
            style={{ transform:`scale(${nextCardScale}) translateY(${(1-nextCardScale)*30}px)`, transition:isDragging?"none":"transform 0.4s ease", zIndex:1, opacity:0.7 }}>
            <div className="w-full h-full bg-[#241d33] flex items-center justify-center">
              {nextAnimal.photo_url
                ? <img src={nextAnimal.photo_url} alt="" className="w-full h-full object-cover opacity-60" draggable={false} />
                : <span className="text-gray-600 text-4xl font-bold">{(nextAnimal as Animal).name?.charAt(0)}</span>}
            </div>
          </div>
        )}

        {/* Labels */}
        {likeOpacity > 0.2 && (
          <div className="absolute top-8 left-6 z-20 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-black text-base px-5 py-2 rounded-2xl border-2 border-orange-400/50 rotate-[-12deg]" style={{ opacity:likeOpacity }}>
            ❤️ FLAIRER !
          </div>
        )}
        {passOpacity > 0.2 && (
          <div className="absolute top-8 right-6 z-20 bg-gradient-to-r from-red-500 to-red-600 text-white font-black text-base px-5 py-2 rounded-2xl border-2 border-red-400/50 rotate-[12deg]" style={{ opacity:passOpacity }}>
            PASSER ✕
          </div>
        )}
        {superOpacity > 0.2 && (
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 z-20 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-black text-base px-5 py-2 rounded-2xl border-2 border-blue-400/50" style={{ opacity:superOpacity }}>
            ⚡ SUPER FLAIR !
          </div>
        )}

        {/* Main card */}
        <div ref={cardRef}
          className="absolute inset-0 bg-[#241d33] border border-white/10 rounded-3xl overflow-hidden cursor-grab active:cursor-grabbing z-10"
          style={cardStyle}
          onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
          onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp}
          onMouseLeave={() => { if (isDragging) { setIsDragging(false); setDragX(0); setDragY(0); } }}>

          {/* Photo */}
          <div className="h-[55%] relative overflow-hidden bg-[#1a1225]">
            {animal.photo_url
              ? <img src={animal.photo_url} alt={animal.name} className="w-full h-full object-cover" draggable={false} />
              : <div className="w-full h-full flex items-center justify-center text-6xl font-bold text-gray-600">{animal.name?.charAt(0)}</div>}
            <div className="absolute inset-0 bg-gradient-to-t from-[#241d33] via-transparent to-transparent" />

            {/* Compatibility badge */}
            {compat && activeMyAnimal && (
              <div className="compat-in absolute top-3 right-3 z-10">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md border"
                  style={{ backgroundColor: compat.color + "25", borderColor: compat.color + "60" }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: compat.color }} />
                  <span className="text-white font-bold text-xs">{compat.score}%</span>
                  <span className="text-xs font-medium" style={{ color: compat.color }}>{compat.label}</span>
                </div>
              </div>
            )}

            {likeOpacity > 0 && <div className="absolute inset-0 bg-orange-500/10 mix-blend-overlay" style={{ opacity:likeOpacity }} />}
            {passOpacity > 0 && <div className="absolute inset-0 bg-red-500/10 mix-blend-overlay" style={{ opacity:passOpacity }} />}
            {superOpacity > 0 && <div className="absolute inset-0 bg-blue-500/15 mix-blend-overlay" style={{ opacity:superOpacity }} />}

            <div className="absolute bottom-4 left-5 right-5">
              <h2 className="text-2xl font-extrabold text-white drop-shadow-lg">{animal.name}</h2>
              <p className="text-sm text-gray-300">{SPECIES[animal.species] || animal.species}{animal.breed ? " · " + animal.breed : ""}</p>
            </div>
          </div>

          {/* Info */}
          <div className="h-[45%] p-4 overflow-y-auto">

            {/* Score bar + raisons */}
            {compat && activeMyAnimal && (
              <div className="mb-3 p-3 bg-white/5 rounded-2xl border border-white/8">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider">Compatibilité avec {activeMyAnimal.name}</span>
                  <span className="text-xs font-bold" style={{ color: compat.color }}>{compat.score}%</span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-2">
                  <div className="score-bar h-full rounded-full" style={{ "--score-w": compat.score + "%", backgroundColor: compat.color } as any} />
                </div>
                {compat.reasons.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {compat.reasons.map(r => (
                      <span key={r} className="text-[10px] px-2 py-0.5 bg-white/5 text-gray-400 rounded-full">{r}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-1.5 mb-2">
              {animal.canton && <span className="px-2.5 py-1 bg-orange-500/20 text-orange-300 rounded-full text-xs font-medium">{cantonName || animal.canton}</span>}
              {userCanton && animal.canton && <span className="px-2.5 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-bold">{getProximityLabel(userCanton, animal.canton)}</span>}
              {animal.city && <span className="px-2.5 py-1 bg-white/8 text-gray-300 rounded-full text-xs">{animal.city}</span>}
              <span className="px-2.5 py-1 bg-white/8 text-gray-300 rounded-full text-xs">{formatAge(animal.age_months)}</span>
              <span className="px-2.5 py-1 bg-white/8 text-gray-300 rounded-full text-xs">{animal.gender === "male" ? "Mâle" : animal.gender === "femelle" ? "Femelle" : "Inconnu"}</span>
            </div>
            {animal.traits?.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {animal.traits.map(t => (
                  <span key={t} className="px-2 py-0.5 bg-purple-500/15 text-purple-300 rounded-full text-[11px]">{t}</span>
                ))}
              </div>
            )}
            {animal.description && <p className="text-gray-400 text-xs leading-relaxed line-clamp-2">{animal.description}</p>}
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex items-center gap-5 mt-5">
        <button onClick={handlePass}
          className="w-14 h-14 bg-white/5 border border-white/10 rounded-full flex items-center justify-center hover:bg-red-500/20 hover:border-red-500/40 hover:scale-110 active:scale-95 transition-all">
          <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <button onClick={() => handleLike(true)}
          className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-full flex items-center justify-center hover:from-blue-500/40 hover:scale-110 active:scale-95 transition-all">
          <span className="text-xl">⚡</span>
        </button>
        <button onClick={() => handleLike()}
          className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all like-pulse">
          <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
          </svg>
        </button>
        <button onClick={() => { if (currentIndex > 0) { setCurrentIndex(i => i - 1); setStreak(0); } }}
          className="w-12 h-12 bg-white/5 border border-white/10 rounded-full flex items-center justify-center hover:bg-white/10 hover:scale-110 active:scale-95 transition-all">
          <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
          </svg>
        </button>
      </div>

      <p className="text-gray-600 text-[10px] mt-3">← Passer · ❤️ Flairer · ⚡ Super Flair (swipe haut)</p>

      {/* Paywall modal */}
      {showPaywall && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
          <div className="bg-[var(--c-card)] border border-orange-500/30 rounded-3xl p-8 max-w-sm w-full text-center">
            <div className="text-5xl mb-4">🐾</div>
            <h2 className="text-xl font-extrabold text-[var(--c-text)] mb-2">3 matchs gratuits utilisés !</h2>
            <p className="text-sm text-[var(--c-text-muted)] mb-6">Crée un compte gratuit pour continuer à flairer sans limite.</p>
            <div className="flex flex-col gap-3">
              <a href="/signup" className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-2xl text-sm">
                🚀 Créer un compte gratuit
              </a>
              <a href="/login" className="w-full py-3 bg-white/5 border border-white/10 text-[var(--c-text-muted)] font-bold rounded-2xl text-sm">
                Déjà un compte ? Se connecter
              </a>
              <button onClick={() => setShowPaywall(false)} className="text-xs text-[var(--c-text-muted)] mt-2">
                Continuer sans compte (limité)
              </button>
            </div>
            <p className="text-[10px] text-[var(--c-text-muted)] mt-4">✓ Gratuit · ✓ Sans carte · ✓ Matchs illimités</p>
          </div>
        </div>
      )}

      {/* Match modal */}
      {showMatchModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-[#241d33] to-[#1a1225] border border-white/10 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            {matchSuccess ? (
              <div className="text-center py-4">
                <div className="text-5xl mb-3 animate-bounce">{isSuperLike ? "⚡" : "❤️"}</div>
                <h3 className="text-xl font-bold text-white mb-1">{isSuperLike ? "Super Flair envoyé !" : "Flair envoyé !"}</h3>
                <p className="text-gray-400 text-sm">{animal.name} sera bientôt prévenu</p>
                {streak >= 3 && <p className="text-orange-400 text-sm font-bold mt-2">🔥 Streak ×{streak} !</p>}
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-4">
                  {isSuperLike && <span className="text-2xl">⚡</span>}
                  <div>
                    <h3 className="text-lg font-bold text-white">Avec quel compagnon ?</h3>
                    <p className="text-sm text-gray-400">Qui va rencontrer {animal.name} ?</p>
                  </div>
                </div>
                {compat && (
                  <div className="mb-4 p-3 rounded-2xl border flex items-center gap-3"
                    style={{ backgroundColor: compat.color + "15", borderColor: compat.color + "40" }}>
                    <span className="text-2xl">🤝</span>
                    <div>
                      <p className="text-sm font-bold" style={{ color: compat.color }}>{compat.score}% — {compat.label}</p>
                      <p className="text-xs text-gray-500">{compat.reasons[0]}</p>
                    </div>
                  </div>
                )}
                {matchError && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm">{matchError}</div>}
                <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
                  {myAnimals.map(myAnimal => {
                    const c = computeCompatibility(myAnimal, animal);
                    return (
                      <button key={myAnimal.id} onClick={() => handleMatch(myAnimal.id)}
                        className="w-full flex items-center gap-3 p-3 bg-white/5 hover:bg-orange-500/10 rounded-2xl transition text-left border border-white/5 hover:border-orange-500/20">
                        <div className="w-12 h-12 rounded-full bg-[#1a1225] border-2 border-orange-400/50 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {myAnimal.photo_url
                            ? <img src={myAnimal.photo_url} alt={myAnimal.name} className="w-full h-full object-cover" />
                            : <span className="text-sm font-bold text-gray-500">{myAnimal.name?.charAt(0)}</span>}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-white text-sm">{myAnimal.name}</p>
                          <p className="text-xs text-gray-500">{myAnimal.species}{myAnimal.breed ? " · " + myAnimal.breed : ""}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold" style={{ color: c.color }}>{c.score}%</span>
                          <p className="text-[10px] text-gray-600">{c.label}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <button onClick={() => { setShowMatchModal(false); setMatchError(null); setIsSuperLike(false); setDragX(0); setDragY(0); }}
                  className="w-full py-2.5 bg-white/5 border border-white/10 text-gray-400 font-medium rounded-2xl transition text-sm">
                  Annuler
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
