import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Envoyer email de bienvenue (fire and forget)
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          fetch(origin + "/api/email/welcome", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: user.email, name: user.user_metadata?.full_name || "" }),
          }).catch(() => {});
        }
        // Redirect to onboarding if user has no animals yet
        if (user) {
          const { count } = await supabase.from("animals").select("*", { count: "exact", head: true }).eq("created_by", user.id);
          if (!count || count === 0) {
            return NextResponse.redirect(origin + "/onboarding");
          }
        }
      } catch {}
      return NextResponse.redirect(origin + "/profile");
    }
  }

  return NextResponse.redirect(origin + "/login?message=Erreur de connexion");
}
