-- Fix: Stories should be visible to ALL authenticated users (like Instagram)
-- The previous match-gated policy made stories nearly invisible

DROP POLICY IF EXISTS "Matched users or owner read non-expired stories" ON stories;

CREATE POLICY "Authenticated users read non-expired stories"
  ON stories FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND expires_at > now()
  );
