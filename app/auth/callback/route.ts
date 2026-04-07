import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Create profile if missing (uses service role = bypasses RLS)
          await ensureProfile(user);

          // Send welcome email (fire and forget)
          if (user.email) {
            fetch(origin + "/api/email/welcome", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: user.email, name: user.user_metadata?.full_name || "" }),
            }).catch(() => {});
          }

          // Redirect to onboarding if user has no animals yet
          const { count } = await supabase.from("animals").select("id", { count: "exact", head: true }).eq("created_by", user.id);
          if (!count || count === 0) {
            return NextResponse.redirect(origin + "/onboarding");
          }
        }
      } catch (e) {
        console.error("Auth callback error:", e);
      }
      return NextResponse.redirect(origin + "/profile");
    }
  }

  return NextResponse.redirect(origin + "/login?message=Erreur de connexion");
}
