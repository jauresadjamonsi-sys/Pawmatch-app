import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const VALID_EMOJIS = ["paw", "heart", "laugh", "wow", "sad"];

// GET /api/reels/[id]/reactions
// Returns counts per emoji + which emojis the current user has reacted with
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: reelId } = await params;
  const supabase = await createClient();

  // Get current user (optional — guests can view counts)
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch all reactions for this reel
  const { data: reactions, error } = await supabase
    .from("reel_reactions")
    .select("emoji, user_id")
    .eq("reel_id", reelId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Build counts
  const counts: Record<string, number> = { paw: 0, heart: 0, laugh: 0, wow: 0, sad: 0 };
  const userReactions: string[] = [];

  for (const r of reactions || []) {
    if (counts[r.emoji] !== undefined) {
      counts[r.emoji]++;
    }
    if (user && r.user_id === user.id) {
      userReactions.push(r.emoji);
    }
  }

  return NextResponse.json({ ...counts, userReactions });
}

// POST /api/reels/[id]/reactions
// Toggle a reaction: add if not exists, remove if exists
// Body: { emoji: "paw" }
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: reelId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const body = await request.json();
  const emoji = body.emoji;
  if (!emoji || !VALID_EMOJIS.includes(emoji)) {
    return NextResponse.json({ error: "Emoji invalide" }, { status: 400 });
  }

  // Check if reaction already exists
  const { data: existing } = await supabase
    .from("reel_reactions")
    .select("id")
    .eq("reel_id", reelId)
    .eq("user_id", user.id)
    .eq("emoji", emoji)
    .maybeSingle();

  if (existing) {
    // Remove reaction
    const { error } = await supabase
      .from("reel_reactions")
      .delete()
      .eq("id", existing.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ action: "removed", emoji });
  } else {
    // Add reaction
    const { error } = await supabase
      .from("reel_reactions")
      .insert({ reel_id: reelId, user_id: user.id, emoji });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Notify reel owner
    const { data: reel } = await supabase.from("reels").select("user_id").eq("id", reelId).single();
    if (reel && reel.user_id !== user.id) {
      await supabase.from("notifications").insert({
        user_id: reel.user_id,
        type: "message",
        title: "Nouvelle reaction",
        body: `Quelqu'un a reagi avec ${emoji} a ton reel`,
        link: "/reels",
      }).catch(() => {});
    }

    return NextResponse.json({ action: "added", emoji });
  }
}
