"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useAppContext } from "@/lib/contexts/AppContext";
import { toast } from "sonner";
import QRCode from "qrcode";

const REWARDS = [
  { friends: 1, badge: "🎖️ Ambassadeur", reward: "Badge exclusif" },
  { friends: 3, badge: "🥈 Influenceur", reward: "1 mois Premium gratuit" },
  { friends: 5, badge: "🥇 Star", reward: "3 mois Premium gratuit" },
  { friends: 10, badge: "👑 Légende", reward: "1 an Premium gratuit" },
];

export default function SharePage() {
  const { t } = useAppContext();
  const [profile, setProfile] = useState<any>(null);
  const [referralCount, setReferralCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const supabase = createClient();

  const referralCode = profile?.referral_code || "";
  const shareUrl = `https://pawlyapp.ch/signup?ref=${referralCode}`;
  const shareText = `🐾 Mon animal a trouvé des copains de balade sur Pawly ! Rejoins la communauté suisse des propriétaires d'animaux → ${shareUrl}`;
  const [storyCardUrl, setStoryCardUrl] = useState<string>("");

  /** Convert canvas to Blob (iOS-safe, avoids data URL fetch issues) */
  const canvasToBlob = (canvas: HTMLCanvasElement): Promise<Blob> =>
    new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
        "image/jpeg",
        0.92
      );
    });

  /** Generate a story-ready image with Ruby + QR code + branding */
  const generateStoryCard = useCallback(async (): Promise<{ blob: Blob; dataUrl: string }> => {
    if (storyCardUrl) {
      // Re-create blob from cached data URL
      const res = await fetch(storyCardUrl);
      return { blob: await res.blob(), dataUrl: storyCardUrl };
    }
    const canvas = document.createElement("canvas");
    // Instagram story dimensions (9:16)
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No canvas context");

    // Background gradient
    const bg = ctx.createLinearGradient(0, 0, 1080, 1920);
    bg.addColorStop(0, "#2a2248");
    bg.addColorStop(0.5, "#3d2810");
    bg.addColorStop(1, "#1a1714");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1080, 1920);

    // Subtle pattern dots
    ctx.fillStyle = "rgba(34, 197, 94,0.05)";
    for (let i = 0; i < 60; i++) {
      const x = Math.random() * 1080;
      const y = Math.random() * 1920;
      ctx.beginPath();
      ctx.arc(x, y, Math.random() * 30 + 10, 0, Math.PI * 2);
      ctx.fill();
    }

    // Ruby photo — circular with glow
    try {
      const rubyImg = new window.Image();
      rubyImg.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        rubyImg.onload = () => resolve();
        rubyImg.onerror = () => reject();
        rubyImg.src = "/ruby-hero.jpg";
      });

      // Orange glow
      ctx.save();
      ctx.shadowColor = "rgba(34, 197, 94,0.6)";
      ctx.shadowBlur = 60;
      ctx.beginPath();
      ctx.arc(540, 520, 200, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(34, 197, 94,0.3)";
      ctx.fill();
      ctx.restore();

      // Circular mask for Ruby
      ctx.save();
      ctx.beginPath();
      ctx.arc(540, 520, 190, 0, Math.PI * 2);
      ctx.clip();
      const size = Math.min(rubyImg.width, rubyImg.height);
      const sx = (rubyImg.width - size) / 2;
      const sy = (rubyImg.height - size) / 2;
      ctx.drawImage(rubyImg, sx, sy, size, size, 350, 330, 380, 380);
      ctx.restore();

      // Orange ring
      ctx.strokeStyle = "rgba(34, 197, 94,0.7)";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(540, 520, 193, 0, Math.PI * 2);
      ctx.stroke();
    } catch {
      // If Ruby fails to load, draw paw emoji
      ctx.font = "180px serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#FBBF24";
      ctx.fillText("🐾", 540, 560);
    }

    // "PAWLY" title
    ctx.font = "bold 72px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#FBBF24";
    ctx.fillText("PAWLY", 540, 820);

    // Tagline
    ctx.font = "32px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText("Trouve des copains de balade", 540, 880);
    ctx.fillText("pour ton animal", 540, 920);

    // Divider line
    const divGrad = ctx.createLinearGradient(300, 980, 780, 980);
    divGrad.addColorStop(0, "transparent");
    divGrad.addColorStop(0.5, "rgba(34, 197, 94,0.6)");
    divGrad.addColorStop(1, "transparent");
    ctx.strokeStyle = divGrad;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(300, 980);
    ctx.lineTo(780, 980);
    ctx.stroke();

    // Features
    ctx.font = "28px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    const features = [
      "🐕 Balades entre compagnons",
      "🧠 Match de personnalité IA",
      "📍 Animaux près de chez toi",
      "🇨🇭 100% suisse",
    ];
    features.forEach((f, i) => {
      ctx.fillText(f, 540, 1050 + i * 55);
    });

    // QR Code
    try {
      const qrData = await QRCode.toDataURL(shareUrl, { width: 280, margin: 2, color: { dark: "#fff", light: "rgba(0,0,0,0)" } });
      const qrImg = new window.Image();
      await new Promise<void>((resolve) => { qrImg.onload = () => resolve(); qrImg.src = qrData; });
      // QR background rounded rect
      ctx.fillStyle = "rgba(255,255,255,0.1)";
      const qrX = 400, qrY = 1340, qrW = 280, qrH = 280, r = 20;
      ctx.beginPath();
      ctx.moveTo(qrX + r, qrY);
      ctx.lineTo(qrX + qrW - r, qrY);
      ctx.quadraticCurveTo(qrX + qrW, qrY, qrX + qrW, qrY + r);
      ctx.lineTo(qrX + qrW, qrY + qrH - r);
      ctx.quadraticCurveTo(qrX + qrW, qrY + qrH, qrX + qrW - r, qrY + qrH);
      ctx.lineTo(qrX + r, qrY + qrH);
      ctx.quadraticCurveTo(qrX, qrY + qrH, qrX, qrY + qrH - r);
      ctx.lineTo(qrX, qrY + r);
      ctx.quadraticCurveTo(qrX, qrY, qrX + r, qrY);
      ctx.closePath();
      ctx.fill();
      ctx.drawImage(qrImg, 400, 1340, 280, 280);
    } catch {}

    // CTA
    ctx.font = "bold 30px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillStyle = "#FBBF24";
    ctx.fillText("Scanne pour rejoindre", 540, 1680);

    // Footer
    ctx.font = "22px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillText("pawlyapp.ch", 540, 1780);

    // Use canvas.toBlob for iOS compatibility (avoids data URL size limits)
    const blob = await canvasToBlob(canvas);
    const url = canvas.toDataURL("image/jpeg", 0.92);
    setStoryCardUrl(url);
    return { blob, dataUrl: url };
  }, [shareUrl, storyCardUrl]);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (data) setProfile(data);
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("referred_by", data?.referral_code);
      setReferralCount(count || 0);
    }
    load();
  }, []);

  useEffect(() => {
    if (shareUrl) {
      QRCode.toDataURL(shareUrl, { width: 200, margin: 2, color: { dark: "#000", light: "#fff" } })
        .then(setQrDataUrl);
    }
  }, [shareUrl]);

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentTier = REWARDS.filter(r => referralCount >= r.friends).pop();
  const nextTier = REWARDS.find(r => referralCount < r.friends);

  if (!profile) {
    return (
      <div className="min-h-screen bg-[var(--c-deep)] flex items-center justify-center">
        <div className="text-center glass-strong rounded-2xl p-8 max-w-sm">
          <p className="text-4xl mb-4">🔒</p>
          <p className="text-[var(--c-text)] font-bold mb-2">Connecte-toi pour partager</p>
          <Link href="/login" className="btn-futuristic px-6 py-2 mt-4 inline-block text-sm">Se connecter</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--c-deep)] p-4 md:p-8 page-transition">
      <div className="aurora-bg" />
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="text-center mb-8 animate-slide-up">
          <div className="flex items-center justify-center gap-3 mb-2">
            <button onClick={() => window.history.length > 1 ? window.history.back() : (window.location.href = "/feed")} aria-label="Retour" className="inline-flex items-center justify-center w-9 h-9 rounded-full transition-all active:scale-90 flex-shrink-0" style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--c-text)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <h1 className="text-3xl font-extrabold gradient-text">{t.shareTitle}</h1>
          </div>
          <p className="text-[var(--c-text-muted)]">{t.shareDesc}</p>
        </div>

        {/* Referral stats */}
        <div className="glass-strong gradient-border rounded-2xl p-6 mb-6 text-center animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <p className="text-5xl font-black gradient-text-warm mb-1">{referralCount}</p>
          <p className="text-sm text-[var(--c-text-muted)]">{t.shareFriends}</p>
          {currentTier && (
            <p className="mt-2 text-sm font-bold text-amber-300">{currentTier.badge}</p>
          )}
          {nextTier && (
            <p className="mt-1 text-xs text-[var(--c-text-muted)]">
              Encore {nextTier.friends - referralCount} ami(s) pour {nextTier.badge}
            </p>
          )}
        </div>

        {/* Share link */}
        <div className="glass rounded-2xl p-5 mb-4 animate-slide-up" style={{ animationDelay: "0.15s" }}>
          <p className="text-xs text-[var(--c-text-muted)] mb-2 font-semibold uppercase tracking-wider">Ton lien unique</p>
          <div className="flex gap-2">
            <input
              readOnly
              value={shareUrl}
              className="input-futuristic flex-1 text-sm truncate"
            />
            <button
              onClick={copyLink}
              className="btn-futuristic px-4 py-2 text-sm font-bold whitespace-nowrap neon-green"
            >
              {copied ? "✅ " + t.shareCopied : "📋 " + t.shareCopy}
            </button>
          </div>
        </div>

        {/* Share buttons */}
        <div className="grid grid-cols-3 gap-3 mb-6 animate-slide-up" style={{ animationDelay: "0.2s" }}>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noopener"
            className="glass card-futuristic rounded-xl p-4 text-center transition-all duration-300"
          >
            <span className="text-2xl block mb-1">💬</span>
            <span className="text-xs font-semibold text-[var(--c-text)]">{t.shareWhatsapp}</span>
          </a>
          {/* Instagram/TikTok — share image via Web Share API or save */}
          <button
            className="glass card-futuristic rounded-xl p-4 text-center transition-all duration-300"
            onClick={async () => {
              toast.loading("Creation de la story...", { id: "story" });
              try {
                const { blob, dataUrl } = await generateStoryCard();
                const file = new File([blob], "pawly-story.jpg", { type: "image/jpeg" });
                // Try native share with file (works on iOS/Android — opens share sheet with "Save Image")
                if (typeof navigator.share === "function") {
                  try {
                    if (navigator.canShare?.({ files: [file] })) {
                      toast.dismiss("story");
                      await navigator.share({ title: "Pawly", text: shareText, files: [file] });
                      return;
                    }
                  } catch { /* canShare might throw on some browsers */ }
                  // Try sharing without files
                  toast.dismiss("story");
                  try { await navigator.share({ title: "Pawly", text: shareText, url: shareUrl }); return; } catch {}
                }
                // Fallback: download via blob URL (not data URL)
                const blobUrl = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = blobUrl;
                link.download = "pawly-story.jpg";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
                toast.success("Image sauvegardee ! Partage-la sur Instagram, TikTok ou autre", { id: "story", duration: 5000 });
              } catch (err) {
                toast.error("Erreur lors de la creation", { id: "story" });
              }
            }}
          >
            <span className="text-2xl block mb-1">📸</span>
            <span className="text-xs font-semibold text-[var(--c-text)]">Story</span>
          </button>
          {/* Save story card to device — iOS compatible */}
          <button
            className="glass card-futuristic rounded-xl p-4 text-center transition-all duration-300"
            onClick={async () => {
              toast.loading("Creation de l'image...", { id: "save" });
              try {
                const { blob } = await generateStoryCard();
                const file = new File([blob], "pawly-story.jpg", { type: "image/jpeg" });
                // iOS: Use native share API → shows "Save Image" in share sheet
                if (typeof navigator.share === "function") {
                  try {
                    if (navigator.canShare?.({ files: [file] })) {
                      toast.dismiss("save");
                      await navigator.share({ files: [file] });
                      toast.success("Image partagee !", { duration: 2000 });
                      return;
                    }
                  } catch { /* canShare might throw */ }
                }
                // Fallback: direct download via blob URL
                const blobUrl = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = blobUrl;
                link.download = "pawly-story.jpg";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
                toast.success("Image sauvegardee !", { id: "save", duration: 3000 });
              } catch (err) {
                toast.error("Erreur lors de la creation", { id: "save" });
              }
            }}
          >
            <span className="text-2xl block mb-1">💾</span>
            <span className="text-xs font-semibold text-[var(--c-text)]">Sauvegarder</span>
          </button>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
            target="_blank"
            rel="noopener"
            className="glass card-futuristic rounded-xl p-4 text-center transition-all duration-300"
          >
            <span className="text-2xl block mb-1">📘</span>
            <span className="text-xs font-semibold text-[var(--c-text)]">{t.shareFacebook}</span>
          </a>
          <a
            href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noopener"
            className="glass card-futuristic rounded-xl p-4 text-center transition-all duration-300"
          >
            <span className="text-2xl block mb-1">✈️</span>
            <span className="text-xs font-semibold text-[var(--c-text)]">{t.shareTelegram}</span>
          </a>
          <a
            href={`sms:?body=${encodeURIComponent(shareText)}`}
            className="glass card-futuristic rounded-xl p-4 text-center transition-all duration-300"
          >
            <span className="text-2xl block mb-1">📱</span>
            <span className="text-xs font-semibold text-[var(--c-text)]">{t.shareSMS}</span>
          </a>
          {/* Native share (other apps) */}
          {typeof navigator !== "undefined" && "share" in navigator && (
            <button
              className="glass card-futuristic rounded-xl p-4 text-center transition-all duration-300"
              onClick={async () => {
                try { await navigator.share({ title: "Pawly", text: shareText, url: shareUrl }); }
                catch { /* cancelled */ }
              }}
            >
              <span className="text-2xl block mb-1">📤</span>
              <span className="text-xs font-semibold text-[var(--c-text)]">{t.shareMore || "Plus"}</span>
            </button>
          )}
        </div>

        {/* QR Code */}
        <div className="glass rounded-2xl p-6 mb-6 text-center animate-slide-up" style={{ animationDelay: "0.25s" }}>
          <p className="text-sm font-bold text-[var(--c-text)] mb-4">{t.shareQR}</p>
          {qrDataUrl && <Image src={qrDataUrl} alt="QR Code" width={200} height={200} className="mx-auto rounded-xl" unoptimized />}
          <p className="text-[10px] text-[var(--c-text-muted)] mt-3">Scanne ce code pour rejoindre Pawly</p>
        </div>

        {/* Rewards tiers */}
        <div className="glass rounded-2xl p-5 animate-slide-up" style={{ animationDelay: "0.3s" }}>
          <h3 className="text-sm font-bold text-[var(--c-text)] mb-4">{t.shareRewards}</h3>
          <div className="space-y-3">
            {REWARDS.map((r) => {
              const unlocked = referralCount >= r.friends;
              return (
                <div
                  key={r.friends}
                  className={"flex items-center gap-3 p-3 rounded-xl transition-all duration-300 " +
                    (unlocked ? "glass neon-green" : "opacity-60")}
                >
                  <span className="text-2xl">{r.badge.split(" ")[0]}</span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-[var(--c-text)]">
                      {r.friends} {t.shareFriends}
                    </p>
                    <p className="text-xs text-[var(--c-text-muted)]">{r.reward}</p>
                  </div>
                  {unlocked && <span className="text-amber-300 text-lg">✅</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Back */}
        <div className="text-center mt-6">
          <Link href="/profile" className="text-sm text-[var(--c-text-muted)] hover:text-amber-300 transition">
            ← Retour au profil
          </Link>
        </div>
      </div>
    </div>
  );
}
