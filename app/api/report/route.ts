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
    const { reported_user_id, reported_animal_id, reason, details } = body;

    if (!reported_user_id) {
      return NextResponse.json({ error: "reported_user_id requis" }, { status: 400 });
    }

    if (!reason) {
      return NextResponse.json({ error: "Raison requise" }, { status: 400 });
    }

    const { error: insertError } = await supabase
      .from("reports")
      .insert({
        reporter_id: user.id,
        reported_user_id,
        reported_animal_id: reported_animal_id || null,
        reason,
        details: details || null,
        status: "pending",
      });

    if (insertError) {
      console.error("Report insert error:", insertError);
      return NextResponse.json({ error: "Erreur lors du signalement" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Report error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
