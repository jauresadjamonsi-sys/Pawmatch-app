"use client";

import { useCallback, useState } from "react";

type ShareCardProps = {
  animalName: string;
  breed: string;
  photoUrl?: string;
  personalityEmoji: string;
  personalityName: string;
  personalityTagline: string;
  personalityColor: string;
  traits: string[];
  lang: string;
};

const SHARE_LABELS: Record<string, { share: string; copied: string; shareText: string; via: string }> = {
  fr: { share: "📤 Partager le profil", copied: "✅ Lien copié !", shareText: "Découvre la personnalité de {name} sur Pawly !", via: "via Pawly — copains de balade pour ton animal" },
  de: { share: "📤 Profil teilen", copied: "✅ Link kopiert!", shareText: "Entdecke {name}s Persönlichkeit auf Pawly!", via: "via Pawly — Spaziergang-Freunde für dein Tier" },
  it: { share: "📤 Condividi il profilo", copied: "✅ Link copiato!", shareText: "Scopri la personalità di {name} su Pawly!", via: "via Pawly — amici di passeggiata per il tuo animale" },
  en: { share: "📤 Share profile", copied: "✅ Link copied!", shareText: "Discover {name}'s personality on Pawly!", via: "via Pawly — walk buddies for your pet" },
};

export function SharePersonalityCard({
  animalName, breed, photoUrl, personalityEmoji,
  personalityName, personalityTagline, personalityColor, traits, lang,
}: ShareCardProps) {
  const [status, setStatus] = useState<"idle" | "sharing" | "copied">("idle");
  const labels = SHARE_LABELS[lang] || SHARE_LABELS.fr;

  const generateCard = useCallback(async (): Promise<Blob | null> => {
    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 800;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 800);
    grad.addColorStop(0, "#0f0c1a");
    grad.addColorStop(1, "#1a1030");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 600, 800);

    // Border accent
    ctx.strokeStyle = personalityColor + "60";
    ctx.lineWidth = 3;
    ctx.roundRect(20, 20, 560, 760, 24);
    ctx.stroke();

    // Inner subtle card
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.roundRect(30, 30, 540, 740, 20);
    ctx.fill();

    // Photo circle
    if (photoUrl) {
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject();
          img.src = photoUrl;
        });
        ctx.save();
        ctx.beginPath();
        ctx.arc(300, 160, 80, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, 220, 80, 160, 160);
        ctx.restore();
        // Border
        ctx.beginPath();
        ctx.arc(300, 160, 82, 0, Math.PI * 2);
        ctx.strokeStyle = personalityColor;
        ctx.lineWidth = 3;
        ctx.stroke();
      } catch {
        // Fallback: emoji circle
        ctx.beginPath();
        ctx.arc(300, 160, 80, 0, Math.PI * 2);
        ctx.fillStyle = personalityColor + "20";
        ctx.fill();
        ctx.font = "60px serif";
        ctx.textAlign = "center";
        ctx.fillText("🐾", 300, 180);
      }
    } else {
      ctx.beginPath();
      ctx.arc(300, 160, 80, 0, Math.PI * 2);
      ctx.fillStyle = personalityColor + "20";
      ctx.fill();
      ctx.font = "60px serif";
      ctx.textAlign = "center";
      ctx.fillText("🐾", 300, 180);
    }

    // Animal name
    ctx.textAlign = "center";
    ctx.font = "bold 36px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillStyle = "#f0eeff";
    ctx.fillText(animalName, 300, 290);

    // Breed
    ctx.font = "16px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillStyle = "#9b93b8";
    ctx.fillText(breed, 300, 318);

    // Personality emoji (big)
    ctx.font = "72px serif";
    ctx.fillText(personalityEmoji, 300, 410);

    // Personality name
    ctx.font = "bold 28px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillStyle = personalityColor;
    ctx.fillText(personalityName, 300, 460);

    // Tagline
    ctx.font = "italic 16px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillStyle = "#9b93b8";
    ctx.fillText(`"${personalityTagline}"`, 300, 495);

    // Traits (pills)
    if (traits.length > 0) {
      const displayTraits = traits.slice(0, 5);
      const traitText = displayTraits.join("  ·  ");
      ctx.font = "14px -apple-system, BlinkMacSystemFont, sans-serif";

      // Background pill
      const textWidth = ctx.measureText(traitText).width;
      ctx.fillStyle = personalityColor + "15";
      ctx.roundRect(300 - textWidth / 2 - 16, 525, textWidth + 32, 32, 16);
      ctx.fill();

      ctx.fillStyle = personalityColor;
      ctx.fillText(traitText, 300, 546);
    }

    // Divider
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(100, 600);
    ctx.lineTo(500, 600);
    ctx.stroke();

    // CTA
    ctx.font = "bold 18px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillStyle = "#f0eeff";
    ctx.fillText("Quel est le profil de ton animal ?", 300, 650);

    // Sub CTA
    ctx.font = "14px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillStyle = "#9b93b8";
    ctx.fillText("Fais le test gratuit sur Pawly 🐾", 300, 680);

    // Pawly branding
    ctx.font = "bold 24px -apple-system, BlinkMacSystemFont, sans-serif";
    const brandGrad = ctx.createLinearGradient(240, 730, 360, 730);
    brandGrad.addColorStop(0, "#f97316");
    brandGrad.addColorStop(1, "#fb923c");
    ctx.fillStyle = brandGrad;
    ctx.fillText("🐾 Pawly", 300, 740);

    ctx.font = "11px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillStyle = "#6b6280";
    ctx.fillText("pawly.ch", 300, 762);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png", 0.95);
    });
  }, [animalName, breed, photoUrl, personalityEmoji, personalityName, personalityTagline, personalityColor, traits]);

  const handleShare = async () => {
    setStatus("sharing");

    const shareUrl = window.location.href;
    const shareText = labels.shareText.replace("{name}", animalName);

    // Try generating the card image
    const blob = await generateCard();

    if (navigator.share) {
      try {
        const shareData: ShareData = {
          title: `${personalityEmoji} ${animalName} — ${personalityName}`,
          text: `${shareText}\n${labels.via}`,
          url: shareUrl,
        };

        // Add image if supported
        if (blob) {
          const file = new File([blob], `${animalName}-pawly.png`, { type: "image/png" });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            shareData.files = [file];
          }
        }

        await navigator.share(shareData);
        setStatus("idle");
      } catch (err: any) {
        if (err.name !== "AbortError") {
          // Fallback: copy link
          await fallbackCopy(shareUrl);
        } else {
          setStatus("idle");
        }
      }
    } else {
      await fallbackCopy(shareUrl);
    }
  };

  const fallbackCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setStatus("copied");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("idle");
    }
  };

  // Download card image
  const handleDownload = async () => {
    const blob = await generateCard();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${animalName}-pawly.png`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={handleShare}
        disabled={status === "sharing"}
        className="flex-1 py-3 rounded-2xl font-bold text-sm text-center transition-all border-2"
        style={{
          borderColor: personalityColor + "60",
          color: personalityColor,
          background: personalityColor + "10",
        }}
      >
        {status === "copied" ? labels.copied : status === "sharing" ? "..." : labels.share}
      </button>
      <button
        onClick={handleDownload}
        className="py-3 px-4 rounded-2xl font-bold text-sm bg-[var(--c-card)] border border-[var(--c-border)] text-[var(--c-text-muted)]"
        title="Télécharger la carte"
      >
        📥
      </button>
    </div>
  );
}
