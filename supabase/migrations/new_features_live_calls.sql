-- ============================================
-- MIGRATION: Live Streams, Video Calls, Story Views, Smart Matching
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Live Streams
CREATE TABLE IF NOT EXISTS live_streams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  species_filter TEXT,
  thumbnail_url TEXT,
  viewer_count INTEGER DEFAULT 0,
  is_live BOOLEAN DEFAULT true,
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE live_streams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view live streams" ON live_streams FOR SELECT USING (true);
CREATE POLICY "Users can create their own streams" ON live_streams FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own streams" ON live_streams FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_live_streams_active ON live_streams(is_live, started_at DESC) WHERE is_live = true;

-- 2. Live Stream Chat Messages
CREATE TABLE IF NOT EXISTS live_chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_id UUID REFERENCES live_streams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE live_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read live chat" ON live_chat_messages FOR SELECT USING (true);
CREATE POLICY "Auth users can send live chat" ON live_chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. Story Views (track who viewed each story)
CREATE TABLE IF NOT EXISTS story_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE NOT NULL,
  viewer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  viewed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(story_id, viewer_id)
);

ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Story owners can see views" ON story_views FOR SELECT USING (
  EXISTS (SELECT 1 FROM stories WHERE id = story_id AND user_id = auth.uid())
  OR viewer_id = auth.uid()
);
CREATE POLICY "Auth users can record views" ON story_views FOR INSERT WITH CHECK (auth.uid() = viewer_id);

CREATE INDEX IF NOT EXISTS idx_story_views_story ON story_views(story_id);

-- 4. Story Replies
CREATE TABLE IF NOT EXISTS story_replies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE story_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Story owners see replies" ON story_replies FOR SELECT USING (
  EXISTS (SELECT 1 FROM stories WHERE id = story_id AND user_id = auth.uid())
  OR user_id = auth.uid()
);
CREATE POLICY "Auth users can reply" ON story_replies FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. Add columns to stories if missing
DO $$ BEGIN
  ALTER TABLE stories ADD COLUMN IF NOT EXISTS background_color TEXT DEFAULT '#1a1a2e';
  ALTER TABLE stories ADD COLUMN IF NOT EXISTS sticker TEXT;
  ALTER TABLE stories ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 5;
  ALTER TABLE stories ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 6. Video Call Signaling (for WebRTC)
CREATE TABLE IF NOT EXISTS call_signals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL,
  caller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  callee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  signal_type TEXT NOT NULL, -- 'offer', 'answer', 'ice-candidate', 'hangup'
  signal_data JSONB,
  status TEXT DEFAULT 'pending', -- pending, accepted, rejected, ended
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE call_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Call participants can view signals" ON call_signals FOR SELECT USING (
  auth.uid() = caller_id OR auth.uid() = callee_id
);
CREATE POLICY "Auth users can create signals" ON call_signals FOR INSERT WITH CHECK (auth.uid() = caller_id);
CREATE POLICY "Participants can update signals" ON call_signals FOR UPDATE USING (
  auth.uid() = caller_id OR auth.uid() = callee_id
);

-- 7. Matching preferences (for smart matching)
CREATE TABLE IF NOT EXISTS matching_preferences (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  preferred_species TEXT[] DEFAULT '{}',
  preferred_cantons TEXT[] DEFAULT '{}',
  age_min INTEGER,
  age_max INTEGER,
  activity_level TEXT, -- 'calm', 'moderate', 'active', 'very_active'
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE matching_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their prefs" ON matching_preferences FOR ALL USING (auth.uid() = user_id);

-- 8. Swipe history (for ML matching)
CREATE TABLE IF NOT EXISTS swipe_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  animal_id UUID NOT NULL,
  direction TEXT NOT NULL, -- 'left', 'right', 'super'
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE swipe_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own swipes" ON swipe_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can swipe" ON swipe_history FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_swipe_history_user ON swipe_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_swipe_history_animal ON swipe_history(animal_id);

-- 9. Message reactions (for chat)
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, user_id)
);

ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone in match can see reactions" ON message_reactions FOR SELECT USING (true);
CREATE POLICY "Auth users can react" ON message_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove own reactions" ON message_reactions FOR DELETE USING (auth.uid() = user_id);

-- 10. Add view_count increment function for stories
CREATE OR REPLACE FUNCTION increment_story_view(p_story_id UUID, p_viewer_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO story_views (story_id, viewer_id) VALUES (p_story_id, p_viewer_id)
  ON CONFLICT (story_id, viewer_id) DO NOTHING;

  UPDATE stories SET view_count = (
    SELECT COUNT(*) FROM story_views WHERE story_id = p_story_id
  ) WHERE id = p_story_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_stories_active ON stories(created_at DESC) WHERE expires_at > now();
CREATE INDEX IF NOT EXISTS idx_animals_species_canton ON animals(species, canton);
CREATE INDEX IF NOT EXISTS idx_reels_created ON reels(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reel_hashtags_tag ON reel_hashtags(tag);
