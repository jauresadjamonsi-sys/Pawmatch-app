import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

const CANTONS = ["VD", "GE", "ZH", "BE", "BS", "FR", "LU", "VS"];

export default async function HomePage() {
  const supabase = await createClient();
  const { data: animals } = await supabase
    .from("animals")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(6);

  return (
    <div className="min-h-screen bg-[#0d0a14] text-white">

      {/* Hero */}
      <div className="text-center pt-10 pb-8 px-4">
        <div className="flex justify-center gap-2 mb-6">
          <span className="px-3 py-1 bg-[#1a1225] border border-[#2a1f3a] rounded-full text-xs text-gray-300">🇫🇷</span>
          <span className="px-3 py-1 bg-[#1a1225] border border-[#2a1f3a] rounded-full text-xs text-gray-400">🇩🇪</span>
          <span className="px-3 py-1 bg-[#1a1225] border border-[#2a1f3a] rounded-full text-xs text-gray-400">🇬🇧</span>
        </div>

        <div className="text-5xl mb-4 opacity-20">🐾</div>

        <h1 className="text-4xl font-bold mb-2">
          <span className="text-orange-400">Compaw</span>
        </h1>
        <p className="text-gray-400 text-sm mb-6">
          Ton compagnon de sortie en Suisse
        </p>

        {/* Canton badges */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {CANTONS.map((c) => (
            <span key={c} className="px-3 py-1 bg-[#1a1225] border border-[#2a1f3a] rounded-full text-xs font-medium text-gray-300">
              {c}
            </span>
          ))}
        </div>
      </div>

      {/* Recemment actifs */}
      {animals && animals.length > 0 && (
        <div className="px-6 mb-8">
          <h2 className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-4">Recemment actifs</h2>
          <div className="flex gap-5 overflow-x-auto pb-2">
            {animals.map((animal) => (
              <Link href={"/animals/" + animal.id} key={animal.id} className="flex flex-col items-center flex-shrink-0">
                <div className="w-16 h-16 rounded-full bg-[#1a1225] border-[2.5px] border-orange-500 flex items-center justify-center overflow-hidden mb-2">
                  {animal.photo_url ? (
                    <img src={animal.photo_url} alt={animal.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold text-gray-500">{animal.name?.charAt(0)}</span>
                  )}
                </div>
                <p className="text-xs text-white font-medium">{animal.name}</p>
                {animal.canton && (
                  <span className="text-[10px] px-2 py-0.5 bg-orange-500/20 text-orange-300 rounded-full mt-1">{animal.canton}</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Categories */}
      <div className="px-6 mb-8">
        <div className="grid grid-cols-2 gap-3">
          <Link href="/flairer" className="bg-[#1a1225] border border-[#2a1f3a] rounded-2xl p-5 active:scale-95 transition-transform">
            <h3 className="font-bold text-white text-sm">Flairer</h3>
            <p className="text-xs text-gray-500 mt-1">Swipe & match</p>
          </Link>
          <Link href="/animals" className="bg-[#1a1225] border border-[#2a1f3a] rounded-2xl p-5 active:scale-95 transition-transform">
            <h3 className="font-bold text-white text-sm">Explorer</h3>
            <p className="text-xs text-gray-500 mt-1">Tous les profils</p>
          </Link>
          <Link href="/pricing" className="bg-[#1a1225] border border-[#2a1f3a] rounded-2xl p-5 active:scale-95 transition-transform">
            <h3 className="font-bold text-white text-sm">Premium</h3>
            <p className="text-xs text-gray-500 mt-1">Matchs illimites</p>
          </Link>
          <Link href="/signup" className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-5 active:scale-95 transition-transform">
            <h3 className="font-bold text-orange-400 text-sm">Rejoindre</h3>
            <p className="text-xs text-orange-300/60 mt-1">Creer mon profil</p>
          </Link>
        </div>
      </div>

      {/* Comment ca marche */}
      <div className="px-6 mb-8">
        <h2 className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-4">Comment ca marche</h2>
        <div className="space-y-3">
          <div className="bg-[#1a1225] border border-[#2a1f3a] rounded-2xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-400 font-bold text-sm flex-shrink-0">1</div>
            <div>
              <h3 className="font-semibold text-white text-sm">Cree ton profil</h3>
              <p className="text-xs text-gray-500">Ajoute ton compagnon avec sa race et son caractere</p>
            </div>
          </div>
          <div className="bg-[#1a1225] border border-[#2a1f3a] rounded-2xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-400 font-bold text-sm flex-shrink-0">2</div>
            <div>
              <h3 className="font-semibold text-white text-sm">Flaire les profils</h3>
              <p className="text-xs text-gray-500">Swipe pour montrer ton interet ou passer</p>
            </div>
          </div>
          <div className="bg-[#1a1225] border border-[#2a1f3a] rounded-2xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-400 font-bold text-sm flex-shrink-0">3</div>
            <div>
              <h3 className="font-semibold text-white text-sm">Rencontre et sors</h3>
              <p className="text-xs text-gray-500">Organisez votre premiere balade ensemble</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="px-6 mb-8">
        <div className="bg-gradient-to-r from-orange-500/20 to-orange-600/10 border border-orange-500/30 rounded-2xl p-6 text-center">
          <h2 className="text-lg font-bold text-white mb-2">Pret a trouver ton pote ?</h2>
          <p className="text-xs text-gray-400 mb-4">Gratuit pour commencer. 26 cantons. Toutes les especes.</p>
          <Link href="/signup" className="inline-block px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-full transition text-sm">
            Commencer
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-6 border-t border-[#1a1225]">
        <p className="text-gray-600 text-xs mb-2">2026 Compaw — Suisse</p>
        <div className="flex justify-center gap-4">
          <Link href="/pricing" className="text-xs text-gray-500 hover:text-orange-400 transition">Tarifs</Link>
          <Link href="/animals" className="text-xs text-gray-500 hover:text-orange-400 transition">Catalogue</Link>
          <Link href="/legal/cgu" className="text-xs text-gray-500 hover:text-orange-400 transition">CGU</Link>
          <Link href="/legal/privacy" className="text-xs text-gray-500 hover:text-orange-400 transition">Confidentialite</Link>
        </div>
      </div>
    </div>
  );
}
