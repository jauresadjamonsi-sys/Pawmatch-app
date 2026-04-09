import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/reels — paginated feed (algorithmic or latest)
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const page = parseInt(request.nextUrl.searchParams.get("page") || "0", 10);
  const limit = 10;
  const offset = page * limit;
  const mode = request.nextUrl.searchParams.get("mode") || "latest"; // "latest" | "trending"

  let query = supabase
    .from("reels")
    .select("*, profiles:user_id(id, full_name, avatar_url), animals:animal_id(id, name, species, breed, photo_url)")
    .eq("status", "active");

  if (mode === "trending") {
    query = query.order("engagement_score", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data: reels, error } = await query.range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Check which reels the current user has liked
  let likedIds: Set<string> = new Set();
  let followingIds: Set<string> = new Set();

  if (user && reels && reels.length > 0) {
    const reelIds = reels.map((r: any) => r.id);
    const userIds = [...new Set(reels.map((r: any) => r.user_id))];

    const [likesRes, followRes] = await Promise.all([
      supabase.from("reel_likes").select("reel_id").eq("user_id", user.id).in("reel_id", reelIds),
      supabase.from("followers").select("following_id").eq("follower_id", user.id).in("following_id", userIds),
    ]);

    likedIds = new Set((likesRes.data || []).map((l: any) => l.reel_id));
    followingIds = new Set((followRes.data || []).map((f: any) => f.following_id));
  }

  const enriched = (reels || []).map((r: any) => ({
    ...r,
    is_liked: likedIds.has(r.id),
    is_following: followingIds.has(r.user_id),
  }));

  return NextResponse.json({ reels: enriched, page, hasMore: (reels || []).length === limit });
}

// POST /api/reels — create a new reel
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const body = await request.json();
  const { video_url, thumbnail_url, caption, hashtags, animal_id, duration_seconds } = body;

  if (!video_url) return NextResponse.json({ error: "video_url requis" }, { status: 400 });

  const { data, error } = await supabase.from("reels").insert({
    user_id: user.id,
    animal_id: animal_id || null,
    video_url,
    thumbnail_url: thumbnail_url || null,
    caption: caption || null,
    hashtags: hashtags || [],
    duration_seconds: duration_seconds || 0,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Award PawCoins for posting a reel
  const { data: profile } = await supabase.from("profiles").select("pawcoins").eq("id", user.id).single();
  const currentBalance = profile?.pawcoins ?? 0;
  const newBalance = currentBalance + 10;
  await Promise.all([
    supabase.from("profiles").update({ pawcoins: newBalance }).eq("id", user.id),
    supabase.from("pawcoin_transactions").insert({
      user_id: user.id,
      amount: 10,
      type: "reel_posted",
      description: "Reel publie",
      balance_after: newBalance,
      reference_id: data.id,
    }),
  ]);

  return NextResponse.json({ reel: data, coins_earned: 10 });
}
