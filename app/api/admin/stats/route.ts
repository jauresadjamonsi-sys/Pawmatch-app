import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "jaures.adjamonsi@gmail.com").split(",").map(e => e.trim().toLowerCase());

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  try {
    // Auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non connecte" }, { status: 401 });
    }

    // Check admin: by email or by role in profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, email")
      .eq("id", user.id)
      .single();

    const isAdmin =
      profile?.role === "admin" ||
      ADMIN_EMAILS.includes((user.email || "").toLowerCase());

    if (!isAdmin) {
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }

    // Use service role for unrestricted queries
    const db = getServiceClient();

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + 1).toISOString();
    const lastWeekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() - 6).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();

    // Run all queries in parallel
    const [
      totalUsersRes,
      usersTodayRes,
      usersWeekRes,
      usersLastWeekRes,
      usersMonthRes,
      allUsersRes,
      totalAnimalsRes,
      allAnimalsRes,
      animalsBySpeciesRes,
      totalMatchesRes,
      matchesTodayRes,
      totalMessagesRes,
      totalEventsRes,
      premiumCountRes,
      proCountRes,
      weeklySignupsRes,
      animalsToday,
      matchesYesterday,
      pendingReportsRes,
      totalReportsRes,
    ] = await Promise.all([
      // Total users
      db.from("profiles").select("id", { count: "exact", head: true }),
      // Users today
      db.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", todayStart),
      // Users this week
      db.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", weekStart),
      // Users last week (for growth)
      db.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", lastWeekStart).lt("created_at", weekStart),
      // Users this month
      db.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", monthStart),
      // ALL users with details
      db.from("profiles").select("id, email, full_name, avatar_url, subscription, canton, city, created_at").order("created_at", { ascending: false }),
      // Total animals
      db.from("animals").select("id", { count: "exact", head: true }),
      // ALL animals with details
      db.from("animals").select("id, name, species, breed, canton, city, photo_url, created_by, created_at, status").order("created_at", { ascending: false }),
      // Animals by species
      db.from("animals").select("species"),
      // Total matches
      db.from("matches").select("id", { count: "exact", head: true }),
      // Matches today
      db.from("matches").select("id", { count: "exact", head: true }).gte("created_at", todayStart),
      // Total messages
      db.from("messages").select("id", { count: "exact", head: true }),
      // Total events
      db.from("events").select("id", { count: "exact", head: true }),
      // Premium subscriptions
      db.from("profiles").select("id", { count: "exact", head: true }).eq("subscription", "premium"),
      // Pro subscriptions
      db.from("profiles").select("id", { count: "exact", head: true }).eq("subscription", "pro"),
      // Weekly signups: last 7 days
      db.from("profiles").select("created_at").gte("created_at", new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6).toISOString()),
      // Animals created today
      db.from("animals").select("id", { count: "exact", head: true }).gte("created_at", todayStart),
      // Matches yesterday (for 24h section)
      db.from("matches").select("id", { count: "exact", head: true }).gte("created_at", yesterday),
      // Pending reports
      db.from("reports").select("id, reporter_id, reported_user_id, reported_animal_id, reason, details, status, created_at").eq("status", "pending").order("created_at", { ascending: false }),
      // Total reports
      db.from("reports").select("id", { count: "exact", head: true }),
    ]);

    // Count animals by species
    const speciesCounts: Record<string, number> = {};
    if (animalsBySpeciesRes.data) {
      for (const a of animalsBySpeciesRes.data) {
        const s = (a as { species: string }).species || "Inconnu";
        speciesCounts[s] = (speciesCounts[s] || 0) + 1;
      }
    }

    // Count signups per day for last 7 days
    const dailySignups: { date: string; count: number }[] = [];
    const dayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayName = dayNames[d.getDay()];
      const count = weeklySignupsRes.data
        ? weeklySignupsRes.data.filter((u: { created_at: string }) => u.created_at?.startsWith(dateStr)).length
        : 0;
      dailySignups.push({ date: `${dayName} ${d.getDate()}/${d.getMonth() + 1}`, count });
    }

    // Animals per user count
    const animalsPerUser: Record<string, number> = {};
    if (allAnimalsRes.data) {
      for (const a of allAnimalsRes.data) {
        const uid = (a as { created_by: string }).created_by;
        if (uid) animalsPerUser[uid] = (animalsPerUser[uid] || 0) + 1;
      }
    }

    // Fetch auth users for last_sign_in_at
    const authSignIns: Record<string, string | null> = {};
    try {
      const { data: { users: authUsers } } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (authUsers) {
        for (const au of authUsers) {
          authSignIns[au.id] = au.last_sign_in_at || null;
        }
      }
    } catch {}

    // Enrich users with animal count + last_sign_in_at
    const allUsers = (allUsersRes.data || []).map((u: Record<string, unknown>) => ({
      ...u,
      animal_count: animalsPerUser[(u as { id: string }).id] || 0,
      last_sign_in_at: authSignIns[(u as { id: string }).id] || null,
    }));

    // Growth rate calculation
    const thisWeekSignups = usersWeekRes.count || 0;
    const lastWeekSignups = usersLastWeekRes.count || 0;
    const growthRate = lastWeekSignups > 0
      ? Math.round(((thisWeekSignups - lastWeekSignups) / lastWeekSignups) * 100)
      : thisWeekSignups > 0 ? 100 : 0;

    // Revenue estimate
    const premiumCount = premiumCountRes.count || 0;
    const proCount = proCountRes.count || 0;
    const estimatedMRR = premiumCount * 4.90 + proCount * 9.90;

    // Build activity feed from recent data
    const recentActivity: { type: string; text: string; time: string }[] = [];

    // Recent user signups for activity feed
    const recentUsers = (allUsersRes.data || []).slice(0, 5);
    for (const u of recentUsers) {
      const usr = u as { full_name: string | null; email: string; created_at: string };
      recentActivity.push({
        type: "signup",
        text: `${usr.full_name || usr.email} a cree un compte`,
        time: usr.created_at,
      });
    }

    // Recent animals for activity feed
    const recentAnimals = (allAnimalsRes.data || []).slice(0, 5);
    for (const a of recentAnimals) {
      const ani = a as { name: string; species: string; created_at: string };
      recentActivity.push({
        type: "animal",
        text: `${ani.name} (${ani.species}) a ete ajoute`,
        time: ani.created_at,
      });
    }

    // Enrich reports with user emails
    const pendingReports = pendingReportsRes.data || [];
    const reportUserIds = [
      ...new Set([
        ...pendingReports.map((r: any) => r.reporter_id),
        ...pendingReports.map((r: any) => r.reported_user_id),
      ].filter(Boolean))
    ];
    let reportProfiles: Record<string, string> = {};
    if (reportUserIds.length > 0) {
      const { data: rProfiles } = await db.from("profiles").select("id, email, full_name").in("id", reportUserIds);
      for (const p of (rProfiles || [])) {
        reportProfiles[(p as any).id] = (p as any).full_name || (p as any).email || "Inconnu";
      }
    }
    const enrichedReports = pendingReports.map((r: any) => ({
      ...r,
      reporter_name: reportProfiles[r.reporter_id] || "Inconnu",
      reported_user_name: reportProfiles[r.reported_user_id] || "Inconnu",
    }));

    // Sort activity by time descending
    recentActivity.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    return NextResponse.json({
      totalUsers: totalUsersRes.count || 0,
      usersToday: usersTodayRes.count || 0,
      usersWeek: thisWeekSignups,
      usersLastWeek: lastWeekSignups,
      usersMonth: usersMonthRes.count || 0,
      totalAnimals: totalAnimalsRes.count || 0,
      animalsToday: animalsToday.count || 0,
      animalsBySpecies: speciesCounts,
      totalMatches: totalMatchesRes.count || 0,
      matchesToday: matchesTodayRes.count || 0,
      matchesLast24h: matchesYesterday.count || 0,
      totalMessages: totalMessagesRes.count || 0,
      totalEvents: totalEventsRes.count || 0,
      premiumCount,
      proCount,
      estimatedMRR,
      growthRate,
      allUsers,
      allAnimals: allAnimalsRes.data || [],
      dailySignups,
      recentActivity: recentActivity.slice(0, 10),
      pendingReports: enrichedReports,
      totalReports: totalReportsRes.count || 0,
    });
  } catch (err) {
    console.error("Admin stats error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
