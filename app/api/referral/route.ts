import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { addCoins } from "@/lib/services/pawcoins";

// GET — Return user's referral code + stats
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
    }

    // Referral code = first 8 chars of UUID
    const referralCode = user.id.substring(0, 8);

    // Count how many profiles have referred_by = this user's id
    const { count: referralCount } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("referred_by", user.id);

    // Sum coins earned from referral_bonus transactions
    const { data: txs } = await supabase
      .from("pawcoin_transactions")
      .select("amount")
      .eq("user_id", user.id)
      .eq("type", "referral_bonus");

    const coinsEarned = (txs || []).reduce((sum, tx) => sum + (tx.amount || 0), 0);

    return NextResponse.json({
      referral_code: referralCode,
      referral_count: referralCount || 0,
      coins_earned: coinsEarned,
    });
  } catch (e: any) {
    console.error("[Referral GET]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST — Apply a referral code (new user enters a code)
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
    }

    const { code } = await request.json();

    if (!code || typeof code !== "string" || code.length < 8) {
      return NextResponse.json({ error: "Code de parrainage invalide" }, { status: 400 });
    }

    const normalizedCode = code.trim().toLowerCase();

    // Check if user has already been referred
    const { data: myProfile } = await supabase
      .from("profiles")
      .select("id, referred_by")
      .eq("id", user.id)
      .single();

    if (myProfile?.referred_by) {
      return NextResponse.json({ error: "Tu as deja utilise un code de parrainage" }, { status: 400 });
    }

    // Find the referrer: profile whose id starts with this code
    const { data: referrer } = await supabase
      .from("profiles")
      .select("id, full_name")
      .ilike("id", `${normalizedCode}%`)
      .single();

    if (!referrer) {
      return NextResponse.json({ error: "Code de parrainage introuvable" }, { status: 404 });
    }

    // Prevent self-referral
    if (referrer.id === user.id) {
      return NextResponse.json({ error: "Tu ne peux pas utiliser ton propre code" }, { status: 400 });
    }

    // Store referred_by on the new user's profile
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ referred_by: referrer.id })
      .eq("id", user.id);

    if (updateError) {
      console.error("[Referral POST] Update error:", updateError);
      return NextResponse.json({ error: "Erreur lors de l'enregistrement" }, { status: 500 });
    }

    // Award +20 PawCoins to the referrer
    const referrerResult = await addCoins(
      supabase,
      referrer.id,
      20,
      "referral_bonus",
      `Parrainage de ${myProfile?.id || "un utilisateur"}`,
      user.id
    );

    if (referrerResult.error) {
      console.error("[Referral POST] Referrer coin error:", referrerResult.error);
    }

    // Award +10 PawCoins to the new user
    const newUserResult = await addCoins(
      supabase,
      user.id,
      10,
      "referral_bonus",
      `Bonus parrainage (code de ${referrer.full_name || "un parrain"})`,
      referrer.id
    );

    if (newUserResult.error) {
      console.error("[Referral POST] New user coin error:", newUserResult.error);
    }

    console.log(`[Referral] ${user.id} parraine par ${referrer.id} (+20/+10 PawCoins)`);

    return NextResponse.json({
      success: true,
      referrer_name: referrer.full_name,
      coins_earned: 10,
    });
  } catch (e: any) {
    console.error("[Referral POST]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
