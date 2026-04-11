"use client";

import { useState, useEffect } from "react";

interface ReferralCardProps {
  userId: string;
}

export default function ReferralCard({ userId }: ReferralCardProps) {
  const [referralCode, setReferralCode] = useState("");
  const [referralCount, setReferralCount] = useState(0);
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [inputCode, setInputCode] = useState("");
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<{ success?: boolean; message?: string } | null>(null);

  useEffect(() => {
    async function fetchReferralData() {
      try {
        const res = await fetch("/api/referral");
        if (res.ok) {
          const data = await res.json();
          setReferralCode(data.referral_code || "");
          setReferralCount(data.referral_count || 0);
          setCoinsEarned(data.coins_earned || 0);
        }
      } catch {
        // Fallback: use first 8 chars of userId
        setReferralCode(userId.substring(0, 8));
      }
    }
    fetchReferralData();
  }, [userId]);

  const shareLink = referralCode
    ? `https://pawband.ch/signup?ref=${referralCode}`
    : `https://pawband.ch/signup?ref=${userId}`;

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(referralCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      const input = document.createElement("input");
      input.value = referralCode;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement("input");
      input.value = shareLink;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Rejoins Pawband !",
          text: "Rejoins Pawband, l'app qui connecte les proprios d'animaux en Suisse !",
          url: shareLink,
        });
      } catch {
        // User cancelled or share failed, fallback to copy
        copyLink();
      }
    } else {
      copyLink();
    }
  }

  async function applyCode() {
    if (!inputCode.trim()) return;
    setApplying(true);
    setApplyResult(null);
    try {
      const res = await fetch("/api/referral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: inputCode.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setApplyResult({
          success: true,
          message: `Parrainage applique ! +${data.coins_earned || 10} PawCoins${data.referrer_name ? ` (parrain : ${data.referrer_name})` : ""}`,
        });
        setInputCode("");
      } else {
        setApplyResult({ success: false, message: data.error || "Erreur lors de l'application du code" });
      }
    } catch {
      setApplyResult({ success: false, message: "Erreur de connexion" });
    }
    setApplying(false);
  }

  const shareText = encodeURIComponent(
    "Rejoins Pawband, l'app qui connecte les proprios d'animaux en Suisse ! Inscris-toi avec mon lien : " + shareLink
  );
  const whatsappUrl = `https://wa.me/?text=${shareText}`;
  const instagramUrl = `/share/promo?ref=${userId}`;
  const emailUrl = `mailto:?subject=${encodeURIComponent("Rejoins Pawband !")}&body=${shareText}`;

  return (
    <div className="glass rounded-2xl p-6 mb-6" style={{ border: "1px solid rgba(251,191,36,0.2)", boxShadow: "0 0 20px rgba(251,191,36,0.05)" }}>
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">{"🎁"}</span>
        <div>
          <h3 className="font-bold text-[var(--c-text)]">Parrainage</h3>
          <p className="text-xs text-[var(--c-text-muted)]">Invite tes amis et gagne des PawCoins !</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="glass rounded-xl p-3 text-center" style={{ border: "1px solid rgba(251,191,36,0.15)" }}>
          <p className="text-2xl font-black" style={{ color: "#FBBF24", textShadow: "0 0 10px rgba(251,191,36,0.3)" }}>{referralCount}</p>
          <p className="text-[10px] text-[var(--c-text-muted)] font-bold uppercase">
            {referralCount === 1 ? "Parrainage" : "Parrainages"}
          </p>
        </div>
        <div className="glass rounded-xl p-3 text-center" style={{ border: "1px solid rgba(252,211,77,0.15)" }}>
          <p className="text-2xl font-black" style={{ color: "#FCD34D", textShadow: "0 0 10px rgba(252,211,77,0.3)" }}>{coinsEarned}</p>
          <p className="text-[10px] text-[var(--c-text-muted)] font-bold uppercase">PawCoins gagnes</p>
        </div>
      </div>

      {/* Referral code - copyable */}
      {referralCode && (
        <div className="mb-4">
          <p className="text-xs text-[var(--c-text-muted)] mb-1.5 font-medium">Ton code de parrainage</p>
          <button
            onClick={copyCode}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition hover:scale-[1.01]"
            style={{
              background: "var(--c-glass)",
              border: "1.5px dashed rgba(251,191,36,0.35)",
            }}
          >
            <span className="font-mono text-lg font-black tracking-widest" style={{ color: "var(--c-text)" }}>
              {referralCode.toUpperCase()}
            </span>
            <span className="text-xs font-bold px-2 py-1 rounded-lg" style={{
              background: codeCopied ? "rgba(251,191,36,0.2)" : "rgba(251,191,36,0.15)",
              color: codeCopied ? "#FBBF24" : "#FBBF24",
              border: codeCopied ? "1px solid rgba(251,191,36,0.3)" : "1px solid rgba(251,191,36,0.25)",
            }}>
              {codeCopied ? "Copie !" : "Copier"}
            </span>
          </button>
        </div>
      )}

      {/* Share link */}
      <div className="mb-4">
        <p className="text-xs text-[var(--c-text-muted)] mb-1.5 font-medium">Lien de partage</p>
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={shareLink}
            className="flex-1 px-3 py-2 rounded-xl text-xs truncate outline-none"
            style={{
              background: "var(--c-glass)",
              border: "1px solid var(--c-border)",
              color: "var(--c-text-muted)",
            }}
          />
          <button
            onClick={copyLink}
            className="px-3 py-2 text-xs font-bold rounded-xl transition whitespace-nowrap"
            style={{
              background: copied ? "rgba(251,191,36,0.2)" : "rgba(251,191,36,0.15)",
              color: copied ? "#FBBF24" : "#FBBF24",
              border: copied ? "1px solid rgba(251,191,36,0.3)" : "1px solid rgba(251,191,36,0.25)",
            }}
          >
            {copied ? "Copie !" : "Copier"}
          </button>
        </div>
      </div>

      {/* Partager mon lien - navigator.share */}
      <button
        onClick={handleShare}
        className="w-full py-2.5 rounded-xl font-bold text-sm mb-4 transition-all hover:scale-[1.02]"
        style={{
          background: "linear-gradient(135deg, #FBBF24, #F59E0B)",
          color: "#fff",
          boxShadow: "0 4px 16px rgba(251,191,36,0.25)",
        }}
      >
        {"📤"} Partager mon lien
      </button>

      {/* Social share buttons */}
      <div className="flex gap-2 mb-5">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-2 text-center text-xs font-bold rounded-xl transition"
          style={{
            background: "rgba(251,191,36,0.12)",
            color: "#FBBF24",
            border: "1px solid rgba(251,191,36,0.2)",
          }}
        >
          WhatsApp
        </a>
        <a
          href={instagramUrl}
          className="flex-1 py-2 text-center text-xs font-bold rounded-xl transition"
          style={{
            background: "linear-gradient(135deg, rgba(240,148,51,0.12), rgba(220,39,67,0.12), rgba(188,24,136,0.12))",
            color: "#e1306c",
            border: "1px solid rgba(220,39,67,0.2)",
          }}
        >
          Instagram
        </a>
        <a
          href={emailUrl}
          className="flex-1 py-2 text-center text-xs font-bold rounded-xl transition"
          style={{
            background: "rgba(168,85,247,0.12)",
            color: "#a78bfa",
            border: "1px solid rgba(168,85,247,0.2)",
          }}
        >
          Email
        </a>
      </div>

      {/* Separator */}
      <div className="w-full h-px mb-5" style={{ background: "var(--c-border)" }} />

      {/* Enter someone else's referral code */}
      <div>
        <p className="text-xs text-[var(--c-text-muted)] mb-1.5 font-medium">Tu as un code de parrainage ?</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={inputCode}
            onChange={(e) => { setInputCode(e.target.value); setApplyResult(null); }}
            placeholder="Entre le code ici..."
            className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{
              background: "var(--c-glass)",
              border: "1px solid var(--c-border)",
              color: "var(--c-text)",
            }}
          />
          <button
            onClick={applyCode}
            disabled={!inputCode.trim() || applying}
            className="px-4 py-2.5 text-sm font-bold rounded-xl transition disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #3b82f6, #2563eb)",
              color: "#fff",
              boxShadow: "0 2px 12px rgba(59,130,246,0.2)",
            }}
          >
            {applying ? "..." : "Appliquer"}
          </button>
        </div>
        {applyResult && (
          <p
            className="text-xs mt-2 font-medium"
            style={{
              color: applyResult.success ? "#FBBF24" : "#f87171",
            }}
          >
            {applyResult.message}
          </p>
        )}
      </div>
    </div>
  );
}
