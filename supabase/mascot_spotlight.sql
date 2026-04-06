-- ============================================
-- MASCOT SPOTLIGHT — Table + RLS
-- Run this in Supabase SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS mascot_spotlights (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  animal_id uuid NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  animal_name text NOT NULL,
  animal_photo text NOT NULL,
  owner_name text,
  plan text NOT NULL DEFAULT 'free',
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast active mascot lookup
CREATE INDEX IF NOT EXISTS idx_mascot_spotlights_expires
  ON mascot_spotlights (expires_at DESC);

-- Enable RLS
ALTER TABLE mascot_spotlights ENABLE ROW LEVEL SECURITY;

-- Anyone can read (homepage needs this without auth)
CREATE POLICY "mascot_spotlights_public_read"
  ON mascot_spotlights FOR SELECT
  USING (true);

-- Authenticated users can insert their own spotlights
CREATE POLICY "mascot_spotlights_insert_own"
  ON mascot_spotlights FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own spotlights (early cancel)
CREATE POLICY "mascot_spotlights_delete_own"
  ON mascot_spotlights FOR DELETE
  USING (auth.uid() = user_id);
