"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
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
  const referralLink = `https://pawlyapp.ch/signup?ref=${ref}`;

  const [frame, setFrame] = useState(0);
  const [emojiIdx, setEmojiIdx] = useState(0);
  const [factIdx, setFactIdx] = useState(0);
  const [copied, setCopied] = useState(false);

  /* Cycle through frames */
  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((prev) => {
        const next = (prev + 1) % 4;
        if (next === 0) setEmojiIdx((e) => (e + 1) % ANIMAL_EMOJIS.length);
        if (next === 2) setFactIdx((f) => (f + 1) % FUN_FACTS.length);
        return next;
      });
    }, (CYCLE_DURATION / 4) * 1000);
    return () => clearInterval(interval);
  }, []);

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

  return (
    <div className="promo-wrapper">
      {/* ---- Story frame (9:16) ---- */}
      <div className="story-frame">
        {/* Gradient background */}
        <div className="story-bg" />

        {/* Floating emoji particles */}
        <FloatingParticles />

        {/* Pawly logo */}
        <div className="story-logo">
          <span className="logo-paw">🐾</span>
          <span className="logo-text">Pawly</span>
        </div>

        {/* ---- Frames ---- */}
        <div className="frames-container">
          {/* Frame 1: Big emoji + question */}
          <div className={`frame frame-1 ${frame === 0 ? "frame-active" : ""}`}>
            <div className="big-emoji">{ANIMAL_EMOJIS[emojiIdx]}</div>
            <h1 className="frame-title">Ton animal a besoin d&apos;amis&nbsp;?</h1>
          </div>

          {/* Frame 2: Tagline */}
          <div className={`frame frame-2 ${frame === 1 ? "frame-active" : ""}`}>
            <h1 className="frame-title slide-text">
              Pawly connecte les propriétaires d&apos;animaux en Suisse&nbsp;🇨🇭
            </h1>
          </div>

          {/* Frame 3: Fun fact */}
          <div className={`frame frame-3 ${frame === 2 ? "frame-active" : ""}`}>
            <div className="fact-icon">🧠</div>
            <p className="fact-text">{FUN_FACTS[factIdx]}</p>
          </div>

          {/* Frame 4: CTA */}
          <div className={`frame frame-4 ${frame === 3 ? "frame-active" : ""}`}>
            <h1 className="frame-title cta-title">Télécharge Pawly</h1>
            <div className="cta-domain">pawlyapp.ch</div>
            {ref && <div className="ref-code">Code : {ref.slice(0, 8)}</div>}
            <div className="gratuit-badge">Gratuit</div>
          </div>
        </div>

        {/* Progress dots */}
        <div className="progress-dots">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`dot ${frame === i ? "dot-active" : ""}`} />
          ))}
        </div>

        {/* Swiss badge */}
        <div className="swiss-badge">Conçu en Suisse 🇨🇭</div>

        {/* Watermark */}
        <div className="watermark">pawlyapp.ch</div>
      </div>

      {/* ---- Action buttons (outside story) ---- */}
      <div className="actions-bar">
        <button
          onClick={() => toast.success("Fais une capture d'écran ou un enregistrement d'écran pour sauvegarder ta story !")}
          className="action-btn save-btn"
        >
          📥 Enregistrer
        </button>
        <button onClick={openInstagram} className="action-btn ig-btn">
          📱 Partager sur Instagram
        </button>
        <button onClick={copyLink} className="action-btn copy-btn">
          {copied ? "✅ Copié !" : "🔗 Copier le lien"}
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
            0 0 60px rgba(249, 115, 22, 0.25),
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

        .frame-1.frame-active .big-emoji {
          animation: fadeInUp 0.6s ease forwards, bounce 2s ease-in-out 0.6s infinite;
        }

        .frame-1.frame-active .frame-title {
          animation: fadeInUp 0.6s ease 0.2s forwards;
          opacity: 0;
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

        .frame-2.frame-active .slide-text {
          animation: slideInRight 0.7s ease forwards;
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
          background: linear-gradient(135deg, #fbbf24, #f59e0b, #fbbf24);
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
          background: rgba(249, 115, 22, 0.15);
          color: #f97316;
          border: 1px solid rgba(249, 115, 22, 0.25);
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
