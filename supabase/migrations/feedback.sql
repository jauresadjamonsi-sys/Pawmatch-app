CREATE TABLE IF NOT EXISTS feedback (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email text,
  user_name text,
  type text NOT NULL CHECK (type IN ('bug', 'suggestion', 'feature', 'complaint', 'praise')),
  category text,
  title text NOT NULL,
  description text NOT NULL,
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status text DEFAULT 'new' CHECK (status IN ('new', 'read', 'in_progress', 'done', 'rejected')),
  admin_notes text,
  page_url text,
  device text,
  app_source text DEFAULT 'pawly',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_feedback_status ON feedback(status);
CREATE INDEX idx_feedback_type ON feedback(type);
CREATE INDEX idx_feedback_created ON feedback(created_at DESC);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert feedback" ON feedback FOR INSERT WITH CHECK (true);
CREATE POLICY "Users read own feedback" ON feedback FOR SELECT USING (auth.uid() = user_id);
