import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { error } = await supabase
      .from("user_presence")
      .upsert(
        { user_id: user.id, last_seen: new Date().toISOString(), is_online: true },
        { onConflict: "user_id" }
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const usersParam = searchParams.get("users");

    if (!usersParam) {
      return NextResponse.json({ error: "Missing users parameter" }, { status: 400 });
    }

    const userIds = usersParam.split(",").filter(Boolean).slice(0, 50);

    if (userIds.length === 0) {
      return NextResponse.json({ presence: {} });
    }

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("user_presence")
      .select("user_id, last_seen")
      .in("user_id", userIds);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const presence: Record<string, boolean> = {};
    for (const id of userIds) {
      const record = (data || []).find((r) => r.user_id === id);
      presence[id] = record ? record.last_seen > fiveMinutesAgo : false;
    }

    return NextResponse.json({ presence });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
