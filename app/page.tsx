import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();

  const { count: animalCount } = await supabase
    .from("animals")
    .select("*", { count: "exact", head: true })
    .eq("status", "disponible");

  const { count: userCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });

  const { count: dogCount } = await supabase
    .from("animals")
    .select("*", { count: "exact", head: true })
    .eq("species", "chien");

  const { count: catCount } = await supabase
    .from("animals")
    .select("*", { count: "exact", head: true })
    .eq("species", "chat");

  const { count: otherCount } = await supabase
    .from("animals")
    .select("*", { count: "exact", head: true })
    .not("species", "in", '("chien","chat")');

  const { data: recentAnimals } = await supabase
    .from("animals")
    .select("*")
    .eq("status", "disponible")
    .order("created_at", { ascending: false })
    .limit(3);

  const EMOJI_MAP: Record<string, string> = {
    chien: "🐕", chat: "🐱", lapin: "🐰",
    oiseau: "🐦", rongeur: "🐹", autre: "🐾",
  };

  function formatAge(months: number | null) {
    if (!months) return "Âge inconnu";
    if (months < 12) return months + " mois";
    const years = Math.floor(months / 12);
    return years + " an" + (years > 1 ? "s" : "");
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-orange-50 via-white to-amber-50">
        <div className="max-w-6xl mx-auto px-6 py-20 lg:py-28">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-5xl lg:text-7xl font-extrabold text-gray-900 leading-tight">
              Ton prochain
              <span className="text-orange-500"> pote</span>
              <br />t'attend ici.
            </h1>
            <p className="mt-6 text-xl text-gray-600 leading-relaxed">
              Compaw connecte les propriétaires d'animaux de toute la Suisse.
              Trouvez des compagnons de jeu, des partenaires de balade
              ou simplement des amis qui partagent votre passion.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <span className="px-4 py-2 bg-white rounded-full text-sm text-gray-600 shadow-sm border border-gray-100">
                🇫🇷 Trouve ton pote
              </span>
              <span className="px-4 py-2 bg-white rounded-full text-sm text-gray-600 shadow-sm border border-gray-100">
                🇩🇪 Finde deinen Kumpel
              </span>
              <span className="px-4 py-2 bg-white rounded-full text-sm text-gray-600 shadow-sm border border-gray-100">
                🇮🇹 Trova il tuo compagno
              </span>
              <span className="px-4 py-2 bg-white rounded-full text-sm text-gray-600 shadow-sm border border-gray-100">
                🇨🇭 Chatta tes cumpogn
              </span>
            </div>

            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup" className="px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl text-lg transition shadow-lg shadow-orange-200">
                Rejoindre Compaw
              </Link>
              <Link href="/animals" className="px-8 py-4 bg-white hover:bg-gray-50 text-gray-800 font-bold rounded-2xl text-lg transition border-2 border-gray-200">
                Découvrir les profils
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-5 gap-4 max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100">
              <p className="text-2xl font-extrabold text-orange-500">{userCount || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Membres</p>
            </div>
            <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100">
              <p className="text-2xl font-extrabold text-orange-500">{animalCount || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Compagnons</p>
            </div>
            <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100">
              <p className="text-2xl font-extrabold text-amber-500">{dogCount || 0} 🐕</p>
              <p className="text-xs text-gray-500 mt-1">Chiens</p>
            </div>
            <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100">
              <p className="text-2xl font-extrabold text-rose-500">{catCount || 0} 🐱</p>
              <p className="text-xs text-gray-500 mt-1">Chats</p>
            </div>
            <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-100 col-span-2 md:col-span-1">
              <p className="text-2xl font-extrabold text-emerald-500">{otherCount || 0} 🐾</p>
              <p className="text-xs text-gray-500 mt-1">Autres</p>
            </div>
          </div>
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="py-20 bg-gradient-to-b from-amber-50 to-white">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Comment ça marche</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-sm text-center border border-orange-100">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-amber-300 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📝</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">1. Créez votre profil</h3>
              <p className="text-gray-600 text-sm">Inscrivez-vous et ajoutez vos compagnons avec leurs traits de caractère, photos et localisation.</p>
            </div>
            <div className="bg-white rounded-2xl p-8 shadow-sm text-center border border-orange-100">
              <div className="w-16 h-16 bg-gradient-to-br from-rose-400 to-pink-300 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🔍</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">2. Explorez</h3>
              <p className="text-gray-600 text-sm">Parcourez les profils par espèce, canton ou traits de caractère pour trouver le match idéal.</p>
            </div>
            <div className="bg-white rounded-2xl p-8 shadow-sm text-center border border-orange-100">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-300 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🤝</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">3. Connectez-vous</h3>
              <p className="text-gray-600 text-sm">Entrez en contact avec les propriétaires, organisez des rencontres et agrandissez votre cercle.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Derniers profils */}
      {recentAnimals && recentAnimals.length > 0 && (
        <section className="py-20">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex items-center justify-between mb-12">
              <h2 className="text-3xl font-bold text-gray-900">Nouveaux profils</h2>
              <Link href="/animals" className="text-orange-500 hover:underline font-medium">
                Voir tout →
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {recentAnimals.map((animal: any) => (
                <Link key={animal.id} href={"/animals/" + animal.id} className="bg-white rounded-2xl shadow-md hover:shadow-lg transition overflow-hidden group border border-gray-100">
                  <div className="h-48 bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center">
                    {animal.photo_url ? (
                      <img src={animal.photo_url} alt={animal.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-6xl">{EMOJI_MAP[animal.species] || "🐾"}</span>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-orange-500 transition">{animal.name}</h3>
                    <p className="text-gray-500 text-sm mt-1">
                      {animal.species.charAt(0).toUpperCase() + animal.species.slice(1)}
                      {animal.breed ? " · " + animal.breed : ""}
                      {" · " + formatAge(animal.age_months)}
                    </p>
                    {animal.canton && (
                      <p className="text-gray-400 text-xs mt-2">📍 {animal.city ? animal.city + ", " : ""}{animal.canton}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Pour tous les compagnons */}
      <section className="py-20 bg-gradient-to-b from-white to-orange-50">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Pour tous les compagnons</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { emoji: "🐕", label: "Chiens", bg: "from-orange-400 to-amber-300" },
              { emoji: "🐱", label: "Chats", bg: "from-rose-400 to-pink-300" },
              { emoji: "🐰", label: "Lapins", bg: "from-violet-400 to-purple-300" },
              { emoji: "🐦", label: "Oiseaux", bg: "from-sky-400 to-cyan-300" },
              { emoji: "🐹", label: "Rongeurs", bg: "from-emerald-400 to-teal-300" },
              { emoji: "🐾", label: "Et plus", bg: "from-amber-400 to-yellow-300" },
            ].map((item) => (
              <Link key={item.label} href="/animals" className="group">
                <div className={"rounded-2xl p-6 text-center shadow-sm hover:shadow-md transition bg-gradient-to-br " + item.bg}>
                  <span className="text-4xl drop-shadow-sm">{item.emoji}</span>
                  <p className="mt-3 font-bold text-white text-sm">{item.label}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-20 bg-gradient-to-br from-orange-500 to-amber-500">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">Prêt à trouver ton pote ?</h2>
          <p className="text-xl text-orange-100 mb-8">
            Rejoignez la communauté Compaw et connectez vos compagnons
            avec d'autres passionnés près de chez vous.
          </p>
          <Link href="/signup" className="inline-block px-10 py-4 bg-white hover:bg-gray-50 text-orange-600 font-bold rounded-2xl text-lg transition shadow-lg">
            Créer mon compte gratuitement
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <p className="text-white font-bold text-xl">Compaw</p>
              <p className="text-sm mt-1">Connecter les passionnés d'animaux en Suisse</p>
            </div>
            <div className="flex gap-6 text-sm">
              <Link href="/animals" className="hover:text-white transition">Catalogue</Link>
              <Link href="/login" className="hover:text-white transition">Connexion</Link>
              <Link href="/signup" className="hover:text-white transition">Inscription</Link>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-xs">
            <p>© 2026 Compaw. Fait avec amour en Suisse 🇨🇭</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
