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
      {/* Top bar — minimaliste */}
      <nav className="bg-[#1a1225]/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between h-12">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-sm">🇨🇭</span>
              <span className="font-bold text-lg text-orange-400">Compaw</span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-1">
              {!loading && (
                user ? (
                  <>
                    <NavLink href="/flairer" active={isActive("/flairer")} icon="👃" label="Flairer" />
                    <NavLink href="/animals" active={isActive("/animals")} icon="🔍" label="Explorer" />
                    <NavLink href="/matches" active={isActive("/matches")} icon="💬" label="Matchs" />
                    <NavLink href="/profile" active={isActive("/profile")} icon="🐾" label="Profil" />
                  </>
                ) : (
                  <>
                    <NavLink href="/flairer" active={isActive("/flairer")} icon="👃" label="Flairer" />
                    <NavLink href="/animals" active={isActive("/animals")} icon="🔍" label="Explorer" />
                    <NavLink href="/pricing" active={isActive("/pricing")} icon="⭐" label="Tarifs" />
                    <Link href="/signup" className="ml-3 px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-full transition">
                      Rejoindre
                    </Link>
                  </>
                )
              )}
            </div>

            {/* Mobile — right side */}
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

      {/* Bottom tab bar — mobile only */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#1a1225]/95 backdrop-blur-xl border-t border-white/5 safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          <BottomTab href="/" active={isActive("/")} icon="🏠" label="Accueil" />
          <BottomTab href="/flairer" active={isActive("/flairer")} icon="👃" label="Flairer" featured />
          <BottomTab href="/animals" active={isActive("/animals")} icon="🔍" label="Explorer" />
          {!loading && user ? (
            <>
              <BottomTab href="/matches" active={isActive("/matches")} icon="💬" label="Matchs" />
              <BottomTab href="/profile" active={isActive("/profile")} icon="🐾" label="Profil" />
            </>
          ) : (
            <>
              <BottomTab href="/pricing" active={isActive("/pricing")} icon="⭐" label="Tarifs" />
              <BottomTab href="/login" active={isActive("/login")} icon="👤" label="Connexion" />
            </>
          )}
        </div>
      </div>

      {/* Spacer pour éviter que le contenu soit caché par la bottom bar sur mobile */}
      <div className="md:hidden h-16"></div>
    </>
  );
}

function NavLink({ href, active, icon, label }: { href: string; active: boolean; icon: string; label: string }) {
  return (
    <Link
      href={href}
      className={
        "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm transition " +
        (active
          ? "bg-orange-500/15 text-orange-400 font-semibold"
          : "text-gray-400 hover:text-white hover:bg-white/5")
      }
    >
      <span className="text-sm">{icon}</span>
      {label}
    </Link>
  );
}

function BottomTab({ href, active, icon, label, featured }: { href: string; active: boolean; icon: string; label: string; featured?: boolean }) {
  if (featured) {
    return (
      <Link href={href} className="flex flex-col items-center -mt-5">
        <div className={"w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-lg transition " + 
          (active 
            ? "bg-orange-500 shadow-orange-500/40 scale-110" 
            : "bg-orange-500/80 hover:bg-orange-500 shadow-orange-500/20")
        }>
          {icon}
        </div>
        <span className={"text-[10px] mt-1 " + (active ? "text-orange-400 font-semibold" : "text-gray-500")}>{label}</span>
      </Link>
    );
  }

  return (
    <Link href={href} className="flex flex-col items-center py-1 px-2">
      <span className={"text-xl transition " + (active ? "scale-110" : "")}>{icon}</span>
      <span className={"text-[10px] mt-0.5 " + (active ? "text-orange-400 font-semibold" : "text-gray-500")}>{label}</span>
    </Link>
  );
}
