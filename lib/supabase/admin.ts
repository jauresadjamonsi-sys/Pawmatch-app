import { createClient } from "@supabase/supabase-js";

/**
 * Supabase admin client using SERVICE_ROLE_KEY.
 * Bypasses RLS — use only on server-side for trusted operations.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Ensures a profile row exists for the given user.
 * Uses service role key to bypass RLS.
 */
export async function ensureProfile(user: { id: string; email?: string; user_metadata?: any }) {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .single();

  if (!existing) {
    const { error } = await admin.from("profiles").insert({
      id: user.id,
      email: user.email || "",
      full_name: user.user_metadata?.full_name || "",
      role: "adoptant",
      subscription: "free",
    });
    if (error) {
      console.error("ensureProfile INSERT failed:", error.message);
    }
    return { created: true, error };
  }

  return { created: false, error: null };
}
