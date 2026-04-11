"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "pawly_cookies_ok";

export function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      // Check both old and new keys for backwards compat
      if (localStorage.getItem(STORAGE_KEY) || localStorage.getItem("cookies_accepted")) return;
      setShow(true);
    } catch {}
  }, []);

  function accept() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
      localStorage.setItem("cookies_accepted", "true");
    } catch {}
    setShow(false);
  }

  if (!show) return null;

  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9999,
      background: "var(--c-card)", backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      borderTop: "1px solid var(--c-border)",
      padding: "16px 20px",
      paddingBottom: "max(16px, env(safe-area-inset-bottom))",
      display: "flex", alignItems: "center",
      justifyContent: "center", gap: 16, flexWrap: "wrap",
    }}>
      <p style={{ fontSize: 12, color: "var(--c-text-muted)", margin: 0, maxWidth: 500 }}>
        🍪 Cookies essentiels uniquement (session, preferences). Aucun tracking publicitaire.{" "}
        <a href="/legal/privacy" style={{ color: "#22C55E", textDecoration: "underline" }}>En savoir plus</a>
      </p>
      <button onClick={accept} style={{
        padding: "10px 28px", background: "#22C55E", color: "#fff",
        border: "none", borderRadius: 50, fontWeight: 700, fontSize: 13,
        cursor: "pointer", whiteSpace: "nowrap",
        minHeight: 44, /* iOS minimum tap target */
      }}>
        Compris
      </button>
    </div>
  );
}
