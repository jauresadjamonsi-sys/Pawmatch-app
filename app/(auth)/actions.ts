"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, ensureProfile } from "@/lib/supabase/admin";

export async function login(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // If email not confirmed → auto-confirm via admin and retry
    if (error.message.includes("Email not confirmed")) {
      try {
        const admin = createAdminClient();
        const { data: profile } = await admin
          .from("profiles")
          .select("id")
          .eq("email", email)
          .single();

        if (profile) {
          await admin.auth.admin.updateUser(profile.id, { email_confirm: true });
          // Retry login after confirming
          const { error: retryError } = await supabase.auth.signInWithPassword({ email, password });
          if (retryError) {
            return { error: "Email ou mot de passe incorrect." };
          }
          // Success — continue below
        } else {
          return { error: "Compte introuvable. Cree un compte d'abord." };
        }
      } catch {
        return { error: "Erreur lors de la confirmation. Reessaie." };
      }
    } else if (error.message.includes("Invalid login credentials")) {
      return { error: "Email ou mot de passe incorrect." };
    } else {
      return { error: error.message };
    }
  }

  // Ensure profile exists (service role = bypasses RLS)
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await ensureProfile(user);

    const { count } = await supabase.from("animals").select("id", { count: "exact", head: true }).eq("created_by", user.id);
    if (!count || count === 0) {
      redirect("/onboarding");
    }
  }

  redirect("/profile");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("fullName") as string;
  const referredBy = formData.get("referred_by") as string | null;

  // Use admin API to create user — auto-confirmed, NO confirmation email needed
  const { data: userData, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      ...(referredBy && { referred_by: referredBy }),
    },
  });

  if (createError) {
    if (
      createError.message.includes("already been registered") ||
      createError.message.includes("already exists") ||
      createError.message.includes("duplicate")
    ) {
      return { error: "Cet email est deja utilise. Essaie de te connecter." };
    }
    return { error: createError.message };
  }

  // Create profile row
  if (userData?.user) {
    await ensureProfile(userData.user);
  }

  // Sign them in immediately (sets session cookie)
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    return { error: signInError.message };
  }

  redirect("/onboarding");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function resetPassword(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(
    formData.get("email") as string,
    { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/reset-password` }
  );

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
