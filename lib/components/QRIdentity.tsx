"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import QRCode from "qrcode";

type QRProps = {
  animalId: string;
  animalName: string;
  species: string;
  breed: string | null;
  canton: string | null;
  ownerName: string | null;
  lang: string;
};

const LABELS: Record<string, Record<string, string>> = {
  fr: { title: "Identité digitale", sub: "Scannez ce QR code pour accéder à la fiche de", share: "Partager", download: "Télécharger", lost: "En cas de perte", lostDesc: "Ce QR code permet à quiconque de retrouver les infos de votre animal" },
  de: { title: "Digitale Identität", sub: "Scannen Sie diesen QR-Code für das Profil von", share: "Teilen", download: "Herunterladen", lost: "Bei Verlust", lostDesc: "Dieser QR-Code ermöglicht jedem, die Infos Ihres Tieres zu finden" },
  it: { title: "Identità digitale", sub: "Scansiona questo QR code per accedere al profilo di", share: "Condividi", download: "Scarica", lost: "In caso di smarrimento", lostDesc: "Questo QR code permette a chiunque di trovare le info del vostro animale" },
  en: { title: "Digital identity", sub: "Scan this QR code to access the profile of", share: "Share", download: "Download", lost: "If lost", lostDesc: "This QR code allows anyone to find your pet's info" },
};

export function QRIdentity({ animalId, animalName, species, breed, canton, ownerName, lang }: QRProps) {
  const [showQR, setShowQR] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const l = LABELS[lang] || LABELS.fr;
  const profileUrl = typeof window !== "undefined"
    ? `${window.location.origin}/animals/${animalId}`
    : `https://pawlyapp.ch/animals/${animalId}`;

  useEffect(() => {
    if (showQR && profileUrl) {
      QRCode.toDataURL(profileUrl, { width: 250, margin: 2, color: { dark: "#1a1714", light: "#ffffff" } })
        .then(setQrDataUrl);
    }
  }, [showQR, profileUrl]);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${animalName} — Pawly`,
          text: `Fiche de ${animalName} sur Pawly`,
          url: profileUrl,
        });
      } catch {}
    } else {
      await navigator.clipboard.writeText(profileUrl);
      toast.success("Lien copié !");
    }
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `${animalName}-pawly-qr.png`;
    a.click();
  };

  if (!showQR) {
    return (
      <button onClick={() => setShowQR(true)}
        className="w-full py-3 bg-[var(--c-card)] border border-[var(--c-border)] text-[var(--c-text-muted)] font-bold rounded-xl text-sm flex items-center justify-center gap-2">
        📱 QR Code — {l.title}
      </button>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center" style={{ color: "#1a1714" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <h3 style={{ fontWeight: 800, fontSize: 15 }}>📱 {l.title}</h3>
        <button onClick={() => setShowQR(false)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#9ca3af" }}>✕</button>
      </div>

      <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 12 }}>{l.sub} <strong>{animalName}</strong></p>

      {/* QR Code */}
      <div style={{ background: "#fff", borderRadius: 16, padding: 16, display: "inline-block", marginBottom: 12, border: "2px solid #f0f0f0" }}>
        {qrDataUrl && <Image src={qrDataUrl} alt={`QR ${animalName}`} width={200} height={200} style={{ display: "block" }} unoptimized />}
      </div>

      {/* Info sous le QR */}
      <div style={{ background: "#F9FAFB", borderRadius: 12, padding: 12, marginBottom: 12, textAlign: "left" }}>
        <div style={{ fontSize: 14, fontWeight: 800 }}>🐾 {animalName}</div>
        <div style={{ fontSize: 12, color: "#6b7280" }}>{breed || species}{canton ? ` · ${canton}` : ""}</div>
        {ownerName && <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>Propriétaire : {ownerName}</div>}
      </div>

      {/* Info perte */}
      <div style={{ background: "#FEF3C7", borderRadius: 10, padding: 10, marginBottom: 12, textAlign: "left" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#92400E" }}>🔍 {l.lost}</div>
        <div style={{ fontSize: 10, color: "#92400E" }}>{l.lostDesc}</div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={handleShare}
          style={{ flex: 1, padding: "10px", background: "#f97316", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
          📤 {l.share}
        </button>
        <button onClick={handleDownload}
          style={{ flex: 1, padding: "10px", background: "#F3F4F6", color: "#1a1714", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
          📥 {l.download}
        </button>
      </div>
    </div>
  );
}
