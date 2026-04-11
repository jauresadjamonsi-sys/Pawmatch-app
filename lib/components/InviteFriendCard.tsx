"use client";

import { useAppContext } from "@/lib/contexts/AppContext";

const LABELS: Record<string, { title: string; desc: string; button: string; message: string }> = {
  fr: { title: "Invite un ami", desc: "Plus on est de compagnons, plus on s'amuse !", button: "Inviter via WhatsApp", message: "Hey ! Je viens de découvrir Pawband — une app pour trouver des copains de balade pour son animal en Suisse 🐾 Fais le test de personnalité, c'est marrant ! 👉 https://pawband.ch" },
  de: { title: "Freund einladen", desc: "Je mehr Begleiter, desto mehr Spass!", button: "Über WhatsApp einladen", message: "Hey! Ich habe gerade Pawband entdeckt — eine App um Spaziergang-Freunde für dein Tier in der Schweiz zu finden 🐾 Mach den Persönlichkeitstest, macht Spass! 👉 https://pawband.ch" },
  it: { title: "Invita un amico", desc: "Più compagni ci sono, più ci si diverte!", button: "Invita via WhatsApp", message: "Hey! Ho appena scoperto Pawband — un'app per trovare amici di passeggiata per il tuo animale in Svizzera 🐾 Fai il test di personalità, è divertente! 👉 https://pawband.ch" },
  en: { title: "Invite a friend", desc: "The more companions, the more fun!", button: "Invite via WhatsApp", message: "Hey! I just discovered Pawband — an app to find walk buddies for your pet in Switzerland 🐾 Take the personality test, it's fun! 👉 https://pawband.ch" },
};

export function InviteFriendCard() {
  const { lang } = useAppContext();
  const l = LABELS[lang] || LABELS.fr;

  function handleInvite() {
    const text = encodeURIComponent(l.message);
    window.open(`https://wa.me/?text=${text}`);
  }

  return (
    <div style={{ background: "linear-gradient(135deg, rgba(37,211,102,0.1), rgba(37,211,102,0.02))", border: "1.5px solid rgba(37,211,102,0.2)", borderRadius: 20, padding: 20, textAlign: "center", marginTop: 16 }}>
      <span style={{ fontSize: 28, display: "block", marginBottom: 8 }}>📲</span>
      <h3 style={{ fontWeight: 800, fontSize: 14, color: "var(--c-text)", marginBottom: 4 }}>{l.title}</h3>
      <p style={{ fontSize: 12, color: "var(--c-text-muted)", marginBottom: 12 }}>{l.desc}</p>
      <button onClick={handleInvite}
        style={{ padding: "10px 24px", background: "#25D366", color: "#fff", border: "none", borderRadius: 50, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
        {l.button}
      </button>
    </div>
  );
}
