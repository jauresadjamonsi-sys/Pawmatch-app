"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAppContext } from "@/lib/contexts/AppContext";
import { LANGS, THEMES } from "@/lib/i18n";
import NotificationBell from "@/lib/components/NotificationBell";

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
  height: 2px; background: linear-gradient(90deg, #f97316, #a78bfa);
  border-radius: 1px; transform: scaleX(0); transform-origin: left;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 0 8px rgba(249,115,22,0.4);
}
.nav-link-f:hover::after, .nav-link-f.active::after { transform: scaleX(1); }

.nav-pill-active {
  background: rgba(249,115,22,0.08);
  border: 1px solid rgba(249,115,22,0.25);
}
[data-theme="clair"] .nav-pill-active {
  background: rgba(249,115,22,0.1);
  border: 1px solid rgba(249,115,22,0.2);
}

.logo-gradient {
  background: linear-gradient(135deg, #f97316 0%, #fb923c 40%, #a78bfa 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
}

.btn-neon { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.btn-neon:hover { box-shadow: 0 0 20px rgba(249,115,22,0.4); transform: translateY(-1px); }

.bottom-nav-accent-line {
  position: absolute; top: 0; left: 0; right: 0; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(249,115,22,0.4), rgba(167,139,250,0.4), transparent);
}

.featured-btn-ring {
  background: linear-gradient(135deg, #f97316, #a78bfa, #38bdf8, #f97316);
  background-size: 300% 300%;
  animation: gradientSpin 3s ease infinite;
  padding: 2px; border-radius: 9999px;
  box-shadow: 0 0 15px rgba(249,115,22,0.35), 0 4px 15px rgba(0,0,0,0.2);
}

.bottom-tab-active-glow {
  position: absolute; bottom: -2px; left: 50%; transform: translateX(-50%);
  width: 24px; height: 3px; border-radius: 2px;
  background: linear-gradient(90deg, #f97316, #a78bfa);
  box-shadow: 0 0 10px rgba(249,115,22,0.5);
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

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
      if (user) {
        try {
          const { count } = await supabase.from("matches").select("*", { count: "exact", head: true })
            .or(`sender_user_id.eq.${user.id},receiver_user_id.eq.${user.id}`).eq("is_mutual", true);
          setHasNewMatches((count || 0) > 0);
          const { count: ac } = await supabase.from("animals").select("*", { count: "exact", head: true })
            .neq("created_by", user.id).eq("status", "disponible");
          setHasPendingSwipes((ac || 0) > 0);
        } catch {}
      }
    }
    getUser();
  }, [pathname]);

  const isActive = (p: string) => pathname === p;
  const isLight = theme === "clair" || theme === "aurore" || theme === "ocean";
  const currentFlag = LANGS.find(l => l.code === lang)?.flag || "🇫🇷";
  const currentThemeLabel = THEMES.find(th => th.code === themePreference)?.label || "🔄";

  const dropBg = {
    background: isLight ? "rgba(255,255,255,0.96)" : "var(--c-card, rgba(20,16,32,0.96))",
    backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
    borderColor: isLight ? "rgba(0,0,0,0.1)" : "var(--c-border, rgba(255,255,255,0.08))",
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: NAV_CSS }} />

      {/* ═══ TOP NAVBAR ═══ */}
      <nav className="sticky top-0 z-50" style={{
        background: isLight ? "rgba(255,255,255,0.78)" : "rgba(15,12,26,0.7)",
        backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
        borderBottom: "1px solid transparent",
        borderImage: "linear-gradient(90deg, transparent, rgba(249,115,22,0.3), rgba(167,139,250,0.3), transparent) 1",
      }}>
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between h-12">
            <Link href="/" className="logo-gradient font-extrabold text-xl tracking-tight select-none">Pawly</Link>

            {/* Desktop links */}
            <div className="hidden md:flex items-center gap-1">
              {!loading && (user ? (
                <>
                  <NL href="/feed" active={isActive("/feed")} label="Feed" light={isLight} />
                  <NL href="/flairer" active={isActive("/flairer")} label={t.navFlairer} light={isLight} />
                  <NL href="/animals" active={isActive("/animals")} label={t.navExplorer} light={isLight} />
                  <NL href="/carte" active={isActive("/carte")} label="🗺️" light={isLight} />
                  <NL href="/matches" active={isActive("/matches")} label={t.navMatches} light={isLight} />
                  <NL href="/assistant" active={isActive("/assistant")} label="🤖" light={isLight} />
                  <NL href="/profile" active={isActive("/profile")} label={t.navProfil} light={isLight} />
                </>
              ) : (
                <>
                  <NL href="/flairer" active={isActive("/flairer")} label={t.navFlairer} light={isLight} />
                  <NL href="/animals" active={isActive("/animals")} label={t.navExplorer} light={isLight} />
                  <NL href="/pricing" active={isActive("/pricing")} label={t.navPricing} light={isLight} />
                  <Link href="/signup" className="btn-neon ml-3 px-6 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-bold rounded-full shadow-lg shadow-orange-500/20">
                    {t.navJoin}
                  </Link>
                </>
              ))}
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-1.5">
              {!loading && user && (
                <div className={hasNewMatches ? "bell-pulse" : ""}><NotificationBell /></div>
              )}

              {/* 🌐 Language dropdown */}
              <div ref={langDrop.ref} className="relative">
                <button
                  onClick={() => { langDrop.setOpen(o => !o); themeDrop.setOpen(false); }}
                  className={"p-2 rounded-full transition-all duration-200 text-sm " +
                    (langDrop.open ? "bg-orange-500/15" : isLight ? "hover:bg-gray-100" : "hover:bg-white/10")}
                >
                  {currentFlag}
                </button>
                {langDrop.open && (
                  <div className="drop-in absolute right-0 top-full mt-1.5 w-40 rounded-xl border shadow-xl z-50 overflow-hidden" style={dropBg}>
                    {LANGS.map(l => (
                      <button key={l.code} onClick={() => { setLang(l.code as any); langDrop.setOpen(false); }}
                        className={"w-full flex items-center gap-3 px-4 py-2.5 transition-all duration-200 " +
                          (lang === l.code
                            ? "bg-orange-500/10"
                            : isLight ? "hover:bg-gray-50" : "hover:bg-white/5")}
                      >
                        <span className="text-lg">{l.flag}</span>
                        <span className={"text-sm font-medium " + (lang === l.code ? "text-orange-400" : "text-[var(--c-text)]")}>
                          {l.code === "fr" ? "Français" : l.code === "de" ? "Deutsch" : l.code === "it" ? "Italiano" : "English"}
                        </span>
                        {lang === l.code && <span className="ml-auto text-orange-400">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 🎨 Theme dropdown */}
              <div ref={themeDrop.ref} className="relative">
                <button
                  onClick={() => { themeDrop.setOpen(o => !o); langDrop.setOpen(false); }}
                  className={"p-2 rounded-full transition-all duration-200 text-sm " +
                    (themeDrop.open ? "bg-orange-500/15" : isLight ? "hover:bg-gray-100" : "hover:bg-white/10")}
                >
                  {currentThemeLabel}
                </button>
                {themeDrop.open && (
                  <div className="drop-in absolute right-0 top-full mt-1.5 w-48 rounded-xl border shadow-xl z-50 overflow-hidden" style={dropBg}>
                    {THEMES.map(th => {
                      const active = themePreference === th.code;
                      return (
                        <button key={th.code} onClick={() => { setTheme(th.code as any); themeDrop.setOpen(false); }}
                          className={"w-full flex items-center gap-3 px-4 py-2.5 transition-all duration-200 " +
                            (active ? "bg-orange-500/10" : isLight ? "hover:bg-gray-50" : "hover:bg-white/5")}
                        >
                          <span className="text-base">{th.label}</span>
                          <span className={"text-sm font-medium " + (active ? "text-orange-400" : "text-[var(--c-text)]")}>
                            {th.code === "auto" ? (t.themeAuto || "Auto") : th.name}
                          </span>
                          {active && <span className="ml-auto text-orange-400">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {!loading && !user && (
                <Link href="/signup" className="md:hidden btn-neon px-3 py-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-[10px] font-bold rounded-full">
                  {t.navJoin}
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* ═══ MOBILE BOTTOM NAV ═══ */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 safe-area-bottom" style={{
        background: isLight ? "rgba(255,255,255,0.9)" : "rgba(15,12,26,0.88)",
        backdropFilter: "blur(30px)", WebkitBackdropFilter: "blur(30px)",
      }}>
        <div className="bottom-nav-accent-line" />
        <div className="flex items-center justify-around h-14 px-2 relative">
          <BT href={user ? "/feed" : "/"} active={isActive("/feed") || isActive("/")} label={t.navHome} light={isLight}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={(isActive("/feed") || isActive("/")) ? 2.5 : 1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
          </BT>
          <BT href="/flairer" active={isActive("/flairer")} label={t.navFlairer} featured pulse={hasPendingSwipes && !isActive("/flairer")} light={isLight}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
          </BT>
          <BT href="/carte" active={isActive("/carte")} label="Carte" light={isLight}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive("/carte") ? 2.5 : 1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
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
      </div>
      <div className="md:hidden h-16 safe-area-bottom" />
    </>
  );
}

function NL({ href, active, label, light }: { href: string; active: boolean; label: string; light?: boolean }) {
  return (
    <Link href={href} className={
      "nav-link-f px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 " +
      (active ? "nav-pill-active active text-orange-400 font-semibold"
        : light ? "text-gray-600 hover:text-gray-900 hover:bg-gray-100/50"
        : "text-gray-400 hover:text-white hover:bg-white/5")
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
      <Link href={href} className="flex flex-col items-center -mt-5 relative">
        <div className={"featured-btn-ring transition-all duration-300 " + (pulse ? "nav-pulse" : "")}>
          <div className={
            "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 " +
            (active ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white scale-110"
              : "bg-gradient-to-br from-orange-500/90 to-orange-600/90 text-white hover:scale-105")}
            style={active ? { boxShadow: "0 0 20px rgba(249,115,22,0.5)" } : undefined}
          >{children}</div>
        </div>
        <span className={"text-[9px] mt-1 font-medium " + (active ? "text-orange-400 font-bold" : "text-gray-500")}>{label}</span>
      </Link>
    );
  }
  return (
    <Link href={href} className="flex flex-col items-center py-1 px-2 relative group">
      {active && <span className="absolute -top-0 left-1/2 -translate-x-1/2 w-6 h-[3px] rounded-full" style={{ background: "linear-gradient(90deg, #f97316, #a78bfa)", boxShadow: "0 0 8px rgba(249,115,22,0.5)" }} />}
      <span className={"transition-all duration-300 " + (active ? "text-orange-400 scale-110 glow-float" : light ? "text-gray-500 group-hover:text-gray-700" : "text-gray-500 group-hover:text-gray-300")}
        style={active ? { filter: "drop-shadow(0 0 6px rgba(249,115,22,0.4))" } : undefined}
      >{children}</span>
      {badge && !active && <span className="badge-pulse absolute top-0 right-1 w-2.5 h-2.5 rounded-full" style={{ background: "linear-gradient(135deg, #ef4444, #f97316)", boxShadow: "0 0 8px rgba(239,68,68,0.6)" }} />}
      {active && <div className="bottom-tab-active-glow" />}
      <span className={"text-[9px] mt-0.5 " + (active ? "text-orange-400 font-bold" : light ? "text-gray-400" : "text-gray-500")}>{label}</span>
    </Link>
  );
}
