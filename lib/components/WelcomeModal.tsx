"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const STORAGE_KEY = "pawly_welcome_dismissed";

export function WelcomeModal() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Don't show if already dismissed
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch { return; }

    // Don't show for logged-in users — they've already been onboarded
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        // User is logged in → dismiss permanently, never show again
        try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
        return;
      }
      // New visitor → show after 800ms
      const timer = setTimeout(() => setShow(true), 800);
      return () => clearTimeout(timer);
    });
  }, []);

  function handleClose() {
    setShow(false);
    // Always save dismissal — the modal has served its purpose
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
  }

  if (!show) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes welcomeFadeIn { from{opacity:0} to{opacity:1} }
        @keyframes welcomeSlideUp { from{opacity:0;transform:translateY(40px) scale(0.95)} to{opacity:1;transform:translateY(0) scale(1)} }
        .welcome-overlay{animation:welcomeFadeIn .3s ease-out forwards}
        .welcome-card{animation:welcomeSlideUp .4s .1s ease-out forwards;opacity:0}
      `}} />
      <div className="fixed inset-0 z-[999] flex items-center justify-center px-4 welcome-overlay"
        style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
        onClick={handleClose}>
        <div className="w-full max-w-sm bg-[var(--c-card)] border border-[var(--c-border)] rounded-3xl p-8 text-center welcome-card shadow-2xl"
          onClick={(e) => e.stopPropagation()}>

          <div className="text-5xl mb-4">🐾</div>
          <h2 className="text-xl font-extrabold text-[var(--c-text)] mb-3">Bienvenue sur Pawly !</h2>

          <div className="flex flex-col gap-3 mb-6 text-left">
            <div className="flex items-start gap-3">
              <span className="text-lg flex-shrink-0">💕</span>
              <p className="text-sm text-[var(--c-text-muted)] leading-relaxed">
                <span className="font-semibold text-[var(--c-text)]">Swipe</span> pour trouver des compagnons compatibles pour ton animal
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-lg flex-shrink-0">🏥</span>
              <p className="text-sm text-[var(--c-text-muted)] leading-relaxed">
                <span className="font-semibold text-[var(--c-text)]">Gere</span> la sante de tes animaux facilement
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-lg flex-shrink-0">🇨🇭</span>
              <p className="text-sm text-[var(--c-text-muted)] leading-relaxed">
                <span className="font-semibold text-[var(--c-text)]">Trouve</span> les meilleurs pros pour animaux en Suisse
              </p>
            </div>
          </div>

          <button onClick={handleClose}
            className="w-full py-3.5 font-bold rounded-xl text-white text-sm transition"
            style={{ background: "#22C55E", boxShadow: "0 0 20px rgba(34,197,94,0.3)" }}>
            C'est parti !
          </button>

          {/* Dismissal is automatic — no checkbox needed */}
        </div>
      </div>
    </>
  );
}
