import { SupabaseClient } from "@supabase/supabase-js";

const LIMITS = {
  free: { animals: 1, matchesPerDay: 3, messagesPerDay: 10 },
  premium: { animals: 3, matchesPerDay: -1, messagesPerDay: -1 },
  pro: { animals: -1, matchesPerDay: -1, messagesPerDay: -1 },
};

type Plan = "free" | "premium" | "pro";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "jaures.adjamonsi@gmail.com")
  .split(",").map(e => e.trim().toLowerCase()).filter(Boolean);

/** Check if user is admin — bypasses all limits */
export async function isAdmin(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, email")
    .eq("id", userId)
    .single();
  if (!profile) return false;
  return profile.role === "admin" || ADMIN_EMAILS.includes((profile.email || "").toLowerCase());
}

export async function checkAnimalLimit(
  supabase: SupabaseClient,
  userId: string,
  subscription: string
): Promise<{ allowed: boolean; error: string | null }> {
  // Admin bypass
  if (await isAdmin(supabase, userId)) return { allowed: true, error: null };
  const plan = (subscription || "free") as Plan;
  const limit = LIMITS[plan].animals;
  if (limit === -1) return { allowed: true, error: null };

  const { count } = await supabase
    .from("animals")
    .select("*", { count: "exact", head: true })
    .eq("created_by", userId);

  if ((count || 0) >= limit) {
    return {
      allowed: false,
      error: `Limite atteinte : ${limit} animal${limit > 1 ? "x" : ""} max avec le plan ${plan}. Passez à un plan supérieur.`,
    };
  }
  return { allowed: true, error: null };
}

export async function checkMatchLimit(
  supabase: SupabaseClient,
  userId: string,
  subscription: string
): Promise<{ allowed: boolean; error: string | null }> {
  // Admin bypass
  if (await isAdmin(supabase, userId)) return { allowed: true, error: null };
  const plan = (subscription || "free") as Plan;
  const limit = LIMITS[plan].matchesPerDay;
  if (limit === -1) return { allowed: true, error: null };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("matches")
    .select("*", { count: "exact", head: true })
    .eq("sender_user_id", userId)
    .gte("created_at", today.toISOString());

  if ((count || 0) >= limit) {
    return {
      allowed: false,
      error: `Limite atteinte : ${limit} matchs/jour avec le plan gratuit. Passez à PawPlus pour des matchs illimités.`,
    };
  }
  return { allowed: true, error: null };
}

export async function checkMessageLimit(
  supabase: SupabaseClient,
  userId: string,
  subscription: string
): Promise<{ allowed: boolean; error: string | null }> {
  // Admin bypass
  if (await isAdmin(supabase, userId)) return { allowed: true, error: null };
  const plan = (subscription || "free") as Plan;
  const limit = LIMITS[plan].messagesPerDay;
  if (limit === -1) return { allowed: true, error: null };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("sender_id", userId)
    .gte("created_at", today.toISOString());

  if ((count || 0) >= limit) {
    return {
      allowed: false,
      error: `Limite atteinte : ${limit} messages/jour avec le plan gratuit. Passez à PawPlus pour une messagerie illimitée.`,
    };
  }
  return { allowed: true, error: null };
}
