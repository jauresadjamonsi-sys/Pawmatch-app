-- =============================================================================
-- Pet Health Records — vaccinations, vet visits, medication, weight log
-- =============================================================================

-- Pet health records
CREATE TABLE IF NOT EXISTS animal_health_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id UUID NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('vaccine', 'vet_visit', 'medication', 'weight', 'allergy', 'note')),
  title TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  next_due DATE,
  value NUMERIC, -- for weight in kg
  unit TEXT, -- kg, mg, etc
  recurring BOOLEAN DEFAULT false,
  recurring_interval_days INT, -- e.g. 365 for annual vaccine
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'missed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_health_records_animal ON animal_health_records(animal_id, type, date DESC);
CREATE INDEX IF NOT EXISTS idx_health_records_due ON animal_health_records(next_due) WHERE next_due IS NOT NULL AND status = 'active';
CREATE INDEX IF NOT EXISTS idx_health_records_user ON animal_health_records(user_id);

-- Row Level Security
ALTER TABLE animal_health_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own animal health records" ON animal_health_records
  FOR ALL USING (auth.uid() = user_id);
