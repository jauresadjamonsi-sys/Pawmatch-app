import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    // Allow system calls with CRON_SECRET, otherwise require authentication
    const authHeader = request.headers.get("authorization");
    const isCronCall = authHeader === `Bearer ${process.env.CRON_SECRET}`;

    if (!isCronCall) {
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return NextResponse.json({ error: "Non autorise" }, { status: 401 });
      }
    }

    const { email, name } = await request.json();
    if (!email) return NextResponse.json({ error: "Email requis" }, { status: 400 });

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Email service non configuré" }, { status: 500 });

    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);

    const firstName = name ? name.split(" ")[0] : "ami(e) des animaux";

    const { data, error } = await resend.emails.send({
      from: "Pawly <contact@pawlyapp.ch>",
      to: email,
      subject: "🐾 Bienvenue sur Pawly !",
      html: `<div style="max-width:500px;margin:0 auto;font-family:-apple-system,sans-serif;background:#1a1225;color:#fff;border-radius:16px;overflow:hidden"><div style="background:linear-gradient(135deg,#f97316,#ea580c);padding:32px;text-align:center"><h1 style="margin:0;font-size:28px">🐾 Bienvenue ${firstName} !</h1><p style="margin:8px 0 0;opacity:0.9;font-size:14px">Ton aventure Pawly commence maintenant</p></div><div style="padding:24px"><h2 style="font-size:18px;color:#f97316;margin-bottom:16px">Tes 3 premières étapes :</h2><div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:16px;margin-bottom:12px"><p style="margin:0;font-size:14px"><strong style="color:#f97316">1️⃣ Ajoute ton animal</strong></p><p style="margin:4px 0 0;font-size:13px;color:#9ca3af">Photo, race, personnalité — crée son profil unique</p></div><div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:16px;margin-bottom:12px"><p style="margin:0;font-size:14px"><strong style="color:#f97316">2️⃣ Fais le test de personnalité</strong></p><p style="margin:4px 0 0;font-size:13px;color:#9ca3af">Découvre le type de ton compagnon et ses copains idéaux</p></div><div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:16px;margin-bottom:12px"><p style="margin:0;font-size:14px"><strong style="color:#f97316">3️⃣ Commence à flairer</strong></p><p style="margin:4px 0 0;font-size:13px;color:#9ca3af">Trouve des copains de balade près de chez toi</p></div><a href="https://pawlyapp.ch/profile/animals/new" style="display:block;margin-top:20px;padding:14px;background:#f97316;color:#fff;text-align:center;border-radius:12px;font-weight:700;font-size:14px;text-decoration:none">Ajouter mon premier animal →</a><div style="margin-top:20px;padding:16px;background:rgba(13,148,136,0.1);border-radius:12px;border:1px solid rgba(13,148,136,0.2)"><p style="margin:0;font-size:12px;color:#0D9488">💡 <strong>Astuce :</strong> Trouve un véto ou toiletteur sur <a href="https://pawdirectory.ch" style="color:#0D9488;font-weight:700">PawDirectory.ch</a></p></div></div><div style="padding:16px;text-align:center;border-top:1px solid rgba(255,255,255,0.05)"><p style="margin:0;font-size:11px;color:#6b7280">Pawly — Ton compagnon de sortie en Suisse 🇨🇭</p></div></div>`,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, id: data?.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
