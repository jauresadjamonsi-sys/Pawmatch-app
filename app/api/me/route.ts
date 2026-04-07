import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Query with the authenticated server client (uses anon key + user JWT from cookies)
    const [profileRes, animalsRes, matchRes, messageRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, email, full_name, avatar_url, city, canton, phone, subscription, role, bio, created_at")
        .eq("id", user.id)
        .single(),
      supabase
        .from("animals")
        .select("id, name, species, breed, age_months, gender, photo_url, canton, city, traits, energy_level, sociability, sterilized, weight_kg, description, created_by, status, created_at")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("matches")
        .select("id", { count: "exact", head: true })
        .or(`sender_user_id.eq.${user.id},receiver_user_id.eq.${user.id}`),
      supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("sender_id", user.id),
    ]);

    let profile = profileRes.data;
    let animals = animalsRes.data || [];

    // If regular client returned nothing (RLS issue), try admin client as fallback
    if (!profile && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const { createAdminClient } = await import("@/lib/supabase/admin");
        const admin = createAdminClient();
        const { data: adminProfile } = await admin
          .from("profiles")
          .select("id, email, full_name, avatar_url, city, canton, phone, subscription, role, bio, created_at")
          .eq("id", user.id)
          .single();
        const { data: adminAnimals } = await admin
          .from("animals")
          .select("id, name, species, breed, age_months, gender, photo_url, canton, city, traits, energy_level, sociability, sterilized, weight_kg, description, created_by, status, created_at")
          .eq("created_by", user.id)
          .order("created_at", { ascending: false });
        if (adminProfile) profile = adminProfile;
        if (adminAnimals && adminAnimals.length > 0) animals = adminAnimals;
      } catch (e) {
        console.error("[/api/me] Admin fallback failed:", e);
      }
    }

    const matchCount = matchRes.count || 0;
    const messageCount = messageRes.count || 0;
    const daysSinceJoin = profile?.created_at
      ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / 86400000)
      : 0;

    return NextResponse.json({
      profile: profile || null,
      animals,
      user: { id: user.id, email: user.email || "" },
      stats: {
        matches: matchCount,
        messages: messageCount,
        days: daysSinceJoin,
        animals: animals.length,
      },
    });
  } catch (e: any) {
    console.error("[/api/me] Crash:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
