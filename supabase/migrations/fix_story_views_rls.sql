-- Fix: story_views INSERT was still match-gated while stories are open to all
-- This caused 403 Forbidden on every story view

-- Drop old restrictive policies
DROP POLICY IF EXISTS "Matched users insert own views" ON story_views;
DROP POLICY IF EXISTS "Users insert own views" ON story_views;

-- Allow any authenticated user to record their own view
CREATE POLICY "Authenticated users insert own views"
  ON story_views FOR INSERT
  WITH CHECK (auth.uid() = viewer_id);

-- Also fix SELECT: story owner sees all views, viewer sees their own
DROP POLICY IF EXISTS "Story owner or viewer reads story views" ON story_views;
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
