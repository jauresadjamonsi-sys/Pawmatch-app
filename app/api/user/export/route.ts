import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GDPR Art. 20 — Droit a la portabilite des donnees
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  // Collect all user data
  const [profileRes, animalsRes, matchesSentRes, matchesReceivedRes, messagesRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("animals").select("*").eq("created_by", user.id),
    supabase.from("matches").select("*").eq("sender_user_id", user.id),
    supabase.from("matches").select("*").eq("receiver_user_id", user.id),
    supabase.from("messages").select("*").eq("sender_id", user.id),
  ]);

  const exportData = {
    export_date: new Date().toISOString(),
    format_version: "1.0",
    platform: "PawBand (pawband.ch)",
    user: {
      auth_email: user.email,
      auth_created_at: user.created_at,
      profile: profileRes.data || null,
    },
    animals: animalsRes.data || [],
    matches_sent: matchesSentRes.data || [],
    matches_received: matchesReceivedRes.data || [],
    messages_sent: messagesRes.data || [],
    legal_notice: "Export genere conformement a l'art. 20 RGPD et a la nLPD suisse. Pour toute question : contact@pawband.ch",
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="pawband-export-${user.id.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
