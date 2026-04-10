import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getDailyChallenges, getWeeklyChallenge } from "@/lib/services/challenges";

export const dynamic = "force-dynamic";

// GET — return today's challenges with user progress
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ daily: [], weekly: null });

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const startOfDay = `${todayStr}T00:00:00Z`;
  const startOfWeek = new Date(today.getTime() - today.getDay() * 86400000).toISOString().split("T")[0] + "T00:00:00Z";

  const daily = getDailyChallenges(today);
  const weekly = getWeeklyChallenge(today);

  // Fetch actual progress from various tables in parallel
  const [reelsToday, storiesToday, swipesToday, matchesToday, commentsToday, likesToday, claimedRes] = await Promise.all([
    supabase.from("reels").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", startOfDay).then(r => r.count || 0).catch(() => 0),
    supabase.from("stories").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", startOfDay).then(r => r.count || 0).catch(() => 0),
    supabase.from("swipe_history").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", startOfDay).then(r => r.count || 0).catch(() => 0),
    supabase.from("matches").select("id", { count: "exact", head: true }).or(`sender_user_id.eq.${user.id},receiver_user_id.eq.${user.id}`).gte("created_at", startOfDay).then(r => r.count || 0).catch(() => 0),
    supabase.from("reel_comments").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", startOfDay).then(r => r.count || 0).catch(() => 0),
    supabase.from("reel_likes").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", startOfDay).then(r => r.count || 0).catch(() => 0),
    supabase.from("user_challenges").select("challenge_id, claimed_at").eq("user_id", user.id).gte("challenge_date", todayStr).catch(() => ({ data: [] })),
  ]);

  const claimed = new Set((claimedRes.data || []).filter((c: any) => c.claimed_at).map((c: any) => c.challenge_id));

  // Map challenge type to actual progress
  const progressMap: Record<string, number> = {
    post_reel: reelsToday as number,
    post_story: storiesToday as number,
    send_flair: swipesToday as number,
    make_match: matchesToday as number,
    comment_reel: commentsToday as number,
    like_reels: likesToday as number,
    visit_feed: 1, // If they're calling this API, they're on the app
    explore_page: 0,
    share_profile: 0,
    join_group: 0,
    add_animal_photo: 0,
  };

  const enrichedDaily = daily.map(ch => {
    const progress = progressMap[ch.type] || 0;
    return {
      ...ch,
      progress: Math.min(progress, ch.target),
      completed: progress >= ch.target,
      claimed: claimed.has(ch.id),
    };
  });

  // Weekly progress (reels this week for the weekly challenge)
  const [reelsWeek] = await Promise.all([
    supabase.from("reels").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", startOfWeek).then(r => r.count || 0).catch(() => 0),
  ]);

  const weeklyProgress = progressMap[weekly.type] !== undefined ? (reelsWeek as number) : 0;
  const enrichedWeekly = {
    ...weekly,
    progress: Math.min(weeklyProgress, weekly.target),
    completed: weeklyProgress >= weekly.target,
    claimed: claimed.has(weekly.id),
  };

  return NextResponse.json({ daily: enrichedDaily, weekly: enrichedWeekly });
}

// POST — claim a completed challenge reward
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const { challengeId } = await request.json();
  if (!challengeId) return NextResponse.json({ error: "challengeId requis" }, { status: 400 });

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  // Find the challenge
  const allChallenges = [...getDailyChallenges(today), getWeeklyChallenge(today)];
  const challenge = allChallenges.find(c => c.id === challengeId);
  if (!challenge) return NextResponse.json({ error: "Defi invalide" }, { status: 400 });

  // Check if already claimed
  const { data: existing } = await supabase
    .from("user_challenges")
    .select("id, claimed_at")
    .eq("user_id", user.id)
    .eq("challenge_id", challengeId)
    .eq("challenge_date", todayStr)
    .maybeSingle();

  if (existing?.claimed_at) return NextResponse.json({ error: "Deja reclame" }, { status: 400 });

  // Award PawCoins
  const { data: profile } = await supabase.from("profiles").select("pawcoins").eq("id", user.id).single();
  const currentBalance = profile?.pawcoins ?? 0;
  const newBalance = currentBalance + challenge.reward;

  await Promise.all([
    supabase.from("profiles").update({ pawcoins: newBalance }).eq("id", user.id),
    supabase.from("pawcoin_transactions").insert({
      user_id: user.id,
      amount: challenge.reward,
      type: "challenge",
      description: `Defi: ${challenge.title}`,
      balance_after: newBalance,
    }).catch(() => {}),
    existing
      ? supabase.from("user_challenges").update({ claimed_at: new Date().toISOString() }).eq("id", existing.id)
      : supabase.from("user_challenges").insert({
          user_id: user.id,
          challenge_id: challengeId,
          challenge_date: todayStr,
          progress: challenge.target,
          target: challenge.target,
          reward: challenge.reward,
          completed_at: new Date().toISOString(),
          claimed_at: new Date().toISOString(),
        }).catch(() => {}),
  ]);

  return NextResponse.json({ success: true, reward: challenge.reward, newBalance });
}
