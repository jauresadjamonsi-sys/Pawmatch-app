-- ============================================================
-- STORIES ENHANCED: Reactions + Match-gated visibility
-- ============================================================

-- 1. Helper function: check if two users are matched
CREATE OR REPLACE FUNCTION are_matched(user_a uuid, user_b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM matches
    WHERE status = 'accepted'
    AND (
      (sender_user_id = user_a AND receiver_user_id = user_b)
      OR
      (sender_user_id = user_b AND receiver_user_id = user_a)
    )
  );
$$;

-- 2. Replace stories SELECT policy: only matched users + self
DROP POLICY IF EXISTS "Authenticated users read non-expired stories" ON stories;

CREATE POLICY "Matched users or owner read non-expired stories"
  ON stories FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND expires_at > now()
    AND (
      auth.uid() = user_id
      OR are_matched(auth.uid(), user_id)
    )
  );

-- 3. Update story_views policies
DROP POLICY IF EXISTS "Authenticated users read story views" ON story_views;

CREATE POLICY "Story owner or viewer reads story views"
  ON story_views FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND (
      viewer_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM stories
        WHERE stories.id = story_views.story_id
        AND stories.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users insert own views" ON story_views;

CREATE POLICY "Matched users insert own views"
  ON story_views FOR INSERT
  WITH CHECK (
    auth.uid() = viewer_id
    AND EXISTS (
      SELECT 1 FROM stories
      WHERE stories.id = story_views.story_id
      AND (
        stories.user_id = auth.uid()
        OR are_matched(auth.uid(), stories.user_id)
      )
    )
  );

-- 4. Create story_reactions table
CREATE TABLE IF NOT EXISTS story_reactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id uuid REFERENCES stories(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  emoji text NOT NULL DEFAULT '❤️',
  created_at timestamptz DEFAULT now(),
  UNIQUE (story_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_story_reactions_story ON story_reactions(story_id);
CREATE INDEX IF NOT EXISTS idx_story_reactions_user ON story_reactions(user_id);

ALTER TABLE story_reactions ENABLE ROW LEVEL SECURITY;

-- Story poster sees all reactions on their stories; reactors see their own
CREATE POLICY "Story owner or reactor reads reactions"
  ON story_reactions FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM stories
        WHERE stories.id = story_reactions.story_id
        AND stories.user_id = auth.uid()
      )
    )
  );

-- Only matched users can react
CREATE POLICY "Matched users insert own reactions"
  ON story_reactions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM stories
      WHERE stories.id = story_reactions.story_id
      AND are_matched(auth.uid(), stories.user_id)
    )
  );

-- Users can update their own reaction (change emoji)
CREATE POLICY "Users update own reactions"
  ON story_reactions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own reaction
CREATE POLICY "Users delete own reactions"
  ON story_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Performance indexes for matches lookups
CREATE INDEX IF NOT EXISTS idx_matches_accepted_sender ON matches(sender_user_id, status) WHERE status = 'accepted';
CREATE INDEX IF NOT EXISTS idx_matches_accepted_receiver ON matches(receiver_user_id, status) WHERE status = 'accepted';
