import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const secret = new URL(req.url).searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use the Supabase database URL (session pooler)
  const dbUrl = process.env.DATABASE_URL
    || process.env.SUPABASE_DB_URL
    || process.env.PAWLY_SUPABASE_URL;

  if (!dbUrl || !dbUrl.startsWith("postgresql")) {
    // Fallback: construct from project ref + password
    return NextResponse.json({
      error: "No DATABASE_URL found. Set DATABASE_URL on Vercel.",
      hint: "Format: postgresql://postgres.[ref]:[password]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres",
      available_vars: {
        DATABASE_URL: !!process.env.DATABASE_URL,
        SUPABASE_DB_URL: !!process.env.SUPABASE_DB_URL,
        PAWLY_SUPABASE_URL: process.env.PAWLY_SUPABASE_URL?.slice(0, 30) || false,
      }
    }, { status: 400 });
  }

  const { Pool } = require("pg");
  const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

  const results: string[] = [];

  const queries = [
    // 1. Create are_matched function
    `CREATE OR REPLACE FUNCTION are_matched(user_a uuid, user_b uuid)
     RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
     AS $$ SELECT EXISTS (
       SELECT 1 FROM matches WHERE status = 'accepted'
       AND ((sender_user_id = user_a AND receiver_user_id = user_b)
         OR (sender_user_id = user_b AND receiver_user_id = user_a))
     ); $$;`,

    // 2-3. Stories SELECT policy
    `DROP POLICY IF EXISTS "Authenticated users read non-expired stories" ON stories;`,
    `DROP POLICY IF EXISTS "Matched users or owner read non-expired stories" ON stories;`,
    `CREATE POLICY "Matched users or owner read non-expired stories"
     ON stories FOR SELECT USING (
       auth.role() = 'authenticated' AND expires_at > now()
       AND (auth.uid() = user_id OR are_matched(auth.uid(), user_id)));`,

    // 4-5. story_views policies
    `DROP POLICY IF EXISTS "Authenticated users read story views" ON story_views;`,
    `DROP POLICY IF EXISTS "Story owner or viewer reads story views" ON story_views;`,
    `CREATE POLICY "Story owner or viewer reads story views"
     ON story_views FOR SELECT USING (
       auth.role() = 'authenticated'
       AND (viewer_id = auth.uid()
         OR EXISTS (SELECT 1 FROM stories WHERE stories.id = story_views.story_id AND stories.user_id = auth.uid())));`,

    `DROP POLICY IF EXISTS "Users insert own views" ON story_views;`,
    `DROP POLICY IF EXISTS "Matched users insert own views" ON story_views;`,
    `CREATE POLICY "Matched users insert own views"
     ON story_views FOR INSERT WITH CHECK (
       auth.uid() = viewer_id
       AND EXISTS (SELECT 1 FROM stories WHERE stories.id = story_views.story_id
         AND (stories.user_id = auth.uid() OR are_matched(auth.uid(), stories.user_id))));`,

    // 6. Create story_reactions table
    `CREATE TABLE IF NOT EXISTS story_reactions (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      story_id uuid REFERENCES stories(id) ON DELETE CASCADE NOT NULL,
      user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
      emoji text NOT NULL DEFAULT '❤️',
      created_at timestamptz DEFAULT now(),
      UNIQUE (story_id, user_id));`,

    `CREATE INDEX IF NOT EXISTS idx_story_reactions_story ON story_reactions(story_id);`,
    `CREATE INDEX IF NOT EXISTS idx_story_reactions_user ON story_reactions(user_id);`,
    `ALTER TABLE story_reactions ENABLE ROW LEVEL SECURITY;`,

    // 7. Reactions policies
    `DROP POLICY IF EXISTS "Story owner or reactor reads reactions" ON story_reactions;`,
    `CREATE POLICY "Story owner or reactor reads reactions"
     ON story_reactions FOR SELECT USING (
       auth.role() = 'authenticated'
       AND (user_id = auth.uid()
         OR EXISTS (SELECT 1 FROM stories WHERE stories.id = story_reactions.story_id AND stories.user_id = auth.uid())));`,

    `DROP POLICY IF EXISTS "Matched users insert own reactions" ON story_reactions;`,
    `CREATE POLICY "Matched users insert own reactions"
     ON story_reactions FOR INSERT WITH CHECK (
       auth.uid() = user_id
       AND EXISTS (SELECT 1 FROM stories WHERE stories.id = story_reactions.story_id
         AND are_matched(auth.uid(), stories.user_id)));`,

    `DROP POLICY IF EXISTS "Users update own reactions" ON story_reactions;`,
    `CREATE POLICY "Users update own reactions"
     ON story_reactions FOR UPDATE
     USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);`,

    `DROP POLICY IF EXISTS "Users delete own reactions" ON story_reactions;`,
    `CREATE POLICY "Users delete own reactions"
     ON story_reactions FOR DELETE USING (auth.uid() = user_id);`,

    // 8. Performance indexes
    `CREATE INDEX IF NOT EXISTS idx_matches_accepted_sender ON matches(sender_user_id, status) WHERE status = 'accepted';`,
    `CREATE INDEX IF NOT EXISTS idx_matches_accepted_receiver ON matches(receiver_user_id, status) WHERE status = 'accepted';`,
  ];

  for (const sql of queries) {
    try {
      await pool.query(sql);
      results.push(`OK: ${sql.slice(0, 80).replace(/\n/g, ' ')}...`);
    } catch (err: any) {
      results.push(`ERR: ${sql.slice(0, 50).replace(/\n/g, ' ')}... → ${err.message}`);
    }
  }

  await pool.end();
  return NextResponse.json({ success: true, results });
}
