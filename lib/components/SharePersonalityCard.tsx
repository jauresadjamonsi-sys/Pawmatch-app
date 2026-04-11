"use client";

import { useRef } from "react";

type ShareProps = {
  animalName: string;
  personality: { name: string; emoji: string; color: string; description: string };
  photoUrl: string | null;
  species: string;
};

export function SharePersonalityCard({ animalName, personality, photoUrl, species }: ShareProps) {

  async function handleShare() {
    // Créer un canvas pour l'image
    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 400;
    const ctx = canvas.getContext("2d")!;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 600, 400);
    grad.addColorStop(0, "#1a1225");
    grad.addColorStop(1, "#2d1f3d");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 600, 400);

    // Decorative circle
    ctx.beginPath();
    ctx.arc(300, 200, 180, 0, Math.PI * 2);
    ctx.fillStyle = personality.color + "15";
    ctx.fill();

    // Emoji
    ctx.font = "60px serif";
    ctx.textAlign = "center";
    ctx.fillText(personality.emoji, 300, 140);

    // Animal name
    ctx.font = "bold 32px -apple-system, sans-serif";
    ctx.fillStyle = "#fff";
    ctx.fillText(animalName, 300, 190);

    // Personality name
    ctx.font = "bold 24px -apple-system, sans-serif";
    ctx.fillStyle = personality.color;
    ctx.fillText(personality.name, 300, 230);

    // Description (truncated)
    ctx.font = "14px -apple-system, sans-serif";
    ctx.fillStyle = "#9ca3af";
    const desc = personality.description.slice(0, 60) + "...";
    ctx.fillText(desc, 300, 265);

    // Pawly branding
    ctx.font = "bold 16px -apple-system, sans-serif";
    ctx.fillStyle = "#F59E0B";
    ctx.fillText("pawlyapp.ch", 300, 340);
    ctx.font = "12px -apple-system, sans-serif";
    ctx.fillStyle = "#6b7280";
    ctx.fillText("Découvre la personnalité de ton animal →", 300, 365);

    // Convert to blob and share
    canvas.toBlob(async (blob) => {
      if (!blob) return;

      if (typeof navigator.share === "function" && typeof navigator.canShare === "function") {
        try {
          const file = new File([blob], `${animalName}-pawly.png`, { type: "image/png" });
          await navigator.share({
            title: `${animalName} est ${personality.name} !`,
            text: `Mon animal ${animalName} est "${personality.name}" ${personality.emoji} sur Pawly ! Et le tien ? 👉 pawlyapp.ch`,
            files: [file],
          });
        } catch {
          // Fallback: download
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url; a.download = `${animalName}-pawly.png`; a.click();
        }
      } else {
        // Fallback: WhatsApp
        const text = encodeURIComponent(`Mon animal ${animalName} est "${personality.name}" ${personality.emoji} sur Pawly ! Et le tien ? 👉 https://pawlyapp.ch`);
        window.open(`https://wa.me/?text=${text}`);
      }
    }, "image/png");
  }

  return (
    <button onClick={handleShare}
      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: 12, background: `${personality.color}15`, border: `1.5px solid ${personality.color}30`, borderRadius: 12, color: personality.color, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
      📤 Partager la personnalité de {animalName}
    </button>
  );
}
