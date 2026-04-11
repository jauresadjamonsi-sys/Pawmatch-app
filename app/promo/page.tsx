"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import PromoSection from "@/lib/components/PromoSection";

/* ══════════════════════════════════════════════════════════════
   PAWLY — PROMO VIDEO GENERATOR
   Animated shareable promo cards for WhatsApp / Instagram / TikTok
   ══════════════════════════════════════════════════════════════ */

const SITE = "pawlyapp.ch";
const SITE_URL = "https://pawlyapp.ch";

/* ── Types ─────────────────────────────────────── */
interface Animal {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  photo_url: string | null;
  photos: string[] | null;
  canton: string | null;
  traits: string[];
}

interface PromoTemplate {
  id: string;
  title: string;
  whatsappText: string;
  gradient: string;
  emoji: string;
}

/* ── Template definitions ─────────────────────── */
const TEMPLATES: PromoTemplate[] = [
  {
    id: "match",
    title: "Le Match Parfait",
    whatsappText:
      "Et si ton chien trouvait son meilleur ami ? Pawly connecte les animaux et leurs proprios en Suisse. Inscris-toi gratuitement !",
    gradient: "linear-gradient(135deg, #22C55E 0%, #FACC15 50%, #F43F5E 100%)",
    emoji: "💕",
  },
  {
    id: "community",
    title: "Communaute Suisse",
    whatsappText:
      "La plus grande communaute d'animaux de compagnie en Suisse est sur Pawly ! Rejoins-nous, c'est gratuit.",
    gradient: "linear-gradient(135deg, #DC2626 0%, #FBBF24 50%, #DC2626 100%)",
    emoji: "🇨🇭",
  },
  {
    id: "balade",
    title: "Fini les balades seul",
    whatsappText:
      "Fini les balades seul avec ton chien ! Sur Pawly, trouve des compagnons de promenade pres de chez toi. Gratuit !",
    gradient: "linear-gradient(135deg, #059669 0%, #38BDF8 50%, #06B6D4 100%)",
    emoji: "🌿",
  },
  {
    id: "tinder",
    title: "Le Tinder des Animaux",
    whatsappText:
      "Le Tinder des animaux existe et c'est suisse ! Ton compagnon merite de trouver son match. Essaie Pawly maintenant !",
    gradient: "linear-gradient(135deg, #F43F5E 0%, #4ADE80 50%, #FBBF24 100%)",
    emoji: "🔥",
  },
  {
    id: "gratuit",
    title: "100% Gratuit",
    whatsappText:
      "Pawly, l'app gratuite qui connecte les proprietaires d'animaux en Suisse. Inscris-toi en 30 secondes !",
    gradient: "linear-gradient(135deg, #8B5CF6 0%, #EC4899 50%, #22C55E 100%)",
    emoji: "🎉",
  },
];

/* ── Species emoji helper ─────────────────────── */
function speciesEmoji(species: string) {
  const map: Record<string, string> = {
    chien: "🐶", chat: "🐱", lapin: "🐰", oiseau: "🐦",
    rongeur: "🐹", reptile: "🦎", poisson: "🐟", autre: "🐾",
  };
  return map[species?.toLowerCase()] || "🐾";
}

/* ══════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ══════════════════════════════════════════════════ */
export default function PromoPage() {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [stats, setStats] = useState({ animals: 0, profiles: 0 });
  const [fullscreen, setFullscreen] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [shared, setShared] = useState<string | null>(null);
  const supabase = createClient();

  // Fetch featured animals + stats
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("animals")
        .select("id, name, species, breed, photo_url, photos, canton, traits")
        .not("photo_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(20);
      if (data) setAnimals(data);

      const { count: ac } = await supabase
        .from("animals")
        .select("*", { count: "exact", head: true });
      const { count: pc } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });
      setStats({ animals: ac || 0, profiles: pc || 0 });
    }
    load();
  }, []);

  // Share to WhatsApp
  const shareWhatsApp = useCallback((text: string, templateId: string) => {
    const msg = `${text}\n\n👉 ${SITE_URL}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
    setShared(templateId);
    setTimeout(() => setShared(null), 2000);
  }, []);

  // Copy link
  const copyLink = useCallback((templateId: string) => {
    navigator.clipboard.writeText(SITE_URL);
    setCopied(templateId);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  // Fullscreen template
  if (fullscreen) {
    const tpl = TEMPLATES.find((t) => t.id === fullscreen)!;
    return (
      <FullscreenPromo
        template={tpl}
        animals={animals}
        stats={stats}
        onClose={() => setFullscreen(null)}
        onShare={() => shareWhatsApp(tpl.whatsappText, tpl.id)}
      />
    );
  }

  return (
    <div
      className="min-h-screen pb-32"
      style={{ background: "var(--c-deep)", color: "var(--c-text)" }}
    >
      {/* Back button */}
      <div className="px-4 pt-6 max-w-lg mx-auto">
        <button onClick={() => window.history.length > 1 ? window.history.back() : (window.location.href = "/feed")} aria-label="Retour" className="inline-flex items-center justify-center w-9 h-9 rounded-full transition-all active:scale-90 flex-shrink-0 mb-4" style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--c-text)" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
      </div>
      {/* Video Promo Slideshow */}
      <div className="px-4 pt-2 pb-2 max-w-lg mx-auto">
        <PromoSection />
      </div>

      {/* Header */}
      <div className="px-4 pt-4 pb-4 text-center">
        <h1 className="text-3xl md:text-4xl font-black mb-2">
          <span
            style={{
              background: "linear-gradient(135deg, #22C55E, #FACC15)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Promos Pawly
          </span>{" "}
          🎬
        </h1>
        <p
          className="text-sm md:text-base max-w-md mx-auto"
          style={{ color: "var(--c-text-muted)" }}
        >
          Appuie sur une promo, partage-la sur WhatsApp ou filme ton ecran pour
          Instagram / TikTok !
        </p>
      </div>

      {/* Instructions banner */}
      <div
        className="mx-4 mb-6 rounded-2xl p-4 flex items-start gap-3"
        style={{
          background: "var(--c-card)",
          border: "1px solid var(--c-border)",
        }}
      >
        <span className="text-2xl">📱</span>
        <div className="text-sm" style={{ color: "var(--c-text-muted)" }}>
          <strong style={{ color: "var(--c-text)" }}>Comment partager :</strong>
          <br />
          1. Appuie sur une promo pour la voir en plein ecran
          <br />
          2. Lance l&apos;enregistrement d&apos;ecran de ton telephone
          <br />
          3. Partage la video sur Instagram Reels / TikTok / WhatsApp Status
          <br />
          Ou utilise le bouton WhatsApp pour un partage rapide avec le lien !
        </div>
      </div>

      {/* Template grid */}
      <div className="px-4 grid grid-cols-2 md:grid-cols-3 gap-4">
        {TEMPLATES.map((tpl) => (
          <div key={tpl.id} className="flex flex-col gap-2">
            {/* Card preview */}
            <button
              onClick={() => setFullscreen(tpl.id)}
              className="relative rounded-2xl overflow-hidden shadow-lg transition-transform active:scale-95"
              style={{
                aspectRatio: "9/16",
                background: tpl.gradient,
              }}
            >
              {/* Mini preview content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-white text-center">
                <span className="text-3xl mb-2">{tpl.emoji}</span>
                <span className="text-xs font-bold uppercase tracking-wider opacity-80">
                  Pawly
                </span>
                <span className="text-sm font-black mt-1 leading-tight">
                  {tpl.title}
                </span>
                {/* Pet photos mini grid */}
                {animals.length > 0 && (
                  <div className="flex -space-x-2 mt-3">
                    {animals.slice(0, 4).map((a) => (
                      <div
                        key={a.id}
                        className="w-8 h-8 rounded-full border-2 border-white overflow-hidden"
                        style={{ background: "#fff2" }}
                      >
                        {a.photo_url && (
                          <img
                            src={a.photo_url}
                            alt={a.name}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {/* Play icon */}
                <div
                  className="mt-4 w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.3)" }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="white"
                  >
                    <polygon points="4,2 14,8 4,14" />
                  </svg>
                </div>
              </div>
            </button>

            {/* Action buttons */}
            <div className="flex gap-1.5">
              <button
                onClick={() => shareWhatsApp(tpl.whatsappText, tpl.id)}
                className="flex-1 py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1 active:scale-95 transition-transform"
                style={{ background: "#25D366" }}
              >
                {shared === tpl.id ? "✓" : "💬"}{" "}
                {shared === tpl.id ? "Envoye !" : "WhatsApp"}
              </button>
              <button
                onClick={() => copyLink(tpl.id)}
                className="py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center active:scale-95 transition-transform"
                style={{
                  background: "var(--c-card)",
                  border: "1px solid var(--c-border)",
                  color: "var(--c-text)",
                }}
              >
                {copied === tpl.id ? "✓" : "🔗"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Stats banner */}
      {stats.animals > 0 && (
        <div
          className="mx-4 mt-8 rounded-2xl p-6 text-center"
          style={{
            background:
              "linear-gradient(135deg, rgba(34, 197, 94,0.15), rgba(250,204,21,0.15))",
            border: "1px solid var(--c-border)",
          }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--c-text-muted)" }}>
            Actuellement sur Pawly
          </p>
          <div className="flex justify-center gap-8 mt-3">
            <div>
              <p className="text-2xl font-black" style={{ color: "#22C55E" }}>
                {stats.animals}+
              </p>
              <p className="text-xs" style={{ color: "var(--c-text-muted)" }}>
                animaux
              </p>
            </div>
            <div>
              <p className="text-2xl font-black" style={{ color: "#A78BFA" }}>
                {stats.profiles}+
              </p>
              <p className="text-xs" style={{ color: "var(--c-text-muted)" }}>
                membres
              </p>
            </div>
            <div>
              <p className="text-2xl font-black" style={{ color: "#38BDF8" }}>
                26
              </p>
              <p className="text-xs" style={{ color: "var(--c-text-muted)" }}>
                cantons
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   FULLSCREEN PROMO COMPONENT
   Each template is a full-screen animated "video" optimized
   for screen recording (9:16 aspect ratio, bold animations)
   ══════════════════════════════════════════════════════════════ */

function FullscreenPromo({
  template,
  animals,
  stats,
  onClose,
  onShare,
}: {
  template: PromoTemplate;
  animals: Animal[];
  stats: { animals: number; profiles: number };
  onClose: () => void;
  onShare: () => void;
}) {
  switch (template.id) {
    case "match":
      return (
        <MatchTemplate
          animals={animals}
          stats={stats}
          onClose={onClose}
          onShare={onShare}
        />
      );
    case "community":
      return (
        <CommunityTemplate
          animals={animals}
          stats={stats}
          onClose={onClose}
          onShare={onShare}
        />
      );
    case "balade":
      return (
        <BaladeTemplate
          animals={animals}
          stats={stats}
          onClose={onClose}
          onShare={onShare}
        />
      );
    case "tinder":
      return (
        <TinderTemplate
          animals={animals}
          stats={stats}
          onClose={onClose}
          onShare={onShare}
        />
      );
    case "gratuit":
      return (
        <GratuitTemplate
          animals={animals}
          stats={stats}
          onClose={onClose}
          onShare={onShare}
        />
      );
    default:
      return null;
  }
}

/* ── Shared overlay controls ──────────────────── */
function PromoOverlay({
  onClose,
  onShare,
}: {
  onClose: () => void;
  onShare: () => void;
}) {
  return (
    <div className="absolute top-0 left-0 right-0 z-50 flex justify-between items-start p-4 safe-top">
      <button
        onClick={onClose}
        className="w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md"
        style={{ background: "rgba(0,0,0,0.4)" }}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="white">
          <path d="M15 5L5 15M5 5l10 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </button>
      <button
        onClick={onShare}
        className="px-4 py-2 rounded-full flex items-center gap-2 backdrop-blur-md text-white text-sm font-bold"
        style={{ background: "rgba(37,211,102,0.9)" }}
      >
        💬 Partager
      </button>
    </div>
  );
}

/* ── Animated CSS keyframes (injected once) ───── */
function PromoStyles() {
  return (
    <style>{`
      @keyframes promo-fade-up {
        from { opacity: 0; transform: translateY(40px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes promo-scale-in {
        from { opacity: 0; transform: scale(0.5); }
        to { opacity: 1; transform: scale(1); }
      }
      @keyframes promo-slide-left {
        from { opacity: 0; transform: translateX(60px); }
        to { opacity: 1; transform: translateX(0); }
      }
      @keyframes promo-slide-right {
        from { opacity: 0; transform: translateX(-60px); }
        to { opacity: 1; transform: translateX(0); }
      }
      @keyframes promo-zoom-slow {
        0% { transform: scale(1); }
        50% { transform: scale(1.08); }
        100% { transform: scale(1); }
      }
      @keyframes promo-pulse-glow {
        0%, 100% { box-shadow: 0 0 20px rgba(34, 197, 94,0.4); }
        50% { box-shadow: 0 0 50px rgba(34, 197, 94,0.8), 0 0 80px rgba(250,204,21,0.3); }
      }
      @keyframes promo-float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-12px); }
      }
      @keyframes promo-shimmer {
        0% { background-position: -200% center; }
        100% { background-position: 200% center; }
      }
      @keyframes promo-gradient-shift {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      @keyframes promo-counter {
        from { opacity: 0; transform: scale(0.3) rotate(-10deg); }
        to { opacity: 1; transform: scale(1) rotate(0); }
      }
      @keyframes promo-heart-beat {
        0%, 100% { transform: scale(1); }
        15% { transform: scale(1.3); }
        30% { transform: scale(1); }
        45% { transform: scale(1.15); }
      }
      @keyframes promo-swipe-hint {
        0% { transform: translateX(0) rotate(0); opacity: 1; }
        50% { transform: translateX(30px) rotate(5deg); opacity: 0.7; }
        100% { transform: translateX(0) rotate(0); opacity: 1; }
      }
      @keyframes promo-confetti {
        0% { transform: translateY(0) rotate(0); opacity: 1; }
        100% { transform: translateY(400px) rotate(720deg); opacity: 0; }
      }
      @keyframes promo-bounce-in {
        0% { transform: scale(0); opacity: 0; }
        50% { transform: scale(1.15); }
        100% { transform: scale(1); opacity: 1; }
      }
      @keyframes promo-paw-trail {
        0% { opacity: 0; transform: translateY(20px) scale(0.5); }
        20% { opacity: 1; transform: translateY(0) scale(1); }
        80% { opacity: 1; transform: translateY(0) scale(1); }
        100% { opacity: 0; transform: translateY(-20px) scale(0.5); }
      }
      @keyframes promo-ring-spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes promo-text-reveal {
        from { clip-path: inset(0 100% 0 0); }
        to { clip-path: inset(0 0% 0 0); }
      }
      .promo-fade-up { animation: promo-fade-up 0.8s ease-out forwards; opacity: 0; }
      .promo-scale-in { animation: promo-scale-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; opacity: 0; }
      .promo-slide-left { animation: promo-slide-left 0.7s ease-out forwards; opacity: 0; }
      .promo-zoom { animation: promo-zoom-slow 8s ease-in-out infinite; }
      .promo-glow { animation: promo-pulse-glow 2s ease-in-out infinite; }
      .promo-float { animation: promo-float 3s ease-in-out infinite; }
      .promo-heart { animation: promo-heart-beat 1.5s ease-in-out infinite; }
      .promo-swipe { animation: promo-swipe-hint 2s ease-in-out infinite; }
      .promo-bounce { animation: promo-bounce-in 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; opacity: 0; }
    `}</style>
  );
}

/* ══════════════════════════════════════════════════
   TEMPLATE 1: "LE MATCH PARFAIT"
   Hero photo + "Et si ton chien trouvait son meilleur ami ?"
   ══════════════════════════════════════════════════ */
function MatchTemplate({
  animals,
  stats,
  onClose,
  onShare,
}: {
  animals: Animal[];
  stats: { animals: number; profiles: number };
  onClose: () => void;
  onShare: () => void;
}) {
  const hero = animals[0];
  const friend = animals[1];

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #1a0a2e 0%, #2d1b4e 40%, #1a0a2e 100%)",
      }}
    >
      <PromoStyles />
      <PromoOverlay onClose={onClose} onShare={onShare} />

      {/* Animated bg particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 15 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: 4 + Math.random() * 8,
              height: 4 + Math.random() * 8,
              background: `rgba(${Math.random() > 0.5 ? "249,115,22" : "167,139,250"}, ${0.15 + Math.random() * 0.2})`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `promo-float ${3 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-sm">
        {/* Pawly badge */}
        <div
          className="promo-fade-up mb-6 px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase text-white"
          style={{
            background: "linear-gradient(135deg, #22C55E, #FACC15)",
            animationDelay: "0.2s",
          }}
        >
          🐾 Pawly
        </div>

        {/* Question text */}
        <h1
          className="promo-fade-up text-3xl md:text-4xl font-black text-white leading-tight mb-8"
          style={{ animationDelay: "0.5s" }}
        >
          Et si ton chien trouvait son{" "}
          <span
            style={{
              background: "linear-gradient(90deg, #22C55E, #4ADE80)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            meilleur ami
          </span>{" "}
          ? 💕
        </h1>

        {/* Pet photo pair - match animation */}
        <div
          className="promo-scale-in flex items-center gap-3 mb-8"
          style={{ animationDelay: "1s" }}
        >
          {/* Left pet */}
          <div className="promo-glow rounded-full overflow-hidden w-28 h-28 border-4 border-green-400">
            {hero?.photo_url ? (
              <img
                src={hero.photo_url}
                alt={hero.name}
                className="w-full h-full object-cover promo-zoom"
              />
            ) : (
              <img
                src="/ruby-hero.jpg"
                alt="Ruby"
                className="w-full h-full object-cover promo-zoom"
              />
            )}
          </div>

          {/* Heart */}
          <span className="promo-heart text-4xl">💕</span>

          {/* Right pet */}
          <div className="promo-glow rounded-full overflow-hidden w-28 h-28 border-4 border-purple-400">
            {friend?.photo_url ? (
              <img
                src={friend.photo_url}
                alt={friend.name}
                className="w-full h-full object-cover promo-zoom"
              />
            ) : (
              <img
                src="/ruby-hero.jpg"
                alt="Ami"
                className="w-full h-full object-cover promo-zoom"
                style={{ filter: "hue-rotate(30deg)" }}
              />
            )}
          </div>
        </div>

        {/* Match result */}
        <div
          className="promo-bounce mb-6 px-6 py-3 rounded-2xl"
          style={{
            animationDelay: "1.8s",
            background: "rgba(34, 197, 94,0.15)",
            border: "1px solid rgba(34, 197, 94,0.3)",
          }}
        >
          <p className="text-white text-lg font-bold">
            {hero?.name || "Ruby"} & {friend?.name || "Max"}{" "}
            <span className="text-green-400">98% compatibles !</span>
          </p>
        </div>

        {/* Stats */}
        <div
          className="promo-fade-up flex gap-6 mb-8 text-white"
          style={{ animationDelay: "2.3s" }}
        >
          <div className="text-center">
            <p className="text-2xl font-black text-green-400">
              {stats.animals || 150}+
            </p>
            <p className="text-xs opacity-70">animaux</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black text-purple-400">26</p>
            <p className="text-xs opacity-70">cantons</p>
          </div>
        </div>

        {/* CTA */}
        <div
          className="promo-fade-up w-full"
          style={{ animationDelay: "2.8s" }}
        >
          <div
            className="py-4 px-6 rounded-2xl text-center"
            style={{
              background: "linear-gradient(135deg, #22C55E, #16A34A)",
              boxShadow: "0 8px 32px rgba(34, 197, 94,0.4)",
            }}
          >
            <p className="text-white font-black text-lg">
              Inscris-toi gratuitement
            </p>
            <p className="text-green-100 text-sm font-bold mt-1">
              👉 {SITE}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   TEMPLATE 2: "COMMUNAUTE SUISSE"
   Grid of pet photos + Swiss flag + counter
   ══════════════════════════════════════════════════ */
function CommunityTemplate({
  animals,
  stats,
  onClose,
  onShare,
}: {
  animals: Animal[];
  stats: { animals: number; profiles: number };
  onClose: () => void;
  onShare: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #1a0a2e 0%, #0f172a 100%)",
      }}
    >
      <PromoStyles />
      <PromoOverlay onClose={onClose} onShare={onShare} />

      {/* Swiss cross watermark */}
      <div
        className="absolute opacity-5"
        style={{ top: "10%", right: "8%", fontSize: "12rem" }}
      >
        🇨🇭
      </div>

      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-sm w-full">
        {/* Badge */}
        <div
          className="promo-fade-up px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase text-white mb-4"
          style={{
            background: "linear-gradient(135deg, #DC2626, #FBBF24)",
            animationDelay: "0.2s",
          }}
        >
          🇨🇭 Made in Switzerland
        </div>

        {/* Title */}
        <h1
          className="promo-fade-up text-2xl md:text-3xl font-black text-white leading-tight mb-6"
          style={{ animationDelay: "0.5s" }}
        >
          La plus grande{" "}
          <span className="text-red-400">communaute</span>
          <br />
          d&apos;animaux en Suisse
        </h1>

        {/* Pet photo mosaic */}
        <div
          className="w-full grid grid-cols-3 gap-2 mb-6"
          style={{ maxWidth: 280 }}
        >
          {(animals.length > 0 ? animals.slice(0, 9) : Array(9).fill(null)).map(
            (a, i) => (
              <div
                key={i}
                className="promo-scale-in aspect-square rounded-xl overflow-hidden"
                style={{
                  animationDelay: `${0.8 + i * 0.15}s`,
                  background: a?.photo_url
                    ? "transparent"
                    : `hsl(${i * 40}, 70%, 30%)`,
                  border: "2px solid rgba(255,255,255,0.1)",
                }}
              >
                {a?.photo_url ? (
                  <img
                    src={a.photo_url}
                    alt={a?.name || ""}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">
                    {["🐶", "🐱", "🐰", "🐦", "🐹", "🐶", "🐱", "🦎", "🐾"][i]}
                  </div>
                )}
              </div>
            )
          )}
        </div>

        {/* Counter */}
        <div
          className="promo-bounce flex items-center gap-2 mb-6"
          style={{ animationDelay: "2.5s" }}
        >
          <AnimatedNumber target={stats.animals || 150} delay={2600} />
          <span className="text-white text-lg font-bold">
            animaux inscrits 🎉
          </span>
        </div>

        {/* CTA */}
        <div
          className="promo-fade-up w-full"
          style={{ animationDelay: "3s" }}
        >
          <div
            className="py-4 px-6 rounded-2xl text-center"
            style={{
              background: "linear-gradient(135deg, #DC2626, #FBBF24)",
              boxShadow: "0 8px 32px rgba(220,38,38,0.3)",
            }}
          >
            <p className="text-white font-black text-lg">
              Rejoins la meute ! 🐾
            </p>
            <p className="text-red-100 text-sm font-bold mt-1">
              👉 {SITE}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   TEMPLATE 3: "FINI LES BALADES SEUL"
   Nature theme + walking together concept
   ══════════════════════════════════════════════════ */
function BaladeTemplate({
  animals,
  stats,
  onClose,
  onShare,
}: {
  animals: Animal[];
  stats: { animals: number; profiles: number };
  onClose: () => void;
  onShare: () => void;
}) {
  const hero = animals.find((a) => a.species === "chien") || animals[0];

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #064E3B 0%, #065F46 30%, #047857 100%)",
      }}
    >
      <PromoStyles />
      <PromoOverlay onClose={onClose} onShare={onShare} />

      {/* Nature emojis floating */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {["🌿", "🍃", "🌳", "🌸", "☀️", "🦋"].map((e, i) => (
          <span
            key={i}
            className="absolute text-2xl promo-float"
            style={{
              top: `${10 + Math.random() * 70}%`,
              left: `${5 + Math.random() * 85}%`,
              opacity: 0.2,
              animationDelay: `${i * 0.8}s`,
              animationDuration: `${4 + Math.random() * 3}s`,
            }}
          >
            {e}
          </span>
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center text-center flex-1 justify-center px-6">
        {/* "SEUL" text with strikethrough animation */}
        <p
          className="promo-fade-up text-white/60 text-lg font-medium mb-2"
          style={{ animationDelay: "0.3s" }}
        >
          Fini de promener seul...
        </p>

        {/* Big text */}
        <h1
          className="promo-fade-up text-3xl md:text-4xl font-black text-white leading-tight mb-8"
          style={{ animationDelay: "0.8s" }}
        >
          Trouve un{" "}
          <span className="text-emerald-300">compagnon</span>
          <br />
          de balade ! 🌿
        </h1>

        {/* Pet photo with walking path */}
        <div
          className="promo-scale-in relative mb-8"
          style={{ animationDelay: "1.3s" }}
        >
          {/* Main photo */}
          <div
            className="w-40 h-40 rounded-full overflow-hidden border-4 border-emerald-300 mx-auto"
            style={{
              boxShadow: "0 0 40px rgba(16,185,129,0.4)",
            }}
          >
            {hero?.photo_url ? (
              <img
                src={hero.photo_url}
                alt={hero.name}
                className="w-full h-full object-cover promo-zoom"
              />
            ) : (
              <img
                src="/ruby-hero.jpg"
                alt="Ruby"
                className="w-full h-full object-cover promo-zoom"
              />
            )}
          </div>

          {/* Paw trail */}
          <div className="flex gap-3 justify-center mt-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="text-lg"
                style={{
                  animation: `promo-paw-trail 2s ease-in-out infinite`,
                  animationDelay: `${1.5 + i * 0.3}s`,
                  opacity: 0,
                }}
              >
                🐾
              </span>
            ))}
          </div>
        </div>

        {/* Companion bubbles */}
        {animals.length > 1 && (
          <div
            className="promo-fade-up flex -space-x-3 mb-6"
            style={{ animationDelay: "2s" }}
          >
            {animals.slice(1, 6).map((a, i) => (
              <div
                key={a.id}
                className="w-12 h-12 rounded-full overflow-hidden border-3 border-emerald-800"
                style={{
                  animation: `promo-bounce-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards`,
                  animationDelay: `${2 + i * 0.2}s`,
                  opacity: 0,
                }}
              >
                {a.photo_url && (
                  <img
                    src={a.photo_url}
                    alt={a.name}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            ))}
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-xs font-bold text-emerald-100 border-3 border-emerald-800"
              style={{
                background: "rgba(16,185,129,0.3)",
                animation: `promo-bounce-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards`,
                animationDelay: `${2 + 5 * 0.2}s`,
                opacity: 0,
              }}
            >
              +{stats.animals || 99}
            </div>
          </div>
        )}

        {/* Text */}
        <p
          className="promo-fade-up text-emerald-200 text-base mb-8"
          style={{ animationDelay: "2.5s" }}
        >
          Des centaines de proprios t&apos;attendent
          <br />
          pres de chez toi !
        </p>

        {/* CTA */}
        <div
          className="promo-fade-up w-full max-w-xs"
          style={{ animationDelay: "3s" }}
        >
          <div
            className="py-4 px-6 rounded-2xl text-center"
            style={{
              background: "linear-gradient(135deg, #10B981, #059669)",
              boxShadow: "0 8px 32px rgba(16,185,129,0.4)",
            }}
          >
            <p className="text-white font-black text-lg">
              C&apos;est gratuit !
            </p>
            <p className="text-emerald-100 text-sm font-bold mt-1">
              👉 {SITE}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   TEMPLATE 4: "LE TINDER DES ANIMAUX"
   Card stack swipe animation
   ══════════════════════════════════════════════════ */
function TinderTemplate({
  animals,
  stats,
  onClose,
  onShare,
}: {
  animals: Animal[];
  stats: { animals: number; profiles: number };
  onClose: () => void;
  onShare: () => void;
}) {
  const cardAnimals = animals.slice(0, 5);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #1a0a2e 0%, #2d1b4e 50%, #4a1942 100%)",
      }}
    >
      <PromoStyles />
      <PromoOverlay onClose={onClose} onShare={onShare} />

      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-sm w-full">
        {/* Badge */}
        <div
          className="promo-fade-up mb-4 text-5xl"
          style={{ animationDelay: "0.2s" }}
        >
          🔥
        </div>

        {/* Title */}
        <h1
          className="promo-fade-up text-3xl md:text-4xl font-black text-white leading-tight mb-8"
          style={{ animationDelay: "0.5s" }}
        >
          Le{" "}
          <span
            style={{
              background: "linear-gradient(90deg, #F43F5E, #4ADE80)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Tinder
          </span>{" "}
          des
          <br />
          animaux existe !
        </h1>

        {/* Card stack */}
        <div
          className="relative mb-8"
          style={{ width: 220, height: 280 }}
        >
          {(cardAnimals.length > 0
            ? cardAnimals
            : [null, null, null]
          ).map((a, i, arr) => {
            const total = arr.length;
            const offset = (total - 1 - i) * 8;
            const scale = 1 - (total - 1 - i) * 0.05;
            const rotation = (total - 1 - i) * 3 - 3;

            return (
              <div
                key={a?.id || i}
                className="absolute inset-0 rounded-2xl overflow-hidden shadow-2xl"
                style={{
                  transform: `translateY(${offset}px) scale(${scale}) rotate(${rotation}deg)`,
                  zIndex: i,
                  animation:
                    i === total - 1
                      ? `promo-swipe-hint 3s ease-in-out infinite`
                      : undefined,
                  animationDelay:
                    i === total - 1 ? "1.5s" : undefined,
                  border: "3px solid rgba(255,255,255,0.1)",
                  opacity: 0,
                  animationFillMode: "none",
                }}
              >
                <div
                  className="promo-scale-in w-full h-full"
                  style={{ animationDelay: `${0.8 + i * 0.2}s` }}
                >
                  {a?.photo_url ? (
                    <img
                      src={a.photo_url}
                      alt={a.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center text-6xl"
                      style={{
                        background: `linear-gradient(135deg, hsl(${i * 60}, 80%, 25%), hsl(${i * 60 + 30}, 80%, 35%))`,
                      }}
                    >
                      {["🐶", "🐱", "🐰"][i] || "🐾"}
                    </div>
                  )}
                  {/* Name overlay */}
                  {a?.name && (
                    <div
                      className="absolute bottom-0 left-0 right-0 p-3"
                      style={{
                        background:
                          "linear-gradient(transparent, rgba(0,0,0,0.8))",
                      }}
                    >
                      <p className="text-white font-bold text-base">
                        {a.name}{" "}
                        <span className="text-xs opacity-70">
                          {speciesEmoji(a.species)}
                        </span>
                      </p>
                      {a.canton && (
                        <p className="text-white/60 text-xs">
                          📍 {a.canton}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Like badge floating */}
          <div
            className="absolute -top-4 -right-4 promo-bounce"
            style={{ animationDelay: "2s", zIndex: 20 }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl"
              style={{
                background: "linear-gradient(135deg, #10B981, #059669)",
                boxShadow: "0 4px 16px rgba(16,185,129,0.5)",
              }}
            >
              ✓
            </div>
          </div>
        </div>

        {/* Swipe text */}
        <p
          className="promo-fade-up text-white/60 text-sm mb-6"
          style={{ animationDelay: "2.5s" }}
        >
          Swipe, match, balade 🐾
        </p>

        {/* CTA */}
        <div
          className="promo-fade-up w-full"
          style={{ animationDelay: "3s" }}
        >
          <div
            className="py-4 px-6 rounded-2xl text-center"
            style={{
              background: "linear-gradient(135deg, #F43F5E, #4ADE80)",
              boxShadow: "0 8px 32px rgba(244,63,94,0.4)",
            }}
          >
            <p className="text-white font-black text-lg">
              Essaie maintenant ! 🔥
            </p>
            <p className="text-red-100 text-sm font-bold mt-1">
              👉 {SITE}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   TEMPLATE 5: "100% GRATUIT"
   Celebration + confetti + free signup emphasis
   ══════════════════════════════════════════════════ */
function GratuitTemplate({
  animals,
  stats,
  onClose,
  onShare,
}: {
  animals: Animal[];
  stats: { animals: number; profiles: number };
  onClose: () => void;
  onShare: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)",
      }}
    >
      <PromoStyles />
      <PromoOverlay onClose={onClose} onShare={onShare} />

      {/* Confetti particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              width: 8 + Math.random() * 12,
              height: 8 + Math.random() * 12,
              background: [
                "#22C55E",
                "#FACC15",
                "#F43F5E",
                "#FBBF24",
                "#38BDF8",
                "#10B981",
              ][i % 6],
              borderRadius: Math.random() > 0.5 ? "50%" : "2px",
              left: `${5 + Math.random() * 90}%`,
              top: "-20px",
              animation: `promo-confetti ${3 + Math.random() * 3}s linear infinite`,
              animationDelay: `${Math.random() * 4}s`,
              opacity: 0.6,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-sm w-full">
        {/* Celebration emoji */}
        <div
          className="promo-bounce text-6xl mb-4"
          style={{ animationDelay: "0.2s" }}
        >
          🎉
        </div>

        {/* Big announcement */}
        <h1
          className="promo-fade-up text-3xl md:text-4xl font-black text-white leading-tight mb-2"
          style={{ animationDelay: "0.5s" }}
        >
          <span
            style={{
              background: "linear-gradient(90deg, #FBBF24, #22C55E, #F43F5E, #FACC15)",
              backgroundSize: "300% 100%",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              animation: "promo-gradient-shift 4s ease infinite",
            }}
          >
            100% GRATUIT
          </span>
        </h1>
        <p
          className="promo-fade-up text-white/70 text-base mb-8"
          style={{ animationDelay: "0.8s" }}
        >
          Pas de piege. Pas d&apos;abonnement obligatoire.
        </p>

        {/* Feature pills */}
        {[
          { emoji: "💕", text: "Matching intelligent", delay: "1.2s" },
          { emoji: "🗺️", text: "26 cantons suisses", delay: "1.5s" },
          { emoji: "📸", text: "Stories et photos", delay: "1.8s" },
          { emoji: "💬", text: "Messagerie integree", delay: "2.1s" },
          { emoji: "📅", text: "Evenements locaux", delay: "2.4s" },
        ].map((f) => (
          <div
            key={f.text}
            className="promo-slide-left w-full mb-2"
            style={{ animationDelay: f.delay }}
          >
            <div
              className="flex items-center gap-3 px-5 py-3 rounded-xl"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <span className="text-xl">{f.emoji}</span>
              <span className="text-white font-semibold text-sm">
                {f.text}
              </span>
              <span className="ml-auto text-green-400 text-xs font-bold">
                GRATUIT
              </span>
            </div>
          </div>
        ))}

        {/* Pet photos row */}
        {animals.length > 0 && (
          <div
            className="promo-fade-up flex -space-x-2 my-6"
            style={{ animationDelay: "2.8s" }}
          >
            {animals.slice(0, 7).map((a) => (
              <div
                key={a.id}
                className="w-10 h-10 rounded-full overflow-hidden border-2 border-indigo-400"
              >
                {a.photo_url && (
                  <img
                    src={a.photo_url}
                    alt={a.name}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        <div
          className="promo-fade-up w-full"
          style={{ animationDelay: "3.2s" }}
        >
          <div
            className="py-4 px-6 rounded-2xl text-center"
            style={{
              background: "linear-gradient(135deg, #8B5CF6, #EC4899)",
              boxShadow: "0 8px 32px rgba(139,92,246,0.4)",
            }}
          >
            <p className="text-white font-black text-lg">
              Inscris-toi en 30 secondes
            </p>
            <p className="text-purple-100 text-sm font-bold mt-1">
              👉 {SITE}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Animated Number Component ──────────────── */
function AnimatedNumber({
  target,
  delay,
}: {
  target: number;
  delay: number;
}) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (!started || target === 0) return;
    let current = 0;
    const step = Math.max(1, Math.floor(target / 60));
    const interval = setInterval(() => {
      current += step;
      if (current >= target) {
        setCount(target);
        clearInterval(interval);
      } else {
        setCount(current);
      }
    }, 25);
    return () => clearInterval(interval);
  }, [started, target]);

  return (
    <span className="text-3xl font-black text-yellow-400">
      {count}+
    </span>
  );
}
