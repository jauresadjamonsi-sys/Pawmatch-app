-- =============================================================================
-- PAWLY BIG LEAGUE EVOLUTION
-- New tables: followers, reels, super_flairs, pawcoins, reel_likes, reel_comments
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. FOLLOWERS — Social graph (Instagram-style)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS followers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  following_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (follower_id, following_id),
  CHECK (follower_id != following_id)
);

CREATE INDEX idx_followers_follower ON followers(follower_id);
CREATE INDEX idx_followers_following ON followers(following_id);
CREATE INDEX idx_followers_created ON followers(created_at DESC);

ALTER TABLE followers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users read followers"
  ON followers FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users follow others"
  ON followers FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users unfollow"
  ON followers FOR DELETE
  USING (auth.uid() = follower_id);

-- Add follower/following counts to profiles (materialized for performance)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS followers_count integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS following_count integer DEFAULT 0;

-- Trigger to auto-update counts
CREATE OR REPLACE FUNCTION update_follower_counts() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
    UPDATE profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles SET followers_count = GREATEST(0, followers_count - 1) WHERE id = OLD.following_id;
    UPDATE profiles SET following_count = GREATEST(0, following_count - 1) WHERE id = OLD.follower_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_follower_counts
  AFTER INSERT OR DELETE ON followers
  FOR EACH ROW EXECUTE FUNCTION update_follower_counts();

-- ---------------------------------------------------------------------------
-- 2. REELS — Short video content (TikTok/Instagram Reels)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS reels (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  animal_id uuid REFERENCES animals(id) ON DELETE SET NULL,
  video_url text NOT NULL,
  thumbnail_url text,
  caption text,
  hashtags text[] DEFAULT '{}',
  duration_seconds real DEFAULT 0,
  views_count integer DEFAULT 0,
  likes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  shares_count integer DEFAULT 0,
  -- Algorithmic scoring
  engagement_score real DEFAULT 0,
  is_featured boolean DEFAULT false,
  -- Moderation
  status text DEFAULT 'active' CHECK (status IN ('active', 'hidden', 'reported')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_reels_user ON reels(user_id);
CREATE INDEX idx_reels_animal ON reels(animal_id);
CREATE INDEX idx_reels_engagement ON reels(engagement_score DESC);
CREATE INDEX idx_reels_created ON reels(created_at DESC);
CREATE INDEX idx_reels_featured ON reels(is_featured) WHERE is_featured = true;
CREATE INDEX idx_reels_status ON reels(status) WHERE status = 'active';
CREATE INDEX idx_reels_hashtags ON reels USING gin(hashtags);

ALTER TABLE reels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads active reels"
  ON reels FOR SELECT
  USING (auth.role() = 'authenticated' AND status = 'active');

CREATE POLICY "Users create own reels"
  ON reels FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own reels"
  ON reels FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own reels"
  ON reels FOR DELETE
  USING (auth.uid() = user_id);

-- Reel likes
CREATE TABLE IF NOT EXISTS reel_likes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reel_id uuid REFERENCES reels(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (reel_id, user_id)
);

CREATE INDEX idx_reel_likes_reel ON reel_likes(reel_id);
CREATE INDEX idx_reel_likes_user ON reel_likes(user_id);

ALTER TABLE reel_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read reel likes"
  ON reel_likes FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users like reels"
  ON reel_likes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users unlike reels"
  ON reel_likes FOR DELETE USING (auth.uid() = user_id);

-- Trigger to update likes_count
CREATE OR REPLACE FUNCTION update_reel_likes_count() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE reels SET likes_count = likes_count + 1 WHERE id = NEW.reel_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE reels SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.reel_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_reel_likes_count
  AFTER INSERT OR DELETE ON reel_likes
  FOR EACH ROW EXECUTE FUNCTION update_reel_likes_count();

-- Reel comments
CREATE TABLE IF NOT EXISTS reel_comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reel_id uuid REFERENCES reels(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_reel_comments_reel ON reel_comments(reel_id);

ALTER TABLE reel_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read reel comments"
  ON reel_comments FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users create comments"
  ON reel_comments FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own comments"
  ON reel_comments FOR DELETE USING (auth.uid() = user_id);

-- Trigger to update comments_count
CREATE OR REPLACE FUNCTION update_reel_comments_count() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE reels SET comments_count = comments_count + 1 WHERE id = NEW.reel_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE reels SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.reel_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_reel_comments_count
  AFTER INSERT OR DELETE ON reel_comments
  FOR EACH ROW EXECUTE FUNCTION update_reel_comments_count();

-- ---------------------------------------------------------------------------
-- 3. SUPER FLAIRS — Enhanced super-likes with tracking
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS super_flairs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  receiver_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sender_animal_id uuid REFERENCES animals(id) ON DELETE CASCADE NOT NULL,
  receiver_animal_id uuid REFERENCES animals(id) ON DELETE CASCADE NOT NULL,
  match_id uuid REFERENCES matches(id) ON DELETE SET NULL,
  message text,
  seen boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_super_flairs_sender ON super_flairs(sender_user_id);
CREATE INDEX idx_super_flairs_receiver ON super_flairs(receiver_user_id);
CREATE INDEX idx_super_flairs_created ON super_flairs(created_at DESC);

ALTER TABLE super_flairs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own super flairs"
  ON super_flairs FOR SELECT
  USING (auth.uid() = sender_user_id OR auth.uid() = receiver_user_id);

CREATE POLICY "Users send super flairs"
  ON super_flairs FOR INSERT
  WITH CHECK (auth.uid() = sender_user_id);

CREATE POLICY "Receivers update super flairs"
  ON super_flairs FOR UPDATE
  USING (auth.uid() = receiver_user_id);

-- ---------------------------------------------------------------------------
-- 4. PAWCOINS — Virtual currency system
-- ---------------------------------------------------------------------------

-- Wallet
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pawcoins integer DEFAULT 50;

-- Transaction ledger
CREATE TABLE IF NOT EXISTS pawcoin_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount integer NOT NULL,
  type text NOT NULL CHECK (type IN (
    'welcome_bonus', 'daily_login', 'streak_bonus',
    'reel_posted', 'reel_liked', 'reel_viral',
    'match_made', 'super_flair_sent', 'super_flair_received',
    'boost_purchased', 'boost_used',
    'referral_bonus', 'challenge_completed',
    'purchase', 'admin_grant'
  )),
  description text,
  balance_after integer NOT NULL,
  reference_id uuid,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_pawcoin_tx_user ON pawcoin_transactions(user_id);
CREATE INDEX idx_pawcoin_tx_created ON pawcoin_transactions(created_at DESC);
CREATE INDEX idx_pawcoin_tx_type ON pawcoin_transactions(type);

ALTER TABLE pawcoin_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own transactions"
  ON pawcoin_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System inserts transactions"
  ON pawcoin_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 5. PROFILE BOOSTS — Temporary visibility boost
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS profile_boosts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  animal_id uuid REFERENCES animals(id) ON DELETE CASCADE NOT NULL,
  cost_pawcoins integer NOT NULL DEFAULT 20,
  started_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '30 minutes')
);

CREATE INDEX idx_boosts_expires ON profile_boosts(expires_at DESC);

ALTER TABLE profile_boosts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read active boosts"
  ON profile_boosts FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users create own boosts"
  ON profile_boosts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 6. ENGAGEMENT SCORING — Function to compute reel engagement
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION compute_engagement_score(
  p_views integer, p_likes integer, p_comments integer, p_shares integer,
  p_created_at timestamptz
) RETURNS real AS $$
DECLARE
  age_hours real;
  raw_score real;
  decay real;
BEGIN
  age_hours := EXTRACT(EPOCH FROM (now() - p_created_at)) / 3600.0;
  raw_score := (p_likes * 3.0) + (p_comments * 5.0) + (p_shares * 8.0) + (p_views * 0.1);
  -- Time decay: halve score every 24 hours
  decay := POWER(0.5, age_hours / 24.0);
  RETURN raw_score * decay;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Periodic refresh of engagement scores (call via cron)
CREATE OR REPLACE FUNCTION refresh_reel_engagement() RETURNS void AS $$
BEGIN
  UPDATE reels
  SET engagement_score = compute_engagement_score(views_count, likes_count, comments_count, shares_count, created_at),
      updated_at = now()
  WHERE status = 'active'
    AND created_at > now() - interval '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- 7. LEADERBOARD VIEW — Top animals by engagement
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW leaderboard AS
SELECT
  a.id AS animal_id,
  a.name,
  a.species,
  a.breed,
  a.photo_url,
  a.canton,
  a.created_by AS user_id,
  p.full_name AS owner_name,
  p.avatar_url AS owner_avatar,
  COALESCE(m.match_count, 0) AS match_count,
  COALESCE(r.reel_count, 0) AS reel_count,
  COALESCE(r.total_likes, 0) AS total_likes,
  COALESCE(r.total_views, 0) AS total_views,
  (COALESCE(m.match_count, 0) * 10 + COALESCE(r.total_likes, 0) * 3 + COALESCE(r.total_views, 0)) AS popularity_score
FROM animals a
JOIN profiles p ON p.id = a.created_by
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS match_count
  FROM matches
  WHERE (sender_animal_id = a.id OR receiver_animal_id = a.id)
    AND status = 'accepted'
) m ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS reel_count,
         COALESCE(SUM(likes_count), 0) AS total_likes,
         COALESCE(SUM(views_count), 0) AS total_views
  FROM reels
  WHERE animal_id = a.id AND status = 'active'
) r ON true
ORDER BY popularity_score DESC;
