import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "contact@pawlyapp.ch").split(",").map(e => e.trim().toLowerCase());

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
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Run all queries in parallel
    const [
      totalUsersRes,
      usersTodayRes,
      usersWeekRes,
      usersMonthRes,
      totalAnimalsRes,
      animalsBySpeciesRes,
      totalMatchesRes,
      matchesTodayRes,
      totalMessagesRes,
      premiumCountRes,
      proCountRes,
      recentUsersRes,
      recentAnimalsRes,
      weeklySignupsRes,
    ] = await Promise.all([
      // Total users
      db.from("profiles").select("id", { count: "exact", head: true }),
      // Users today
      db.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", todayStart),
      // Users this week
      db.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", weekStart),
      // Users this month
      db.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", monthStart),
      // Total animals
      db.from("animals").select("id", { count: "exact", head: true }),
      // Animals by species
      db.from("animals").select("species"),
      // Total matches
      db.from("matches").select("id", { count: "exact", head: true }),
      // Matches today
      db.from("matches").select("id", { count: "exact", head: true }).gte("created_at", todayStart),
      // Total messages
      db.from("messages").select("id", { count: "exact", head: true }),
      // Premium subscriptions
      db.from("profiles").select("id", { count: "exact", head: true }).eq("subscription", "premium"),
      // Pro subscriptions
      db.from("profiles").select("id", { count: "exact", head: true }).eq("subscription", "pro"),
      // Recent signups (last 10)
      db.from("profiles").select("email, full_name, created_at, subscription").order("created_at", { ascending: false }).limit(10),
      // Recent animals (last 10)
      db.from("animals").select("name, species, canton, created_at").order("created_at", { ascending: false }).limit(10),
      // Weekly signups: last 7 days day by day
      db.from("profiles").select("created_at").gte("created_at", new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6).toISOString()),
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

    return NextResponse.json({
      totalUsers: totalUsersRes.count || 0,
      usersToday: usersTodayRes.count || 0,
      usersWeek: usersWeekRes.count || 0,
      usersMonth: usersMonthRes.count || 0,
      totalAnimals: totalAnimalsRes.count || 0,
      animalsBySpecies: speciesCounts,
      totalMatches: totalMatchesRes.count || 0,
      matchesToday: matchesTodayRes.count || 0,
      totalMessages: totalMessagesRes.count || 0,
      premiumCount: premiumCountRes.count || 0,
      proCount: proCountRes.count || 0,
      recentUsers: recentUsersRes.data || [],
      recentAnimals: recentAnimalsRes.data || [],
      dailySignups,
    });
  } catch (err) {
    console.error("Admin stats error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
