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

// Safe query wrapper — returns null on error instead of crashing Promise.all
async function safeQuery<T>(promise: PromiseLike<{ data: T | null; count?: number | null; error: any }>): Promise<{ data: T | null; count: number }> {
  try {
    const res = await promise;
    if (res.error) {
      console.warn("Supabase query error:", res.error.message);
      return { data: null, count: 0 };
    }
    return { data: res.data, count: res.count ?? 0 };
  } catch (e) {
    console.warn("Supabase query exception:", e);
    return { data: null, count: 0 };
  }
}

export async function GET() {
  try {
    // Auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non connecte" }, { status: 401 });
    }

    // Check admin
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

    const db = getServiceClient();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + 1).toISOString();
    const lastWeekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() - 6).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();
    const weekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6).toISOString();

    // Run all queries in parallel — each one is safe and won't crash the others
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
      animalsTodayRes,
      matchesYesterdayRes,
      pendingReportsRes,
      totalReportsRes,
    ] = await Promise.all([
      safeQuery(db.from("profiles").select("id", { count: "exact", head: true })),
      safeQuery(db.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", todayStart)),
      safeQuery(db.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", weekStart)),
      safeQuery(db.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", lastWeekStart).lt("created_at", weekStart)),
      safeQuery(db.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", monthStart)),
      safeQuery(db.from("profiles").select("id, email, full_name, avatar_url, subscription, canton, city, created_at").order("created_at", { ascending: false })),
      safeQuery(db.from("animals").select("id", { count: "exact", head: true })),
      safeQuery(db.from("animals").select("id, name, species, breed, canton, city, photo_url, created_by, created_at, status").order("created_at", { ascending: false })),
      safeQuery(db.from("animals").select("species")),
      safeQuery(db.from("matches").select("id", { count: "exact", head: true })),
      safeQuery(db.from("matches").select("id", { count: "exact", head: true }).gte("created_at", todayStart)),
      safeQuery(db.from("messages").select("id", { count: "exact", head: true })),
      safeQuery(db.from("events").select("id", { count: "exact", head: true })),
      safeQuery(db.from("profiles").select("id", { count: "exact", head: true }).eq("subscription", "premium")),
      safeQuery(db.from("profiles").select("id", { count: "exact", head: true }).eq("subscription", "pro")),
      safeQuery(db.from("profiles").select("created_at").gte("created_at", weekAgo)),
      safeQuery(db.from("animals").select("id", { count: "exact", head: true }).gte("created_at", todayStart)),
      safeQuery(db.from("matches").select("id", { count: "exact", head: true }).gte("created_at", yesterday)),
      safeQuery(db.from("reports").select("id, reporter_id, reported_user_id, reported_animal_id, reason, details, status, created_at").eq("status", "pending").order("created_at", { ascending: false })),
      safeQuery(db.from("reports").select("id", { count: "exact", head: true })),
    ]);

    // Species counts
    const speciesCounts: Record<string, number> = {};
    if (animalsBySpeciesRes.data) {
      for (const a of animalsBySpeciesRes.data as any[]) {
        const s = a.species || "Inconnu";
        speciesCounts[s] = (speciesCounts[s] || 0) + 1;
      }
    }

    // Daily signups
    const dailySignups: { date: string; count: number }[] = [];
    const dayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayName = dayNames[d.getDay()];
      const count = weeklySignupsRes.data
        ? (weeklySignupsRes.data as any[]).filter(u => u.created_at?.startsWith(dateStr)).length
        : 0;
      dailySignups.push({ date: `${dayName} ${d.getDate()}/${d.getMonth() + 1}`, count });
    }

    // Animals per user
    const animalsPerUser: Record<string, number> = {};
    if (allAnimalsRes.data) {
      for (const a of allAnimalsRes.data as any[]) {
        if (a.created_by) animalsPerUser[a.created_by] = (animalsPerUser[a.created_by] || 0) + 1;
      }
    }

    // Last sign in from auth
    const authSignIns: Record<string, string | null> = {};
    try {
      const { data: { users: authUsers } } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (authUsers) {
        for (const au of authUsers) {
          authSignIns[au.id] = au.last_sign_in_at || null;
        }
      }
    } catch {}

    // Enrich users
    const allUsers = ((allUsersRes.data || []) as any[]).map(u => ({
      ...u,
      animal_count: animalsPerUser[u.id] || 0,
      last_sign_in_at: authSignIns[u.id] || null,
    }));

    // Growth
    const thisWeekSignups = usersWeekRes.count;
    const lastWeekSignups = usersLastWeekRes.count;
    const growthRate = lastWeekSignups > 0
      ? Math.round(((thisWeekSignups - lastWeekSignups) / lastWeekSignups) * 100)
      : thisWeekSignups > 0 ? 100 : 0;

    // Revenue
    const premiumCount = premiumCountRes.count;
    const proCount = proCountRes.count;
    const estimatedMRR = premiumCount * 4.90 + proCount * 9.90;

    // Activity feed
    const recentActivity: { type: string; text: string; time: string }[] = [];
    for (const u of ((allUsersRes.data || []) as any[]).slice(0, 5)) {
      recentActivity.push({ type: "signup", text: `${u.full_name || u.email} a cree un compte`, time: u.created_at });
    }
    for (const a of ((allAnimalsRes.data || []) as any[]).slice(0, 5)) {
      recentActivity.push({ type: "animal", text: `${a.name} (${a.species}) a ete ajoute`, time: a.created_at });
    }
    recentActivity.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    // Enrich reports
    const pendingReports = (pendingReportsRes.data || []) as any[];
    const reportUserIds = [...new Set([...pendingReports.map(r => r.reporter_id), ...pendingReports.map(r => r.reported_user_id)].filter(Boolean))];
    let reportProfiles: Record<string, string> = {};
    if (reportUserIds.length > 0) {
      const { data: rProfiles } = await db.from("profiles").select("id, email, full_name").in("id", reportUserIds);
      for (const p of (rProfiles || []) as any[]) {
        reportProfiles[p.id] = p.full_name || p.email || "Inconnu";
      }
    }
    const enrichedReports = pendingReports.map(r => ({
      ...r,
      reporter_name: reportProfiles[r.reporter_id] || "Inconnu",
      reported_user_name: reportProfiles[r.reported_user_id] || "Inconnu",
    }));

    return NextResponse.json({
      totalUsers: totalUsersRes.count,
      usersToday: usersTodayRes.count,
      usersWeek: thisWeekSignups,
      usersLastWeek: lastWeekSignups,
      usersMonth: usersMonthRes.count,
      totalAnimals: totalAnimalsRes.count,
      animalsToday: animalsTodayRes.count,
      animalsBySpecies: speciesCounts,
      totalMatches: totalMatchesRes.count,
      matchesToday: matchesTodayRes.count,
      matchesLast24h: matchesYesterdayRes.count,
      totalMessages: totalMessagesRes.count,
      totalEvents: totalEventsRes.count,
      premiumCount,
      proCount,
      estimatedMRR,
      growthRate,
      allUsers,
      allAnimals: allAnimalsRes.data || [],
      dailySignups,
      recentActivity: recentActivity.slice(0, 10),
      pendingReports: enrichedReports,
      totalReports: totalReportsRes.count,
    });
  } catch (err) {
    console.error("Admin stats error:", err);
    return NextResponse.json({ error: "Erreur serveur: " + (err as Error).message }, { status: 500 });
  }
}
