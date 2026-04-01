import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: animals } = await supabase
    .from("animals")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(6);

  return (
    <div className="min-h-screen bg-[#1a1225] text-white">

      <div className="text-center pt-16 pb-12 px-4">
        <p className="text-xs uppercase tracking-[0.3em] text-orange-400/60 mb-6">Suisse — FR / DE / IT / RM</p>
        <h1 className="text-5xl md:text-7xl font-bold mb-4">Compaw</h1>
        <p className="text-gray-400 text-xl mb-3 max-w-lg mx-auto">
          Ton compagnon de sortie en Suisse
        </p>
        <p className="text-gray-500 text-sm mb-10 max-w-md mx-auto">
          La premiere app qui connecte les proprietaires d'animaux par canton, par traits de caractere, et par affinites. Fini les balades seul.
        </p>

        <div className="flex justify-center gap-3 mb-12">
          <Link href="/signup" className="px-8 py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition text-sm">
            Creer mon profil gratuitement
          </Link>
          <Link href="/flairer" className="px-8 py-3.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition border border-white/10 text-sm">
            Voir les profils
          </Link>
        </div>

        <div className="flex justify-center gap-6 text-xs text-gray-500">
          <span>Gratuit pour commencer</span>
          <span>·</span>
          <span>26 cantons couverts</span>
          <span>·</span>
          <span>Tous les animaux</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 mb-16">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-400 font-bold text-lg mx-auto mb-4">1</div>
            <h3 className="font-bold text-white mb-2">Cree ton profil</h3>
            <p className="text-xs text-gray-400">Inscris-toi et ajoute ton compagnon avec sa race, son caractere et ta localisation.</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-400 font-bold text-lg mx-auto mb-4">2</div>
            <h3 className="font-bold text-white mb-2">Flaire les profils</h3>
            <p className="text-xs text-gray-400">Parcours les compagnons autour de toi. Swipe pour montrer ton interet ou passer au suivant.</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-400 font-bold text-lg mx-auto mb-4">3</div>
            <h3 className="font-bold text-white mb-2">Rencontre et sors</h3>
            <p className="text-xs text-gray-400">Match confirme ? Discutez et organisez votre premiere balade ensemble.</p>
          </div>
        </div>
      </div>

      {animals && animals.length > 0 && (
        <div className="px-6 mb-16">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-6">Derniers inscrits</h2>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
              {animals.map((animal) => (
                <Link href={"/animals/" + animal.id} key={animal.id} className="flex flex-col items-center group">
                  <div className="w-16 h-16 rounded-full bg-[#2a1f3a] border-2 border-white/10 group-hover:border-orange-400/60 flex items-center justify-center overflow-hidden mb-2 transition">
                    {animal.photo_url ? (
                      <img src={animal.photo_url} alt={animal.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-gray-500">{animal.name?.charAt(0)}</span>
                    )}
                  </div>
                  <p className="text-xs text-white font-medium">{animal.name}</p>
                  {animal.canton && (
                    <span className="text-[10px] text-gray-500 mt-0.5">{animal.canton}</span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-6 mb-16">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-6">Pourquoi Compaw</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="font-bold text-white text-sm mb-2">Matching par compatibilite</h3>
            <p className="text-xs text-gray-400">On ne matche pas au hasard. Traits de caractere, taille, energie — on trouve le vrai bon compagnon pour ton animal.</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="font-bold text-white text-sm mb-2">Toute la Suisse, toutes les langues</h3>
            <p className="text-xs text-gray-400">De Geneve a Saint-Gall, du Tessin au Jura. Compaw parle francais, allemand, italien et romanche.</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="font-bold text-white text-sm mb-2">Pas que les chiens</h3>
            <p className="text-xs text-gray-400">Chiens, chats, lapins, oiseaux, rongeurs — tous les compagnons sont les bienvenus sur Compaw.</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="font-bold text-white text-sm mb-2">Gratuit pour commencer</h3>
            <p className="text-xs text-gray-400">Cree ton profil, ajoute ton animal, et commence a flairer. Les fonctions premium viennent quand tu es pret.</p>
          </div>
        </div>
      </div>

      <div className="text-center py-12 px-4 mb-8">
        <h2 className="text-2xl font-bold text-white mb-3">Pret a trouver ton prochain pote ?</h2>
        <p className="text-gray-400 text-sm mb-6">Rejoins Compaw gratuitement et connecte-toi avec des proprietaires pres de chez toi.</p>
        <Link href="/signup" className="px-8 py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition text-sm">
          Commencer maintenant
        </Link>
      </div>

      <div className="text-center py-8 border-t border-white/5">
        <p className="text-gray-600 text-xs">2026 Compaw — Suisse</p>
        <div className="flex justify-center gap-4 mt-3">
          <Link href="/pricing" className="text-xs text-gray-500 hover:text-orange-400 transition">Tarifs</Link>
          <Link href="/animals" className="text-xs text-gray-500 hover:text-orange-400 transition">Catalogue</Link>
          <Link href="/legal/cgu" className="text-xs text-gray-500 hover:text-orange-400 transition">CGU</Link>
          <Link href="/legal/privacy" className="text-xs text-gray-500 hover:text-orange-400 transition">Confidentialite</Link>
        </div>
      </div>
    </div>
  );
}
