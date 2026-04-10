import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { matchId } = body;

  if (!matchId) {
    return NextResponse.json({ error: "matchId is required" }, { status: 400 });
  }

  // Fetch the match to determine the other user
  const { data: match, error: matchErr } = await supabase
    .from("matches")
    .select("id, sender_user_id, receiver_user_id, status")
    .eq("id", matchId)
    .single();

  if (matchErr || !match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  if (match.status !== "accepted") {
    return NextResponse.json({ error: "Match not accepted" }, { status: 400 });
  }

  // Verify the caller is part of this match
  if (match.sender_user_id !== user.id && match.receiver_user_id !== user.id) {
    return NextResponse.json({ error: "Not part of this match" }, { status: 403 });
  }

  // Determine the other user
  const otherUserId =
    match.sender_user_id === user.id
      ? match.receiver_user_id
      : match.sender_user_id;

  // Get caller profile name for the notification
  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .single();

  const callerName = callerProfile?.full_name || callerProfile?.email || "Quelqu'un";

  // Use service role client to insert notification (bypasses RLS)
  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await serviceSupabase
    .from("notifications")
    .insert({
      user_id: otherUserId,
      type: "message",
      title: "📹 Appel video entrant",
      body: `${callerName} vous appelle !`,
      link: `/matches/${matchId}/call`,
      read: false,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
