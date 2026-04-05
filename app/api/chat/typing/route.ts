import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { match_id } = await req.json();
    if (!match_id) return NextResponse.json({ error: "match_id required" }, { status: 400 });

    const { error } = await supabase
      .from("typing_indicators")
      .upsert(
        { match_id, user_id: user.id, updated_at: new Date().toISOString() },
        { onConflict: "match_id,user_id" }
      );

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const matchId = req.nextUrl.searchParams.get("match_id");
    if (!matchId) return NextResponse.json({ error: "match_id required" }, { status: 400 });

    const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString();

    const { data, error } = await supabase
      .from("typing_indicators")
      .select("user_id, updated_at")
      .eq("match_id", matchId)
      .neq("user_id", user.id)
      .gte("updated_at", fiveSecondsAgo);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ typing: (data || []).length > 0 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
