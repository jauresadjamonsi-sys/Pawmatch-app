import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// POST /api/contests/vote — toggle vote on a contest entry
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Non authentifie" },
      { status: 401 }
    );
  }

  const body = await request.json();
  const { entry_id } = body;

  if (!entry_id) {
    return NextResponse.json(
      { error: "entry_id requis" },
      { status: 400 }
    );
  }

  // Verify the entry exists
  const { data: entry } = await supabase
    .from("contest_entries")
    .select("id, vote_count")
    .eq("id", entry_id)
    .single();

  if (!entry) {
    return NextResponse.json(
      { error: "Participation introuvable" },
      { status: 404 }
    );
  }

  // Check if already voted
  const { data: existing } = await supabase
    .from("contest_votes")
    .select("id")
    .eq("entry_id", entry_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    // Remove vote
    await supabase.from("contest_votes").delete().eq("id", existing.id);

    // Decrement vote_count
    await supabase
      .from("contest_entries")
      .update({ vote_count: Math.max(0, entry.vote_count - 1) })
      .eq("id", entry_id);

    return NextResponse.json({ voted: false });
  }

  // Add vote
  const { error: voteError } = await supabase
    .from("contest_votes")
    .insert({ entry_id, user_id: user.id });

  if (voteError) {
    return NextResponse.json(
      { error: voteError.message },
      { status: 500 }
    );
  }

  // Increment vote_count
  await supabase
    .from("contest_entries")
    .update({ vote_count: entry.vote_count + 1 })
    .eq("id", entry_id);

  return NextResponse.json({ voted: true });
}
