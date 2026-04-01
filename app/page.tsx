import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

const EMOJI_MAP: Record<string, string> = {
  chien: "🐕", chat: "🐱", lapin: "🐰",
  oiseau: "🐦", rongeur: "🐹", autre: "🐾",
};

const CANTONS = ["VD", "GE", "ZH", "BE", "BS", "FR", "LU", "VS", "TI", "SG"];

export default async function HomePage() {
  const supabase = await createClient();

  const { count: totalMembers } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });

  const { data: animals } = await supabase
    .from("animals")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(6);

  const { count: totalAnimals } = await supabase
    .from("animals")
    .select("*", { count: "exact", head: true });

  return (
    <div className="min-h-screen bg-[#1a1225] text-white">
      {/* Hero */}
      <div className="text-center pt-12 pb-8 px-4">
        <div className="flex justify-center mb-4">
          <span className="text-6xl opacity-30">🐾</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-3">
          <span className="text-orange-400">Compaw</span>
        </h1>
        <p className="text-gray-400 text-lg mb-6">
          Ton compagnon de sortie en Suisse
        </p>

        {/* Language badges */}
        <div className="flex justify-center gap-2 mb-8">
          <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-gray-300">🇫🇷 Trouve ton pote</span>
          <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-gray-300">🇩🇪 Finde deinen Kumpel</span>
          <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-gray-300">🇮🇹 Trova il tuo compagno</span>
        </div>

        {/* CTA */}
        <div className="flex justify-center gap-3 mb-8">
          <Link href="/signup" className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition">
            Rejoindre Compaw
          </Link>
          <Link href="/animals" className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition border border-white/10">
            Découvrir les profils
          </Link>
        </div>

        {/* Canton badges */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {CANTONS.map((canton) => (
            <span key={canton} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-medium text-gray-300">
              {canton}
            </span>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="flex justify-center gap-8 mb-10 px-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-orange-400">{totalMembers || 0}</p>
          <p className="text-xs text-gray-500">membres</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-orange-400">{totalAnimals || 0}</p>
          <p className="text-xs text-gray-500">compagnons</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-orange-400">26</p>
          <p className="text-xs text-gray-500">cantons</p>
        </div>
      </div>

      {/* Récemment actifs */}
      {animals && animals.length > 0 && (
        <div className="px-6 mb-10">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Récemment actifs</h2>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {animals.map((animal) => (
              <Link href={"/animals/" + animal.id} key={animal.id} className="flex flex-col items-center flex-shrink-0">
                <div className="w-16 h-16 rounded-full bg-[#2a1f3a] border-2 border-orange-400 flex items-center justify-center overflow-hidden mb-2">
                  {animal.photo_url ? (
                    <img src={animal.photo_url} alt={animal.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl">{EMOJI_MAP[animal.species] || "🐾"}</span>
                  )}
                </div>
                <p className="text-xs text-white font-medium">{animal.name}</p>
                {animal.canton && (
                  <span className="text-[10px] px-2 py-0.5 bg-orange-500/20 text-orange-300 rounded-full mt-1">
                    {animal.canton}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Categories */}
      <div className="px-6 mb-10">
        <div className="grid grid-cols-2 gap-3">
          <Link href="/animals" className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition">
            <span className="text-2xl mb-2 block">🏔️</span>
            <h3 className="font-bold text-white text-sm">Montagne</h3>
            <p className="text-xs text-gray-500">Alpages & sentiers</p>
          </Link>
          <Link href="/animals" className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition">
            <span className="text-2xl mb-2 block">🏞️</span>
            <h3 className="font-bold text-white text-sm">Lac</h3>
            <p className="text-xs text-gray-500">Lacs suisses</p>
          </Link>
          <Link href="/animals" className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition">
            <span className="text-2xl mb-2 block">📍</span>
            <h3 className="font-bold text-white text-sm">Carte</h3>
            <p className="text-xs text-gray-500">Animaux proches</p>
          </Link>
          <Link href="/animals" className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition">
            <span className="text-2xl mb-2 block">👥</span>
            <h3 className="font-bold text-white text-sm">Groupes</h3>
            <p className="text-xs text-gray-500">Communautés 🇨🇭</p>
          </Link>
        </div>
      </div>

      {/* Comment ça marche */}
      <div className="px-6 mb-10">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Comment ça marche</h2>
        <div className="space-y-3">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-4">
            <span className="text-3xl">📝</span>
            <div>
              <h3 className="font-bold text-white text-sm">1. Crée ton profil</h3>
              <p className="text-xs text-gray-400">Ajoute ton compagnon avec ses traits de caractère</p>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-4">
            <span className="text-3xl">👃</span>
            <div>
              <h3 className="font-bold text-white text-sm">2. Flaire les profils</h3>
              <p className="text-xs text-gray-400">Découvre les compagnons compatibles autour de toi</p>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-4">
            <span className="text-3xl">🤝</span>
            <div>
              <h3 className="font-bold text-white text-sm">3. Matche & rencontre</h3>
              <p className="text-xs text-gray-400">Organise des sorties et fais-toi de nouveaux potes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-8 border-t border-white/5">
        <p className="text-gray-600 text-xs">© 2026 Compaw — Ton compagnon de sortie en Suisse</p>
        <div className="flex justify-center gap-4 mt-3">
          <Link href="/pricing" className="text-xs text-gray-500 hover:text-orange-400 transition">Tarifs</Link>
          <Link href="/animals" className="text-xs text-gray-500 hover:text-orange-400 transition">Catalogue</Link>
          <Link href="/login" className="text-xs text-gray-500 hover:text-orange-400 transition">Connexion</Link>
          <Link href="/legal/cgu" className="text-xs text-gray-500 hover:text-orange-400 transition">CGU</Link>
          <Link href="/legal/privacy" className="text-xs text-gray-500 hover:text-orange-400 transition">Confidentialité</Link>
        </div>
      </div>
    </div>
  );
}
