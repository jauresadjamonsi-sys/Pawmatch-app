import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function sendPush(userId: string, title: string, body: string, url: string) {
  try {
    const webpush = await import("web-push");
    webpush.default.setVapidDetails(
      process.env.VAPID_EMAIL!,
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    );
    const { data: subs } = await supabase.from("push_subscriptions").select("*").eq("user_id", userId);
    if (!subs || subs.length === 0) return 0;
    const payload = JSON.stringify({ title, body, url });
    let sent = 0;
    for (const sub of subs) {
      try {
        await webpush.default.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        sent++;
      } catch (err: any) {
        if (err.statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        }
      }
    }
    return sent;
  } catch { return 0; }
}

export async function GET(request: Request) {
  // Validate CRON_SECRET
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const results: string[] = [];
  let totalSent = 0;

  // 1. Rappels vaccins (7 jours avant)
  const inOneWeek = new Date();
  inOneWeek.setDate(inOneWeek.getDate() + 7);
  const weekStr = inOneWeek.toISOString().split("T")[0];
  const { data: vaccineAnimals } = await supabase
    .from("animals").select("name, created_by, next_vaccine_date").eq("next_vaccine_date", weekStr);
  if (vaccineAnimals) {
    for (const animal of vaccineAnimals) {
      if (animal.created_by) {
        const sent = await sendPush(animal.created_by, "Rappel vaccin", animal.name + " a un vaccin prévu dans 7 jours.", "/profile");
        if (sent > 0) { totalSent++; results.push("vaccin: " + animal.name); }
      }
    }
  }

  // 2. Rappels veto (6 mois sans visite)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const sixStr = sixMonthsAgo.toISOString().split("T")[0];
  const { data: vetAnimals } = await supabase
    .from("animals").select("name, created_by, last_vet_visit")
    .not("last_vet_visit", "is", null).lt("last_vet_visit", sixStr);
  if (vetAnimals) {
    for (const animal of vetAnimals) {
      if (animal.created_by) {
        const sent = await sendPush(animal.created_by, "Visite véto recommandée", animal.name + " n'a pas vu le véto depuis plus de 6 mois.", "/profile");
        if (sent > 0) { totalSent++; results.push("veto: " + animal.name); }
      }
    }
  }

  // 3. Match du jour — smart targeting
  // Only target users created in the last 30 days OR recently active (created_at as proxy for activity)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysStr = thirtyDaysAgo.toISOString();

  const { data: activeUsers } = await supabase
    .from("profiles")
    .select("id")
    .gte("created_at", thirtyDaysStr)
    .limit(200);

  if (activeUsers) {
    // Check which users already received a match-du-jour notification today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStr = todayStart.toISOString();

    const userIds = activeUsers.map((u) => u.id);
    const { data: alreadyNotified } = await supabase
      .from("notifications")
      .select("user_id")
      .in("user_id", userIds)
      .gte("created_at", todayStr)
      .or("type.ilike.%match%,type.ilike.%jour%");

    const notifiedSet = new Set(
      (alreadyNotified || []).map((n: { user_id: string }) => n.user_id)
    );

    for (const user of activeUsers) {
      // Skip users who already got a match notification today
      if (notifiedSet.has(user.id)) continue;

      const { data: animals } = await supabase.from("animals").select("name").eq("created_by", user.id).limit(1);
      if (animals && animals.length > 0) {
        const sent = await sendPush(user.id, "Match du jour", animals[0].name + " a un nouveau copain recommandé !", "/flairer");
        if (sent > 0) totalSent++;
      }
    }
  }

  return NextResponse.json({ sent: totalSent, results, timestamp: new Date().toISOString() });
}
