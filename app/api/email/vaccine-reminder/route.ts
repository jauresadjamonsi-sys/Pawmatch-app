import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  // Auth: CRON_SECRET required
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Email service non configuré" }, { status: 500 });

    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);

    // Animals with vaccine due within 7 days
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const { data: animals, error: animalsError } = await supabaseAdmin
      .from("animals")
      .select("id, name, next_vaccine_date, created_by")
      .gte("next_vaccine_date", now.toISOString().split("T")[0])
      .lte("next_vaccine_date", sevenDaysFromNow.toISOString().split("T")[0]);

    if (animalsError) {
      console.error("[Vaccine] Erreur fetch animals:", animalsError);
      return NextResponse.json({ error: animalsError.message }, { status: 500 });
    }

    if (!animals || animals.length === 0) {
      return NextResponse.json({ sent: 0, message: "Aucun rappel vaccin a envoyer" });
    }

    let sent = 0;
    let errors = 0;

    for (const animal of animals) {
      if (!animal.created_by) continue;

      // Get owner profile
      const { data: owner } = await supabaseAdmin
        .from("profiles")
        .select("email, full_name")
        .eq("id", animal.created_by)
        .single();

      if (!owner?.email) continue;

      const vaccineDate = new Date(animal.next_vaccine_date);
      const daysUntil = Math.ceil((vaccineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const dateStr = vaccineDate.toLocaleDateString("fr-CH", { day: "numeric", month: "long", year: "numeric" });
      const firstName = owner.full_name ? owner.full_name.split(" ")[0] : "cher propriétaire";

      const html = `<div style="max-width:500px;margin:0 auto;font-family:-apple-system,sans-serif;background:#1a1225;color:#fff;border-radius:16px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#0D9488,#0f766e);padding:32px;text-align:center">
          <h1 style="margin:0;font-size:24px">Rappel vaccin</h1>
          <p style="margin:8px 0 0;opacity:0.9;font-size:14px">Pour ${animal.name}</p>
        </div>
        <div style="padding:24px">
          <p style="font-size:14px;color:#d1d5db;margin-bottom:16px">Bonjour ${firstName},</p>
          <div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:16px;margin-bottom:16px">
            <p style="margin:0;font-size:16px;text-align:center">
              <strong style="color:#0D9488">Vaccin de ${animal.name}</strong>
            </p>
            <p style="margin:8px 0 0;font-size:24px;text-align:center;font-weight:900;color:#FBBF24">
              dans ${daysUntil} jour${daysUntil > 1 ? "s" : ""}
            </p>
            <p style="margin:8px 0 0;font-size:13px;text-align:center;color:#9ca3af">${dateStr}</p>
          </div>
          <p style="font-size:13px;color:#9ca3af;margin-bottom:20px">
            N'oublie pas de prendre rendez-vous chez ton vétérinaire. Tu peux trouver un vétérinaire proche de chez toi sur PawDirectory.
          </p>
          <a href="https://pawdirectory.ch" style="display:block;margin-bottom:12px;padding:14px;background:#0D9488;color:#fff;text-align:center;border-radius:12px;font-weight:700;font-size:14px;text-decoration:none">Trouver un vétérinaire</a>
          <a href="https://pawband.ch/profile" style="display:block;padding:14px;background:rgba(255,255,255,0.05);color:#d1d5db;text-align:center;border-radius:12px;font-weight:600;font-size:14px;text-decoration:none;border:1px solid rgba(255,255,255,0.1)">Voir mon profil</a>
        </div>
        <div style="padding:16px;text-align:center;border-top:1px solid rgba(255,255,255,0.05)">
          <p style="margin:0;font-size:11px;color:#6b7280">Pawband — Ton compagnon de sortie en Suisse</p>
        </div>
      </div>`;

      const { error: sendError } = await resend.emails.send({
        from: "Pawband <contact@pawband.ch>",
        to: owner.email,
        subject: `Rappel : vaccin de ${animal.name} dans ${daysUntil} jour${daysUntil > 1 ? "s" : ""}`,
        html,
      });

      if (sendError) {
        console.error(`[Vaccine] Erreur envoi a ${owner.email}:`, sendError);
        errors++;
      } else {
        sent++;
      }
    }

    return NextResponse.json({ sent, errors, total: animals.length });
  } catch (e: any) {
    console.error("[Vaccine] Erreur:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
