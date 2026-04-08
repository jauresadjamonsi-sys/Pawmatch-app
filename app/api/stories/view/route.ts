import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/stories/view
 * Records a story view using service role (bypasses RLS).
 * Body: { story_id: string }
 */
export async function POST(req: NextRequest) {
  try {
    // Get authenticated user from session
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { story_id } = await req.json();
    if (!story_id) {
      return NextResponse.json({ error: "Missing story_id" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Upsert view (service role bypasses RLS)
    await admin
      .from("story_views")
      .upsert(
        { story_id, viewer_id: user.id },
        { onConflict: "story_id,viewer_id" }
      );

    // Increment views_count atomically
    await admin.rpc("increment_story_views", { story_row_id: story_id });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
