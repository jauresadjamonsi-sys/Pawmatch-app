import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { data, error } = await supabase
      .from("matching_preferences")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      // Table might not exist yet, return empty
      return NextResponse.json({ preferences: null });
    }

    return NextResponse.json({ preferences: data });
  } catch {
    return NextResponse.json({ preferences: null });
  }
}

export async function PUT(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const prefs = {
      user_id: user.id,
      preferred_species: body.preferred_species || [],
      preferred_energy: body.preferred_energy || "any",
      max_distance_km: body.max_distance_km || 50,
      min_age_months: body.min_age_months || 0,
      max_age_months: body.max_age_months || 240,
      preferred_size: body.preferred_size || "any",
      sociability_min: body.sociability_min || 1,
      show_verified_only: body.show_verified_only || false,
      canton: body.canton || "",
    };

    const { data, error } = await supabase
      .from("matching_preferences")
      .upsert(prefs, { onConflict: "user_id" })
      .select()
      .single();

    if (error) {
      // Table might not exist, fall back gracefully
      console.error("[preferences]", error);
      return NextResponse.json({ preferences: null, fallback: true });
    }

    return NextResponse.json({ preferences: data });
  } catch (e) {
    console.error("[preferences]", e);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
