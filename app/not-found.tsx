import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ background: "var(--c-bg)" }}>
      <div className="text-center max-w-md">
        <p className="text-8xl mb-6">🐾</p>
        <h1 className="text-4xl font-bold mb-4" style={{ color: "var(--c-text)" }}>Page introuvable</h1>
        <p className="mb-8" style={{ color: "var(--c-text-muted)" }}>Cette page n&apos;existe pas ou a été déplacée. Pas de panique, votre pote vous attend ailleurs.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/" className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition">Retour à l&apos;accueil</Link>
          <Link href="/animals" className="px-6 py-3 font-semibold rounded-xl transition" style={{ background: "var(--c-card)", color: "var(--c-text)", border: "1px solid var(--c-border)" }}>Voir le catalogue</Link>
        </div>
      </div>
    </div>
  );
}
