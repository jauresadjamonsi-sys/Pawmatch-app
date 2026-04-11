"use client";

type ScoreProps = {
  animal: {
    name: string;
    species: string;
    breed: string | null;
    age_months: number | null;
    weight_kg: number | null;
    next_vaccine_date: string | null;
    last_vet_visit: string | null;
    traits: string[];
    gender: string;
  };
};

type Insight = { emoji: string; text: string; type: "good" | "warning" | "danger" };

function getIdealWeight(species: string, breed: string | null): { min: number; max: number } | null {
  if (species !== "chien") return null;
  const ranges: Record<string, [number, number]> = {
    "Berger": [25, 40], "Labrador": [25, 36], "Golden": [25, 34], "Husky": [20, 30],
    "Bouledogue": [8, 14], "Caniche": [3, 6], "Chihuahua": [1.5, 3], "Yorkshire": [2, 3.5],
    "Bichon": [3, 6], "Beagle": [9, 14], "Border": [14, 22], "Jack Russell": [5, 8],
    "Berger Blanc": [25, 40], "Malinois": [25, 35], "Rottweiler": [35, 60],
    "Shih Tzu": [4, 8], "Dogue": [45, 80], "Boxer": [25, 35],
  };
  if (!breed) return { min: 5, max: 40 };
  for (const [key, range] of Object.entries(ranges)) {
    if (breed.includes(key)) return { min: range[0], max: range[1] };
  }
  return { min: 5, max: 40 };
}

function computeScore(animal: ScoreProps["animal"]): { score: number; label: string; color: string; insights: Insight[] } {
  let score = 50; // Base
  const insights: Insight[] = [];

  // Poids
  if (animal.weight_kg) {
    const ideal = getIdealWeight(animal.species, animal.breed);
    if (ideal) {
      const mid = (ideal.min + ideal.max) / 2;
      const diff = ((animal.weight_kg - mid) / mid) * 100;
      if (Math.abs(diff) <= 10) {
        score += 15;
        insights.push({ emoji: "✅", text: `${animal.weight_kg} kg — poids idéal pour sa race`, type: "good" });
      } else if (diff > 10 && diff <= 25) {
        score += 5;
        insights.push({ emoji: "🍽️", text: `${animal.weight_kg} kg — un petit ajustement alimentaire pourrait l'aider à garder la forme`, type: "warning" });
      } else if (diff > 25) {
        score -= 5;
        insights.push({ emoji: "💬", text: `${animal.weight_kg} kg — un bilan nutritionnel chez le véto l'aidera à retrouver son poids de forme`, type: "danger" });
      } else if (diff < -10 && diff >= -25) {
        score += 5;
        insights.push({ emoji: "⚠️", text: `${animal.weight_kg} kg — légèrement sous le poids idéal. Vérifiez l'alimentation`, type: "warning" });
      } else if (diff < -25) {
        score -= 5;
        insights.push({ emoji: "🔴", text: `${animal.weight_kg} kg — poids insuffisant. Consultation véto recommandée`, type: "danger" });
      }
    }
  } else {
    insights.push({ emoji: "📊", text: "Ajoutez le poids pour un suivi personnalisé", type: "warning" });
  }

  // Vaccins
  if (animal.next_vaccine_date) {
    const days = Math.ceil((new Date(animal.next_vaccine_date).getTime() - Date.now()) / 86400000);
    if (days > 30) {
      score += 15;
      insights.push({ emoji: "💉", text: `Vaccins à jour — prochain dans ${days} jours`, type: "good" });
    } else if (days > 0) {
      score += 5;
      insights.push({ emoji: "⏰", text: `Vaccin dans ${days} jours — prenez rendez-vous !`, type: "warning" });
    } else {
      score -= 10;
      insights.push({ emoji: "🚨", text: `Vaccin en retard de ${Math.abs(days)} jours ! Contactez votre véto`, type: "danger" });
    }
  } else {
    score -= 5;
    insights.push({ emoji: "💉", text: "Renseignez la date du prochain vaccin", type: "warning" });
  }

  // Véto
  if (animal.last_vet_visit) {
    const months = Math.round((Date.now() - new Date(animal.last_vet_visit).getTime()) / (30 * 86400000));
    if (months <= 6) {
      score += 15;
      insights.push({ emoji: "🏥", text: `Véto vu il y a ${months} mois — parfait !`, type: "good" });
    } else if (months <= 12) {
      score += 5;
      insights.push({ emoji: "🏥", text: `Véto il y a ${months} mois — pensez au check-up annuel`, type: "warning" });
    } else {
      score -= 10;
      insights.push({ emoji: "🏥", text: `${months} mois sans véto ! Bilan de santé urgent`, type: "danger" });
    }
  } else {
    score -= 5;
    insights.push({ emoji: "🏥", text: "Ajoutez la date de dernière visite véto", type: "warning" });
  }

  // Âge
  if (animal.age_months) {
    const years = animal.age_months / 12;
    if (animal.species === "chien" && years > 7) {
      score -= 5;
      insights.push({ emoji: "👴", text: `${animal.name} est senior (${Math.floor(years)} ans) — check-ups semestriels recommandés`, type: "warning" });
    } else if (animal.species === "chat" && years > 10) {
      insights.push({ emoji: "👴", text: `${animal.name} est senior — surveillez le poids et l'appétit`, type: "warning" });
    }
  }

  // Profil complétude bonus
  if (animal.weight_kg && animal.next_vaccine_date && animal.last_vet_visit) {
    score += 5;
    insights.push({ emoji: "⭐", text: "Profil santé complet — bravo !", type: "good" });
  }

  score = Math.max(0, Math.min(100, score));

  const label = score >= 80 ? "Excellent" : score >= 60 ? "Bon" : score >= 40 ? "À surveiller" : "Attention";
  const color = score >= 80 ? "#FBBF24" : score >= 60 ? "#84cc16" : score >= 40 ? "#FBBF24" : "#ef4444";

  return { score, label, color, insights };
}

export function HealthScore({ animal }: ScoreProps) {
  const { score, label, color, insights } = computeScore(animal);
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div style={{ background: "#fff", borderRadius: 20, border: `2px solid ${color}30`, padding: 20, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
        {/* Score circulaire */}
        <div style={{ position: "relative", width: 80, height: 80, flexShrink: 0 }}>
          <svg width="80" height="80" viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="50" cy="50" r="45" fill="none" stroke="#f0f0f0" strokeWidth="8" />
            <circle cx="50" cy="50" r="45" fill="none" stroke={color} strokeWidth="8"
              strokeDasharray={circumference} strokeDashoffset={offset}
              strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s ease" }} />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 22, fontWeight: 900, color }}>{score}</span>
            <span style={{ fontSize: 8, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase" }}>santé</span>
          </div>
        </div>

        <div>
          <h3 style={{ fontWeight: 800, fontSize: 16, margin: "0 0 4px" }}>Score santé de {animal.name}</h3>
          <span style={{ fontSize: 13, fontWeight: 700, color, padding: "2px 10px", borderRadius: 50, background: `${color}15` }}>{label}</span>
        </div>
      </div>

      {/* Insights */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {insights.map((insight, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 10px", borderRadius: 10, fontSize: 12, lineHeight: 1.5,
            background: insight.type === "good" ? "#F0FDF4" : insight.type === "warning" ? "#FFFBEB" : "#FEF2F2",
            color: insight.type === "good" ? "#166534" : insight.type === "warning" ? "#92400E" : "#991B1B",
          }}>
            <span style={{ fontSize: 14, flexShrink: 0 }}>{insight.emoji}</span>
            <span>{insight.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
