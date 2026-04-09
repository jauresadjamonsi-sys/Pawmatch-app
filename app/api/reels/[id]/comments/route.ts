import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/reels/[id]/comments
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: reelId } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("reel_comments")
    .select("*, profiles:user_id(id, full_name, avatar_url)")
    .eq("reel_id", reelId)
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ comments: data || [] });
}

// POST /api/reels/[id]/comments
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: reelId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const body = await request.json();
  const content = (body.content || "").trim();
  if (!content) return NextResponse.json({ error: "Commentaire vide" }, { status: 400 });
  if (content.length > 500) return NextResponse.json({ error: "Commentaire trop long (max 500)" }, { status: 400 });

  const { data, error } = await supabase.from("reel_comments").insert({
    reel_id: reelId,
    user_id: user.id,
    content,
  }).select("*, profiles:user_id(id, full_name, avatar_url)").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ comment: data });
}
