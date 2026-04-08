"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

// ═══ Level definitions ═══
const LEVELS = [
  { min: 0,   max: 100,  label: "Débutant",    emoji: "🐣" },
  { min: 100, max: 300,  label: "Explorateur",  emoji: "🐕" },
  { min: 300, max: 500,  label: "Passionné",    emoji: "🦮" },
  { min: 500, max: 750,  label: "Expert",       emoji: "🏆" },
  { min: 750, max: 1000, label: "Légende",      emoji: "🌟" },
] as const;

// ═══ Achievement definitions ═══
export type Achievement = {
  id: string;
  key: string;
  emoji: string;
  points: number;
  unlocked: boolean;
  unlockedAt?: string;
};

type AchievementDef = {
  id: string;
  key: string;
  emoji: string;
  points: number;
  check: (d: ScoreData) => boolean;
};

const ACHIEVEMENT_DEFS: AchievementDef[] = [
  { id: "first_animal",     key: "achFirstAnimal",   emoji: "🐾", points: 50,  check: d => d.animalCount >= 1 },
  { id: "5_matches",        key: "ach5Matches",      emoji: "💕", points: 20,  check: d => d.matchCount >= 5 },
  { id: "10_matches",       key: "ach10Matches",     emoji: "💖", points: 30,  check: d => d.matchCount >= 10 },
  { id: "50_messages",      key: "ach50Messages",    emoji: "💬", points: 25,  check: d => d.messageCount >= 50 },
  { id: "profile_complete", key: "achProfileComplete",emoji: "✅", points: 100, check: d => d.profileComplete },
  { id: "streak_7",         key: "achStreak7",       emoji: "🔥", points: 30,  check: d => d.streakDays >= 7 },
  { id: "streak_30",        key: "achStreak30",      emoji: "⚡", points: 50,  check: d => d.streakDays >= 30 },
  { id: "first_event",      key: "achFirstEvent",    emoji: "🎉", points: 30,  check: d => d.eventCount >= 1 },
];

// ═══ Raw data from Supabase ═══
type ScoreData = {
  animalCount: number;
  matchCount: number;
  messageCount: number;
  profileComplete: boolean;
  streakDays: number;
  eventCount: number;
};

// ═══ Score breakdown per category ═══
export type ScoreBreakdown = {
  animals: number;
  matches: number;
  messages: number;
  profile: number;
  streak: number;
  events: number;
};

// ═══ Return type ═══
export type PawScoreResult = {
  score: number;
  level: string;
  levelEmoji: string;
  levelIndex: number;
  nextLevelAt: number;
  currentLevelMin: number;
  breakdown: ScoreBreakdown;
  achievements: Achievement[];
  loading: boolean;
  raw: ScoreData;
  refetch: () => void;
};

function getLevel(score: number) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (score >= LEVELS[i].min) return { ...LEVELS[i], index: i };
  }
  return { ...LEVELS[0], index: 0 };
}

function calculateBreakdown(data: ScoreData): ScoreBreakdown {
  return {
    animals:  Math.min(data.animalCount * 50, 250),
    matches:  Math.min(data.matchCount * 20, 200),
    messages: Math.min(data.messageCount * 5, 100),
    profile:  data.profileComplete ? 100 : 0,
    streak:   Math.min(data.streakDays * 10, 100),
    events:   Math.min(data.eventCount * 30, 150),
  };
}

function calculateScore(breakdown: ScoreBreakdown): number {
  const total = breakdown.animals + breakdown.matches + breakdown.messages
    + breakdown.profile + breakdown.streak + breakdown.events;
  return Math.min(total, 1000);
}

function getStreakFromLocalStorage(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem("pawly_streak");
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (parsed.lastDate === today || parsed.lastDate === yesterday) {
      return parsed.count || 0;
    }
    return 0;
  } catch {
    return 0;
  }
}

// ═══ Stored achievements with unlock dates ═══
const ACHIEVEMENTS_KEY = "pawly_achievements";

function loadStoredAchievements(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(ACHIEVEMENTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function storeAchievement(id: string) {
  if (typeof window === "undefined") return;
  const stored = loadStoredAchievements();
  if (!stored[id]) {
    stored[id] = new Date().toISOString();
    localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(stored));
  }
}

// ═══ The main hook ═══
export function usePawScore(userId?: string): PawScoreResult {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ScoreData>({
    animalCount: 0, matchCount: 0, messageCount: 0,
    profileComplete: false, streakDays: 0, eventCount: 0,
  });

  const fetchData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const supabase = createClient();
    setLoading(true);

    try {
      // Fetch all data in parallel
      const [animalsRes, matchesRes, messagesRes, profileRes, eventsRes] = await Promise.all([
        // Animals count
        supabase.from("animals").select("id", { count: "exact", head: true }).eq("created_by", userId),
        // Accepted matches count
        Promise.resolve(supabase.from("matches").select("*", { count: "exact", head: true })
          .or(`sender_user_id.eq.${userId},receiver_user_id.eq.${userId}`)).then(r => r).catch(() => ({ count: 0 })),
        // Messages count
        supabase.from("messages").select("id", { count: "exact", head: true }).eq("sender_id", userId),
        // Profile completeness
        supabase.from("profiles").select("*").eq("id", userId).single(),
        // Events joined count
        Promise.resolve(supabase.from("event_participants").select("id", { count: "exact", head: true }).eq("user_id", userId)).then(r => r).catch(() => ({ count: 0 })),
      ]);

      // Check profile completion
      const p = profileRes.data;
      const profileComplete = !!(p?.full_name && p?.city && p?.phone);

      // Get streak from localStorage (same source as feed page)
      const streakDays = getStreakFromLocalStorage();

      setData({
        animalCount: animalsRes.count ?? 0,
        matchCount: matchesRes.count ?? 0,
        messageCount: messagesRes.count ?? 0,
        profileComplete,
        streakDays,
        eventCount: eventsRes.count ?? 0,
      });
    } catch (err) {
      console.error("[PawScore] Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate derived values
  const breakdown = calculateBreakdown(data);
  const score = calculateScore(breakdown);
  const level = getLevel(score);
  const nextLevelAt = level.index < LEVELS.length - 1 ? LEVELS[level.index + 1].min : 1000;

  // Process achievements with stored unlock dates
  const storedDates = loadStoredAchievements();
  const achievements: Achievement[] = ACHIEVEMENT_DEFS.map(def => {
    const unlocked = def.check(data);
    if (unlocked) storeAchievement(def.id);
    return {
      id: def.id,
      key: def.key,
      emoji: def.emoji,
      points: def.points,
      unlocked,
      unlockedAt: storedDates[def.id],
    };
  });

  return {
    score,
    level: level.label,
    levelEmoji: level.emoji,
    levelIndex: level.index,
    nextLevelAt,
    currentLevelMin: level.min,
    breakdown,
    achievements,
    loading,
    raw: data,
    refetch: fetchData,
  };
}
