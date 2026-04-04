"use client";

import { useState, useEffect } from "react";

type AIProps = {
  animal: {
    name: string;
    species: string;
    breed: string | null;
    age_months: number | null;
    weight_kg: number | null;
    traits: string[];
    gender: string;
  };
  lang: string;
};

type Recommendation = {
  emoji: string;
  category: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
};

function generateRecommendations(animal: AIProps["animal"], lang: string): Recommendation[] {
  const recs: Recommendation[] = [];
  const age = animal.age_months || 24;
  const isYoung = age < 12;
  const isSenior = age > 84; // 7 ans
  const isLargeBreed = ["Berger", "Labrador", "Golden", "Husky", "Bouvier", "Dogue", "Rottweiler", "Malinois"].some(b => animal.breed?.includes(b));
  const isSmallBreed = ["Chihuahua", "Yorkshire", "Bichon", "Caniche", "Shih Tzu", "Pomeranian"].some(b => animal.breed?.includes(b));
  const isEnergetic = animal.traits?.includes("Energique") || animal.traits?.includes("Sportif") || animal.traits?.includes("Actif");
  const isCalm = animal.traits?.includes("Calme") || animal.traits?.includes("Doux");
  const isCat = animal.species === "chat";
  const isDog = animal.species === "chien";

  // ═══ Activité ═══
  if (isDog) {
    if (isEnergetic) {
      recs.push({
        emoji: "🏃", category: "Activité", priority: "high",
        title: `${animal.name} a besoin de se dépenser !`,
        description: isLargeBreed
          ? "Minimum 2h d'exercice par jour. Idéal : randonnées, nage, agility. Les grandes races actives développent des troubles comportementaux sans assez d'exercice."
          : "Minimum 1h30 d'exercice par jour. Jeux de balle, courses, parcours d'obstacles. Variez les activités pour stimuler le mental.",
      });
    } else if (isCalm) {
      recs.push({
        emoji: "🌿", category: "Activité", priority: "medium",
        title: "Balades tranquilles recommandées",
        description: "2-3 promenades calmes de 20-30 min suffisent. Privilégiez les sentiers nature, évitez les parcs trop bruyants.",
      });
    }
    if (isSenior) {
      recs.push({
        emoji: "🦴", category: "Activité", priority: "high",
        title: `${animal.name} est senior — adaptez l'exercice`,
        description: "Réduisez l'intensité mais maintenez la régularité. Promenades courtes et fréquentes. La natation est excellente pour les articulations.",
      });
    }
  }

  if (isCat) {
    recs.push({
      emoji: "🎯", category: "Activité", priority: "medium",
      title: "Stimulation quotidienne essentielle",
      description: "2 sessions de jeu de 15 min par jour minimum. Plumes, lasers, balles. Un arbre à chat avec vue sur l'extérieur réduit l'ennui.",
    });
  }

  // ═══ Nutrition ═══
  if (isDog) {
    if (isYoung) {
      recs.push({
        emoji: "🍖", category: "Nutrition", priority: "high",
        title: "Alimentation croissance",
        description: isLargeBreed
          ? "Croquettes spéciales grandes races junior. Attention à la croissance trop rapide — elle cause des problèmes articulaires. 3 repas/jour jusqu'à 6 mois, puis 2."
          : "Croquettes junior adaptées à sa taille. 3-4 repas/jour jusqu'à 4 mois, puis réduire à 2. Évitez les restes de table.",
      });
    } else if (isSenior) {
      recs.push({
        emoji: "🥗", category: "Nutrition", priority: "high",
        title: "Alimentation senior adaptée",
        description: "Passez aux croquettes senior (moins caloriques, plus de glucosamine). Ajoutez des oméga-3 pour les articulations. Surveillez le poids mensuellement.",
      });
    }
    if (animal.weight_kg && isLargeBreed && animal.weight_kg > 40) {
      recs.push({
        emoji: "⚖️", category: "Nutrition", priority: "medium",
        title: "Surveillez le poids",
        description: `${animal.weight_kg} kg — vérifiez avec votre véto que c'est optimal. L'obésité réduit l'espérance de vie de 2 ans chez les grandes races.`,
      });
    }
  }

  if (isCat) {
    recs.push({
      emoji: "💧", category: "Nutrition", priority: "medium",
      title: "Hydratation — point critique",
      description: "Les chats boivent peu naturellement. Fontaine à eau recommandée. Ajoutez de la nourriture humide (pâtée) pour prévenir les problèmes rénaux.",
    });
  }

  // ═══ Santé ═══
  if (isYoung) {
    recs.push({
      emoji: "💉", category: "Santé", priority: "high",
      title: "Rappels de vaccination",
      description: isDog
        ? "Vaccins essentiels : maladie de Carré, parvovirose, hépatite, leptospirose, rage. Rappel annuel obligatoire en Suisse pour la rage."
        : "Vaccins essentiels : typhus, coryza, leucose (FeLV). Rappel annuel recommandé, même pour les chats d'intérieur.",
    });
  }

  if (isSenior) {
    recs.push({
      emoji: "🏥", category: "Santé", priority: "high",
      title: "Bilan santé semestriel recommandé",
      description: `À ${Math.floor(age / 12)} ans, ${animal.name} devrait voir le véto 2x par an. Bilan sanguin, contrôle dentaire et articulations.`,
    });
  }

  if (isDog && !animal.traits?.includes("Stérilisé") && animal.gender === "femelle") {
    recs.push({
      emoji: "🩺", category: "Santé", priority: "medium",
      title: "Stérilisation à considérer",
      description: "La stérilisation prévient les tumeurs mammaires (risque réduit de 99% si fait avant les premières chaleurs) et les infections utérines.",
    });
  }

  // ═══ Socialisation ═══
  if (isDog && isYoung) {
    recs.push({
      emoji: "🐕‍🦺", category: "Socialisation", priority: "high",
      title: "Période critique de socialisation",
      description: "Avant 14 semaines, exposez " + animal.name + " à un maximum de situations : personnes, animaux, bruits, environnements. C'est maintenant ou jamais !",
    });
  }

  if (animal.traits?.includes("Craintif")) {
    recs.push({
      emoji: "🧘", category: "Comportement", priority: "high",
      title: `${animal.name} est craintif — patience requise`,
      description: "Ne forcez jamais le contact. Utilisez le renforcement positif. Les cours d'éducation en petit groupe peuvent aider. Consultez un comportementaliste si ça persiste.",
    });
  }

  // ═══ Saison ═══
  const month = new Date().getMonth();
  if (month >= 10 || month <= 2) { // Nov-Feb
    recs.push({
      emoji: "❄️", category: "Saison", priority: "medium",
      title: "Conseils hiver",
      description: isDog
        ? "Protégez les coussinets du sel de déneigement (baume ou bottines). Séchez bien après les balades. Augmentez légèrement les portions si actif dehors."
        : "Les chats cherchent la chaleur — vérifiez sous la voiture avant de démarrer. Gardez l'eau accessible (elle gèle vite dehors).",
    });
  } else if (month >= 5 && month <= 8) { // Jun-Sep
    recs.push({
      emoji: "☀️", category: "Saison", priority: "high",
      title: "Attention à la chaleur",
      description: isDog
        ? "Ne JAMAIS laisser en voiture. Promenades tôt le matin ou tard le soir. Testez l'asphalte avec votre main — si c'est trop chaud pour vous, c'est trop chaud pour ses pattes."
        : "Laissez toujours de l'eau fraîche. Les chats blancs sont sensibles aux coups de soleil (oreilles, nez). Zone ombragée obligatoire.",
    });
  }

  // Limiter et trier par priorité
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return recs.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]).slice(0, 5);
}

export function AIRecommendations({ animal, lang }: AIProps) {
  const [expanded, setExpanded] = useState(false);
  const recs = generateRecommendations(animal, lang);

  if (recs.length === 0) return null;

  const TITLE: Record<string, string> = {
    fr: "Recommandations IA pour",
    de: "KI-Empfehlungen für",
    it: "Raccomandazioni IA per",
    en: "AI Recommendations for",
  };

  const priorityColors = {
    high: { bg: "#FEF2F2", border: "#FECACA", dot: "#EF4444" },
    medium: { bg: "#FFFBEB", border: "#FDE68A", dot: "#F59E0B" },
    low: { bg: "#F0FDF4", border: "#BBF7D0", dot: "#22C55E" },
  };

  const displayed = expanded ? recs : recs.slice(0, 2);

  return (
    <div style={{ background: "#fff", borderRadius: 20, border: "1.5px solid rgba(139,92,246,0.15)", padding: 20, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 18 }}>🤖</span>
        <h3 style={{ fontWeight: 800, fontSize: 15, margin: 0 }}>{TITLE[lang] || TITLE.fr} {animal.name}</h3>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {displayed.map((rec, i) => {
          const colors = priorityColors[rec.priority];
          return (
            <div key={i} style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 14, padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 18 }}>{rec.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontWeight: 800, fontSize: 13, color: "#1a1714" }}>{rec.title}</span>
                  </div>
                  <span style={{ fontSize: 10, color: "#6b7280", fontWeight: 700, textTransform: "uppercase" }}>{rec.category}</span>
                </div>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: colors.dot, flexShrink: 0 }} />
              </div>
              <p style={{ fontSize: 12, color: "#4b5563", lineHeight: 1.6, margin: 0 }}>{rec.description}</p>
            </div>
          );
        })}
      </div>

      {recs.length > 2 && (
        <button onClick={() => setExpanded(!expanded)}
          style={{ width: "100%", marginTop: 10, padding: 8, background: "none", border: "none", color: "#8b5cf6", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
          {expanded ? "Voir moins ↑" : `Voir ${recs.length - 2} autres recommandations ↓`}
        </button>
      )}
    </div>
  );
}
