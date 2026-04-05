-- Track user online presence
CREATE TABLE IF NOT EXISTS user_presence (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  last_seen timestamptz DEFAULT now(),
  is_online boolean DEFAULT false
);
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can see presence" ON user_presence FOR SELECT USING (true);
CREATE POLICY "Users update own presence" ON user_presence FOR ALL USING (auth.uid() = user_id);

-- Function to check if user is online (seen in last 5 minutes)
CREATE OR REPLACE FUNCTION is_user_online(uid uuid) RETURNS boolean AS $$
  SELECT EXISTS(
    SELECT 1 FROM user_presence
    WHERE user_id = uid AND last_seen > now() - interval '5 minutes'
  );
$$ LANGUAGE sql STABLE;
