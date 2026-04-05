import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non connecte" }, { status: 401 });
    }

    const body = await request.json();
    const { blocked_user_id, reason } = body;

    if (!blocked_user_id) {
      return NextResponse.json({ error: "blocked_user_id requis" }, { status: 400 });
    }

    if (blocked_user_id === user.id) {
      return NextResponse.json({ error: "Impossible de se bloquer soi-meme" }, { status: 400 });
    }

    // Check if already blocked
    const { data: existing } = await supabase
      .from("blocks")
      .select("id")
      .eq("blocker_id", user.id)
      .eq("blocked_id", blocked_user_id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ ok: true, message: "Deja bloque" });
    }

    // Insert block
    const { error: blockError } = await supabase
      .from("blocks")
      .insert({
        blocker_id: user.id,
        blocked_id: blocked_user_id,
        reason: reason || null,
      });

    if (blockError) {
      console.error("Block insert error:", blockError);
      return NextResponse.json({ error: "Erreur lors du blocage" }, { status: 500 });
    }

    // Delete any matches between the two users
    // Matches where the blocker is sender and blocked is receiver, or vice versa
    const { data: myAnimals } = await supabase
      .from("animals")
      .select("id")
      .eq("created_by", user.id);

    const { data: theirAnimals } = await supabase
      .from("animals")
      .select("id")
      .eq("created_by", blocked_user_id);

    if (myAnimals && theirAnimals && myAnimals.length > 0 && theirAnimals.length > 0) {
      const myIds = myAnimals.map((a) => a.id);
      const theirIds = theirAnimals.map((a) => a.id);

      // Delete matches where my animals matched their animals
      for (const myId of myIds) {
        for (const theirId of theirIds) {
          await supabase
            .from("matches")
            .delete()
            .or(`and(sender_animal_id.eq.${myId},receiver_animal_id.eq.${theirId}),and(sender_animal_id.eq.${theirId},receiver_animal_id.eq.${myId})`);
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Block error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non connecte" }, { status: 401 });
    }

    const { data: blocks } = await supabase
      .from("blocks")
      .select("id, blocked_id, reason, created_at")
      .eq("blocker_id", user.id)
      .order("created_at", { ascending: false });

    // Get blocked user details
    const blockedIds = (blocks || []).map((b) => b.blocked_id);
    let blockedUsers: any[] = [];

    if (blockedIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .in("id", blockedIds);

      blockedUsers = (blocks || []).map((b) => {
        const profile = (profiles || []).find((p) => p.id === b.blocked_id);
        return {
          block_id: b.id,
          user_id: b.blocked_id,
          full_name: profile?.full_name || null,
          email: profile?.email || null,
          avatar_url: profile?.avatar_url || null,
          reason: b.reason,
          created_at: b.created_at,
        };
      });
    }

    return NextResponse.json({
      blocked_ids: blockedIds,
      blocked_users: blockedUsers,
    });
  } catch (err) {
    console.error("Get blocks error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
