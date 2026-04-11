export interface Badge {
  id: string;
  name: string;
  emoji: string;
  description: string;
  tier: "bronze" | "silver" | "gold" | "diamond";
  color: string;
}

export const ALL_BADGES: Badge[] = [
  { id: "first_step", name: "Premier pas", emoji: "\uD83D\uDC3E", description: "Premi\u00e8re visite sur PawBand", tier: "bronze", color: "#CD7F32" },
  { id: "pet_parent", name: "Pet parent", emoji: "\uD83C\uDF7C", description: "A ajout\u00e9 son premier compagnon", tier: "bronze", color: "#CD7F32" },
  { id: "first_flair", name: "Premier flair", emoji: "\uD83D\uDC43", description: "A envoy\u00e9 sa premi\u00e8re demande", tier: "bronze", color: "#CD7F32" },
  { id: "messenger", name: "Bavard", emoji: "\uD83D\uDCAC", description: "A envoy\u00e9 son premier message", tier: "bronze", color: "#CD7F32" },
  { id: "streak_3", name: "R\u00e9gulier", emoji: "\u2B50", description: "3 jours d\u2019affil\u00e9e", tier: "bronze", color: "#CD7F32" },
  { id: "streak_7", name: "Fid\u00e8le", emoji: "\uD83D\uDD25", description: "7 jours d\u2019affil\u00e9e", tier: "silver", color: "#C0C0C0" },
  { id: "streak_30", name: "D\u00e9vou\u00e9", emoji: "\uD83D\uDC8E", description: "30 jours d\u2019affil\u00e9e", tier: "gold", color: "#FFD700" },
  { id: "streak_100", name: "Centurion", emoji: "\uD83D\uDC51", description: "100 jours d\u2019affil\u00e9e", tier: "diamond", color: "#B9F2FF" },
  { id: "popular_5", name: "Populaire", emoji: "\uD83D\uDC95", description: "5 matchs obtenus", tier: "silver", color: "#C0C0C0" },
  { id: "star_10", name: "Star", emoji: "\uD83C\uDF1F", description: "10 matchs obtenus", tier: "gold", color: "#FFD700" },
  { id: "pet_family", name: "Famille", emoji: "\uD83C\uDFE0", description: "3+ compagnons enregistr\u00e9s", tier: "silver", color: "#C0C0C0" },
  { id: "chatterbox", name: "Causeur", emoji: "\uD83D\uDDE3\uFE0F", description: "10+ messages envoy\u00e9s", tier: "silver", color: "#C0C0C0" },
];

export interface BadgeStats {
  streakCount: number;
  matchCount: number;
  messageCount: number;
  animalCount: number;
}

export function computeEarnedBadgeIds(stats: BadgeStats): string[] {
  const earned: string[] = ["first_step"];
  if (stats.animalCount >= 1) earned.push("pet_parent");
  if (stats.animalCount >= 3) earned.push("pet_family");
  if (stats.matchCount >= 1) earned.push("first_flair");
  if (stats.matchCount >= 5) earned.push("popular_5");
  if (stats.matchCount >= 10) earned.push("star_10");
  if (stats.messageCount >= 1) earned.push("messenger");
  if (stats.messageCount >= 10) earned.push("chatterbox");
  if (stats.streakCount >= 3) earned.push("streak_3");
  if (stats.streakCount >= 7) earned.push("streak_7");
  if (stats.streakCount >= 30) earned.push("streak_30");
  if (stats.streakCount >= 100) earned.push("streak_100");
  return earned;
}

const STORAGE_KEY = "pawly_badges_seen";

export function getNewlyEarnedBadges(stats: BadgeStats): Badge[] {
  const earnedIds = computeEarnedBadgeIds(stats);
  let seen: string[] = [];
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (raw) seen = JSON.parse(raw);
  } catch { /* corrupted storage */ }

  const newIds = earnedIds.filter((id) => !seen.includes(id));

  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(earnedIds));
    }
  } catch { /* storage full */ }

  return newIds
    .map((id) => ALL_BADGES.find((b) => b.id === id))
    .filter((b): b is Badge => b !== undefined);
}

export function getEarnedBadges(stats: BadgeStats): Badge[] {
  const earnedIds = computeEarnedBadgeIds(stats);
  return earnedIds
    .map((id) => ALL_BADGES.find((b) => b.id === id))
    .filter((b): b is Badge => b !== undefined);
}
