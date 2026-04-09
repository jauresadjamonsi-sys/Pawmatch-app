import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const targetId = request.nextUrl.searchParams.get("user_id");
  if (!targetId) return NextResponse.json({ error: "user_id required" }, { status: 400 });

  const [followersRes, followingRes, isFollowingRes] = await Promise.all([
    supabase.from("followers").select("*", { count: "exact", head: true }).eq("following_id", targetId),
    supabase.from("followers").select("*", { count: "exact", head: true }).eq("follower_id", targetId),
    user
      ? supabase.from("followers").select("id").eq("follower_id", user.id).eq("following_id", targetId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return NextResponse.json({
    followers_count: followersRes.count || 0,
    following_count: followingRes.count || 0,
    is_following: !!isFollowingRes.data,
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const body = await request.json();
  const targetId = body.following_id;
  if (!targetId) return NextResponse.json({ error: "following_id required" }, { status: 400 });
  if (targetId === user.id) return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });

  const { error } = await supabase.from("followers").insert({
    follower_id: user.id,
    following_id: targetId,
  });

  if (error) {
    if (error.code === "23505") return NextResponse.json({ message: "Already following" });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Followed" });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const targetId = request.nextUrl.searchParams.get("following_id");
  if (!targetId) return NextResponse.json({ error: "following_id required" }, { status: 400 });

  await supabase.from("followers").delete().eq("follower_id", user.id).eq("following_id", targetId);

  return NextResponse.json({ message: "Unfollowed" });
}
