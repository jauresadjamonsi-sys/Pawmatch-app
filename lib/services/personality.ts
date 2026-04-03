// ============================================================
// PAWLY — Système de personnalité animale
// Génère un "type" de personnalité basé sur les traits
// ============================================================

export type PersonalityType = {
  id: string;
  emoji: string;
  name: string;
  tagline: string;
  description: string;
  color: string;
  bgColor: string;
  idealMatch: string;
  tips: string[];
  compatibleWith: string[];
};

export const PERSONALITY_TYPES: Record<string, PersonalityType> = {
  energetic_social: {
    id: "energetic_social",
    emoji: "⚡",
    name: "L'Énergique Social",
    tagline: "Toujours partant pour l'aventure !",
    description: "Ton animal déborde d'énergie et adore la compagnie. Il est le premier à vouloir jouer et le dernier à rentrer à la maison.",
    color: "#f97316",
    bgColor: "rgba(249,115,22,0.1)",
    idealMatch: "Un compagnon tout aussi enthousiaste qui peut suivre son rythme effréné.",
    tips: [
      "Prévois au moins 2 sorties par jour",
      "Les parcs à chiens sont son paradis",
      "Idéal pour les sports canins comme l'agility",
    ],
    compatibleWith: ["energetic_social", "playful_curious"],
  },
  calm_gentle: {
    id: "calm_gentle",
    emoji: "🌸",
    name: "Le Doux Serein",
    tagline: "La paix et la sérénité avant tout.",
    description: "Ton animal est une âme douce qui préfère les moments tranquilles. Il apprécie les câlins et les promenades paisibles.",
    color: "#8b5cf6",
    bgColor: "rgba(139,92,246,0.1)",
    idealMatch: "Un compagnon calme et patient qui partage son amour de la tranquillité.",
    tips: [
      "Évite les environnements trop bruyants",
      "Les promenades en forêt lui font le plus grand bien",
      "Idéal pour les personnes âgées ou sédentaires",
    ],
    compatibleWith: ["calm_gentle", "affectionate_loyal"],
  },
  playful_curious: {
    id: "playful_curious",
    emoji: "🎯",
    name: "Le Joueur Curieux",
    tagline: "Chaque journée est une nouvelle aventure !",
    description: "Ton animal explore le monde avec ses yeux grands ouverts. Curieux de tout, il transforme chaque balade en expédition.",
    color: "#22c55e",
    bgColor: "rgba(34,197,94,0.1)",
    idealMatch: "Un compagnon aventurier qui aime découvrir de nouveaux endroits.",
    tips: [
      "Varie les itinéraires de promenade",
      "Les jeux d'intelligence le stimulent beaucoup",
      "Parfait pour les randonnées et escapades",
    ],
    compatibleWith: ["playful_curious", "energetic_social", "calm_gentle"],
  },
  affectionate_loyal: {
    id: "affectionate_loyal",
    emoji: "💛",
    name: "Le Fidèle Affectueux",
    tagline: "L'amour inconditionnel incarné.",
    description: "Ton animal vit pour les câlins et la proximité. Sa loyauté est sans faille — il sera toujours là pour toi.",
    color: "#f59e0b",
    bgColor: "rgba(245,158,11,0.1)",
    idealMatch: "Un compagnon tout aussi expressif qui aime donner et recevoir de l'affection.",
    tips: [
      "Il a besoin de beaucoup de contact physique",
      "Évite les longues séparations",
      "Excellent avec les enfants et les familles",
    ],
    compatibleWith: ["affectionate_loyal", "calm_gentle", "playful_curious"],
  },
  independent_proud: {
    id: "independent_proud",
    emoji: "👑",
    name: "L'Indépendant Fier",
    tagline: "À ses conditions, mais avec classe.",
    description: "Ton animal sait ce qu'il veut et quand il le veut. Son caractère affirmé en fait un compagnon unique et fascinant.",
    color: "#6366f1",
    bgColor: "rgba(99,102,241,0.1)",
    idealMatch: "Un compagnon respectueux de son espace et de son rythme.",
    tips: [
      "Respecte ses moments de solitude",
      "La socialisation précoce est importante",
      "Il choisit ses amis avec soin",
    ],
    compatibleWith: ["independent_proud", "calm_gentle"],
  },
  protective_brave: {
    id: "protective_brave",
    emoji: "🛡️",
    name: "Le Protecteur Courageux",
    tagline: "Toujours là pour protéger les siens.",
    description: "Ton animal est un gardien naturel. Sa bravoure et sa loyauté envers sa famille sont ses plus grandes qualités.",
    color: "#ef4444",
    bgColor: "rgba(239,68,68,0.1)",
    idealMatch: "Un compagnon stable et confiant qui sait tenir sa place.",
    tips: [
      "La socialisation est essentielle dès le plus jeune âge",
      "Il a besoin d'un maître affirmé",
      "Excellent chien de famille avec une bonne éducation",
    ],
    compatibleWith: ["protective_brave", "calm_gentle", "affectionate_loyal"],
  },
};

export function detectPersonality(traits: string[]): PersonalityType {
  const scores: Record<string, number> = {
    energetic_social: 0,
    calm_gentle: 0,
    playful_curious: 0,
    affectionate_loyal: 0,
    independent_proud: 0,
    protective_brave: 0,
  };

  const mapping: Record<string, string[]> = {
    energetic_social: ["Energique", "Sportif", "Actif", "Sociable avec les chiens", "Sociable avec les chats", "Aboyeur"],
    calm_gentle: ["Calme", "Doux", "Craintif", "Nocturne"],
    playful_curious: ["Joueur", "Curieux", "Bavard", "Aime l'eau"],
    affectionate_loyal: ["Calin", "Pot de colle", "Bon avec les enfants"],
    independent_proud: ["Dominant", "Territorial", "Chasseur"],
    protective_brave: ["Dominant", "Territorial", "Bon avec les enfants", "Destructeur quand seul"],
  };

  for (const trait of traits) {
    for (const [type, typeTrait] of Object.entries(mapping)) {
      if (typeTrait.includes(trait)) scores[type]++;
    }
  }

  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return PERSONALITY_TYPES[best[0]] || PERSONALITY_TYPES.playful_curious;
}
