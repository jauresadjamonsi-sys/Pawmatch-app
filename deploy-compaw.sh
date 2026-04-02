#!/bin/bash
# ============================================================
# COMPAW — Script de déploiement complet
# Lance depuis la racine du projet : bash deploy-compaw.sh
# ============================================================

set -e
cd "$(dirname "$0")"
echo "🐾 Compaw — Application des mises à jour..."

# ── 1. Créer les dossiers nécessaires ───────────────────────
mkdir -p lib/contexts

# ── 2. lib/i18n.ts ──────────────────────────────────────────
cat > lib/i18n.ts << 'ENDOFFILE'
// lib/i18n.ts — Source unique de vérité pour les traductions

export const LANGS = [
  { code: "fr", flag: "🇫🇷" },
  { code: "de", flag: "🇩🇪" },
  { code: "it", flag: "🇮🇹" },
  { code: "en", flag: "🇬🇧" },
];

export const THEMES = [
  { code: "nuit",   label: "🌑", name: "Nuit"   },
  { code: "aurore", label: "🌅", name: "Aurore" },
  { code: "ocean",  label: "🌊", name: "Océan"  },
];

export const TRANSLATIONS: Record<string, Record<string, string>> = {
  fr: {
    navHome: "Accueil",
    navFlairer: "Flairer",
    navExplorer: "Explorer",
    navMatches: "Matchs",
    navProfil: "Profil",
    navPricing: "Tarifs",
    navLogin: "Connexion",
    navJoin: "Rejoindre",
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
    navHome: "Startseite",
    navFlairer: "Schnuffeln",
    navExplorer: "Entdecken",
    navMatches: "Matches",
    navProfil: "Profil",
    navPricing: "Preise",
    navLogin: "Anmelden",
    navJoin: "Beitreten",
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
    navHome: "Home",
    navFlairer: "Annusa",
    navExplorer: "Esplora",
    navMatches: "Match",
    navProfil: "Profilo",
    navPricing: "Prezzi",
    navLogin: "Accedi",
    navJoin: "Iscriviti",
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
    navHome: "Home",
    navFlairer: "Sniff",
    navExplorer: "Explore",
    navMatches: "Matches",
    navProfil: "Profile",
    navPricing: "Pricing",
    navLogin: "Login",
    navJoin: "Join",
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
ENDOFFILE
echo "✅ lib/i18n.ts créé"

# ── 3. lib/contexts/AppContext.tsx ───────────────────────────
cat > lib/contexts/AppContext.tsx << 'ENDOFFILE'
"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { TRANSLATIONS } from "@/lib/i18n";

type Theme = "nuit" | "aurore" | "ocean";
type Lang = "fr" | "de" | "it" | "en";

interface AppContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  t: Record<string, string>;
}

const AppContext = createContext<AppContextType>({
  lang: "fr",
  setLang: () => {},
  theme: "nuit",
  setTheme: () => {},
  t: TRANSLATIONS.fr,
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("fr");
  const [theme, setThemeState] = useState<Theme>("nuit");

  useEffect(() => {
    const savedLang = localStorage.getItem("compaw_lang") as Lang;
    const savedTheme = localStorage.getItem("compaw_theme") as Theme;
    if (savedLang && ["fr", "de", "it", "en"].includes(savedLang)) setLangState(savedLang);
    if (savedTheme && ["nuit", "aurore", "ocean"].includes(savedTheme)) setThemeState(savedTheme);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("compaw_lang", l);
  };

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem("compaw_theme", t);
  };

  return (
    <AppContext.Provider value={{ lang, setLang, theme, setTheme, t: TRANSLATIONS[lang] }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}
ENDOFFILE
echo "✅ lib/contexts/AppContext.tsx créé"

# ── 4. lib/components/Navbar.tsx ────────────────────────────
cat > lib/components/Navbar.tsx << 'ENDOFFILE'
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAppContext } from "@/lib/contexts/AppContext";
import { LANGS, THEMES } from "@/lib/i18n";

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const supabase = createClient();
  const { lang, setLang, theme, setTheme, t } = useAppContext();

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    }
    getUser();
  }, [pathname]);

  const isActive = (path: string) => pathname === path;

  return (
    <>
      <nav className="bg-[var(--c-nav)]/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between h-12">
            <Link href="/" className="font-bold text-lg text-orange-400">
              Compaw
            </Link>

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center gap-1">
              {!loading && (
                user ? (
                  <>
                    <NavLink href="/flairer" active={isActive("/flairer")} label={t.navFlairer} />
                    <NavLink href="/animals" active={isActive("/animals")} label={t.navExplorer} />
                    <NavLink href="/matches" active={isActive("/matches")} label={t.navMatches} />
                    <NavLink href="/profile" active={isActive("/profile")} label={t.navProfil} />
                  </>
                ) : (
                  <>
                    <NavLink href="/flairer" active={isActive("/flairer")} label={t.navFlairer} />
                    <NavLink href="/animals" active={isActive("/animals")} label={t.navExplorer} />
                    <NavLink href="/pricing" active={isActive("/pricing")} label={t.navPricing} />
                    <Link href="/signup" className="ml-3 px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-full transition">
                      {t.navJoin}
                    </Link>
                  </>
                )
              )}
            </div>

            {/* Desktop: language + theme pickers */}
            <div className="hidden md:flex items-center gap-3">
              <div className="flex items-center gap-1">
                {LANGS.map((l) => (
                  <button key={l.code} onClick={() => setLang(l.code as any)} title={l.code.toUpperCase()}
                    className={"w-7 h-7 rounded-full text-sm transition-all flex items-center justify-center " +
                      (lang === l.code ? "bg-orange-500/20 border border-orange-500/50 scale-110" : "bg-white/5 border border-white/10 hover:border-orange-500/30 opacity-60 hover:opacity-100")}>
                    {l.flag}
                  </button>
                ))}
              </div>
              <div className="w-px h-5 bg-white/10" />
              <div className="flex items-center gap-1">
                {THEMES.map((th) => (
                  <button key={th.code} onClick={() => setTheme(th.code as any)} title={th.name}
                    className={"w-7 h-7 rounded-full text-sm transition-all flex items-center justify-center " +
                      (theme === th.code ? "bg-orange-500/20 border border-orange-500/50 scale-110" : "bg-white/5 border border-white/10 hover:border-orange-500/30 opacity-60 hover:opacity-100")}>
                    {th.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mobile: join button */}
            <div className="md:hidden flex items-center gap-3">
              {!loading && !user && (
                <Link href="/signup" className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-full transition">
                  {t.navJoin}
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile bottom tab bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[var(--c-nav)]/95 backdrop-blur-xl border-t border-white/5 safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          <BottomTab href="/" active={isActive("/")} label={t.navHome}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive("/") ? 2.5 : 1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
          </BottomTab>

          <BottomTab href="/flairer" active={isActive("/flairer")} label={t.navFlairer} featured>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
          </BottomTab>

          <BottomTab href="/animals" active={isActive("/animals")} label={t.navExplorer}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive("/animals") ? 2.5 : 1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </BottomTab>

          {!loading && user ? (
            <>
              <BottomTab href="/matches" active={isActive("/matches")} label={t.navMatches}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive("/matches") ? 2.5 : 1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                </svg>
              </BottomTab>
              <BottomTab href="/profile" active={isActive("/profile")} label={t.navProfil}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive("/profile") ? 2.5 : 1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </BottomTab>
            </>
          ) : (
            <>
              <BottomTab href="/pricing" active={isActive("/pricing")} label={t.navPricing}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive("/pricing") ? 2.5 : 1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </BottomTab>
              <BottomTab href="/login" active={isActive("/login")} label={t.navLogin}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive("/login") ? 2.5 : 1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
              </BottomTab>
            </>
          )}
        </div>

        {/* Mobile lang + theme bar */}
        <div className="flex items-center justify-center gap-4 pb-2">
          <div className="flex items-center gap-1.5">
            {LANGS.map((l) => (
              <button key={l.code} onClick={() => setLang(l.code as any)}
                className={"w-6 h-6 rounded-full text-xs transition-all flex items-center justify-center " +
                  (lang === l.code ? "bg-orange-500/20 border border-orange-500/50 scale-110" : "opacity-50 hover:opacity-100")}>
                {l.flag}
              </button>
            ))}
          </div>
          <div className="w-px h-4 bg-white/10" />
          <div className="flex items-center gap-1.5">
            {THEMES.map((th) => (
              <button key={th.code} onClick={() => setTheme(th.code as any)} title={th.name}
                className={"w-6 h-6 rounded-full text-xs transition-all flex items-center justify-center " +
                  (theme === th.code ? "bg-orange-500/20 border border-orange-500/50 scale-110" : "opacity-50 hover:opacity-100")}>
                {th.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="md:hidden h-16"></div>
    </>
  );
}

function NavLink({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link href={href}
      className={"px-4 py-2 rounded-full text-sm transition " +
        (active ? "bg-orange-500/15 text-orange-400 font-semibold" : "text-gray-400 hover:text-white hover:bg-white/5")}>
      {label}
    </Link>
  );
}

function BottomTab({ href, active, label, featured, children }: {
  href: string; active: boolean; label: string; featured?: boolean; children: React.ReactNode
}) {
  if (featured) {
    return (
      <Link href={href} className="flex flex-col items-center -mt-5">
        <div className={"w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition " +
          (active ? "bg-orange-500 shadow-orange-500/40 scale-110 text-white" : "bg-orange-500/80 hover:bg-orange-500 shadow-orange-500/20 text-white")}>
          {children}
        </div>
        <span className={"text-[10px] mt-1 " + (active ? "text-orange-400 font-semibold" : "text-gray-500")}>{label}</span>
      </Link>
    );
  }
  return (
    <Link href={href} className="flex flex-col items-center py-1 px-2">
      <span className={active ? "text-orange-400" : "text-gray-500"}>{children}</span>
      <span className={"text-[10px] mt-0.5 " + (active ? "text-orange-400 font-semibold" : "text-gray-500")}>{label}</span>
    </Link>
  );
}
ENDOFFILE
echo "✅ lib/components/Navbar.tsx mis à jour"

# ── 5. app/page.tsx ──────────────────────────────────────────
cat > app/page.tsx << 'ENDOFFILE'
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useAppContext } from "@/lib/contexts/AppContext";
import { LANGS, THEMES } from "@/lib/i18n";

const EMOJI_MAP: Record<string, string> = {
  chien: "🐕", chat: "🐱", lapin: "🐰",
  oiseau: "🐦", rongeur: "🐹", autre: "🐾",
};

export default function HomePage() {
  const { lang, setLang, theme, setTheme, t } = useAppContext();
  const [animals, setAnimals] = useState<any[]>([]);
  const [totalAnimals, setTotalAnimals] = useState(0);
  const [totalProfiles, setTotalProfiles] = useState(0);
  const supabase = createClient();

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
    <div className="min-h-screen bg-[var(--c-deep)] text-white overflow-hidden">
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

      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-orange-500/5 rounded-full blur-3xl" />
      </div>

      {/* Hero */}
      <div className="relative text-center pt-10 pb-8 px-4">

        {/* Language + Theme switcher */}
        <div className="flex justify-center items-center gap-4 mb-6 fade-in-up">
          <div className="flex gap-2">
            {LANGS.map((l) => (
              <button key={l.code} onClick={() => setLang(l.code as any)}
                className={"px-3 py-1.5 rounded-full text-sm transition-all " + (lang === l.code
                  ? "bg-orange-500/20 border border-orange-500/40 shadow-lg shadow-orange-500/10"
                  : "bg-[var(--c-card)] border border-[var(--c-border)] hover:border-orange-500/30")}>
                {l.flag}
              </button>
            ))}
          </div>
          <div className="w-px h-6 bg-white/10" />
          <div className="flex gap-2">
            {THEMES.map((th) => (
              <button key={th.code} onClick={() => setTheme(th.code as any)} title={th.name}
                className={"px-3 py-1.5 rounded-full text-sm transition-all " + (theme === th.code
                  ? "bg-orange-500/20 border border-orange-500/40 shadow-lg shadow-orange-500/10"
                  : "bg-[var(--c-card)] border border-[var(--c-border)] hover:border-orange-500/30")}>
                {th.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-center gap-4 mb-5">
          <span className="paw-left text-5xl drop-shadow-lg">🐾</span>
          <span className="paw-right text-5xl drop-shadow-lg">🐾</span>
        </div>

        <h1 className="text-5xl font-extrabold mb-3">
          <span className="bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500 bg-clip-text text-transparent">Compaw</span>
        </h1>
        <p className="text-gray-400 text-sm mb-6">{t.tagline}</p>

        <div className="flex justify-center gap-8 mb-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-400">{totalProfiles}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">{t.members}</p>
          </div>
          <div className="w-px h-10 bg-[var(--c-border)]" />
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-400">{totalAnimals}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">{t.companions}</p>
          </div>
        </div>

        <div className="flex gap-3 justify-center">
          <Link href="/signup" className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-full text-sm pulse-slow glow-orange">
            {t.join}
          </Link>
          <Link href="/animals" className="px-6 py-3 bg-[var(--c-card)] border border-[var(--c-border)] text-gray-300 font-medium rounded-full text-sm card-hover">
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
                  <div className="w-16 h-16 rounded-full bg-[var(--c-card)] border-[2.5px] border-orange-500/60 group-hover:border-orange-400 flex items-center justify-center overflow-hidden mb-2 transition-colors">
                    {animal.photo_url
                      ? <img src={animal.photo_url} alt={animal.name} className="w-full h-full object-cover" />
                      : <span className="text-2xl">{EMOJI_MAP[animal.species] || "🐾"}</span>}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-[var(--c-deep)]" />
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
          <Link href="/flairer" className="bg-gradient-to-br from-[var(--c-card)] to-[var(--c-deep)] border border-orange-500/15 rounded-2xl p-5 card-hover relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/5 rounded-full -translate-y-8 translate-x-8" />
            <span className="text-2xl mb-2 block">👃</span>
            <h3 className="font-bold text-white text-sm">{t.sniff}</h3>
            <p className="text-xs text-gray-500 mt-1">{t.sniffSub}</p>
          </Link>
          <Link href="/animals" className="bg-gradient-to-br from-[var(--c-card)] to-[var(--c-deep)] border border-[var(--c-border)] rounded-2xl p-5 card-hover relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/5 rounded-full -translate-y-8 translate-x-8" />
            <span className="text-2xl mb-2 block">🔍</span>
            <h3 className="font-bold text-white text-sm">{t.explore}</h3>
            <p className="text-xs text-gray-500 mt-1">{t.exploreSub}</p>
          </Link>
          <Link href="/pricing" className="bg-gradient-to-br from-[var(--c-card)] to-[var(--c-deep)] border border-[var(--c-border)] rounded-2xl p-5 card-hover relative overflow-hidden">
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
          <div className="flex items-center gap-4 bg-[var(--c-deep)]/50 rounded-xl p-4">
            <div className="flex -space-x-3">
              <div className="w-12 h-12 rounded-full bg-orange-500/20 border-2 border-[var(--c-deep)] flex items-center justify-center text-xl z-10">🐕</div>
              <div className="w-12 h-12 rounded-full bg-pink-500/20 border-2 border-[var(--c-deep)] flex items-center justify-center text-xl">🐱</div>
            </div>
            <div className="flex-1">
              <div className="h-2 rounded-full bg-[var(--c-border)] overflow-hidden">
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
            <div key={item.step} className="bg-[var(--c-card)] border border-[var(--c-border)] rounded-2xl p-4 flex items-center gap-4 card-hover">
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
        <div className="bg-gradient-to-br from-orange-500/15 via-orange-600/10 to-[var(--c-card)] border border-orange-500/25 rounded-2xl p-8 text-center relative overflow-hidden glow-orange">
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-orange-500/5 rounded-full blur-2xl" />
          <h2 className="text-xl font-bold text-white mb-2">{t.ctaTitle}</h2>
          <p className="text-xs text-gray-400 mb-5">{t.ctaDesc}</p>
          <Link href="/signup" className="inline-block px-8 py-3.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-full transition text-sm glow-orange">
            {t.ctaButton}
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-8 border-t border-[var(--c-card)]">
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
ENDOFFILE
echo "✅ app/page.tsx mis à jour"

# ── 6. Patch app/globals.css — ajouter les variables CSS ────
THEME_VARS='
/* ===== COMPAW THEME SYSTEM ===== */
:root,
[data-theme="nuit"] {
  --c-deep:   #1a1528;
  --c-nav:    #1a1225;
  --c-card:   #241d33;
  --c-border: #342a4a;
}
[data-theme="aurore"] {
  --c-deep:   #1c1108;
  --c-nav:    #1a1008;
  --c-card:   #271808;
  --c-border: #3d2a10;
}
[data-theme="ocean"] {
  --c-deep:   #0d1520;
  --c-nav:    #0b1320;
  --c-card:   #132030;
  --c-border: #1e3048;
}
/* ================================ */'

# Vérifier si les variables sont déjà présentes
if grep -q "COMPAW THEME SYSTEM" app/globals.css 2>/dev/null; then
  echo "⚠️  Variables CSS déjà présentes dans globals.css, ignoré."
else
  # Injecter après la première ligne (l'import tailwindcss)
  node -e "
    const fs = require('fs');
    const file = 'app/globals.css';
    const content = fs.readFileSync(file, 'utf8');
    const vars = \`\n/* ===== COMPAW THEME SYSTEM ===== */\n:root,\n[data-theme=\"nuit\"] {\n  --c-deep:   #1a1528;\n  --c-nav:    #1a1225;\n  --c-card:   #241d33;\n  --c-border: #342a4a;\n}\n[data-theme=\"aurore\"] {\n  --c-deep:   #1c1108;\n  --c-nav:    #1a1008;\n  --c-card:   #271808;\n  --c-border: #3d2a10;\n}\n[data-theme=\"ocean\"] {\n  --c-deep:   #0d1520;\n  --c-nav:    #0b1320;\n  --c-card:   #132030;\n  --c-border: #1e3048;\n}\n/* ================================ */\n\`;
    const patched = content.replace('@import \"tailwindcss\"', '@import \"tailwindcss\"' + vars);
    fs.writeFileSync(file, patched);
    console.log('✅ app/globals.css patché');
  "
fi

# ── 7. Patch app/layout.tsx — injecter AppProvider ──────────
node -e "
  const fs = require('fs');
  const file = 'app/layout.tsx';
  let content = fs.readFileSync(file, 'utf8');

  // Déjà patché ?
  if (content.includes('AppProvider')) {
    console.log('⚠️  AppProvider déjà présent dans layout.tsx, ignoré.');
    process.exit(0);
  }

  // Ajouter l'import
  content = content.replace(
    /^(import .+\n)/m,
    'import { AppProvider } from \"@/lib/contexts/AppContext\";\n\$1'
  );

  // Entourer le contenu du body avec AppProvider
  // Pattern: cherche <body ...> ... </body> et entoure le contenu
  content = content.replace(
    /(<body[^>]*>)([\s\S]*?)(<\/body>)/,
    '\$1\n      <AppProvider>\$2</AppProvider>\n    \$3'
  );

  fs.writeFileSync(file, content);
  console.log('✅ app/layout.tsx patché avec AppProvider');
"

# ── 8. Git commit & push ────────────────────────────────────
echo ""
echo "📦 Commit et push vers GitHub..."
git add -A
git commit -m "feat: traduction nav + système de thèmes (Nuit/Aurore/Océan)

- Nouveau lib/i18n.ts : source unique des traductions (4 langues)
- Nouveau lib/contexts/AppContext.tsx : langue + thème partagés
- Navbar traduite dynamiquement selon la langue active
- Sélecteurs langue ET thème dans la nav desktop et mobile
- 3 thèmes : Nuit (violet), Aurore (brun chaud), Océan (bleu)
- Préférences persistées en localStorage"

git push
echo ""
echo "🎉 Déploiement terminé ! Vercel met à jour dans ~1 minute."
echo "   👉 https://pawmatch-app-7ukn-beta.vercel.app"
