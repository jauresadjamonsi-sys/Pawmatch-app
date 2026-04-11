-- ═══════ ENGAGEMENT TRACKING ═══════
-- Track which engagement notifications were sent to avoid spam

CREATE TABLE IF NOT EXISTS engagement_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  trigger_type TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now()
);

-- Separate date column for unique daily constraint (timestamptz::date is not immutable)
ALTER TABLE engagement_log ADD COLUMN IF NOT EXISTS sent_date DATE DEFAULT CURRENT_DATE;

-- One notification per type per user per day
CREATE UNIQUE INDEX IF NOT EXISTS idx_engagement_unique_daily
  ON engagement_log(user_id, trigger_type, sent_date);

CREATE INDEX IF NOT EXISTS idx_engagement_log_user
  ON engagement_log(user_id, sent_at DESC);

-- Add last_active_at to profiles if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'last_active_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN last_active_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_last_active
  ON profiles(last_active_at)
  WHERE last_active_at IS NOT NULL;
