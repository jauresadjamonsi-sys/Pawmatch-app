import { SupabaseClient } from "@supabase/supabase-js";
import type { PawCoinTxType, PawCoinTransaction } from "@/lib/types";

export async function getWallet(supabase: SupabaseClient, userId: string) {
  const [{ data: profile }, { data: transactions }] = await Promise.all([
    supabase.from("profiles").select("pawcoins").eq("id", userId).single(),
    supabase.from("pawcoin_transactions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
  ]);
  return {
    balance: profile?.pawcoins ?? 0,
    transactions: (transactions || []) as PawCoinTransaction[],
  };
}

export async function addCoins(
  supabase: SupabaseClient,
  userId: string,
  amount: number,
  type: PawCoinTxType,
  description: string,
  referenceId?: string
) {
  // Get current balance
  const { data: profile } = await supabase.from("profiles").select("pawcoins").eq("id", userId).single();
  const currentBalance = profile?.pawcoins ?? 0;
  const newBalance = currentBalance + amount;

  // Update balance + insert transaction
  const [{ error: updateErr }, { error: txErr }] = await Promise.all([
    supabase.from("profiles").update({ pawcoins: newBalance }).eq("id", userId),
    supabase.from("pawcoin_transactions").insert({
      user_id: userId,
      amount,
      type,
      description,
      balance_after: newBalance,
      reference_id: referenceId || null,
    }),
  ]);

  if (updateErr || txErr) return { error: updateErr?.message || txErr?.message || "Error", balance: currentBalance };
  return { error: null, balance: newBalance };
}

export async function spendCoins(
  supabase: SupabaseClient,
  userId: string,
  amount: number,
  type: PawCoinTxType,
  description: string,
  referenceId?: string
) {
  const { data: profile } = await supabase.from("profiles").select("pawcoins").eq("id", userId).single();
  const currentBalance = profile?.pawcoins ?? 0;

  if (currentBalance < amount) {
    return { error: `Solde insuffisant (${currentBalance} coins, ${amount} requis)`, balance: currentBalance };
  }

  const newBalance = currentBalance - amount;

  const [{ error: updateErr }, { error: txErr }] = await Promise.all([
    supabase.from("profiles").update({ pawcoins: newBalance }).eq("id", userId),
    supabase.from("pawcoin_transactions").insert({
      user_id: userId,
      amount: -amount,
      type,
      description,
      balance_after: newBalance,
      reference_id: referenceId || null,
    }),
  ]);

  if (updateErr || txErr) return { error: updateErr?.message || txErr?.message || "Error", balance: currentBalance };
  return { error: null, balance: newBalance };
}

export async function getDailyLoginBonus(supabase: SupabaseClient, userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: existing } = await supabase
    .from("pawcoin_transactions")
    .select("id")
    .eq("user_id", userId)
    .eq("type", "daily_login")
    .gte("created_at", today.toISOString())
    .limit(1);

  if (existing && existing.length > 0) {
    return { claimed: false, error: "Bonus deja reclame aujourd'hui" };
  }

  const result = await addCoins(supabase, userId, 5, "daily_login", "Bonus connexion quotidienne");
  return { claimed: !result.error, ...result };
}

export function getStreakBonus(streakCount: number): number {
  if (streakCount >= 30) return 50;
  if (streakCount >= 14) return 30;
  if (streakCount >= 7) return 15;
  if (streakCount >= 3) return 5;
  return 0;
}
