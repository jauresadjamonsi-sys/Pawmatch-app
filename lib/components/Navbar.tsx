"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const supabase = createClient();

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
      <nav className="bg-[#1a1225]/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between h-12">
            <Link href="/" className="font-bold text-lg text-orange-400">
              Compaw
            </Link>

            <div className="hidden md:flex items-center gap-1">
              {!loading && (
                user ? (
                  <>
                    <NavLink href="/flairer" active={isActive("/flairer")} label="Flairer" />
                    <NavLink href="/animals" active={isActive("/animals")} label="Explorer" />
                    <NavLink href="/matches" active={isActive("/matches")} label="Matchs" />
                    <NavLink href="/profile" active={isActive("/profile")} label="Profil" />
                  </>
                ) : (
                  <>
                    <NavLink href="/flairer" active={isActive("/flairer")} label="Flairer" />
                    <NavLink href="/animals" active={isActive("/animals")} label="Explorer" />
                    <NavLink href="/pricing" active={isActive("/pricing")} label="Tarifs" />
                    <Link href="/signup" className="ml-3 px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-full transition">
                      Rejoindre
                    </Link>
                  </>
                )
              )}
            </div>

            <div className="md:hidden flex items-center gap-3">
              {!loading && !user && (
                <Link href="/signup" className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-full transition">
                  Rejoindre
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Bottom tab bar mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#1a1225]/95 backdrop-blur-xl border-t border-white/5 safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          <BottomTab href="/" active={isActive("/")} label="Accueil">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive("/") ? 2.5 : 1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
          </BottomTab>

          <BottomTab href="/flairer" active={isActive("/flairer")} label="Flairer" featured>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
          </BottomTab>

          <BottomTab href="/animals" active={isActive("/animals")} label="Explorer">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive("/animals") ? 2.5 : 1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </BottomTab>

          {!loading && user ? (
            <>
              <BottomTab href="/matches" active={isActive("/matches")} label="Matchs">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive("/matches") ? 2.5 : 1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                </svg>
              </BottomTab>
              <BottomTab href="/profile" active={isActive("/profile")} label="Profil">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive("/profile") ? 2.5 : 1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </BottomTab>
            </>
          ) : (
            <>
              <BottomTab href="/pricing" active={isActive("/pricing")} label="Tarifs">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive("/pricing") ? 2.5 : 1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </BottomTab>
              <BottomTab href="/login" active={isActive("/login")} label="Connexion">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive("/login") ? 2.5 : 1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
              </BottomTab>
            </>
          )}
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

function BottomTab({ href, active, label, featured, children }: { href: string; active: boolean; label: string; featured?: boolean; children: React.ReactNode }) {
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
