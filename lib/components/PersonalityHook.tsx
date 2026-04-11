"use client";

import { useState } from "react";
import Link from "next/link";

type Lang = "fr" | "de" | "it" | "en";

const QUESTIONS: Record<string, { q: string; answers: { text: string; traits: string[] }[] }[]> = {
  fr: [
    { q: "Votre animal rencontre un inconnu. Il...", answers: [
      { text: "🎉 Fonce dire bonjour !", traits: ["Sociable", "Energique"] },
      { text: "🤔 Observe à distance", traits: ["Prudent", "Calme"] },
      { text: "😴 S'en fiche complètement", traits: ["Indépendant", "Calme"] },
      { text: "🐾 Se cache derrière vous", traits: ["Craintif", "Sensible"] },
    ]},
    { q: "En balade, votre animal...", answers: [
      { text: "🏃 Tire sur la laisse, veut tout explorer", traits: ["Energique", "Aventurier"] },
      { text: "🦮 Marche calmement à vos côtés", traits: ["Calme", "Obéissant"] },
      { text: "🌿 Renifle chaque brin d'herbe", traits: ["Curieux", "Indépendant"] },
      { text: "🐕 Veut jouer avec chaque chien", traits: ["Sociable", "Joueur"] },
    ]},
    { q: "À la maison, votre animal préfère...", answers: [
      { text: "🛋️ Le canapé, contre vous", traits: ["Câlin", "Sensible"] },
      { text: "🎾 Jouer, jouer, jouer !", traits: ["Joueur", "Energique"] },
      { text: "🪟 Observer par la fenêtre", traits: ["Curieux", "Indépendant"] },
      { text: "👑 Dormir dans SON fauteuil", traits: ["Indépendant", "Calme"] },
    ]},
  ],
  de: [
    { q: "Dein Tier trifft einen Fremden. Es...", answers: [
      { text: "🎉 Rennt sofort hin!", traits: ["Sociable", "Energique"] },
      { text: "🤔 Beobachtet aus der Ferne", traits: ["Prudent", "Calme"] },
      { text: "😴 Ist völlig egal", traits: ["Indépendant", "Calme"] },
      { text: "🐾 Versteckt sich hinter dir", traits: ["Craintif", "Sensible"] },
    ]},
    { q: "Beim Spaziergang, dein Tier...", answers: [
      { text: "🏃 Zieht an der Leine, will alles erkunden", traits: ["Energique", "Aventurier"] },
      { text: "🦮 Läuft ruhig neben dir", traits: ["Calme", "Obéissant"] },
      { text: "🌿 Schnüffelt an jedem Grashalm", traits: ["Curieux", "Indépendant"] },
      { text: "🐕 Will mit jedem Hund spielen", traits: ["Sociable", "Joueur"] },
    ]},
    { q: "Zu Hause bevorzugt dein Tier...", answers: [
      { text: "🛋️ Das Sofa, neben dir", traits: ["Câlin", "Sensible"] },
      { text: "🎾 Spielen, spielen, spielen!", traits: ["Joueur", "Energique"] },
      { text: "🪟 Aus dem Fenster schauen", traits: ["Curieux", "Indépendant"] },
      { text: "👑 In SEINEM Sessel schlafen", traits: ["Indépendant", "Calme"] },
    ]},
  ],
  it: [
    { q: "Il tuo animale incontra uno sconosciuto. Lui...", answers: [
      { text: "🎉 Corre a salutare!", traits: ["Sociable", "Energique"] },
      { text: "🤔 Osserva da lontano", traits: ["Prudent", "Calme"] },
      { text: "😴 Non gli importa", traits: ["Indépendant", "Calme"] },
      { text: "🐾 Si nasconde dietro di te", traits: ["Craintif", "Sensible"] },
    ]},
    { q: "A passeggio, il tuo animale...", answers: [
      { text: "🏃 Tira il guinzaglio, vuole esplorare tutto", traits: ["Energique", "Aventurier"] },
      { text: "🦮 Cammina tranquillo al tuo fianco", traits: ["Calme", "Obéissant"] },
      { text: "🌿 Annusa ogni filo d'erba", traits: ["Curieux", "Indépendant"] },
      { text: "🐕 Vuole giocare con ogni cane", traits: ["Sociable", "Joueur"] },
    ]},
    { q: "A casa, il tuo animale preferisce...", answers: [
      { text: "🛋️ Il divano, vicino a te", traits: ["Câlin", "Sensible"] },
      { text: "🎾 Giocare, giocare, giocare!", traits: ["Joueur", "Energique"] },
      { text: "🪟 Guardare dalla finestra", traits: ["Curieux", "Indépendant"] },
      { text: "👑 Dormire nella SUA poltrona", traits: ["Indépendant", "Calme"] },
    ]},
  ],
  en: [
    { q: "Your pet meets a stranger. They...", answers: [
      { text: "🎉 Rush to say hello!", traits: ["Sociable", "Energique"] },
      { text: "🤔 Watch from a distance", traits: ["Prudent", "Calme"] },
      { text: "😴 Couldn't care less", traits: ["Indépendant", "Calme"] },
      { text: "🐾 Hide behind you", traits: ["Craintif", "Sensible"] },
    ]},
    { q: "On a walk, your pet...", answers: [
      { text: "🏃 Pulls on the lead, wants to explore", traits: ["Energique", "Aventurier"] },
      { text: "🦮 Walks calmly by your side", traits: ["Calme", "Obéissant"] },
      { text: "🌿 Sniffs every blade of grass", traits: ["Curieux", "Indépendant"] },
      { text: "🐕 Wants to play with every dog", traits: ["Sociable", "Joueur"] },
    ]},
    { q: "At home, your pet prefers...", answers: [
      { text: "🛋️ The sofa, next to you", traits: ["Câlin", "Sensible"] },
      { text: "🎾 Play, play, play!", traits: ["Joueur", "Energique"] },
      { text: "🪟 Watching out the window", traits: ["Curieux", "Indépendant"] },
      { text: "👑 Sleeping in THEIR armchair", traits: ["Indépendant", "Calme"] },
    ]},
  ],
};

const PERSONALITIES: Record<string, Record<string, { name: string; emoji: string; color: string; desc: string }>> = {
  fr: {
    "Sociable": { name: "L'Ambassadeur", emoji: "🌟", color: "#f59e0b", desc: "Votre animal est un vrai social ! Il adore les rencontres et met tout le monde à l'aise." },
    "Energique": { name: "Le Tornado", emoji: "⚡", color: "#ef4444", desc: "Impossible de suivre ! Votre animal déborde d'énergie et a besoin d'action." },
    "Calme": { name: "Le Zen", emoji: "🧘", color: "#22c55e", desc: "La tranquillité incarnée. Votre animal apporte le calme partout où il va." },
    "Curieux": { name: "L'Explorateur", emoji: "🔍", color: "#3b82f6", desc: "Chaque jour est une aventure ! Votre animal veut tout découvrir." },
    "Câlin": { name: "Le Coccolone", emoji: "🤗", color: "#ec4899", desc: "Pot de colle adorable ! Votre animal vit pour les câlins et la proximité." },
    "Indépendant": { name: "Le Libre", emoji: "🦁", color: "#8b5cf6", desc: "Un esprit libre qui n'a besoin de personne. Mais quand il vient vers vous, c'est magique." },
    "Craintif": { name: "Le Sensible", emoji: "🌸", color: "#f472b6", desc: "Un cœur d'or derrière la timidité. Avec patience, il s'ouvre et devient le plus fidèle." },
    "Joueur": { name: "Le Farceur", emoji: "🎪", color: "#22C55E", desc: "La vie est un jeu ! Votre animal transforme tout en moment fun." },
  },
  de: {
    "Sociable": { name: "Der Botschafter", emoji: "🌟", color: "#f59e0b", desc: "Dein Tier ist super gesellig! Es liebt Begegnungen und bringt alle zusammen." },
    "Energique": { name: "Der Tornado", emoji: "⚡", color: "#ef4444", desc: "Nicht zu bremsen! Dein Tier strotzt vor Energie und braucht Action." },
    "Calme": { name: "Der Zen-Meister", emoji: "🧘", color: "#22c55e", desc: "Die Ruhe selbst. Dein Tier bringt überall Gelassenheit mit." },
    "Curieux": { name: "Der Entdecker", emoji: "🔍", color: "#3b82f6", desc: "Jeder Tag ist ein Abenteuer! Dein Tier will alles erkunden." },
    "Câlin": { name: "Das Kuschelmonster", emoji: "🤗", color: "#ec4899", desc: "Zum Knuddeln! Dein Tier lebt für Nähe und Streicheleinheiten." },
    "Indépendant": { name: "Der Freigeist", emoji: "🦁", color: "#8b5cf6", desc: "Ein freier Geist. Aber wenn er zu dir kommt, ist es magisch." },
    "Craintif": { name: "Der Sensible", emoji: "🌸", color: "#f472b6", desc: "Ein Herz aus Gold hinter der Schüchternheit. Mit Geduld wird er der treueste." },
    "Joueur": { name: "Der Spassvogel", emoji: "🎪", color: "#22C55E", desc: "Das Leben ist ein Spiel! Dein Tier macht aus allem einen Spass." },
  },
  it: {
    "Sociable": { name: "L'Ambasciatore", emoji: "🌟", color: "#f59e0b", desc: "Il tuo animale è super socievole! Adora gli incontri e mette tutti a loro agio." },
    "Energique": { name: "Il Tornado", emoji: "⚡", color: "#ef4444", desc: "Impossibile fermarlo! Il tuo animale trabocca di energia." },
    "Calme": { name: "Lo Zen", emoji: "🧘", color: "#22c55e", desc: "La tranquillità fatta animale. Porta calma ovunque vada." },
    "Curieux": { name: "L'Esploratore", emoji: "🔍", color: "#3b82f6", desc: "Ogni giorno è un'avventura! Vuole scoprire tutto." },
    "Câlin": { name: "Il Coccolone", emoji: "🤗", color: "#ec4899", desc: "Adorabile! Il tuo animale vive per le coccole e la vicinanza." },
    "Indépendant": { name: "Il Libero", emoji: "🦁", color: "#8b5cf6", desc: "Spirito libero. Ma quando viene da te, è magico." },
    "Craintif": { name: "Il Sensibile", emoji: "🌸", color: "#f472b6", desc: "Un cuore d'oro dietro la timidezza. Con pazienza diventa il più fedele." },
    "Joueur": { name: "Il Giocherellone", emoji: "🎪", color: "#22C55E", desc: "La vita è un gioco! Trasforma tutto in divertimento." },
  },
  en: {
    "Sociable": { name: "The Ambassador", emoji: "🌟", color: "#f59e0b", desc: "Your pet is a true social butterfly! They love meetups and put everyone at ease." },
    "Energique": { name: "The Tornado", emoji: "⚡", color: "#ef4444", desc: "Can't keep up! Your pet is bursting with energy and needs action." },
    "Calme": { name: "The Zen Master", emoji: "🧘", color: "#22c55e", desc: "Calm personified. Your pet brings peace wherever they go." },
    "Curieux": { name: "The Explorer", emoji: "🔍", color: "#3b82f6", desc: "Every day is an adventure! Your pet wants to discover everything." },
    "Câlin": { name: "The Cuddle Bug", emoji: "🤗", color: "#ec4899", desc: "Adorable cuddler! Your pet lives for snuggles and closeness." },
    "Indépendant": { name: "The Free Spirit", emoji: "🦁", color: "#8b5cf6", desc: "A free spirit who needs no one. But when they come to you, it's magical." },
    "Craintif": { name: "The Sensitive Soul", emoji: "🌸", color: "#f472b6", desc: "A heart of gold behind the shyness. With patience, they become the most loyal." },
    "Joueur": { name: "The Jester", emoji: "🎪", color: "#22C55E", desc: "Life is a game! Your pet turns everything into a fun moment." },
  },
};

const UI: Record<string, { title: string; subtitle: string; startBtn: string; cta: string; ctaBtn: string }> = {
  fr: { title: "Quel type de personnalité a ton animal ?", subtitle: "3 questions · 30 secondes · résultat instantané", startBtn: "Faire le test →", cta: "Inscris-toi pour voir le profil complet, trouver des copains compatibles et obtenir des conseils personnalisés", ctaBtn: "Créer le profil de mon animal →" },
  de: { title: "Welchen Charakter hat dein Tier?", subtitle: "3 Fragen · 30 Sekunden · sofortiges Ergebnis", startBtn: "Test starten →", cta: "Registriere dich für das vollständige Profil, kompatible Freunde und persönliche Tipps", ctaBtn: "Profil meines Tieres erstellen →" },
  it: { title: "Che personalità ha il tuo animale?", subtitle: "3 domande · 30 secondi · risultato istantaneo", startBtn: "Fai il test →", cta: "Iscriviti per il profilo completo, amici compatibili e consigli personalizzati", ctaBtn: "Crea il profilo del mio animale →" },
  en: { title: "What's your pet's personality type?", subtitle: "3 questions · 30 seconds · instant result", startBtn: "Take the test →", cta: "Sign up to see the full profile, find compatible buddies and get personalised tips", ctaBtn: "Create my pet's profile →" },
};

export function PersonalityHook({ lang }: { lang: string }) {
  const [step, setStep] = useState(0);
  const [selectedTraits, setSelectedTraits] = useState<string[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

  const l = (lang as Lang) || "fr";
  const questions = QUESTIONS[l] || QUESTIONS.fr;
  const personalities = PERSONALITIES[l] || PERSONALITIES.fr;
  const ui = UI[l] || UI.fr;

  function handleAnswer(traits: string[]) {
    const newTraits = [...selectedTraits, ...traits];
    setSelectedTraits(newTraits);
    if (step < questions.length - 1) {
      setStep(step + 1);
    } else {
      const counts: Record<string, number> = {};
      newTraits.forEach(t => { counts[t] = (counts[t] || 0) + 1; });
      const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
      setResult(dominant);
    }
  }

  const personality = result ? personalities[result] || personalities["Sociable"] : null;

  if (!started) {
    return (
      <div style={{ background: "var(--c-card)", border: "2px solid var(--c-border)", borderRadius: 20, padding: 24, textAlign: "center" }}>
        <span style={{ fontSize: 40, display: "block", marginBottom: 8 }}>🧠</span>
        <h3 style={{ fontWeight: 800, fontSize: 16, color: "var(--c-text)", marginBottom: 4 }}>{ui.title}</h3>
        <p style={{ fontSize: 12, color: "var(--c-text-muted)", marginBottom: 16 }}>{ui.subtitle}</p>
        <button onClick={() => setStarted(true)}
          style={{ padding: "12px 28px", background: "#22C55E", color: "#fff", border: "none", borderRadius: 50, fontWeight: 800, fontSize: 14, cursor: "pointer", boxShadow: "0 0 20px rgba(249,115,22,0.3)" }}>
          {ui.startBtn}
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
          <p style={{ fontSize: 11, color: personality.color, fontWeight: 700, margin: 0 }}>🔒 {ui.cta}</p>
        </div>
        <Link href="/signup"
          style={{ display: "inline-block", padding: "12px 28px", background: personality.color, color: "#fff", borderRadius: 50, fontWeight: 800, fontSize: 14, textDecoration: "none" }}>
          🐾 {ui.ctaBtn}
        </Link>
      </div>
    );
  }

  const q = questions[step];

  return (
    <div style={{ background: "var(--c-card)", border: "2px solid var(--c-border)", borderRadius: 20, padding: 24 }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {questions.map((_, i) => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= step ? "#22C55E" : "var(--c-border)", transition: "background 0.3s" }} />
        ))}
      </div>
      <h3 style={{ fontWeight: 800, fontSize: 15, color: "var(--c-text)", marginBottom: 14, textAlign: "center" }}>{q.q}</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {q.answers.map((a, i) => (
          <button key={i} onClick={() => handleAnswer(a.traits)}
            style={{ padding: "14px 16px", background: "var(--c-deep, rgba(255,255,255,0.03))", border: "1.5px solid var(--c-border)", borderRadius: 14, cursor: "pointer", textAlign: "left", fontSize: 14, fontWeight: 600, color: "var(--c-text)", transition: "all 0.2s" }}
            onMouseOver={e => { (e.target as HTMLElement).style.borderColor = "#22C55E"; (e.target as HTMLElement).style.background = "rgba(249,115,22,0.05)"; }}
            onMouseOut={e => { (e.target as HTMLElement).style.borderColor = "var(--c-border)"; (e.target as HTMLElement).style.background = "var(--c-deep, rgba(255,255,255,0.03))"; }}>
            {a.text}
          </button>
        ))}
      </div>
    </div>
  );
}
