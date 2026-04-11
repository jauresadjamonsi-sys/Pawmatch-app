DROP POLICY IF EXISTS "Users update own stories" ON stories;
CREATE POLICY "Users update own stories"
  ON stories FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
