import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Find users who signed up > 24h ago, have 0 animals, and haven't been reminded
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: profiles, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, onboarding_reminder_sent")
      .eq("onboarding_reminder_sent", false)
      .lt("created_at", cutoff);

    if (profileErr || !profiles?.length) {
      return NextResponse.json({ sent: 0, message: "No users to remind" });
    }

    // Check which ones have 0 animals
    const userIds = profiles.map(p => p.id);
    const { data: animals } = await supabaseAdmin
      .from("animals")
      .select("created_by")
      .in("created_by", userIds);

    const usersWithAnimals = new Set((animals || []).map(a => a.created_by));
    const usersToRemind = profiles.filter(p => !usersWithAnimals.has(p.id));

    if (!usersToRemind.length) {
      return NextResponse.json({ sent: 0, message: "All users have animals" });
    }

    // Get emails from auth
    const apiKey = process.env.RESEND_API_KEY;
    let sentCount = 0;

    for (const profile of usersToRemind) {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(profile.id);
      const email = userData?.user?.email;
      if (!email) continue;

      const firstName = profile.full_name?.split(" ")[0] || "ami(e)";

      if (apiKey) {
        try {
          const { Resend } = await import("resend");
          const resend = new Resend(apiKey);
          await resend.emails.send({
            from: "PawlyApp <contact@pawlyapp.ch>",
            to: email,
            subject: "🐾 Ton compagnon t'attend sur PawlyApp !",
            html: `<div style="max-width:500px;margin:0 auto;font-family:-apple-system,sans-serif;background:#1a1225;color:#fff;border-radius:16px;overflow:hidden">
              <div style="background:linear-gradient(135deg,#FBBF24,#F59E0B);padding:32px;text-align:center">
                <h1 style="margin:0;font-size:24px">🐾 ${firstName}, ton animal t'attend !</h1>
              </div>
              <div style="padding:24px">
                <p style="font-size:15px;line-height:1.6;color:#e0e0e0">Salut ${firstName} ! Tu as créé ton compte PawlyApp mais tu n'as pas encore ajouté ton compagnon.</p>
                <p style="font-size:15px;line-height:1.6;color:#e0e0e0">En <strong style="color:#FBBF24">2 minutes</strong>, présente-le à la communauté et trouve des copains de balade près de chez toi.</p>
                <div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:16px;margin:20px 0">
                  <p style="margin:0;font-size:14px;color:#9ca3af">🐕 <strong style="color:#fff">+500 animaux</strong> inscrits en Suisse</p>
                  <p style="margin:8px 0 0;font-size:14px;color:#9ca3af">📍 <strong style="color:#fff">14 cantons</strong> couverts</p>
                  <p style="margin:8px 0 0;font-size:14px;color:#9ca3af">💬 <strong style="color:#fff">Matchs gratuits</strong> pour commencer</p>
                </div>
                <a href="https://pawlyapp.ch/profile/animals/new" style="display:block;padding:14px;background:#FBBF24;color:#fff;text-align:center;border-radius:12px;font-weight:700;font-size:15px;text-decoration:none">Ajouter mon animal →</a>
                <p style="margin-top:16px;font-size:12px;color:#6b7280;text-align:center">Ça prend moins de 2 minutes, promis 🐾</p>
              </div>
              <div style="padding:16px;text-align:center;border-top:1px solid rgba(255,255,255,0.05)">
                <p style="margin:0;font-size:11px;color:#6b7280">PawlyApp — Ton compagnon de sortie en Suisse 🇨🇭</p>
              </div>
            </div>`,
          });
          sentCount++;
        } catch (e) {
          console.warn(`Failed to send reminder to ${email}:`, e);
        }
      } else {
        console.log(`[DRY RUN] Would remind: ${email} (${firstName})`);
        sentCount++;
      }

      // Mark as reminded
      await supabaseAdmin
        .from("profiles")
        .update({ onboarding_reminder_sent: true })
        .eq("id", profile.id);
    }

    return NextResponse.json({ sent: sentCount, total: usersToRemind.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
