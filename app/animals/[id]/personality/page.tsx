"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { detectPersonality } from "@/lib/services/personality";
import { useAppContext } from "@/lib/contexts/AppContext";
import { SharePersonalityCard } from "@/lib/components/SharePersonalityCard";
import { InviteFriendCard } from "@/lib/components/InviteFriendCard";

export default function PersonalityPage() {
  const { t, lang } = useAppContext();
  const [animal, setAnimal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const params = useParams();
  const supabase = createClient();

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase.from("animals").select("id, name, species, breed, traits, energy_level, sociability, gender, photo_url").eq("id", params.id).single();
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
    <div className="min-h-screen flex items-center justify-center bg-[var(--c-deep)]">
      <p className="text-[var(--c-text-muted)]">Animal introuvable</p>
    </div>
  );

  const personality = detectPersonality(animal.traits || []);

  const BACK_LABELS: Record<string, string> = {
    fr: "← Retour à", de: "← Zurück zu", it: "← Torna a", en: "← Back to",
  };
  const MATCH_LABELS: Record<string, string> = {
    fr: "💞 Match idéal", de: "💞 Idealer Match", it: "💞 Match ideale", en: "💞 Ideal match",
  };
  const TIPS_LABELS: Record<string, string> = {
    fr: "💡 Conseils pour", de: "💡 Tipps für", it: "💡 Consigli per", en: "💡 Tips for",
  };
  const TRAITS_LABELS: Record<string, string> = {
    fr: "🏷️ Ses traits", de: "🏷️ Seine Merkmale", it: "🏷️ I suoi tratti", en: "🏷️ Their traits",
  };
  const CTA_LABELS: Record<string, string> = {
    fr: "🐾 Trouver un copain compatible", de: "🐾 Kompatiblen Freund finden",
    it: "🐾 Trova un amico compatibile", en: "🐾 Find a compatible buddy",
  };
  const VIEW_LABELS: Record<string, string> = {
    fr: "Voir la fiche complète", de: "Vollständiges Profil ansehen",
    it: "Vedi il profilo completo", en: "View full profile",
  };

  return (
    <div className="min-h-screen bg-[var(--c-deep)] px-4 py-6 pb-28">
      <div className="max-w-lg mx-auto">

        {/* Retour */}
        <Link href={"/animals/" + animal.id}
          className="inline-flex items-center gap-2 text-[var(--c-text-muted)] text-sm mb-6 hover:opacity-80 transition">
          {BACK_LABELS[lang] || BACK_LABELS.fr} {animal.name}
        </Link>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 rounded-full overflow-hidden mx-auto mb-4 border-4 relative" style={{ borderColor: personality.color + "50" }}>
            {animal.photo_url
              ? <Image src={animal.photo_url} alt={animal.name} fill className="object-cover" sizes="(max-width: 768px) 96px, 96px" />
              : <div className="w-full h-full bg-[var(--c-card)] flex items-center justify-center text-4xl">🐾</div>}
          </div>
          <h1 className="text-2xl font-extrabold text-[var(--c-text)] mb-1">{animal.name}</h1>
          <p className="text-sm text-[var(--c-text-muted)]">{animal.breed || animal.species}</p>
        </div>

        {/* Carte personnalité */}
        <div className="rounded-3xl p-6 mb-4 text-center border-2"
          style={{ background: personality.bgColor, borderColor: personality.color + "40" }}>
          <div className="text-6xl mb-3">{personality.emoji}</div>
          <h2 className="text-2xl font-extrabold mb-1" style={{ color: personality.color }}>
            {personality.name}
          </h2>
          <p className="text-sm font-bold text-[var(--c-text-muted)] mb-4 italic">"{personality.tagline}"</p>
          <p className="text-sm text-[var(--c-text-muted)] leading-relaxed">{personality.description}</p>
        </div>

        {/* ═══ PARTAGE VIRAL ═══ */}
        <div className="mb-6">
          <SharePersonalityCard
            animalName={animal.name}
            personality={{ name: personality.name, emoji: personality.emoji, color: personality.color, description: personality.tagline }}
            photoUrl={animal.photo_url}
            species={animal.species}
          />
        </div>

        {/* Match idéal */}
        <div className="bg-[var(--c-card)] border border-[var(--c-border)] rounded-2xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="font-bold text-[var(--c-text)] text-sm">{MATCH_LABELS[lang] || MATCH_LABELS.fr}</h3>
          </div>
          <p className="text-sm text-[var(--c-text-muted)] leading-relaxed">{personality.idealMatch}</p>
        </div>

        {/* Conseils */}
        <div className="bg-[var(--c-card)] border border-[var(--c-border)] rounded-2xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="font-bold text-[var(--c-text)] text-sm">{TIPS_LABELS[lang] || TIPS_LABELS.fr} {animal.name}</h3>
          </div>
          <div className="flex flex-col gap-2">
            {personality.tips.map((tip: string, i: number) => (
              <div key={i} className="flex items-start gap-3">
                <span className="font-bold text-sm flex-shrink-0 mt-0.5" style={{ color: personality.color }}>✓</span>
                <p className="text-sm text-[var(--c-text-muted)]">{tip}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Traits */}
        {animal.traits?.length > 0 && (
          <div className="bg-[var(--c-card)] border border-[var(--c-border)] rounded-2xl p-5 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="font-bold text-[var(--c-text)] text-sm">{TRAITS_LABELS[lang] || TRAITS_LABELS.fr}</h3>
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

        {/* ═══ INVITATION AMIS ═══ */}
        <div className="mb-6">
          <InviteFriendCard />
        </div>

        {/* CTA */}
        <div className="flex flex-col gap-3">
          <Link href="/flairer"
            className="w-full py-4 text-white font-bold rounded-2xl text-center text-sm"
            style={{ background: `linear-gradient(to right, ${personality.color}, ${personality.color}cc)` }}>
            {CTA_LABELS[lang] || CTA_LABELS.fr}
          </Link>
          <Link href={"/animals/" + animal.id}
            className="w-full py-3 bg-[var(--c-card)] border border-[var(--c-border)] text-[var(--c-text-muted)] font-bold rounded-2xl text-center text-sm">
            {VIEW_LABELS[lang] || VIEW_LABELS.fr}
          </Link>
        </div>
      </div>
    </div>
  );
}
