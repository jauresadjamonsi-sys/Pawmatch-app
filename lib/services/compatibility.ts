// ============================================================
// PAWLY — Algorithme de compatibilité IA
// Score 0-100 basé sur espèce, traits, localisation, âge, genre
// ============================================================

type Animal = {
  id: string;
  species: string;
  breed: string | null;
  age_months: number | null;
  gender: string;
  traits: string[];
  canton: string | null;
};

// Traits qui se complètent bien ensemble
const SYNERGY_PAIRS: [string, string][] = [
  ["Joueur", "Joueur"],
  ["Calme", "Calme"],
  ["Energique", "Sportif"],
  ["Energique", "Joueur"],
  ["Calin", "Pot de colle"],
  ["Sociable avec les chiens", "Sociable avec les chiens"],
  ["Sociable avec les chats", "Sociable avec les chats"],
  ["Bon avec les enfants", "Bon avec les enfants"],
  ["Aime l'eau", "Aime l'eau"],
  ["Bavard", "Joueur"],
  ["Curieux", "Joueur"],
  ["Doux", "Calin"],
  ["Actif", "Energique"],
];

// Traits qui se conflictent
const CONFLICT_PAIRS: [string, string, number][] = [
  ["Dominant", "Dominant", -25],
  ["Dominant", "Craintif", -20],
  ["Craintif", "Energique", -15],
  ["Craintif", "Aboyeur", -15],
  ["Territorial", "Territorial", -20],
  ["Territorial", "Sociable", -10],
  ["Aboyeur", "Craintif", -15],
  ["Destructeur quand seul", "Craintif", -10],
  ["Chasseur", "Sociable avec les chiens", -10],
  ["Nocturne", "Actif", -5],
];

// Compatibilité inter-espèces
const SPECIES_COMPAT: Record<string, Record<string, number>> = {
  chien: { chien: 40, chat: 5, lapin: 0, oiseau: 0, rongeur: 0, autre: 5 },
  chat:  { chat: 40, chien: 5, lapin: 5, oiseau: -5, rongeur: -5, autre: 5 },
  lapin: { lapin: 40, chat: 5, chien: 0, oiseau: 10, rongeur: 15, autre: 5 },
  oiseau:{ oiseau: 40, lapin: 10, rongeur: 10, chat: -5, chien: 0, autre: 5 },
  rongeur:{ rongeur: 40, oiseau: 10, lapin: 15, chat: -5, chien: 0, autre: 5 },
  autre: { autre: 40, chien: 5, chat: 5, lapin: 5, oiseau: 5, rongeur: 5 },
};

export function computeCompatibility(a: Animal, b: Animal): {
  score: number;
  label: string;
  color: string;
  reasons: string[];
} {
  let score = 0;
  const reasons: string[] = [];

  // ── 1. Espèce (0-40 pts) ──────────────────────────────────
  const speciesScore = SPECIES_COMPAT[a.species]?.[b.species] ?? 5;
  score += speciesScore;
  if (speciesScore >= 40) reasons.push("Même espèce");
  else if (speciesScore > 0) reasons.push("Espèces compatibles");
  else if (speciesScore < 0) reasons.push("Espèces prudentes");

  // Override si traits cross-espèce présents
  if (a.species === "chien" && b.species === "chat") {
    if (a.traits.includes("Sociable avec les chats") || b.traits.includes("Sociable avec les chiens")) {
      score += 15;
      reasons.push("Habitués à l'autre espèce");
    }
  }
  if (a.species === "chat" && b.species === "chien") {
    if (a.traits.includes("Sociable avec les chiens") || b.traits.includes("Sociable avec les chats")) {
      score += 15;
      reasons.push("Habitués à l'autre espèce");
    }
  }

  // ── 2. Traits — synergies (0-25 pts) ─────────────────────
  let synergyScore = 0;
  let synergyCount = 0;
  for (const [t1, t2] of SYNERGY_PAIRS) {
    const aHas1 = a.traits.includes(t1), aHas2 = a.traits.includes(t2);
    const bHas1 = b.traits.includes(t1), bHas2 = b.traits.includes(t2);
    if ((aHas1 && bHas2) || (aHas2 && bHas1) || (aHas1 && bHas1 && t1 === t2)) {
      synergyScore += 5;
      synergyCount++;
    }
  }
  synergyScore = Math.min(synergyScore, 25);
  score += synergyScore;
  if (synergyCount >= 3) reasons.push("Caractères très compatibles");
  else if (synergyCount >= 1) reasons.push("Points communs");

  // ── 3. Traits — conflits ──────────────────────────────────
  let conflictScore = 0;
  for (const [t1, t2, penalty] of CONFLICT_PAIRS) {
    const conflict =
      (a.traits.includes(t1) && b.traits.includes(t2)) ||
      (a.traits.includes(t2) && b.traits.includes(t1));
    if (conflict) {
      conflictScore += penalty;
      if (penalty <= -20) reasons.push("Tempéraments opposés");
    }
  }
  score += conflictScore;

  // ── 4. Localisation (0-15 pts) ───────────────────────────
  if (a.canton && b.canton) {
    if (a.canton === b.canton) {
      score += 15;
      reasons.push("Même canton 📍");
    } else {
      score += 5;
    }
  }

  // ── 5. Âge (0-10 pts) ────────────────────────────────────
  if (a.age_months && b.age_months) {
    const diff = Math.abs(a.age_months - b.age_months);
    if (diff <= 6) { score += 10; reasons.push("Même tranche d'âge"); }
    else if (diff <= 18) { score += 7; }
    else if (diff <= 36) { score += 3; }
    else { score -= 3; }
  }

  // ── 6. Genre (chiens surtout) (0-10 pts) ─────────────────
  if (a.species === "chien" && b.species === "chien") {
    if (a.gender !== b.gender && a.gender !== "inconnu" && b.gender !== "inconnu") {
      score += 10;
      reasons.push("Genres complémentaires");
    } else if (a.gender === b.gender) {
      score -= 5;
    }
  }

  // ── Normalisation 0-100 ───────────────────────────────────
  const normalized = Math.min(100, Math.max(0, Math.round((score / 100) * 100)));

  // ── Label et couleur ─────────────────────────────────────
  let label: string;
  let color: string;
  if (normalized >= 85) { label = "Coup de foudre"; color = "#f97316"; }
  else if (normalized >= 70) { label = "Très compatible"; color = "#22c55e"; }
  else if (normalized >= 55) { label = "Compatible"; color = "#60a5fa"; }
  else if (normalized >= 35) { label = "Possible"; color = "#a78bfa"; }
  else { label = "Prudence"; color = "#6b7280"; }

  // Dédoublonner et limiter les raisons
  const uniqueReasons = [...new Set(reasons)].slice(0, 3);

  return { score: normalized, label, color, reasons: uniqueReasons };
}

// Tri des animaux par score de compatibilité avec MON animal
export function sortByCompatibility(myAnimal: Animal, others: Animal[]): Array<Animal & { compatibility: ReturnType<typeof computeCompatibility> }> {
  return others
    .map(other => ({ ...other, compatibility: computeCompatibility(myAnimal, other) }))
    .sort((a, b) => b.compatibility.score - a.compatibility.score);
}

// Distance approximative entre cantons suisses (en km)
const CANTON_DISTANCES: Record<string, Record<string, number>> = {
  VD: { GE: 50, FR: 40, NE: 50, VS: 80, BE: 90 },
  GE: { VD: 50, FR: 80, VS: 110 },
  ZH: { AG: 30, SG: 60, SZ: 40, ZG: 25, TG: 45, SH: 45 },
  BE: { FR: 35, SO: 40, AG: 70, VD: 90, VS: 100, NE: 60, LU: 75 },
  BS: { BL: 10, AG: 40, SO: 35 },
  LU: { AG: 30, ZG: 20, NW: 35, OW: 40, BE: 75 },
  TI: { GR: 100, VS: 130 },
};

export function getCantonDistance(c1: string, c2: string): number {
  if (c1 === c2) return 0;
  return CANTON_DISTANCES[c1]?.[c2] || CANTON_DISTANCES[c2]?.[c1] || 150;
}

export function getProximityLabel(c1: string | null, c2: string | null): string {
  if (!c1 || !c2) return "";
  if (c1 === c2) return "📍 Même canton";
  const dist = getCantonDistance(c1, c2);
  if (dist <= 30) return `📍 ~${dist} km`;
  if (dist <= 80) return `📍 ~${dist} km`;
  return `📍 ~${dist} km`;
}
