"use client";

import { useState } from "react";

type InviteProps = {
  animalName: string;
  lang: string;
};

const INVITE_LABELS: Record<string, { title: string; desc: string; button: string; copied: string; whatsapp: string }> = {
  fr: {
    title: "Invite un ami",
    desc: "Ton animal cherche des copains de balade — plus on est, mieux c'est !",
    button: "📋 Copier le lien",
    copied: "✅ Copié !",
    whatsapp: "Envoyer par WhatsApp",
  },
  de: {
    title: "Lade einen Freund ein",
    desc: "Dein Tier sucht Spaziergang-Freunde — je mehr, desto besser!",
    button: "📋 Link kopieren",
    copied: "✅ Kopiert!",
    whatsapp: "Per WhatsApp senden",
  },
  it: {
    title: "Invita un amico",
    desc: "Il tuo animale cerca amici per le passeggiate — più siamo, meglio è!",
    button: "📋 Copia il link",
    copied: "✅ Copiato!",
    whatsapp: "Invia su WhatsApp",
  },
  en: {
    title: "Invite a friend",
    desc: "Your pet is looking for walk buddies — the more the merrier!",
    button: "📋 Copy link",
    copied: "✅ Copied!",
    whatsapp: "Send via WhatsApp",
  },
};

const INVITE_MSG: Record<string, string> = {
  fr: "🐾 {name} cherche des copains de balade sur Pawly ! Inscris ton animal gratuitement et trouvez-vous pour une balade :",
  de: "🐾 {name} sucht Spaziergang-Freunde auf Pawly! Melde dein Tier kostenlos an:",
  it: "🐾 {name} cerca amici per le passeggiate su Pawly! Iscrivi il tuo animale gratuitamente:",
  en: "🐾 {name} is looking for walk buddies on Pawly! Sign up your pet for free:",
};

export function InviteFriendCard({ animalName, lang }: InviteProps) {
  const [copied, setCopied] = useState(false);
  const labels = INVITE_LABELS[lang] || INVITE_LABELS.fr;
  const inviteUrl = typeof window !== "undefined"
    ? `${window.location.origin}/signup`
    : "https://pawmatch-app-7ukn-beta.vercel.app/signup";

  const msg = (INVITE_MSG[lang] || INVITE_MSG.fr).replace("{name}", animalName);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${msg}\n${inviteUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(`${msg}\n${inviteUrl}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  return (
    <div className="bg-[var(--c-card)] border border-[var(--c-border)] rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">🎉</span>
        <h3 className="font-bold text-[var(--c-text)] text-sm">{labels.title}</h3>
      </div>
      <p className="text-xs text-[var(--c-text-muted)] mb-4 leading-relaxed">{labels.desc}</p>

      <div className="flex gap-2">
        <button
          onClick={handleCopy}
          className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-[var(--c-deep)] border border-[var(--c-border)] text-[var(--c-text-muted)] transition-all"
        >
          {copied ? labels.copied : labels.button}
        </button>
        <button
          onClick={handleWhatsApp}
          className="py-2.5 px-4 rounded-xl font-bold text-xs bg-green-600 text-white"
        >
          💬 WhatsApp
        </button>
      </div>
    </div>
  );
}
