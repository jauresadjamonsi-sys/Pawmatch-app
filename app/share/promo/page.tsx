"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const ANIMAL_EMOJIS = ["🐕", "🐱", "🐰", "🐹", "🦜", "🐢"];

const FUN_FACTS = [
  "Les chiens ont 300M de récepteurs olfactifs",
  "Les chats dorment 16h par jour",
  "Les lapins font des binkies quand ils sont heureux",
  "Un chien peut comprendre 250 mots",
];

const CYCLE_DURATION = 8; // seconds

/* ------------------------------------------------------------------ */
/*  Floating emoji particles                                          */
/* ------------------------------------------------------------------ */

function FloatingParticles() {
  const particles = Array.from({ length: 18 }, (_, i) => {
    const emoji = ANIMAL_EMOJIS[i % ANIMAL_EMOJIS.length];
    const left = Math.round((i * 17 + 5) % 100);
    const delay = (i * 0.7) % 6;
    const duration = 6 + (i % 5) * 2;
    const size = 16 + (i % 4) * 8;
    return (
      <span
        key={i}
        className="floating-particle"
        style={{
          left: `${left}%`,
          animationDelay: `${delay}s`,
          animationDuration: `${duration}s`,
          fontSize: `${size}px`,
        }}
      >
        {emoji}
      </span>
    );
  });
  return <div className="particles-container">{particles}</div>;
}

/* ------------------------------------------------------------------ */
/*  Inner content (needs useSearchParams)                             */
/* ------------------------------------------------------------------ */

function PromoContent() {
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref") || "";
  const referralLink = `https://pawband.ch/signup?ref=${ref}`;

  const [frame, setFrame] = useState(0);
  const [emojiIdx, setEmojiIdx] = useState(0);
  const [factIdx, setFactIdx] = useState(0);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const storyRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* Cycle through frames (paused while saving GIF) */
  useEffect(() => {
    if (saving) {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      return;
    }
    intervalRef.current = setInterval(() => {
      setFrame((prev) => {
        const next = (prev + 1) % 4;
        if (next === 0) setEmojiIdx((e) => (e + 1) % ANIMAL_EMOJIS.length);
        if (next === 2) setFactIdx((f) => (f + 1) % FUN_FACTS.length);
        return next;
      });
    }, (CYCLE_DURATION / 4) * 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [saving]);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
    } catch {
      const input = document.createElement("input");
      input.value = referralLink;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [referralLink]);

  const openInstagram = () => {
    window.open("instagram://story-camera", "_blank");
  };

  const saveStory = useCallback(async () => {
    if (!storyRef.current || saving) return;
    setSaving(true);
    toast.info("Capture des 4 frames...");

    try {
      const html2canvas = (await import("html2canvas")).default;
      const { GIFEncoder, quantize, applyPalette } = await import("gifenc");

      // We'll capture all 4 frames by forcing each frame state
      const frameElements = storyRef.current.querySelectorAll<HTMLElement>(".frame");
      const frames: ImageData[] = [];
      let gifWidth = 0;
      let gifHeight = 0;

      for (let i = 0; i < 4; i++) {
        // Show only frame i
        frameElements.forEach((el, idx) => {
          el.style.opacity = idx === i ? "1" : "0";
          el.style.pointerEvents = idx === i ? "auto" : "none";
        });

        // Let the browser repaint
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        await new Promise((r) => setTimeout(r, 150));

        // Capture this frame
        const canvas = await html2canvas(storyRef.current, {
          backgroundColor: null,
          scale: 1.5,
          useCORS: true,
          allowTaint: true,
          logging: false,
        });

        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("No canvas context");

        gifWidth = canvas.width;
        gifHeight = canvas.height;
        frames.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
      }

      // Restore original frame cycling (CSS classes will take over)
      frameElements.forEach((el) => {
        el.style.opacity = "";
        el.style.pointerEvents = "";
      });

      toast.info("Encodage GIF...");

      // Encode animated GIF
      const gif = GIFEncoder();

      for (const imgData of frames) {
        const palette = quantize(imgData.data, 256);
        const index = applyPalette(imgData.data, palette);
        gif.writeFrame(index, gifWidth, gifHeight, {
          palette,
          delay: 2000, // 2 seconds per frame
        });
      }
      gif.finish();

      const gifData = gif.bytes();
      const blob = new Blob([new Uint8Array(gifData)], { type: "image/gif" });
      const file = new File([blob], "pawband-story.gif", { type: "image/gif" });

      // Share or download
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Pawband Story" });
        toast.success("Story partagée !");
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "pawband-story.gif";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("GIF animé sauvegardé !");
      }
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      console.error("Save error:", err);
      toast.error("Erreur — essaie une capture d'écran");
    } finally {
      setSaving(false);
    }
  }, [saving]);

  return (
    <div className="promo-wrapper" role="main" aria-label="Promotion Pawband">
      {/* ---- Story frame (9:16) ---- */}
      <div className="story-frame" ref={storyRef} aria-label="Story promotionnelle Pawband">
        {/* Gradient background */}
        <div className="story-bg" />

        {/* Floating emoji particles */}
        <FloatingParticles />

        {/* Pawband logo */}
        <div className="story-logo">
          <span className="logo-paw">🐾</span>
          <span className="logo-text">Pawband</span>
        </div>

        {/* ---- Frames ---- */}
        <div className="frames-container">
          {/* Frame 1: Ruby photo + question */}
          <div className={`frame frame-1 ${frame === 0 ? "frame-active" : ""}`}>
            <div className="ruby-photo-ring">
              <img src="/ruby-hero.jpg" alt="Ruby, mascotte Pawband" className="ruby-photo" />
            </div>
            <h1 className="frame-title">Offre des aventures à ton compagnon&nbsp;!</h1>
            <p className="frame-subtitle">Rejoins Ruby et des milliers d&apos;animaux</p>
          </div>

          {/* Frame 2: Dogs meeting + tagline */}
          <div className={`frame frame-2 ${frame === 1 ? "frame-active" : ""}`}>
            <div className="dogs-photo-container">
              <img src="/promo-dogs.jpg" alt="Deux Bergers Blancs Suisses se rencontrent" className="dogs-photo" />
            </div>
            <h1 className="frame-title slide-text">
              Des rencontres entre compagnons en Suisse&nbsp;🇨🇭
            </h1>
          </div>

          {/* Frame 3: Fun fact */}
          <div className={`frame frame-3 ${frame === 2 ? "frame-active" : ""}`}>
            <div className="fact-icon">🧠</div>
            <p className="fact-text">{FUN_FACTS[factIdx]}</p>
          </div>

          {/* Frame 4: CTA */}
          <div className={`frame frame-4 ${frame === 3 ? "frame-active" : ""}`}>
            <h1 className="frame-title cta-title">Télécharge Pawband</h1>
            <a href="https://pawband.ch" target="_blank" rel="noopener noreferrer" className="cta-domain">pawband.ch</a>
            {ref && <div className="ref-code">Code : {ref.slice(0, 8)}</div>}
            <div className="gratuit-badge">Gratuit</div>
          </div>
        </div>

        {/* Progress dots */}
        <div className="progress-dots" role="tablist" aria-label="Progression de la story">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} role="tab" aria-selected={frame === i} aria-label={`Slide ${i + 1} sur 4`} className={`dot ${frame === i ? "dot-active" : ""}`} />
          ))}
        </div>

        {/* Swiss badge */}
        <div className="swiss-badge">Conçu en Suisse 🇨🇭</div>

        {/* Watermark */}
        <a href="https://pawband.ch" target="_blank" rel="noopener noreferrer" className="watermark">pawband.ch</a>
      </div>

      {/* ---- Action buttons (outside story) ---- */}
      <div className="actions-bar" role="group" aria-label="Actions de partage">
        <button
          onClick={saveStory}
          disabled={saving}
          className="action-btn save-btn"
          aria-label={saving ? "Sauvegarde en cours" : "Enregistrer le GIF animé"}
        >
          {saving ? "Capture..." : "🎬 GIF animé"}
        </button>
        <button onClick={openInstagram} className="action-btn ig-btn" aria-label="Partager sur Instagram">
          Instagram
        </button>
        <button onClick={copyLink} className="action-btn copy-btn" aria-label={copied ? "Lien copie" : "Copier le lien de partage"}>
          {copied ? "Copié !" : "🔗 Lien"}
        </button>
      </div>

      {/* ---- All styles ---- */}
      <style>{`
        @keyframes gradientShift {
          0%   { background-position: 0% 50%; }
          25%  { background-position: 100% 50%; }
          50%  { background-position: 50% 100%; }
          75%  { background-position: 0% 50%; }
          100% { background-position: 0% 50%; }
        }

        @keyframes floatUp {
          0%   { transform: translateY(100vh) rotate(0deg) scale(0.6); opacity: 0; }
          10%  { opacity: 0.35; }
          90%  { opacity: 0.25; }
          100% { transform: translateY(-20vh) rotate(360deg) scale(1); opacity: 0; }
        }

        @keyframes fadeInUp {
          0%   { opacity: 0; transform: translateY(30px) scale(0.95); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes slideInRight {
          0%   { opacity: 0; transform: translateX(60px); }
          100% { opacity: 1; transform: translateX(0); }
        }

        @keyframes popIn {
          0%   { opacity: 0; transform: scale(0.5); }
          60%  { transform: scale(1.08); }
          100% { opacity: 1; transform: scale(1); }
        }

        @keyframes zoomIn {
          0%   { opacity: 0; transform: scale(0.7); }
          100% { opacity: 1; transform: scale(1); }
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-12px); }
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.05); }
        }

        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }

        @keyframes dotPulse {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.4); }
        }

        .promo-wrapper {
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #0a0a0f;
          padding: 16px;
          gap: 20px;
          overflow: hidden;
        }

        .story-frame {
          position: relative;
          width: 100%;
          max-width: 375px;
          aspect-ratio: 9 / 16;
          border-radius: 24px;
          overflow: hidden;
          box-shadow:
            0 0 60px rgba(34, 197, 94, 0.25),
            0 0 120px rgba(168, 85, 247, 0.15);
        }

        @media (max-width: 420px) {
          .story-frame {
            max-width: 100%;
            border-radius: 0;
            aspect-ratio: auto;
            min-height: 100dvh;
          }
          .promo-wrapper {
            padding: 0;
            gap: 0;
          }
          .actions-bar {
            padding: 12px 16px 24px;
            width: 100%;
            border-radius: 0 !important;
          }
        }

        .story-bg {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            135deg,
            #1a0533 0%,
            #2d1b4e 20%,
            #7c2d12 40%,
            #c2410c 55%,
            #0f766e 75%,
            #134e4a 90%,
            #1a0533 100%
          );
          background-size: 400% 400%;
          animation: gradientShift 8s ease infinite;
          z-index: 0;
        }

        .particles-container {
          position: absolute;
          inset: 0;
          z-index: 1;
          pointer-events: none;
          overflow: hidden;
        }

        .floating-particle {
          position: absolute;
          bottom: -40px;
          animation: floatUp linear infinite;
          opacity: 0;
          user-select: none;
          filter: blur(0.5px);
        }

        .story-logo {
          position: absolute;
          top: 24px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .logo-paw {
          font-size: 28px;
          filter: drop-shadow(0 2px 8px rgba(0,0,0,0.4));
        }

        .logo-text {
          font-size: 24px;
          font-weight: 900;
          color: #fff;
          text-shadow: 0 2px 12px rgba(0,0,0,0.5);
          letter-spacing: -0.5px;
        }

        .frames-container {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 5;
        }

        .frame {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 28px;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.15s;
        }

        .frame-active {
          opacity: 1;
          pointer-events: auto;
        }

        .frame-1.frame-active .ruby-photo-ring {
          animation: fadeInUp 0.6s ease forwards, pulse 3s ease-in-out 0.6s infinite;
        }

        .frame-1.frame-active .frame-title {
          animation: fadeInUp 0.6s ease 0.2s forwards;
          opacity: 0;
        }

        .frame-1.frame-active .frame-subtitle {
          animation: fadeInUp 0.6s ease 0.4s forwards;
          opacity: 0;
        }

        .ruby-photo-ring {
          width: 160px;
          height: 160px;
          border-radius: 50%;
          padding: 4px;
          background: linear-gradient(135deg, #FBBF24, #FACC15, #38bdf8, #FBBF24);
          background-size: 300% 300%;
          animation: gradientShift 4s ease infinite;
          margin-bottom: 24px;
          box-shadow: 0 0 40px rgba(34, 197, 94, 0.4), 0 0 80px rgba(250, 204, 21, 0.2);
        }

        .ruby-photo {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
          border: 3px solid rgba(0, 0, 0, 0.3);
        }

        .frame-subtitle {
          font-size: 18px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.7);
          text-align: center;
          margin-top: 12px;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.4);
        }

        .big-emoji {
          font-size: 96px;
          margin-bottom: 20px;
          filter: drop-shadow(0 4px 20px rgba(0,0,0,0.3));
        }

        .frame-title {
          font-size: 32px;
          font-weight: 900;
          color: #fff;
          text-align: center;
          line-height: 1.2;
          text-shadow: 0 3px 20px rgba(0,0,0,0.5);
        }

        .dogs-photo-container {
          width: 260px;
          height: 160px;
          border-radius: 20px;
          overflow: hidden;
          margin-bottom: 24px;
          box-shadow: 0 8px 40px rgba(0,0,0,0.5), 0 0 60px rgba(251,191,36,0.2);
          border: 3px solid rgba(255,255,255,0.2);
        }

        .dogs-photo {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .frame-2.frame-active .dogs-photo-container {
          animation: zoomIn 0.6s ease forwards;
        }

        .frame-2.frame-active .slide-text {
          animation: slideInRight 0.7s ease 0.3s forwards;
          opacity: 0;
        }

        .frame-3.frame-active .fact-icon {
          animation: popIn 0.5s ease forwards;
        }

        .frame-3.frame-active .fact-text {
          animation: popIn 0.5s ease 0.15s forwards;
          opacity: 0;
        }

        .fact-icon {
          font-size: 64px;
          margin-bottom: 24px;
          filter: drop-shadow(0 4px 16px rgba(0,0,0,0.3));
        }

        .fact-text {
          font-size: 26px;
          font-weight: 800;
          color: #fff;
          text-align: center;
          line-height: 1.3;
          text-shadow: 0 3px 16px rgba(0,0,0,0.5);
          max-width: 300px;
        }

        .frame-4.frame-active .cta-title {
          animation: zoomIn 0.5s ease forwards;
        }

        .frame-4.frame-active .cta-domain {
          animation: zoomIn 0.5s ease 0.15s forwards;
          opacity: 0;
        }

        .frame-4.frame-active .ref-code {
          animation: zoomIn 0.5s ease 0.25s forwards;
          opacity: 0;
        }

        .frame-4.frame-active .gratuit-badge {
          animation: popIn 0.5s ease 0.35s forwards;
          opacity: 0;
        }

        .cta-title {
          font-size: 36px;
          margin-bottom: 16px;
        }

        .cta-domain {
          font-size: 22px;
          font-weight: 800;
          color: #fff;
          background: rgba(255,255,255,0.15);
          backdrop-filter: blur(8px);
          padding: 10px 28px;
          border-radius: 16px;
          margin-bottom: 16px;
          border: 1px solid rgba(255,255,255,0.2);
          text-shadow: 0 2px 8px rgba(0,0,0,0.3);
          text-decoration: none;
          display: inline-block;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .cta-domain:hover {
          transform: scale(1.05);
          box-shadow: 0 0 20px rgba(34, 197, 94,0.4);
        }

        .ref-code {
          font-size: 15px;
          font-weight: 700;
          color: rgba(255,255,255,0.8);
          background: rgba(255,255,255,0.1);
          padding: 8px 20px;
          border-radius: 12px;
          margin-bottom: 16px;
          font-family: monospace;
          letter-spacing: 1px;
          border: 1px solid rgba(255,255,255,0.15);
        }

        .gratuit-badge {
          font-size: 18px;
          font-weight: 900;
          color: #0a0a0f;
          background: linear-gradient(135deg, #FCD34D, #FBBF24, #FCD34D);
          background-size: 200% auto;
          animation: shimmer 2s linear infinite;
          padding: 8px 32px;
          border-radius: 100px;
          text-transform: uppercase;
          letter-spacing: 2px;
          box-shadow: 0 4px 24px rgba(251, 191, 36, 0.4);
        }

        .progress-dots {
          position: absolute;
          bottom: 60px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 8px;
          z-index: 10;
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(255,255,255,0.3);
          transition: background 0.3s, transform 0.3s;
        }

        .dot-active {
          background: #fff;
          animation: dotPulse 1s ease-in-out infinite;
        }

        .swiss-badge {
          position: absolute;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 12px;
          font-weight: 700;
          color: rgba(255,255,255,0.5);
          z-index: 10;
          white-space: nowrap;
        }

        .watermark {
          position: absolute;
          top: 28px;
          right: 16px;
          font-size: 11px;
          font-weight: 600;
          color: rgba(255,255,255,0.25);
          z-index: 10;
          letter-spacing: 0.5px;
        }

        .actions-bar {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: center;
          max-width: 375px;
          width: 100%;
        }

        .action-btn {
          flex: 1;
          min-width: 110px;
          padding: 12px 10px;
          border-radius: 14px;
          border: none;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.15s, opacity 0.15s;
          text-align: center;
        }

        .action-btn:active {
          transform: scale(0.96);
        }

        .save-btn {
          background: rgba(255,255,255,0.1);
          color: #fff;
          border: 1px solid rgba(255,255,255,0.15);
        }

        .ig-btn {
          background: linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888);
          color: #fff;
        }

        .copy-btn {
          background: rgba(34, 197, 94, 0.15);
          color: #FBBF24;
          border: 1px solid rgba(34, 197, 94, 0.25);
        }
      `}</style>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page (with Suspense wrapper for useSearchParams)                  */
/* ------------------------------------------------------------------ */

export default function PromoPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100dvh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#0a0a0f",
            color: "#fff",
            fontSize: 18,
            fontWeight: 700,
          }}
        >
          Chargement...
        </div>
      }
    >
      <PromoContent />
    </Suspense>
  );
}
