import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/live - List active live streams
export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("live_streams")
    .select("*, profiles:user_id(id, full_name, avatar_url, canton)")
    .eq("is_live", true)
    .order("viewer_count", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ streams: data || [] });
}

// POST /api/live - Create a new stream
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const body = await request.json();
  const title = (body.title || "").trim();
  if (!title) return NextResponse.json({ error: "Titre requis" }, { status: 400 });

  // Check if user already has an active stream
  const { data: existing } = await supabase
    .from("live_streams")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_live", true)
    .single();

  if (existing) {
    return NextResponse.json({ error: "Vous avez deja un live actif", stream_id: existing.id }, { status: 409 });
  }

  const { data, error } = await supabase
    .from("live_streams")
    .insert({
      user_id: user.id,
      title,
      species_filter: body.species_filter || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ stream: data });
}

// PATCH /api/live - Update stream (end, viewer count)
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const body = await request.json();
  const { stream_id, action, viewer_count } = body;

  if (!stream_id) return NextResponse.json({ error: "stream_id requis" }, { status: 400 });

  if (action === "end") {
    const { error } = await supabase
      .from("live_streams")
      .update({ is_live: false, ended_at: new Date().toISOString() })
      .eq("id", stream_id)
      .eq("user_id", user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (typeof viewer_count === "number") {
    const { error } = await supabase
      .from("live_streams")
      .update({ viewer_count })
      .eq("id", stream_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Action non reconnue" }, { status: 400 });
}
