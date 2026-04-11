"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface SuperFlairModalProps {
  senderAnimalId: string;
  receiverAnimalId: string;
  receiverUserId: string;
  receiverName: string;
  onClose: () => void;
  onSent?: () => void;
}

const FLAIR_MESSAGES = [
  { emoji: "💖", text: "Coup de foudre total !" },
  { emoji: "🐾", text: "Nos pattes sont faites pour se rencontrer" },
  { emoji: "⭐", text: "Tu brilles plus que les autres" },
  { emoji: "🌈", text: "Tu mets de la couleur dans ma journee" },
  { emoji: "🔥", text: "Trop craquant(e) !" },
];

export default function SuperFlairModal({
  senderAnimalId,
  receiverAnimalId,
  receiverUserId,
  receiverName,
  onClose,
  onSent,
}: SuperFlairModalProps) {
  const [selected, setSelected] = useState(0);
  const [custom, setCustom] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setSending(true);
    setError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Non connecte"); setSending(false); return; }

    // Check balance
    const { data: profile } = await supabase.from("profiles").select("pawcoins").eq("id", user.id).single();
    const balance = profile?.pawcoins ?? 0;
    if (balance < 15) {
      setError(`Solde insuffisant (${balance}/15 PawCoins)`);
      setSending(false);
      return;
    }

    const message = custom.trim() || `${FLAIR_MESSAGES[selected].emoji} ${FLAIR_MESSAGES[selected].text}`;

    // Insert super flair
    const { error: flairErr } = await supabase.from("super_flairs").insert({
      sender_user_id: user.id,
      receiver_user_id: receiverUserId,
      sender_animal_id: senderAnimalId,
      receiver_animal_id: receiverAnimalId,
      message,
    });

    if (flairErr) { setError(flairErr.message); setSending(false); return; }

    // Deduct coins
    const newBalance = balance - 15;
    await Promise.all([
      supabase.from("profiles").update({ pawcoins: newBalance }).eq("id", user.id),
      supabase.from("pawcoin_transactions").insert({
        user_id: user.id,
        amount: -15,
        type: "super_flair_sent",
        description: `Super Flair envoye a ${receiverName}`,
        balance_after: newBalance,
      }),
    ]);

    setSent(true);
    setSending(false);
    setTimeout(() => { onSent?.(); onClose(); }, 1800);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-sm mx-4 rounded-3xl overflow-hidden"
        style={{ background: "var(--c-card)", animation: "superFlairIn 0.4s cubic-bezier(0.34,1.56,0.64,1)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`
          @keyframes superFlairIn { from { opacity: 0; transform: scale(0.8) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
          @keyframes sparkle { 0%,100% { transform: scale(1) rotate(0deg); } 50% { transform: scale(1.3) rotate(10deg); } }
        `}</style>

        {sent ? (
          <div className="p-8 text-center">
            <div className="text-6xl mb-4" style={{ animation: "sparkle 0.6s ease-in-out infinite" }}>⚡</div>
            <p className="text-lg font-bold mb-1" style={{ color: "var(--c-text)" }}>Super Flair envoye !</p>
            <p className="text-sm" style={{ color: "var(--c-text-muted)" }}>{receiverName} va recevoir ton coup de coeur special</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-5 pb-3 text-center">
              <div className="text-4xl mb-2">⚡</div>
              <h2 className="text-lg font-bold" style={{ color: "var(--c-text)" }}>Super Flair</h2>
              <p className="text-xs mt-1" style={{ color: "var(--c-text-muted)" }}>
                Envoie un coup de coeur special a <strong>{receiverName}</strong>
              </p>
              <p className="text-[10px] mt-1 flex items-center justify-center gap-1" style={{ color: "#fbbf24" }}>
                <span>🪙</span> 15 PawCoins
              </p>
            </div>

            {/* Preset messages */}
            <div className="px-5 space-y-1.5">
              {FLAIR_MESSAGES.map((msg, i) => (
                <button
                  key={i}
                  onClick={() => { setSelected(i); setCustom(""); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
                  style={{
                    background: selected === i && !custom ? "rgba(245,158,11,0.1)" : "transparent",
                    border: selected === i && !custom ? "1px solid rgba(245,158,11,0.3)" : "1px solid transparent",
                  }}
                >
                  <span className="text-xl">{msg.emoji}</span>
                  <span className="text-sm font-medium" style={{ color: "var(--c-text)" }}>{msg.text}</span>
                  {selected === i && !custom && <span className="ml-auto text-amber-400 text-xs">✓</span>}
                </button>
              ))}
            </div>

            {/* Custom message */}
            <div className="px-5 mt-3">
              <input
                type="text"
                placeholder="Ou ecris ton propre message..."
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                maxLength={100}
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: "var(--c-glass, rgba(255,255,255,0.05))", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
              />
            </div>

            {error && (
              <p className="text-center text-xs text-red-400 mt-2 px-5">{error}</p>
            )}

            {/* Actions */}
            <div className="p-5 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-full text-sm font-medium transition-all"
                style={{ background: "var(--c-glass, rgba(255,255,255,0.05))", border: "1px solid var(--c-border)", color: "var(--c-text-muted)" }}
              >
                Annuler
              </button>
              <button
                onClick={send}
                disabled={sending}
                className="flex-1 py-2.5 rounded-full text-sm font-bold text-white transition-all"
                style={{
                  background: "linear-gradient(135deg, #F59E0B, #a78bfa)",
                  boxShadow: "0 4px 15px rgba(245,158,11,0.3)",
                  cursor: sending ? "wait" : "pointer",
                  opacity: sending ? 0.7 : 1,
                }}
              >
                {sending ? "..." : "⚡ Envoyer"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
