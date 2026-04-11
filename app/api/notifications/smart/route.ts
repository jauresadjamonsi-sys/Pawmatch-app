import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const notifications: Array<{ type: string; title: string; body: string; emoji: string; priority: number }> = [];

  try {
    // 1. Check streak status
    const streakData = typeof global !== 'undefined' ? null : null; // Client-side only

    // 2. New matches in last 24h
    const dayAgo = new Date(Date.now() - 86400000).toISOString();
    const { count: newMatches } = await supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .gte("created_at", dayAgo);

    if (newMatches && newMatches > 0) {
      notifications.push({
        type: "match",
        title: "Nouveaux matchs !",
        body: `${newMatches} nouveau${newMatches > 1 ? "x" : ""} match${newMatches > 1 ? "s" : ""} t'attend${newMatches > 1 ? "ent" : ""}`,
        emoji: "\uD83D\uDC9B",
        priority: 9,
      });
    }

    // 3. Unread messages
    const { count: unreadMsgs } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("receiver_id", user.id)
      .eq("read", false);

    if (unreadMsgs && unreadMsgs > 0) {
      notifications.push({
        type: "message",
        title: "Messages non lus",
        body: `${unreadMsgs} message${unreadMsgs > 1 ? "s" : ""} en attente`,
        emoji: "\uD83D\uDCAC",
        priority: 8,
      });
    }

    // 4. New animals in user's canton (weekly)
    const { data: profile } = await supabase.from("profiles").select("city").eq("id", user.id).single();
    if (profile?.city) {
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const { count: newAnimals } = await supabase
        .from("animals")
        .select("id", { count: "exact", head: true })
        .gte("created_at", weekAgo);

      if (newAnimals && newAnimals > 0) {
        notifications.push({
          type: "discovery",
          title: "Nouveaux arrivants !",
          body: `${newAnimals} nouveau${newAnimals > 1 ? "x" : ""} anima${newAnimals > 1 ? "ux" : "l"} cette semaine`,
          emoji: "\uD83D\uDC3E",
          priority: 5,
        });
      }
    }

    // 5. Profile completion reminder
    const { data: prof } = await supabase.from("profiles").select("full_name, avatar_url, bio, city").eq("id", user.id).single();
    if (prof) {
      const fields = [prof.full_name, prof.avatar_url, prof.bio, prof.city];
      const complete = fields.filter(Boolean).length;
      if (complete < 4) {
        notifications.push({
          type: "profile",
          title: "Complete ton profil",
          body: `Ton profil est a ${Math.round(complete/4*100)}% — complete-le pour plus de matchs`,
          emoji: "\u2728",
          priority: 3,
        });
      }
    }

    // 6. Content suggestion
    const weekAgo2 = new Date(Date.now() - 7 * 86400000).toISOString();
    const { count: userReels } = await supabase
      .from("reels")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", weekAgo2);

    if (!userReels || userReels === 0) {
      notifications.push({
        type: "content",
        title: "Partage un moment",
        body: "Poste un reel ou une story pour gagner des PawCoins",
        emoji: "\uD83D\uDCF8",
        priority: 4,
      });
    }

  } catch (e) {
    console.error("[smart-notif]", e);
  }

  // Sort by priority (highest first)
  notifications.sort((a, b) => b.priority - a.priority);

  return NextResponse.json({ notifications: notifications.slice(0, 5) });
}
