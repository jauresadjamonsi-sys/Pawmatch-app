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

    // --- Grant referral reward to the referrer ---

    // Abuse prevention: cap at 10 successful referrals
    const { count: referralCount, error: countError } = await supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("referred_by", referral_code);

    if (countError) {
      console.error("[Referral] Erreur comptage parrainages:", countError);
      // The referred_by was already saved, so we log but don't fail the whole request
    }

    const totalReferrals = referralCount ?? 0;

    if (!countError && totalReferrals <= 10) {
      // Fetch referrer's current subscription info
      const { data: referrerProfile, error: referrerProfileError } = await supabaseAdmin
        .from("profiles")
        .select("subscription, subscription_end")
        .eq("id", referral_code)
        .single();

      if (referrerProfileError) {
        console.error("[Referral] Erreur lecture profil parrain:", referrerProfileError);
      } else {
        const now = new Date();
        let newSubscriptionEnd: Date;

        if (
          referrerProfile.subscription === "premium" &&
          referrerProfile.subscription_end &&
          new Date(referrerProfile.subscription_end) > now
        ) {
          // Already premium and not expired: extend by 30 days
          newSubscriptionEnd = new Date(referrerProfile.subscription_end);
          newSubscriptionEnd.setDate(newSubscriptionEnd.getDate() + 30);
        } else {
          // Not premium or expired: start 30 days from now
          newSubscriptionEnd = new Date(now);
          newSubscriptionEnd.setDate(newSubscriptionEnd.getDate() + 30);
        }

        const { error: rewardError } = await supabaseAdmin
          .from("profiles")
          .update({
            subscription: "premium",
            subscription_end: newSubscriptionEnd.toISOString(),
          })
          .eq("id", referral_code);

        if (rewardError) {
          console.error("[Referral] Erreur attribution premium parrain:", rewardError);
        } else {
          console.log(
            `[Referral] Premium accorde au parrain ${referral_code} jusqu'au ${newSubscriptionEnd.toISOString()} (parrainage #${totalReferrals})`
          );
        }
      }
    } else if (!countError && totalReferrals > 10) {
      console.log(
        `[Referral] Parrain ${referral_code} a atteint le cap de 10 parrainages, pas de premium supplementaire`
      );
    }

    console.log(`[Referral] ${referred_user_id} parraine par ${referral_code}`);
    return NextResponse.json({ success: true, referrer_name: referrer.full_name });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
