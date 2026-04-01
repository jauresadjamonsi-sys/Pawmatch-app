import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
const SPECIES: Record<string, string> = { chien: "Chien", chat: "Chat", lapin: "Lapin", oiseau: "Oiseau", rongeur: "Rongeur", autre: "Autre" };
const CANTONS = ["VD", "GE", "ZH", "BE", "BS", "FR", "LU", "VS", "TI", "SG"];
export default async function HomePage() {
  const supabase = await createClient();
  const { count: totalMembers } = await supabase.from("profiles").select("*", { count: "exact", head: true });
  const { data: animals } = await supabase.from("animals").select("*").order("created_at", { ascending: false }).limit(6);
  const { count: totalAnimals } = await supabase.from("animals").select("*", { count: "exact", head: true });
  return (
    <div className="min-h-screen bg-[#1a1225] text-white">
      <div className="text-center pt-16 pb-10 px-4">
        <p className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-4">La communaute animale suisse</p>
        <h1 className="text-4xl md:text-6xl font-bold mb-4"><span className="text-orange-400">Compaw</span></h1>
        <p className="text-gray-400 text-lg mb-8 max-w-md mx-auto">Ton compagnon de sortie en Suisse</p>
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-gray-300">FR Trouve ton pote</span>
          <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-gray-300">DE Finde deinen Kumpel</span>
          <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-gray-300">IT Trova il tuo compagno</span>
        </div>
        <div className="flex justify-center gap-3 mb-10">
          <Link href="/signup" className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition">Rejoindre Compaw</Link>
          <Link href="/animals" className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition border border-white/10">Decouvrir les profils</Link>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {CANTONS.map((c) => (<span key={c} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-medium text-gray-300">{c}</span>))}
        </div>
      </div>
      <div className="flex justify-center gap-12 mb-12 px-4">
        <div className="text-center"><p className="text-3xl font-bold text-orange-400">{totalMembers || 0}</p><p className="text-xs text-gray-500 mt-1">membres</p></div>
        <div className="text-center"><p className="text-3xl font-bold text-orange-400">{totalAnimals || 0}</p><p className="text-xs text-gray-500 mt-1">compagnons</p></div>
        <div className="text-center"><p className="text-3xl font-bold text-orange-400">26</p><p className="text-xs text-gray-500 mt-1">cantons</p></div>
      </div>
      {animals && animals.length > 0 && (
        <div className="px-6 mb-12">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Recemment actifs</h2>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {animals.map((animal) => (
              <Link href={"/animals/" + animal.id} key={animal.id} className="flex flex-col items-center flex-shrink-0">
                <div className="w-16 h-16 rounded-full bg-[#2a1f3a] border-2 border-orange-400/60 flex items-center justify-center overflow-hidden mb-2">
                  {animal.photo_url ? (<img src={animal.photo_url} alt={animal.name} className="w-full h-full object-cover" />) : (<span className="text-xs font-medium text-gray-400">{SPECIES[animal.species]?.charAt(0) || "?"}</span>)}
                </div>
                <p className="text-xs text-white font-medium">{animal.name}</p>
                {animal.canton && (<span className="text-[10px] px-2 py-0.5 bg-orange-500/20 text-orange-300 rounded-full mt-1">{animal.canton}</span>)}
              </Link>
            ))}
          </div>
        </div>
      )}
      <div className="px-6 mb-12">
        <div className="grid grid-cols-2 gap-3">
          <Link href="/animals" className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition"><h3 className="font-bold text-white text-sm">Montagne</h3><p className="text-xs text-gray-500 mt-1">Alpages et sentiers</p></Link>
          <Link href="/animals" className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition"><h3 className="font-bold text-white text-sm">Lac</h3><p className="text-xs text-gray-500 mt-1">Lacs suisses</p></Link>
          <Link href="/animals" className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition"><h3 className="font-bold text-white text-sm">Carte</h3><p className="text-xs text-gray-500 mt-1">Animaux proches</p></Link>
          <Link href="/animals" className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition"><h3 className="font-bold text-white text-sm">Groupes</h3><p className="text-xs text-gray-500 mt-1">Communautes CH</p></Link>
        </div>
      </div>
      <div className="px-6 mb-12">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Comment ca marche</h2>
        <div className="space-y-3">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-4"><div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-400 font-bold text-sm flex-shrink-0">1</div><div><h3 className="font-bold text-white text-sm">Cree ton profil</h3><p className="text-xs text-gray-400">Ajoute ton compagnon avec ses traits de caractere</p></div></div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-4"><div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-400 font-bold text-sm flex-shrink-0">2</div><div><h3 className="font-bold text-white text-sm">Flaire les profils</h3><p className="text-xs text-gray-400">Decouvre les compagnons compatibles autour de toi</p></div></div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-4"><div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-400 font-bold text-sm flex-shrink-0">3</div><div><h3 className="font-bold text-white text-sm">Matche et rencontre</h3><p className="text-xs text-gray-400">Organise des sorties et fais-toi de nouveaux potes</p></div></div>
        </div>
      </div>
      <div className="text-center py-8 border-t border-white/5">
        <p className="text-gray-600 text-xs">2026 Compaw</p>
        <div className="flex justify-center gap-4 mt-3">
          <Link href="/pricing" className="text-xs text-gray-500 hover:text-orange-400 transition">Tarifs</Link>
          <Link href="/animals" className="text-xs text-gray-500 hover:text-orange-400 transition">Catalogue</Link>
          <Link href="/login" className="text-xs text-gray-500 hover:text-orange-400 transition">Connexion</Link>
          <Link href="/legal/cgu" className="text-xs text-gray-500 hover:text-orange-400 transition">CGU</Link>
          <Link href="/legal/privacy" className="text-xs text-gray-500 hover:text-orange-400 transition">Confidentialite</Link>
        </div>
      </div>
    </div>
  );
}
