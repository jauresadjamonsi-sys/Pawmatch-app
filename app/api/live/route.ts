import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET — list active live streams
export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("live_streams")
      .select("*")
      .eq("is_live", true)
      .order("started_at", { ascending: false });

    if (error) {
      console.error("[api/live] GET error:", error.message);
      return NextResponse.json({ streams: [] });
    }

    // Enrich with profile data
    const userIds = [...new Set((data || []).map((s: any) => s.user_id).filter(Boolean))];
    let profilesMap: Record<string, any> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);
      for (const p of (profiles || [])) {
        profilesMap[p.id] = p;
      }
    }

    const streams = (data || []).map((s: any) => ({
      ...s,
      profiles: profilesMap[s.user_id] || null,
    }));

    return NextResponse.json({ streams });
  } catch (err: any) {
    console.error("[api/live] GET crash:", err?.message);
    return NextResponse.json({ streams: [] });
  }
}

// POST — create a new live stream
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

    const { title, species_filter } = await request.json();
    if (!title?.trim()) return NextResponse.json({ error: "Titre requis" }, { status: 400 });

    const { data, error } = await supabase.from("live_streams").insert({
      user_id: user.id,
      title: title.trim(),
      species_filter: species_filter || null,
      is_live: true,
    }).select().single();

    if (error) {
      console.error("[api/live] POST error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ stream: data });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 });
  }
}

// PATCH — update stream (end it)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

    const { stream_id, action } = await request.json();
    if (!stream_id) return NextResponse.json({ error: "stream_id requis" }, { status: 400 });

    if (action === "end") {
      await supabase.from("live_streams").update({
        is_live: false,
        ended_at: new Date().toISOString(),
      }).eq("id", stream_id).eq("user_id", user.id);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 });
  }
}
