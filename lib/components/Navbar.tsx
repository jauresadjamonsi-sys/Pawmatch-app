"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { useAppContext } from "@/lib/contexts/AppContext";
import { LANGS, THEMES } from "@/lib/i18n";

// Lazy-load non-critical navbar widgets
const NotificationBell = dynamic(() => import("@/lib/components/NotificationBell"), { ssr: false });
const PawScoreBadge = dynamic(() => import("@/lib/components/PawScoreBadge"), { ssr: false });
const PawCoinsBadge = dynamic(() => import("@/lib/components/PawCoinsBadge"), { ssr: false });

const NAV_CSS = `
@keyframes navPulse {
  0%,100% { box-shadow: 0 0 0 0 rgba(251,191,36,0.45); }
  50%     { box-shadow: 0 0 0 10px rgba(251,191,36,0); }
}
@keyframes bellPulse {
  0%,100% { transform: scale(1); filter: drop-shadow(0 0 0px rgba(251,191,36,0)); }
  50%     { transform: scale(1.12); filter: drop-shadow(0 0 6px rgba(251,191,36,0.6)); }
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
  height: 2px; background: linear-gradient(90deg, #FBBF24, #FACC15);
  border-radius: 1px; transform: scaleX(0); transform-origin: left;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 0 8px rgba(251,191,36,0.4);
}
.nav-link-f:hover::after, .nav-link-f.active::after { transform: scaleX(1); }

.nav-pill-active {
  background: rgba(251,191,36,0.08);
  border: 1px solid rgba(251,191,36,0.25);
}
[data-theme="clair"] .nav-pill-active {
  background: rgba(251,191,36,0.1);
  border: 1px solid rgba(251,191,36,0.2);
}

.logo-gradient {
  background: linear-gradient(135deg, #FBBF24 0%, #F59E0B 40%, #FACC15 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
}

.btn-neon { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.btn-neon:hover { box-shadow: 0 0 20px rgba(251,191,36,0.4); transform: translateY(-1px); }

.bottom-nav-accent-line {
  position: absolute; top: 0; left: 0; right: 0; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(251,191,36,0.4), rgba(250,204,21,0.3), transparent);
}

.featured-btn-ring {
  background: linear-gradient(135deg, #FBBF24, #FACC15, #8B5CF6, #FBBF24);
  background-size: 300% 300%;
  animation: gradientSpin 3s ease infinite;
  padding: 2px; border-radius: 9999px;
  box-shadow: 0 0 15px rgba(251,191,36,0.35), 0 4px 15px rgba(0,0,0,0.2);
}

.bottom-tab-active-glow {
  position: absolute; bottom: -2px; left: 50%; transform: translateX(-50%);
  width: 24px; height: 3px; border-radius: 2px;
  background: linear-gradient(90deg, #FBBF24, #FACC15);
  box-shadow: 0 0 10px rgba(251,191,36,0.5);
  animation: tabIndicatorIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes tabIndicatorIn {
  0% { transform: translateX(-50%) scaleX(0); opacity: 0; }
  100% { transform: translateX(-50%) scaleX(1); opacity: 1; }
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
      <nav className={"sticky top-0 z-50 " + (isLight ? "" : "glass-living")} role="navigation" aria-label="Navigation principale" style={{
        ...(isLight ? {
          background: "rgba(255,255,255,0.78)",
          backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
        } : {}),
        borderBottom: "1px solid transparent",
        borderImage: "linear-gradient(90deg, transparent, rgba(251,191,36,0.2), rgba(250,204,21,0.15), transparent) 1",
      }}>
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between h-12">
            <Link href="/" className="logo-gradient font-extrabold text-xl tracking-tight select-none" aria-label="Pawly - Accueil">Pawly</Link>

            {/* Desktop links — grouped dropdowns */}
            <div className="hidden md:flex items-center gap-1">
              {!loading && (user ? (
                <>
                  <NavDropdown label={t.navDiscover} light={isLight} activeInGroup={["/feed","/explore","/reels","/leaderboard","/live","/search"].some(p => isActive(p))} items={[
                    { href: "/feed", label: t.navFeed, active: isActive("/feed") },
                    { href: "/explore", label: t.navExplorer, active: isActive("/explore") },
                    { href: "/reels", label: t.navReels, active: isActive("/reels") },
                    { href: "/live", label: t.navLive, active: isActive("/live") },
                    { href: "/leaderboard", label: t.navRanking, active: isActive("/leaderboard") },
                    { href: "/concours", label: t.navContest, active: isActive("/concours") },
                    { href: "/search", label: t.navSearch, active: isActive("/search") },
                  ]} />
                  <NavDropdown label={t.navSocial} light={isLight} activeInGroup={["/flairer","/messages","/matches","/groups"].some(p => isActive(p))} items={[
                    { href: "/flairer", label: t.navFlairer, active: isActive("/flairer") },
                    { href: "/messages", label: t.navMessages || "Discussions", active: isActive("/messages") },
                    { href: "/matches", label: t.navMatches, active: isActive("/matches") },
                    { href: "/groups", label: t.navGroups, active: isActive("/groups") },
                    { href: "/stories", label: t.navStories, active: isActive("/stories") },
                  ]} />
                  <NavDropdown label={t.navTools} light={isLight} activeInGroup={["/carte","/wallet","/urgence","/balade","/marketplace","/filters"].some(p => isActive(p))} items={[
                    { href: "/carte", label: t.navMap, active: isActive("/carte") },
                    { href: "/wallet", label: t.navPawCoins, active: isActive("/wallet") },
                    { href: "/filters", label: t.navARFilters, active: isActive("/filters") },
                    { href: "/urgence", label: t.navSOS, active: isActive("/urgence") },
                    { href: "/balade", label: t.navWalkLive, active: isActive("/balade") },
                    { href: "/marketplace", label: t.navMarketplace, active: isActive("/marketplace") },
                  ]} />
                  <a href="https://pawdirectory.ch" target="_blank" rel="noopener noreferrer" className={"px-3 py-1.5 rounded-full text-sm font-medium transition-all " + (isLight ? "text-gray-600 hover:text-amber-500 hover:bg-amber-50" : "text-gray-400 hover:text-amber-300 hover:bg-amber-400/10")}>
                    PawDirectory ↗
                  </a>
                  <NavDropdown label={t.navProfil} light={isLight} activeInGroup={["/profile","/settings"].some(p => isActive(p))} items={[
                    { href: "/profile", label: t.navMyProfile, active: isActive("/profile") },
                    { href: "/settings", label: t.navSettings, active: isActive("/settings") },
                  ]} />
                </>
              ) : (
                <>
                  <NL href="/flairer" active={isActive("/flairer")} label={t.navFlairer} light={isLight} />
                  <NL href="/explore" active={isActive("/explore")} label={t.navExplorer} light={isLight} />
                  <NL href="/pricing" active={isActive("/pricing")} label={t.navPricing} light={isLight} />
                  <a href="https://pawdirectory.ch" target="_blank" rel="noopener noreferrer" className={"px-3 py-1.5 rounded-full text-sm font-medium transition-all " + (isLight ? "text-gray-600 hover:text-amber-500 hover:bg-amber-50" : "text-gray-400 hover:text-amber-300 hover:bg-amber-400/10")}>
                    PawDirectory
                  </a>
                  <Link href="/signup" className="btn-neon ml-3 px-6 py-2 bg-gradient-to-r from-amber-400 to-amber-500 text-white text-sm font-bold rounded-full shadow-lg shadow-amber-400/20">
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
                  <PawScoreBadge useApi />
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
                    (langDrop.open ? "bg-amber-400/15" : isLight ? "hover:bg-gray-100" : "hover:bg-[var(--c-card)]")}
                >
                  {currentFlag}
                </button>
                {langDrop.open && (
                  <div className="drop-in absolute right-0 top-full mt-1.5 w-40 rounded-xl border shadow-xl z-50 overflow-hidden" role="listbox" aria-label="Langues disponibles" style={dropBg}>
                    {LANGS.map(l => (
                      <button key={l.code} role="option" aria-selected={lang === l.code} onClick={() => { setLang(l.code as any); langDrop.setOpen(false); }}
                        className={"w-full flex items-center gap-3 px-4 py-2.5 transition-all duration-200 " +
                          (lang === l.code
                            ? "bg-amber-400/10"
                            : isLight ? "hover:bg-gray-50" : "hover:bg-[var(--c-card)]")}
                      >
                        <span className="text-lg">{l.flag}</span>
                        <span className={"text-sm font-medium " + (lang === l.code ? "text-amber-300" : "text-[var(--c-text)]")}>
                          {l.code === "fr" ? "Français" : l.code === "de" ? "Deutsch" : l.code === "it" ? "Italiano" : "English"}
                        </span>
                        {lang === l.code && <span className="ml-auto text-amber-300">✓</span>}
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
                    (themeDrop.open ? "bg-amber-400/15" : isLight ? "hover:bg-gray-100" : "hover:bg-[var(--c-card)]")}
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
                            (active ? "bg-amber-400/10" : isLight ? "hover:bg-gray-50" : "hover:bg-[var(--c-card)]")}
                        >
                          <span className="text-base">{th.label}</span>
                          <span className={"text-sm font-medium " + (active ? "text-amber-300" : "text-[var(--c-text)]")}>
                            {th.code === "auto" ? (t.themeAuto || "Auto") : (t[`theme${th.code.charAt(0).toUpperCase() + th.code.slice(1)}`] || th.name)}
                          </span>
                          {active && <span className="ml-auto text-amber-300">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {!loading && !user && (
                <Link href="/signup" className="md:hidden btn-neon px-3 py-1 bg-gradient-to-r from-amber-400 to-amber-500 text-white text-[10px] font-bold rounded-full">
                  {t.navJoin}
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* ═══ MOBILE BOTTOM NAV — 5 tabs ═══ */}
      <MobileBottomNav
        user={user}
        loading={loading}
        isActive={isActive}
        isLight={isLight}
        hasPendingSwipes={hasPendingSwipes}
        hasNewMatches={hasNewMatches}
        t={t}
      />
    </>
  );
}

/* ═══ SERVICES MENU ITEMS ═══ */
function getServicesItems(t: Record<string, string>) {
  return [
    { href: "/carte", label: t.navMap, emoji: "🗺️" },
    { href: "/wallet", label: t.navPawCoins, emoji: "🪙" },
    { href: "/marketplace", label: t.navMarketplace, emoji: "🛒" },
    { href: "/urgence", label: t.navSOS, emoji: "🚨" },
    { href: "/balade", label: t.navWalkLive, emoji: "🐕" },
  ];
}

function MobileBottomNav({ user, loading, isActive, isLight, hasPendingSwipes, hasNewMatches, t }: {
  user: any; loading: boolean;
  isActive: (p: string) => boolean;
  isLight: boolean; hasPendingSwipes: boolean; hasNewMatches: boolean;
  t: any;
}) {
  const [servicesOpen, setServicesOpen] = useState(false);
  const servicesRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!servicesOpen) return;
    const handler = (e: MouseEvent) => {
      if (servicesRef.current && !servicesRef.current.contains(e.target as Node)) setServicesOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [servicesOpen]);

  const isServicesActive = ["/carte", "/wallet", "/marketplace", "/urgence", "/balade"].some(p => isActive(p));

  return (
    <>
      {/* Services overlay panel */}
      {servicesOpen && (
        <div className="md:hidden fixed inset-0 z-40" onClick={() => setServicesOpen(false)}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }} />
        </div>
      )}
      {servicesOpen && (
        <div
          ref={servicesRef}
          className="md:hidden fixed bottom-[68px] left-4 right-4 z-50 rounded-2xl p-3 drop-in safe-area-bottom"
          style={{
            background: isLight ? "rgba(255,255,255,0.96)" : "rgba(20,16,32,0.96)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid",
            borderColor: isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)",
            boxShadow: "0 -8px 32px rgba(0,0,0,0.2), 0 0 20px rgba(251,191,36,0.1)",
          }}
        >
          <div className="text-center mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--c-text-muted)" }}>{t.navServices}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {getServicesItems(t).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setServicesOpen(false)}
                className={"flex flex-col items-center gap-1 py-3 px-2 rounded-xl transition-all duration-200 " +
                  (isActive(item.href)
                    ? "bg-amber-400/15"
                    : isLight ? "hover:bg-gray-50 active:bg-gray-100" : "hover:bg-white/5 active:bg-white/10")}
                style={{ textDecoration: "none" }}
              >
                <span className="text-xl">{item.emoji}</span>
                <span className={"text-[11px] font-semibold " + (isActive(item.href) ? "text-amber-300" : "")}
                  style={{ color: isActive(item.href) ? undefined : "var(--c-text)" }}>
                  {item.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Bottom nav bar */}
      <nav className="nav-living md:hidden fixed bottom-0 left-0 right-0 z-50 safe-area-bottom" role="navigation" aria-label="Navigation mobile">
        <div className="bottom-nav-glow-line" />
        <div className="flex items-center justify-around h-[62px] px-1 relative">
          {/* 1. Mon ami (Feed) */}
          <Link href={user ? "/feed" : "/"} aria-label="Mon ami" aria-current={(isActive("/feed") || isActive("/")) ? "page" : undefined}
            className={"nav-living-item" + ((isActive("/feed") || isActive("/")) ? " active" : "")}>
            <span className="text-xl">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={(isActive("/feed") || isActive("/")) ? 2.5 : 1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
            </span>
            <span aria-hidden="true" className="text-[9px] mt-0.5 font-medium">Mon ami</span>
          </Link>

          {/* 2. Flairer (featured heart) */}
          <Link href="/flairer" aria-label="Flairer" aria-current={isActive("/flairer") ? "page" : undefined}
            className="nav-living-item flex flex-col items-center -mt-5 relative">
            <div className={"featured-btn-ring transition-all duration-300 " + ((hasPendingSwipes && !isActive("/flairer")) ? "nav-pulse" : "")}>
              <div className={
                "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 " +
                (isActive("/flairer") ? "bg-gradient-to-br from-amber-400 to-amber-500 text-white scale-110"
                  : "bg-gradient-to-br from-amber-400/90 to-amber-500/90 text-white hover:scale-105")}
                style={isActive("/flairer") ? { boxShadow: "0 0 20px rgba(251,191,36,0.5)" } : undefined}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              </div>
            </div>
            <span aria-hidden="true" className={"text-[9px] mt-1 font-medium " + (isActive("/flairer") ? "text-amber-300 font-bold" : "text-gray-500")}>Flairer</span>
          </Link>

          {/* 3. Explorer */}
          <Link href="/explore" aria-label="Explorer" aria-current={isActive("/explore") ? "page" : undefined}
            className={"nav-living-item" + (isActive("/explore") ? " active" : "")}>
            <span className="text-xl">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive("/explore") ? 2.5 : 1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </span>
            <span aria-hidden="true" className="text-[9px] mt-0.5 font-medium">Explorer</span>
          </Link>

          {/* 4. Messages (Discussions) */}
          <Link href="/messages" aria-label={t.navMessages || "Messages"} aria-current={(isActive("/messages") || isActive("/matches")) ? "page" : undefined}
            className={"nav-living-item" + ((isActive("/messages") || isActive("/matches")) ? " active" : "")}>
            <span className="text-xl relative">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={(isActive("/messages") || isActive("/matches")) ? 2.5 : 1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
              {hasNewMatches && !isActive("/messages") && !isActive("/matches") && <span aria-label="Nouveaux messages" className="badge-pulse absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full" style={{ background: "linear-gradient(135deg, #ef4444, #FBBF24)", boxShadow: "0 0 8px rgba(239,68,68,0.6)" }} />}
            </span>
            <span aria-hidden="true" className="text-[9px] mt-0.5 font-medium">{t.navMessages || "Messages"}</span>
          </Link>

          {/* 5. Profil */}
          {!loading && user ? (
            <Link href="/profile" aria-label="Profil" aria-current={isActive("/profile") ? "page" : undefined}
              className={"nav-living-item" + (isActive("/profile") ? " active" : "")}>
              <span className="text-xl">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive("/profile") ? 2.5 : 1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </span>
              <span aria-hidden="true" className="text-[9px] mt-0.5 font-medium">Profil</span>
            </Link>
          ) : (
            <Link href="/login" aria-label={t.navLogin} aria-current={isActive("/login") ? "page" : undefined}
              className={"nav-living-item" + (isActive("/login") ? " active" : "")}>
              <span className="text-xl">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive("/login") ? 2.5 : 1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
              </span>
              <span aria-hidden="true" className="text-[9px] mt-0.5 font-medium">{t.navLogin}</span>
            </Link>
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
          (activeInGroup ? "nav-pill-active active text-amber-300 font-semibold"
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
                  ? "text-amber-300 font-semibold bg-amber-400/10"
                  : light
                  ? "text-gray-600 hover:text-amber-500 hover:bg-amber-50"
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
      (active ? "nav-pill-active active text-amber-300 font-semibold"
        : light ? "text-gray-600 hover:text-gray-900 hover:bg-gray-100/50"
        : "text-gray-400 hover:text-white hover:bg-[var(--c-card)]")
    }>{label}</Link>
  );
}

