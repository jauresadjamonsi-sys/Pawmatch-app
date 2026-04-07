export type AnimalSpecies = "chien" | "chat" | "lapin" | "oiseau" | "rongeur" | "autre";

// ---------------------------------------------------------------------------
// Mood engine
// ---------------------------------------------------------------------------

export type Mood = { label: string; emoji: string; color: string };

export const MOODS: Mood[] = [
  { label: "\u00c9nergique", emoji: "\u26A1", color: "text-orange-400" },
  { label: "Calme", emoji: "\uD83C\uDF3F", color: "text-green-400" },
  { label: "Joueur", emoji: "\uD83C\uDF89", color: "text-pink-400" },
  { label: "Endormi", emoji: "\uD83D\uDE34", color: "text-purple-300" },
  { label: "C\u00e2lin", emoji: "\uD83E\uDDF8", color: "text-red-300" },
  { label: "Curieux", emoji: "\uD83D\uDD0D", color: "text-cyan-400" },
  { label: "Gourmand", emoji: "\uD83C\uDF56", color: "text-amber-400" },
  { label: "Aventurier", emoji: "\uD83C\uDFDE\uFE0F", color: "text-teal-300" },
];

export function dailySeed(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

export function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function getMood(animalId: string, traits: string[]): Mood {
  const traitWeight: Record<string, number> = {
    Energique: 0, Sportif: 0, Actif: 0,
    Calme: 1, Discret: 1, Dormeur: 1,
    Joueur: 2, Acrobate: 2,
    "Pot de colle": 4, Calin: 4,
    Curieux: 5, Chasseur: 5,
    Gourmand: 6,
  };

  const biases: number[] = [];
  for (const t of traits || []) {
    if (traitWeight[t] !== undefined) biases.push(traitWeight[t]);
  }

  const seed = (dailySeed() + hashStr(animalId)) % MOODS.length;
  if (biases.length > 0) {
    const pick = (seed % 10) < 6 ? biases[seed % biases.length] : seed;
    return MOODS[pick % MOODS.length];
  }
  return MOODS[seed % MOODS.length];
}

// ---------------------------------------------------------------------------
// Daily Facts  (30+ per species, in French)
// ---------------------------------------------------------------------------

export const FACTS: Record<AnimalSpecies, string[]> = {
  chien: [
    "Le nez d\u2019un chien est aussi unique qu\u2019une empreinte digitale humaine.",
    "Les chiens peuvent apprendre plus de 1\u202F000 mots.",
    "Un chien peut sentir des \u00e9motions gr\u00e2ce aux ph\u00e9romones.",
    "Le Basenji est le seul chien qui n\u2019aboie pas.",
    "Les dalmatiens naissent enti\u00e8rement blancs.",
    "Les chiens r\u00eavent pendant leur sommeil, comme les humains.",
    "Le Greyhound peut courir jusqu\u2019\u00e0 72\u202Fkm/h.",
    "Les chiens voient en nuances de bleu et de jaune.",
    "Un chien adulte a 42 dents.",
    "Les chiens transpirent uniquement par leurs coussinets.",
    "Le sens de l\u2019odorat d\u2019un chien est 10\u202F000 fois plus puissant que le n\u00f4tre.",
    "Les chiens peuvent d\u00e9tecter certaines maladies chez l\u2019humain.",
    "Le plus vieux chien connu a v\u00e9cu 29 ans.",
    "Les chiots naissent sourds et aveugles.",
    "Les chiens remuent la queue \u00e0 droite quand ils sont heureux.",
    "Un chien boit en formant une cuill\u00e8re avec sa langue.",
    "Le Terre-Neuve a des pattes palm\u00e9es pour mieux nager.",
    "Les chiens reconnaissent plus de 250 gestes et signaux.",
    "Les chiens ont trois paupi\u00e8res, dont une membrane nictitante.",
    "Un chien peut localiser un son en 6/100\u00e8me de seconde.",
    "Les chiens synchronisent leur respiration avec celle de leur ma\u00eetre en dormant.",
    "Le Chow-Chow a la langue bleue-noire.",
    "Le cerveau d\u2019un chien est sp\u00e9cialis\u00e9 pour reconna\u00eetre les visages humains.",
    "Les chiens ont un \u00ab\u202Fcompas magn\u00e9tique\u202F\u00bb et pr\u00e9f\u00e8rent s\u2019aligner nord-sud.",
    "Le Saluki est consid\u00e9r\u00e9 comme la plus ancienne race domestiqu\u00e9e.",
    "Un chien moyen exerce une pression de m\u00e2choire de 150\u202Fkg.",
    "Les Golden Retrievers peuvent porter un \u0153uf dans leur gueule sans le casser.",
    "Les chiens tournent en rond avant de se coucher par instinct ancestral.",
    "Le Corgi \u00e9tait utilis\u00e9 pour garder les troupeaux au Pays de Galles.",
    "Les chiens poss\u00e8dent environ 300 millions de r\u00e9cepteurs olfactifs.",
  ],
  chat: [
    "Les chats passent 70\u202F% de leur vie \u00e0 dormir.",
    "Un chat peut sauter jusqu\u2019\u00e0 6 fois sa longueur.",
    "Les chats ronronnent \u00e0 une fr\u00e9quence qui favorise la gu\u00e9rison osseuse.",
    "Le cerveau d\u2019un chat est similaire \u00e0 90\u202F% \u00e0 celui d\u2019un humain.",
    "Les chats ont plus de 20 vocalisations diff\u00e9rentes.",
    "Le plus vieux chat connu a v\u00e9cu 38 ans.",
    "Les chats ne peuvent pas go\u00fbter le sucr\u00e9.",
    "Un chat a 230 os, soit plus qu\u2019un humain.",
    "Les moustaches d\u2019un chat sont aussi larges que son corps.",
    "Les chats passent 30\u202F% de leur temps \u00e9veill\u00e9 \u00e0 se toiletter.",
    "Un chat adulte n\u2019utilise le miaulement que pour communiquer avec les humains.",
    "Les chats peuvent faire tourner leurs oreilles \u00e0 180 degr\u00e9s.",
    "Le ronronnement se situe entre 25 et 150\u202FHz.",
    "Les chats ont un champ de vision de 200 degr\u00e9s.",
    "Isaac Newton a invent\u00e9 la chati\u00e8re.",
    "Les chats retombent presque toujours sur leurs pattes gr\u00e2ce au r\u00e9flexe de redressement.",
    "Un chat peut courir \u00e0 50\u202Fkm/h sur de courtes distances.",
    "Les chats domestiques partagent 95,6\u202F% de leur ADN avec les tigres.",
    "La plupart des chats roux sont des m\u00e2les.",
    "Un groupe de chats s\u2019appelle une \u00ab\u202Fclowder\u202F\u00bb.",
    "Les chats n\u2019ont pas de clavicule, ce qui leur permet de se faufiler partout.",
    "Les empreintes de nez des chats sont uniques.",
    "Le chat le plus riche du monde a h\u00e9rit\u00e9 de 13 millions de dollars.",
    "Les chats peuvent d\u00e9tecter les tremblements de terre avant les humains.",
    "Le f\u00e9lin le plus rapide est le Mau \u00e9gyptien (48\u202Fkm/h).",
    "Les chats pr\u00e9f\u00e8rent l\u2019eau courante \u00e0 l\u2019eau stagnante.",
    "Un chat dort en moyenne 16 heures par jour.",
    "Les chats utilisent leur queue pour maintenir l\u2019\u00e9quilibre.",
    "Le pelage tabby est le motif le plus r\u00e9pandu au monde.",
    "Les chats ont une m\u00e9moire \u00e0 long terme sup\u00e9rieure \u00e0 celle des chiens.",
  ],
  lapin: [
    "Les lapins peuvent voir \u00e0 presque 360 degr\u00e9s.",
    "Un lapin heureux fait des \u00ab\u202Fbinkies\u202F\u00bb \u2014 des sauts de joie.",
    "Les lapins ronronnent en frottant leurs dents.",
    "Les dents d\u2019un lapin poussent continuellement toute leur vie.",
    "Un lapin peut vivre jusqu\u2019\u00e0 12 ans.",
    "Les lapins sont cr\u00e9pusculaires\u202F: actifs \u00e0 l\u2019aube et au cr\u00e9puscule.",
    "Un lapin peut courir jusqu\u2019\u00e0 56\u202Fkm/h.",
    "Les lapins ne peuvent pas vomir.",
    "Les b\u00e9b\u00e9s lapins s\u2019appellent des \u00ab\u202Flapereaux\u202F\u00bb.",
    "Les lapins ont 28 dents.",
    "Leur odorat est 20 fois plus d\u00e9velopp\u00e9 que le n\u00f4tre.",
    "Les lapins communiquent en tapant du pied.",
    "Un lapin g\u00e9ant peut peser plus de 10\u202Fkg.",
    "Les lapins mangent leurs c\u00e9cotropes pour digestion compl\u00e8te.",
    "La fourrure du lapin angora peut mesurer 30\u202Fcm.",
    "Les lapins reconnaissent leur nom et viennent quand on les appelle.",
    "Un lapin de compagnie dort environ 8 heures par jour.",
    "Les lapins adorent creuser des terriers.",
    "Ils peuvent apprendre \u00e0 utiliser une liti\u00e8re comme un chat.",
    "Les lapins brossent leur visage avec leurs pattes avant.",
    "Les oreilles d\u2019un lapin r\u00e9gulent sa temp\u00e9rature corporelle.",
    "Les lapins sont des animaux sociaux qui pr\u00e9f\u00e8rent vivre en groupe.",
    "Le plus petit lapin du monde p\u00e8se environ 400 grammes.",
    "Les lapins peuvent produire jusqu\u2019\u00e0 12 petits par port\u00e9e.",
    "Un lapin entend des sons que l\u2019humain ne per\u00e7oit pas.",
    "Les lapins marquent leur territoire avec des glandes sous le menton.",
    "Leurs pattes arri\u00e8re sont plus longues que les avant, id\u00e9ales pour sauter.",
    "Le lapin nain n\u00e9erlandais est la race la plus populaire en Suisse.",
    "Les lapins ont besoin de foin illimit\u00e9 pour user leurs dents.",
    "Les lapins aiment les jouets en bois \u00e0 ronger.",
  ],
  oiseau: [
    "Les perroquets peuvent vivre plus de 80 ans.",
    "Le colibri est le seul oiseau capable de voler en arri\u00e8re.",
    "Les plumes repr\u00e9sentent 5 \u00e0 10\u202F% du poids d\u2019un oiseau.",
    "Les oiseaux n\u2019ont pas de dents.",
    "Le cri d\u2019une perruche peut atteindre 111 d\u00e9cibels.",
    "Les canaris peuvent apprendre des m\u00e9lodies complexes.",
    "Les oiseaux ont des os creux pour faciliter le vol.",
    "Un pigeon peut retrouver son chemin sur plus de 1\u202F000\u202Fkm.",
    "Les perroquets gris du Gabon ont l\u2019intelligence d\u2019un enfant de 5 ans.",
    "Les oiseaux voient les couleurs ultraviolettes.",
    "Le manchot empereur peut plonger \u00e0 500 m\u00e8tres de profondeur.",
    "Les oiseaux chanteurs apprennent leurs chants de leurs parents.",
    "La chouette peut tourner sa t\u00eate \u00e0 270 degr\u00e9s.",
    "Les plumes d\u2019un oiseau repoussent apr\u00e8s la mue.",
    "Les cacato\u00e8s peuvent danser en rythme sur de la musique.",
    "L\u2019autruche a les plus grands yeux de tous les animaux terrestres.",
    "Les corbeaux peuvent utiliser des outils.",
    "Les oiseaux n\u2019ont pas de glandes sudoripares.",
    "Un perroquet a un vocabulaire moyen de 200 mots.",
    "Les oiseaux migrateurs parcourent jusqu\u2019\u00e0 70\u202F000\u202Fkm par an.",
    "Le flamant rose doit sa couleur \u00e0 son alimentation en crevettes.",
    "Les ins\u00e9parables forment des couples pour la vie.",
    "Le plus petit oiseau du monde, le colibri-abeille, p\u00e8se 1,6\u202Fg.",
    "Les oiseaux ont un syst\u00e8me respiratoire \u00e0 double flux unique.",
    "Les merles peuvent imiter des sonneries de t\u00e9l\u00e9phone.",
    "Les pigeons peuvent reconna\u00eetre leur reflet dans un miroir.",
    "Un aigle royal peut voir un lapin \u00e0 3\u202Fkm de distance.",
    "Les oiseaux sont les descendants directs des dinosaures.",
    "Les perruches adorent jouer avec des grelots et des miroirs.",
    "Le toucan utilise son bec pour r\u00e9guler sa temp\u00e9rature.",
  ],
  rongeur: [
    "Les hamsters peuvent stocker de la nourriture dans leurs abajoues.",
    "Les cochons d\u2019Inde ronronnent quand ils sont heureux.",
    "Les souris peuvent chanter des m\u00e9lodies ultrasoniques.",
    "Un \u00e9cureuil peut retrouver ses noix enterr\u00e9es sous 30\u202Fcm de neige.",
    "Les gerbilles sont originaires des d\u00e9serts de Mongolie.",
    "Les rats rient quand on les chatouille.",
    "Les dents d\u2019un rongeur poussent toute leur vie.",
    "Un hamster peut courir 9\u202Fkm par nuit dans sa roue.",
    "Les cochons d\u2019Inde ont besoin de vitamine C comme les humains.",
    "Les chinchillas ont la fourrure la plus dense au monde.",
    "Un rat peut survivre plus longtemps sans eau qu\u2019un chameau.",
    "Les souris ont une excellente m\u00e9moire spatiale.",
    "Les hamsters sont solitaires et pr\u00e9f\u00e8rent vivre seuls.",
    "Les gerbilles communiquent en tapant du pied.",
    "Les cochons d\u2019Inde \u00ab\u202Fpopcornent\u202F\u00bb quand ils sont excit\u00e9s.",
    "Les rats nettoient leur fourrure plus souvent que les chats.",
    "Un chinchilla ne doit jamais \u00eatre mouill\u00e9 \u2014 il prend des bains de sable.",
    "Les souris peuvent se faufiler dans un trou de 6\u202Fmm.",
    "Les hamsters sont nocturnes et tr\u00e8s actifs la nuit.",
    "Les cochons d\u2019Inde vivent en moyenne 5 \u00e0 7 ans.",
    "Les rats sont extr\u00eamement sociaux et souffrent de solitude.",
    "Les \u00e9cureuils enterrent des noix et oublient 74\u202F% d\u2019entre elles.",
    "Un hamster peut transporter la moiti\u00e9 de son poids dans ses abajoues.",
    "Les cochons d\u2019Inde produisent plus de 10 sons diff\u00e9rents.",
    "Les chinchillas peuvent sauter \u00e0 1,80\u202Fm de hauteur.",
    "Les rats peuvent apprendre leur nom et r\u00e9pondre.",
    "Un hamster russe peut changer de couleur en hiver.",
    "Les souris sont daltonniennes mais voient tr\u00e8s bien dans le noir.",
    "Les cochons d\u2019Inde ont 20 dents.",
    "Les gerbilles vivent en couples fid\u00e8les pour la vie.",
  ],
  autre: [
    "Les tortues existent depuis plus de 200 millions d\u2019ann\u00e9es.",
    "Les furets dorment entre 14 et 18 heures par jour.",
    "Les serpents sentent avec leur langue.",
    "Les poissons rouges ont une m\u00e9moire de plusieurs mois.",
    "Les tortues peuvent sentir les vibrations \u00e0 travers leur carapace.",
    "Les axolotls peuvent r\u00e9g\u00e9n\u00e9rer leurs membres.",
    "Un poisson combattant reconna\u00eet son propri\u00e9taire.",
    "Les geckos l\u00e9opards stockent de la graisse dans leur queue.",
    "Les furets font une \u00ab\u202Fdanse de la joie\u202F\u00bb quand ils jouent.",
    "Les serpents n\u2019ont pas de paupi\u00e8res.",
    "Les tortues respirent en partie par leur derri\u00e8re.",
    "Les poissons dorment les yeux ouverts car ils n\u2019ont pas de paupi\u00e8res.",
    "Un cam\u00e9l\u00e9on peut bouger chaque \u0153il ind\u00e9pendamment.",
    "Les furets sont des animaux extr\u00eamement curieux et joueurs.",
    "Les amphibiens respirent \u00e0 travers leur peau.",
    "Le poisson-clown change de sexe au cours de sa vie.",
    "Les geckos peuvent grimper sur du verre gr\u00e2ce \u00e0 leurs lamelles.",
    "Les tortues terrestres peuvent vivre plus de 150 ans.",
    "Les serpents muent plusieurs fois par an en grandissant.",
    "Les furets voient mal mais ont un excellent odorat.",
    "Les iguanes ont un troisi\u00e8me \u0153il sur le sommet du cr\u00e2ne.",
    "Les poissons rouges peuvent distinguer la musique classique du rock.",
    "Les axolotls sont en danger critique d\u2019extinction au Mexique.",
    "Les tortues marines nagent \u00e0 plus de 35\u202Fkm/h.",
    "Les l\u00e9zards \u00e0 collerette courent sur deux pattes quand ils fuient.",
    "Les furets ont \u00e9t\u00e9 domestiqu\u00e9s il y a plus de 2\u202F500 ans.",
    "Les bernard-l\u2019ermite changent de coquille en grandissant.",
    "Les araign\u00e9es ne sont pas des insectes mais des arachnides.",
    "Les axolotls gardent leur forme larvaire toute leur vie.",
    "Les tortues communiquent par des vibrations et des sons graves.",
  ],
};

// ---------------------------------------------------------------------------
// Daily Tips  (7 per species)
// ---------------------------------------------------------------------------

export const TIPS: Record<AnimalSpecies, string[]> = {
  chien: [
    "Promenez votre chien au moins 30 minutes matin et soir pour son \u00e9quilibre.",
    "Brossez les dents de votre chien 2\u20133 fois par semaine pour \u00e9viter le tartre.",
    "Variez les parcours de balade pour stimuler son odorat et son esprit.",
    "Apprenez-lui un nouveau tour chaque mois\u202F: c\u2019est excellent pour sa sant\u00e9 mentale.",
    "V\u00e9rifiez ses coussinets apr\u00e8s chaque balade, surtout en \u00e9t\u00e9 et en hiver.",
    "Hydratation\u202F: un chien de 10\u202Fkg a besoin de 500\u202Fml d\u2019eau par jour minimum.",
    "Ne donnez jamais de chocolat, raisin, oignon ou xylitol \u00e0 un chien.",
  ],
  chat: [
    "Proposez des sessions de jeu de 15 min par jour pour \u00e9viter l\u2019ennui.",
    "Nettoyez la liti\u00e8re tous les jours pour le bien-\u00eatre de votre chat.",
    "Les chats adorent les hauteurs\u202F: installez un arbre \u00e0 chat ou des \u00e9tag\u00e8res.",
    "Brossez votre chat r\u00e9guli\u00e8rement pour r\u00e9duire les boules de poils.",
    "Laissez toujours de l\u2019eau fra\u00eeche \u00e0 disposition, id\u00e9alement une fontaine.",
    "Un chat d\u2019int\u00e9rieur a besoin de stimulation\u202F: jouets, griffoirs, fen\u00eatres.",
    "Le chocolat, le lys et l\u2019oignon sont toxiques pour les chats.",
  ],
  lapin: [
    "Donnez du foin \u00e0 volont\u00e9\u202F: c\u2019est 80\u202F% de l\u2019alimentation d\u2019un lapin.",
    "Laissez votre lapin sortir de sa cage au moins 4 heures par jour.",
    "Les lapins ont besoin de compagnie\u202F: envisagez un deuxi\u00e8me lapin.",
    "Ne soulevez jamais un lapin par les oreilles.",
    "V\u00e9rifiez ses dents r\u00e9guli\u00e8rement pour \u00e9viter la malocclusion.",
    "Les lapins sont sensibles \u00e0 la chaleur\u202F: gardez-les au frais en \u00e9t\u00e9 (\u003C\u202F25\u202F\u00b0C).",
    "Proposez des branches de pommier ou de noisetier \u00e0 ronger.",
  ],
  oiseau: [
    "Parlez r\u00e9guli\u00e8rement \u00e0 votre oiseau pour maintenir le lien social.",
    "Offrez un bain d\u2019eau ti\u00e8de 2\u20133 fois par semaine pour le plumage.",
    "Variez l\u2019alimentation\u202F: graines, fruits frais et l\u00e9gumes.",
    "\u00c9vitez les fum\u00e9es de cuisine (t\u00e9flon)\u202F: c\u2019est mortel pour les oiseaux.",
    "Laissez votre oiseau voler librement dans une pi\u00e8ce s\u00e9curis\u00e9e.",
    "Les oiseaux ont besoin de 10\u201312 heures de sommeil dans le noir complet.",
    "Placez la cage \u00e0 l\u2019abri des courants d\u2019air et du soleil direct.",
  ],
  rongeur: [
    "Nettoyez la cage de votre rongeur au moins une fois par semaine.",
    "Les cochons d\u2019Inde ont besoin de vitamine C quotidienne (poivron, persil).",
    "Offrez une roue adapt\u00e9e \u00e0 votre hamster pour son exercice nocturne.",
    "Ne donnez jamais de laitue iceberg \u00e0 un rongeur \u2014 pr\u00e9f\u00e9rez la romaine.",
    "Les chinchillas n\u00e9cessitent un bain de sable, pas d\u2019eau.",
    "Les rongeurs ont besoin de mat\u00e9riaux \u00e0 ronger pour user leurs dents.",
    "Manipulez votre rongeur doucement et quotidiennement pour l\u2019apprivoiser.",
  ],
  autre: [
    "Renseignez-vous sur la temp\u00e9rature et l\u2019humidit\u00e9 optimales de votre esp\u00e8ce.",
    "Adaptez l\u2019alimentation selon les besoins sp\u00e9cifiques de votre animal.",
    "Consultez un v\u00e9t\u00e9rinaire NAC pour les bilans de sant\u00e9.",
    "Enrichissez l\u2019habitat avec des cachettes et des \u00e9l\u00e9ments de stimulation.",
    "Les reptiles ont besoin de lampes UV pour synth\u00e9tiser la vitamine\u202FD.",
    "Les poissons d\u2019eau douce n\u00e9cessitent un changement d\u2019eau de 20\u202F% par semaine.",
    "Ne rel\u00e2chez jamais un animal exotique dans la nature.",
  ],
};

// ---------------------------------------------------------------------------
// Daily Challenges  (30)
// ---------------------------------------------------------------------------

export const CHALLENGES: string[] = [
  "Fais une balade de 20 minutes avec ton compagnon",
  "Envoie un flair \u00e0 un nouveau compagnon",
  "Consulte le profil de 3 animaux diff\u00e9rents",
  "Prends une photo de ton animal en pleine action",
  "Partage ton profil Pawly avec un ami",
  "D\u00e9couvre un nouvel animal sur la carte",
  "Essaie un nouveau jeu avec ton compagnon",
  "Lis un conseil sur la page de ton animal",
  "V\u00e9rifie les rappels sant\u00e9 de ton animal",
  "Joue 15 minutes avec ton compagnon",
  "Explore Flairer et d\u00e9couvre qui est compatible",
  "Mets \u00e0 jour la description de ton animal",
  "D\u00e9couvre un fun fact sur une autre esp\u00e8ce",
  "Visite PawDirectory pour trouver un service",
  "Envoie un message \u00e0 un de tes matchs",
  "Fais d\u00e9couvrir Pawly \u00e0 un ami propri\u00e9taire",
  "Consulte les stories de la communaut\u00e9",
  "V\u00e9rifie que le profil de ton animal est complet",
  "Teste le mode carte pour voir les animaux autour de toi",
  "Prends 5 minutes pour c\u00e2liner ton compagnon",
  "D\u00e9couvre les badges que tu n\u2019as pas encore",
  "Ajoute un trait de personnalit\u00e9 \u00e0 ton animal",
  "Partage une story avec la communaut\u00e9",
  "Consulte ton score PawScore",
  "Fais une mini session d\u2019\u00e9ducation positive",
  "V\u00e9rifie si ton animal a besoin d\u2019un toilettage",
  "D\u00e9couvre les \u00e9v\u00e9nements Pawly pr\u00e8s de chez toi",
  "Donne un snack sain \u00e0 ton compagnon",
  "Lis les avis sur PawDirectory",
  "D\u00e9tends-toi avec ton animal devant la fen\u00eatre",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getDailyFact(species: AnimalSpecies): string {
  const facts = FACTS[species] || FACTS.autre;
  return facts[dailySeed() % facts.length];
}

export function getDailyTip(species: AnimalSpecies): string {
  const tips = TIPS[species] || TIPS.autre;
  return tips[dailySeed() % tips.length];
}

export function getDailyChallenge(): string {
  return CHALLENGES[dailySeed() % CHALLENGES.length];
}

export function milestoneMessage(count: number): string | null {
  if (count === 3) return "3 jours d\u2019affil\u00e9e\u202F! Ton animal est fier de toi \uD83D\uDC95";
  if (count === 7) return "1 semaine compl\u00e8te\u202F! Tu es un super ma\u00eetre \uD83C\uDF1F";
  if (count === 14) return "2 semaines\u202F! Rien ne t\u2019arr\u00eate \uD83D\uDE80";
  if (count === 30) return "30 jours\u202F! L\u00e9gende vivante de Pawly \uD83D\uDC51";
  if (count === 60) return "60 jours\u202F! Engagement exemplaire \uD83C\uDFC6";
  if (count === 100) return "100 jours\u202F! Centurion Pawly \u2728";
  return null;
}

export function nextMilestone(count: number): { target: number; label: string } | null {
  const milestones = [
    { target: 3, label: "R\u00e9gulier" },
    { target: 7, label: "1 semaine" },
    { target: 14, label: "2 semaines" },
    { target: 30, label: "1 mois" },
    { target: 60, label: "2 mois" },
    { target: 100, label: "Centurion" },
  ];
  return milestones.find((m) => m.target > count) || null;
}
