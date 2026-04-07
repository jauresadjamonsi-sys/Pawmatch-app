import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/supabase/admin";

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const result = await ensureProfile(user);
    return NextResponse.json({ ok: true, created: result.created });
  } catch (e: any) {
    console.error("ensure-profile error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
