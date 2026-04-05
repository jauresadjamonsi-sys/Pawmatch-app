-- Typing indicators (ephemeral, short TTL)
CREATE TABLE IF NOT EXISTS typing_indicators (
  match_id uuid NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (match_id, user_id)
);
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see typing in their matches" ON typing_indicators FOR SELECT USING (true);
CREATE POLICY "Users update own typing" ON typing_indicators FOR ALL USING (auth.uid() = user_id);

-- Add image_url to messages if not exists
ALTER TABLE messages ADD COLUMN IF NOT EXISTS image_url text;
