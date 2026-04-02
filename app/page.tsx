"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

const EMOJI_MAP: Record<string, string> = {
  chien: "🐕", chat: "🐱", lapin: "🐰",
  oiseau: "🐦", rongeur: "🐹", autre: "🐾",
};

const TRANSLATIONS: Record<string, Record<string, string>> = {
  fr: {
    tagline: "Ton compagnon de sortie en Suisse",
    members: "Membres",
    companions: "Compagnons",
    join: "Rejoindre Compaw",
    explore: "Explorer",
    recentlyActive: "Recemment actifs",
    seeAll: "Voir tout →",
    sniff: "Flairer",
    sniffSub: "Swipe & match",
    exploreSub: "Tous les profils",
    premium: "Premium",
    premiumSub: "Matchs illimites",
    joinCard: "Rejoindre",
    joinCardSub: "Creer mon profil",
    coupDeTruffe: "Coup de Truffe",
    coupDesc: "L'animation exclusive quand c'est un match !",
    compatibility: "Compatibilite IA",
    howItWorks: "Comment ca marche",
    step1: "Cree ton profil",
    step1Desc: "Ajoute ton compagnon avec sa race, son caractere et une photo",
    step2: "Flaire les profils",
    step2Desc: "Notre IA te propose les compagnons les plus compatibles",
    step3: "Rencontre et sors",
    step3Desc: "Organisez votre premiere balade ou rejoignez un evenement",
    ctaTitle: "Pret a trouver ton pote ?",
    ctaDesc: "Gratuit pour commencer. Toutes les especes. Toute la Suisse.",
    ctaButton: "Commencer maintenant",
    pricing: "Tarifs",
    catalog: "Catalogue",
  },
  de: {
    tagline: "Dein Begleiter fur Ausfluge in der Schweiz",
    members: "Mitglieder",
    companions: "Begleiter",
    join: "Compaw beitreten",
    explore: "Entdecken",
    recentlyActive: "Kurzlich aktiv",
    seeAll: "Alle anzeigen →",
    sniff: "Schnuffeln",
    sniffSub: "Swipe & Match",
    exploreSub: "Alle Profile",
    premium: "Premium",
    premiumSub: "Unbegrenzte Matches",
    joinCard: "Beitreten",
    joinCardSub: "Profil erstellen",
    coupDeTruffe: "Coup de Truffe",
    coupDesc: "Die exklusive Animation bei einem Match!",
    compatibility: "KI-Kompatibilitat",
    howItWorks: "So funktioniert es",
    step1: "Erstelle dein Profil",
    step1Desc: "Fuge deinen Begleiter mit Rasse, Charakter und Foto hinzu",
    step2: "Schnuffel die Profile",
    step2Desc: "Unsere KI schlagt dir die kompatibelsten Begleiter vor",
    step3: "Triff dich und geh raus",
    step3Desc: "Organisiert euren ersten Spaziergang oder nehmt an einem Event teil",
    ctaTitle: "Bereit deinen Kumpel zu finden?",
    ctaDesc: "Kostenlos starten. Alle Tierarten. Die ganze Schweiz.",
    ctaButton: "Jetzt starten",
    pricing: "Preise",
    catalog: "Katalog",
  },
  it: {
    tagline: "Il tuo compagno di uscite in Svizzera",
    members: "Membri",
    companions: "Compagni",
    join: "Unisciti a Compaw",
    explore: "Esplora",
    recentlyActive: "Recentemente attivi",
    seeAll: "Vedi tutti →",
    sniff: "Annusa",
    sniffSub: "Swipe & match",
    exploreSub: "Tutti i profili",
    premium: "Premium",
    premiumSub: "Match illimitati",
    joinCard: "Unisciti",
    joinCardSub: "Crea il mio profilo",
    coupDeTruffe: "Coup de Truffe",
    coupDesc: "L'animazione esclusiva quando c'e un match!",
    compatibility: "Compatibilita IA",
    howItWorks: "Come funziona",
    step1: "Crea il tuo profilo",
    step1Desc: "Aggiungi il tuo compagno con razza, carattere e foto",
    step2: "Annusa i profili",
    step2Desc: "La nostra IA ti propone i compagni piu compatibili",
    step3: "Incontra e esci",
    step3Desc: "Organizzate la vostra prima passeggiata o partecipate a un evento",
    ctaTitle: "Pronto a trovare il tuo amico?",
    ctaDesc: "Gratis per iniziare. Tutte le specie. Tutta la Svizzera.",
    ctaButton: "Inizia ora",
    pricing: "Prezzi",
    catalog: "Catalogo",
  },
  en: {
    tagline: "Your outdoor companion in Switzerland",
    members: "Members",
    companions: "Companions",
    join: "Join Compaw",
    explore: "Explore",
    recentlyActive: "Recently active",
    seeAll: "See all →",
    sniff: "Sniff",
    sniffSub: "Swipe & match",
    exploreSub: "All profiles",
    premium: "Premium",
    premiumSub: "Unlimited matches",
    joinCard: "Join",
    joinCardSub: "Create my profile",
    coupDeTruffe: "Coup de Truffe",
    coupDesc: "The exclusive animation when it's a match!",
    compatibility: "AI Compatibility",
    howItWorks: "How it works",
    step1: "Create your profile",
    step1Desc: "Add your companion with breed, character and a photo",
    step2: "Sniff the profiles",
    step2Desc: "Our AI suggests the most compatible companions",
    step3: "Meet and go out",
    step3Desc: "Organize your first walk or join an event",
    ctaTitle: "Ready to find your buddy?",
    ctaDesc: "Free to start. All species. All of Switzerland.",
    ctaButton: "Get started",
    pricing: "Pricing",
    catalog: "Catalog",
  },
};

const LANGS = [
  { code: "fr", flag: "🇫🇷" },
  { code: "de", flag: "🇩🇪" },
  { code: "it", flag: "🇮🇹" },
  { code: "en", flag: "🇬🇧" },
];

export default function HomePage() {
  const [lang, setLang] = useState("fr");
  const [animals, setAnimals] = useState<any[]>([]);
  const [totalAnimals, setTotalAnimals] = useState(0);
  const [totalProfiles, setTotalProfiles] = useState(0);
  const supabase = createClient();
  const t = TRANSLATIONS[lang];

  useEffect(() => {
    async function fetchData() {
      const { data } = await supabase.from("animals").select("*").order("created_at", { ascending: false }).limit(6);
      setAnimals(data || []);
      const { count: ac } = await supabase.from("animals").select("*", { count: "exact", head: true });
      setTotalAnimals(ac || 0);
      const { count: pc } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      setTotalProfiles(pc || 0);
    }
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-[#1a1528] text-white overflow-hidden">

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pawBounceLeft {
          0%, 100% { transform: rotate(-15deg) translateY(0); opacity: 0.4; }
          50% { transform: rotate(-15deg) translateY(-12px); opacity: 0.7; }
        }
        @keyframes pawBounceRight {
          0%, 100% { transform: rotate(15deg) translateY(-12px); opacity: 0.4; }
          50% { transform: rotate(15deg) translateY(0); opacity: 0.7; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        .paw-left { animation: pawBounceLeft 2s ease-in-out infinite; }
        .paw-right { animation: pawBounceRight 2s ease-in-out infinite; }
        .fade-in-up { animation: fadeInUp 0.8s ease-out forwards; }
        .pulse-slow { animation: pulse 3s ease-in-out infinite; }
        .glow-orange { box-shadow: 0 0 30px rgba(249,115,22,0.15); }
        .card-hover { transition: transform 0.2s ease; }
        .card-hover:active { transform: scale(0.97); }
      `}} />

      {/* Glow background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-orange-500/5 rounded-full blur-3xl" />
      </div>

      {/* Hero */}
      <div className="relative text-center pt-10 pb-8 px-4">

        {/* Language switcher */}
        <div className="flex justify-center gap-2 mb-6 fade-in-up">
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              className={"px-3 py-1.5 rounded-full text-sm transition-all " + (lang === l.code
                ? "bg-orange-500/20 border border-orange-500/40 shadow-lg shadow-orange-500/10"
                : "bg-[#241d33] border border-[#342a4a] hover:border-orange-500/30"
              )}
            >
              {l.flag}
            </button>
          ))}
        </div>

        {/* Animated paws */}
        <div className="flex justify-center gap-4 mb-5">
          <span className="paw-left text-5xl drop-shadow-lg">🐾</span>
          <span className="paw-right text-5xl drop-shadow-lg">🐾</span>
        </div>

        <h1 className="text-5xl font-extrabold mb-3">
          <span className="bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500 bg-clip-text text-transparent">Compaw</span>
        </h1>
        <p className="text-gray-400 text-sm mb-6">{t.tagline}</p>

        {/* Stats */}
        <div className="flex justify-center gap-8 mb-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-400">{totalProfiles}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">{t.members}</p>
          </div>
          <div className="w-px h-10 bg-[#342a4a]" />
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-400">{totalAnimals}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">{t.companions}</p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex gap-3 justify-center">
          <Link href="/signup" className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-full text-sm pulse-slow glow-orange">
            {t.join}
          </Link>
          <Link href="/animals" className="px-6 py-3 bg-[#241d33] border border-[#342a4a] text-gray-300 font-medium rounded-full text-sm card-hover">
            {t.explore}
          </Link>
        </div>
      </div>

      {/* Recently active */}
      {animals.length > 0 && (
        <div className="px-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">{t.recentlyActive}</h2>
            <Link href="/animals" className="text-[11px] text-orange-400 font-semibold">{t.seeAll}</Link>
          </div>
          <div className="flex gap-5 overflow-x-auto pb-2">
            {animals.map((animal) => (
              <Link href={"/animals/" + animal.id} key={animal.id} className="flex flex-col items-center flex-shrink-0 group">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-[#241d33] border-[2.5px] border-orange-500/60 group-hover:border-orange-400 flex items-center justify-center overflow-hidden mb-2 transition-colors">
                    {animal.photo_url ? (
                      <img src={animal.photo_url} alt={animal.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl">{EMOJI_MAP[animal.species] || "🐾"}</span>
                    )}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-[#1a1528]" />
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
          <Link href="/flairer" className="bg-gradient-to-br from-[#241d33] to-[#1e1730] border border-orange-500/15 rounded-2xl p-5 card-hover relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/5 rounded-full -translate-y-8 translate-x-8" />
            <span className="text-2xl mb-2 block">👃</span>
            <h3 className="font-bold text-white text-sm">{t.sniff}</h3>
            <p className="text-xs text-gray-500 mt-1">{t.sniffSub}</p>
          </Link>
          <Link href="/animals" className="bg-gradient-to-br from-[#241d33] to-[#1e1730] border border-[#342a4a] rounded-2xl p-5 card-hover relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/5 rounded-full -translate-y-8 translate-x-8" />
            <span className="text-2xl mb-2 block">🔍</span>
            <h3 className="font-bold text-white text-sm">{t.explore}</h3>
            <p className="text-xs text-gray-500 mt-1">{t.exploreSub}</p>
          </Link>
          <Link href="/pricing" className="bg-gradient-to-br from-[#241d33] to-[#1e1730] border border-[#342a4a] rounded-2xl p-5 card-hover relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-500/5 rounded-full -translate-y-8 translate-x-8" />
            <span className="text-2xl mb-2 block">✨</span>
            <h3 className="font-bold text-white text-sm">{t.premium}</h3>
            <p className="text-xs text-gray-500 mt-1">{t.premiumSub}</p>
          </Link>
          <Link href="/signup" className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/25 rounded-2xl p-5 card-hover relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/10 rounded-full -translate-y-8 translate-x-8" />
            <span className="text-2xl mb-2 block">🚀</span>
            <h3 className="font-bold text-orange-400 text-sm">{t.joinCard}</h3>
            <p className="text-xs text-orange-300/50 mt-1">{t.joinCardSub}</p>
          </Link>
        </div>
      </div>

      {/* Coup de Truffe */}
      <div className="px-6 mb-8">
        <div className="bg-gradient-to-r from-orange-500/10 via-pink-500/5 to-purple-500/10 border border-orange-500/20 rounded-2xl p-6 relative overflow-hidden glow-orange">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl" />
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">💥</span>
            <div>
              <h3 className="font-bold text-white">{t.coupDeTruffe}</h3>
              <p className="text-xs text-gray-400">{t.coupDesc}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-[#1a1528]/50 rounded-xl p-4">
            <div className="flex -space-x-3">
              <div className="w-12 h-12 rounded-full bg-orange-500/20 border-2 border-[#1a1528] flex items-center justify-center text-xl z-10">🐕</div>
              <div className="w-12 h-12 rounded-full bg-pink-500/20 border-2 border-[#1a1528] flex items-center justify-center text-xl">🐱</div>
            </div>
            <div className="flex-1">
              <div className="h-2 rounded-full bg-[#342a4a] overflow-hidden">
                <div className="h-full w-4/5 rounded-full bg-gradient-to-r from-orange-500 to-green-500" />
              </div>
              <p className="text-xs text-gray-500 mt-1">{t.compatibility} : 87%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Comment ca marche */}
      <div className="px-6 mb-8">
        <h2 className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-4">{t.howItWorks}</h2>
        <div className="space-y-3">
          {[
            { step: "1", icon: "📝", title: t.step1, desc: t.step1Desc },
            { step: "2", icon: "👃", title: t.step2, desc: t.step2Desc },
            { step: "3", icon: "🤝", title: t.step3, desc: t.step3Desc },
          ].map((item) => (
            <div key={item.step} className="bg-[#241d33] border border-[#342a4a] rounded-2xl p-4 flex items-center gap-4 card-hover">
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
        <div className="bg-gradient-to-br from-orange-500/15 via-orange-600/10 to-[#241d33] border border-orange-500/25 rounded-2xl p-8 text-center relative overflow-hidden glow-orange">
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-orange-500/5 rounded-full blur-2xl" />
          <h2 className="text-xl font-bold text-white mb-2">{t.ctaTitle}</h2>
          <p className="text-xs text-gray-400 mb-5">{t.ctaDesc}</p>
          <Link href="/signup" className="inline-block px-8 py-3.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-full transition text-sm glow-orange">
            {t.ctaButton}
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-8 border-t border-[#241d33]">
        <p className="text-gray-600 text-xs mb-3">© 2026 Compaw — Suisse 🇨🇭</p>
        <div className="flex justify-center gap-5">
          <Link href="/pricing" className="text-xs text-gray-500 hover:text-orange-400 transition">{t.pricing}</Link>
          <Link href="/animals" className="text-xs text-gray-500 hover:text-orange-400 transition">{t.catalog}</Link>
          <Link href="/legal/cgu" className="text-xs text-gray-500 hover:text-orange-400 transition">CGU</Link>
          <Link href="/legal/privacy" className="text-xs text-gray-500 hover:text-orange-400 transition">Privacy</Link>
        </div>
      </div>
    </div>
  );
}
