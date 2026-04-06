"use client";
export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="fr">
      <body>
        <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#FAF8F4" }}>
          <div className="text-center max-w-md">
            <span className="text-5xl block mb-4">😿</span>
            <h1 className="text-xl font-bold mb-2" style={{ color: "#1A1714" }}>Oups, quelque chose a planté</h1>
            <p className="text-sm mb-6" style={{ color: "#3d3833" }}>{error.message || "Une erreur inattendue est survenue."}</p>
            <button onClick={reset} style={{ background: "#EA580C", color: "#fff", padding: "12px 24px", borderRadius: 12, border: "none", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Réessayer</button>
          </div>
        </div>
      </body>
    </html>
  );
}
