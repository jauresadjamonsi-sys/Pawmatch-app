import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import PushButton from "@/lib/components/PushButton";
import ProfileClient from "@/lib/components/ProfileClient";

const SPECIES: Record<string, string> = { chien: "Chien", chat: "Chat", lapin: "Lapin", oiseau: "Oiseau", rongeur: "Rongeur", autre: "Autre" };

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const { data: animals } = await supabase.from("animals").select("*").eq("created_by", user.id).order("created_at", { ascending: false });

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
      initials={initials}
      logout={logout}
    />
  );
}
