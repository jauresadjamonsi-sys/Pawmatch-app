"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useAppContext } from "@/lib/contexts/AppContext";

const EMOJI_MAP: Record<string, string> = {
  chien: "🐕", chat: "🐱", lapin: "🐰",
  oiseau: "🐦", rongeur: "🐹", autre: "🐾",
};

const STORIES = [
  { emoji: "🐕", name: "Max", story: "s'ennuyait tout seul… jusqu'à ce qu'il rencontre Luna ❤️", score: 94 },
  { emoji: "🐱", name: "Mimi", story: "cherchait un compagnon calme — elle a trouvé son âme sœur 🐾", score: 89 },
  { emoji: "🐰", name: "Coco", story: "était timide… son match parfait a tout changé ✨", score: 91 },
];

const HOW_IT_WORKS = [
  { step: "1", emoji: "📝", title: "Décris ton animal", desc: "Personnalité, énergie, habitudes — notre questionnaire fun en 8 questions max" },
  { step: "2", emoji: "🤖", title: "L'IA analyse", desc: "12 traits comportementaux analysés pour trouver les meilleurs matchs" },
  { step: "3", emoji: "🐾", title: "Rencontre ton match", desc: "Score de compatibilité, explication et mise en contact avec le propriétaire" },
];

export default function HomePage() {
  const { t } = useAppContext();
  const [animals, setAnimals] = useState<any[]>([]);
  const [totalAnimals, setTotalAnimals] = useState(0);
  const [totalProfiles, setTotalProfiles] = useState(0);
  const [storyIdx, setStoryIdx] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      const { data } = await supabase.from("animals").select("*").order("created_at", { ascending: false }).limit(6);
      setAnimals(data || []);
      const { count: ac } = await supabase.from("animals").select("*", { count: "exact", head: true });
      setTotalAnimals(ac || 0);
      const { count: pc } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      setTotalProfiles(pc || 0);
    }
    fetchData();
    const interval = setInterval(() => setStoryIdx(i => (i + 1) % STORIES.length), 3000);
    return () => clearInterval(interval);
  }, []);

  const story = STORIES[storyIdx];

  return (
    <div className="min-h-screen bg-[var(--c-deep)] text-white overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pawBounceLeft {
          0%, 100% { transform: rotate(-15deg) translateY(0); opacity: 0.4; }
          50% { transform: rotate(-15deg) translateY(-12px); opacity: 0.7; }
        }
        @keyframes pawBounceRight {
          0%, 100% { transform: rotate(15deg) translateY(-12px); opacity: 0.4; }
          50% { transform: rotate(15deg) translateY(0); opacity: 0.7; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes scoreCount { from { width: 0%; } to { width: var(--score-width); } }
        .paw-left { animation: pawBounceLeft 2s ease-in-out infinite; }
        .paw-right { animation: pawBounceRight 2s ease-in-out infinite; }
        .fade-in-up { animation: fadeInUp 0.8s ease-out forwards; }
        .pulse-slow { animation: pulse 3s ease-in-out infinite; }
        .slide-in { animation: slideIn 0.5s ease-out forwards; }
        .glow-orange { box-shadow: 0 0 30px rgba(249,115,22,0.15); }
        .card-hover { transition: transform 0.2s ease; }
        .card-hover:active { transform: scale(0.97); }
      `}} />

      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-orange-500/5 rounded-full blur-3xl" />
      </div>

      {/* HERO */}
      <div className="relative text-center pt-10 pb-6 px-4">
        <div className="flex justify-center gap-4 mb-4">
          <span className="paw-left text-5xl drop-shadow-lg">🐾</span>
          <span className="paw-right text-5xl drop-shadow-lg">🐾</span>
        </div>

        <h1 className="text-4xl font-extrabold mb-2">
          <span className="bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500 bg-clip-text text-transparent">Compaw</span>
        </h1>

        {/* Proposition de valeur CLAIRE */}
        <p className="text-white font-bold text-lg mb-2">
          Trouve le compagnon parfait pour ton animal 🐶❤️
        </p>
        <p className="text-gray-400 text-sm mb-4 max-w-xs mx-auto">
          Notre IA analyse la personnalité de ton animal pour lui trouver son match idéal en Suisse
        </p>

        {/* 3 bullets clés */}
        <div className="flex flex-col gap-2 max-w-xs mx-auto mb-6 text-left">
          {[
            "🧠 Match IA basé sur 12 traits comportementaux",
            "🐾 Organise des rencontres près de chez toi",
            "💖 Améliore le bien-être de ton animal"
          ].map((b, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-gray-300">
              <span>{b}</span>
            </div>
          ))}
        </div>

        {/* Storytelling dynamique */}
        <div key={storyIdx} className="slide-in mx-auto max-w-xs bg-[var(--c-card)] border border-orange-500/20 rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{story.emoji}</span>
            <div className="flex-1 text-left">
              <p className="text-xs text-orange-400 font-bold mb-1">{story.name}</p>
              <p className="text-xs text-gray-300 italic">"{story.name} {story.story}"</p>
            </div>
            <div className="text-right">
              <div className="text-lg font-black text-green-400">{story.score}%</div>
              <div className="text-[9px] text-gray-500">compatible</div>
            </div>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex gap-3 justify-center mb-4">
          <Link href="/onboarding" className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-full text-sm pulse-slow glow-orange">
            🐾 Trouver un match
          </Link>
          <Link href="/flairer" className="px-6 py-3 bg-[var(--c-card)] border border-[var(--c-border)] text-gray-300 font-medium rounded-full text-sm card-hover">
            Explorer
          </Link>
        </div>

        {/* Freemium badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full text-xs text-green-400 font-bold">
          ✓ 3 matchs gratuits — sans carte de crédit
        </div>

        {/* Stats */}
        <div className="flex justify-center gap-8 mt-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-400">{totalProfiles}+</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Propriétaires</p>
          </div>
          <div className="w-px h-10 bg-[var(--c-border)]" />
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-400">{totalAnimals}+</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Animaux</p>
          </div>
          <div className="w-px h-10 bg-[var(--c-border)]" />
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-400">92%</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Taux match</p>
          </div>
        </div>
      </div>

      {/* COMMENT ÇA MARCHE */}
      <div className="px-6 mb-8">
        <h2 className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-4 text-center">Comment ça marche</h2>
        <div className="flex flex-col gap-3">
          {HOW_IT_WORKS.map((step, i) => (
            <div key={i} className="flex items-start gap-4 bg-[var(--c-card)] border border-[var(--c-border)] rounded-2xl p-4">
              <div className="w-8 h-8 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400 font-black text-sm flex-shrink-0">
                {step.step}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{step.emoji}</span>
                  <h3 className="font-bold text-white text-sm">{step.title}</h3>
                </div>
                <p className="text-xs text-gray-500">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ANIMAUX RÉCENTS */}
      {animals.length > 0 && (
        <div className="px-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">Récemment actifs</h2>
            <Link href="/animals" className="text-[11px] text-orange-400 font-semibold">Voir tout</Link>
          </div>
          <div className="flex gap-5 overflow-x-auto pb-2">
            {animals.map((animal) => (
              <Link href={"/animals/" + animal.id} key={animal.id} className="flex flex-col items-center flex-shrink-0 group">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-[var(--c-card)] border-[2.5px] border-orange-500/60 group-hover:border-orange-400 flex items-center justify-center overflow-hidden mb-2 transition-colors">
                    {animal.photo_url
                      ? <img src={animal.photo_url} alt={animal.name} className="w-full h-full object-cover" />
                      : <span className="text-2xl">{EMOJI_MAP[animal.species] || "🐾"}</span>}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-[var(--c-deep)]" />
                </div>
                <p className="text-xs text-white font-medium">{animal.name}</p>
                {animal.canton && (
                  <span className="text-[10px] px-2 py-0.5 bg-orange-500/15 text-orange-300 rounded-full mt-1">{animal.canton}</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* SCORE IA DEMO */}
      <div className="px-6 mb-8">
        <div className="bg-gradient-to-br from-[var(--c-card)] to-[var(--c-deep)] border border-orange-500/20 rounded-2xl p-5 glow-orange">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🤖</span>
            <div>
              <h3 className="font-bold text-white text-sm">Analyse IA — exemple</h3>
              <p className="text-[10px] text-gray-500">Voici pourquoi Max et Luna sont compatibles</p>
            </div>
            <div className="ml-auto text-right">
              <div className="text-2xl font-black text-green-400">94%</div>
              <div className="text-[9px] text-gray-500">compatible</div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {[
              { label: "Niveau d'énergie", score: 95 },
              { label: "Sociabilité", score: 90 },
              { label: "Compatibilité de taille", score: 88 },
              { label: "Zone géographique", score: 100 },
            ].map((trait, i) => (
              <div key={i}>
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-gray-400">{trait.label}</span>
                  <span className="text-orange-400 font-bold">{trait.score}%</span>
                </div>
                <div className="h-1.5 bg-[var(--c-border)] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-orange-500 to-green-400 rounded-full" style={{ width: `${trait.score}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-500 mt-4 text-center italic">
            "Même niveau d'énergie, tous deux adorent les balades en nature 🌲"
          </p>
        </div>
      </div>

      {/* GRILLE ACTIONS */}
      <div className="px-6 mb-8">
        <div className="grid grid-cols-2 gap-3">
          <Link href="/flairer" className="bg-gradient-to-br from-[var(--c-card)] to-[var(--c-deep)] border border-orange-500/15 rounded-2xl p-5 card-hover">
            <span className="text-2xl mb-2 block">👃</span>
            <h3 className="font-bold text-white text-sm">Flairer</h3>
            <p className="text-xs text-gray-500 mt-1">Swipe et trouve des matchs</p>
          </Link>
          <Link href="/events" className="bg-gradient-to-br from-[var(--c-card)] to-[var(--c-deep)] border border-[var(--c-border)] rounded-2xl p-5 card-hover">
            <span className="text-2xl mb-2 block">📅</span>
            <h3 className="font-bold text-white text-sm">Événements</h3>
            <p className="text-xs text-gray-500 mt-1">Rencontres près de toi</p>
          </Link>
          <Link href="/pricing" className="bg-gradient-to-br from-[var(--c-card)] to-[var(--c-deep)] border border-purple-500/20 rounded-2xl p-5 card-hover">
            <span className="text-2xl mb-2 block">✨</span>
            <h3 className="font-bold text-white text-sm">Premium</h3>
            <p className="text-xs text-gray-500 mt-1">Matchs illimités + IA avancée</p>
          </Link>
          <Link href="/onboarding" className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/25 rounded-2xl p-5 card-hover">
            <span className="text-2xl mb-2 block">🚀</span>
            <h3 className="font-bold text-orange-400 text-sm">Commencer</h3>
            <p className="text-xs text-orange-300/50 mt-1">3 matchs gratuits</p>
          </Link>
        </div>
      </div>

      {/* COUP DE TRUFFE */}
      <div className="px-6 mb-8">
        <div className="bg-gradient-to-r from-orange-500/10 via-pink-500/5 to-purple-500/10 border border-orange-500/20 rounded-2xl p-6 relative overflow-hidden glow-orange">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">💥</span>
            <div>
              <h3 className="font-bold text-white">Coup de Truffe</h3>
              <p className="text-xs text-gray-400">Quand les deux aiment — c'est un match !</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-4 bg-[var(--c-deep)]/50 rounded-xl p-4">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center text-2xl mb-1">🐕</div>
              <p className="text-[10px] text-gray-400">Max</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-orange-400">❤️</div>
              <p className="text-[10px] text-green-400 font-bold">Match !</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-pink-500/20 flex items-center justify-center text-2xl mb-1">🐕</div>
              <p className="text-[10px] text-gray-400">Luna</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA FINAL */}
      <div className="px-6 mb-12">
        <div className="text-center bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-2xl p-8">
          <p className="text-2xl mb-3">🐾</p>
          <h2 className="font-bold text-white text-lg mb-2">Ton animal mérite des amis</h2>
          <p className="text-xs text-gray-400 mb-6">Rejoins des milliers de propriétaires en Suisse</p>
          <Link href="/onboarding" className="inline-block px-8 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-full pulse-slow glow-orange">
            Commencer gratuitement 🚀
          </Link>
          <p className="text-[10px] text-gray-600 mt-3">3 matchs gratuits · Sans carte de crédit</p>
        </div>
      </div>
    </div>
  );
}
