import { createAdminClient } from "@/lib/supabase/admin";
import { renderTemplate, type EngagementTrigger } from "@/lib/services/engagement";
import { NextResponse } from "next/server";

// Vercel Cron: runs at 9:00 (match du jour), 18:00 (streak warning), 21:00 (last chance)
export const dynamic = "force-dynamic";
export const maxDuration = 30;

async function sendNotification(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  trigger: EngagementTrigger,
  vars: Record<string, string | number>
) {
  // Check if already sent today to avoid spam
  const today = new Date().toISOString().split("T")[0];
  const { data: existing } = await supabase
    .from("engagement_log")
    .select("id")
    .eq("user_id", userId)
    .eq("trigger_type", trigger)
    .gte("sent_at", `${today}T00:00:00Z`)
    .limit(1);

  if (existing && existing.length > 0) return; // Already sent today

  const { title, body, link } = renderTemplate(trigger, vars);

  // Insert notification + engagement log in parallel
  await Promise.all([
    supabase.from("notifications").insert({
      user_id: userId,
      type: "system",
      title,
      body,
      link,
    }),
    supabase.from("engagement_log").insert({
      user_id: userId,
      trigger_type: trigger,
    }).catch(() => {}), // Table may not exist yet
  ]);

  // Try sending web push if subscription exists
  try {
    const { data: sub } = await supabase
      .from("push_subscriptions")
      .select("subscription")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (sub?.subscription) {
      // Fire and forget push — don't block the cron
      fetch(`${process.env.NEXT_PUBLIC_SITE_URL || "https://www.pawband.ch"}/api/push/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: sub.subscription,
          title,
          body,
          url: link,
        }),
      }).catch(() => {});
    }
  } catch {
    // Push not critical
  }
}

export async function GET() {
  try {
    const supabase = createAdminClient();
    const hour = new Date().getHours();
    let triggered = 0;

    // ═══════ 9:00 — Match du Jour ═══════
    if (hour >= 8 && hour <= 10) {
      // Send match du jour to all users with at least one animal
      const { data: activeUsers } = await supabase
        .from("animals")
        .select("created_by")
        .limit(500);

      const uniqueUsers = [...new Set((activeUsers || []).map((a: any) => a.created_by))];

      for (const userId of uniqueUsers) {
        await sendNotification(supabase, userId, "match_du_jour", {});
        triggered++;
      }
    }

    // ═══════ 18:00–21:00 — Streak at risk ═══════
    if (hour >= 17 && hour <= 21) {
      // Find users who were active recently (have messages/matches) but not today
      // Simple approach: users with reels/matches in last 7 days but no activity today
      const today = new Date().toISOString().split("T")[0];
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

      // Get recently active users (had activity in past week)
      const { data: recentUsers } = await supabase
        .from("reels")
        .select("user_id, created_at")
        .gte("created_at", weekAgo)
        .order("created_at", { ascending: false })
        .limit(200);

      // Also check matches
      const { data: recentMatchers } = await supabase
        .from("matches")
        .select("sender_user_id, receiver_user_id, created_at")
        .gte("created_at", weekAgo)
        .limit(200);

      const activeUserIds = new Set<string>();
      (recentUsers || []).forEach((r: any) => activeUserIds.add(r.user_id));
      (recentMatchers || []).forEach((m: any) => {
        activeUserIds.add(m.sender_user_id);
        activeUserIds.add(m.receiver_user_id);
      });

      // Check who has NOT been active today
      const { data: todayActive } = await supabase
        .from("reels")
        .select("user_id")
        .gte("created_at", `${today}T00:00:00Z`)
        .limit(500);

      const todayActiveIds = new Set((todayActive || []).map((r: any) => r.user_id));

      for (const userId of activeUserIds) {
        if (!todayActiveIds.has(userId)) {
          await sendNotification(supabase, userId, "streak_at_risk", { count: 3 });
          triggered++;
        }
      }
    }

    // ═══════ Inactive 3+ days ═══════
    if (hour >= 11 && hour <= 13) {
      const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
      const fourDaysAgo = new Date(Date.now() - 4 * 86400000).toISOString();

      // Users with animals who haven't posted reels in 3-4 days
      const { data: allAnimals } = await supabase
        .from("animals")
        .select("created_by, name")
        .limit(500);

      const animalOwners = new Map<string, string>();
      (allAnimals || []).forEach((a: any) => {
        if (!animalOwners.has(a.created_by)) animalOwners.set(a.created_by, a.name);
      });

      // Check who posted recently (within 3 days) — exclude them
      const { data: recentPosters } = await supabase
        .from("reels")
        .select("user_id")
        .gte("created_at", threeDaysAgo)
        .limit(500);

      const recentIds = new Set((recentPosters || []).map((r: any) => r.user_id));

      for (const [userId, petName] of animalOwners) {
        if (!recentIds.has(userId)) {
          await sendNotification(supabase, userId, "inactive_3d", { petName });
          triggered++;
          if (triggered > 50) break; // Rate limit
        }
      }
    }

    return NextResponse.json({ ok: true, triggered, hour });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
