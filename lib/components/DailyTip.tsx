"use client";

import { useState, useEffect } from "react";

type DailyTipProps = {
  animal: {
    name: string;
    species: string;
    breed: string | null;
    age_months: number | null;
    weight_kg: number | null;
    traits: string[];
    canton: string | null;
  };
};

type Tip = { emoji: string; title: string; body: string; cta?: { label: string; url: string } };

function getTips(animal: DailyTipProps["animal"]): Tip[] {
  const isDog = animal.species === "chien";
  const isCat = animal.species === "chat";
  const isSenior = (animal.age_months || 24) > 84;
  const isYoung = (animal.age_months || 24) < 12;
  const canton = animal.canton || "VD";

  const tips: Tip[] = [
    { emoji: "🦴", title: "Astuce dentaire", body: isDog ? `Donnez un os à mâcher naturel à ${animal.name} 2-3x par semaine. Ça nettoie les dents et occupe pendant des heures.` : `Les croquettes sèches aident à maintenir les dents de ${animal.name} propres. Vérifiez ses gencives chaque mois.`, cta: { label: "Trouver un véto dentaire →", url: `https://pawdirectory.ch/annuaire?cat=V%C3%A9t%C3%A9rinaire&cn=${canton}` } },
    { emoji: "💧", title: "Hydratation", body: isDog ? `Un chien actif a besoin de 50-100ml d'eau par kg par jour. Pour ${animal.name}, visez ${animal.weight_kg ? Math.round(animal.weight_kg * 75) + "ml" : "au moins 500ml"} par jour.` : `Les chats boivent peu naturellement. Une fontaine à eau augmente la consommation de ${animal.name} de 200%. Investissement : CHF 30-50.` },
    { emoji: "🏃", title: "Exercice du jour", body: isDog ? `Aujourd'hui, essayez une nouvelle route de balade avec ${animal.name}. Les chiens adorent explorer de nouveaux sentiers — ça stimule leur cerveau autant que leurs muscles.` : `Faites une session de jeu de 10 min avec ${animal.name}. Utilisez un jouet type "canne à pêche" — ça active l'instinct de chasse.`, cta: { label: "Trouver un parc à chiens →", url: `https://pawdirectory.ch/annuaire?cat=Lieu+%26+Sortie&cn=${canton}` } },
    { emoji: "🧠", title: "Stimulation mentale", body: isDog ? `Cachez des friandises dans la maison et laissez ${animal.name} les chercher. 10 min de travail de nez fatigue autant qu'une heure de balade !` : `Déplacez la gamelle de ${animal.name} à un endroit différent. Ce petit changement stimule sa curiosité et son intelligence.` },
    { emoji: "🛁", title: "Toilettage", body: isDog ? `Brossez ${animal.name} 2-3x par semaine. En plus de garder le poil beau, ça renforce votre lien et permet de détecter parasites ou problèmes de peau.` : `Les chats se toilettent seuls mais ${animal.name} appréciera un brossage doux. Ça réduit les boules de poils et les allergènes.`, cta: { label: "Trouver un toiletteur →", url: `https://pawdirectory.ch/annuaire?cat=Toiletteur&cn=${canton}` } },
    { emoji: "😴", title: "Sommeil", body: isDog ? `${animal.name} a besoin de 12-14h de sommeil par jour${isSenior ? " (jusqu'à 18h pour un senior)" : ""}. Un coin calme et confortable est essentiel.` : `${animal.name} dort 15-20h par jour — c'est normal ! Offrez-lui plusieurs spots de sieste en hauteur.` },
    { emoji: "🥕", title: "Snack sain", body: isDog ? `Snack du jour pour ${animal.name} : carottes crues ! Peu caloriques, bonnes pour les dents, et la plupart des chiens adorent ça.` : `Herbe à chat fraîche : facile à cultiver et excellente pour la digestion de ${animal.name}. Plantez-en un pot sur le rebord de fenêtre.` },
    { emoji: "🐕‍🦺", title: "Socialisation", body: `Une rencontre avec un autre animal est excellente pour ${animal.name}. La socialisation régulière réduit l'anxiété et améliore le comportement.`, cta: { label: "Trouver un copain de balade →", url: "https://pawlyapp.ch/flairer" } },
    { emoji: "🌡️", title: "Check santé maison", body: isDog ? `Vérifiez les pattes de ${animal.name} aujourd'hui : coussinets, ongles, entre les doigts. 30 secondes qui peuvent prévenir des problèmes.` : `Vérifiez les oreilles de ${animal.name} : elles doivent être propres et sans odeur. Un nettoyage mensuel suffit.`, cta: { label: "Trouver un véto →", url: `https://pawdirectory.ch/annuaire?cat=V%C3%A9t%C3%A9rinaire&cn=${canton}` } },
    { emoji: "❤️", title: "Moment câlin", body: `Prenez 5 minutes aujourd'hui juste pour être avec ${animal.name}. Pas de téléphone, pas de distraction. Ce moment de connexion pure renforce votre lien comme rien d'autre.` },
  ];

  if (isSenior) {
    tips.push({ emoji: "👴", title: "Soin senior", body: `${animal.name} est senior — adaptez son alimentation avec des croquettes senior et ajoutez des oméga-3 pour ses articulations.`, cta: { label: "Véto spécialisé →", url: `https://pawdirectory.ch/annuaire?cat=V%C3%A9t%C3%A9rinaire&cn=${canton}` } });
  }

  if (isYoung) {
    tips.push({ emoji: "🐾", title: "Éducation", body: `À cet âge, ${animal.name} apprend vite ! 5 min d'entraînement par jour suffisent. Récompensez toujours les bons comportements.`, cta: { label: "Trouver un éducateur →", url: `https://pawdirectory.ch/annuaire?cat=Dresseur&cn=${canton}` } });
  }

  return tips;
}

export function DailyTip({ animal }: DailyTipProps) {
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    // Tip du jour basé sur la date
    const day = new Date().getDate();
    const tips = getTips(animal);
    setTipIndex(day % tips.length);
  }, []);

  const tips = getTips(animal);
  const tip = tips[tipIndex];
  if (!tip) return null;

  return (
    <div style={{ background: "linear-gradient(135deg, #FFF7ED, #FFFBEB)", borderRadius: 20, border: "1.5px solid #FDE68A", padding: 20, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 24 }}>{tip.emoji}</span>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, color: "#D97706", textTransform: "uppercase", letterSpacing: 1 }}>Conseil du jour</div>
          <h3 style={{ fontWeight: 800, fontSize: 15, margin: 0, color: "#1a1714" }}>{tip.title}</h3>
        </div>
      </div>
      <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.7, margin: "0 0 12px" }}>{tip.body}</p>
      {tip.cta && (
        <a href={tip.cta.url} target={tip.cta.url.includes("pawdirectory") ? "_blank" : "_self"} rel="noopener"
          style={{ display: "inline-block", padding: "8px 16px", background: "#D97706", color: "#fff", borderRadius: 50, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
          {tip.cta.label}
        </a>
      )}
    </div>
  );
}
