-- ═══════ VISIT COUNTER ═══════
-- Track site visits for PawBand ecosystem apps

-- Table
CREATE TABLE IF NOT EXISTS site_stats (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  site_name TEXT NOT NULL UNIQUE,
  visit_count BIGINT NOT NULL DEFAULT 0,
  last_visited TIMESTAMPTZ DEFAULT now()
);

-- Seed rows
INSERT INTO site_stats (site_name, visit_count)
VALUES
  ('pawlyapp', 0),
  ('pawdirectory', 0)
ON CONFLICT (site_name) DO NOTHING;

-- Atomic increment function
CREATE OR REPLACE FUNCTION increment_visit(p_site TEXT)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_count BIGINT;
BEGIN
  UPDATE site_stats
    SET visit_count = visit_count + 1,
        last_visited = now()
    WHERE site_name = p_site
    RETURNING visit_count INTO new_count;

  -- If no row was updated, insert one
  IF new_count IS NULL THEN
    INSERT INTO site_stats (site_name, visit_count, last_visited)
    VALUES (p_site, 1, now())
    ON CONFLICT (site_name) DO UPDATE
      SET visit_count = site_stats.visit_count + 1,
          last_visited = now()
    RETURNING visit_count INTO new_count;
  END IF;

  RETURN new_count;
END;
$$;

-- RLS
ALTER TABLE site_stats ENABLE ROW LEVEL SECURITY;

-- Anyone can read visit counts (public stats)
CREATE POLICY "Anyone can read site_stats"
  ON site_stats FOR SELECT
  USING (true);

-- Only service role / functions can update (handled by SECURITY DEFINER on increment_visit)
-- No direct INSERT/UPDATE/DELETE for anon users
CREATE POLICY "No direct writes on site_stats"
  ON site_stats FOR ALL
  USING (false)
  WITH CHECK (false);

-- Grant execute on the increment function to anon and authenticated
GRANT EXECUTE ON FUNCTION increment_visit(TEXT) TO anon, authenticated;
