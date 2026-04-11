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
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Email service non configure" }, { status: 500 });

    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);

    // Users inactive for 3+ days
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const { data: inactiveUsers, error: usersError } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name")
      .lt("created_at", threeDaysAgo);

    if (usersError) {
      console.error("[Digest] Erreur fetch users:", usersError);
      return NextResponse.json({ error: usersError.message }, { status: 500 });
    }

    if (!inactiveUsers || inactiveUsers.length === 0) {
      return NextResponse.json({ sent: 0, message: "Aucun utilisateur inactif" });
    }

    let sent = 0;
    let errors = 0;

    for (const user of inactiveUsers) {
      if (!user.email) continue;

      // Count new animals in user's canton (last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      let newAnimalsCount = 0;
      if (user.canton) {
        const { count } = await supabaseAdmin
          .from("animals")
          .select("*", { count: "exact", head: true })
          .eq("canton", user.canton)
          .gte("created_at", sevenDaysAgo);
        newAnimalsCount = count || 0;
      }

      // Count potential matches
      const { count: matchCount } = await supabaseAdmin
        .from("animals")
        .select("*", { count: "exact", head: true })
        .neq("created_by", user.id)
        .eq("status", "disponible");
      const potentialMatches = matchCount || 0;

      // Next event
      const { data: nextEvent } = await supabaseAdmin
        .from("events")
        .select("title, date, city")
        .gte("date", new Date().toISOString())
        .order("date", { ascending: true })
        .limit(1)
        .maybeSingle();

      const firstName = user.full_name ? user.full_name.split(" ")[0] : "ami(e) des animaux";

      const eventSection = nextEvent
        ? `<div style="background:rgba(13,148,136,0.1);border-radius:12px;padding:16px;margin-bottom:12px;border:1px solid rgba(13,148,136,0.2)">
            <p style="margin:0;font-size:14px;color:#0D9488"><strong>Prochain evenement</strong></p>
            <p style="margin:4px 0 0;font-size:13px;color:#d1d5db">${nextEvent.title} — ${nextEvent.city || ""} le ${new Date(nextEvent.date).toLocaleDateString("fr-CH")}</p>
          </div>`
        : "";

      const html = `<div style="max-width:500px;margin:0 auto;font-family:-apple-system,sans-serif;background:#1a1225;color:#fff;border-radius:16px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#FBBF24,#F59E0B);padding:32px;text-align:center">
          <h1 style="margin:0;font-size:24px">Tu nous manques ${firstName} !</h1>
          <p style="margin:8px 0 0;opacity:0.9;font-size:14px">Voici ce que tu as manque cette semaine</p>
        </div>
        <div style="padding:24px">
          ${newAnimalsCount > 0 ? `<div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:16px;margin-bottom:12px">
            <p style="margin:0;font-size:14px"><strong style="color:#FBBF24">${newAnimalsCount} nouveaux animaux</strong> dans ton canton</p>
            <p style="margin:4px 0 0;font-size:13px;color:#9ca3af">De nouveaux compagnons t'attendent !</p>
          </div>` : ""}
          <div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:16px;margin-bottom:12px">
            <p style="margin:0;font-size:14px"><strong style="color:#FBBF24">${potentialMatches} matchs potentiels</strong> t'attendent</p>
            <p style="margin:4px 0 0;font-size:13px;color:#9ca3af">Reviens flairer pour trouver le copain ideal</p>
          </div>
          ${eventSection}
          <a href="https://pawband.ch/flairer" style="display:block;margin-top:20px;padding:14px;background:#FBBF24;color:#fff;text-align:center;border-radius:12px;font-weight:700;font-size:14px;text-decoration:none">Revenir flairer</a>
          <p style="margin-top:16px;text-align:center;font-size:11px;color:#6b7280">
            <a href="https://pawband.ch/profile" style="color:#6b7280;text-decoration:underline">Se desabonner</a>
          </p>
        </div>
        <div style="padding:16px;text-align:center;border-top:1px solid rgba(255,255,255,0.05)">
          <p style="margin:0;font-size:11px;color:#6b7280">Pawband — Ton compagnon de sortie en Suisse</p>
        </div>
      </div>`;

      const { error: sendError } = await resend.emails.send({
        from: "Pawband <contact@pawband.ch>",
        to: user.email,
        subject: `${firstName}, ${potentialMatches} compagnons t'attendent !`,
        html,
      });

      if (sendError) {
        console.error(`[Digest] Erreur envoi a ${user.email}:`, sendError);
        errors++;
      } else {
        sent++;
      }
    }

    return NextResponse.json({ sent, errors, total: inactiveUsers.length });
  } catch (e: any) {
    console.error("[Digest] Erreur:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
