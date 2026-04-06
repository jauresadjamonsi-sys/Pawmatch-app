import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createAuthClient } from "@/lib/supabase/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    // Authentication check
    const supabase = await createAuthClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
    }

    const { referral_code, referred_user_id } = await request.json();

    // Ensure referred_user_id matches the authenticated user
    if (referred_user_id !== user.id) {
      return NextResponse.json({ error: "Non autorise" }, { status: 403 });
    }

    if (!referral_code || !referred_user_id) {
      return NextResponse.json({ error: "referral_code et referred_user_id requis" }, { status: 400 });
    }

    // Don't allow self-referral
    if (referral_code === referred_user_id) {
      return NextResponse.json({ error: "Auto-parrainage non autorise" }, { status: 400 });
    }

    // Validate the referrer exists
    const { data: referrer, error: referrerError } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name")
      .eq("id", referral_code)
      .single();

    if (referrerError || !referrer) {
      return NextResponse.json({ error: "Code de parrainage invalide" }, { status: 404 });
    }

    // Store referred_by on the new user's profile
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ referred_by: referral_code })
      .eq("id", referred_user_id);

    if (updateError) {
      console.error("[Referral] Erreur update:", updateError);
      return NextResponse.json({ error: "Erreur lors de l'enregistrement" }, { status: 500 });
    }

    console.log(`[Referral] ${referred_user_id} parraine par ${referral_code}`);
    return NextResponse.json({ success: true, referrer_name: referrer.full_name });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
