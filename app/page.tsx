"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useAppContext } from "@/lib/contexts/AppContext";

const EMOJI_MAP: Record<string, string> = {
  chien: "🐕", chat: "🐱", lapin: "🐰",
  oiseau: "🐦", rongeur: "🐹", autre: "🐾",
};

const STORY_NAMES = ["Max", "Mimi", "Coco"];
const STORY_EMOJIS = ["🐕", "🐱", "🐰"];
const STORY_KEYS = ["story1", "story2", "story3"];
const STORY_SCORES = [94, 89, 91];

const HOW_STEPS = [
  { num: "1", emoji: "📝", key: "step1", descKey: "step1Desc" },
  { num: "2", emoji: "🤖", key: "step2", descKey: "step2Desc" },
  { num: "3", emoji: "🐾", key: "step3", descKey: "step3Desc" },
];

export default function HomePage() {
  const { t } = useAppContext();
  const [animals, setAnimals] = useState<any[]>([]);
  const [totalAnimals, setTotalAnimals] = useState(0);
  const [totalProfiles, setTotalProfiles] = useState(0);
  const [storyIdx, setStoryIdx] = useState(0);
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
    const interval = setInterval(() => setStoryIdx(i => (i + 1) % 3), 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--c-deep)] text-[var(--c-text)] overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pawBounceLeft { 0%,100%{transform:rotate(-15deg) translateY(0);opacity:.4}50%{transform:rotate(-15deg) translateY(-12px);opacity:.7} }
        @keyframes pawBounceRight { 0%,100%{transform:rotate(15deg) translateY(-12px);opacity:.4}50%{transform:rotate(15deg) translateY(0);opacity:.7} }
        @keyframes fadeInUp { from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{transform:scale(1)}50%{transform:scale(1.05)} }
        @keyframes slideIn { from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)} }
        .paw-left{animation:pawBounceLeft 2s ease-in-out infinite}
        .paw-right{animation:pawBounceRight 2s ease-in-out infinite}
        .fade-in-up{animation:fadeInUp .8s ease-out forwards}
        .pulse-slow{animation:pulse 3s ease-in-out infinite}
        .slide-in{animation:slideIn .5s ease-out forwards}
        .glow-orange{box-shadow:0 0 30px rgba(249,115,22,.15)}
        .card-hover{transition:transform .2s ease}
        .card-hover:active{transform:scale(.97)}
      `}} />

      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-orange-500/5 rounded-full blur-3xl" />
      </div>

      {/* HERO */}
      <div className="relative text-center pt-10 pb-6 px-4">
        <div className="flex justify-center gap-4 mb-4">
          <span className="paw-left text-5xl drop-shadow-lg">🐾</span>
          <span className="paw-right text-5xl drop-shadow-lg">🐾</span>
        </div>
        <h1 className="text-4xl font-extrabold mb-2">
          <span className="bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500 bg-clip-text text-transparent">Pawly</span>
        </h1>
        <p className="font-bold text-lg mb-2 text-[var(--c-text)]">{t.heroTitle}</p>
        <p className="text-sm mb-4 max-w-xs mx-auto text-[var(--c-text-muted)]">{t.heroSub}</p>

        {/* Bullets */}
        <div className="flex flex-col gap-2 max-w-xs mx-auto mb-6 text-left">
          {[t.bullet1, t.bullet2, t.bullet3].map((b, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-[var(--c-text-muted)]">
              <span>{b}</span>
            </div>
          ))}
        </div>

        {/* Story dynamique */}
        <div key={storyIdx} className="slide-in mx-auto max-w-xs bg-[var(--c-card)] border border-orange-500/20 rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{STORY_EMOJIS[storyIdx]}</span>
            <div className="flex-1 text-left">
              <p className="text-xs text-orange-400 font-bold mb-1">{STORY_NAMES[storyIdx]}</p>
              <p className="text-xs italic text-[var(--c-text-muted)]">"{STORY_NAMES[storyIdx]} {t[STORY_KEYS[storyIdx]]}"</p>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-lg font-black text-green-500">{STORY_SCORES[storyIdx]}%</div>
              <div className="text-[9px] text-[var(--c-text-muted)]">{t.compatible}</div>
            </div>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex gap-3 justify-center mb-4">
          <Link href="/onboarding" className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-full text-sm pulse-slow glow-orange">
            {t.findMatch}
          </Link>
          <Link href="/flairer" className="px-6 py-3 bg-[var(--c-card)] border border-[var(--c-border)] font-medium rounded-full text-sm card-hover text-[var(--c-text-muted)]">
            {t.explore}
          </Link>
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full text-xs text-green-500 font-bold">
          {t.freemium}
        </div>

        {/* Stats */}
        <div className="flex justify-center gap-8 mt-6">
          {[
            [totalProfiles + "+", t.owners],
            [totalAnimals + "+", t.animals],
            ["92%", t.matchRate],
          ].map(([val, label]) => (
            <div key={label} className="text-center">
              <p className="text-2xl font-bold text-orange-400">{val}</p>
              <p className="text-[10px] uppercase tracking-wider text-[var(--c-text-muted)]">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* COMMENT ÇA MARCHE */}
      <div className="px-6 mb-8">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest mb-4 text-center text-[var(--c-text-muted)]">{t.howItWorks}</h2>
        <div className="flex flex-col gap-3">
          {HOW_STEPS.map((step, i) => (
            <div key={i} className="flex items-start gap-4 bg-[var(--c-card)] border border-[var(--c-border)] rounded-2xl p-4">
              <div className="w-8 h-8 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400 font-black text-sm flex-shrink-0">
                {step.num}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{step.emoji}</span>
                  <h3 className="font-bold text-sm text-[var(--c-text)]">{t[step.key]}</h3>
                </div>
                <p className="text-xs text-[var(--c-text-muted)]">{t[step.descKey]}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ANIMAUX RÉCENTS */}
      {animals.length > 0 && (
        <div className="px-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-[var(--c-text-muted)]">{t.recentlyActive}</h2>
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
                <p className="text-xs font-medium text-[var(--c-text)]">{animal.name}</p>
                {animal.canton && (
                  <span className="text-[10px] px-2 py-0.5 bg-orange-500/15 text-orange-300 rounded-full mt-1">{animal.canton}</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* SCORE IA DEMO */}
      <div className="px-6 mb-8">
        <div className="bg-[var(--c-card)] border border-orange-500/20 rounded-2xl p-5 glow-orange">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🤖</span>
            <div>
              <h3 className="font-bold text-sm text-[var(--c-text)]">{t.iaTitle}</h3>
              <p className="text-[10px] text-[var(--c-text-muted)]">{t.iaSub}</p>
            </div>
            <div className="ml-auto text-right">
              <div className="text-2xl font-black text-green-500">94%</div>
              <div className="text-[9px] text-[var(--c-text-muted)]">{t.compatible}</div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {[
              { key: "iaEnergy", score: 95 },
              { key: "iaSocial", score: 90 },
              { key: "iaSize", score: 88 },
              { key: "iaZone", score: 100 },
            ].map((trait, i) => (
              <div key={i}>
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-[var(--c-text-muted)]">{t[trait.key]}</span>
                  <span className="text-orange-400 font-bold">{trait.score}%</span>
                </div>
                <div className="h-1.5 bg-[var(--c-border)] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-orange-500 to-green-400 rounded-full" style={{ width: `${trait.score}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] mt-4 text-center italic text-[var(--c-text-muted)]">{t.iaQuote}</p>
        </div>
      </div>

      {/* GRILLE ACTIONS */}
      <div className="px-6 mb-8">
        <div className="grid grid-cols-2 gap-3">
          {[
            { href: "/flairer", emoji: "👃", key: "sniff", subKey: "sniffSub", border: "border-orange-500/15" },
            { href: "/events", emoji: "📅", key: "events", subKey: "eventsSub", border: "border-[var(--c-border)]" },
            { href: "/pricing", emoji: "✨", key: "premium", subKey: "premiumSub", border: "border-purple-500/20" },
            { href: "/onboarding", emoji: "🚀", key: "joinCard", subKey: "joinCardSub", border: "border-orange-500/25", orange: true },
          ].map((item, i) => (
            <Link key={i} href={item.href} className={`bg-[var(--c-card)] border ${item.border} rounded-2xl p-5 card-hover`}>
              <span className="text-2xl mb-2 block">{item.emoji}</span>
              <h3 className={`font-bold text-sm ${item.orange ? "text-orange-400" : "text-[var(--c-text)]"}`}>{t[item.key]}</h3>
              <p className="text-xs mt-1 text-[var(--c-text-muted)]">{t[item.subKey]}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* COUP DE TRUFFE */}
      <div className="px-6 mb-8">
        <div className="bg-[var(--c-card)] border border-orange-500/20 rounded-2xl p-6 glow-orange">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">💥</span>
            <div>
              <h3 className="font-bold text-[var(--c-text)]">{t.coupDeTruffe}</h3>
              <p className="text-xs text-[var(--c-text-muted)]">{t.coupDesc}</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-4 bg-[var(--c-deep)]/50 rounded-xl p-4">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center text-2xl mb-1">🐕</div>
              <p className="text-[10px] text-[var(--c-text-muted)]">Max</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-orange-400">❤️</div>
              <p className="text-[10px] text-green-500 font-bold">Match !</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-pink-500/20 flex items-center justify-center text-2xl mb-1">🐕</div>
              <p className="text-[10px] text-[var(--c-text-muted)]">Luna</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA FINAL */}
      <div className="px-6 mb-12">
        <div className="text-center bg-[var(--c-card)] border border-orange-500/20 rounded-2xl p-8">
          <p className="text-2xl mb-3">🐾</p>
          <h2 className="font-bold text-lg mb-2 text-[var(--c-text)]">{t.ctaTitle}</h2>
          <p className="text-xs mb-6 text-[var(--c-text-muted)]">{t.ctaDesc}</p>
          <Link href="/onboarding" className="inline-block px-8 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-full pulse-slow glow-orange">
            {t.ctaButton}
          </Link>
          <p className="text-[10px] mt-3 text-[var(--c-text-muted)]">{t.ctaFree}</p>
        </div>
      </div>
    </div>
  );
}
