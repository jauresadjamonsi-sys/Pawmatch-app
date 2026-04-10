-- Emoji reactions on reels (extends beyond simple likes)
CREATE TABLE IF NOT EXISTS reel_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reel_id UUID NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL CHECK (emoji IN ('paw', 'heart', 'laugh', 'wow', 'sad')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(reel_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_reel_reactions_reel ON reel_reactions(reel_id);
CREATE INDEX IF NOT EXISTS idx_reel_reactions_user ON reel_reactions(user_id);

-- RLS
ALTER TABLE reel_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can see reactions" ON reel_reactions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can react" ON reel_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove own reactions" ON reel_reactions FOR DELETE USING (auth.uid() = user_id);
