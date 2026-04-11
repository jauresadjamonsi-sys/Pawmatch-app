"use client";

import Link from "next/link";
import { useAppContext } from "@/lib/contexts/AppContext";

export default function Footer() {
  const { t } = useAppContext();

  return (
    <footer
      style={{
        position: "relative",
        background: "var(--c-deep)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        padding: "40px 20px 28px",
        marginTop: 24,
        overflow: "hidden",
      }}
    >
      {/* Animated gradient top border */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background:
            "linear-gradient(90deg, transparent, rgba(251,191,36,0.4), rgba(167,139,250,0.4), transparent)",
          animation: "footerBorderShimmer 4s ease-in-out infinite alternate",
        }}
      />

      {/* Floating particles */}
      <div
        style={{
          position: "absolute",
          top: "25%",
          left: "12%",
          width: 3,
          height: 3,
          borderRadius: "50%",
          background: "rgba(251,191,36,0.3)",
          animation: "footerParticleFloat 6s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "60%",
          right: "18%",
          width: 2,
          height: 2,
          borderRadius: "50%",
          background: "rgba(167,139,250,0.3)",
          animation: "footerParticleFloat 8s ease-in-out infinite reverse",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "30%",
          left: "55%",
          width: 2,
          height: 2,
          borderRadius: "50%",
          background: "rgba(13,148,136,0.3)",
          animation: "footerParticleFloat 7s ease-in-out infinite",
          animationDelay: "2s",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          maxWidth: 800,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 18,
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Swiss badges - glass pills */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          <span
            className="footer-badge"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 16px",
              borderRadius: 50,
              fontSize: 12,
              fontWeight: 700,
              border: "1px solid rgba(251,191,36,0.15)",
              color: "var(--c-text-muted)",
              background: "var(--c-card)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              boxShadow: "0 0 12px rgba(251,191,36,0.06), inset 0 0 12px rgba(255,255,255,0.02)",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            {t.footerMadeIn} <span style={{ filter: "drop-shadow(0 0 3px rgba(255,0,0,0.3))" }}>&#127464;&#127469;</span>
          </span>
          <span
            className="footer-badge"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 16px",
              borderRadius: 50,
              fontSize: 12,
              fontWeight: 700,
              border: "1px solid rgba(167,139,250,0.15)",
              color: "var(--c-text-muted)",
              background: "var(--c-card)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              boxShadow: "0 0 12px rgba(167,139,250,0.06), inset 0 0 12px rgba(255,255,255,0.02)",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            {t.footerLPD}
          </span>
        </div>

        {/* Navigation links */}
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", justifyContent: "center" }}>
          <Link
            href="/legal/cgu"
            className="footer-link"
            style={{
              fontSize: 12,
              color: "var(--c-text-muted)",
              textDecoration: "none",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            {t.footerCGU}
          </Link>
          <Link
            href="/legal/privacy"
            className="footer-link"
            style={{
              fontSize: 12,
              color: "var(--c-text-muted)",
              textDecoration: "none",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            {t.footerPrivacy}
          </Link>
          <Link
            href="/legal/mentions-legales"
            className="footer-link"
            style={{
              fontSize: 12,
              color: "var(--c-text-muted)",
              textDecoration: "none",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            Mentions legales
          </Link>
          <a
            href="mailto:contact@pawlyapp.ch"
            className="footer-link"
            style={{
              fontSize: 12,
              color: "var(--c-text-muted)",
              textDecoration: "none",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            Contact
          </a>
        </div>

        {/* Cross-promotion */}
        <a
          href="https://pawdirectory.ch"
          target="_blank"
          rel="noopener"
          className="footer-cross-promo"
          style={{
            fontSize: 12,
            color: "#0D9488",
            textDecoration: "none",
            fontWeight: 600,
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          {t.footerDirectory}
        </a>

        {/* Copyright */}
        <p
          style={{
            fontSize: 11,
            color: "var(--c-text-muted)",
            opacity: 0.45,
            margin: 0,
            textAlign: "center",
            letterSpacing: "0.02em",
          }}
        >
          &copy; {new Date().getFullYear()} Pawly &mdash; pawlyapp.ch
        </p>
      </div>

      {/* Scoped keyframes & hover styles */}
      <style>{`
        @keyframes footerBorderShimmer {
          0% { opacity: 0.5; transform: scaleX(0.8); }
          100% { opacity: 1; transform: scaleX(1); }
        }
        @keyframes footerParticleFloat {
          0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.3; }
          25% { transform: translateY(-8px) translateX(4px); opacity: 0.6; }
          50% { transform: translateY(-4px) translateX(-3px); opacity: 0.4; }
          75% { transform: translateY(-10px) translateX(2px); opacity: 0.5; }
        }
        .footer-link:hover {
          color: var(--c-text) !important;
          text-shadow: 0 0 12px rgba(13,148,136,0.4), 0 0 24px rgba(251,191,36,0.2);
        }
        .footer-cross-promo:hover {
          background: linear-gradient(135deg, #FBBF24, #a78bfa, #0d9488);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          filter: brightness(1.2);
        }
        .footer-badge:hover {
          border-color: rgba(251,191,36,0.3) !important;
          box-shadow: 0 0 20px rgba(251,191,36,0.1), inset 0 0 16px rgba(255,255,255,0.03) !important;
        }
      `}</style>
    </footer>
  );
}
