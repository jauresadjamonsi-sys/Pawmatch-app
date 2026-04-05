"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface ReferralCardProps {
  userId: string;
}

export default function ReferralCard({ userId }: ReferralCardProps) {
  const [copied, setCopied] = useState(false);
  const [referralCount, setReferralCount] = useState(0);
  const referralLink = `https://pawlyapp.ch/signup?ref=${userId}`;

  useEffect(() => {
    async function fetchReferralCount() {
      const supabase = createClient();
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("referred_by", userId);
      setReferralCount(count || 0);
    }
    fetchReferralCount();
  }, [userId]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement("input");
      input.value = referralLink;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const shareText = encodeURIComponent(
    "Rejoins Pawly, l'app qui connecte les proprios d'animaux en Suisse ! Inscris-toi avec mon lien : " + referralLink
  );
  const shareUrl = encodeURIComponent(referralLink);

  const whatsappUrl = `https://wa.me/?text=${shareText}`;
  const instagramUrl = `/share/promo?ref=${userId}`;
  const emailUrl = `mailto:?subject=${encodeURIComponent("Rejoins Pawly !")}&body=${shareText}`;

  return (
    <div className="bg-[var(--c-card)] border border-[var(--c-border)] rounded-2xl p-6 mb-6 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">🎁</span>
        <div>
          <h3 className="font-bold text-[var(--c-text)]">Invite tes amis</h3>
          <p className="text-xs text-[var(--c-text-muted)]">1 mois premium offert pour chaque ami inscrit !</p>
        </div>
      </div>

      {/* Referral count */}
      <div className="bg-orange-500/10 rounded-xl p-3 mb-4 text-center">
        <p className="text-2xl font-black text-orange-400">{referralCount}</p>
        <p className="text-xs text-[var(--c-text-muted)] font-bold uppercase">
          {referralCount === 1 ? "Ami invit\u00e9" : "Amis invit\u00e9s"}
        </p>
      </div>

      {/* Copy link */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          readOnly
          value={referralLink}
          className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-[var(--c-text-muted)] truncate outline-none"
        />
        <button
          onClick={copyLink}
          className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-xl transition whitespace-nowrap"
        >
          {copied ? "Copi\u00e9 !" : "Copier"}
        </button>
      </div>

      {/* Share buttons */}
      <div className="flex gap-2">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-2.5 text-center text-sm font-bold bg-green-500/15 text-green-400 rounded-xl hover:bg-green-500/25 transition border border-green-500/20"
        >
          WhatsApp
        </a>
        <a
          href={instagramUrl}
          className="flex-1 py-2.5 text-center text-sm font-bold rounded-xl transition border border-pink-500/20"
          style={{
            background: "linear-gradient(135deg, rgba(240,148,51,0.15), rgba(220,39,67,0.15), rgba(188,24,136,0.15))",
            color: "#e1306c",
          }}
        >
          \ud83d\udcf8 Instagram
        </a>
        <a
          href={emailUrl}
          className="flex-1 py-2.5 text-center text-sm font-bold bg-purple-500/15 text-purple-400 rounded-xl hover:bg-purple-500/25 transition border border-purple-500/20"
        >
          Email
        </a>
      </div>
    </div>
  );
}
