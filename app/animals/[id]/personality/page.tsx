"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { detectPersonality } from "@/lib/services/personality";
import { useAppContext } from "@/lib/contexts/AppContext";

export default function PersonalityPage() {
  const { t } = useAppContext();
  const [animal, setAnimal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const params = useParams();
  const supabase = createClient();

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase.from("animals").select("*").eq("id", params.id).single();
      setAnimal(data);
      setLoading(false);
    }
    fetch();
  }, [params.id]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--c-deep)]">
      <div className="text-4xl animate-pulse">🐾</div>
    </div>
  );

  if (!animal) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-[var(--c-text-muted)]">Animal introuvable</p>
    </div>
  );

  const personality = detectPersonality(animal.traits || []);

  return (
    <div className="min-h-screen bg-[var(--c-deep)] px-4 py-8">
      <div className="max-w-lg mx-auto">

        {/* Retour */}
        <Link href={"/animals/" + animal.id}
          className="inline-flex items-center gap-2 text-[var(--c-text-muted)] text-sm mb-6 hover:text-orange-400 transition">
          ← Retour à {animal.name}
        </Link>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 rounded-full overflow-hidden mx-auto mb-4 border-4 border-orange-500/30">
            {animal.photo_url
              ? <img src={animal.photo_url} alt={animal.name} className="w-full h-full object-cover" />
              : <div className="w-full h-full bg-orange-500/20 flex items-center justify-center text-4xl">🐾</div>}
          </div>
          <h1 className="text-2xl font-extrabold text-[var(--c-text)] mb-1">{animal.name}</h1>
          <p className="text-sm text-[var(--c-text-muted)]">{animal.breed || animal.species}</p>
        </div>

        {/* Carte personnalité */}
        <div className="rounded-3xl p-6 mb-6 text-center border-2"
          style={{ background: personality.bgColor, borderColor: personality.color + "40" }}>
          <div className="text-6xl mb-3">{personality.emoji}</div>
          <h2 className="text-2xl font-extrabold mb-1" style={{ color: personality.color }}>
            {personality.name}
          </h2>
          <p className="text-sm font-bold text-[var(--c-text-muted)] mb-4 italic">"{personality.tagline}"</p>
          <p className="text-sm text-[var(--c-text-muted)] leading-relaxed">{personality.description}</p>
        </div>

        {/* Match idéal */}
        <div className="bg-[var(--c-card)] border border-[var(--c-border)] rounded-2xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">💞</span>
            <h3 className="font-bold text-[var(--c-text)] text-sm">Match idéal</h3>
          </div>
          <p className="text-sm text-[var(--c-text-muted)] leading-relaxed">{personality.idealMatch}</p>
        </div>

        {/* Conseils */}
        <div className="bg-[var(--c-card)] border border-[var(--c-border)] rounded-2xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">💡</span>
            <h3 className="font-bold text-[var(--c-text)] text-sm">Conseils pour {animal.name}</h3>
          </div>
          <div className="flex flex-col gap-2">
            {personality.tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-orange-400 font-bold text-sm flex-shrink-0 mt-0.5">✓</span>
                <p className="text-sm text-[var(--c-text-muted)]">{tip}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Traits */}
        {animal.traits?.length > 0 && (
          <div className="bg-[var(--c-card)] border border-[var(--c-border)] rounded-2xl p-5 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🏷️</span>
              <h3 className="font-bold text-[var(--c-text)] text-sm">Ses traits</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {animal.traits.map((trait: string) => (
                <span key={trait} className="px-3 py-1.5 rounded-full text-xs font-bold border"
                  style={{ color: personality.color, borderColor: personality.color + "40", background: personality.bgColor }}>
                  {trait}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="flex flex-col gap-3">
          <Link href="/flairer"
            className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-2xl text-center text-sm">
            🐾 Trouver un match compatible
          </Link>
          <Link href={"/animals/" + animal.id}
            className="w-full py-3 bg-[var(--c-card)] border border-[var(--c-border)] text-[var(--c-text-muted)] font-bold rounded-2xl text-center text-sm">
            Voir la fiche complète
          </Link>
        </div>
      </div>
    </div>
  );
}
