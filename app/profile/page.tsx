import { createClient } from "@/lib/supabase/server";
import { logout } from "../(auth)/actions";
import { CANTONS } from "@/lib/cantons";
import Link from "next/link";

const EMOJI_MAP: Record<string, string> = {
  chien: "🐕",
  chat: "🐱",
  lapin: "🐰",
  oiseau: "🐦",
  rongeur: "🐹",
  autre: "🐾",
};

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: myAnimals } = await supabase
    .from("animals")
    .select("*")
    .eq("created_by", user.id)
    .order("created_at", { ascending: false });

  function formatAge(months: number | null) {
    if (!months) return "Age inconnu";
    if (months < 12) return months + " mois";
    const years = Math.floor(months / 12);
    const rest = months % 12;
    if (rest > 0) return years + " an" + (years > 1 ? "s" : "") + " " + rest + " mois";
    return years + " an" + (years > 1 ? "s" : "");
  }

  function getCantonName(code: string | null) {
    if (!code) return null;
    return CANTONS.find((c) => c.code === code)?.name || code;
  }

  const animals = myAnimals || [];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Mon profil</h1>
          <div className="flex gap-3">
            <Link href="/animals" className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition text-sm font-medium">
              Voir le catalogue
            </Link>
            <form action={logout}>
              <button type="submit" className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl transition text-sm font-medium">
                Se deconnecter
              </button>
            </form>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">{profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : "?"}</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 text-center">{profile?.full_name || "Non renseigne"}</h2>
              <p className="text-gray-500 text-center text-sm mt-1">{profile?.email}</p>

              <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Role</span>
                  <span className="font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs">
                    {profile?.role === "admin" ? "Admin" : "Membre"}
                  </span>
                </div>
                {profile?.city && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Ville</span>
                    <span className="font-medium">{profile.city}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Membre depuis</span>
                  <span className="font-medium">{new Date(profile?.created_at).toLocaleDateString("fr-CH")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Mes compagnons</span>
                  <span className="font-medium">{animals.length}</span>
                </div>
              </div>

              <Link href="/profile/edit" className="block mt-4 text-center text-sm text-orange-500 hover:underline">
                Modifier mon profil
              </Link>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Mes compagnons</h2>
              <Link href="/profile/animals/new" className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition text-sm">
                + Ajouter mon animal
              </Link>
            </div>

            {animals.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                <p className="text-5xl mb-4">🐾</p>
                <p className="text-lg text-gray-600 font-medium">Aucun compagnon enregistre</p>
                <p className="text-gray-400 mt-2">Ajoutez votre premier animal pour commencer les matchs.</p>
                <Link href="/profile/animals/new" className="inline-block mt-6 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition">
                  Ajouter mon animal
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {animals.map((animal: any) => (
                  <div key={animal.id} className="bg-white rounded-2xl shadow-md p-4 flex items-center gap-4">
                    <div className="w-20 h-20 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {animal.photo_url ? (
                        <img src={animal.photo_url} alt={animal.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-3xl">{EMOJI_MAP[animal.species] || "🐾"}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900">{animal.name}</h3>
                        <span className={"text-xs px-2 py-0.5 rounded-full " + (animal.status === "disponible" ? "bg-green-100 text-green-700" : animal.status === "en_cours" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-500")}>
                          {animal.status === "disponible" ? "Disponible" : animal.status === "en_cours" ? "En cours" : "Matche"}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {animal.species.charAt(0).toUpperCase() + animal.species.slice(1)}
                        {animal.breed ? " - " + animal.breed : ""}
                        {" · " + formatAge(animal.age_months)}
                      </p>
                      {(animal.city || animal.canton) && (
                        <p className="text-xs text-gray-400 mt-1">
                          📍 {animal.city || ""}{animal.city && animal.canton ? ", " : ""}{animal.canton ? getCantonName(animal.canton) : ""}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Link href={"/animals/" + animal.id} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition text-xs font-medium">
                        Voir
                      </Link>
                      <Link href={"/animals/" + animal.id + "/edit"} className="px-3 py-2 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-lg transition text-xs font-medium">
                        Modifier
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
