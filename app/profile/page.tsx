import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
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
  return (
    <div className="min-h-screen px-6 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center"><span className="text-lg font-bold text-orange-400">C</span></div>
            <div>
              <h1 className="text-2xl font-bold text-white">{profile?.full_name || "Utilisateur"}</h1>
              <p className="text-gray-400 text-sm">{user.email}</p>
              <span className={"inline-block mt-1 text-xs px-3 py-1 rounded-full " + (profile?.subscription === "pro" ? "bg-purple-500/20 text-purple-300" : profile?.subscription === "premium" ? "bg-orange-500/20 text-orange-300" : "bg-white/10 text-gray-400")}>{subLabel}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {profile?.city && (<div className="bg-white/5 rounded-xl p-3"><p className="text-xs text-gray-500">Ville</p><p className="text-sm text-white font-medium">{profile.city}</p></div>)}
            {profile?.phone && (<div className="bg-white/5 rounded-xl p-3"><p className="text-xs text-gray-500">Telephone</p><p className="text-sm text-white font-medium">{profile.phone}</p></div>)}
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/profile/edit" className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-xl transition border border-white/10">Modifier mon profil</Link>
            {permission !== 'granted' && (
              <button onClick={subscribe}
                className="px-4 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 text-sm font-medium rounded-xl transition border border-green-500/20">
                🔔 Activer notifications
              </button>
            )}
            {subscribed && (
              <span className="px-4 py-2 bg-green-500/10 text-green-400 text-sm font-medium rounded-xl border border-green-500/20">
                🔔 Notifications activées
              </span>
            )}
            <Link href="/pricing" className="px-4 py-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 text-sm font-medium rounded-xl transition border border-orange-500/20">{profile?.subscription === "free" ? "Passer Premium" : "Gerer mon plan"}</Link>
            <form action={logout}><button className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium rounded-xl transition border border-red-500/20">Deconnexion</button></form>
          </div>
        </div>
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Mes compagnons</h2>
            <Link href="/profile/animals/new" className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition">+ Ajouter</Link>
          </div>
          {(!animals || animals.length === 0) ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
              <p className="text-3xl mb-3 text-gray-600">+</p>
              <p className="text-gray-400">Aucun compagnon pour le moment</p>
              <Link href="/profile/animals/new" className="inline-block mt-4 text-orange-400 hover:underline text-sm font-medium">Ajouter mon premier compagnon</Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {animals.map((animal) => (
                <Link href={"/animals/" + animal.id} key={animal.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:bg-white/10 transition">
                  <div className="aspect-video bg-[#2a1f3a] flex items-center justify-center overflow-hidden">
                    {animal.photo_url ? (<img src={animal.photo_url} alt={animal.name} className="w-full h-full object-cover" />) : (<span className="text-sm font-medium text-gray-500">{SPECIES[animal.species] || animal.species}</span>)}
                  </div>
                  <div className="p-3">
                    <h3 className="font-bold text-white text-sm">{animal.name}</h3>
                    <p className="text-xs text-gray-500">{animal.breed || SPECIES[animal.species] || animal.species}</p>
                    {animal.canton && <span className="text-[10px] px-2 py-0.5 bg-orange-500/20 text-orange-300 rounded-full">{animal.canton}</span>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
