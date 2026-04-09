// =============================================================================
// PAWLY / PawMatch — Centralized TypeScript types
// =============================================================================
// Single source of truth for domain types used across the app.
// Import from "@/lib/types" instead of re-declaring inline.
// =============================================================================

// ---------------------------------------------------------------------------
// Enums / union literals
// ---------------------------------------------------------------------------

export type UserRole = "adoptant" | "admin";
export type AnimalStatus = "disponible" | "en_cours" | "adopte";
export type AnimalSpecies = "chien" | "chat" | "lapin" | "oiseau" | "rongeur" | "autre";
export type MatchStatus = "pending" | "accepted" | "rejected";
export type AnimalGender = "male" | "femelle" | "inconnu";

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

/** Full user profile row from `profiles` table. */
export interface ProfileRow {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  phone: string | null;
  city: string | null;
  canton: string | null;
  avatar_url: string | null;
  subscription?: string | null;
  created_at: string;
  updated_at: string;
}

/** Lightweight profile embed returned in joined queries. */
export interface ProfileEmbed {
  id?: string;
  full_name: string | null;
  avatar_url: string | null;
  email?: string;
}

// ---------------------------------------------------------------------------
// Animal
// ---------------------------------------------------------------------------

/** Full animal row from `animals` table. */
export interface AnimalRow {
  id: string;
  name: string;
  species: AnimalSpecies | string;
  breed: string | null;
  age_months: number | null;
  gender: AnimalGender | string;
  description: string | null;
  photo_url: string | null;
  photos: string[] | null;
  status: AnimalStatus | string;
  city: string | null;
  canton: string | null;
  weight_kg: number | null;
  vaccinated: boolean;
  sterilized: boolean;
  traits: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Diet & health
  diet_type: string | null;
  food_brand: string | null;
  treats: string | null;
  allergies: string | null;
  extra_photos?: string[];
  // Health
  next_vaccine_date?: string | null;
  last_vet_visit?: string | null;
  // Extended fields
  energy_level?: string | null;
  sociability?: string | null;
  training_level?: string | null;
  favorite_activities?: string[] | null;
  microchip_id?: string | null;
  insurance?: string | null;
}

/** Lightweight animal embed returned in joined queries. */
export interface AnimalEmbed {
  id: string;
  name: string;
  species: AnimalSpecies | string;
  breed?: string | null;
  photo_url: string | null;
}

/** Animal with computed compatibility data attached. */
export type AnimalWithCompat = AnimalRow & {
  compatibility?: {
    score: number;
    label: string;
    color: string;
    reasons: string[];
  };
};

// ---------------------------------------------------------------------------
// Match
// ---------------------------------------------------------------------------

/** Match row from `matches` table. */
export interface MatchRow {
  id: string;
  sender_animal_id: string;
  receiver_animal_id: string;
  sender_user_id: string;
  receiver_user_id: string;
  status: MatchStatus;
  created_at: string;
  updated_at: string;
}

/** Match with joined animal + profile data. */
export type MatchWithAnimals = MatchRow & {
  sender_animal: { id: string; name: string; species: string; breed: string | null; photo_url: string | null };
  receiver_animal: { id: string; name: string; species: string; breed: string | null; photo_url: string | null };
  sender_profile: { id: string; full_name: string | null; email: string; avatar_url?: string | null };
  receiver_profile: { id: string; full_name: string | null; email: string; avatar_url?: string | null };
};

// ---------------------------------------------------------------------------
// Message
// ---------------------------------------------------------------------------

/** Message row from `messages` table. */
export interface MessageRow {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  image_url: string | null;
  read_at: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Story
// ---------------------------------------------------------------------------

/** Story row from `stories` table with joined animal & profile embeds. */
export interface StoryRow {
  id: string;
  user_id: string;
  animal_id: string | null;
  /** @deprecated Use media_url instead */
  image_url?: string | null;
  media_url: string | null;
  caption: string | null;
  template: string;
  bg_gradient: string | null;
  text_color: string | null;
  sticker: string | null;
  views_count: number;
  expires_at: string;
  created_at: string;
  animals: AnimalEmbed | null;
  profiles: ProfileEmbed | null;
}

/** A single viewable story within a user group. */
export interface ViewableStory {
  row: StoryRow;
  mediaType: "image" | "video" | "none";
}

/** Stories grouped by user_id (Instagram-style). */
export interface UserStoryGroup {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  animalPhotoUrl?: string | null;
  stories?: ViewableStory[];
  storyIds?: string[];
  latestStoryAt?: string;
}

// ---------------------------------------------------------------------------
// Event
// ---------------------------------------------------------------------------

/** Event row from `events` table. */
export interface EventRow {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  location: string;
  canton: string;
  max_participants: number;
  species: string[];
  created_by: string;
  created_at: string;
  organizer?: { full_name: string | null; email: string };
  participant_count?: number;
  is_joined?: boolean;
}

// ---------------------------------------------------------------------------
// Notification
// ---------------------------------------------------------------------------

export type NotificationType = "match" | "message" | "event" | "system" | "reminder";

export interface NotificationRow {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Presence
// ---------------------------------------------------------------------------

export interface UserPresence {
  user_id: string;
  last_seen: string;
  is_online: boolean;
}

// ---------------------------------------------------------------------------
// Admin-specific
// ---------------------------------------------------------------------------

export interface AdminUserRow {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  subscription: string | null;
  canton: string | null;
  city: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  animal_count: number;
}

export interface ReportRow {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  reported_animal_id: string | null;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  reporter_name: string;
  reported_user_name: string;
}

export interface AdminStats {
  totalUsers: number;
  usersToday: number;
  usersWeek: number;
  usersLastWeek: number;
  usersMonth: number;
  totalAnimals: number;
  animalsToday: number;
  animalsBySpecies: Record<string, number>;
  totalMatches: number;
  matchesToday: number;
  matchesLast24h: number;
  totalMessages: number;
  totalEvents: number;
  premiumCount: number;
  proCount: number;
  estimatedMRR: number;
  growthRate: number;
  allUsers: AdminUserRow[];
  allAnimals: AnimalRow[];
  dailySignups: { date: string; count: number }[];
  recentActivity: { type: string; text: string; time: string }[];
  pendingReports: ReportRow[];
  totalReports: number;
}

// ---------------------------------------------------------------------------
// Generic helpers
// ---------------------------------------------------------------------------

/** Standard service result wrapper. */
export type ServiceResult<T> = {
  data: T | null;
  error: string | null;
};

/** Feed-specific streak data (stored in localStorage). */
export interface Streak {
  count: number;
  lastDate: string;
}

// ---------------------------------------------------------------------------
// Reels (TikTok-style short videos)
// ---------------------------------------------------------------------------

export interface ReelRow {
  id: string;
  user_id: string;
  animal_id: string | null;
  video_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  hashtags: string[];
  duration_seconds: number;
  views_count: number;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  engagement_score: number;
  is_featured: boolean;
  status: "active" | "hidden" | "reported";
  created_at: string;
  updated_at: string;
}

export type ReelWithAuthor = ReelRow & {
  profiles: ProfileEmbed | null;
  animals: AnimalEmbed | null;
  is_liked?: boolean;
  is_following?: boolean;
};

export interface ReelComment {
  id: string;
  reel_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: ProfileEmbed | null;
}

// ---------------------------------------------------------------------------
// Followers
// ---------------------------------------------------------------------------

export interface FollowerRow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface FollowStats {
  followers_count: number;
  following_count: number;
  is_following: boolean;
}

// ---------------------------------------------------------------------------
// Super Flair
// ---------------------------------------------------------------------------

export interface SuperFlairRow {
  id: string;
  sender_user_id: string;
  receiver_user_id: string;
  sender_animal_id: string;
  receiver_animal_id: string;
  match_id: string | null;
  message: string | null;
  seen: boolean;
  created_at: string;
}

// ---------------------------------------------------------------------------
// PawCoins
// ---------------------------------------------------------------------------

export type PawCoinTxType =
  | "welcome_bonus" | "daily_login" | "streak_bonus"
  | "reel_posted" | "reel_liked" | "reel_viral"
  | "match_made" | "super_flair_sent" | "super_flair_received"
  | "boost_purchased" | "boost_used"
  | "referral_bonus" | "challenge_completed"
  | "purchase" | "admin_grant";

export interface PawCoinTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: PawCoinTxType;
  description: string | null;
  balance_after: number;
  reference_id: string | null;
  created_at: string;
}

export interface PawCoinWallet {
  balance: number;
  transactions: PawCoinTransaction[];
}

// ---------------------------------------------------------------------------
// Profile Boost
// ---------------------------------------------------------------------------

export interface ProfileBoost {
  id: string;
  user_id: string;
  animal_id: string;
  cost_pawcoins: number;
  started_at: string;
  expires_at: string;
}

// ---------------------------------------------------------------------------
// Leaderboard
// ---------------------------------------------------------------------------

export interface LeaderboardEntry {
  animal_id: string;
  name: string;
  species: string;
  breed: string | null;
  photo_url: string | null;
  canton: string | null;
  user_id: string;
  owner_name: string | null;
  owner_avatar: string | null;
  match_count: number;
  reel_count: number;
  total_likes: number;
  total_views: number;
  popularity_score: number;
}
