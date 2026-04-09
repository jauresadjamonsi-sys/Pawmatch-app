import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/stories/reply
 * Send a reply to a story. Creates an in-app notification for the story owner.
 * Body: { story_id: string, story_owner_id: string, message: string }
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

    const { story_id, story_owner_id, message } = await req.json();

    if (!story_id || !story_owner_id || !message?.trim()) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Don't allow replying to own stories
    if (user.id === story_owner_id) {
      return NextResponse.json({ error: "Cannot reply to own story" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Get sender's profile name
    const { data: senderProfile } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const senderName = senderProfile?.full_name || "Quelqu'un";

    // Create in-app notification for the story owner
    await admin.from("notifications").insert({
      id: crypto.randomUUID(),
      user_id: story_owner_id,
      type: "event",
      title: `${senderName} a repondu a ta story`,
      body: message.trim().substring(0, 200),
      link: "/stories",
      read: false,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
