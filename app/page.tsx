"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useAppContext } from "@/lib/contexts/AppContext";

const EMOJI_MAP: Record<string, string> = {
  chien: "🐕", chat: "🐱", lapin: "🐰",
  oiseau: "🐦", rongeur: "🐹", autre: "🐾",
};

export default function HomePage() {
  const { t } = useAppContext();
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

      <div className="relative text-center pt-10 pb-8 px-4">
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

      <div className="px-6 mb-8">
        <div className="grid grid-cols-2 gap-3">
          <Link href="/flairer" className="bg-gradient-to-br from-[var(--c-card)] to-[var(--c-deep)] border border-orange-500/15 rounded-2xl p-5 card-hover relative overflow-hidden">
            <span className="text-2xl mb-2 block">👃</span>
            <h3 className="font-bold text-white text-sm">{t.sniff}</h3>
            <p className="text-xs text-gray-500 mt-1">{t.sniffSub}</p>
          </Link>
          <Link href="/animals" className="bg-gradient-to-br from-[var(--c-card)] to-[var(--c-deep)] border border-[var(--c-border)] rounded-2xl p-5 card-hover relative overflow-hidden">
            <span className="text-2xl mb-2 block">🔍</span>
            <h3 className="font-bold text-white text-sm">{t.explore}</h3>
            <p className="text-xs text-gray-500 mt-1">{t.exploreSub}</p>
          </Link>
          <Link href="/pricing" className="bg-gradient-to-br from-[var(--c-card)] to-[var(--c-deep)] border border-[var(--c-border)] rounded-2xl p-5 card-hover relative overflow-hidden">
            <span className="text-2xl mb-2 block">✨</span>
            <h3 className="font-bold text-white text-sm">{t.premium}</h3>
            <p className="text-xs text-gray-500 mt-1">{t.premiumSub}</p>
          </Link>
          <Link href="/signup" className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/25 rounded-2xl p-5 card-hover relative overflow-hidden">
            <span className="text-2xl mb-2 block">🚀</span>
            <h3 className="font-bold text-orange-400 text-sm">{t.joinCard}</h3>
            <p className="text-xs text-orange-300/50 mt-1">{t.joinCardSub}</p>
          </Link>
        </div>
      </div>

      <div className="px-6 mb-8">
        <div className="bg-gradient-to-r from-orange-500/10 via-pink-500/5 to-purple-500/10 border border-orange-500/20 rounded-2xl p-6 relative overflow-hidden glow-orange">
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

      <div className="px-6 mb-8">
        <div className="bg-gradient-to-br from-orange-500/15 via-orange-600/10 to-[var(--c-card)] border border-orange-500/25 rounded-2xl p-8 text-center relative overflow-hidden glow-orange">
          <h2 className="text-xl font-bold text-white mb-2">{t.ctaTitle}</h2>
          <p className="text-xs text-gray-400 mb-5">{t.ctaDesc}</p>
          <Link href="/signup" className="inline-block px-8 py-3.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-full transition text-sm glow-orange">
            {t.ctaButton}
          </Link>
        </div>
      </div>

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
