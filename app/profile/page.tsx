import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import PushButton from "@/lib/components/PushButton";
import ProfileClient from "@/lib/components/ProfileClient";

export const dynamic = "force-dynamic";

const SPECIES: Record<string, string> = { chien: "Chien", chat: "Chat", lapin: "Lapin", oiseau: "Oiseau", rongeur: "Rongeur", autre: "Autre" };

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      title: "Mon profil",
      description: "Connectez-vous pour acceder a votre profil Pawly.",
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url, role, subscription, canton, city, bio, created_at, phone")
    .eq("id", user.id)
    .single();

  const { count: animalCount } = await supabase
    .from("animals")
    .select("id", { count: "exact", head: true })
    .eq("created_by", user.id);

  const name = profile?.full_name || "Mon profil";
  const title = `${name} - Profil`;
  const description = `Profil de ${name} sur Pawly.${animalCount ? ` ${animalCount} ${animalCount === 1 ? "animal enregistre" : "animaux enregistres"}.` : ""} Gerez vos animaux et vos balades.`;

  return {
    title,
    description,
    robots: {
      index: false,
      follow: false,
    },
    openGraph: {
      title: `${name} | Pawly`,
      description,
      siteName: "Pawly",
      locale: "fr_CH",
      type: "profile",
      ...(profile?.avatar_url
        ? {
            images: [
              {
                url: profile.avatar_url,
                width: 200,
                height: 200,
                alt: `${name} sur Pawly`,
              },
            ],
          }
        : {}),
    },
  };
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Try regular server client first (proper auth with cookies)
  let { data: profile } = await supabase.from("profiles").select("id, full_name, email, avatar_url, role, subscription, canton, city, bio, created_at, phone").eq("id", user.id).single();
  let { data: animals } = await supabase.from("animals").select("id, name, species, breed, photo_url, canton, city, gender, age_months, created_by").eq("created_by", user.id).order("created_at", { ascending: false });

  // Fallback: if regular client returned nothing (RLS issue), try admin client
  if (!profile && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const admin = createAdminClient();
      const { data: adminProfile } = await admin.from("profiles").select("id, full_name, email, avatar_url, role, subscription, canton, city, bio, created_at, phone").eq("id", user.id).single();
      const { data: adminAnimals } = await admin.from("animals").select("id, name, species, breed, photo_url, canton, city, gender, age_months, created_by").eq("created_by", user.id).order("created_at", { ascending: false });
      if (adminProfile) profile = adminProfile;
      if (adminAnimals) animals = adminAnimals;
    } catch (e) {
      console.error("[profile] Admin fallback failed:", e);
    }
  }

  // Stats engagement - use whichever client works
  const client = profile ? supabase : (process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : supabase);
  const [{ count: matchCount }, { count: messageCount }] = await Promise.all([
    client.from("matches").select("*", { count: "exact", head: true }).or(`sender_user_id.eq.${user.id},receiver_user_id.eq.${user.id}`),
    client.from("messages").select("*", { count: "exact", head: true }).eq("sender_id", user.id),
  ]);
  const daysSinceJoin = profile?.created_at ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / 86400000) : 0;
  const stats = { matches: matchCount || 0, messages: messageCount || 0, days: daysSinceJoin, animals: (animals || []).length };

  async function logout() { "use server"; const supabase = await createClient(); await supabase.auth.signOut(); redirect("/"); }

  const SUB_LABELS: Record<string, string> = { premium: "PawPlus", pro: "PawPro", free: "Gratuit" };
  const subLabel = SUB_LABELS[profile?.subscription || "free"] || "Gratuit";
  const initials = (profile?.full_name || user.email || "?").charAt(0).toUpperCase();

  return (
    <ProfileClient
      profile={profile}
      animals={animals || []}
      user={{ id: user.id, email: user.email || "" }}
      subLabel={subLabel}
      stats={stats}
      initials={initials}
      logout={logout}
    />
  );
}
