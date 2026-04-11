-- Matching preferences table
CREATE TABLE IF NOT EXISTS matching_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  preferred_species TEXT[] DEFAULT '{}',
  preferred_energy TEXT DEFAULT 'any',
  max_distance_km INTEGER DEFAULT 50,
  min_age_months INTEGER DEFAULT 0,
  max_age_months INTEGER DEFAULT 240,
  preferred_size TEXT DEFAULT 'any',
  sociability_min INTEGER DEFAULT 1,
  show_verified_only BOOLEAN DEFAULT false,
  canton TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE matching_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own preferences" ON matching_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_matching_prefs_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_matching_prefs_timestamp
  BEFORE UPDATE ON matching_preferences
  FOR EACH ROW EXECUTE FUNCTION update_matching_prefs_timestamp();
