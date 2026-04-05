"use client";

import Link from "next/link";
import { useAppContext } from "@/lib/contexts/AppContext";

export default function Footer() {
  const { t } = useAppContext();

  return (
    <footer
      style={{
        borderTop: "1px solid var(--c-border)",
        background: "var(--c-bg, #0d0a14)",
        padding: "32px 20px 24px",
        marginTop: 24,
      }}
    >
      <div
        style={{
          maxWidth: 800,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
        }}
      >
        {/* Swiss badges */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 12px",
              borderRadius: 50,
              fontSize: 12,
              fontWeight: 700,
              border: "1px solid var(--c-border)",
              color: "var(--c-text-muted)",
              background: "var(--c-card, rgba(255,255,255,0.04))",
            }}
          >
            {t.footerMadeIn} 🇨🇭
          </span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 12px",
              borderRadius: 50,
              fontSize: 12,
              fontWeight: 700,
              border: "1px solid var(--c-border)",
              color: "var(--c-text-muted)",
              background: "var(--c-card, rgba(255,255,255,0.04))",
            }}
          >
            {t.footerLPD}
          </span>
        </div>

        {/* Navigation links */}
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center" }}>
          <Link
            href="/legal/cgu"
            style={{ fontSize: 12, color: "var(--c-text-muted)", textDecoration: "none" }}
          >
            {t.footerCGU}
          </Link>
          <Link
            href="/legal/privacy"
            style={{ fontSize: 12, color: "var(--c-text-muted)", textDecoration: "none" }}
          >
            {t.footerPrivacy}
          </Link>
          <a
            href="mailto:contact@pawlyapp.ch"
            style={{ fontSize: 12, color: "var(--c-text-muted)", textDecoration: "none" }}
          >
            Contact
          </a>
        </div>

        {/* Cross-promotion */}
        <a
          href="https://pawdirectory.ch"
          target="_blank"
          rel="noopener"
          style={{
            fontSize: 12,
            color: "#0D9488",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          {t.footerDirectory}
        </a>

        {/* Copyright */}
        <p
          style={{
            fontSize: 11,
            color: "var(--c-text-muted)",
            opacity: 0.6,
            margin: 0,
            textAlign: "center",
          }}
        >
          &copy; 2025 Pawly &mdash; pawlyapp.ch
        </p>
      </div>
    </footer>
  );
}
