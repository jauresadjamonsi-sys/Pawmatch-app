import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Compute score from multiple signals (handle missing tables gracefully)
  let profileScore = 0, activityScore = 0, socialScore = 0, streakScore = 0, contentScore = 0;

  try {
    // 1. Profile completeness (0-25 pts)
    const { data: profile } = await supabase.from("profiles").select("full_name, avatar_url, city, bio").eq("id", user.id).single();
    if (profile) {
      if (profile.full_name) profileScore += 7;
      if (profile.avatar_url) profileScore += 8;
      if (profile.city) profileScore += 5;
      if (profile.bio) profileScore += 5;
    }

    // 2. Animals registered (0-15 pts)
    const { count: animalCount } = await supabase.from("animals").select("id", { count: "exact", head: true }).eq("owner_id", user.id);
    profileScore += Math.min((animalCount || 0) * 5, 15);
  } catch {}

  try {
    // 3. Recent activity - last 7 days (0-20 pts)
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const { count: reelCount } = await supabase.from("reels").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", weekAgo);
    contentScore += Math.min((reelCount || 0) * 5, 15);

    // Stories posted
    const { count: storyCount } = await supabase.from("stories").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", weekAgo);
    contentScore += Math.min((storyCount || 0) * 3, 5);
  } catch {}

  try {
    // 4. Social interactions (0-25 pts)
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const { count: matchCount } = await supabase.from("matches").select("id", { count: "exact", head: true }).or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);
    socialScore += Math.min((matchCount || 0) * 3, 15);

    // Messages sent
    const { count: msgCount } = await supabase.from("messages").select("id", { count: "exact", head: true }).eq("sender_id", user.id).gte("created_at", weekAgo);
    socialScore += Math.min((msgCount || 0), 10);
  } catch {}

  try {
    // 5. Streak bonus (0-15 pts)
    // Check localStorage-synced streak from pawscore_streak or compute from activity
    const { data: recentDays } = await supabase.from("reels").select("created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30);

    let streak = 0;
    if (recentDays && recentDays.length > 0) {
      const days = new Set(recentDays.map((r: any) => new Date(r.created_at).toISOString().split("T")[0]));
      const today = new Date().toISOString().split("T")[0];
      let checkDate = new Date();
      for (let i = 0; i < 30; i++) {
        const dateStr = checkDate.toISOString().split("T")[0];
        if (days.has(dateStr)) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else if (dateStr !== today) {
          break;
        } else {
          checkDate.setDate(checkDate.getDate() - 1);
        }
      }
    }
    streakScore = Math.min(streak * 3, 15);
  } catch {}

  const totalScore = profileScore + activityScore + socialScore + streakScore + contentScore;
  const maxScore = 100;
  const score = Math.min(totalScore, maxScore);

  // Determine level
  let level = "Bronze";
  let levelEmoji = "🥉";
  if (score >= 80) { level = "Diamant"; levelEmoji = "💎"; }
  else if (score >= 60) { level = "Or"; levelEmoji = "🥇"; }
  else if (score >= 40) { level = "Argent"; levelEmoji = "🥈"; }

  return NextResponse.json({
    score,
    level,
    levelEmoji,
    breakdown: {
      profile: profileScore,
      content: contentScore,
      social: socialScore,
      streak: streakScore,
    },
    streak: Math.floor(streakScore / 3),
    maxScore,
  });
}
