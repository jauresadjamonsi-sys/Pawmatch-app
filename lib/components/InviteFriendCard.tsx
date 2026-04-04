"use client";

export function InviteFriendCard() {
  function handleInvite() {
    const text = encodeURIComponent("Hey ! Je viens de découvrir Pawly — une app pour trouver des copains de balade pour son animal en Suisse 🐾 Fais le test de personnalité, c'est marrant ! 👉 https://pawlyapp.ch");
    window.open(`https://wa.me/?text=${text}`);
  }

  return (
    <div style={{ background: "linear-gradient(135deg, rgba(37,211,102,0.1), rgba(37,211,102,0.02))", border: "1.5px solid rgba(37,211,102,0.2)", borderRadius: 20, padding: 20, textAlign: "center", marginTop: 16 }}>
      <span style={{ fontSize: 28, display: "block", marginBottom: 8 }}>📲</span>
      <h3 style={{ fontWeight: 800, fontSize: 14, color: "var(--c-text)", marginBottom: 4 }}>Invite un ami</h3>
      <p style={{ fontSize: 12, color: "var(--c-text-muted)", marginBottom: 12 }}>Plus on est de compagnons, plus on s'amuse !</p>
      <button onClick={handleInvite}
        style={{ padding: "10px 24px", background: "#25D366", color: "#fff", border: "none", borderRadius: 50, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
        Inviter via WhatsApp
      </button>
    </div>
  );
}
