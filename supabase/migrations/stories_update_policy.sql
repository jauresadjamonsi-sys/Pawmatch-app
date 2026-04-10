CREATE POLICY "Users update own stories"
  ON stories FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
