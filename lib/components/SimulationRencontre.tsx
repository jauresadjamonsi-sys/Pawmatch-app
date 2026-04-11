"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { detectPersonality, PersonalityType } from "@/lib/services/personality";

type SimulationProps = {
  myAnimal: { name: string; species: string; breed?: string; traits?: string[]; photo_url?: string };
  otherAnimal: { name: string; species: string; breed?: string; traits?: string[]; photo_url?: string };
  compatibilityScore: number;
  onClose: () => void;
  lang: string;
};

const SPECIES_EMOJI: Record<string, string> = {
  chien: "🐕", chat: "🐱", lapin: "🐰", oiseau: "🐦", rongeur: "🐹", autre: "🐾",
};

type StepData = { emoji: string; title: string; text: string; duration: number };

function generateSteps(
  myName: string, otherName: string,
  myPersonality: PersonalityType, otherPersonality: PersonalityType,
  mySpecies: string, otherSpecies: string,
  score: number, lang: string
): StepData[] {
  const l = LABELS[lang] || LABELS.fr;

  // Adapter le scénario selon les personnalités
  const isEnergetic = myPersonality.id === "energetic_social" || otherPersonality.id === "energetic_social";
  const isCalm = myPersonality.id === "calm_gentle" || otherPersonality.id === "calm_gentle";
  const isPlayful = myPersonality.id === "playful_curious" || otherPersonality.id === "playful_curious";
  const isShy = myPersonality.id === "independent_proud";

  const meetEmoji = mySpecies === otherSpecies ? "🤝" : "🌟";
  const playEmoji = isEnergetic ? "⚡" : isPlayful ? "🎾" : "🌸";

  return [
    {
      emoji: "📍",
      title: l.step1Title,
      text: l.step1Text.replace("{my}", myName).replace("{other}", otherName),
      duration: 2500,
    },
    {
      emoji: isShy ? "👀" : "👃",
      title: l.step2Title,
      text: isShy
        ? l.step2Shy.replace("{my}", myName).replace("{other}", otherName)
        : l.step2Text.replace("{my}", myName).replace("{other}", otherName),
      duration: 3000,
    },
    {
      emoji: meetEmoji,
      title: l.step3Title,
      text: isCalm
        ? l.step3Calm.replace("{my}", myName).replace("{other}", otherName)
        : l.step3Text.replace("{my}", myName).replace("{other}", otherName),
      duration: 3000,
    },
    {
      emoji: playEmoji,
      title: l.step4Title,
      text: isEnergetic
        ? l.step4Energy.replace("{my}", myName).replace("{other}", otherName)
        : isPlayful
        ? l.step4Play.replace("{my}", myName).replace("{other}", otherName)
        : l.step4Calm.replace("{my}", myName).replace("{other}", otherName),
      duration: 3000,
    },
    {
      emoji: "🌳",
      title: l.step5Title,
      text: l.step5Text.replace("{my}", myName).replace("{other}", otherName),
      duration: 2500,
    },
    {
      emoji: score >= 85 ? "💞" : score >= 70 ? "🐾" : "🤔",
      title: score >= 85 ? l.verdict85 : score >= 70 ? l.verdict70 : l.verdict50,
      text: (score >= 85 ? l.verdictText85 : score >= 70 ? l.verdictText70 : l.verdictText50)
        .replace("{my}", myName).replace("{other}", otherName).replace("{score}", String(score)),
      duration: 4000,
    },
  ];
}

const LABELS: Record<string, Record<string, string>> = {
  fr: {
    title: "Simulation de rencontre",
    subtitle: "Voici comment leur première balade se passerait...",
    step1Title: "Rendez-vous au parc",
    step1Text: "Les propriétaires de {my} et {other} se retrouvent au point de rencontre. Laisses en main, c'est parti !",
    step2Title: "Premier contact",
    step2Text: "{my} s'approche avec curiosité et renifle {other}. La queue remue déjà !",
    step2Shy: "{my} observe {other} à distance, intrigué. Il prend son temps avant de s'approcher.",
    step3Title: "La connexion",
    step3Text: "{my} et {other} se tournent autour — le courant passe immédiatement !",
    step3Calm: "{my} et {other} se rapprochent doucement. Une belle sérénité s'installe entre eux.",
    step4Title: "Les premiers jeux",
    step4Energy: "{my} et {other} explosent d'énergie ! Courses, sauts, jeux de poursuite — impossible de les arrêter !",
    step4Play: "{my} attrape un bâton et l'apporte à {other}. Le jeu commence naturellement !",
    step4Calm: "{my} et {other} marchent côte à côte paisiblement. Pas besoin de mots, ils se comprennent.",
    step5Title: "La balade ensemble",
    step5Text: "{my} et {other} avancent en rythme. Leurs propriétaires échangent un sourire — la magie opère.",
    verdict85: "Coup de foudre ! 💕",
    verdict70: "Belle connexion ! 🐾",
    verdict50: "À revoir ! 🤔",
    verdictText85: "{my} et {other} sont inséparables. Score de compatibilité : {score}%. C'est une évidence — la prochaine balade est déjà prévue !",
    verdictText70: "{my} et {other} s'entendent bien ! Score : {score}%. Encore quelques balades pour devenir meilleurs amis.",
    verdictText50: "{my} et {other} ont besoin de temps. Score : {score}%. La prochaine rencontre sera plus naturelle !",
    share: "📤 Partager",
    restart: "🔄 Rejouer",
    close: "Fermer",
    matchCta: "🐾 Lancer ce match",
  },
  de: {
    title: "Begegnungssimulation",
    subtitle: "So würde ihr erster Spaziergang ablaufen...",
    step1Title: "Treffpunkt im Park",
    step1Text: "Die Besitzer von {my} und {other} treffen sich am Treffpunkt. Leinen in der Hand, los geht's!",
    step2Title: "Erster Kontakt",
    step2Text: "{my} nähert sich neugierig und beschnuppert {other}. Der Schwanz wedelt schon!",
    step2Shy: "{my} beobachtet {other} aus der Ferne, fasziniert. Er nimmt sich Zeit, bevor er sich nähert.",
    step3Title: "Die Verbindung",
    step3Text: "{my} und {other} umkreisen sich — die Chemie stimmt sofort!",
    step3Calm: "{my} und {other} nähern sich sanft. Eine schöne Ruhe breitet sich zwischen ihnen aus.",
    step4Title: "Erste Spiele",
    step4Energy: "{my} und {other} explodieren vor Energie! Rennen, Springen, Jagdspiele — nicht zu stoppen!",
    step4Play: "{my} schnappt sich einen Stock und bringt ihn zu {other}. Das Spiel beginnt ganz natürlich!",
    step4Calm: "{my} und {other} gehen friedlich Seite an Seite. Keine Worte nötig, sie verstehen sich.",
    step5Title: "Der gemeinsame Spaziergang",
    step5Text: "{my} und {other} gehen im Takt. Ihre Besitzer tauschen ein Lächeln — die Magie wirkt.",
    verdict85: "Liebe auf den ersten Blick! 💕",
    verdict70: "Schöne Verbindung! 🐾",
    verdict50: "Nochmal treffen! 🤔",
    verdictText85: "{my} und {other} sind unzertrennlich. Kompatibilität: {score}%. Der nächste Spaziergang ist schon geplant!",
    verdictText70: "{my} und {other} verstehen sich gut! Score: {score}%. Noch ein paar Spaziergänge bis zur besten Freundschaft.",
    verdictText50: "{my} und {other} brauchen Zeit. Score: {score}%. Das nächste Treffen wird natürlicher!",
    share: "📤 Teilen",
    restart: "🔄 Nochmal",
    close: "Schließen",
    matchCta: "🐾 Diesen Match starten",
  },
  it: {
    title: "Simulazione dell'incontro",
    subtitle: "Ecco come andrebbe la loro prima passeggiata...",
    step1Title: "Appuntamento al parco",
    step1Text: "I proprietari di {my} e {other} si ritrovano al punto d'incontro. Guinzagli in mano, si parte!",
    step2Title: "Primo contatto",
    step2Text: "{my} si avvicina con curiosità e annusa {other}. La coda si muove già!",
    step2Shy: "{my} osserva {other} da lontano, incuriosito. Si prende il suo tempo prima di avvicinarsi.",
    step3Title: "La connessione",
    step3Text: "{my} e {other} girano l'uno intorno all'altro — la chimica è immediata!",
    step3Calm: "{my} e {other} si avvicinano dolcemente. Una bella serenità si installa tra loro.",
    step4Title: "I primi giochi",
    step4Energy: "{my} e {other} esplodono di energia! Corse, salti, inseguimenti — impossibile fermarli!",
    step4Play: "{my} prende un bastoncino e lo porta a {other}. Il gioco inizia naturalmente!",
    step4Calm: "{my} e {other} camminano fianco a fianco tranquillamente. Non servono parole, si capiscono.",
    step5Title: "La passeggiata insieme",
    step5Text: "{my} e {other} avanzano in ritmo. I loro proprietari si scambiano un sorriso — la magia funziona.",
    verdict85: "Colpo di fulmine! 💕",
    verdict70: "Bella connessione! 🐾",
    verdict50: "Da rivedere! 🤔",
    verdictText85: "{my} e {other} sono inseparabili. Compatibilità: {score}%. Il prossimo incontro è già previsto!",
    verdictText70: "{my} e {other} vanno d'accordo! Score: {score}%. Ancora qualche passeggiata per diventare migliori amici.",
    verdictText50: "{my} e {other} hanno bisogno di tempo. Score: {score}%. Il prossimo incontro sarà più naturale!",
    share: "📤 Condividi",
    restart: "🔄 Ripeti",
    close: "Chiudi",
    matchCta: "🐾 Avvia questo match",
  },
  en: {
    title: "Meetup simulation",
    subtitle: "Here's how their first walk would go...",
    step1Title: "Meeting at the park",
    step1Text: "{my}'s and {other}'s owners meet at the rendezvous point. Leads in hand, let's go!",
    step2Title: "First contact",
    step2Text: "{my} approaches curiously and sniffs {other}. Tails are already wagging!",
    step2Shy: "{my} watches {other} from a distance, intrigued. Taking time before approaching.",
    step3Title: "The connection",
    step3Text: "{my} and {other} circle each other — the chemistry is instant!",
    step3Calm: "{my} and {other} approach gently. A beautiful calm settles between them.",
    step4Title: "First play",
    step4Energy: "{my} and {other} explode with energy! Running, jumping, chasing — unstoppable!",
    step4Play: "{my} grabs a stick and brings it to {other}. The game starts naturally!",
    step4Calm: "{my} and {other} walk side by side peacefully. No words needed, they understand each other.",
    step5Title: "The walk together",
    step5Text: "{my} and {other} walk in sync. Their owners exchange a smile — the magic is working.",
    verdict85: "Love at first sniff! 💕",
    verdict70: "Great connection! 🐾",
    verdict50: "Try again! 🤔",
    verdictText85: "{my} and {other} are inseparable. Compatibility: {score}%. The next walk is already planned!",
    verdictText70: "{my} and {other} get along well! Score: {score}%. A few more walks to become best friends.",
    verdictText50: "{my} and {other} need time. Score: {score}%. The next meetup will feel more natural!",
    share: "📤 Share",
    restart: "🔄 Replay",
    close: "Close",
    matchCta: "🐾 Start this match",
  },
};

export function SimulationRencontre({ myAnimal, otherAnimal, compatibilityScore, onClose, lang }: SimulationProps) {
  const [currentStep, setCurrentStep] = useState(-1); // -1 = intro
  const [isPlaying, setIsPlaying] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const myPersonality = detectPersonality(myAnimal.traits || []);
  const otherPersonality = detectPersonality(otherAnimal.traits || []);
  const l = LABELS[lang] || LABELS.fr;

  const steps = generateSteps(
    myAnimal.name, otherAnimal.name,
    myPersonality, otherPersonality,
    myAnimal.species, otherAnimal.species,
    compatibilityScore, lang
  );

  useEffect(() => {
    if (!isPlaying || showAll) return;

    if (currentStep === -1) {
      const timer = setTimeout(() => setCurrentStep(0), 1500);
      return () => clearTimeout(timer);
    }

    if (currentStep < steps.length - 1) {
      const timer = setTimeout(() => setCurrentStep(s => s + 1), steps[currentStep].duration);
      return () => clearTimeout(timer);
    } else {
      setIsPlaying(false);
    }
  }, [currentStep, isPlaying, showAll, steps]);

  const handleRestart = () => {
    setCurrentStep(-1);
    setIsPlaying(true);
    setShowAll(false);
  };

  const handleShare = async () => {
    const text = `${myAnimal.name} ${l.step3Title.toLowerCase()} ${otherAnimal.name} — ${compatibilityScore}% ${l.verdict85.includes("!") ? "🐾" : ""}\n\npawly.ch`;
    if (navigator.share) {
      try {
        await navigator.share({ title: l.title, text, url: window.location.href });
      } catch {}
    } else {
      await navigator.clipboard.writeText(text + "\n" + window.location.href);
    }
  };

  const progressPercent = currentStep === -1 ? 0 : ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[var(--c-deep)] border border-[var(--c-border)] rounded-3xl max-w-md w-full overflow-hidden"
        onClick={e => e.stopPropagation()}>

        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes simFadeIn { from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)} }
          @keyframes simPulse { 0%,100%{transform:scale(1)}50%{transform:scale(1.1)} }
          @keyframes simSlide { from{opacity:0;transform:translateX(-20px)}to{opacity:1;transform:translateX(0)} }
          @keyframes dotPulse { 0%,100%{opacity:.3}50%{opacity:1} }
          .sim-fade{animation:simFadeIn .6s ease-out forwards}
          .sim-pulse{animation:simPulse 2s ease-in-out infinite}
          .sim-slide{animation:simSlide .5s ease-out forwards}
          .dot-pulse span:nth-child(1){animation:dotPulse 1.4s ease-in-out infinite}
          .dot-pulse span:nth-child(2){animation:dotPulse 1.4s ease-in-out .2s infinite}
          .dot-pulse span:nth-child(3){animation:dotPulse 1.4s ease-in-out .4s infinite}
        `}} />

        {/* Header avec les deux animaux */}
        <div className="p-5 pb-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-extrabold text-sm text-[var(--c-text)]">{l.title}</h2>
            <button onClick={onClose} className="text-[var(--c-text-muted)] text-xl leading-none">&times;</button>
          </div>

          <div className="flex items-center justify-center gap-4 mb-3">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full overflow-hidden border-2 mx-auto mb-1 relative" style={{ borderColor: myPersonality.color }}>
                {myAnimal.photo_url
                  ? <Image src={myAnimal.photo_url} alt={myAnimal.name} fill className="object-cover" sizes="(max-width: 768px) 56px, 56px" />
                  : <div className="w-full h-full flex items-center justify-center bg-[var(--c-card)] text-xl">{SPECIES_EMOJI[myAnimal.species] || "🐾"}</div>}
              </div>
              <p className="text-xs font-bold text-[var(--c-text)]">{myAnimal.name}</p>
              <p className="text-[9px]" style={{ color: myPersonality.color }}>{myPersonality.emoji} {myPersonality.name}</p>
            </div>

            <div className="text-center">
              <div className="text-2xl sim-pulse">❤️</div>
              <p className="text-lg font-black text-amber-500">{compatibilityScore}%</p>
            </div>

            <div className="text-center">
              <div className="w-14 h-14 rounded-full overflow-hidden border-2 mx-auto mb-1 relative" style={{ borderColor: otherPersonality.color }}>
                {otherAnimal.photo_url
                  ? <Image src={otherAnimal.photo_url} alt={otherAnimal.name} fill className="object-cover" sizes="(max-width: 768px) 56px, 56px" />
                  : <div className="w-full h-full flex items-center justify-center bg-[var(--c-card)] text-xl">{SPECIES_EMOJI[otherAnimal.species] || "🐾"}</div>}
              </div>
              <p className="text-xs font-bold text-[var(--c-text)]">{otherAnimal.name}</p>
              <p className="text-[9px]" style={{ color: otherPersonality.color }}>{otherPersonality.emoji} {otherPersonality.name}</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-[var(--c-border)] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progressPercent}%`, background: "linear-gradient(to right, var(--c-accent, #F59E0B), #F59E0B)" }} />
          </div>
        </div>

        {/* Contenu de la simulation */}
        <div className="px-5 pb-5 min-h-[200px] flex flex-col justify-center">
          {currentStep === -1 ? (
            <div className="text-center sim-fade">
              <p className="text-sm text-[var(--c-text-muted)] italic mb-3">{l.subtitle}</p>
              <div className="dot-pulse flex justify-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[var(--c-text-muted)]" />
                <span className="w-2 h-2 rounded-full bg-[var(--c-text-muted)]" />
                <span className="w-2 h-2 rounded-full bg-[var(--c-text-muted)]" />
              </div>
            </div>
          ) : showAll ? (
            <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto">
              {steps.map((step, i) => (
                <div key={i} className="flex items-start gap-3 sim-slide" style={{ animationDelay: `${i * 0.1}s` }}>
                  <div className="w-8 h-8 rounded-full bg-[var(--c-card)] border border-[var(--c-border)] flex items-center justify-center text-sm flex-shrink-0">
                    {step.emoji}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[var(--c-text)]">{step.title}</p>
                    <p className="text-[11px] text-[var(--c-text-muted)] leading-relaxed">{step.text}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div key={currentStep} className="sim-fade">
              <div className="text-center mb-3">
                <span className="text-4xl block mb-2">{steps[currentStep].emoji}</span>
                <h3 className="font-extrabold text-[var(--c-text)] mb-2">{steps[currentStep].title}</h3>
                <p className="text-sm text-[var(--c-text-muted)] leading-relaxed max-w-xs mx-auto">{steps[currentStep].text}</p>
              </div>
              <div className="flex justify-center gap-1.5 mt-4">
                {steps.map((_, i) => (
                  <div key={i} className="w-2 h-2 rounded-full transition-all" style={{
                    background: i === currentStep ? "var(--c-accent, #F59E0B)" : i < currentStep ? "#F59E0B" : "var(--c-border)",
                    transform: i === currentStep ? "scale(1.3)" : "scale(1)",
                  }} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {(!isPlaying || showAll) && (
          <div className="px-5 pb-5 flex flex-col gap-2 sim-fade">
            <div className="flex gap-2">
              <button onClick={handleShare} className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-[var(--c-card)] border border-[var(--c-border)] text-[var(--c-text-muted)]">
                {l.share}
              </button>
              <button onClick={handleRestart} className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-[var(--c-card)] border border-[var(--c-border)] text-[var(--c-text-muted)]">
                {l.restart}
              </button>
              {!showAll && (
                <button onClick={() => setShowAll(true)} className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-[var(--c-card)] border border-[var(--c-border)] text-[var(--c-text-muted)]">
                  📋
                </button>
              )}
            </div>
            <button onClick={onClose} className="w-full py-3 rounded-xl text-sm font-bold text-white" style={{ background: "var(--c-accent, #F59E0B)" }}>
              {l.matchCta}
            </button>
          </div>
        )}

        {/* Tap to skip pendant la lecture */}
        {isPlaying && currentStep >= 0 && (
          <button onClick={() => setCurrentStep(s => Math.min(s + 1, steps.length - 1))} className="w-full py-3 text-[10px] text-[var(--c-text-muted)] border-t border-[var(--c-border)]">
            tap pour passer →
          </button>
        )}
      </div>
    </div>
  );
}
