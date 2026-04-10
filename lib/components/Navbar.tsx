"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAppContext } from "@/lib/contexts/AppContext";
import { LANGS, THEMES } from "@/lib/i18n";
import NotificationBell from "@/lib/components/NotificationBell";
import PawScoreBadge from "@/lib/components/PawScoreBadge";
import PawCoinsBadge from "@/lib/components/PawCoinsBadge";

const NAV_CSS = `
@keyframes navPulse {
  0%,100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.45); }
  50%     { box-shadow: 0 0 0 10px rgba(34,197,94,0); }
}
@keyframes bellPulse {
  0%,100% { transform: scale(1); filter: drop-shadow(0 0 0px rgba(34,197,94,0)); }
  50%     { transform: scale(1.12); filter: drop-shadow(0 0 6px rgba(34,197,94,0.6)); }
}
@keyframes badgePulse {
  0%,100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239,68,68,0.7); }
  50%     { transform: scale(1.2); box-shadow: 0 0 0 6px rgba(239,68,68,0); }
}
@keyframes gradientSpin {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
@keyframes glowFloat {
  0%,100% { opacity: 0.6; transform: translateY(0); }
  50%     { opacity: 1; transform: translateY(-1px); }
}
@keyframes dropIn {
  from { opacity: 0; transform: translateY(-8px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
.nav-pulse { animation: navPulse 2s ease-in-out infinite; }
.bell-pulse { animation: bellPulse 2s ease-in-out infinite; }
.badge-pulse { animation: badgePulse 1.8s ease-in-out infinite; }
.glow-float { animation: glowFloat 2.5s ease-in-out infinite; }
.drop-in { animation: dropIn 0.2s cubic-bezier(0.16, 1, 0.3, 1); }

.nav-link-f {
  position: relative;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.nav-link-f::after {
  content: ''; position: absolute; bottom: 2px; left: 12px; right: 12px;
  height: 2px; background: linear-gradient(90deg, #22C55E, #FACC15);
  border-radius: 1px; transform: scaleX(0); transform-origin: left;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 0 8px rgba(34,197,94,0.4);
}
.nav-link-f:hover::after, .nav-link-f.active::after { transform: scaleX(1); }

.nav-pill-active {
  background: rgba(34,197,94,0.08);
  border: 1px solid rgba(34,197,94,0.25);
}
[data-theme="clair"] .nav-pill-active {
  background: rgba(34,197,94,0.1);
  border: 1px solid rgba(34,197,94,0.2);
}

.logo-gradient {
  background: linear-gradient(135deg, #22C55E 0%, #16A34A 40%, #FACC15 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
}

.btn-neon { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.btn-neon:hover { box-shadow: 0 0 20px rgba(34,197,94,0.4); transform: translateY(-1px); }

.bottom-nav-accent-line {
  position: absolute; top: 0; left: 0; right: 0; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(34,197,94,0.4), rgba(250,204,21,0.3), transparent);
}

.featured-btn-ring {
  background: linear-gradient(135deg, #22C55E, #FACC15, #8B5CF6, #22C55E);
  background-size: 300% 300%;
  animation: gradientSpin 3s ease infinite;
  padding: 2px; border-radius: 9999px;
  box-shadow: 0 0 15px rgba(34,197,94,0.35), 0 4px 15px rgba(0,0,0,0.2);
}

.bottom-tab-active-glow {
  position: absolute; bottom: -2px; left: 50%; transform: translateX(-50%);
  width: 24px; height: 3px; border-radius: 2px;
  background: linear-gradient(90deg, #22C55E, #FACC15);
  box-shadow: 0 0 10px rgba(34,197,94,0.5);
}
`;

/* Dropdown hook: open state + click outside */
function useDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  return { open, setOpen, ref };
}

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasNewMatches, setHasNewMatches] = useState(false);
  const [hasPendingSwipes, setHasPendingSwipes] = useState(false);
  const pathname = usePathname();
  const supabase = createClient();
  const { lang, setLang, theme, themePreference, setTheme, t } = useAppContext();

  const langDrop = useDropdown();
  const themeDrop = useDropdown();

  // Only fetch user on mount — NOT on every pathname change
  const fetched = useRef(false);
  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
      if (user) {
        // Run badge checks in background (non-blocking)
        Promise.resolve(
          supabase.from("matches").select("*", { count: "exact", head: true })
            .or(`sender_user_id.eq.${user.id},receiver_user_id.eq.${user.id}`)
        ).then(({ count }) => setHasNewMatches((count || 0) > 0)).catch(() => {});
        Promise.resolve(
          supabase.from("animals").select("*", { count: "exact", head: true })
            .neq("created_by", user.id).limit(1)
        ).then(({ count }) => setHasPendingSwipes((count || 0) > 0)).catch(() => {});
      }
    }
    getUser();
  }, []);

  const isActive = (p: string) => pathname === p;
  const isLight = theme === "clair" || theme === "aurore" || theme === "ocean";
  const currentFlag = LANGS.find(l => l.code === lang)?.flag || "🇫🇷";
  const currentThemeLabel = THEMES.find(th => th.code === themePreference)?.label || "🎨";

  const dropBg = {
    background: isLight ? "rgba(255,255,255,0.96)" : "var(--c-card, rgba(20,16,32,0.96))",
    backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
    borderColor: isLight ? "rgba(0,0,0,0.1)" : "var(--c-border, rgba(255,255,255,0.08))",
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: NAV_CSS }} />

      {/* Skip to content link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[200] focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-bold"
        style={{ background: "var(--c-accent)", color: "#fff" }}
      >
        Aller au contenu principal
      </a>

      {/* ═══ TOP NAVBAR ═══ */}
      <nav className="sticky top-0 z-50" role="navigation" aria-label="Navigation principale" style={{
        background: isLight ? "rgba(255,255,255,0.78)" : "rgba(15,12,26,0.7)",
        backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
        borderBottom: "1px solid transparent",
        borderImage: "linear-gradient(90deg, transparent, rgba(34,197,94,0.2), rgba(250,204,21,0.15), transparent) 1",
      }}>
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between h-12">
            <Link href="/" className="logo-gradient font-extrabold text-xl tracking-tight select-none" aria-label="Pawly - Accueil">Pawly</Link>

            {/* Desktop links — grouped dropdowns */}
            <div className="hidden md:flex items-center gap-1">
              {!loading && (user ? (
                <>
                  <NavDropdown label="Decouvrir" light={isLight} activeInGroup={["/feed","/explore","/reels","/leaderboard","/live","/search"].some(p => isActive(p))} items={[
                    { href: "/feed", label: "Feed", active: isActive("/feed") },
                    { href: "/explore", label: "Explorer", active: isActive("/explore") },
                    { href: "/reels", label: "Reels", active: isActive("/reels") },
                    { href: "/live", label: "Live", active: isActive("/live") },
                    { href: "/leaderboard", label: "Classement", active: isActive("/leaderboard") },
                    { href: "/concours", label: "Concours", active: isActive("/concours") },
                    { href: "/search", label: "Recherche", active: isActive("/search") },
                  ]} />
                  <NavDropdown label="Social" light={isLight} activeInGroup={["/flairer","/matches","/groups"].some(p => isActive(p))} items={[
                    { href: "/flairer", label: t.navFlairer, active: isActive("/flairer") },
                    { href: "/matches", label: t.navMatches, active: isActive("/matches") },
                    { href: "/groups", label: "Groupes", active: isActive("/groups") },
                    { href: "/stories", label: "Stories", active: isActive("/stories") },
                  ]} />
                  <NavDropdown label="Outils" light={isLight} activeInGroup={["/carte","/wallet","/urgence","/balade","/marketplace","/filters"].some(p => isActive(p))} items={[
                    { href: "/carte", label: "Carte", active: isActive("/carte") },
                    { href: "/wallet", label: "PawCoins", active: isActive("/wallet") },
                    { href: "/filters", label: "Filtres AR", active: isActive("/filters") },
                    { href: "/urgence", label: "SOS Animal", active: isActive("/urgence") },
                    { href: "/balade", label: "Balade live", active: isActive("/balade") },
                    { href: "/marketplace", label: "Marketplace", active: isActive("/marketplace") },
                  ]} />
                  <a href="https://pawdirectory.ch" target="_blank" rel="noopener noreferrer" className={"px-3 py-1.5 rounded-full text-sm font-medium transition-all " + (isLight ? "text-gray-600 hover:text-green-600 hover:bg-green-50" : "text-gray-400 hover:text-green-400 hover:bg-green-500/10")}>
                    PawDirectory ↗
                  </a>
                  <NavDropdown label={t.navProfil} light={isLight} activeInGroup={["/profile","/settings"].some(p => isActive(p))} items={[
                    { href: "/profile", label: "Mon profil", active: isActive("/profile") },
                    { href: "/settings", label: "Parametres", active: isActive("/settings") },
                  ]} />
                </>
              ) : (
                <>
                  <NL href="/flairer" active={isActive("/flairer")} label={t.navFlairer} light={isLight} />
                  <NL href="/explore" active={isActive("/explore")} label="Explorer" light={isLight} />
                  <NL href="/pricing" active={isActive("/pricing")} label={t.navPricing} light={isLight} />
                  <a href="https://pawdirectory.ch" target="_blank" rel="noopener noreferrer" className={"px-3 py-1.5 rounded-full text-sm font-medium transition-all " + (isLight ? "text-gray-600 hover:text-green-600 hover:bg-green-50" : "text-gray-400 hover:text-green-400 hover:bg-green-500/10")}>
                    PawDirectory
                  </a>
                  <Link href="/signup" className="btn-neon ml-3 px-6 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white text-sm font-bold rounded-full shadow-lg shadow-green-500/20">
                    {t.navJoin}
                  </Link>
                </>
              ))}
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-1.5">
              {!loading && user && (
                <>
                  <PawCoinsBadge />
                  <PawScoreBadge />
                  <div className={hasNewMatches ? "bell-pulse" : ""}><NotificationBell /></div>
                </>
              )}

              {/* 🔄 Refresh page (soft reload without logout) */}
              {!loading && user && (
                <button
                  onClick={() => {
                    // Soft refresh: re-fetch data without full page reload to avoid logout
                    if (typeof window !== "undefined") {
                      window.location.reload();
                    }
                  }}
                  aria-label="Rafraichir la page"
                  className={"p-2 rounded-full transition-all duration-200 " +
                    (isLight ? "hover:bg-gray-100" : "hover:bg-[var(--c-card)]")}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    className="text-[var(--c-text-muted)]" style={{ display: "block" }}>
                    <path d="M21 2v6h-6" />
                    <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                    <path d="M3 22v-6h6" />
                    <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                  </svg>
                </button>
              )}

              {/* 🌐 Language dropdown */}
              <div ref={langDrop.ref} className="relative">
                <button
                  onClick={() => { langDrop.setOpen(o => !o); themeDrop.setOpen(false); }}
                  aria-label="Changer la langue"
                  aria-expanded={langDrop.open}
                  aria-haspopup="listbox"
                  className={"p-2 rounded-full transition-all duration-200 text-sm " +
                    (langDrop.open ? "bg-green-500/15" : isLight ? "hover:bg-gray-100" : "hover:bg-[var(--c-card)]")}
                >
                  {currentFlag}
                </button>
                {langDrop.open && (
                  <div className="drop-in absolute right-0 top-full mt-1.5 w-40 rounded-xl border shadow-xl z-50 overflow-hidden" role="listbox" aria-label="Langues disponibles" style={dropBg}>
                    {LANGS.map(l => (
                      <button key={l.code} role="option" aria-selected={lang === l.code} onClick={() => { setLang(l.code as any); langDrop.setOpen(false); }}
                        className={"w-full flex items-center gap-3 px-4 py-2.5 transition-all duration-200 " +
                          (lang === l.code
                            ? "bg-green-500/10"
                            : isLight ? "hover:bg-gray-50" : "hover:bg-[var(--c-card)]")}
                      >
                        <span className="text-lg">{l.flag}</span>
                        <span className={"text-sm font-medium " + (lang === l.code ? "text-green-400" : "text-[var(--c-text)]")}>
                          {l.code === "fr" ? "Français" : l.code === "de" ? "Deutsch" : l.code === "it" ? "Italiano" : "English"}
                        </span>
                        {lang === l.code && <span className="ml-auto text-green-400">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 🎨 Theme dropdown */}
              <div ref={themeDrop.ref} className="relative">
                <button
                  onClick={() => { themeDrop.setOpen(o => !o); langDrop.setOpen(false); }}
                  aria-label="Changer le theme"
                  aria-expanded={themeDrop.open}
                  aria-haspopup="listbox"
                  className={"p-2 rounded-full transition-all duration-200 text-sm " +
                    (themeDrop.open ? "bg-green-500/15" : isLight ? "hover:bg-gray-100" : "hover:bg-[var(--c-card)]")}
                >
                  {currentThemeLabel}
                </button>
                {themeDrop.open && (
                  <div className="drop-in absolute right-0 top-full mt-1.5 w-48 rounded-xl border shadow-xl z-50 overflow-hidden" role="listbox" aria-label="Themes disponibles" style={dropBg}>
                    {THEMES.map(th => {
                      const active = themePreference === th.code;
                      return (
                        <button key={th.code} role="option" aria-selected={active} onClick={() => { setTheme(th.code as any); themeDrop.setOpen(false); }}
                          className={"w-full flex items-center gap-3 px-4 py-2.5 transition-all duration-200 " +
                            (active ? "bg-green-500/10" : isLight ? "hover:bg-gray-50" : "hover:bg-[var(--c-card)]")}
                        >
                          <span className="text-base">{th.label}</span>
                          <span className={"text-sm font-medium " + (active ? "text-green-400" : "text-[var(--c-text)]")}>
                            {th.code === "auto" ? (t.themeAuto || "Auto") : th.name}
                          </span>
                          {active && <span className="ml-auto text-green-400">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {!loading && !user && (
                <Link href="/signup" className="md:hidden btn-neon px-3 py-1 bg-gradient-to-r from-green-500 to-green-600 text-white text-[10px] font-bold rounded-full">
                  {t.navJoin}
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* ═══ MOBILE BOTTOM NAV ═══ */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 safe-area-bottom" role="navigation" aria-label="Navigation mobile" style={{
        background: isLight ? "rgba(255,255,255,0.92)" : "rgba(15,12,26,0.9)",
        backdropFilter: "blur(20px) saturate(1.2)", WebkitBackdropFilter: "blur(20px) saturate(1.2)",
      }}>
        <div className="bottom-nav-glow-line" />
        <div className="flex items-center justify-around h-[58px] px-1 relative">
          <BT href={user ? "/feed" : "/"} active={isActive("/feed") || isActive("/")} label={t.navHome} light={isLight}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={(isActive("/feed") || isActive("/")) ? 2.5 : 1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
          </BT>
          <BT href="/reels" active={isActive("/reels")} label="Reels" light={isLight}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive("/reels") ? 2.5 : 1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0118 7.125v-1.5m1.125 2.625c-.621 0-1.125.504-1.125 1.125v1.5m2.625-2.625c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 016 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m-12 5.25v-5.25m0 5.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125m-12 0v-1.5c0-.621-.504-1.125-1.125-1.125M18 18.375v-5.25m0 5.25v-1.5c0-.621.504-1.125 1.125-1.125M18 13.125v1.5c0 .621.504 1.125 1.125 1.125M18 13.125c0-.621.504-1.125 1.125-1.125M6 13.125v1.5c0 .621-.504 1.125-1.125 1.125M6 13.125C6 12.504 5.496 12 4.875 12m-1.5 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M19.125 12h1.5m0 0c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h1.5m14.25 0h1.5" />
            </svg>
          </BT>
          <BT href="/flairer" active={isActive("/flairer")} label={t.navFlairer} featured pulse={hasPendingSwipes && !isActive("/flairer")} light={isLight}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
          </BT>
          <BT href="/explore" active={isActive("/explore")} label="Explorer" light={isLight}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive("/explore") ? 2.5 : 1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
            </svg>
          </BT>
          <BT href="/leaderboard" active={isActive("/leaderboard")} label="Top" light={isLight}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive("/leaderboard") ? 2.5 : 1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-4.5A3.375 3.375 0 0012.75 11h-.5A3.375 3.375 0 009 14.25v4.5m7.5 0h-6M12 3.75l2.25 2.25L12 8.25 9.75 6 12 3.75z" />
            </svg>
          </BT>
          {!loading && user ? (
            <>
              <BT href="/matches" active={isActive("/matches")} label={t.navMatches} badge={hasNewMatches} light={isLight}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive("/matches") ? 2.5 : 1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                </svg>
              </BT>
              <BT href="/profile" active={isActive("/profile")} label={t.navProfil} light={isLight}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive("/profile") ? 2.5 : 1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </BT>
            </>
          ) : (
            <>
              <BT href="/pricing" active={isActive("/pricing")} label={t.navPricing} light={isLight}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive("/pricing") ? 2.5 : 1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </BT>
              <BT href="/login" active={isActive("/login")} label={t.navLogin} light={isLight}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive("/login") ? 2.5 : 1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
              </BT>
            </>
          )}
        </div>
      </nav>
      <div className="md:hidden h-16 safe-area-bottom" />
    </>
  );
}

function NavDropdown({ label, items, light, activeInGroup }: {
  label: string;
  items: { href: string; label: string; active: boolean }[];
  light?: boolean;
  activeInGroup?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={
          "nav-link-f px-3 py-2 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-1 " +
          (activeInGroup ? "nav-pill-active active text-green-400 font-semibold"
            : light ? "text-gray-600 hover:text-gray-900 hover:bg-gray-100/50"
            : "text-gray-400 hover:text-white hover:bg-[var(--c-card)]")
        }
      >
        {label}
        <svg className={"w-3 h-3 transition-transform " + (open ? "rotate-180" : "")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div
          className="drop-in absolute top-full left-0 mt-1 py-1.5 rounded-xl shadow-xl z-50 min-w-[160px] border"
          style={{
            background: light ? "rgba(255,255,255,0.96)" : "var(--c-card, rgba(20,16,32,0.96))",
            backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
            borderColor: light ? "rgba(0,0,0,0.1)" : "var(--c-border, rgba(255,255,255,0.08))",
          }}
        >
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={
                "block px-4 py-2 text-sm transition-all " +
                (item.active
                  ? "text-green-400 font-semibold bg-green-500/10"
                  : light
                  ? "text-gray-600 hover:text-green-600 hover:bg-green-50"
                  : "text-gray-400 hover:text-white hover:bg-white/5")
              }
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function NL({ href, active, label, light }: { href: string; active: boolean; label: string; light?: boolean }) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={
      "nav-link-f px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 " +
      (active ? "nav-pill-active active text-green-400 font-semibold"
        : light ? "text-gray-600 hover:text-gray-900 hover:bg-gray-100/50"
        : "text-gray-400 hover:text-white hover:bg-[var(--c-card)]")
    }>{label}</Link>
  );
}

function BT({ href, active, label, featured, pulse, badge, light, children }: {
  href: string; active: boolean; label: string;
  featured?: boolean; pulse?: boolean; badge?: boolean; light?: boolean;
  children: React.ReactNode;
}) {
  if (featured) {
    return (
      <Link href={href} aria-label={label} aria-current={active ? "page" : undefined} className="bottom-nav-item flex flex-col items-center -mt-5 relative bottom-nav-touch">
        <div className={"featured-btn-ring transition-all duration-300 " + (pulse ? "nav-pulse" : "")}>
          <div className={
            "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 " +
            (active ? "bg-gradient-to-br from-green-500 to-green-600 text-white scale-110"
              : "bg-gradient-to-br from-green-500/90 to-green-600/90 text-white hover:scale-105")}
            style={active ? { boxShadow: "0 0 20px rgba(34,197,94,0.5)" } : undefined}
          >{children}</div>
        </div>
        <span aria-hidden="true" className={"text-[9px] mt-1 font-medium " + (active ? "text-green-400 font-bold" : "text-gray-500")}>{label}</span>
        {active && <span className="bottom-nav-active-dot" style={{ bottom: "-2px" }} />}
      </Link>
    );
  }
  return (
    <Link href={href} aria-label={label} aria-current={active ? "page" : undefined} className="bottom-nav-item flex flex-col items-center py-1 px-2 relative group bottom-nav-touch">
      {active && <span className="absolute -top-0 left-1/2 -translate-x-1/2 w-6 h-[3px] rounded-full" style={{ background: "linear-gradient(90deg, #22C55E, #FACC15)", boxShadow: "0 0 8px rgba(34,197,94,0.5)" }} />}
      <span className={"transition-all duration-300 " + (active ? "text-green-400 scale-110 glow-float" : light ? "text-gray-500 group-hover:text-gray-700" : "text-gray-500 group-hover:text-gray-300")}
        style={active ? { filter: "drop-shadow(0 0 6px rgba(34,197,94,0.4))" } : undefined}
      >{children}</span>
      {badge && !active && <span aria-label="Nouvelles notifications" className="badge-pulse absolute top-0 right-1 w-2.5 h-2.5 rounded-full" style={{ background: "linear-gradient(135deg, #ef4444, #f97316)", boxShadow: "0 0 8px rgba(239,68,68,0.6)" }} />}
      {active && <div className="bottom-tab-active-glow" />}
      {active && <span className="bottom-nav-active-dot" />}
      <span aria-hidden="true" className={"text-[9px] mt-0.5 " + (active ? "text-green-400 font-bold" : light ? "text-gray-400" : "text-gray-500")}>{label}</span>
    </Link>
  );
}
