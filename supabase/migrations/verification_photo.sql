-- ═══════════════════════════════════════════════
-- VERIFICATION PHOTO: photo obligatoire maitre + animal
-- ═══════════════════════════════════════════════

-- Ajouter les colonnes de verification au profil
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_photo_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'submitted', 'approved', 'rejected'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_note TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_submitted_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_reviewed_at TIMESTAMPTZ;

-- Index pour l'admin
CREATE INDEX IF NOT EXISTS idx_profiles_verification ON profiles(verification_status);

-- RLS: users can update their own verification photo
-- (existing profiles RLS should cover this, but let's be explicit)
