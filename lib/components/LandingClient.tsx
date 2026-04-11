"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import Image from "next/image";
import { useAppContext } from "@/lib/contexts/AppContext";
import PromoSection from "@/lib/components/PromoSection";

/* ──────────────────────────────────────────
   FLOATING PARTICLES COMPONENT
   ────────────────────────────────────────── */
const PARTICLES = [
  { color: "rgba(245,158,11,0.25)", size: 5, left: "10%", duration: "14s", delay: "0s" },
  { color: "rgba(167,139,250,0.2)", size: 4, left: "25%", duration: "18s", delay: "2s" },
  { color: "rgba(56,189,248,0.2)", size: 6, left: "45%", duration: "16s", delay: "4s" },
  { color: "rgba(245,158,11,0.18)", size: 3, left: "65%", duration: "20s", delay: "1s" },
  { color: "rgba(167,139,250,0.22)", size: 5, left: "80%", duration: "15s", delay: "3s" },
  { color: "rgba(56,189,248,0.15)", size: 4, left: "90%", duration: "17s", delay: "5s" },
  { color: "rgba(245,158,11,0.2)", size: 3, left: "35%", duration: "19s", delay: "6s" },
  { color: "rgba(167,139,250,0.18)", size: 5, left: "55%", duration: "13s", delay: "2.5s" },
];

function FloatingParticles() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      {PARTICLES.map((p, i) => (
        <div
          key={i}
          className="particle"
          style={{
            background: p.color,
            width: p.size,
            height: p.size,
            left: p.left,
            bottom: "-10px",
            animation: `particle-float ${p.duration} ease-in-out infinite`,
            animationDelay: p.delay,
          }}
        />
      ))}
    </div>
  );
}

/* ──────────────────────────────────────────
   FLOATING PAWS FOR HERO
   ────────────────────────────────────────── */
const PAWS = [
  { top: "12%", left: "8%", size: "2rem", delay: "0s", duration: "6s" },
  { top: "20%", right: "10%", size: "1.5rem", delay: "1s", duration: "7s" },
  { top: "65%", left: "5%", size: "1.8rem", delay: "2s", duration: "5.5s" },
  { top: "70%", right: "8%", size: "1.3rem", delay: "3s", duration: "8s" },
  { top: "40%", left: "3%", size: "1rem", delay: "1.5s", duration: "6.5s" },
  { top: "45%", right: "4%", size: "1.6rem", delay: "4s", duration: "7.5s" },
];

function FloatingPaws() {
  return (
    <>
      {PAWS.map((paw, i) => (
        <span
          key={i}
          className="absolute animate-paw-drift select-none"
          style={{
            top: paw.top,
            left: paw.left,
            right: (paw as any).right,
            fontSize: paw.size,
            animationDelay: paw.delay,
            animationDuration: paw.duration,
            opacity: 0.35,
          }}
        >
          🐾
        </span>
      ))}
    </>
  );
}

/* ──────────────────────────────────────────
   INTERSECTION OBSERVER HOOK
   ────────────────────────────────────────── */
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}

/* ──────────────────────────────────────────
   ANIMATED COUNTER HOOK
   ────────────────────────────────────────── */
function useAnimatedCounter(target: number, visible: boolean, duration = 1500) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!visible || target === 0) return;
    let start = 0;
    const step = Math.max(1, Math.floor(target / (duration / 16)));
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(start);
    }, 16);
    return () => clearInterval(timer);
  }, [visible, target, duration]);
  return count;
}

/* ──────────────────────────────────────────
   HOW IT WORKS STEPS
   ────────────────────────────────────────── */
const HOW_STEPS = [
  { num: "01", emoji: "📝", titleKey: "step1", descKey: "step1Desc" },
  { num: "02", emoji: "🧠", titleKey: "step2", descKey: "step2Desc" },
  { num: "03", emoji: "🤝", titleKey: "step3", descKey: "step3Desc" },
];

/* ──────────────────────────────────────────
   FEATURES
   ────────────────────────────────────────── */
const FEATURES = [
  { emoji: "💕", titleKey: "sniff", descKey: "sniffSub", align: "left" },
  { emoji: "💬", titleKey: "events", descKey: "eventsSub", align: "right" },
  { emoji: "📅", titleKey: "premium", descKey: "premiumSub", align: "left" },
  { emoji: "🗺️", titleKey: "joinCard", descKey: "joinCardSub", align: "right" },
];

/* ──────────────────────────────────────────
   TESTIMONIALS
   ────────────────────────────────────────── */
const TESTIMONIALS = [
  { textKey: "testimonial1", authorKey: "testimonial1Author", petKey: "testimonial1Pet", stars: 5, city: "Lausanne" },
  { textKey: "testimonial2", authorKey: "testimonial2Author", petKey: "testimonial2Pet", stars: 5, city: "Geneve" },
  { textKey: "testimonial3", authorKey: "testimonial3Author", petKey: "testimonial3Pet", stars: 5, city: "Zurich" },
];

/* ══════════════════════════════════════════
   LANDING CLIENT — Interactive shell
   Wraps all client-side interactivity:
   - animations, scroll reveal, counters
   - Supabase data fetching
   - spotlight mascot
   - PromoSection
   ══════════════════════════════════════════ */
export default function LandingClient() {
  const { t, lang } = useAppContext();
  const [totalAnimals, setTotalAnimals] = useState(0);
  const [totalProfiles, setTotalProfiles] = useState(0);

  // Hide the SSR fallback content once this client component mounts.
  // The CSS :has() rule handles modern browsers; this covers the rest.
  useEffect(() => {
    const ssrBlock = document.querySelector(".pawly-ssr-content");
    if (ssrBlock) ssrBlock.classList.add("pawly-ssr-hidden");
  }, []);
  const [spotlight, setSpotlight] = useState<{
    active: boolean; animal_name?: string; animal_photo?: string;
    animal_id?: string; owner_name?: string; plan?: string; expires_at?: string;
  } | null>(null);
  const [spotlightCountdown, setSpotlightCountdown] = useState("");
  const supabase = createClient();

  // Scroll reveal refs
  const statsReveal = useScrollReveal();
  const howReveal = useScrollReveal();
  const featuresReveal = useScrollReveal();
  const testimonialsReveal = useScrollReveal();
  const ctaReveal = useScrollReveal();

  // Animated counters
  const animalsCount = useAnimatedCounter(totalAnimals || 150, statsReveal.visible);
  const matchesCount = useAnimatedCounter(92, statsReveal.visible);
  const cantonsCount = useAnimatedCounter(26, statsReveal.visible);

  useEffect(() => {
    async function fetchData() {
      const { count: ac } = await supabase.from("animals").select("*", { count: "exact", head: true });
      setTotalAnimals(ac || 0);
      const { count: pc } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      setTotalProfiles(pc || 0);
      // Fetch active mascot spotlight
      try {
        const res = await fetch("/api/spotlight");
        const data = await res.json();
        setSpotlight(data);
      } catch { setSpotlight({ active: false }); }
    }
    fetchData();
  }, []);

  // Countdown timer for spotlight
  useEffect(() => {
    if (!spotlight?.active || !spotlight.expires_at) return;
    function tick() {
      const remaining = Math.max(0, Math.ceil((new Date(spotlight!.expires_at!).getTime() - Date.now()) / 1000));
      if (remaining <= 0) {
        setSpotlight({ active: false });
        setSpotlightCountdown("");
        return;
      }
      if (remaining >= 3600) {
        const h = Math.floor(remaining / 3600);
        const m = Math.floor((remaining % 3600) / 60);
        setSpotlightCountdown(`${h}h${m.toString().padStart(2, "0")}`);
      } else if (remaining >= 60) {
        const m = Math.floor(remaining / 60);
        const s = remaining % 60;
        setSpotlightCountdown(`${m}:${s.toString().padStart(2, "0")}`);
      } else {
        setSpotlightCountdown(`${remaining}s`);
      }
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [spotlight?.active, spotlight?.expires_at]);

  return (
    <div className="min-h-screen bg-[var(--c-deep)] text-[var(--c-text)] overflow-hidden relative">
      {/* Aurora background */}
      <div className="aurora-bg" />

      {/* Floating particles */}
      <FloatingParticles />

      {/* ═══════════════════════════════════════
          SECTION 1: HERO
          ═══════════════════════════════════════ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-4 md:px-6">
        {/* Floating paw emojis */}
        <FloatingPaws />

        {/* Main content */}
        <div className="relative z-10 max-w-2xl mx-auto animate-slide-up">
          {/* Mascot Spotlight — dynamic or Ruby default */}
          <div className="inline-block mb-6 animate-float">
            {spotlight?.active && spotlight.animal_photo ? (
              <>
                {/* Spotlight badge */}
                <div className="mb-2 animate-pulse">
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "4px 14px", borderRadius: 50,
                    background: "linear-gradient(135deg, rgba(245,158,11,0.2), rgba(168,85,247,0.15))",
                    border: "1px solid rgba(245,158,11,0.3)",
                    fontSize: 11, fontWeight: 800, color: "#F59E0B",
                  }}>
                    👑 {t.spotlightLive} {spotlightCountdown && <span style={{ fontFamily: "monospace" }}>({spotlightCountdown})</span>}
                  </span>
                </div>
                {/* Spotlight photo — purple/green glow */}
                <div className="relative w-32 h-32 sm:w-40 sm:h-40 mx-auto rounded-full overflow-hidden" style={{
                  boxShadow: "0 0 30px rgba(168,85,247,0.5), 0 0 60px rgba(245,158,11,0.2)",
                  border: "3px solid rgba(168,85,247,0.6)",
                }}>
                  <Image src={spotlight.animal_photo} alt={spotlight.animal_name || "Mascotte"} fill className="object-cover" priority unoptimized />
                </div>
                <p className="text-xs mt-2 font-medium" style={{ color: "var(--c-text-muted)" }}>
                  {spotlight.animal_name} 👑 {t.spotlightMascot}
                </p>
                {spotlight.owner_name && (
                  <p className="text-[10px]" style={{ color: "var(--c-text-muted)", opacity: 0.7 }}>
                    {t.spotlightBy} {spotlight.owner_name}
                  </p>
                )}
              </>
            ) : (
              <>
                {/* Default Ruby mascot */}
                <div className="relative w-32 h-32 sm:w-40 sm:h-40 mx-auto rounded-full overflow-hidden" style={{
                  boxShadow: "0 0 30px rgba(245,158,11,0.4), 0 0 60px rgba(245,158,11,0.15)",
                  border: "3px solid rgba(245,158,11,0.5)",
                }}>
                  <Image src="/ruby-hero.jpg" alt="Ruby — Mascotte Pawly" fill className="object-cover" priority />
                </div>
                <p className="text-xs mt-2 font-medium" style={{ color: "var(--c-text-muted)" }}>
                  Ruby 🐾 {t.spotlightDefault}
                </p>
              </>
            )}
          </div>

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black mb-3 leading-tight">
            <span className="gradient-text">{t.heroTitle}</span>
          </h1>

          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4" style={{ color: "var(--c-accent, #F59E0B)" }}>
            {t.heroTitle2}
          </h2>

          {/* Subtitle with fade */}
          <p className="text-base sm:text-lg max-w-lg mx-auto mb-4 leading-relaxed animate-breathe" style={{ color: "var(--c-text-muted)" }}>
            {t.heroSub}
          </p>

          {/* Tagline */}
          <p className="text-sm font-semibold mb-8 max-w-md mx-auto" style={{ color: "var(--c-text)" }}>
            {t.heroTagline}
          </p>

          {/* Trust badges */}
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            <div className="glass px-4 py-2 flex items-center gap-2 text-xs font-medium" style={{ borderRadius: 40 }}>
              <span>🇨🇭</span> {t.heroBadgeSwiss}
            </div>
            <div className="px-4 py-2 flex items-center gap-2 text-xs font-bold rounded-full" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", color: "#F59E0B" }}>
              {t.heroBadgeFree}
            </div>
            <div className="glass px-4 py-2 flex items-center gap-2 text-xs font-medium" style={{ borderRadius: 40 }}>
              <span>🔒</span> {t.heroBadgeData}
            </div>
          </div>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <Link href="/signup" className="btn-futuristic neon-green animate-pulse-glow text-base tracking-wide">
              {t.heroStartFree}
            </Link>
            <button
              onClick={() => document.getElementById("comment-ca-marche")?.scrollIntoView({ behavior: "smooth" })}
              className="glass px-6 py-3 font-semibold text-sm cursor-pointer hover:scale-105 transition-transform"
              style={{ borderRadius: 40 }}
            >
              {t.heroDiscover} ↓
            </button>
          </div>

          {/* Social proof line */}
          <p className="text-xs" style={{ color: "var(--c-text-muted)" }}>
            {t.heroJoinOwners}{" "}
            <span className="font-bold" style={{ color: "var(--c-accent, #F59E0B)" }}>
              {totalProfiles > 0 ? totalProfiles + "+" : ""}
            </span>{" "}
            {t.heroOwnersIn}
          </p>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce-down">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, color: "var(--c-text-muted)" }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          PROMO VIDEO — For new visitors
          ═══════════════════════════════════════ */}
      <section className="relative z-10 max-w-lg mx-auto px-4 mb-12">
        <PromoSection />
      </section>

      {/* ═══════════════════════════════════════
          SECTION 2: STATS BAR
          ═══════════════════════════════════════ */}
      <section
        ref={statsReveal.ref}
        className={`relative z-10 max-w-4xl mx-auto px-6 -mt-8 mb-20 transition-all duration-700 ${statsReveal.visible ? "section-visible" : "section-hidden"}`}
      >
        <div className="glass-strong gradient-border p-6 sm:p-8">
          <div className="flex justify-around items-center gap-4">
            {[
              { value: animalsCount, suffix: "+", label: t.animals },
              { value: matchesCount, suffix: "%", label: t.matchRate },
              { value: cantonsCount, suffix: "", label: t.heroCoveredCantons },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <p className="text-3xl sm:text-4xl font-black gradient-text">
                  {stat.value}{stat.suffix}
                </p>
                <p className="text-[10px] sm:text-xs uppercase tracking-widest mt-1" style={{ color: "var(--c-text-muted)" }}>
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          SECTION 3: HOW IT WORKS
          ═══════════════════════════════════════ */}
      <section
        id="comment-ca-marche"
        ref={howReveal.ref}
        className={`relative z-10 max-w-5xl mx-auto px-6 mb-24 scroll-mt-20 transition-all duration-700 ${howReveal.visible ? "section-visible" : "section-hidden"}`}
      >
        <h2 className="text-center text-xs font-bold uppercase tracking-[0.2em] mb-2" style={{ color: "var(--c-text-muted)" }}>
          {t.howItWorks}
        </h2>
        <div className="h-1 w-16 mx-auto rounded-full mb-12" style={{ background: "linear-gradient(90deg, #F59E0B, #A78BFA, #38BDF8)" }} />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative stagger-children">
          {/* Gradient connector lines (desktop) */}
          <div className="hidden md:block absolute top-1/2 left-[33%] right-[33%] h-[2px] gradient-line" style={{ width: "34%", left: "16.5%", background: "linear-gradient(90deg, #F59E0B, #A78BFA)" }} />
          <div className="hidden md:block absolute top-1/2 right-[16.5%] h-[2px]" style={{ width: "34%", background: "linear-gradient(90deg, #A78BFA, #38BDF8)" }} />

          {HOW_STEPS.map((step, i) => (
            <div key={i} className="glass card-futuristic p-6 sm:p-8 text-center relative">
              {/* Step number */}
              <div className="inline-block mb-4">
                <span className="text-xs font-black gradient-text tracking-widest">{step.num}</span>
              </div>

              {/* Floating emoji */}
              <div className="text-4xl mb-4 animate-float" style={{ animationDelay: `${i * 0.3}s` }}>
                {step.emoji}
              </div>

              {/* Title & description */}
              <h3 className="font-bold text-lg mb-2" style={{ color: "var(--c-text)" }}>{t[step.titleKey]}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--c-text-muted)" }}>{t[step.descKey]}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link href="/signup" className="btn-futuristic neon-green">
            {t.heroStartFree}
          </Link>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          SECTION 4: FEATURES SHOWCASE
          ═══════════════════════════════════════ */}
      <section
        ref={featuresReveal.ref}
        className={`relative z-10 max-w-5xl mx-auto px-6 mb-24 transition-all duration-700 ${featuresReveal.visible ? "section-visible" : "section-hidden"}`}
      >
        <div className="space-y-8">
          {FEATURES.map((feat, i) => {
            const isRight = feat.align === "right";
            return (
              <div
                key={i}
                className={`flex flex-col ${isRight ? "md:flex-row-reverse" : "md:flex-row"} items-center gap-6`}
              >
                {/* Icon card */}
                <div className="glass gradient-border p-8 flex items-center justify-center flex-shrink-0" style={{ width: 120, height: 120 }}>
                  <span className="text-5xl animate-float" style={{ animationDelay: `${i * 0.5}s` }}>
                    {feat.emoji}
                  </span>
                </div>

                {/* Text */}
                <div className={`glass card-futuristic p-6 flex-1 ${isRight ? "md:text-right" : ""}`}>
                  <h3 className="font-bold text-xl mb-2" style={{ color: "var(--c-accent, #F59E0B)" }}>
                    {t[feat.titleKey]}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--c-text-muted)" }}>
                    {t[feat.descKey]}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══════════════════════════════════════
          SECTION 5: TESTIMONIALS
          ═══════════════════════════════════════ */}
      <section
        ref={testimonialsReveal.ref}
        className={`relative z-10 max-w-5xl mx-auto px-6 mb-24 transition-all duration-700 ${testimonialsReveal.visible ? "section-visible" : "section-hidden"}`}
      >
        <h2 className="text-center text-xs font-bold uppercase tracking-[0.2em] mb-2" style={{ color: "var(--c-text-muted)" }}>
          {t.testimonialTitle}
        </h2>
        <div className="h-1 w-16 mx-auto rounded-full mb-12" style={{ background: "linear-gradient(90deg, #F59E0B, #A78BFA, #38BDF8)" }} />

        {/* Horizontal scroll on mobile, grid on desktop */}
        <div className="flex md:grid md:grid-cols-3 gap-6 overflow-x-auto scroll-snap-x pb-4 md:pb-0 stagger-children">
          {TESTIMONIALS.map((testi, i) => (
            <div
              key={i}
              className="glass card-futuristic p-6 min-w-[280px] md:min-w-0 flex-shrink-0"
            >
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {Array.from({ length: testi.stars }).map((_, s) => (
                  <span key={s} className="text-sm" style={{ color: "#F59E0B" }}>★</span>
                ))}
              </div>

              {/* Quote */}
              <p className="text-sm italic leading-relaxed mb-4" style={{ color: "var(--c-text)" }}>
                &ldquo;{t[testi.textKey]}&rdquo;
              </p>

              {/* Author */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold" style={{ color: "var(--c-accent, #F59E0B)" }}>
                    {t[testi.authorKey]}
                  </p>
                  <p className="text-[10px]" style={{ color: "var(--c-text-muted)" }}>
                    {t[testi.petKey]}
                  </p>
                </div>
                <span className="text-2xl opacity-30">🐾</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════
          SECTION 5b: WHY PAWLY (compact)
          ═══════════════════════════════════════ */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 mb-24">
        <h2 className="text-center text-xs font-bold uppercase tracking-[0.2em] mb-2" style={{ color: "var(--c-text-muted)" }}>
          {t.whyTitle}
        </h2>
        <div className="h-1 w-16 mx-auto rounded-full mb-8" style={{ background: "linear-gradient(90deg, #F59E0B, #A78BFA, #38BDF8)" }} />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Google */}
          <div className="glass p-5 text-center">
            <span className="text-2xl block mb-2">🔍</span>
            <h3 className="font-bold text-sm mb-1" style={{ color: "var(--c-text)" }}>Google</h3>
            <p className="text-xs leading-relaxed" style={{ color: "var(--c-text-muted)" }}>{t.whyGoogle}</p>
          </div>
          {/* ChatGPT */}
          <div className="glass p-5 text-center">
            <span className="text-2xl block mb-2">🤖</span>
            <h3 className="font-bold text-sm mb-1" style={{ color: "var(--c-text)" }}>ChatGPT</h3>
            <p className="text-xs leading-relaxed" style={{ color: "var(--c-text-muted)" }}>{t.whyChatGPT}</p>
          </div>
          {/* Pawly */}
          <div className="glass gradient-border p-5 text-center">
            <span className="text-2xl block mb-2">🐾</span>
            <h3 className="font-bold text-sm mb-1" style={{ color: "var(--c-accent, #F59E0B)" }}>Pawly</h3>
            <p className="text-xs leading-relaxed font-medium" style={{ color: "var(--c-text)" }}>{t.whySwiss}</p>
          </div>
        </div>

        <div className="text-center">
          <Link href="/pricing" className="glass px-6 py-2.5 font-semibold text-xs hover:scale-105 transition-transform inline-block" style={{ borderRadius: 40, color: "var(--c-accent, #F59E0B)" }}>
            {t.whyTitle} →
          </Link>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          SECTION 6: FINAL CTA
          ═══════════════════════════════════════ */}
      <section
        ref={ctaReveal.ref}
        className={`relative z-10 max-w-3xl mx-auto px-6 mb-20 transition-all duration-700 ${ctaReveal.visible ? "section-visible" : "section-hidden"}`}
      >
        <div className="glass-strong gradient-border p-10 sm:p-14 text-center relative overflow-hidden">
          {/* CTA particles (CSS only) */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[
              { bg: "rgba(245,158,11,0.15)", w: 8, top: "15%", left: "10%", dur: "8s" },
              { bg: "rgba(167,139,250,0.12)", w: 6, top: "60%", left: "85%", dur: "10s" },
              { bg: "rgba(56,189,248,0.12)", w: 10, top: "80%", left: "20%", dur: "12s" },
              { bg: "rgba(245,158,11,0.1)", w: 5, top: "30%", left: "75%", dur: "9s" },
              { bg: "rgba(167,139,250,0.15)", w: 7, top: "45%", left: "50%", dur: "11s" },
            ].map((dot, i) => (
              <div
                key={i}
                className="absolute rounded-full animate-float"
                style={{
                  background: dot.bg,
                  width: dot.w,
                  height: dot.w,
                  top: dot.top,
                  left: dot.left,
                  animationDuration: dot.dur,
                  animationDelay: `${i * 0.7}s`,
                }}
              />
            ))}
          </div>

          <span className="text-5xl block mb-4">🐾</span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black mb-3 gradient-text">
            {t.ctaTitle}
          </h2>
          <p className="text-sm sm:text-base mb-8 max-w-md mx-auto leading-relaxed" style={{ color: "var(--c-text-muted)" }}>
            {t.ctaDesc}
          </p>

          <Link href="/signup" className="btn-futuristic neon-green animate-pulse-glow text-base inline-block">
            {t.ctaButton}
          </Link>

          <p className="text-[10px] mt-4" style={{ color: "var(--c-text-muted)" }}>
            {t.ctaFree}
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          SECTION 7: PAWDIRECTORY LINK
          ═══════════════════════════════════════ */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 mb-16">
        <a href="https://pawdirectory.ch" target="_blank" rel="noopener" className="block">
          <div className="glass card-futuristic p-5 flex items-center gap-4 hover:scale-[1.02] transition-transform">
            <div className="text-3xl flex-shrink-0">🏥</div>
            <div className="flex-1">
              <div className="font-extrabold text-sm" style={{ color: "var(--c-text)" }}>PawDirectory</div>
              <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--c-text-muted)" }}>
                {{ fr: "306+ services pour animaux en Suisse", de: "306+ Tierdienste in der Schweiz", it: "306+ servizi per animali in Svizzera", en: "306+ pet services across Switzerland" }[lang]}
              </p>
            </div>
            <span className="text-lg" style={{ color: "#0D9488" }}>→</span>
          </div>
        </a>
      </section>

      {/* ═══════════════════════════════════════
          FOOTER
          ═══════════════════════════════════════ */}
      <footer className="relative z-10 border-t py-6 text-center" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="flex gap-6 justify-center mb-3">
          <a href="/legal/cgu" className="text-[11px] hover:underline" style={{ color: "var(--c-text-muted)" }}>{t.footerCGU}</a>
          <a href="/legal/privacy" className="text-[11px] hover:underline" style={{ color: "var(--c-text-muted)" }}>{t.footerPrivacy}</a>
          <a href="https://pawdirectory.ch" target="_blank" rel="noopener" className="text-[11px] hover:underline" style={{ color: "var(--c-text-muted)" }}>PawDirectory</a>
        </div>
        <p className="text-[10px]" style={{ color: "var(--c-text-muted)", opacity: 0.6 }}>
          © {new Date().getFullYear()} Pawly · Canton de Vaud, Suisse
        </p>
      </footer>
    </div>
  );
}
