"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/supabase/admin";

export async function login(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  });

  if (error) {
    if (error.message.includes("Email not confirmed")) {
      return { error: "Ton email n'est pas encore confirme. Verifie ta boite mail (et les spams) pour le lien de confirmation." };
    }
    if (error.message.includes("Invalid login credentials")) {
      return { error: "Email ou mot de passe incorrect." };
    }
    return { error: error.message };
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

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("fullName") as string;
  const referredBy = formData.get("referred_by") as string | null;

  const { data: signupData, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        ...(referredBy && { referred_by: referredBy }),
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  // If user is immediately confirmed (no email confirmation),
  // create profile and go to onboarding
  if (signupData?.user && signupData.session) {
    await ensureProfile(signupData.user);
    redirect("/onboarding");
  }

  redirect("/login?message=Verifie ton email pour confirmer ton compte");
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
