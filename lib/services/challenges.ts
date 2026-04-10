// ═══════ DAILY & WEEKLY CHALLENGES SYSTEM ═══════

export type ChallengeType =
  | "post_reel"
  | "post_story"
  | "send_flair"
  | "make_match"
  | "comment_reel"
  | "visit_feed"
  | "share_profile"
  | "explore_page"
  | "join_group"
  | "add_animal_photo"
  | "like_reels";

export type Challenge = {
  id: string;
  type: ChallengeType;
  title: string;
  description: string;
  icon: string;
  target: number;
  reward: number;
  difficulty: "easy" | "medium" | "hard";
};

const CHALLENGE_POOL: Challenge[] = [
  { id: "post_reel", type: "post_reel", title: "Createur du jour", description: "Publie un Reel", icon: "🎬", target: 1, reward: 10, difficulty: "easy" },
  { id: "post_story", type: "post_story", title: "Story time", description: "Partage une Story", icon: "📸", target: 1, reward: 8, difficulty: "easy" },
  { id: "send_3_flairs", type: "send_flair", title: "Flaireur actif", description: "Envoie 3 Flairs", icon: "👃", target: 3, reward: 12, difficulty: "medium" },
  { id: "make_match", type: "make_match", title: "Coup de foudre", description: "Obtiens un match", icon: "💕", target: 1, reward: 15, difficulty: "medium" },
  { id: "comment_3", type: "comment_reel", title: "Commentateur", description: "Commente 3 Reels", icon: "💬", target: 3, reward: 10, difficulty: "easy" },
  { id: "like_5", type: "like_reels", title: "Fan inconditionnel", description: "Like 5 Reels", icon: "❤️", target: 5, reward: 8, difficulty: "easy" },
  { id: "visit_explore", type: "explore_page", title: "Explorateur", description: "Visite la page Explorer", icon: "🔍", target: 1, reward: 5, difficulty: "easy" },
  { id: "join_group", type: "join_group", title: "Social butterfly", description: "Rejoins un groupe", icon: "👥", target: 1, reward: 10, difficulty: "medium" },
  { id: "share_profile", type: "share_profile", title: "Ambassadeur", description: "Partage ton profil", icon: "📤", target: 1, reward: 8, difficulty: "easy" },
  { id: "add_photo", type: "add_animal_photo", title: "Photographe", description: "Ajoute une photo a ton animal", icon: "📷", target: 1, reward: 10, difficulty: "easy" },
];

// Deterministic daily selection — 3 challenges per day based on date seed
export function getDailyChallenges(date?: Date): Challenge[] {
  const d = date || new Date();
  const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  const shuffled = [...CHALLENGE_POOL].sort((a, b) => {
    const hashA = ((seed * 31 + a.id.charCodeAt(0) * 17) % 1000) / 1000;
    const hashB = ((seed * 31 + b.id.charCodeAt(0) * 17) % 1000) / 1000;
    return hashA - hashB;
  });
  return shuffled.slice(0, 3);
}

// Weekly challenge — 1 hard challenge per week
export function getWeeklyChallenge(date?: Date): Challenge {
  const d = date || new Date();
  const weekNum = Math.floor(d.getTime() / (7 * 24 * 60 * 60 * 1000));
  const weeklyChallenges: Challenge[] = [
    { id: "weekly_5_reels", type: "post_reel", title: "Star de la semaine", description: "Publie 5 Reels cette semaine", icon: "🌟", target: 5, reward: 50, difficulty: "hard" },
    { id: "weekly_10_flairs", type: "send_flair", title: "Super social", description: "Envoie 10 Flairs cette semaine", icon: "🏆", target: 10, reward: 75, difficulty: "hard" },
    { id: "weekly_streak_7", type: "visit_feed", title: "Assidu", description: "Connecte-toi 7 jours d'affilee", icon: "🔥", target: 7, reward: 60, difficulty: "hard" },
  ];
  return weeklyChallenges[weekNum % weeklyChallenges.length];
}
