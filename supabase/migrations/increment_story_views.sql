-- Atomic increment for story views_count to avoid race conditions
CREATE OR REPLACE FUNCTION increment_story_views(story_row_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE stories
  SET views_count = views_count + 1
  WHERE id = story_row_id;
$$;
