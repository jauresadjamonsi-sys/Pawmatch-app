"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/client";
import { getAnimalById, AnimalRow } from "@/lib/services/animals";
import { CANTONS } from "@/lib/cantons";
import { EMOJI_MAP } from "@/lib/constants";
import { useAppContext } from "@/lib/contexts/AppContext";

const TRAIT_COLORS = [
  { bg: "rgba(249,115,22,0.15)", text: "#4ADE80", border: "rgba(249,115,22,0.3)" },
  { bg: "rgba(168,85,247,0.15)", text: "#a78bfa", border: "rgba(168,85,247,0.3)" },
  { bg: "rgba(56,189,248,0.15)", text: "#38bdf8", border: "rgba(56,189,248,0.3)" },
  { bg: "rgba(52,211,153,0.15)", text: "#34d399", border: "rgba(52,211,153,0.3)" },
  { bg: "rgba(252,211,77,0.15)", text: "#FCD34D", border: "rgba(252,211,77,0.3)" },
  { bg: "rgba(244,114,182,0.15)", text: "#f472b6", border: "rgba(244,114,182,0.3)" },
];

export default function AnimalCardPage() {
  const params = useParams();
  const { t } = useAppContext();
  const supabase = createClient();
  const cardRef = useRef<HTMLDivElement>(null);

  const [animal, setAnimal] = useState<AnimalRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const profileUrl = typeof window !== "undefined"
    ? `${window.location.origin}/animals/${params.id}`
    : `https://pawband.ch/animals/${params.id}`;

  const cardUrl = typeof window !== "undefined"
    ? `${window.location.origin}/animals/${params.id}/card`
    : `https://pawband.ch/animals/${params.id}/card`;

  useEffect(() => {
    async function load() {
      const result = await getAnimalById(supabase, params.id as string);
      if (result.data) setAnimal(result.data);
      setLoading(false);
    }
    load();
  }, [params.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (animal) {
      document.title = `${animal.name} - ${t.cardDigitalPassport || "Digital Passport"} | Pawband`;
    }
  }, [animal, t]);

  useEffect(() => {
    if (profileUrl) {
      QRCode.toDataURL(profileUrl, {
        width: 160,
        margin: 1,
        color: { dark: "#1a1714", light: "#ffffff" },
      }).then(setQrDataUrl);
    }
  }, [profileUrl]);

  const handleShare = useCallback(async () => {
    if (!animal) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${animal.name} - Pawband`,
          text: `${t.cardDigitalPassport || "Digital Passport"}: ${animal.name}`,
          url: cardUrl,
        });
      } catch {
        // user cancelled
      }
    }
  }, [animal, cardUrl, t]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(cardUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  }, [cardUrl]);

  const handleDownload = useCallback(async () => {
    if (!cardRef.current || !animal) return;
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement("a");
      link.download = `${animal.name}-pawly-card.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      // Fallback: download QR code only
      if (qrDataUrl) {
        const link = document.createElement("a");
        link.download = `${animal.name}-pawly-qr.png`;
        link.href = qrDataUrl;
        link.click();
      }
    }
  }, [animal, qrDataUrl]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--c-text-muted)]">{t.loading}</p>
      </div>
    );
  }

  if (!animal) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--c-text-muted)]">{t.animalNotFound}</p>
      </div>
    );
  }

  const cantonObj = animal.canton ? CANTONS.find((c) => c.code === animal.canton) : null;
  const cantonName = cantonObj?.name || animal.canton;
  const emoji = EMOJI_MAP[animal.species] || "\u{1F43E}";
  const traits: string[] = animal.traits || [];
  const photoUrl = animal.photo_url;
  // energy_level may exist in DB but not in TS type
  const energyLevel = (animal as Record<string, unknown>).energy_level as number | null;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-10 relative"
      style={{
        background: "linear-gradient(135deg, #1a1030 0%, #2a1848 30%, #1e1040 60%, #0f0a20 100%)",
      }}
    >
      {/* Back button */}
      <div className="absolute top-4 left-4 z-10">
        <button onClick={() => window.history.length > 1 ? window.history.back() : (window.location.href = "/feed")} aria-label="Retour" className="inline-flex items-center justify-center w-9 h-9 rounded-full transition-all active:scale-90 flex-shrink-0" style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--c-text)" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
      </div>

      {/* ===== THE CARD ===== */}
      <div
        ref={cardRef}
        className="relative w-full max-w-sm rounded-3xl overflow-hidden holographic-shimmer"
        style={{
          background: "rgba(255,255,255,0.06)",
          backdropFilter: "blur(30px)",
          WebkitBackdropFilter: "blur(30px)",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 25px 80px rgba(0,0,0,0.5), 0 0 40px rgba(168,85,247,0.08), 0 0 80px rgba(249,115,22,0.06)",
        }}
      >
        {/* Gradient border overlay */}
        <div
          className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{
            padding: "1.5px",
            background: "linear-gradient(135deg, #FBBF24, #A78BFA, #38BDF8, #FBBF24)",
            backgroundSize: "300% 300%",
            animation: "aurora 6s ease infinite",
            WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
          }}
        />

        {/* Pet Photo */}
        <div className="relative w-full" style={{ height: 260 }}>
          {photoUrl ? (
            <Image
              src={photoUrl}
              alt={animal.name}
              fill
              className="object-cover"
              sizes="(max-width: 400px) 100vw, 400px"
              priority
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.03)" }}>
              <span style={{ fontSize: 80 }}>{emoji}</span>
            </div>
          )}
          {/* Fade overlay at the bottom of photo */}
          <div
            className="absolute bottom-0 left-0 right-0"
            style={{
              height: 80,
              background: "linear-gradient(transparent, rgba(26,16,48,0.9))",
            }}
          />
          {/* Species badge */}
          <div
            className="absolute top-4 right-4 px-3 py-1.5 rounded-full"
            style={{
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255,255,255,0.15)",
              fontSize: 12,
              fontWeight: 700,
              color: "#fff",
            }}
          >
            {emoji} {animal.species.charAt(0).toUpperCase() + animal.species.slice(1)}
          </div>
        </div>

        {/* Card Content */}
        <div style={{ padding: "20px 24px 24px" }}>
          {/* Pet Name */}
          <h1
            className="gradient-text"
            style={{
              fontSize: 32,
              fontWeight: 900,
              lineHeight: 1.1,
              marginBottom: 4,
            }}
          >
            {animal.name}
          </h1>

          {/* Breed & Species line */}
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 16 }}>
            {animal.breed || animal.species.charAt(0).toUpperCase() + animal.species.slice(1)}
            {animal.breed ? ` ${emoji}` : ""}
          </p>

          {/* Canton badge */}
          {cantonName && (
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{
                background: "rgba(56,189,248,0.1)",
                border: "1px solid rgba(56,189,248,0.25)",
                fontSize: 12,
                fontWeight: 700,
                color: "#38bdf8",
                marginBottom: 16,
              }}
            >
              <span style={{ fontSize: 14 }}>{"\u{1F4CD}"}</span>
              {cantonName}
              {animal.canton ? ` (${animal.canton})` : ""}
            </div>
          )}

          {/* Personality traits */}
          {traits.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                {t.cardTraits || "Personality"}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {traits.map((trait, i) => {
                  const color = TRAIT_COLORS[i % TRAIT_COLORS.length];
                  return (
                    <span
                      key={trait}
                      className="px-2.5 py-1 rounded-full"
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        background: color.bg,
                        color: color.text,
                        border: `1px solid ${color.border}`,
                      }}
                    >
                      {trait}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Energy level bar */}
          {energyLevel != null && energyLevel > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {t.cardEnergy || "Energy"}
                </p>
                <span style={{ fontSize: 11, fontWeight: 800, color: "#4ADE80" }}>{energyLevel}/5</span>
              </div>
              <div
                style={{
                  height: 6,
                  borderRadius: 3,
                  background: "rgba(255,255,255,0.08)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    borderRadius: 3,
                    width: `${(energyLevel / 5) * 100}%`,
                    background: "linear-gradient(90deg, #FBBF24, #FCD34D)",
                    transition: "width 0.6s ease",
                  }}
                />
              </div>
            </div>
          )}

          {/* QR Code section */}
          <div
            className="flex items-center gap-4"
            style={{
              background: "rgba(255,255,255,0.04)",
              borderRadius: 16,
              padding: 14,
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {qrDataUrl && (
              <div style={{ borderRadius: 10, overflow: "hidden", flexShrink: 0, background: "#fff", padding: 6 }}>
                <Image
                  src={qrDataUrl}
                  alt={`QR ${animal.name}`}
                  width={72}
                  height={72}
                  style={{ display: "block" }}
                  unoptimized
                />
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.6)", marginBottom: 2 }}>
                {t.cardScanProfile || "Scan to view profile"}
              </p>
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", wordBreak: "break-all" }}>
                pawband.ch/animals/{(params.id as string).slice(0, 8)}...
              </p>
            </div>
          </div>

          {/* Pawband branding */}
          <div className="flex items-center justify-center gap-2" style={{ marginTop: 18 }}>
            <span style={{ fontSize: 16 }}>{"\u{1F43E}"}</span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 800,
                background: "linear-gradient(135deg, #FBBF24, #A78BFA)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Pawband
            </span>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontWeight: 500 }}>
              {t.cardDigitalPassport || "Digital Passport"}
            </span>
          </div>
        </div>
      </div>

      {/* ===== SHARE BUTTONS (below card) ===== */}
      <div className="w-full max-w-sm mt-6 flex flex-col gap-3">
        {/* Share button (Web Share API) */}
        {typeof navigator !== "undefined" && "share" in navigator && (
          <button
            onClick={handleShare}
            className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition"
            style={{
              background: "linear-gradient(135deg, #FBBF24, #EA580C)",
              color: "#fff",
              boxShadow: "0 4px 24px rgba(249,115,22,0.3)",
            }}
          >
            {"\u{1F4E4}"} {t.cardShare || "Share"}
          </button>
        )}

        <div className="flex gap-3">
          {/* Copy link */}
          <button
            onClick={handleCopyLink}
            className="flex-1 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: copied ? "#34d399" : "rgba(255,255,255,0.7)",
            }}
          >
            {copied ? "\u2713" : "\u{1F517}"} {copied ? (t.cardCopied || "Copied!") : (t.cardCopyLink || "Copy link")}
          </button>

          {/* Download */}
          <button
            onClick={handleDownload}
            className="flex-1 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.7)",
            }}
          >
            {"\u{1F4E5}"} {t.cardDownload || "Download"}
          </button>
        </div>

        {/* Back to profile link */}
        <a
          href={`/animals/${params.id}`}
          className="text-center py-2"
          style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", textDecoration: "none" }}
        >
          {"\u2190"} {t.animalBackCatalog || "Back"}
        </a>
      </div>
    </div>
  );
}
