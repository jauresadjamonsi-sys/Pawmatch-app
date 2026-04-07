import { createClient } from "@/lib/supabase/server";
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
          // ENSURE profile exists (fallback if DB trigger didn't fire)
          const { data: existingProfile } = await supabase
            .from("profiles")
            .select("id")
            .eq("id", user.id)
            .single();

          if (!existingProfile) {
            await supabase.from("profiles").insert({
              id: user.id,
              email: user.email,
              full_name: user.user_metadata?.full_name || "",
              role: "adoptant",
              subscription: "free",
            });
          }

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
      } catch {}
      return NextResponse.redirect(origin + "/profile");
    }
  }

  return NextResponse.redirect(origin + "/login?message=Erreur de connexion");
}
