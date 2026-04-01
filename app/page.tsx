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

      {/* Hero */}
      <div className="text-center pt-20 pb-16 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-orange-500/5 to-transparent pointer-events-none"></div>
        <div className="relative">
          <div className="flex justify-center gap-3 mb-8">
            <span className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs text-gray-300 flex items-center gap-1.5">🇫🇷 Francais</span>
            <span className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs text-gray-300 flex items-center gap-1.5">🇩🇪 Deutsch</span>
            <span className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs text-gray-300 flex items-center gap-1.5">🇮🇹 Italiano</span>
            <span className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs text-gray-300 flex items-center gap-1.5">🇨🇭 Rumantsch</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-5 tracking-tight">
            <span className="text-orange-400">Comp</span>aw
          </h1>
          <p className="text-gray-300 text-xl mb-3 max-w-lg mx-auto font-light">
            Ton compagnon de sortie en Suisse
          </p>
          <p className="text-gray-500 text-sm mb-10 max-w-md mx-auto leading-relaxed">
            La premiere app qui connecte les proprietaires d'animaux par canton, 
            par traits de caractere et par affinites.
          </p>

          <div className="flex justify-center gap-3 mb-8">
            <Link href="/signup" className="px-8 py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-full transition text-sm shadow-lg shadow-orange-500/20">
              Commencer gratuitement
            </Link>
            <Link href="/flairer" className="px-8 py-3.5 bg-white/5 hover:bg-white/10 text-white font-medium rounded-full transition border border-white/10 text-sm">
              Decouvrir
            </Link>
          </div>

          <div className="flex justify-center gap-8 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-400"></span> Gratuit</span>
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span> 26 cantons</span>
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span> Multi-especes</span>
          </div>
        </div>
      </div>

      {/* Derniers inscrits */}
      {animals && animals.length > 0 && (
        <div className="px-6 mb-20">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Derniers inscrits</h2>
              <Link href="/animals" className="text-xs text-orange-400 hover:underline">Voir tous</Link>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-5">
              {animals.map((animal) => (
                <Link href={"/animals/" + animal.id} key={animal.id} className="flex flex-col items-center group">
                  <div className="w-18 h-18 md:w-20 md:h-20 rounded-full bg-[#2a1f3a] border-2 border-white/10 group-hover:border-orange-400/60 flex items-center justify-center overflow-hidden mb-2.5 transition-all duration-300 group-hover:scale-105">
                    {animal.photo_url ? (
                      <img src={animal.photo_url} alt={animal.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-bold text-gray-500">{animal.name?.charAt(0)}</span>
                    )}
                  </div>
                  <p className="text-xs text-white font-medium group-hover:text-orange-400 transition">{animal.name}</p>
                  {animal.canton && (
                    <span className="text-[10px] text-gray-500 mt-0.5">{animal.canton}</span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Comment ca marche */}
      <div className="max-w-4xl mx-auto px-6 mb-20">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-8 text-center">Comment ca marche</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-7 text-center hover:bg-white/[0.05] transition">
            <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center mx-auto mb-5">
              <svg className="w-6 h-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
            <h3 className="font-semibold text-white mb-2">Cree ton profil</h3>
            <p className="text-xs text-gray-400 leading-relaxed">Inscris-toi et ajoute ton compagnon avec sa race, son caractere et ta localisation.</p>
          </div>
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-7 text-center hover:bg-white/[0.05] transition">
            <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center mx-auto mb-5">
              <svg className="w-6 h-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
            </div>
            <h3 className="font-semibold text-white mb-2">Flaire les profils</h3>
            <p className="text-xs text-gray-400 leading-relaxed">Parcours les compagnons autour de toi. Swipe pour montrer ton interet ou passer au suivant.</p>
          </div>
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-7 text-center hover:bg-white/[0.05] transition">
            <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center mx-auto mb-5">
              <svg className="w-6 h-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-white mb-2">Rencontre et sors</h3>
            <p className="text-xs text-gray-400 leading-relaxed">Match confirme ? Discutez et organisez votre premiere balade ensemble.</p>
          </div>
        </div>
      </div>

      {/* Pourquoi Compaw */}
      <div className="max-w-4xl mx-auto px-6 mb-20">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-8 text-center">Pourquoi Compaw</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 hover:bg-white/[0.05] transition group">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-orange-500/20 transition">
                <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm mb-1.5">Matching par compatibilite</h3>
                <p className="text-xs text-gray-400 leading-relaxed">On ne matche pas au hasard. Traits de caractere, taille, energie — on trouve le vrai bon compagnon.</p>
              </div>
            </div>
          </div>
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 hover:bg-white/[0.05] transition group">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-orange-500/20 transition">
                <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm mb-1.5">Toute la Suisse, 4 langues</h3>
                <p className="text-xs text-gray-400 leading-relaxed">De Geneve a Saint-Gall, du Tessin au Jura. Francais, allemand, italien et romanche.</p>
              </div>
            </div>
          </div>
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 hover:bg-white/[0.05] transition group">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-orange-500/20 transition">
                <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm mb-1.5">Pas que les chiens</h3>
                <p className="text-xs text-gray-400 leading-relaxed">Chiens, chats, lapins, oiseaux, rongeurs — tous les compagnons sont les bienvenus.</p>
              </div>
            </div>
          </div>
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 hover:bg-white/[0.05] transition group">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-orange-500/20 transition">
                <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm mb-1.5">Gratuit et securise</h3>
                <p className="text-xs text-gray-400 leading-relaxed">Cree ton profil gratuitement. Donnees protegees, hebergement suisse, paiements Stripe.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA final */}
      <div className="text-center py-16 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-orange-500/5 to-transparent pointer-events-none"></div>
        <div className="relative">
          <h2 className="text-3xl font-bold text-white mb-3">Pret a trouver ton prochain pote ?</h2>
          <p className="text-gray-400 text-sm mb-8 max-w-md mx-auto">Rejoins la communaute Compaw et connecte-toi avec des proprietaires pres de chez toi.</p>
          <Link href="/signup" className="px-10 py-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-full transition text-sm shadow-lg shadow-orange-500/20">
            Creer mon profil gratuitement
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-8 border-t border-white/5">
        <p className="text-gray-600 text-xs mb-3">2026 Compaw — Suisse</p>
        <div className="flex justify-center gap-6">
          <Link href="/pricing" className="text-xs text-gray-500 hover:text-orange-400 transition">Tarifs</Link>
          <Link href="/animals" className="text-xs text-gray-500 hover:text-orange-400 transition">Catalogue</Link>
          <Link href="/legal/cgu" className="text-xs text-gray-500 hover:text-orange-400 transition">CGU</Link>
          <Link href="/legal/privacy" className="text-xs text-gray-500 hover:text-orange-400 transition">Confidentialite</Link>
        </div>
      </div>
    </div>
  );
}
