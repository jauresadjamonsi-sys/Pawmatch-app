"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  age_months: number | null;
  gender: string;
}

interface Story {
  type: "mood" | "weekly" | "fact" | "achievement";
  animal: AnimalRow;
  title: string;
  subtitle: string;
  emoji: string;
  gradient: string;
}

// ---------------------------------------------------------------------------
// Mood engine (matches feed page logic)
// ---------------------------------------------------------------------------

type Mood = { label: string; emoji: string; color: string };

const MOODS: Mood[] = [
  { label: "Energique", emoji: "\u26A1", color: "text-orange-400" },
  { label: "Calme", emoji: "\uD83C\uDF3F", color: "text-green-400" },
  { label: "Joueur", emoji: "\uD83C\uDF89", color: "text-pink-400" },
  { label: "Endormi", emoji: "\uD83D\uDE34", color: "text-purple-300" },
  { label: "Calin", emoji: "\uD83E\uDDF8", color: "text-red-300" },
  { label: "Curieux", emoji: "\uD83D\uDD0D", color: "text-cyan-400" },
  { label: "Gourmand", emoji: "\uD83C\uDF56", color: "text-amber-400" },
  { label: "Aventurier", emoji: "\uD83C\uDFDE\uFE0F", color: "text-teal-300" },
];

function dailySeed(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function getMood(animal: AnimalRow): Mood {
  const biasMap: Record<string, number> = {
    Energique: 0, Sportif: 0, Actif: 0,
    Calme: 1, Discret: 1, Dormeur: 1,
    Joueur: 2, Acrobate: 2,
    "Pot de colle": 4, Calin: 4,
    Curieux: 5, Chasseur: 5,
    Gourmand: 6,
  };
  const biases: number[] = [];
  for (const t of animal.traits || []) {
    if (biasMap[t] !== undefined) biases.push(biasMap[t]);
  }
  const seed = (dailySeed() + hashStr(animal.id)) % MOODS.length;
  if (biases.length > 0) {
    const pick = (seed % 10) < 6 ? biases[seed % biases.length] : seed;
    return MOODS[pick % MOODS.length];
  }
  return MOODS[seed % MOODS.length];
}

// ---------------------------------------------------------------------------
// Fun facts per species
// ---------------------------------------------------------------------------

const FUN_FACTS: Record<AnimalSpecies, string[]> = {
  chien: [
    "Le nez d\u2019un chien est aussi unique qu\u2019une empreinte digitale.",
    "Les chiens peuvent apprendre plus de 1 000 mots.",
    "Le Greyhound peut courir jusqu\u2019a 72 km/h.",
    "Les chiens revent pendant leur sommeil.",
    "Un chien adulte a 42 dents.",
  ],
  chat: [
    "Les chats passent 70 % de leur vie a dormir.",
    "Un chat peut sauter jusqu\u2019a 6 fois sa longueur.",
    "Les chats ronronnent a une frequence qui favorise la guerison.",
    "Les chats ont plus de 20 vocalisations differentes.",
    "Un chat adulte n\u2019utilise le miaulement que pour les humains.",
  ],
  lapin: [
    "Les lapins peuvent voir a presque 360 degres.",
    "Un lapin heureux fait des binkies - des sauts de joie.",
    "Les dents d\u2019un lapin poussent continuellement.",
    "Un lapin peut courir jusqu\u2019a 56 km/h.",
    "Les lapins communiquent en tapant du pied.",
  ],
  oiseau: [
    "Les perroquets peuvent vivre plus de 80 ans.",
    "Les oiseaux ont des os creux pour faciliter le vol.",
    "Les oiseaux voient les couleurs ultraviolettes.",
    "Les cacatoes peuvent danser en rythme sur la musique.",
    "Les corbeaux peuvent utiliser des outils.",
  ],
  rongeur: [
    "Les hamsters peuvent stocker de la nourriture dans leurs abajoues.",
    "Les rats rient quand on les chatouille.",
    "Les chinchillas ont la fourrure la plus dense au monde.",
    "Un hamster peut courir 9 km par nuit dans sa roue.",
    "Les cochons d\u2019Inde popcornent quand ils sont excites.",
  ],
  autre: [
    "Les tortues existent depuis plus de 200 millions d\u2019annees.",
    "Les axolotls peuvent regenerer leurs membres.",
    "Les furets font une danse de la joie quand ils jouent.",
    "Un cameleon peut bouger chaque oeil independamment.",
    "Les poissons rouges ont une memoire de plusieurs mois.",
  ],
};

// ---------------------------------------------------------------------------
// Achievement milestones
// ---------------------------------------------------------------------------

const ACHIEVEMENTS = [
  { threshold: 1, emoji: "\uD83C\uDF1F", label: "Premier pas" },
  { threshold: 5, emoji: "\uD83D\uDD25", label: "5 matchs" },
  { threshold: 10, emoji: "\uD83C\uDFC6", label: "10 matchs !" },
  { threshold: 25, emoji: "\uD83D\uDC8E", label: "25 matchs !" },
  { threshold: 50, emoji: "\uD83D\uDE80", label: "50 matchs !" },
];

// ---------------------------------------------------------------------------
// Gradients
// ---------------------------------------------------------------------------

const GRADIENTS = [
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
  "linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)",
  "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)",
];

// ---------------------------------------------------------------------------
// STORY DURATION
// ---------------------------------------------------------------------------

const STORY_DURATION = 5000; // 5 seconds per story

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StoriesPage() {
  const router = useRouter();
  const { t } = useAppContext();
  const [stories, setStories] = useState<Story[]>([]);
  const [current, setCurrent] = useState(0);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [textVisible, setTextVisible] = useState(false);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  // -----------------------------------------------------------------------
  // Build stories from user's animals
  // -----------------------------------------------------------------------

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/feed");
        return;
      }

      const [animalsRes, matchRes, msgRes] = await Promise.all([
        supabase
          .from("animals")
          .select("id, name, species, breed, photo_url, traits, age_months, gender")
          .eq("created_by", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("matches")
          .select("*", { count: "exact", head: true })
          .eq("sender_user_id", user.id),
        supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("sender_id", user.id)
          .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
      ]);

      const animals = (animalsRes.data as AnimalRow[] | null) || [];
      const totalMatches = matchRes.count || 0;
      const weekMessages = msgRes.count || 0;

      if (animals.length === 0) {
        router.push("/feed");
        return;
      }

      const built: Story[] = [];

      for (const animal of animals) {
        const mood = getMood(animal);
        const facts = FUN_FACTS[animal.species] || FUN_FACTS.autre;
        const factIdx = (dailySeed() + hashStr(animal.id)) % facts.length;
        const gradientIdx = hashStr(animal.id) % GRADIENTS.length;

        // Daily Mood
        built.push({
          type: "mood",
          animal,
          title: `${mood.emoji} ${mood.label}`,
          subtitle: t.storiesDaily || "Humeur du jour",
          emoji: mood.emoji,
          gradient: GRADIENTS[gradientIdx % GRADIENTS.length],
        });

        // Fun Fact
        built.push({
          type: "fact",
          animal,
          title: facts[factIdx],
          subtitle: t.storiesFact || "Le saviez-vous ?",
          emoji: "\uD83D\uDCA1",
          gradient: GRADIENTS[(gradientIdx + 1) % GRADIENTS.length],
        });

        // Weekly Recap
        built.push({
          type: "weekly",
          animal,
          title: `${totalMatches} ${t.storiesMatchesWeek || "matchs cette semaine"}\n${weekMessages} ${t.storiesMessagesWeek || "messages cette semaine"}`,
          subtitle: t.storiesWeekly || "Resume de la semaine",
          emoji: "\uD83D\uDCCA",
          gradient: GRADIENTS[(gradientIdx + 2) % GRADIENTS.length],
        });

        // Achievement
        const ach = [...ACHIEVEMENTS].reverse().find((a) => totalMatches >= a.threshold);
        if (ach) {
          built.push({
            type: "achievement",
            animal,
            title: `${ach.emoji} ${ach.label}`,
            subtitle: t.storiesAchievement || "Succes",
            emoji: ach.emoji,
            gradient: GRADIENTS[(gradientIdx + 3) % GRADIENTS.length],
          });
        }
      }

      setStories(built);
      setLoading(false);
    }

    load();
  }, [router, t]);

  // -----------------------------------------------------------------------
  // Auto-advance timer
  // -----------------------------------------------------------------------

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    startTimeRef.current = Date.now();
    setProgress(0);
    setTextVisible(false);

    // Trigger text animation after a short delay
    const textTimeout = setTimeout(() => setTextVisible(true), 300);

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min((elapsed / STORY_DURATION) * 100, 100);
      setProgress(pct);

      if (elapsed >= STORY_DURATION) {
        setCurrent((prev) => {
          if (prev < stories.length - 1) return prev + 1;
          router.push("/feed");
          return prev;
        });
      }
    }, 50);

    return () => {
      clearTimeout(textTimeout);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [stories.length, router]);

  useEffect(() => {
    if (stories.length === 0) return;
    const cleanup = startTimer();
    return cleanup;
  }, [current, stories.length, startTimer]);

  // -----------------------------------------------------------------------
  // Navigation
  // -----------------------------------------------------------------------

  function goNext() {
    if (current < stories.length - 1) {
      setCurrent((p) => p + 1);
    } else {
      router.push("/feed");
    }
  }

  function goPrev() {
    if (current > 0) {
      setCurrent((p) => p - 1);
    }
  }

  function handleTap(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width / 3) {
      goPrev();
    } else {
      goNext();
    }
  }

  // Swipe down to close
  function handleTouchStart(e: React.TouchEvent) {
    setTouchStartY(e.touches[0].clientY);
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartY === null) return;
    const deltaY = e.changedTouches[0].clientY - touchStartY;
    if (deltaY > 100) {
      router.push("/feed");
    }
    setTouchStartY(null);
  }

  // -----------------------------------------------------------------------
  // Loading state
  // -----------------------------------------------------------------------

  if (loading) {
    return (
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center"
        style={{ background: "#000" }}
      >
        <div className="w-10 h-10 border-4 border-[var(--c-border)] border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (stories.length === 0) {
    return null;
  }

  const story = stories[current];
  const speciesEmoji = EMOJI_MAP[story.animal.species] || "\uD83D\uDC3E";

  return (
    <div
      className="fixed inset-0 z-[9999] select-none"
      style={{ width: "100vw", height: "100vh", background: "#000" }}
      onClick={handleTap}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background: pet photo or gradient */}
      {story.animal.photo_url ? (
        <Image
          src={story.animal.photo_url}
          alt={story.animal.name}
          fill
          className="object-cover"
          sizes="100vw"
          priority
        />
      ) : (
        <div className="absolute inset-0" style={{ background: story.gradient }} />
      )}

      {/* Dark gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.1) 30%, rgba(0,0,0,0.1) 60%, rgba(0,0,0,0.7) 100%)",
        }}
      />

      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 flex gap-1 px-3 pt-3 z-10">
        {stories.map((_, idx) => (
          <div
            key={idx}
            className="flex-1 h-[3px] rounded-full overflow-hidden"
            style={{ background: "rgba(255,255,255,0.3)" }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width:
                  idx < current
                    ? "100%"
                    : idx === current
                    ? `${progress}%`
                    : "0%",
                background: "#fff",
                transition: idx === current ? "none" : "width 0.3s",
              }}
            />
          </div>
        ))}
      </div>

      {/* Top bar: pet info + close button */}
      <div className="absolute top-8 left-0 right-0 px-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/50 flex-shrink-0">
            {story.animal.photo_url ? (
              <Image
                src={story.animal.photo_url}
                alt={story.animal.name}
                width={40}
                height={40}
                className="object-cover w-full h-full"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-lg"
                style={{ background: story.gradient }}
              >
                {speciesEmoji}
              </div>
            )}
          </div>
          <div>
            <p className="text-white text-sm font-bold">{story.animal.name}</p>
            <p className="text-white/60 text-[10px]">{story.subtitle}</p>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            router.push("/feed");
          }}
          className="w-8 h-8 flex items-center justify-center rounded-full text-white"
          style={{ background: "rgba(255,255,255,0.2)" }}
          aria-label={t.storiesBack || "Retour"}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Story content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-8 z-10">
        {/* Main emoji */}
        <div
          className={`text-7xl mb-6 transition-all duration-700 ${
            textVisible ? "opacity-100 scale-100" : "opacity-0 scale-50"
          }`}
        >
          {story.emoji}
        </div>

        {/* Title text */}
        <div
          className={`text-center transition-all duration-700 delay-200 ${
            textVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-6"
          }`}
        >
          <h1 className="text-white text-3xl font-black leading-tight whitespace-pre-line drop-shadow-lg">
            {story.title}
          </h1>
        </div>

        {/* Subtitle badge */}
        <div
          className={`mt-6 transition-all duration-700 delay-500 ${
            textVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4"
          }`}
        >
          <span
            className="px-4 py-2 rounded-full text-sm font-semibold text-white"
            style={{ background: "rgba(255,255,255,0.2)", backdropFilter: "blur(10px)" }}
          >
            {story.animal.name} {speciesEmoji}
          </span>
        </div>

        {/* Type-specific extra content */}
        {story.type === "weekly" && (
          <div
            className={`mt-6 transition-all duration-700 delay-700 ${
              textVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <div
              className="rounded-2xl px-5 py-3 text-center"
              style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(10px)" }}
            >
              <p className="text-white/80 text-xs font-medium">
                {t.storiesWeekly || "Resume de la semaine"}
              </p>
            </div>
          </div>
        )}

        {story.type === "achievement" && (
          <div
            className={`mt-4 transition-all duration-1000 delay-700 ${
              textVisible ? "opacity-100 scale-100" : "opacity-0 scale-0"
            }`}
          >
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <span key={i} className="text-2xl animate-bounce" style={{ animationDelay: `${i * 0.1}s` }}>
                  {"\u2B50"}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom: navigation hint */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center z-10">
        <p className="text-white/40 text-xs">
          {current + 1} / {stories.length}
        </p>
      </div>
    </div>
  );
}
