import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <p className="text-8xl mb-6">🐾</p>
        <h1 className="text-4xl font-bold text-white mb-4">Page introuvable</h1>
        <p className="text-gray-400 mb-8">Cette page n'existe pas ou a été déplacée. Pas de panique, votre pote vous attend ailleurs.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/" className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition">Retour à l'accueil</Link>
          <Link href="/animals" className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition border border-white/10">Voir le catalogue</Link>
        </div>
      </div>
    </div>
  );
}
