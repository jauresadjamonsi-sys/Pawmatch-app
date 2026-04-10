-- ═══════ DAILY CHALLENGES SYSTEM ═══════

CREATE TABLE IF NOT EXISTS user_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  challenge_id TEXT NOT NULL,
  challenge_date DATE NOT NULL DEFAULT CURRENT_DATE,
  progress INT DEFAULT 0,
  target INT NOT NULL,
  reward INT NOT NULL,
  completed_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, challenge_id, challenge_date)
);

CREATE INDEX IF NOT EXISTS idx_user_challenges_user_date
  ON user_challenges(user_id, challenge_date);

-- RLS
ALTER TABLE user_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see own challenges"
  ON user_challenges FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own challenges"
  ON user_challenges FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own challenges"
  ON user_challenges FOR UPDATE USING (auth.uid() = user_id);
