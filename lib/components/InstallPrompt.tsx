"use client";

import { useState, useEffect, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "pawly_install_dismissed";
const DISMISS_TTL = 1000 * 60 * 60 * 24 * 3; // 3 days

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // Already installed as PWA
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true;
    setIsStandalone(standalone);
    if (standalone) return;

    // Check dismissal
    try {
      const raw = localStorage.getItem(DISMISSED_KEY);
      if (raw && Date.now() - parseInt(raw, 10) < DISMISS_TTL) return;
    } catch {}

    // Detect iOS
    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Mac") && "ontouchend" in document);
    setIsIOS(ios);

    // On iOS, show custom guide after 10s
    if (ios) {
      const timer = setTimeout(() => setShow(true), 10000);
      return () => clearTimeout(timer);
    }

    // On Android/Desktop, capture beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show after user has been on app for 8 seconds
      setTimeout(() => setShow(true), 8000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShow(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setShow(false);
    setShowIOSGuide(false);
    try { localStorage.setItem(DISMISSED_KEY, String(Date.now())); } catch {}
  }, []);

  if (isStandalone || !show) return null;

  // iOS guide
  if (isIOS) {
    return (
      <>
        {/* Compact banner */}
        {!showIOSGuide && (
          <div className="fixed bottom-20 left-4 right-4 z-[60] animate-slide-up">
            <div
              className="flex items-center gap-3 p-3 rounded-2xl border shadow-2xl"
              style={{
                background: "var(--c-card)",
                borderColor: "var(--c-border)",
                boxShadow: "0 8px 40px rgba(0,0,0,0.3)",
              }}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-lg flex-shrink-0 shadow-lg shadow-orange-500/30">
                🐾
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[var(--c-text)] leading-tight">Installe Pawly</p>
                <p className="text-[11px] text-[var(--c-text-muted)] leading-tight mt-0.5">Acc&egrave;s rapide depuis ton &eacute;cran d&apos;accueil</p>
              </div>
              <button
                onClick={() => setShowIOSGuide(true)}
                className="flex-shrink-0 px-3 py-1.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-xs font-bold rounded-full shadow-lg shadow-orange-500/20"
              >
                Comment ?
              </button>
              <button
                onClick={handleDismiss}
                className="flex-shrink-0 p-1 text-[var(--c-text-muted)] hover:text-[var(--c-text)]"
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* iOS step-by-step guide */}
        {showIOSGuide && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[70] flex items-end justify-center p-4">
            <div className="animate-slide-up w-full max-w-md rounded-3xl border overflow-hidden"
              style={{ background: "var(--c-card)", borderColor: "var(--c-border)" }}>
              <div className="p-6 text-center">
                <div className="text-4xl mb-3">🐾</div>
                <h3 className="text-lg font-bold text-[var(--c-text)] mb-1">Installer Pawly</h3>
                <p className="text-sm text-[var(--c-text-muted)] mb-5">3 &eacute;tapes simples</p>

                <div className="space-y-4 text-left">
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-xs font-bold">1</span>
                    <div>
                      <p className="text-sm font-medium text-[var(--c-text)]">Appuie sur <span className="inline-block px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs font-mono">⬆ Partager</span></p>
                      <p className="text-xs text-[var(--c-text-muted)] mt-0.5">En bas de Safari</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-xs font-bold">2</span>
                    <div>
                      <p className="text-sm font-medium text-[var(--c-text)]">Scrolle vers le bas et appuie sur <span className="inline-block px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded text-xs font-mono">＋ Sur l&apos;&eacute;cran d&apos;accueil</span></p>
                      <p className="text-xs text-[var(--c-text-muted)] mt-0.5">C&apos;est en dessous de &laquo;&nbsp;Ajouter un signet&nbsp;&raquo;</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-xs font-bold">3</span>
                    <div>
                      <p className="text-sm font-medium text-[var(--c-text)]">Appuie sur &laquo;&nbsp;Ajouter&nbsp;&raquo;</p>
                      <p className="text-xs text-[var(--c-text-muted)] mt-0.5">Pawly appara&icirc;t comme une vraie app !</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex border-t" style={{ borderColor: "var(--c-border)" }}>
                <button onClick={handleDismiss}
                  className="flex-1 py-3.5 text-sm text-[var(--c-text-muted)] hover:text-[var(--c-text)] transition">
                  Plus tard
                </button>
                <div className="w-px" style={{ background: "var(--c-border)" }} />
                <button onClick={handleDismiss}
                  className="flex-1 py-3.5 text-sm font-bold text-orange-400 hover:text-orange-300 transition">
                  Compris !
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Android / Desktop — native install prompt
  return (
    <div className="fixed bottom-20 left-4 right-4 z-[60] animate-slide-up md:left-auto md:right-6 md:max-w-sm">
      <div
        className="flex items-center gap-3 p-3 rounded-2xl border shadow-2xl"
        style={{
          background: "var(--c-card)",
          borderColor: "var(--c-border)",
          boxShadow: "0 8px 40px rgba(0,0,0,0.3)",
        }}
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-lg flex-shrink-0 shadow-lg shadow-orange-500/30">
          🐾
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[var(--c-text)] leading-tight">Installe Pawly</p>
          <p className="text-[11px] text-[var(--c-text-muted)] leading-tight mt-0.5">Comme une vraie app, sans App Store</p>
        </div>
        <button
          onClick={handleInstall}
          className="flex-shrink-0 px-3 py-1.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-xs font-bold rounded-full shadow-lg shadow-orange-500/20 active:scale-95 transition-transform"
        >
          Installer
        </button>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 text-[var(--c-text-muted)] hover:text-[var(--c-text)]"
          aria-label="Fermer"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
