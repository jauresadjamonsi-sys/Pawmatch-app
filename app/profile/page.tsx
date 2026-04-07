import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
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
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .single();

  const { count: animalCount } = await supabase
    .from("animals")
    .select("*", { count: "exact", head: true })
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
  const { data: profile } = await supabase.from("profiles").select("id, email, full_name, avatar_url, city, canton, phone, subscription, role, bio, created_at").eq("id", user.id).single();
  const { data: animals } = await supabase.from("animals").select("id, name, species, breed, age_months, gender, photo_url, canton, city, traits, energy_level, sociability, sterilized, weight_kg, description, created_by, status, created_at").eq("created_by", user.id).order("created_at", { ascending: false });

  // Stats engagement — use "id" instead of "*" for count queries
  const [{ count: matchCount }, { count: messageCount }] = await Promise.all([
    supabase.from("matches").select("id", { count: "exact", head: true }).or(`sender_user_id.eq.${user.id},receiver_user_id.eq.${user.id}`),
    supabase.from("messages").select("id", { count: "exact", head: true }).eq("sender_id", user.id),
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
