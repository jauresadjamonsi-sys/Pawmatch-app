"use client";

type BadgeData = {
  id: string;
  emoji: string;
  name: string;
  description: string;
  earned: boolean;
  progress?: number;
  max?: number;
};

type BadgesProps = {
  matchCount: number;
  messageCount: number;
  animalCount: number;
  daysMember: number;
  hasPhoto: boolean;
  hasPremium: boolean;
  lang: string;
};

function getBadges(props: BadgesProps): BadgeData[] {
  return [
    {
      id: "first_animal", emoji: "🐾", name: "Premier compagnon",
      description: "Ajouter son premier animal",
      earned: props.animalCount >= 1,
    },
    {
      id: "photographer", emoji: "📸", name: "Photographe",
      description: "Ajouter une photo à son animal",
      earned: props.hasPhoto,
    },
    {
      id: "first_match", emoji: "💕", name: "Premier flairage",
      description: "Envoyer sa première demande de match",
      earned: props.matchCount >= 1,
    },
    {
      id: "social", emoji: "🦮", name: "Sociable",
      description: "5 matchs envoyés",
      earned: props.matchCount >= 5,
      progress: Math.min(props.matchCount, 5), max: 5,
    },
    {
      id: "chatterbox", emoji: "💬", name: "Bavard",
      description: "Envoyer 10 messages",
      earned: props.messageCount >= 10,
      progress: Math.min(props.messageCount, 10), max: 10,
    },
    {
      id: "popular", emoji: "⭐", name: "Populaire",
      description: "20 matchs atteints",
      earned: props.matchCount >= 20,
      progress: Math.min(props.matchCount, 20), max: 20,
    },
    {
      id: "veteran", emoji: "🏆", name: "Vétéran",
      description: "Membre depuis 30 jours",
      earned: props.daysMember >= 30,
      progress: Math.min(props.daysMember, 30), max: 30,
    },
    {
      id: "multi_pet", emoji: "👑", name: "Famille nombreuse",
      description: "3 animaux enregistrés",
      earned: props.animalCount >= 3,
      progress: Math.min(props.animalCount, 3), max: 3,
    },
    {
      id: "premium", emoji: "💎", name: "Premium",
      description: "Souscrire à PawPlus ou PawPro",
      earned: props.hasPremium,
    },
  ];
}

export function BadgesSection({ matchCount, messageCount, animalCount, daysMember, hasPhoto, hasPremium, lang }: BadgesProps) {
  const badges = getBadges({ matchCount, messageCount, animalCount, daysMember, hasPhoto, hasPremium, lang });
  const earned = badges.filter(b => b.earned);
  const locked = badges.filter(b => !b.earned);

  const TITLE: Record<string, string> = {
    fr: "Badges", de: "Abzeichen", it: "Badge", en: "Badges",
  };

  return (
    <div className="bg-[var(--c-card)] border border-[var(--c-border)] rounded-2xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">🏅</span>
          <h3 className="font-bold text-sm text-[var(--c-text)]">{TITLE[lang] || TITLE.fr}</h3>
        </div>
        <span className="text-xs font-bold text-[var(--c-text-muted)]">{earned.length}/{badges.length}</span>
      </div>

      {/* Progress bar global */}
      <div className="h-2 bg-[var(--c-border)] rounded-full overflow-hidden mb-4">
        <div className="h-full rounded-full transition-all" style={{
          width: `${(earned.length / badges.length) * 100}%`,
          background: "linear-gradient(to right, #F59E0B, #D97706)",
        }} />
      </div>

      {/* Badges earned */}
      {earned.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {earned.map(b => (
            <div key={b.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border" style={{
              background: "rgba(245,158,11,0.1)", borderColor: "rgba(245,158,11,0.3)", color: "#F59E0B",
            }}>
              <span>{b.emoji}</span> {b.name}
            </div>
          ))}
        </div>
      )}

      {/* Badges locked */}
      {locked.length > 0 && (
        <div className="flex flex-col gap-2">
          {locked.slice(0, 3).map(b => (
            <div key={b.id} className="flex items-center gap-3 opacity-70">
              <span className="text-lg">{b.emoji}</span>
              <div className="flex-1">
                <p className="text-xs font-bold text-[var(--c-text)]">{b.name}</p>
                <p className="text-[10px] text-[var(--c-text-muted)]">{b.description}</p>
                {b.progress !== undefined && b.max && (
                  <div className="h-1 bg-[var(--c-border)] rounded-full mt-1 overflow-hidden" style={{ width: 80 }}>
                    <div className="h-full bg-amber-500/50 rounded-full" style={{ width: `${(b.progress / b.max) * 100}%` }} />
                  </div>
                )}
              </div>
              <span className="text-[10px] text-[var(--c-text-muted)]">🔒</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
