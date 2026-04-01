"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
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

  const isActive = (path: string) =>
    pathname === path ? "text-orange-400 font-semibold" : "text-gray-400 hover:text-orange-400";

  return (
    <nav className="bg-[#1a1225] border-b border-white/5 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-sm">🇨🇭</span>
            <span className="font-bold text-lg text-orange-400">Compaw</span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <Link href="/pricing" className={"text-sm transition " + isActive("/pricing")}>
              Tarifs
            </Link>
            <Link href="/animals" className={"text-sm transition " + isActive("/animals")}>
              Catalogue
            </Link>
            {!loading && (
              user ? (
                <>
                  <Link href="/matches" className={"text-sm transition " + isActive("/matches")}>
                    Matchs
                  </Link>
                  <Link href="/profile" className={"text-sm transition " + isActive("/profile")}>
                    Profil
                  </Link>
                  <Link href="/profile/animals/new" className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition">
                    + Ajouter
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/login" className={"text-sm transition " + isActive("/login")}>
                    Connexion
                  </Link>
                  <Link href="/signup" className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition">
                    S'inscrire
                  </Link>
                </>
              )
            )}
          </div>

          {/* Flags */}
          <div className="hidden md:flex items-center gap-2">
            <span className="text-sm cursor-pointer opacity-80 hover:opacity-100">🇫🇷</span>
            <span className="text-sm cursor-pointer opacity-50 hover:opacity-100">🇩🇪</span>
            <span className="text-sm cursor-pointer opacity-50 hover:opacity-100">🇬🇧</span>
          </div>

          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 text-gray-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden pb-4 space-y-2">
            <Link href="/pricing" onClick={() => setMenuOpen(false)} className={"block px-4 py-2 rounded-lg text-sm transition " + isActive("/pricing")}>
              Tarifs
            </Link>
            <Link href="/animals" onClick={() => setMenuOpen(false)} className={"block px-4 py-2 rounded-lg text-sm transition " + isActive("/animals")}>
              Catalogue
            </Link>
            {!loading && (
              user ? (
                <>
                  <Link href="/matches" onClick={() => setMenuOpen(false)} className={"block px-4 py-2 rounded-lg text-sm transition " + isActive("/matches")}>
                    Matchs
                  </Link>
                  <Link href="/profile" onClick={() => setMenuOpen(false)} className={"block px-4 py-2 rounded-lg text-sm transition " + isActive("/profile")}>
                    Profil
                  </Link>
                  <Link href="/profile/animals/new" onClick={() => setMenuOpen(false)} className="block px-4 py-2 bg-orange-500 text-white text-sm font-semibold rounded-lg text-center">
                    + Ajouter un compagnon
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMenuOpen(false)} className={"block px-4 py-2 rounded-lg text-sm transition " + isActive("/login")}>
                    Connexion
                  </Link>
                  <Link href="/signup" onClick={() => setMenuOpen(false)} className="block px-4 py-2 bg-orange-500 text-white text-sm font-semibold rounded-lg text-center">
                    S'inscrire
                  </Link>
                </>
              )
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
