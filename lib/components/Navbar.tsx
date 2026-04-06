"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAppContext } from "@/lib/contexts/AppContext";
import { LANGS, THEMES } from "@/lib/i18n";
import NotificationBell from "@/lib/components/NotificationBell";

/* ──────────────────────────────────────────────
   FUTURISTIC NAVBAR — Clean + Settings Dropdown
   ────────────────────────────────────────────── */

const NAV_CSS = `
@keyframes navPulse {
  0%,100% { box-shadow: 0 0 0 0 rgba(249,115,22,0.45); }
  50%     { box-shadow: 0 0 0 10px rgba(249,115,22,0); }
}
@keyframes bellPulse {
  0%,100% { transform: scale(1); filter: drop-shadow(0 0 0px rgba(249,115,22,0)); }
  50%     { transform: scale(1.12); filter: drop-shadow(0 0 6px rgba(249,115,22,0.6)); }
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
.nav-pulse { animation: navPulse 2s ease-in-out infinite; }
.bell-pulse { animation: bellPulse 2s ease-in-out infinite; }
.badge-pulse { animation: badgePulse 1.8s ease-in-out infinite; }
.gradient-spin { animation: gradientSpin 3s ease infinite; background-size: 200% 200%; }
.glow-float { animation: glowFloat 2.5s ease-in-out infinite; }

.nav-link-futuristic {
  position: relative;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.nav-link-futuristic::after {
  content: '';
  position: absolute;
  bottom: 2px; left: 12px; right: 12px;
  height: 2px;
  background: linear-gradient(90deg, #f97316, #a78bfa);
  border-radius: 1px;
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 0 8px rgba(249,115,22,0.4), 0 0 16px rgba(167,139,250,0.2);
}
.nav-link-futuristic:hover::after,
.nav-link-futuristic.active::after { transform: scaleX(1); }

.nav-pill-active {
  background: rgba(249,115,22,0.08);
  border: 1px solid rgba(249,115,22,0.25);
  box-shadow: 0 0 12px rgba(249,115,22,0.1), inset 0 0 12px rgba(249,115,22,0.05);
}
[data-theme="clair"] .nav-pill-active {
  background: rgba(249,115,22,0.1);
  border: 1px solid rgba(249,115,22,0.2);
}

.logo-gradient {
  background: linear-gradient(135deg, #f97316 0%, #fb923c 40%, #a78bfa 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.logo-gradient:hover { filter: brightness(1.2); }

.btn-neon {
  position: relative; overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.btn-neon:hover {
  box-shadow: 0 0 20px rgba(249,115,22,0.4);
  transform: translateY(-1px);
}

.bottom-nav-accent-line {
  position: absolute; top: 0; left: 0; right: 0; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(249,115,22,0.4), rgba(167,139,250,0.4), transparent);
}

.featured-btn-ring {
  background: linear-gradient(135deg, #f97316, #a78bfa, #38bdf8, #f97316);
  background-size: 300% 300%;
  animation: gradientSpin 3s ease infinite;
  padding: 2px; border-radius: 9999px;
  box-shadow: 0 0 15px rgba(249,115,22,0.35), 0 0 30px rgba(167,139,250,0.15), 0 4px 15px rgba(0,0,0,0.2);
}

.bottom-tab-active-glow {
  position: absolute; bottom: -2px; left: 50%; transform: translateX(-50%);
  width: 24px; height: 3px; border-radius: 2px;
  background: linear-gradient(90deg, #f97316, #a78bfa);
  box-shadow: 0 0 10px rgba(249,115,22,0.5), 0 0 20px rgba(167,139,250,0.3);
}

/* Settings dropdown */
.settings-dropdown {
  animation: settingsIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes settingsIn {
  from { opacity: 0; transform: translateY(-8px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
`;

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasNewMatches, setHasNewMatches] = useState(false);
  const [hasPendingSwipes, setHasPendingSwipes] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const supabase = createClient();
  const { lang, setLang, themePreference, setTheme, t } = useAppContext();

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
      if (user) {
        try {
          const { count } = await supabase
            .from("matches")
            .select("*", { count: "exact", head: true })
            .or(`sender_user_id.eq.${user.id},receiver_user_id.eq.${user.id}`)
            .eq("is_mutual", true);
          setHasNewMatches((count || 0) > 0);
          const { count: animalCount } = await supabase
            .from("animals")
            .select("*", { count: "exact", head: true })
            .neq("created_by", user.id)
            .eq("status", "disponible");
          setHasPendingSwipes((animalCount || 0) > 0);
        } catch {}
      }
    }
    getUser();
  }, [pathname]);

  // Close settings on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    }
    if (settingsOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [settingsOpen]);

  const isActive = (path: string) => pathname === path;
  const isLightTheme = themePreference === "clair";

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: NAV_CSS }} />

      {/* ═══════════ TOP NAVBAR ═══════════ */}
      <nav
        className="sticky top-0 z-50 transition-all duration-300"
        style={{
          background: isLightTheme ? "rgba(255,255,255,0.75)" : "rgba(15,12,26,0.7)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderBottom: "1px solid transparent",
          borderImage: "linear-gradient(90deg, transparent, rgba(249,115,22,0.3), rgba(167,139,250,0.3), transparent) 1",
        }}
      >
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between h-12">
            {/* Logo */}
            <Link href="/" className="logo-gradient font-extrabold text-xl tracking-tight select-none">
              Pawly
            </Link>

            {/* Desktop Links */}
            <div className="hidden md:flex items-center gap-1">
              {!loading && (user ? (
                <>
                  <NavLink href="/flairer" active={isActive("/flairer")} label={t.navFlairer} light={isLightTheme} />
                  <NavLink href="/events" active={isActive("/events")} label={t.navEvents} light={isLightTheme} />
                  <NavLink href="/animals" active={isActive("/animals")} label={t.navExplorer} light={isLightTheme} />
                  <NavLink href="/carte" active={isActive("/carte")} label="🗺️" light={isLightTheme} />
                  <NavLink href="/matches" active={isActive("/matches")} label={t.navMatches} light={isLightTheme} />
                  <NavLink href="/profile" active={isActive("/profile")} label={t.navProfil} light={isLightTheme} />
                </>
              ) : (
                <>
                  <NavLink href="/flairer" active={isActive("/flairer")} label={t.navFlairer} light={isLightTheme} />
                  <NavLink href="/animals" active={isActive("/animals")} label={t.navExplorer} light={isLightTheme} />
                  <NavLink href="/pricing" active={isActive("/pricing")} label={t.navPricing} light={isLightTheme} />
                  <Link
                    href="/signup"
                    className="btn-neon ml-3 px-6 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-bold rounded-full shadow-lg shadow-orange-500/20"
                  >
                    {t.navJoin}
                  </Link>
                </>
              ))}
            </div>

            {/* Right: Bell + Settings gear */}
            <div className="flex items-center gap-2">
              {!loading && user && (
                <div className={hasNewMatches ? "bell-pulse" : ""}>
                  <NotificationBell />
                </div>
              )}

              {/* Current lang flag (quick indicator) */}
              <span className="text-sm select-none">{LANGS.find(l => l.code === lang)?.flag}</span>

              {/* Settings button — single gear icon */}
              <div ref={settingsRef} className="relative">
                <button
                  onClick={() => setSettingsOpen(o => !o)}
                  className={
                    "p-2 rounded-full transition-all duration-300 " +
                    (settingsOpen
                      ? "bg-orange-500/15 text-orange-400"
                      : isLightTheme
                      ? "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                      : "text-gray-400 hover:text-white hover:bg-white/10")
                  }
                  aria-label="Settings"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>

                {/* Settings dropdown */}
                {settingsOpen && (
                  <div
                    className="settings-dropdown absolute right-0 top-full mt-2 w-56 rounded-xl border shadow-2xl z-50 overflow-hidden"
                    style={{
                      background: isLightTheme ? "rgba(255,255,255,0.95)" : "rgba(20,16,32,0.95)",
                      backdropFilter: "blur(20px)",
                      WebkitBackdropFilter: "blur(20px)",
                      borderColor: isLightTheme ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)",
                    }}
                  >
                    {/* Language section */}
                    <div className="px-3 pt-3 pb-2">
                      <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${isLightTheme ? "text-gray-400" : "text-gray-500"}`}>
                        {lang === "fr" ? "Langue" : lang === "de" ? "Sprache" : lang === "it" ? "Lingua" : "Language"}
                      </p>
                      <div className="grid grid-cols-4 gap-1.5">
                        {LANGS.map((l) => (
                          <button
                            key={l.code}
                            onClick={() => { setLang(l.code as any); }}
                            className={
                              "flex flex-col items-center gap-0.5 py-2 rounded-lg transition-all duration-200 " +
                              (lang === l.code
                                ? "bg-orange-500/15 ring-1 ring-orange-500/40"
                                : isLightTheme
                                ? "hover:bg-gray-100"
                                : "hover:bg-white/5")
                            }
                          >
                            <span className="text-lg">{l.flag}</span>
                            <span className={`text-[9px] font-semibold uppercase ${lang === l.code ? "text-orange-400" : isLightTheme ? "text-gray-500" : "text-gray-400"}`}>
                              {l.code}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="mx-3 h-px" style={{ background: isLightTheme ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)" }} />

                    {/* Theme section */}
                    <div className="px-3 pt-2 pb-3">
                      <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${isLightTheme ? "text-gray-400" : "text-gray-500"}`}>
                        {t.themeAuto ? (lang === "fr" ? "Thème" : lang === "de" ? "Design" : lang === "it" ? "Tema" : "Theme") : "Theme"}
                      </p>
                      <div className="flex flex-col gap-1">
                        {THEMES.map((th) => {
                          const isActiveTheme = themePreference === th.code;
                          return (
                            <button
                              key={th.code}
                              onClick={() => { setTheme(th.code as any); }}
                              className={
                                "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 " +
                                (isActiveTheme
                                  ? "bg-orange-500/15 ring-1 ring-orange-500/40"
                                  : isLightTheme
                                  ? "hover:bg-gray-100"
                                  : "hover:bg-white/5")
                              }
                            >
                              <span className="text-base">{th.label}</span>
                              <span className={`text-xs font-medium ${isActiveTheme ? "text-orange-400" : isLightTheme ? "text-gray-600" : "text-gray-300"}`}>
                                {th.code === "auto" ? (t.themeAuto || "Auto") : th.name}
                              </span>
                              {th.code === "auto" && (
                                <span className={`text-[9px] ml-auto ${isLightTheme ? "text-gray-400" : "text-gray-500"}`}>
                                  {t.themeAutoDesc || "Suit le système"}
                                </span>
                              )}
                              {isActiveTheme && (
                                <span className="ml-auto text-orange-400 text-xs">✓</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile: signup button */}
              {!loading && !user && (
                <Link
                  href="/signup"
                  className="md:hidden btn-neon px-3 py-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-[10px] font-bold rounded-full shadow-md shadow-orange-500/20"
                >
                  {t.navJoin}
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* ═══════════ MOBILE BOTTOM NAV ═══════════ */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 safe-area-bottom"
        style={{
          background: isLightTheme ? "rgba(255,255,255,0.88)" : "rgba(15,12,26,0.85)",
          backdropFilter: "blur(30px)",
          WebkitBackdropFilter: "blur(30px)",
        }}
      >
        <div className="bottom-nav-accent-line" />
        <div className="flex items-center justify-around h-14 px-2 relative">
          <BottomTab href="/" active={isActive("/")} label={t.navHome} light={isLightTheme}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive("/") ? 2.5 : 1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
          </BottomTab>

          <BottomTab href="/flairer" active={isActive("/flairer")} label={t.navFlairer} featured pulse={hasPendingSwipes && !isActive("/flairer")} light={isLightTheme}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
          </BottomTab>

          <BottomTab href="/carte" active={isActive("/carte")} label="Carte" light={isLightTheme}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive("/carte") ? 2.5 : 1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
            </svg>
          </BottomTab>

          {!loading && user ? (
            <>
              <BottomTab href="/matches" active={isActive("/matches")} label={t.navMatches} badge={hasNewMatches} light={isLightTheme}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive("/matches") ? 2.5 : 1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                </svg>
              </BottomTab>
              <BottomTab href="/profile" active={isActive("/profile")} label={t.navProfil} light={isLightTheme}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive("/profile") ? 2.5 : 1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </BottomTab>
            </>
          ) : (
            <>
              <BottomTab href="/pricing" active={isActive("/pricing")} label={t.navPricing} light={isLightTheme}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive("/pricing") ? 2.5 : 1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </BottomTab>
              <BottomTab href="/login" active={isActive("/login")} label={t.navLogin} light={isLightTheme}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive("/login") ? 2.5 : 1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
              </BottomTab>
            </>
          )}
        </div>
      </div>
      <div className="md:hidden h-14" />
    </>
  );
}

function NavLink({ href, active, label, light }: { href: string; active: boolean; label: string; light?: boolean }) {
  return (
    <Link
      href={href}
      className={
        "nav-link-futuristic px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 " +
        (active
          ? "nav-pill-active active text-orange-400 font-semibold"
          : light
          ? "text-gray-600 hover:text-gray-900 hover:bg-gray-100/50"
          : "text-gray-400 hover:text-white hover:bg-white/5")
      }
    >
      {label}
    </Link>
  );
}

function BottomTab({
  href, active, label, featured, pulse, badge, light, children,
}: {
  href: string; active: boolean; label: string;
  featured?: boolean; pulse?: boolean; badge?: boolean; light?: boolean;
  children: React.ReactNode;
}) {
  if (featured) {
    return (
      <Link href={href} className="flex flex-col items-center -mt-5 relative">
        <div className={"featured-btn-ring transition-all duration-300 " + (pulse ? "nav-pulse" : "")}>
          <div
            className={
              "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 " +
              (active
                ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white scale-110"
                : "bg-gradient-to-br from-orange-500/90 to-orange-600/90 text-white hover:scale-105")
            }
            style={active ? { boxShadow: "0 0 20px rgba(249,115,22,0.5)" } : undefined}
          >
            {children}
          </div>
        </div>
        <span className={"text-[9px] mt-1 font-medium " + (active ? "text-orange-400 font-bold" : light ? "text-gray-500" : "text-gray-500")}>
          {label}
        </span>
      </Link>
    );
  }

  return (
    <Link href={href} className="flex flex-col items-center py-1 px-2 relative group">
      {active && (
        <span className="absolute -top-0 left-1/2 -translate-x-1/2 w-6 h-[3px] rounded-full"
          style={{ background: "linear-gradient(90deg, #f97316, #a78bfa)", boxShadow: "0 0 8px rgba(249,115,22,0.5)" }}
        />
      )}
      <span className={
        "transition-all duration-300 " +
        (active
          ? "text-orange-400 scale-110 glow-float"
          : light
          ? "text-gray-500 group-hover:text-gray-700"
          : "text-gray-500 group-hover:text-gray-300")
      }
        style={active ? { filter: "drop-shadow(0 0 6px rgba(249,115,22,0.4))" } : undefined}
      >
        {children}
      </span>
      {badge && !active && (
        <span className="badge-pulse absolute top-0 right-1 w-2.5 h-2.5 rounded-full"
          style={{ background: "linear-gradient(135deg, #ef4444, #f97316)", boxShadow: "0 0 8px rgba(239,68,68,0.6)" }}
        />
      )}
      {active && <div className="bottom-tab-active-glow" />}
      <span className={"text-[9px] mt-0.5 " + (active ? "text-orange-400 font-bold" : light ? "text-gray-400" : "text-gray-500")}>
        {label}
      </span>
    </Link>
  );
}
