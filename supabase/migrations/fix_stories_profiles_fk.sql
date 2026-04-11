-- Add FK from stories.user_id to profiles.id so Supabase can resolve the join
-- This fixes the "Could not find a relationship between stories and profiles" error
-- The original FK points to auth.users, but queries need to join with profiles

-- First, add a FK constraint pointing to profiles (without dropping the auth.users FK)
-- This lets Supabase schema cache discover the relationship
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stories_user_id_profiles_fk'
  ) THEN
    ALTER TABLE stories
      ADD CONSTRAINT stories_user_id_profiles_fk
      FOREIGN KEY (user_id) REFERENCES profiles(id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;

-- NOT VALID skips checking existing rows (faster), the auth.users FK already ensures integrity
