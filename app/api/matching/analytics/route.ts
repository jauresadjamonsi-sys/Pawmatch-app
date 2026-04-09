import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// GET /api/matching/analytics — User's matching statistics
// ---------------------------------------------------------------------------

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  // 1. Total swipes sent (all statuses)
  const { count: totalSwipes } = await supabase
    .from("matches")
    .select("*", { count: "exact", head: true })
    .eq("sender_user_id", user.id);

  // 2. Accepted matches (mutual)
  const { count: acceptedMatches } = await supabase
    .from("matches")
    .select("*", { count: "exact", head: true })
    .eq("sender_user_id", user.id)
    .eq("status", "accepted");

  // 3. Match rate
  const matchRate =
    totalSwipes && totalSwipes > 0
      ? Math.round(((acceptedMatches || 0) / totalSwipes) * 100)
      : 0;

  // 4. Get all sent matches with receiver animal species
  const { data: sentMatches } = await supabase
    .from("matches")
    .select("receiver_animal_id, created_at, status")
    .eq("sender_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(500);

  // 5. Get the species of liked animals
  const receiverIds = (sentMatches || []).map((m: any) => m.receiver_animal_id);
  let speciesCounts: Record<string, number> = {};
  let cantonCounts: Record<string, number> = {};

  if (receiverIds.length > 0) {
    const { data: likedAnimals } = await supabase
      .from("animals")
      .select("id, species, canton")
      .in("id", receiverIds.slice(0, 200));

    if (likedAnimals) {
      for (const animal of likedAnimals) {
        const sp = animal.species || "autre";
        speciesCounts[sp] = (speciesCounts[sp] || 0) + 1;

        if (animal.canton) {
          cantonCounts[animal.canton] = (cantonCounts[animal.canton] || 0) + 1;
        }
      }
    }
  }

  // Most liked species
  const mostLikedSpecies = Object.entries(speciesCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([species, count]) => ({ species, count }));

  // Compatible cantons (top 5)
  const compatibleCantons = Object.entries(cantonCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([canton, count]) => ({ canton, count }));

  // 6. Peak activity time (hour of day when user swipes most)
  const hourCounts: Record<number, number> = {};
  for (const match of sentMatches || []) {
    const hour = new Date(match.created_at).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  }

  const peakHour = Object.entries(hourCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([hour]) => parseInt(hour))[0];

  const peakActivityTime = peakHour !== undefined
    ? `${String(peakHour).padStart(2, "0")}:00 - ${String((peakHour + 1) % 24).padStart(2, "0")}:00`
    : null;

  // 7. Weekly activity (last 7 days)
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weeklySwipes = (sentMatches || []).filter(
    (m: any) => new Date(m.created_at) >= weekAgo
  ).length;

  // 8. Today's swipes
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todaySwipes = (sentMatches || []).filter(
    (m: any) => new Date(m.created_at) >= todayStart
  ).length;

  return NextResponse.json({
    total_swipes: totalSwipes || 0,
    accepted_matches: acceptedMatches || 0,
    match_rate: matchRate,
    most_liked_species: mostLikedSpecies,
    compatible_cantons: compatibleCantons,
    peak_activity_time: peakActivityTime,
    weekly_swipes: weeklySwipes,
    today_swipes: todaySwipes,
  });
}
