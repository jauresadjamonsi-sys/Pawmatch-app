-- Stories table
CREATE TABLE IF NOT EXISTS stories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  animal_id uuid REFERENCES animals(id) ON DELETE SET NULL,
  image_url text,
  media_url text,
  media_type text DEFAULT 'text',
  caption text,
  text_overlay text,
  text_style jsonb,
  template text NOT NULL DEFAULT 'custom',
  bg_gradient text,
  text_color text DEFAULT '#ffffff',
  sticker text,
  views_count integer DEFAULT 0,
  expires_at timestamptz DEFAULT (now() + interval '24 hours'),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_stories_user ON stories(user_id);
CREATE INDEX idx_stories_expires ON stories(expires_at);
CREATE INDEX idx_stories_created ON stories(created_at DESC);

ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users read non-expired stories"
  ON stories FOR SELECT
  USING (auth.role() = 'authenticated' AND expires_at > now());

CREATE POLICY "Users create own stories"
  ON stories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own stories"
  ON stories FOR DELETE
  USING (auth.uid() = user_id);

-- Story views table
CREATE TABLE IF NOT EXISTS story_views (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id uuid REFERENCES stories(id) ON DELETE CASCADE NOT NULL,
  viewer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  viewed_at timestamptz DEFAULT now(),
  UNIQUE (story_id, viewer_id)
);

CREATE INDEX idx_story_views_story ON story_views(story_id);
CREATE INDEX idx_story_views_viewer ON story_views(viewer_id);

ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users read story views"
  ON story_views FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users insert own views"
  ON story_views FOR INSERT
  WITH CHECK (auth.uid() = viewer_id);
