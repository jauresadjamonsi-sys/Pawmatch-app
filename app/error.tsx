"use client";
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--c-deep)" }}>
      <div className="text-center max-w-md">
        <span className="text-5xl block mb-4">😿</span>
        <h1 className="text-xl font-bold mb-2" style={{ color: "var(--c-text)" }}>Oups, quelque chose a planté</h1>
        <p className="text-sm mb-6" style={{ color: "var(--c-text-muted)" }}>{error.message || "Une erreur inattendue est survenue."}</p>
        <button onClick={reset} className="btn-futuristic px-6 py-3 text-sm">Réessayer</button>
      </div>
    </div>
  );
}
