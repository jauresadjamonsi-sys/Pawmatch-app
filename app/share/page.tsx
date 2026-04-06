"use client";

import { useState, useEffect } from "react";
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

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (data) setProfile(data);
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
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
          <h1 className="text-3xl font-extrabold gradient-text mb-2">{t.shareTitle}</h1>
          <p className="text-[var(--c-text-muted)]">{t.shareDesc}</p>
        </div>

        {/* Referral stats */}
        <div className="glass-strong gradient-border rounded-2xl p-6 mb-6 text-center animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <p className="text-5xl font-black gradient-text-warm mb-1">{referralCount}</p>
          <p className="text-sm text-[var(--c-text-muted)]">{t.shareFriends}</p>
          {currentTier && (
            <p className="mt-2 text-sm font-bold text-orange-400">{currentTier.badge}</p>
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
              className="btn-futuristic px-4 py-2 text-sm font-bold whitespace-nowrap neon-orange"
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
          {/* Instagram — copy text then open app */}
          <button
            className="glass card-futuristic rounded-xl p-4 text-center transition-all duration-300"
            onClick={() => {
              navigator.clipboard.writeText(shareText);
              toast.success(t.shareInstaCopied, { duration: 4000 });
              // Small delay so user sees the toast before Instagram opens
              setTimeout(() => {
                window.location.href = "instagram://app";
                // Fallback if app not installed
                setTimeout(() => { window.open("https://www.instagram.com/", "_blank"); }, 1500);
              }, 800);
            }}
          >
            <span className="text-2xl block mb-1">📸</span>
            <span className="text-xs font-semibold text-[var(--c-text)]">Instagram</span>
          </button>
          {/* TikTok — copy text then open app */}
          <button
            className="glass card-futuristic rounded-xl p-4 text-center transition-all duration-300"
            onClick={() => {
              navigator.clipboard.writeText(shareText);
              toast.success(t.shareTiktokCopied, { duration: 4000 });
              setTimeout(() => {
                window.location.href = "snssdk1233://";
                setTimeout(() => { window.open("https://www.tiktok.com/", "_blank"); }, 1500);
              }, 800);
            }}
          >
            <span className="text-2xl block mb-1">🎵</span>
            <span className="text-xs font-semibold text-[var(--c-text)]">TikTok</span>
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
                    (unlocked ? "glass neon-orange" : "opacity-60")}
                >
                  <span className="text-2xl">{r.badge.split(" ")[0]}</span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-[var(--c-text)]">
                      {r.friends} {t.shareFriends}
                    </p>
                    <p className="text-xs text-[var(--c-text-muted)]">{r.reward}</p>
                  </div>
                  {unlocked && <span className="text-green-400 text-lg">✅</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Back */}
        <div className="text-center mt-6">
          <Link href="/profile" className="text-sm text-[var(--c-text-muted)] hover:text-orange-400 transition">
            ← Retour au profil
          </Link>
        </div>
      </div>
    </div>
  );
}
