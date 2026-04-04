"use client";

import { useState } from "react";
import Link from "next/link";

const QUESTIONS = [
  {
    q: "Votre animal rencontre un inconnu. Il...",
    answers: [
      { text: "🎉 Fonce dire bonjour !", traits: ["Sociable", "Energique"] },
      { text: "🤔 Observe à distance", traits: ["Prudent", "Calme"] },
      { text: "😴 S'en fiche complètement", traits: ["Indépendant", "Calme"] },
      { text: "🐾 Se cache derrière vous", traits: ["Craintif", "Sensible"] },
    ],
  },
  {
    q: "En balade, votre animal...",
    answers: [
      { text: "🏃 Tire sur la laisse, veut tout explorer", traits: ["Energique", "Aventurier"] },
      { text: "🦮 Marche calmement à vos côtés", traits: ["Calme", "Obéissant"] },
      { text: "🌿 Renifle chaque brin d'herbe", traits: ["Curieux", "Indépendant"] },
      { text: "🐕 Veut jouer avec chaque chien", traits: ["Sociable", "Joueur"] },
    ],
  },
  {
    q: "À la maison, votre animal préfère...",
    answers: [
      { text: "🛋️ Le canapé, contre vous", traits: ["Câlin", "Sensible"] },
      { text: "🎾 Jouer, jouer, jouer !", traits: ["Joueur", "Energique"] },
      { text: "🪟 Observer par la fenêtre", traits: ["Curieux", "Indépendant"] },
      { text: "👑 Dormir dans SON fauteuil", traits: ["Indépendant", "Calme"] },
    ],
  },
];

const PERSONALITIES: Record<string, { name: string; emoji: string; color: string; desc: string }> = {
  "Sociable": { name: "L'Ambassadeur", emoji: "🌟", color: "#f59e0b", desc: "Votre animal est un vrai social ! Il adore les rencontres et met tout le monde à l'aise." },
  "Energique": { name: "Le Tornado", emoji: "⚡", color: "#ef4444", desc: "Impossible de suivre ! Votre animal déborde d'énergie et a besoin d'action." },
  "Calme": { name: "Le Zen", emoji: "🧘", color: "#22c55e", desc: "La tranquillité incarnée. Votre animal apporte le calme partout où il va." },
  "Curieux": { name: "L'Explorateur", emoji: "🔍", color: "#3b82f6", desc: "Chaque jour est une aventure ! Votre animal veut tout découvrir." },
  "Câlin": { name: "Le Coccolone", emoji: "🤗", color: "#ec4899", desc: "Pot de colle adorable ! Votre animal vit pour les câlins et la proximité." },
  "Indépendant": { name: "Le Libre", emoji: "🦁", color: "#8b5cf6", desc: "Un esprit libre qui n'a besoin de personne. Mais quand il vient vers vous, c'est magique." },
  "Craintif": { name: "Le Sensible", emoji: "🌸", color: "#f472b6", desc: "Un cœur d'or derrière la timidité. Avec patience, il s'ouvre et devient le plus fidèle." },
  "Joueur": { name: "Le Farceur", emoji: "🎪", color: "#f97316", desc: "La vie est un jeu ! Votre animal transforme tout en moment fun." },
};

export function PersonalityHook({ lang }: { lang: string }) {
  const [step, setStep] = useState(0);
  const [selectedTraits, setSelectedTraits] = useState<string[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

  function handleAnswer(traits: string[]) {
    const newTraits = [...selectedTraits, ...traits];
    setSelectedTraits(newTraits);

    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      // Calculer le trait dominant
      const counts: Record<string, number> = {};
      newTraits.forEach(t => { counts[t] = (counts[t] || 0) + 1; });
      const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
      setResult(dominant);
    }
  }

  const personality = result ? PERSONALITIES[result] || PERSONALITIES["Sociable"] : null;

  if (!started) {
    return (
      <div style={{ background: "var(--c-card)", border: "2px solid var(--c-border)", borderRadius: 20, padding: 24, textAlign: "center" }}>
        <span style={{ fontSize: 40, display: "block", marginBottom: 8 }}>🧠</span>
        <h3 style={{ fontWeight: 800, fontSize: 16, color: "var(--c-text)", marginBottom: 4 }}>
          Quel type de personnalité a ton animal ?
        </h3>
        <p style={{ fontSize: 12, color: "var(--c-text-muted)", marginBottom: 16 }}>
          3 questions · 30 secondes · résultat instantané
        </p>
        <button onClick={() => setStarted(true)}
          style={{ padding: "12px 28px", background: "#f97316", color: "#fff", border: "none", borderRadius: 50, fontWeight: 800, fontSize: 14, cursor: "pointer", boxShadow: "0 0 20px rgba(249,115,22,0.3)" }}>
          Faire le test →
        </button>
      </div>
    );
  }

  if (result && personality) {
    return (
      <div style={{ background: "var(--c-card)", border: `2px solid ${personality.color}40`, borderRadius: 20, padding: 24, textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>{personality.emoji}</div>
        <h3 style={{ fontWeight: 800, fontSize: 20, color: personality.color, marginBottom: 4 }}>{personality.name}</h3>
        <p style={{ fontSize: 13, color: "var(--c-text-muted)", lineHeight: 1.6, marginBottom: 16, maxWidth: 300, margin: "0 auto 16px" }}>{personality.desc}</p>
        <div style={{ background: `${personality.color}15`, border: `1px solid ${personality.color}30`, borderRadius: 12, padding: 12, marginBottom: 16 }}>
          <p style={{ fontSize: 11, color: personality.color, fontWeight: 700, margin: 0 }}>
            🔒 Inscris-toi pour voir le profil complet, trouver des copains compatibles et obtenir des conseils personnalisés
          </p>
        </div>
        <Link href="/signup"
          style={{ display: "inline-block", padding: "12px 28px", background: personality.color, color: "#fff", borderRadius: 50, fontWeight: 800, fontSize: 14, textDecoration: "none" }}>
          🐾 Créer le profil de mon animal →
        </Link>
      </div>
    );
  }

  const q = QUESTIONS[step];

  return (
    <div style={{ background: "var(--c-card)", border: "2px solid var(--c-border)", borderRadius: 20, padding: 24 }}>
      {/* Progress */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {QUESTIONS.map((_, i) => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= step ? "#f97316" : "var(--c-border)", transition: "background 0.3s" }} />
        ))}
      </div>

      <h3 style={{ fontWeight: 800, fontSize: 15, color: "var(--c-text)", marginBottom: 14, textAlign: "center" }}>
        {q.q}
      </h3>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {q.answers.map((a, i) => (
          <button key={i} onClick={() => handleAnswer(a.traits)}
            style={{ padding: "14px 16px", background: "var(--c-deep, rgba(255,255,255,0.03))", border: "1.5px solid var(--c-border)", borderRadius: 14, cursor: "pointer", textAlign: "left", fontSize: 14, fontWeight: 600, color: "var(--c-text)", transition: "all 0.2s" }}
            onMouseOver={e => { (e.target as HTMLElement).style.borderColor = "#f97316"; (e.target as HTMLElement).style.background = "rgba(249,115,22,0.05)"; }}
            onMouseOut={e => { (e.target as HTMLElement).style.borderColor = "var(--c-border)"; (e.target as HTMLElement).style.background = "var(--c-deep, rgba(255,255,255,0.03))"; }}>
            {a.text}
          </button>
        ))}
      </div>
    </div>
  );
}
