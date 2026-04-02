import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

const EMOJI_MAP: Record<string, string> = {
  chien: "🐕", chat: "🐱", lapin: "🐰",
  oiseau: "🐦", rongeur: "🐹", autre: "🐾",
};

export default async function HomePage() {
  const supabase = await createClient();
  const { data: animals } = await supabase
    .from("animals")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(6);

  const { count: totalAnimals } = await supabase.from("animals").select("*", { count: "exact", head: true });
  const { count: totalProfiles } = await supabase.from("profiles").select("*", { count: "exact", head: true });

  return (
    <div className="min-h-screen bg-[#0d0a14] text-white overflow-hidden">

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pawBounceLeft {
          0%, 100% { transform: rotate(-15deg) translateY(0); opacity: 0.3; }
          50% { transform: rotate(-15deg) translateY(-12px); opacity: 0.6; }
        }
        @keyframes pawBounceRight {
          0%, 100% { transform: rotate(15deg) translateY(-12px); opacity: 0.3; }
          50% { transform: rotate(15deg) translateY(0); opacity: 0.6; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .paw-left { animation: pawBounceLeft 2s ease-in-out infinite; }
        .paw-right { animation: pawBounceRight 2s ease-in-out infinite; }
        .fade-in-up { animation: fadeInUp 0.8s ease-out forwards; }
        .fade-in-up-delay-1 { animation: fadeInUp 0.8s ease-out 0.15s forwards; opacity: 0; }
        .fade-in-up-delay-2 { animation: fadeInUp 0.8s ease-out 0.3s forwards; opacity: 0; }
        .fade-in-up-delay-3 { animation: fadeInUp 0.8s ease-out 0.45s forwards; opacity: 0; }
        .pulse-slow { animation: pulse 3s ease-in-out infinite; }
        .slide-in { animation: slideIn 0.6s ease-out forwards; }
        .glow-orange { box-shadow: 0 0 30px rgba(249,115,22,0.15); }
        .card-hover { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .card-hover:active { transform: scale(0.97); }
      `}} />

      {/* Glow background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-orange-500/5 rounded-full blur-3xl" />
      </div>

      {/* Hero */}
      <div className="relative text-center pt-10 pb-8 px-4">
        <div className="flex justify-center gap-2 mb-6 fade-in-up">
          <span className="px-3 py-1.5 bg-[#1a1225] border border-orange-500/20 rounded-full text-xs text-orange-300 font-medium">🇫🇷 Français</span>
          <span className="px-3 py-1.5 bg-[#1a1225] border border-[#2a1f3a] rounded-full text-xs text-gray-400">🇩🇪</span>
          <span className="px-3 py-1.5 bg-[#1a1225] border border-[#2a1f3a] rounded-full text-xs text-gray-400">🇮🇹</span>
          <span className="px-3 py-1.5 bg-[#1a1225] border border-[#2a1f3a] rounded-full text-xs text-gray-400">🇬🇧</span>
          <span className="px-3 py-1.5 bg-[#1a1225] border border-[#2a1f3a] rounded-full text-xs text-gray-400">🏔️</span>
        </div>

        {/* Animated paws */}
        <div className="flex justify-center gap-4 mb-5 fade-in-up-delay-1">
          <span className="paw-left text-5xl drop-shadow-lg">🐾</span>
          <span className="paw-right text-5xl drop-shadow-lg">🐾</span>
        </div>

        <h1 className="text-5xl font-extrabold mb-3 fade-in-up-delay-1">
          <span className="bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500 bg-clip-text text-transparent">Compaw</span>
        </h1>
        <p className="text-gray-400 text-sm mb-6 fade-in-up-delay-2">
          Ton compagnon de sortie en Suisse
        </p>

        {/* Stats */}
        <div className="flex justify-center gap-6 mb-6 fade-in-up-delay-2">
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-400">{totalProfiles || 0}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Membres</p>
          </div>
          <div className="w-px h-10 bg-[#2a1f3a]" />
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-400">{totalAnimals || 0}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Compagnons</p>
          </div>
          <div className="w-px h-10 bg-[#2a1f3a]" />
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-400">26</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Cantons</p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex gap-3 justify-center fade-in-up-delay-3">
          <Link href="/signup" className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-full text-sm pulse-slow glow-orange">
            Rejoindre Compaw
          </Link>
          <Link href="/animals" className="px-6 py-3 bg-[#1a1225] border border-[#2a1f3a] text-gray-300 font-medium rounded-full text-sm card-hover">
            Explorer
          </Link>
        </div>
      </div>

      {/* Recemment actifs */}
      {animals && animals.length > 0 && (
        <div className="px-6 mb-8 fade-in-up-delay-3">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">Recemment actifs</h2>
            <Link href="/animals" className="text-[11px] text-orange-400 font-semibold">Voir tout →</Link>
          </div>
          <div className="flex gap-5 overflow-x-auto pb-2 scrollbar-hide">
            {animals.map((animal) => (
              <Link href={"/animals/" + animal.id} key={animal.id} className="flex flex-col items-center flex-shrink-0 group">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-[#1a1225] border-[2.5px] border-orange-500/60 group-hover:border-orange-400 flex items-center justify-center overflow-hidden mb-2 transition-colors">
                    {animal.photo_url ? (
                      <img src={animal.photo_url} alt={animal.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl">{EMOJI_MAP[animal.species] || "🐾"}</span>
                    )}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-[#0d0a14]" />
                </div>
                <p className="text-xs text-white font-medium">{animal.name}</p>
                {animal.canton && (
                  <span className="text-[10px] px-2 py-0.5 bg-orange-500/15 text-orange-300 rounded-full mt-1">{animal.canton}</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Feature Cards */}
      <div className="px-6 mb-8">
        <div className="grid grid-cols-2 gap-3">
          <Link href="/flairer" className="bg-gradient-to-br from-[#1a1225] to-[#15101e] border border-orange-500/15 rounded-2xl p-5 card-hover relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/5 rounded-full -translate-y-8 translate-x-8" />
            <span className="text-2xl mb-2 block">👃</span>
            <h3 className="font-bold text-white text-sm">Flairer</h3>
            <p className="text-xs text-gray-500 mt-1">Swipe & match</p>
          </Link>
          <Link href="/animals" className="bg-gradient-to-br from-[#1a1225] to-[#15101e] border border-[#2a1f3a] rounded-2xl p-5 card-hover relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/5 rounded-full -translate-y-8 translate-x-8" />
            <span className="text-2xl mb-2 block">🔍</span>
            <h3 className="font-bold text-white text-sm">Explorer</h3>
            <p className="text-xs text-gray-500 mt-1">Tous les profils</p>
          </Link>
          <Link href="/pricing" className="bg-gradient-to-br from-[#1a1225] to-[#15101e] border border-[#2a1f3a] rounded-2xl p-5 card-hover relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-500/5 rounded-full -translate-y-8 translate-x-8" />
            <span className="text-2xl mb-2 block">✨</span>
            <h3 className="font-bold text-white text-sm">Premium</h3>
            <p className="text-xs text-gray-500 mt-1">Matchs illimites</p>
          </Link>
          <Link href="/signup" className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/25 rounded-2xl p-5 card-hover relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/10 rounded-full -translate-y-8 translate-x-8" />
            <span className="text-2xl mb-2 block">🚀</span>
            <h3 className="font-bold text-orange-400 text-sm">Rejoindre</h3>
            <p className="text-xs text-orange-300/50 mt-1">Creer mon profil</p>
          </Link>
        </div>
      </div>

      {/* Coup de Truffe - Unique Feature Highlight */}
      <div className="px-6 mb-8">
        <div className="bg-gradient-to-r from-orange-500/10 via-pink-500/5 to-purple-500/10 border border-orange-500/20 rounded-2xl p-6 relative overflow-hidden glow-orange">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl" />
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">💥</span>
            <div>
              <h3 className="font-bold text-white">Coup de Truffe</h3>
              <p className="text-xs text-gray-400">L'animation exclusive quand c'est un match !</p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-[#0d0a14]/50 rounded-xl p-4">
            <div className="flex -space-x-3">
              <div className="w-12 h-12 rounded-full bg-orange-500/20 border-2 border-[#0d0a14] flex items-center justify-center text-xl z-10">🐕</div>
              <div className="w-12 h-12 rounded-full bg-pink-500/20 border-2 border-[#0d0a14] flex items-center justify-center text-xl">🐱</div>
            </div>
            <div className="flex-1">
              <div className="h-2 rounded-full bg-[#2a1f3a] overflow-hidden">
                <div className="h-full w-4/5 rounded-full bg-gradient-to-r from-orange-500 to-green-500" />
              </div>
              <p className="text-xs text-gray-500 mt-1">Compatibilite IA : 87%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Comment ca marche */}
      <div className="px-6 mb-8">
        <h2 className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-4">Comment ca marche</h2>
        <div className="space-y-3">
          {[
            { step: "1", icon: "📝", title: "Cree ton profil", desc: "Ajoute ton compagnon avec sa race, son caractere et une photo" },
            { step: "2", icon: "👃", title: "Flaire les profils", desc: "Notre IA te propose les compagnons les plus compatibles" },
            { step: "3", icon: "🤝", title: "Rencontre et sors", desc: "Organisez votre premiere balade ou rejoignez un evenement" },
          ].map((item, i) => (
            <div key={i} className="bg-[#1a1225] border border-[#2a1f3a] rounded-2xl p-4 flex items-center gap-4 card-hover">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-orange-500/20 to-orange-600/10 flex items-center justify-center text-orange-400 font-bold text-sm flex-shrink-0 border border-orange-500/20">
                {item.step}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-white text-sm">{item.title}</h3>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
              <span className="text-xl">{item.icon}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Final CTA */}
      <div className="px-6 mb-8">
        <div className="bg-gradient-to-br from-orange-500/15 via-orange-600/10 to-[#1a1225] border border-orange-500/25 rounded-2xl p-8 text-center relative overflow-hidden glow-orange">
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-orange-500/5 rounded-full blur-2xl" />
          <h2 className="text-xl font-bold text-white mb-2">Pret a trouver ton pote ?</h2>
          <p className="text-xs text-gray-400 mb-5">Gratuit pour commencer. 26 cantons. Toutes les especes.</p>
          <Link href="/signup" className="inline-block px-8 py-3.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-full transition text-sm glow-orange">
            Commencer maintenant
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-8 border-t border-[#1a1225]">
        <p className="text-gray-600 text-xs mb-3">© 2026 Compaw — Suisse 🇨🇭</p>
        <div className="flex justify-center gap-5">
          <Link href="/pricing" className="text-xs text-gray-500 hover:text-orange-400 transition">Tarifs</Link>
          <Link href="/animals" className="text-xs text-gray-500 hover:text-orange-400 transition">Catalogue</Link>
          <Link href="/legal/cgu" className="text-xs text-gray-500 hover:text-orange-400 transition">CGU</Link>
          <Link href="/legal/privacy" className="text-xs text-gray-500 hover:text-orange-400 transition">Confidentialite</Link>
        </div>
      </div>
    </div>
  );
}
