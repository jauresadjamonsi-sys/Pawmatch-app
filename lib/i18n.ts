export const LANGS = [
  { code: "fr", flag: "🇫🇷" },
  { code: "de", flag: "🇩🇪" },
  { code: "it", flag: "🇮🇹" },
  { code: "en", flag: "🇬🇧" },
];

export const THEMES = [
  { code: "nuit",   label: "🌑", name: "Nuit"   },
  { code: "aurore", label: "🌅", name: "Aurore" },
  { code: "ocean",  label: "🌊", name: "Océan"  },
  { code: "clair",  label: "☀️", name: "Clair"  },
];

export const TRANSLATIONS: Record<string, Record<string, string>> = {
  fr: {
    // Nav
    navHome: "Accueil", navEvents: "Événements", navFlairer: "Flairer", navExplorer: "Explorer",
    navMatches: "Matchs", navProfil: "Profil", navPricing: "Tarifs",
    navLogin: "Connexion", navJoin: "Rejoindre",

    // Hero — Playdate focused
    heroTitle: "Ton animal s'ennuie ?",
    heroTitle2: "Trouve-lui des copains de balade",
    heroSub: "Pawly connecte les propriétaires d'animaux près de chez toi pour des balades, jeux et rencontres entre compagnons.",
    bullet1: "🐕 Des balades à deux, c'est toujours mieux",
    bullet2: "📍 Trouve des copains dans ton quartier",
    bullet3: "🧠 Match de personnalité pour des rencontres réussies",
    findMatch: "🐾 Trouver un copain",
    freemium: "✓ Gratuit — 3 rencontres offertes",
    compatible: "compatible",

    // Social proof
    owners: "Propriétaires", animals: "Compagnons", matchRate: "Balades réussies",

    // Stories — émotionnelles, playdate
    storyName1: "Ruby", storyBreed1: "Berger Blanc Suisse",
    story1: "s'ennuyait au parc toute seule… jusqu'à sa première balade avec Luna. Maintenant, elles se retrouvent chaque dimanche ❤️",
    storyName2: "Oscar", storyBreed2: "Bouledogue Français",
    story2: "était timide avec les autres chiens. Après 3 balades avec Max, il tire sur la laisse pour aller le retrouver 🐾",
    storyName3: "Mochi", storyBreed3: "Chat Maine Coon",
    story3: "ne sortait jamais. Grâce à Nala, sa voisine, il découvre le jardin chaque matin ✨",
    storiesTitle: "Leurs propriétaires racontent",

    // Personnalité — hook viral
    personalityTitle: "Quel est le caractère de ton animal ?",
    personalitySub: "Découvre son profil de personnalité en 2 minutes. Résultat fun, partageable, et utile pour trouver le match parfait.",
    personalityCta: "🧠 Faire le test gratuit",
    personalityTypes: "6 profils : Énergique Social · Doux Serein · Aventurier · Joueur Fou · Observateur Zen · Pot de Colle",

    // Comment ça marche — playdate
    howItWorks: "Comment ça marche",
    step1: "Décris ton compagnon",
    step1Desc: "Personnalité, énergie, habitudes — un questionnaire fun en 2 minutes",
    step2: "Découvre ses copains idéaux",
    step2Desc: "Notre IA analyse 12 traits pour te proposer les compagnons les plus compatibles près de chez toi",
    step3: "Organisez votre balade",
    step3Desc: "Échangez via le chat, choisissez un lieu et c'est parti pour la première rencontre !",

    // IA demo
    iaTitle: "Pourquoi Ruby et Luna sont compatibles",
    iaSub: "Analyse IA de compatibilité",
    iaEnergy: "Niveau d'énergie", iaSocial: "Sociabilité",
    iaSize: "Compatibilité de taille", iaZone: "Même quartier",
    iaQuote: "Même énergie, même amour des longues balades en forêt 🌲",
    iaVerdict: "Coup de foudre",

    // Actions
    sniff: "Flairer", sniffSub: "Swipe et trouve des copains",
    events: "Événements", eventsSub: "Balades de groupe près de toi",
    premium: "Premium", premiumSub: "Rencontres illimitées + IA avancée",
    joinCard: "Commencer", joinCardSub: "3 rencontres gratuites",

    // Coup de Truffe
    coupDeTruffe: "Coup de Truffe", coupDesc: "Quand les deux propriétaires disent oui — la balade est lancée !",

    // Témoignage
    testimonialTitle: "Ce qu'ils en disent",
    testimonial1: "Depuis Pawly, mon chien a 3 copains de balade réguliers. Il est tellement plus épanoui !",
    testimonial1Author: "Sophie, Lausanne",
    testimonial1Pet: "Avec Kiko, Border Collie",
    testimonial2: "J'ai déménagé à Genève et grâce à Pawly, j'ai trouvé des balades pour mon chat en 2 jours.",
    testimonial2Author: "Marc, Genève",
    testimonial2Pet: "Avec Simba, Chat Européen",
    testimonial3: "Le test de personnalité est génial — ça a matché tout de suite avec un Golden du quartier.",
    testimonial3Author: "Anna, Zurich",
    testimonial3Pet: "Avec Bella, Labrador",

    // CTA final
    ctaTitle: "Ton compagnon mérite des amis",
    ctaDesc: "Rejoins les propriétaires qui offrent une vie sociale à leur animal",
    ctaButton: "Trouver un copain de balade 🐾",
    ctaFree: "Gratuit · 3 rencontres offertes · Sans carte de crédit",

    // Autres
    tagline: "Des copains de balade pour ton animal",
    members: "Membres", companions: "Compagnons",
    join: "Rejoindre Pawly", explore: "Explorer",
    recentlyActive: "Cherchent un copain", seeAll: "Voir tout →",
    exploreSub: "Tous les profils",
    catalog: "Catalogue", pricing: "Tarifs",
    ctaDesc2: "Gratuit pour commencer. Toutes les espèces. Toute la Suisse.",
    compatibility: "Compatibilité IA",
  },

  de: {
    navHome: "Startseite", navEvents: "Veranstaltungen", navFlairer: "Schnüffeln", navExplorer: "Entdecken",
    navMatches: "Matches", navProfil: "Profil", navPricing: "Preise",
    navLogin: "Anmelden", navJoin: "Beitreten",

    heroTitle: "Langweilt sich dein Tier?",
    heroTitle2: "Finde Spaziergang-Freunde",
    heroSub: "Pawly verbindet Tierhalter in deiner Nähe für Spaziergänge, Spiel und Treffen zwischen Begleitern.",
    bullet1: "🐕 Zu zweit spazieren macht mehr Spass",
    bullet2: "📍 Finde Freunde in deiner Nachbarschaft",
    bullet3: "🧠 Persönlichkeits-Match für erfolgreiche Treffen",
    findMatch: "🐾 Einen Freund finden",
    freemium: "✓ Kostenlos — 3 Treffen geschenkt",
    compatible: "kompatibel",

    owners: "Tierhalter", animals: "Begleiter", matchRate: "Erfolgreiche Spaziergänge",

    storyName1: "Ruby", storyBreed1: "Weisser Schweizer Schäferhund",
    story1: "war im Park allein… bis zu ihrem ersten Spaziergang mit Luna. Jetzt treffen sie sich jeden Sonntag ❤️",
    storyName2: "Oscar", storyBreed2: "Französische Bulldogge",
    story2: "war schüchtern. Nach 3 Spaziergängen mit Max zieht er an der Leine, um ihn zu treffen 🐾",
    storyName3: "Mochi", storyBreed3: "Maine Coon Katze",
    story3: "ging nie raus. Dank Nala, seiner Nachbarin, entdeckt er jeden Morgen den Garten ✨",
    storiesTitle: "Ihre Besitzer erzählen",

    personalityTitle: "Was für ein Charakter hat dein Tier?",
    personalitySub: "Entdecke sein Persönlichkeitsprofil in 2 Minuten. Spassig, teilbar und nützlich für den perfekten Match.",
    personalityCta: "🧠 Gratis-Test machen",
    personalityTypes: "6 Profile: Energiebündel · Sanfte Seele · Abenteurer · Spielverrückt · Zen-Beobachter · Kuschelmonster",

    howItWorks: "So funktioniert es",
    step1: "Beschreibe deinen Begleiter",
    step1Desc: "Persönlichkeit, Energie, Gewohnheiten — ein Spass-Fragebogen in 2 Minuten",
    step2: "Entdecke seine idealen Freunde",
    step2Desc: "Unsere KI analysiert 12 Merkmale, um die kompatibelsten Begleiter in deiner Nähe zu finden",
    step3: "Organisiert euren Spaziergang",
    step3Desc: "Tauscht euch im Chat aus, wählt einen Ort und los geht's zum ersten Treffen!",

    iaTitle: "Warum Ruby und Luna kompatibel sind",
    iaSub: "KI-Kompatibilitätsanalyse",
    iaEnergy: "Energieniveau", iaSocial: "Geselligkeit",
    iaSize: "Grössenkompatibilität", iaZone: "Selbe Nachbarschaft",
    iaQuote: "Gleiche Energie, gleiche Liebe für lange Waldspaziergänge 🌲",
    iaVerdict: "Liebe auf den ersten Blick",

    sniff: "Schnüffeln", sniffSub: "Swipe und finde Freunde",
    events: "Veranstaltungen", eventsSub: "Gruppenspaziergänge in deiner Nähe",
    premium: "Premium", premiumSub: "Unbegrenzte Treffen + erweiterte KI",
    joinCard: "Starten", joinCardSub: "3 kostenlose Treffen",

    coupDeTruffe: "Coup de Truffe", coupDesc: "Wenn beide Besitzer Ja sagen — der Spaziergang kann beginnen!",

    testimonialTitle: "Was sie darüber sagen",
    testimonial1: "Seit Pawly hat mein Hund 3 regelmässige Spaziergang-Freunde. Er ist so viel glücklicher!",
    testimonial1Author: "Sophie, Lausanne",
    testimonial1Pet: "Mit Kiko, Border Collie",
    testimonial2: "Ich bin nach Genf gezogen und dank Pawly habe ich in 2 Tagen Spaziergänge für meine Katze gefunden.",
    testimonial2Author: "Marc, Genf",
    testimonial2Pet: "Mit Simba, Europäische Katze",
    testimonial3: "Der Persönlichkeitstest ist genial — es hat sofort mit einem Golden aus der Nachbarschaft gematcht.",
    testimonial3Author: "Anna, Zürich",
    testimonial3Pet: "Mit Bella, Labrador",

    ctaTitle: "Dein Begleiter verdient Freunde",
    ctaDesc: "Tritt den Tierhaltern bei, die ihrem Tier ein Sozialleben schenken",
    ctaButton: "Spaziergang-Freund finden 🐾",
    ctaFree: "Kostenlos · 3 Treffen geschenkt · Ohne Kreditkarte",

    tagline: "Spaziergang-Freunde für dein Tier",
    members: "Mitglieder", companions: "Begleiter",
    join: "Pawly beitreten", explore: "Entdecken",
    recentlyActive: "Suchen einen Freund", seeAll: "Alle anzeigen →",
    exploreSub: "Alle Profile",
    catalog: "Katalog", pricing: "Preise",
    ctaDesc2: "Kostenlos starten. Alle Tierarten. Die ganze Schweiz.",
    compatibility: "KI-Kompatibilität",
  },

  it: {
    navHome: "Home", navEvents: "Eventi", navFlairer: "Annusa", navExplorer: "Esplora",
    navMatches: "Match", navProfil: "Profilo", navPricing: "Prezzi",
    navLogin: "Accedi", navJoin: "Iscriviti",

    heroTitle: "Il tuo animale si annoia?",
    heroTitle2: "Trovagli amici per le passeggiate",
    heroSub: "Pawly connette i proprietari di animali vicino a te per passeggiate, giochi e incontri tra compagni.",
    bullet1: "🐕 Passeggiare in due è sempre meglio",
    bullet2: "📍 Trova amici nel tuo quartiere",
    bullet3: "🧠 Match di personalità per incontri riusciti",
    findMatch: "🐾 Trova un amico",
    freemium: "✓ Gratuito — 3 incontri offerti",
    compatible: "compatibile",

    owners: "Proprietari", animals: "Compagni", matchRate: "Passeggiate riuscite",

    storyName1: "Ruby", storyBreed1: "Pastore Bianco Svizzero",
    story1: "si annoiava al parco da sola… fino alla sua prima passeggiata con Luna. Ora si ritrovano ogni domenica ❤️",
    storyName2: "Oscar", storyBreed2: "Bulldog Francese",
    story2: "era timido con gli altri cani. Dopo 3 passeggiate con Max, tira il guinzaglio per raggiungerlo 🐾",
    storyName3: "Mochi", storyBreed3: "Gatto Maine Coon",
    story3: "non usciva mai. Grazie a Nala, la sua vicina, scopre il giardino ogni mattina ✨",
    storiesTitle: "I loro proprietari raccontano",

    personalityTitle: "Che carattere ha il tuo animale?",
    personalitySub: "Scopri il suo profilo di personalità in 2 minuti. Risultato divertente, condivisibile e utile per il match perfetto.",
    personalityCta: "🧠 Fai il test gratuito",
    personalityTypes: "6 profili: Energico Sociale · Dolce Sereno · Avventuriero · Giocherellone · Osservatore Zen · Coccola Continua",

    howItWorks: "Come funziona",
    step1: "Descrivi il tuo compagno",
    step1Desc: "Personalità, energia, abitudini — un questionario divertente in 2 minuti",
    step2: "Scopri i suoi amici ideali",
    step2Desc: "La nostra IA analizza 12 tratti per proporti i compagni più compatibili vicino a te",
    step3: "Organizzate la passeggiata",
    step3Desc: "Scambiatevi messaggi in chat, scegliete un luogo e via al primo incontro!",

    iaTitle: "Perché Ruby e Luna sono compatibili",
    iaSub: "Analisi IA di compatibilità",
    iaEnergy: "Livello di energia", iaSocial: "Socievolezza",
    iaSize: "Compatibilità di taglia", iaZone: "Stesso quartiere",
    iaQuote: "Stessa energia, stesso amore per le lunghe passeggiate nel bosco 🌲",
    iaVerdict: "Colpo di fulmine",

    sniff: "Annusa", sniffSub: "Swipe e trova amici",
    events: "Eventi", eventsSub: "Passeggiate di gruppo vicino a te",
    premium: "Premium", premiumSub: "Incontri illimitati + IA avanzata",
    joinCard: "Inizia", joinCardSub: "3 incontri gratuiti",

    coupDeTruffe: "Coup de Truffe", coupDesc: "Quando entrambi i proprietari dicono sì — la passeggiata può iniziare!",

    testimonialTitle: "Cosa ne dicono",
    testimonial1: "Da quando uso Pawly, il mio cane ha 3 amici di passeggiata regolari. È molto più felice!",
    testimonial1Author: "Sophie, Losanna",
    testimonial1Pet: "Con Kiko, Border Collie",
    testimonial2: "Mi sono trasferito a Ginevra e grazie a Pawly ho trovato passeggiate per il mio gatto in 2 giorni.",
    testimonial2Author: "Marc, Ginevra",
    testimonial2Pet: "Con Simba, Gatto Europeo",
    testimonial3: "Il test di personalità è geniale — ha matchato subito con un Golden del quartiere.",
    testimonial3Author: "Anna, Zurigo",
    testimonial3Pet: "Con Bella, Labrador",

    ctaTitle: "Il tuo compagno merita amici",
    ctaDesc: "Unisciti ai proprietari che regalano una vita sociale al loro animale",
    ctaButton: "Trova un amico di passeggiata 🐾",
    ctaFree: "Gratuito · 3 incontri offerti · Senza carta di credito",

    tagline: "Amici di passeggiata per il tuo animale",
    members: "Membri", companions: "Compagni",
    join: "Unisciti a Pawly", explore: "Esplora",
    recentlyActive: "Cercano un amico", seeAll: "Vedi tutti →",
    exploreSub: "Tutti i profili",
    catalog: "Catalogo", pricing: "Prezzi",
    ctaDesc2: "Gratis per iniziare. Tutte le specie. Tutta la Svizzera.",
    compatibility: "Compatibilità IA",
  },

  en: {
    navHome: "Home", navEvents: "Events", navFlairer: "Sniff", navExplorer: "Explore",
    navMatches: "Matches", navProfil: "Profile", navPricing: "Pricing",
    navLogin: "Login", navJoin: "Join",

    heroTitle: "Is your pet bored?",
    heroTitle2: "Find them walk buddies",
    heroSub: "Pawly connects pet owners near you for walks, playdates and meetups between companions.",
    bullet1: "🐕 Walks are always better with a buddy",
    bullet2: "📍 Find friends in your neighbourhood",
    bullet3: "🧠 Personality match for successful meetups",
    findMatch: "🐾 Find a buddy",
    freemium: "✓ Free — 3 meetups included",
    compatible: "compatible",

    owners: "Owners", animals: "Companions", matchRate: "Successful walks",

    storyName1: "Ruby", storyBreed1: "White Swiss Shepherd",
    story1: "was bored at the park alone… until her first walk with Luna. Now they meet every Sunday ❤️",
    storyName2: "Oscar", storyBreed2: "French Bulldog",
    story2: "was shy around other dogs. After 3 walks with Max, he pulls the lead to go meet him 🐾",
    storyName3: "Mochi", storyBreed3: "Maine Coon Cat",
    story3: "never went outside. Thanks to Nala, his neighbour, he explores the garden every morning ✨",
    storiesTitle: "Their owners share",

    personalityTitle: "What's your pet's personality?",
    personalitySub: "Discover their personality profile in 2 minutes. Fun, shareable, and useful for finding the perfect match.",
    personalityCta: "🧠 Take the free test",
    personalityTypes: "6 profiles: Social Energiser · Gentle Soul · Adventurer · Playful Maniac · Zen Observer · Cuddle Bug",

    howItWorks: "How it works",
    step1: "Describe your companion",
    step1Desc: "Personality, energy, habits — a fun questionnaire in 2 minutes",
    step2: "Discover their ideal buddies",
    step2Desc: "Our AI analyses 12 traits to find the most compatible companions near you",
    step3: "Plan your walk",
    step3Desc: "Chat, pick a spot and off you go for your first meetup!",

    iaTitle: "Why Ruby and Luna are compatible",
    iaSub: "AI compatibility analysis",
    iaEnergy: "Energy level", iaSocial: "Sociability",
    iaSize: "Size compatibility", iaZone: "Same neighbourhood",
    iaQuote: "Same energy, same love for long forest walks 🌲",
    iaVerdict: "Love at first sniff",

    sniff: "Sniff", sniffSub: "Swipe and find buddies",
    events: "Events", eventsSub: "Group walks near you",
    premium: "Premium", premiumSub: "Unlimited meetups + advanced AI",
    joinCard: "Get started", joinCardSub: "3 free meetups",

    coupDeTruffe: "Coup de Truffe", coupDesc: "When both owners say yes — the walk is on!",

    testimonialTitle: "What they say",
    testimonial1: "Since Pawly, my dog has 3 regular walk buddies. He's so much happier!",
    testimonial1Author: "Sophie, Lausanne",
    testimonial1Pet: "With Kiko, Border Collie",
    testimonial2: "I moved to Geneva and thanks to Pawly, I found walks for my cat in 2 days.",
    testimonial2Author: "Marc, Geneva",
    testimonial2Pet: "With Simba, European Cat",
    testimonial3: "The personality test is brilliant — it matched right away with a Golden from the neighbourhood.",
    testimonial3Author: "Anna, Zurich",
    testimonial3Pet: "With Bella, Labrador",

    ctaTitle: "Your companion deserves friends",
    ctaDesc: "Join the owners giving their pets a social life",
    ctaButton: "Find a walk buddy 🐾",
    ctaFree: "Free · 3 meetups included · No credit card",

    tagline: "Walk buddies for your pet",
    members: "Members", companions: "Companions",
    join: "Join Pawly", explore: "Explore",
    recentlyActive: "Looking for a buddy", seeAll: "See all →",
    exploreSub: "All profiles",
    catalog: "Catalogue", pricing: "Pricing",
    ctaDesc2: "Free to start. All species. All of Switzerland.",
    compatibility: "AI Compatibility",
  },
};
