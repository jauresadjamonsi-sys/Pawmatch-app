"use client";

type SmartProps = {
  animal: {
    name: string;
    species: string;
    breed: string | null;
    age_months: number | null;
    weight_kg: number | null;
    traits: string[];
    canton: string | null;
    next_vaccine_date: string | null;
    last_vet_visit: string | null;
  };
};

type ServiceRec = { emoji: string; reason: string; category: string; urgency: "high" | "medium" | "low"; cta: string };

function getSmartRecommendations(animal: SmartProps["animal"]): ServiceRec[] {
  const recs: ServiceRec[] = [];
  const canton = animal.canton || "VD";
  const base = `https://pawdirectory.ch/annuaire?cn=${canton}&cat=`;

  // Vaccins en retard
  if (animal.next_vaccine_date) {
    const days = Math.ceil((new Date(animal.next_vaccine_date).getTime() - Date.now()) / 86400000);
    if (days < 0) {
      recs.push({ emoji: "🚨", reason: `Vaccin en retard de ${Math.abs(days)} jours`, category: "Vétérinaire", urgency: "high", cta: base + encodeURIComponent("Vétérinaire") });
    } else if (days <= 14) {
      recs.push({ emoji: "💉", reason: `Vaccin dans ${days} jours — prenez RDV`, category: "Vétérinaire", urgency: "medium", cta: base + encodeURIComponent("Vétérinaire") });
    }
  }

  // Véto pas vu depuis longtemps
  if (animal.last_vet_visit) {
    const months = Math.round((Date.now() - new Date(animal.last_vet_visit).getTime()) / (30 * 86400000));
    if (months > 12) {
      recs.push({ emoji: "🏥", reason: `${months} mois sans véto — bilan recommandé`, category: "Vétérinaire", urgency: "high", cta: base + encodeURIComponent("Vétérinaire") });
    }
  }

  // Traits comportementaux
  if (animal.traits?.includes("Craintif") || animal.traits?.includes("Anxieux")) {
    recs.push({ emoji: "🧘", reason: `${animal.name} est craintif — un éducateur peut aider`, category: "Dresseur", urgency: "medium", cta: base + encodeURIComponent("Dresseur") });
    recs.push({ emoji: "💆", reason: "Le massage canin réduit l'anxiété", category: "Bien-être & Spa", urgency: "low", cta: base + encodeURIComponent("Bien-être & Spa") });
  }

  if (animal.traits?.includes("Agressif") || animal.traits?.includes("Dominant")) {
    recs.push({ emoji: "🎓", reason: `Comportement dominant — éducateur spécialisé recommandé`, category: "Dresseur", urgency: "high", cta: base + encodeURIComponent("Dresseur") });
  }

  if (animal.traits?.includes("Energique") || animal.traits?.includes("Sportif")) {
    recs.push({ emoji: "🌲", reason: `${animal.name} déborde d'énergie — trouvez des lieux de sortie`, category: "Lieu & Sortie", urgency: "low", cta: base + encodeURIComponent("Lieu & Sortie") });
  }

  // Bilan nutrition
  if (animal.weight_kg && animal.species === "chien") {
    const isLarge = (animal.breed || "").match(/Berger|Labrador|Golden|Husky|Rottweiler|Dogue/i);
    const threshold = isLarge ? 38 : 12;
    if (animal.weight_kg > threshold * 1.2) {
      recs.push({ emoji: "🍽️", reason: `Un bilan nutritionnel peut aider ${animal.name} à rester en pleine forme`, category: "Vétérinaire", urgency: "low", cta: base + encodeURIComponent("Vétérinaire") });
    }
  }

  // Senior
  if ((animal.age_months || 0) > 84) {
    recs.push({ emoji: "🩺", reason: `${animal.name} est senior — ostéopathie recommandée`, category: "Ostéo & Physio", urgency: "medium", cta: base + encodeURIComponent("Ostéo & Physio") });
  }

  // Jeune
  if ((animal.age_months || 24) < 12) {
    recs.push({ emoji: "🐾", reason: `Chiot/chaton — socialisation et éducation essentielles`, category: "Dresseur", urgency: "medium", cta: base + encodeURIComponent("Dresseur") });
  }

  // Copain de balade toujours
  recs.push({ emoji: "🦮", reason: `Trouvez un copain de balade pour ${animal.name}`, category: "PawBand", urgency: "low", cta: "https://pawband.ch/flairer" });

  const urgencyOrder = { high: 0, medium: 1, low: 2 };
  return recs.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]).slice(0, 4);
}

export function SmartServices({ animal }: SmartProps) {
  const recs = getSmartRecommendations(animal);
  if (recs.length === 0) return null;

  const urgencyColors = {
    high: { bg: "#FEF2F2", border: "#FECACA", text: "#991B1B" },
    medium: { bg: "#FFFBEB", border: "#FDE68A", text: "#92400E" },
    low: { bg: "#F0FDFA", border: "#99F6E4", text: "#0D9488" },
  };

  return (
    <div style={{ background: "#fff", borderRadius: 20, border: "1.5px solid rgba(13,148,136,0.15)", padding: 20, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 18 }}>🎯</span>
        <div>
          <h3 style={{ fontWeight: 800, fontSize: 15, margin: 0 }}>Services recommandés pour {animal.name}</h3>
          <p style={{ fontSize: 10, color: "#6b7280", margin: 0 }}>Basé sur son profil, sa santé et son comportement</p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {recs.map((rec, i) => {
          const colors = urgencyColors[rec.urgency];
          return (
            <a key={i} href={rec.cta} target={rec.cta.includes("pawdirectory") ? "_blank" : "_self"} rel="noopener"
              style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 12, textDecoration: "none" }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>{rec.emoji}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: colors.text, margin: 0 }}>{rec.reason}</p>
                <p style={{ fontSize: 10, color: "#9ca3af", margin: "2px 0 0" }}>{rec.category}</p>
              </div>
              <span style={{ fontSize: 14, color: colors.text }}>→</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
