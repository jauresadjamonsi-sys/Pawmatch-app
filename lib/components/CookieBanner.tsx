"use client";

import { useState, useEffect } from "react";

export function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem("cookies_accepted");
    if (!accepted) setShow(true);
  }, []);

  function accept() {
    localStorage.setItem("cookies_accepted", "true");
    setShow(false);
  }

  if (!show) return null;

  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9999,
      background: "rgba(26,18,37,0.95)", backdropFilter: "blur(12px)",
      borderTop: "1px solid rgba(255,255,255,0.1)",
      padding: "14px 20px", display: "flex", alignItems: "center",
      justifyContent: "center", gap: 16, flexWrap: "wrap",
    }}>
      <p style={{ fontSize: 12, color: "#d1d5db", margin: 0, maxWidth: 500 }}>
        🍪 Ce site utilise uniquement des cookies essentiels (session, préférences). Aucun cookie publicitaire.{" "}
        <a href="/legal/privacy" style={{ color: "#f97316", textDecoration: "underline" }}>En savoir plus</a>
      </p>
      <button onClick={accept} style={{
        padding: "8px 24px", background: "#f97316", color: "#fff",
        border: "none", borderRadius: 50, fontWeight: 700, fontSize: 12,
        cursor: "pointer", whiteSpace: "nowrap",
      }}>
        Compris
      </button>
    </div>
  );
}
