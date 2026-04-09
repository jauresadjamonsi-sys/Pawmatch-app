import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// POST /api/reels/[id]/like — toggle like
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: reelId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  // Check if already liked
  const { data: existing } = await supabase
    .from("reel_likes")
    .select("id")
    .eq("reel_id", reelId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    // Unlike
    await supabase.from("reel_likes").delete().eq("id", existing.id);
    return NextResponse.json({ liked: false });
  }

  // Like
  const { error } = await supabase.from("reel_likes").insert({
    reel_id: reelId,
    user_id: user.id,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ liked: true });
}
