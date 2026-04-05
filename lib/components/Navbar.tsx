"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAppContext } from "@/lib/contexts/AppContext";
import { LANGS, THEMES } from "@/lib/i18n";
import NotificationBell from "@/lib/components/NotificationBell";

/* ──────────────────────────────────────────────
   FUTURISTIC NAVBAR — Glassmorphism + Neon
   ────────────────────────────────────────────── */

const NAV_CSS = `
/* === Keyframes === */
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
@keyframes slideUnderline {
  from { transform: scaleX(0); transform-origin: left; }
  to   { transform: scaleX(1); transform-origin: left; }
}

/* Nav pulse for featured button */
.nav-pulse { animation: navPulse 2s ease-in-out infinite; }

/* Bell pulse when unread */
.bell-pulse { animation: bellPulse 2s ease-in-out infinite; }

/* Badge dot pulse */
.badge-pulse { animation: badgePulse 1.8s ease-in-out infinite; }

/* Gradient border spin for featured discover button */
.gradient-spin { animation: gradientSpin 3s ease infinite; background-size: 200% 200%; }

/* Glow float for active icons */
.glow-float { animation: glowFloat 2.5s ease-in-out infinite; }

/* ─── Desktop nav link hover underline ─── */
.nav-link-futuristic {
  position: relative;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.nav-link-futuristic::after {
  content: '';
  position: absolute;
  bottom: 2px;
  left: 12px;
  right: 12px;
  height: 2px;
  background: linear-gradient(90deg, #f97316, #a78bfa);
  border-radius: 1px;
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 0 8px rgba(249,115,22,0.4), 0 0 16px rgba(167,139,250,0.2);
}
.nav-link-futuristic:hover::after {
  transform: scaleX(1);
}
.nav-link-futuristic.active::after {
  transform: scaleX(1);
}

/* ─── Glass pill for active link ─── */
.nav-pill-active {
  background: rgba(249,115,22,0.08);
  border: 1px solid rgba(249,115,22,0.25);
  box-shadow: 0 0 12px rgba(249,115,22,0.1), inset 0 0 12px rgba(249,115,22,0.05);
}
[data-theme="clair"] .nav-pill-active {
  background: rgba(249,115,22,0.1);
  border: 1px solid rgba(249,115,22,0.2);
  box-shadow: 0 0 8px rgba(249,115,22,0.08);
}

/* ─── Theme/lang selector glass pills ─── */
.selector-pill {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(8px);
}
.selector-pill:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(249,115,22,0.15);
}
.selector-pill.active-pill {
  box-shadow: 0 0 12px rgba(249,115,22,0.3), 0 0 4px rgba(249,115,22,0.2);
  transform: scale(1.1);
}

/* ─── Bottom nav active glow ─── */
.bottom-tab-active-glow {
  position: absolute;
  bottom: -2px;
  left: 50%;
  transform: translateX(-50%);
  width: 24px;
  height: 3px;
  border-radius: 2px;
  background: linear-gradient(90deg, #f97316, #a78bfa);
  box-shadow: 0 0 10px rgba(249,115,22,0.5), 0 0 20px rgba(167,139,250,0.3);
}

/* ─── Accent line at top of bottom nav ─── */
.bottom-nav-accent-line {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(249,115,22,0.4), rgba(167,139,250,0.4), transparent);
}

/* ─── Featured discover button gradient border ─── */
.featured-btn-ring {
  background: linear-gradient(135deg, #f97316, #a78bfa, #38bdf8, #f97316);
  background-size: 300% 300%;
  animation: gradientSpin 3s ease infinite;
  padding: 2px;
  border-radius: 9999px;
  box-shadow:
    0 0 15px rgba(249,115,22,0.35),
    0 0 30px rgba(167,139,250,0.15),
    0 4px 15px rgba(0,0,0,0.2);
}
.featured-btn-ring:hover {
  box-shadow:
    0 0 20px rgba(249,115,22,0.5),
    0 0 40px rgba(167,139,250,0.25),
    0 6px 20px rgba(0,0,0,0.3);
}

/* ─── User avatar gradient ring ─── */
.avatar-ring {
  background: linear-gradient(135deg, #f97316, #a78bfa);
  padding: 2px;
  border-radius: 9999px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.avatar-ring:hover {
  box-shadow: 0 0 12px rgba(249,115,22,0.4), 0 0 20px rgba(167,139,250,0.2);
}

/* ─── Logo gradient text ─── */
.logo-gradient {
  background: linear-gradient(135deg, #f97316 0%, #fb923c 40%, #a78bfa 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.logo-gradient:hover {
  filter: brightness(1.2);
  text-shadow: 0 0 20px rgba(249,115,22,0.3);
}

/* ─── Join button neon ─── */
.btn-neon {
  position: relative;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.btn-neon::before {
  content: '';
  position: absolute;
  inset: -2px;
  background: linear-gradient(135deg, #f97316, #a78bfa, #f97316);
  background-size: 200% 200%;
  animation: gradientSpin 3s ease infinite;
  border-radius: inherit;
  z-index: -1;
  opacity: 0;
  transition: opacity 0.3s ease;
}
.btn-neon:hover::before {
  opacity: 1;
}
.btn-neon:hover {
  box-shadow: 0 0 20px rgba(249,115,22,0.4), 0 0 40px rgba(167,139,250,0.15);
  transform: translateY(-1px);
}
`;

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasNewMatches, setHasNewMatches] = useState(false);
  const [hasPendingSwipes, setHasPendingSwipes] = useState(false);
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

  const isActive = (path: string) => pathname === path;

  const isLightTheme = themePreference === "clair";

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: NAV_CSS }} />

      {/* ═══════════ DESKTOP NAVBAR ═══════════ */}
      <nav
        className="sticky top-0 z-50 transition-all duration-300"
        style={{
          background: isLightTheme
            ? "rgba(255, 255, 255, 0.7)"
            : "rgba(15, 12, 26, 0.6)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderBottom: "1px solid transparent",
          borderImage:
            "linear-gradient(90deg, transparent, rgba(249,115,22,0.3), rgba(167,139,250,0.3), transparent) 1",
        }}
      >
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between h-14 transition-all duration-300">
            {/* ── Logo ── */}
            <Link href="/" className="logo-gradient font-extrabold text-xl tracking-tight select-none">
              Pawly
            </Link>

            {/* ── Desktop Links ── */}
            <div className="hidden md:flex items-center gap-1">
              {!loading && (user ? (
                <>
                  <NavLink href="/flairer" active={isActive("/flairer")} label={t.navFlairer} />
                  <NavLink href="/events" active={isActive("/events")} label={t.navEvents} />
                  <NavLink href="/animals" active={isActive("/animals")} label={t.navExplorer} />
                  <NavLink href="/carte" active={isActive("/carte")} label="&#x1f5fa;&#xfe0f;" />
                  <NavLink href="/matches" active={isActive("/matches")} label={t.navMatches} />
                  <NavLink href="/profile" active={isActive("/profile")} label={t.navProfil} />
                </>
              ) : (
                <>
                  <NavLink href="/flairer" active={isActive("/flairer")} label={t.navFlairer} />
                  <NavLink href="/animals" active={isActive("/animals")} label={t.navExplorer} />
                  <NavLink href="/pricing" active={isActive("/pricing")} label={t.navPricing} />
                  <Link
                    href="/signup"
                    className="btn-neon ml-3 px-6 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-500 text-white text-sm font-bold rounded-full shadow-lg shadow-orange-500/20"
                  >
                    {t.navJoin}
                  </Link>
                </>
              ))}
            </div>

            {/* ── Desktop Right: Bell + Lang + Theme ── */}
            <div className="hidden md:flex items-center gap-3">
              {!loading && user && (
                <div className={hasNewMatches ? "bell-pulse" : ""}>
                  <NotificationBell />
                </div>
              )}

              {/* Language pills */}
              <div className="flex items-center gap-1">
                {LANGS.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => setLang(l.code as any)}
                    title={l.code.toUpperCase()}
                    className={
                      "selector-pill w-8 h-8 rounded-full text-sm flex items-center justify-center border " +
                      (lang === l.code
                        ? "active-pill bg-orange-500/15 border-orange-500/50"
                        : "bg-white/5 border-white/10 hover:border-orange-500/30 opacity-55 hover:opacity-100")
                    }
                  >
                    {l.flag}
                  </button>
                ))}
              </div>

              {/* Divider */}
              <div
                className="w-px h-6"
                style={{
                  background:
                    "linear-gradient(180deg, transparent, rgba(249,115,22,0.2), transparent)",
                }}
              />

              {/* Theme pills */}
              <div className="flex items-center gap-1">
                {THEMES.map((th) => {
                  const isActiveTheme = themePreference === th.code;
                  // Map theme to its accent color for neon glow
                  const glowColor =
                    th.code === "nuit"
                      ? "rgba(167,139,250,0.4)"
                      : th.code === "aurore"
                      ? "rgba(249,115,22,0.4)"
                      : th.code === "ocean"
                      ? "rgba(56,189,248,0.4)"
                      : th.code === "clair"
                      ? "rgba(251,191,36,0.4)"
                      : "rgba(249,115,22,0.3)";
                  return (
                    <button
                      key={th.code}
                      onClick={() => setTheme(th.code as any)}
                      title={th.code === "auto" ? (t.themeAuto || "Auto") : th.name}
                      className={
                        "selector-pill w-8 h-8 rounded-full text-sm flex items-center justify-center border transition-all duration-300 " +
                        (isActiveTheme
                          ? "border-orange-500/50 scale-110"
                          : "bg-white/5 border-white/10 hover:border-orange-500/30 opacity-55 hover:opacity-100")
                      }
                      style={
                        isActiveTheme
                          ? {
                              background: `rgba(249,115,22,0.12)`,
                              boxShadow: `0 0 14px ${glowColor}, 0 0 4px ${glowColor}`,
                            }
                          : undefined
                      }
                    >
                      {th.label}
                    </button>
                  );
                })}
              </div>

              {/* User avatar ring (when logged in) */}
              {!loading && user && user.user_metadata?.avatar_url && (
                <Link href="/profile" className="avatar-ring ml-1">
                  <img
                    src={user.user_metadata.avatar_url}
                    alt="avatar"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                </Link>
              )}
            </div>

            {/* ── Mobile Top-Right Controls ── */}
            <div className="md:hidden flex items-center gap-2">
              {!loading && user && (
                <div className={hasNewMatches ? "bell-pulse" : ""}>
                  <NotificationBell />
                </div>
              )}
              <div className="flex items-center gap-0.5">
                {LANGS.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => setLang(l.code as any)}
                    className={
                      "selector-pill w-7 h-7 rounded-full text-[11px] flex items-center justify-center border transition-all duration-300 " +
                      (lang === l.code
                        ? "active-pill bg-orange-500/15 border-orange-500/50"
                        : "opacity-40 border-transparent")
                    }
                  >
                    {l.flag}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-0.5">
                {THEMES.map((th) => (
                  <button
                    key={th.code}
                    onClick={() => setTheme(th.code as any)}
                    className={
                      "selector-pill w-6 h-6 rounded-full text-[10px] flex items-center justify-center border transition-all duration-300 " +
                      (themePreference === th.code
                        ? "active-pill bg-orange-500/15 border-orange-500/50"
                        : "opacity-40 border-transparent")
                    }
                  >
                    {th.label}
                  </button>
                ))}
              </div>
              {!loading && !user && (
                <Link
                  href="/signup"
                  className="btn-neon px-3 py-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-[10px] font-bold rounded-full shadow-md shadow-orange-500/20"
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
          background: isLightTheme
            ? "rgba(255, 255, 255, 0.85)"
            : "rgba(15, 12, 26, 0.8)",
          backdropFilter: "blur(30px)",
          WebkitBackdropFilter: "blur(30px)",
        }}
      >
        {/* Subtle gradient accent line at top */}
        <div className="bottom-nav-accent-line" />

        <div className="flex items-center justify-around h-14 px-2 relative">
          <BottomTab href="/" active={isActive("/")} label={t.navHome} light={isLightTheme}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive("/") ? 2.5 : 1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
          </BottomTab>

          <BottomTab
            href="/flairer"
            active={isActive("/flairer")}
            label={t.navFlairer}
            featured
            pulse={hasPendingSwipes && !isActive("/flairer")}
            light={isLightTheme}
          >
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

      {/* Spacer for bottom nav */}
      <div className="md:hidden h-14" />
    </>
  );
}

/* ═══════════════════════════════════════════
   Desktop Nav Link — glass pill + neon underline
   ═══════════════════════════════════════════ */
function NavLink({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={
        "nav-link-futuristic px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 " +
        (active
          ? "nav-pill-active active text-orange-400 font-semibold"
          : "text-gray-400 hover:text-white hover:bg-white/5")
      }
    >
      {label}
    </Link>
  );
}

/* ═══════════════════════════════════════════
   Mobile Bottom Tab — glow + scale + accent
   ═══════════════════════════════════════════ */
function BottomTab({
  href,
  active,
  label,
  featured,
  pulse,
  badge,
  light,
  children,
}: {
  href: string;
  active: boolean;
  label: string;
  featured?: boolean;
  pulse?: boolean;
  badge?: boolean;
  light?: boolean;
  children: React.ReactNode;
}) {
  if (featured) {
    return (
      <Link href={href} className="flex flex-col items-center -mt-5 relative">
        {/* Gradient animated ring */}
        <div className={"featured-btn-ring transition-all duration-300 " + (pulse ? "nav-pulse" : "")}>
          <div
            className={
              "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 " +
              (active
                ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white scale-110"
                : "bg-gradient-to-br from-orange-500/90 to-orange-600/90 text-white hover:scale-105")
            }
            style={
              active
                ? { boxShadow: "0 0 20px rgba(249,115,22,0.5), 0 0 40px rgba(249,115,22,0.2)" }
                : undefined
            }
          >
            {children}
          </div>
        </div>
        <span
          className={
            "text-[9px] mt-1 font-medium transition-colors duration-300 " +
            (active ? "text-orange-400 font-bold" : light ? "text-gray-500" : "text-gray-500")
          }
        >
          {label}
        </span>
      </Link>
    );
  }

  return (
    <Link href={href} className="flex flex-col items-center py-1 px-2 relative group">
      {/* Active accent line on top */}
      {active && (
        <span
          className="absolute -top-0 left-1/2 -translate-x-1/2 w-6 h-[3px] rounded-full"
          style={{
            background: "linear-gradient(90deg, #f97316, #a78bfa)",
            boxShadow: "0 0 8px rgba(249,115,22,0.5), 0 0 16px rgba(167,139,250,0.3)",
          }}
        />
      )}

      {/* Icon with transitions */}
      <span
        className={
          "transition-all duration-300 " +
          (active
            ? "text-orange-400 scale-110 glow-float"
            : light
            ? "text-gray-400 group-hover:text-gray-600"
            : "text-gray-500 group-hover:text-gray-300")
        }
        style={
          active
            ? { filter: "drop-shadow(0 0 6px rgba(249,115,22,0.4))" }
            : undefined
        }
      >
        {children}
      </span>

      {/* Badge dot with pulse */}
      {badge && !active && (
        <span
          className="badge-pulse absolute top-0 right-1 w-2.5 h-2.5 rounded-full"
          style={{
            background: "linear-gradient(135deg, #ef4444, #f97316)",
            boxShadow: "0 0 8px rgba(239,68,68,0.6)",
          }}
        />
      )}

      {/* Active glow underneath */}
      {active && <div className="bottom-tab-active-glow" />}

      {/* Label */}
      <span
        className={
          "text-[9px] mt-0.5 transition-colors duration-300 " +
          (active
            ? "text-orange-400 font-bold"
            : light
            ? "text-gray-400"
            : "text-gray-500")
        }
      >
        {label}
      </span>
    </Link>
  );
}
