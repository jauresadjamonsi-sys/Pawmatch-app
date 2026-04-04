"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useAppContext } from "@/lib/contexts/AppContext";
import { MatchDuJour } from "@/lib/components/MatchDuJour";;

const EMOJI_MAP: Record<string, string> = {
  chien: "🐕", chat: "🐱", lapin: "🐰",
  oiseau: "🐦", rongeur: "🐹", autre: "🐾",
};

const STORY_KEYS = [
  { name: "storyName1", breed: "storyBreed1", story: "story1", photo: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=120&h=120&fit=crop&crop=face", score: 94 },
  { name: "storyName2", breed: "storyBreed2", story: "story2", photo: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=120&h=120&fit=crop&crop=face", score: 89 },
  { name: "storyName3", breed: "storyBreed3", story: "story3", photo: "https://images.unsplash.com/photo-1615497001839-b0a0eac3274c?w=120&h=120&fit=crop&crop=face", score: 91 },
];

const HOW_STEPS = [
  { num: "1", emoji: "📝", key: "step1", descKey: "step1Desc" },
  { num: "2", emoji: "🧠", key: "step2", descKey: "step2Desc" },
  { num: "3", emoji: "🤝", key: "step3", descKey: "step3Desc" },
];

const TESTIMONIALS = [
  { text: "testimonial1", author: "testimonial1Author", pet: "testimonial1Pet" },
  { text: "testimonial2", author: "testimonial2Author", pet: "testimonial2Pet" },
  { text: "testimonial3", author: "testimonial3Author", pet: "testimonial3Pet" },
];

export default function HomePage() {
  const { t, lang } = useAppContext();
  const [animals, setAnimals] = useState<any[]>([]);
  const [totalAnimals, setTotalAnimals] = useState(0);
  const [totalProfiles, setTotalProfiles] = useState(0);
  const [storyIdx, setStoryIdx] = useState(0);
  const [testimonialIdx, setTestimonialIdx] = useState(0);
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
    const storyInterval = setInterval(() => setStoryIdx(i => (i + 1) % 3), 4000);
    const testimonialInterval = setInterval(() => setTestimonialIdx(i => (i + 1) % 3), 5000);
    return () => { clearInterval(storyInterval); clearInterval(testimonialInterval); };
  }, []);

  const currentStory = STORY_KEYS[storyIdx];
  const currentTestimonial = TESTIMONIALS[testimonialIdx];

  return (
    <div className="min-h-screen bg-[var(--c-deep)] text-[var(--c-text)] overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pawFloat { 0%,100%{transform:translateY(0) rotate(-10deg)}50%{transform:translateY(-8px) rotate(10deg)} }
        @keyframes fadeInUp { from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)} }
        @keyframes slideIn { from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)} }
        @keyframes pulse { 0%,100%{transform:scale(1)}50%{transform:scale(1.04)} }
        @keyframes shimmer { 0%{background-position:-200% 0}100%{background-position:200% 0} }
        .paw-float{animation:pawFloat 3s ease-in-out infinite}
        .fade-in-up{animation:fadeInUp .8s ease-out forwards}
        .slide-in{animation:slideIn .5s ease-out forwards}
        .pulse-slow{animation:pulse 3s ease-in-out infinite}
        .glow-accent{box-shadow:0 0 40px var(--c-accent,rgba(249,115,22,.15))}
        .card-hover{transition:transform .2s ease}
        .card-hover:active{transform:scale(.97)}
        .shimmer{background:linear-gradient(90deg,transparent,rgba(255,255,255,.05),transparent);background-size:200% 100%;animation:shimmer 3s linear infinite}
      `}} />

      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-3xl" style={{background:"var(--c-accent, rgba(249,115,22,.06))",opacity:0.15}} />
      </div>

      {/* ═══════════════ HERO ═══════════════ */}
      <div className="relative text-center pt-10 pb-8 px-5">
        <span className="paw-float text-5xl block mb-4">🐾</span>

        <h1 className="text-3xl font-extrabold leading-tight mb-1">
          <span className="text-[var(--c-text)]">{t.heroTitle}</span>
        </h1>
        <h2 className="text-2xl font-extrabold mb-3" style={{color:"var(--c-accent, #f97316)"}}>
          {t.heroTitle2}
        </h2>
        <p className="text-sm mb-5 max-w-sm mx-auto text-[var(--c-text-muted)] leading-relaxed">{t.heroSub}</p>

        {/* Bullets */}
        <div className="flex flex-col gap-2.5 max-w-sm mx-auto mb-6 text-left">
          {[t.bullet1, t.bullet2, t.bullet3].map((b, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-[var(--c-text-muted)]">
              <span className="leading-5">{b}</span>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex gap-3 justify-center mb-4">
          <Link href="/signup" className="px-6 py-3 font-bold rounded-full text-sm text-white pulse-slow glow-accent" style={{background:"var(--c-accent, linear-gradient(to right, #f97316, #ea580c))"}}>
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
            [totalProfiles < 10 ? "🇨🇭" : totalProfiles + "+", totalProfiles < 10 ? t.tagline : t.owners],
            [totalAnimals < 10 ? "26" : totalAnimals + "+", totalAnimals < 10 ? "cantons couverts" : t.animals],
            ["92%", t.matchRate],
          ].map(([val, label]) => (
            <div key={String(label)} className="text-center">
              <p className="text-2xl font-bold" style={{color:"var(--c-accent, #f97316)"}}>{val}</p>
              <p className="text-[10px] uppercase tracking-wider text-[var(--c-text-muted)]">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════════ HISTOIRES ÉMOTIONNELLES ═══════════════ */}
      <div className="px-5 mb-8">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest mb-4 text-center text-[var(--c-text-muted)]">{t.storiesTitle}</h2>
        <div key={storyIdx} className="slide-in bg-[var(--c-card)] border border-[var(--c-border)] rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border-2" style={{borderColor:"var(--c-accent, #f97316)"}}>
              <img src={currentStory.photo} alt={t[currentStory.name]} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-sm" style={{color:"var(--c-accent, #f97316)"}}>{t[currentStory.name]}</span>
                <span className="text-[10px] px-2 py-0.5 bg-[var(--c-border)] rounded-full text-[var(--c-text-muted)]">{t[currentStory.breed]}</span>
              </div>
              <p className="text-xs leading-relaxed text-[var(--c-text-muted)] italic">"{t[currentStory.name]} {t[currentStory.story]}"</p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 mt-3">
            <span className="text-lg font-black text-green-500">{currentStory.score}%</span>
            <span className="text-[9px] text-[var(--c-text-muted)]">{t.compatible}</span>
          </div>
        </div>
        {/* Dots */}
        <div className="flex justify-center gap-2 mt-3">
          {[0,1,2].map(i => (
            <button key={i} onClick={() => setStoryIdx(i)} className="w-2 h-2 rounded-full transition-all" style={{background: i === storyIdx ? "var(--c-accent, #f97316)" : "var(--c-border)"}} />
          ))}
        </div>
      </div>

      {/* ═══════════════ MATCH DU JOUR ═══════════════ */}
      <div className="px-5 mb-8">
        <MatchDuJour lang={lang} />
      </div>

      {/* ═══════════════ TEST PERSONNALITÉ — HOOK VIRAL ═══════════════ */}
      <div className="px-5 mb-8">
        <div className="relative bg-[var(--c-card)] border-2 rounded-2xl p-6 text-center overflow-hidden" style={{borderColor:"var(--c-accent, rgba(249,115,22,.3))"}}>
          <div className="shimmer absolute inset-0 rounded-2xl pointer-events-none" />
          <span className="text-4xl block mb-3">🧠</span>
          <h2 className="font-extrabold text-lg mb-2 text-[var(--c-text)]">{t.personalityTitle}</h2>
          <p className="text-xs text-[var(--c-text-muted)] mb-4 max-w-xs mx-auto leading-relaxed">{t.personalitySub}</p>
          <Link href="/signup" className="inline-block px-6 py-3 text-white font-bold rounded-full text-sm pulse-slow glow-accent" style={{background:"var(--c-accent, #f97316)"}}>
            {t.personalityCta}
          </Link>
          <p className="text-[10px] mt-3 text-[var(--c-text-muted)]">{t.personalityTypes}</p>
        </div>
      </div>

      {/* ═══════════════ COMMENT ÇA MARCHE ═══════════════ */}
      <div className="px-5 mb-8">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest mb-4 text-center text-[var(--c-text-muted)]">{t.howItWorks}</h2>
        <div className="flex flex-col gap-3">
          {HOW_STEPS.map((step, i) => (
            <div key={i} className="flex items-start gap-4 bg-[var(--c-card)] border border-[var(--c-border)] rounded-2xl p-4">
              <div className="w-9 h-9 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0 text-white" style={{background:"var(--c-accent, #f97316)"}}>
                {step.num}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{step.emoji}</span>
                  <h3 className="font-bold text-sm text-[var(--c-text)]">{t[step.key]}</h3>
                </div>
                <p className="text-xs text-[var(--c-text-muted)] leading-relaxed">{t[step.descKey]}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════════ ANIMAUX RÉCENTS ═══════════════ */}
      {animals.length > 0 && (
        <div className="px-5 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-[var(--c-text-muted)]">{t.recentlyActive}</h2>
            <Link href="/animals" className="text-[11px] font-semibold" style={{color:"var(--c-accent, #f97316)"}}>{t.seeAll}</Link>
          </div>
          <div className="flex gap-5 overflow-x-auto pb-2">
            {animals.map((animal) => (
              <Link href={"/animals/" + animal.id} key={animal.id} className="flex flex-col items-center flex-shrink-0 group">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-[var(--c-card)] border-[2.5px] group-hover:border-[var(--c-accent)] flex items-center justify-center overflow-hidden mb-2 transition-colors" style={{borderColor:"var(--c-accent, rgba(249,115,22,.6))"}}>
                    {animal.photo_url
                      ? <img src={animal.photo_url} alt={animal.name} className="w-full h-full object-cover" />
                      : <span className="text-2xl">{EMOJI_MAP[animal.species] || "🐾"}</span>}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-[var(--c-deep)]" />
                </div>
                <p className="text-xs font-medium text-[var(--c-text)]">{animal.name}</p>
                {animal.canton && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full mt-1" style={{background:"var(--c-accent, rgba(249,115,22,.15))",color:"var(--c-accent, #fb923c)"}}>{animal.canton}</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════ SCORE IA DEMO ═══════════════ */}
      <div className="px-5 mb-8">
        <div className="bg-[var(--c-card)] border border-[var(--c-border)] rounded-2xl p-5 glow-accent">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🤖</span>
            <div className="flex-1">
              <h3 className="font-bold text-sm text-[var(--c-text)]">{t.iaTitle}</h3>
              <p className="text-[10px] text-[var(--c-text-muted)]">{t.iaSub}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-2xl font-black text-green-500">94%</div>
              <div className="text-[9px] font-bold" style={{color:"var(--c-accent, #f97316)"}}>{t.iaVerdict}</div>
            </div>
          </div>
          <div className="flex flex-col gap-2.5">
            {[
              { key: "iaEnergy", score: 95 },
              { key: "iaSocial", score: 90 },
              { key: "iaSize", score: 88 },
              { key: "iaZone", score: 100 },
            ].map((trait, i) => (
              <div key={i}>
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-[var(--c-text-muted)]">{t[trait.key]}</span>
                  <span className="font-bold" style={{color:"var(--c-accent, #f97316)"}}>{trait.score}%</span>
                </div>
                <div className="h-1.5 bg-[var(--c-border)] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{width:`${trait.score}%`,background:`linear-gradient(to right, var(--c-accent, #f97316), #22c55e)`}} />
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] mt-4 text-center italic text-[var(--c-text-muted)]">"{t.iaQuote}"</p>
        </div>
      </div>

      {/* ═══════════════ TÉMOIGNAGES ═══════════════ */}
      <div className="px-5 mb-8">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest mb-4 text-center text-[var(--c-text-muted)]">{t.testimonialTitle}</h2>
        <div key={testimonialIdx} className="slide-in bg-[var(--c-card)] border border-[var(--c-border)] rounded-2xl p-5">
          <div className="flex gap-1 mb-3">
            {[1,2,3,4,5].map(s => <span key={s} className="text-sm">⭐</span>)}
          </div>
          <p className="text-sm italic text-[var(--c-text)] leading-relaxed mb-3">"{t[currentTestimonial.text]}"</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold" style={{color:"var(--c-accent, #f97316)"}}>{t[currentTestimonial.author]}</p>
              <p className="text-[10px] text-[var(--c-text-muted)]">{t[currentTestimonial.pet]}</p>
            </div>
            <span className="text-2xl">🐾</span>
          </div>
        </div>
        <div className="flex justify-center gap-2 mt-3">
          {[0,1,2].map(i => (
            <button key={i} onClick={() => setTestimonialIdx(i)} className="w-2 h-2 rounded-full transition-all" style={{background: i === testimonialIdx ? "var(--c-accent, #f97316)" : "var(--c-border)"}} />
          ))}
        </div>
      </div>

      {/* ═══════════════ GRILLE ACTIONS ═══════════════ */}
      <div className="px-5 mb-8">
        <div className="grid grid-cols-2 gap-3">
          {[
            { href: "/flairer", emoji: "👃", key: "sniff", subKey: "sniffSub", accent: false },
            { href: "/events", emoji: "📅", key: "events", subKey: "eventsSub", accent: false },
            { href: "/pricing", emoji: "✨", key: "premium", subKey: "premiumSub", accent: false },
            { href: "/signup", emoji: "🚀", key: "joinCard", subKey: "joinCardSub", accent: true },
          ].map((item, i) => (
            <Link key={i} href={item.href} className={`bg-[var(--c-card)] border border-[var(--c-border)] rounded-2xl p-5 card-hover ${item.accent ? "border-2" : ""}`} style={item.accent ? {borderColor:"var(--c-accent, #f97316)"} : {}}>
              <span className="text-2xl mb-2 block">{item.emoji}</span>
              <h3 className={`font-bold text-sm ${item.accent ? "" : "text-[var(--c-text)]"}`} style={item.accent ? {color:"var(--c-accent, #f97316)"} : {}}>{t[item.key]}</h3>
              <p className="text-xs mt-1 text-[var(--c-text-muted)]">{t[item.subKey]}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* ═══════════════ COUP DE TRUFFE ═══════════════ */}
      <div className="px-5 mb-8">
        <div className="bg-[var(--c-card)] border border-[var(--c-border)] rounded-2xl p-6 glow-accent">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">💥</span>
            <div>
              <h3 className="font-bold text-[var(--c-text)]">{t.coupDeTruffe}</h3>
              <p className="text-xs text-[var(--c-text-muted)]">{t.coupDesc}</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-6 bg-[var(--c-deep)] rounded-xl p-4">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl mb-1" style={{background:"var(--c-accent, rgba(249,115,22,.2))"}}>🐕</div>
              <p className="text-xs font-medium text-[var(--c-text)]">Ruby</p>
              <p className="text-[9px] text-[var(--c-text-muted)]">Juriens</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black">❤️</div>
              <p className="text-[10px] font-bold text-green-500 mt-1">Match !</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-pink-500/20 flex items-center justify-center text-2xl mb-1">🐕</div>
              <p className="text-xs font-medium text-[var(--c-text)]">Luna</p>
              <p className="text-[9px] text-[var(--c-text-muted)]">Orbe</p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════ CTA FINAL ═══════════════ */}
      <div className="px-5 mb-12">
        <div className="text-center bg-[var(--c-card)] border-2 rounded-2xl p-8" style={{borderColor:"var(--c-accent, rgba(249,115,22,.2))"}}>
          <p className="text-3xl mb-3">🐾</p>
          <h2 className="font-extrabold text-xl mb-2 text-[var(--c-text)]">{t.ctaTitle}</h2>
          <p className="text-xs mb-6 text-[var(--c-text-muted)] max-w-xs mx-auto">{t.ctaDesc}</p>
          <Link href="/signup" className="inline-block px-8 py-3 text-white font-bold rounded-full pulse-slow glow-accent" style={{background:"var(--c-accent, #f97316)"}}>
            {t.ctaButton}
          </Link>
          <p className="text-[10px] mt-3 text-[var(--c-text-muted)]">{t.ctaFree}</p>
        </div>
      </div>
    </div>
  );
}
