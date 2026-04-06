import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const DURATION_SECONDS: Record<string, number> = {
  free: 60,          // 1 minute
  premium: 86400,    // 24 hours
  pro: 86400,        // 24 hours
};

// GET — public: who is the current mascot?
export async function GET() {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("mascot_spotlights")
      .select("*")
      .gt("expires_at", new Date().toISOString())
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      return NextResponse.json({
        active: true,
        animal_name: data.animal_name,
        animal_photo: data.animal_photo,
        animal_id: data.animal_id,
        user_id: data.user_id,
        owner_name: data.owner_name || null,
        plan: data.plan,
        expires_at: data.expires_at,
        started_at: data.started_at,
      });
    }

    return NextResponse.json({ active: false });
  } catch (err) {
    console.error("Spotlight GET error:", err);
    return NextResponse.json({ active: false });
  }
}

// POST — authenticated: claim the mascot spotlight
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non connecte" }, { status: 401 });
    }

    const body = await request.json();
    const { animal_id } = body;

    if (!animal_id) {
      return NextResponse.json({ error: "animal_id requis" }, { status: 400 });
    }

    // Get user profile for subscription + name
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, subscription, full_name")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });
    }

    // Verify the animal belongs to the user and has a photo
    const { data: animal } = await supabase
      .from("animals")
      .select("id, name, photo_url, species, created_by")
      .eq("id", animal_id)
      .single();

    if (!animal) {
      return NextResponse.json({ error: "Animal introuvable" }, { status: 404 });
    }

    if (animal.created_by !== user.id) {
      return NextResponse.json({ error: "Ce n'est pas ton animal" }, { status: 403 });
    }

    if (!animal.photo_url) {
      return NextResponse.json({ error: "Ton animal a besoin d'une photo pour devenir mascotte" }, { status: 400 });
    }

    // Check if a spotlight is currently active
    const { data: current } = await supabase
      .from("mascot_spotlights")
      .select("expires_at, animal_name")
      .gt("expires_at", new Date().toISOString())
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (current) {
      const remaining = Math.ceil((new Date(current.expires_at).getTime() - Date.now()) / 1000);
      return NextResponse.json({
        error: "occupied",
        message: `${current.animal_name} est la mascotte actuellement`,
        remaining_seconds: remaining,
      }, { status: 409 });
    }

    // Cooldown: free users can only use spotlight once per day
    const plan = profile.subscription || "free";
    if (plan === "free") {
      const oneDayAgo = new Date(Date.now() - 86400 * 1000).toISOString();
      const { data: recent } = await supabase
        .from("mascot_spotlights")
        .select("id")
        .eq("user_id", user.id)
        .gt("created_at", oneDayAgo)
        .limit(1)
        .maybeSingle();

      if (recent) {
        return NextResponse.json({
          error: "cooldown",
          message: "Les comptes gratuits peuvent utiliser le spotlight 1x par jour. Passe Premium pour 24h de spotlight !",
        }, { status: 429 });
      }
    }

    // Calculate expiry
    const durationSec = DURATION_SECONDS[plan] || DURATION_SECONDS.free;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationSec * 1000);

    // Insert spotlight
    const { error: insertError } = await supabase
      .from("mascot_spotlights")
      .insert({
        animal_id: animal.id,
        user_id: user.id,
        animal_name: animal.name,
        animal_photo: animal.photo_url,
        owner_name: profile.full_name || null,
        plan,
        started_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error("Spotlight insert error:", insertError);
      return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }

    const durationLabel = plan === "free" ? "1 minute" : "24 heures";

    return NextResponse.json({
      ok: true,
      duration: durationLabel,
      expires_at: expiresAt.toISOString(),
    });
  } catch (err) {
    console.error("Spotlight POST error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
