"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import Image from "next/image";
import { EMOJI_MAP } from "@/lib/constants";
import StoriesRing from "@/lib/components/StoriesRing";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AnimalSpecies = "chien" | "chat" | "lapin" | "oiseau" | "rongeur" | "autre";

interface ProfileRow {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  city: string | null;
}

interface AnimalRow {
  id: string;
  name: string;
  species: AnimalSpecies;
  breed: string | null;
  photo_url: string | null;
  traits: string[];
  age_months: number | null;
  gender: string;
}

interface Streak {
  count: number;
  lastDate: string;
}

// ---------------------------------------------------------------------------
// Mood engine  -- derived from animal traits + seeded daily randomness
// ---------------------------------------------------------------------------

type Mood = {
  label: string;
  emoji: string;
  color: string;
};

const MOODS: Mood[] = [
  { label: "Energique", emoji: "\u26A1", color: "text-orange-400" },
  { label: "Calme", emoji: "\uD83C\uDF3F", color: "text-green-400" },
  { label: "Joueur", emoji: "\uD83C\uDF89", color: "text-pink-400" },
  { label: "Endormi", emoji: "\uD83D\uDE34", color: "text-purple-300" },
  { label: "Calin", emoji: "\uD83E\uDDF8", color: "text-red-300" },
  { label: "Curieux", emoji: "\uD83D\uDD0D", color: "text-cyan-400" },
  { label: "Gourmand", emoji: "\uD83C\uDF56", color: "text-amber-400" },
  { label: "Aventurier", emoji: "\uD83C\uDFDE\uFE0F", color: "text-teal-300" },
];

function dailySeed(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function getMood(animal: AnimalRow): Mood {
  const traitWeight: Record<string, number> = {
    Energique: 0, Sportif: 0, Actif: 0,
    Calme: 1, Discret: 1, Dormeur: 1,
    Joueur: 2, Acrobate: 2,
    "Pot de colle": 4, Calin: 4,
    Curieux: 5, Chasseur: 5,
    Gourmand: 6,
  };

  // bias from traits
  const biases: number[] = [];
  for (const t of animal.traits || []) {
    if (traitWeight[t] !== undefined) biases.push(traitWeight[t]);
  }

  const seed = (dailySeed() + hashStr(animal.id)) % MOODS.length;
  if (biases.length > 0) {
    // 60 % chance to pick a biased mood, 40 % random
    const pick = (seed % 10) < 6
      ? biases[seed % biases.length]
      : seed;
    return MOODS[pick % MOODS.length];
  }
  return MOODS[seed % MOODS.length];
}

// ---------------------------------------------------------------------------
// Daily Facts  -- 30+ per species, in French
// ---------------------------------------------------------------------------

const FACTS: Record<AnimalSpecies, string[]> = {
  chien: [
    "Le nez d\u2019un chien est aussi unique qu\u2019une empreinte digitale humaine.",
    "Les chiens peuvent apprendre plus de 1 000 mots.",
    "Un chien peut sentir des \u00e9motions gr\u00e2ce aux ph\u00e9romones.",
    "Le Basenji est le seul chien qui n\u2019aboie pas.",
    "Les dalmatiens naissent enti\u00e8rement blancs.",
    "Les chiens r\u00eavent pendant leur sommeil, comme les humains.",
    "Le Greyhound peut courir jusqu\u2019\u00e0 72 km/h.",
    "Les chiens voient en nuances de bleu et de jaune.",
    "Un chien adulte a 42 dents.",
    "Les chiens transpirent uniquement par leurs coussinets.",
    "Le sens de l\u2019odorat d\u2019un chien est 10 000 fois plus puissant que le n\u00f4tre.",
    "Les chiens peuvent d\u00e9tecter certaines maladies chez l\u2019humain.",
    "Le plus vieux chien connu a v\u00e9cu 29 ans.",
    "Les chiots naissent sourds et aveugles.",
    "Les chiens remuent la queue \u00e0 droite quand ils sont heureux.",
    "Un chien boit en formant une cuill\u00e8re avec sa langue.",
    "Le Terre-Neuve a des pattes palm\u00e9es pour mieux nager.",
    "Les chiens reconnaissent plus de 250 gestes et signaux.",
    "Le Saint-Bernard ne portait pas de tonneau dans la r\u00e9alit\u00e9.",
    "Les chiens ont trois paupi\u00e8res, dont une membrane nictitante.",
    "Un chien peut localiser un son en 6/100\u00e8me de seconde.",
    "Les chiens synchronisent leur respiration avec celle de leur ma\u00eetre en dormant.",
    "Le Chow-Chow a la langue bleue-noire.",
    "Le cerveau d\u2019un chien est sp\u00e9cialis\u00e9 pour reconna\u00eetre les visages humains.",
    "Les chiens ont un \u00ab compas magn\u00e9tique \u00bb et pr\u00e9f\u00e8rent s\u2019aligner nord-sud.",
    "Le Saluki est consid\u00e9r\u00e9 comme la plus ancienne race domestiqu\u00e9e.",
    "Un chien moyen exerce une pression de m\u00e2choire de 150 kg.",
    "Les Golden Retrievers peuvent porter un \u0153uf dans leur gueule sans le casser.",
    "Les chiens tournent en rond avant de se coucher par instinct ancestral.",
    "Le Corgi \u00e9tait utilis\u00e9 pour garder les troupeaux de b\u0153ufs au Pays de Galles.",
    "Les chiens poss\u00e8dent environ 300 millions de r\u00e9cepteurs olfactifs.",
  ],
  chat: [
    "Les chats passent 70 % de leur vie \u00e0 dormir.",
    "Un chat peut sauter jusqu\u2019\u00e0 6 fois sa longueur.",
    "Les chats ronronnent \u00e0 une fr\u00e9quence qui favorise la gu\u00e9rison osseuse.",
    "Le cerveau d\u2019un chat est similaire \u00e0 90 % \u00e0 celui d\u2019un humain.",
    "Les chats ont plus de 20 vocalisations diff\u00e9rentes.",
    "Le plus vieux chat connu a v\u00e9cu 38 ans.",
    "Les chats ne peuvent pas go\u00fbter le sucr\u00e9.",
    "Un chat a 230 os, soit plus qu\u2019un humain.",
    "Les moustaches d\u2019un chat sont aussi larges que son corps.",
    "Les chats passent 30 % de leur temps \u00e9veill\u00e9 \u00e0 se toiletter.",
    "Un chat adulte n\u2019utilise le miaulement que pour communiquer avec les humains.",
    "Les chats peuvent faire tourner leurs oreilles \u00e0 180 degr\u00e9s.",
    "Le ronronnement se situe entre 25 et 150 Hz.",
    "Les chats ont un champ de vision de 200 degr\u00e9s.",
    "Isaac Newton a invent\u00e9 la chati\u00e8re.",
    "Les chats retombent presque toujours sur leurs pattes gr\u00e2ce au r\u00e9flexe de redressement.",
    "Un chat peut courir \u00e0 50 km/h sur de courtes distances.",
    "Les chats domestiques partagent 95,6 % de leur ADN avec les tigres.",
    "La plupart des chats roux sont des m\u00e2les.",
    "Un groupe de chats s\u2019appelle une \u00ab clowder \u00bb.",
    "Les chats n\u2019ont pas de clavicule, ce qui leur permet de se faufiler partout.",
    "Les empreintes de nez des chats sont uniques.",
    "Les chats atterrissent apr\u00e8s un saut avec un impact minimal gr\u00e2ce \u00e0 leurs coussinets.",
    "Le chat le plus riche du monde a h\u00e9rit\u00e9 de 13 millions de dollars.",
    "Les chats peuvent d\u00e9tecter les tremblements de terre avant les humains.",
    "Le f\u00e9lin le plus rapide est le Mau \u00e9gyptien (48 km/h).",
    "Les chats pr\u00e9f\u00e8rent l\u2019eau courante \u00e0 l\u2019eau stagnante.",
    "Un chat dort en moyenne 16 heures par jour.",
    "Les chats utilisent leur queue pour maintenir l\u2019\u00e9quilibre.",
    "Le pelage tabby est le motif le plus r\u00e9pandu au monde.",
    "Les chats ont une m\u00e9moire \u00e0 long terme sup\u00e9rieure \u00e0 celle des chiens.",
  ],
  lapin: [
    "Les lapins peuvent voir \u00e0 presque 360 degr\u00e9s.",
    "Un lapin heureux fait des \u00ab binkies \u00bb \u2014 des sauts de joie.",
    "Les lapins ronronnent en frottant leurs dents.",
    "Les dents d\u2019un lapin poussent continuellement toute leur vie.",
    "Un lapin peut vivre jusqu\u2019\u00e0 12 ans.",
    "Les lapins sont cr\u00e9pusculaires : actifs \u00e0 l\u2019aube et au cr\u00e9puscule.",
    "Un lapin peut courir jusqu\u2019\u00e0 56 km/h.",
    "Les lapins ne peuvent pas vomir.",
    "Les b\u00e9b\u00e9s lapins s\u2019appellent des \u00ab lapereaux \u00bb.",
    "Les lapins ont 28 dents.",
    "Leur odorat est 20 fois plus d\u00e9velopp\u00e9 que le n\u00f4tre.",
    "Les lapins communiquent en tapant du pied.",
    "Un lapin g\u00e9ant peut peser plus de 10 kg.",
    "Les lapins mangent leurs c\u00e9cotropes pour digestion compl\u00e8te.",
    "La fourrure du lapin angora peut mesurer 30 cm.",
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
    "Un lapin stressant tape du pied pour alerter les autres.",
    "Les lapins aiment les jouets en bois \u00e0 ronger.",
  ],
  oiseau: [
    "Les perroquets peuvent vivre plus de 80 ans.",
    "Le colibri est le seul oiseau capable de voler en arri\u00e8re.",
    "Les plumes repr\u00e9sentent 5 \u00e0 10 % du poids d\u2019un oiseau.",
    "Les oiseaux n\u2019ont pas de dents.",
    "Le cri d\u2019une perruche peut atteindre 111 d\u00e9cibels.",
    "Les canaris peuvent apprendre des m\u00e9lodies complexes.",
    "Les oiseaux ont des os creux pour faciliter le vol.",
    "Un pigeon peut retrouver son chemin sur plus de 1 000 km.",
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
    "Les oiseaux migrateurs parcourent jusqu\u2019\u00e0 70 000 km par an.",
    "Le flamant rose doit sa couleur \u00e0 son alimentation en crevettes.",
    "Les inséparables forment des couples pour la vie.",
    "Le plus petit oiseau du monde, le colibri-abeille, p\u00e8se 1,6 g.",
    "Les oiseaux ont un syst\u00e8me respiratoire \u00e0 double flux unique.",
    "Les merles peuvent imiter des sonneries de t\u00e9l\u00e9phone.",
    "Les pigeons peuvent reconna\u00eetre leur reflet dans un miroir.",
    "Un aigle royal peut voir un lapin \u00e0 3 km de distance.",
    "Les oiseaux sont les descendants directs des dinosaures.",
    "Les perruches ador\u00e9 jouer avec des grelots et des miroirs.",
    "Le toucan utilise son bec pour r\u00e9guler sa temp\u00e9rature.",
    "Les oiseaux ont entre 1 000 et 25 000 plumes selon l\u2019esp\u00e8ce.",
  ],
  rongeur: [
    "Les hamsters peuvent stocker de la nourriture dans leurs abajoues.",
    "Les cochons d\u2019Inde ronronnent quand ils sont heureux.",
    "Les souris peuvent chanter des m\u00e9lodies ultrasoniques.",
    "Un \u00e9cureuil peut retrouver ses noix enterr\u00e9es sous 30 cm de neige.",
    "Les gerbilles sont originaires des d\u00e9serts de Mongolie.",
    "Les rats rient quand on les chatouille.",
    "Les dents d\u2019un rongeur poussent toute leur vie.",
    "Un hamster peut courir 9 km par nuit dans sa roue.",
    "Les cochons d\u2019Inde ont besoin de vitamine C comme les humains.",
    "Les chinchillas ont la fourrure la plus dense au monde.",
    "Un rat peut survivre plus longtemps sans eau qu\u2019un chameau.",
    "Les souris ont une excellente m\u00e9moire spatiale.",
    "Les hamsters sont solitaires et pr\u00e9f\u00e8rent vivre seuls.",
    "Les gerbilles communiquent en tapant du pied.",
    "Les cochons d\u2019Inde \u00ab popcornent \u00bb quand ils sont excit\u00e9s.",
    "Les rats nettoient leur fourrure plus souvent que les chats.",
    "Un chinchilla ne doit jamais \u00eatre mouill\u00e9 \u2014 il prend des bains de sable.",
    "Les souris peuvent se faufiler dans un trou de 6 mm.",
    "Les hamsters sont nocturnes et tr\u00e8s actifs la nuit.",
    "Les cochons d\u2019Inde vivent en moyenne 5 \u00e0 7 ans.",
    "Les rats sont extr\u00eamement sociaux et souffrent de solitude.",
    "Les \u00e9cureuils enterrent des noix et oublient 74 % d\u2019entre elles.",
    "Un hamster peut transporter la moiti\u00e9 de son poids dans ses abajoues.",
    "Les cochons d\u2019Inde produisent plus de 10 sons diff\u00e9rents.",
    "Les chinchillas peuvent sauter \u00e0 1,80 m de hauteur.",
    "Les rats peuvent apprendre leur nom et r\u00e9pondre.",
    "Un hamster russe peut changer de couleur en hiver.",
    "Les souris sont daltonniennes mais voient tr\u00e8s bien dans le noir.",
    "Les cochons d\u2019Inde ont 20 dents.",
    "Les gerbilles vivent en couples fid\u00e8les pour la vie.",
    "Un rat peut nager pendant 3 jours sans s\u2019arr\u00eater.",
  ],
  autre: [
    "Les tortues existent depuis plus de 200 millions d\u2019ann\u00e9es.",
    "Les furets dorment entre 14 et 18 heures par jour.",
    "Les serpents sentent avec leur langue.",
    "Les poissons rouges ont une m\u00e9moire de plusieurs mois.",
    "Les tortues peuvent sentir les vibrations \u00e0 travers leur carapace.",
    "Les axolotls peuvent r\u00e9g\u00e9n\u00e9rer leurs membres.",
    "Un poisson combattant reconna\u00eet son propri\u00e9taire.",
    "Les geckos l\u00e8opards stockent de la graisse dans leur queue.",
    "Les furets font une \u00ab danse de la joie \u00bb quand ils jouent.",
    "Les serpents n\u2019ont pas de paupi\u00e8res.",
    "Les tortues respirent en partie par leur derri\u00e8re.",
    "Les poissons dormant les yeux ouverts car ils n\u2019ont pas de paupi\u00e8res.",
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
    "Les tortues marines nagent \u00e0 plus de 35 km/h.",
    "Les l\u00e9zards \u00e0 collerette courent sur deux pattes quand ils fuient.",
    "Les furets ont \u00e9t\u00e9 domestiqu\u00e9s il y a plus de 2 500 ans.",
    "Les bernard-l\u2019ermite changent de coquille en grandissant.",
    "Les araign\u00e9es ne sont pas des insectes mais des arachnides.",
    "Les axolotls gardent leur forme larvaire toute leur vie.",
    "Les poissons-globes gonflent pour effrayer les pr\u00e9dateurs.",
    "Les tortues communiquent par des vibrations et des sons graves.",
  ],
};

// ---------------------------------------------------------------------------
// Daily Tips  -- 5+ per species
// ---------------------------------------------------------------------------

const TIPS: Record<AnimalSpecies, string[]> = {
  chien: [
    "Promenez votre chien au moins 30 minutes matin et soir pour son \u00e9quilibre.",
    "Brossez les dents de votre chien 2-3 fois par semaine pour \u00e9viter le tartre.",
    "Variez les parcours de balade pour stimuler son odorat et son esprit.",
    "Apprenez-lui un nouveau tour chaque mois : c\u2019est excellent pour sa sant\u00e9 mentale.",
    "V\u00e9rifiez ses coussinets apr\u00e8s chaque balade, surtout en \u00e9t\u00e9 et en hiver.",
    "Hydratation : un chien de 10 kg a besoin de 500 ml d\u2019eau par jour minimum.",
    "Ne donnez jamais de chocolat, raisin, oignon ou xylitol \u00e0 un chien.",
  ],
  chat: [
    "Proposez des sessions de jeu de 15 min par jour pour \u00e9viter l\u2019ennui.",
    "Nettoyez la liti\u00e8re tous les jours pour le bien-\u00eatre de votre chat.",
    "Les chats adorent les hauteurs : installez un arbre \u00e0 chat ou des \u00e9tag\u00e8res.",
    "Brossez votre chat r\u00e9guli\u00e8rement pour r\u00e9duire les boules de poils.",
    "Laissez toujours de l\u2019eau fra\u00eeche \u00e0 disposition, id\u00e9alement une fontaine.",
    "Un chat d\u2019int\u00e9rieur a besoin de stimulation : jouets, griffoirs, fen\u00eatres.",
    "Le chocolat, le lys et l\u2019oignon sont toxiques pour les chats.",
  ],
  lapin: [
    "Donnez du foin \u00e0 volont\u00e9 : c\u2019est 80 % de l\u2019alimentation d\u2019un lapin.",
    "Laissez votre lapin sortir de sa cage au moins 4 heures par jour.",
    "Les lapins ont besoin de compagnie : envisagez un deuxi\u00e8me lapin.",
    "Ne soulevez jamais un lapin par les oreilles.",
    "V\u00e9rifiez ses dents r\u00e9guli\u00e8rement pour \u00e9viter la malocclusion.",
    "Les lapins sont sensibles \u00e0 la chaleur : gardez-les au frais en \u00e9t\u00e9 (< 25\u00b0C).",
    "Proposez des branches de pommier ou de noisetier \u00e0 ronger.",
  ],
  oiseau: [
    "Parlez r\u00e9guli\u00e8rement \u00e0 votre oiseau pour maintenir le lien social.",
    "Offrez un bain d\u2019eau ti\u00e8de 2-3 fois par semaine pour le plumage.",
    "Variez l\u2019alimentation : graines, fruits frais et l\u00e9gumes.",
    "\u00c9vitez les fum\u00e9es de cuisine (t\u00e9flon) : c\u2019est mortel pour les oiseaux.",
    "Laissez votre oiseau voler librement dans une pi\u00e8ce s\u00e9curis\u00e9e.",
    "Les oiseaux ont besoin de 10-12 heures de sommeil dans le noir complet.",
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
    "Les reptiles ont besoin de lampes UV pour synth\u00e9tiser la vitamine D.",
    "Les poissons d\u2019eau douce n\u00e9cessitent un changement d\u2019eau de 20 % par semaine.",
    "Ne rel\u00e2chez jamais un animal exotique dans la nature.",
  ],
};

// ---------------------------------------------------------------------------
// Milestone messages
// ---------------------------------------------------------------------------

function milestoneMessage(count: number): string | null {
  if (count === 3) return "3 jours d\u2019affil\u00e9e ! Ton animal est fier de toi \uD83D\uDC95";
  if (count === 7) return "1 semaine compl\u00e8te ! Tu es un super ma\u00eetre \uD83C\uDF1F";
  if (count === 14) return "2 semaines ! Rien ne t\u2019arr\u00eate \uD83D\uDE80";
  if (count === 30) return "30 jours ! L\u00e9gende vivante de Pawly \uD83D\uDC51";
  if (count === 60) return "60 jours ! Engagement exemplaire \uD83C\uDFC6";
  if (count === 100) return "100 jours ! Centurion Pawly \u2728";
  return null;
}

// ---------------------------------------------------------------------------
// Streak helpers (localStorage)
// ---------------------------------------------------------------------------

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getAndUpdateStreak(): Streak {
  const KEY = "pawly_streak";
  let streak: Streak = { count: 1, lastDate: todayStr() };

  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed: Streak = JSON.parse(raw);
      if (parsed.lastDate === todayStr()) {
        return parsed;
      } else if (parsed.lastDate === yesterdayStr()) {
        streak = { count: parsed.count + 1, lastDate: todayStr() };
      } else {
        streak = { count: 1, lastDate: todayStr() };
      }
    }
  } catch {
    // corrupted storage, reset
  }

  try {
    localStorage.setItem(KEY, JSON.stringify(streak));
  } catch {}

  return streak;
}

// ---------------------------------------------------------------------------
// Date formatting
// ---------------------------------------------------------------------------

function formatDate(): string {
  const d = new Date();
  const days = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  const months = [
    "janvier", "f\u00e9vrier", "mars", "avril", "mai", "juin",
    "juillet", "ao\u00fbt", "septembre", "octobre", "novembre", "d\u00e9cembre",
  ];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
}

function greetingWord(): string {
  const h = new Date().getHours();
  if (h < 6) return "Bonne nuit";
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon apr\u00e8s-midi";
  return "Bonsoir";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FeedPage() {
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [animals, setAnimals] = useState<AnimalRow[]>([]);
  const [streak, setStreak] = useState<Streak>({ count: 0, lastDate: "" });
  const [matchCount, setMatchCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeCard, setActiveCard] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Fetch data
  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Parallel queries
      const [profileRes, animalsRes, matchRes, msgRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name, avatar_url, city").eq("id", user.id).single(),
        supabase.from("animals").select("id, name, species, breed, photo_url, traits, age_months, gender").eq("created_by", user.id).order("created_at", { ascending: false }),
        supabase.from("matches").select("*", { count: "exact", head: true }).eq("sender_user_id", user.id).gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
        supabase.from("messages").select("*", { count: "exact", head: true }).eq("sender_id", user.id).gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
      ]);

      setProfile(profileRes.data as ProfileRow | null);
      setAnimals((animalsRes.data as AnimalRow[] | null) || []);
      setMatchCount(matchRes.count || 0);
      setMessageCount(msgRes.count || 0);
      setStreak(getAndUpdateStreak());
      setLoading(false);
    }

    load();
  }, []);

  // Daily fact for each animal
  function getDailyFact(species: AnimalSpecies): string {
    const facts = FACTS[species] || FACTS.autre;
    return facts[dailySeed() % facts.length];
  }

  // Daily tip based on primary species
  function getDailyTip(): string {
    const primarySpecies: AnimalSpecies = animals.length > 0 ? animals[0].species : "chien";
    const tips = TIPS[primarySpecies] || TIPS.autre;
    return tips[dailySeed() % tips.length];
  }

  // Carousel scroll handler
  function scrollToCard(idx: number) {
    setActiveCard(idx);
    carouselRef.current?.children[idx]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }

  const firstName = profile?.full_name?.split(" ")[0] || "";
  const milestone = milestoneMessage(streak.count);

  // -------------------------------------------------------------------------
  // Loading skeleton
  // -------------------------------------------------------------------------
  if (loading) {
    return (
      <main className="min-h-screen px-4 pt-6 pb-32" style={{ background: "var(--c-deep)" }}>
        <div className="mx-auto max-w-lg space-y-6 stagger-children">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="glass rounded-2xl p-6 animate-breathe"
              style={{ height: i === 1 ? 220 : 100, animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </main>
    );
  }

  // -------------------------------------------------------------------------
  // Not authenticated
  // -------------------------------------------------------------------------
  if (!profile) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--c-deep)" }}>
        <div className="glass-strong rounded-3xl p-8 text-center max-w-sm animate-scale-in">
          <div className="text-5xl mb-4">{"\uD83D\uDC3E"}</div>
          <h1 className="text-2xl font-extrabold mb-2" style={{ color: "var(--c-text)" }}>
            Bienvenue sur Pawly
          </h1>
          <p className="text-sm mb-6" style={{ color: "var(--c-text-muted)" }}>
            Connecte-toi pour d&eacute;couvrir ton feed personnalis&eacute;.
          </p>
          <Link href="/login" className="btn-futuristic inline-block w-full text-center">
            Se connecter
          </Link>
        </div>
      </main>
    );
  }

  // -------------------------------------------------------------------------
  // Main Feed
  // -------------------------------------------------------------------------
  return (
    <main className="min-h-screen px-4 pt-6 pb-32" style={{ background: "var(--c-deep)" }}>
      <div className="mx-auto max-w-lg space-y-5 stagger-children">

        {/* ====== 0. STORIES RING ====== */}
        <StoriesRing />

        {/* ====== 1. DAILY GREETING ====== */}
        <section className="glass rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute -top-6 -right-6 text-[80px] opacity-10 pointer-events-none select-none animate-paw-drift">
            {"\uD83D\uDC3E"}
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--c-text-muted)" }}>
            {formatDate()}
          </p>
          <h1 className="text-2xl font-extrabold" style={{ color: "var(--c-text)" }}>
            {greetingWord()} {firstName} {"\uD83D\uDC3E"}
          </h1>
          {profile.city && (
            <p className="text-xs mt-1" style={{ color: "var(--c-text-muted)" }}>
              {"\uD83D\uDCCD"} {profile.city}
            </p>
          )}
        </section>

        {/* ====== 2. PET CARDS CAROUSEL ====== */}
        {animals.length > 0 && (
          <section>
            <h2 className="text-sm font-bold uppercase tracking-wider mb-3 px-1" style={{ color: "var(--c-text-muted)" }}>
              Mes compagnons
            </h2>

            {/* Carousel */}
            <div
              ref={carouselRef}
              className="flex gap-4 overflow-x-auto scroll-snap-x pb-2 -mx-4 px-4"
              style={{ scrollbarWidth: "none" }}
              onScroll={(e) => {
                const el = e.currentTarget;
                const cardWidth = el.children[0]?.clientWidth || 1;
                const idx = Math.round(el.scrollLeft / (cardWidth + 16));
                setActiveCard(idx);
              }}
            >
              {animals.map((animal) => {
                const mood = getMood(animal);
                const speciesEmoji = EMOJI_MAP[animal.species] || "\uD83D\uDC3E";
                const fact = getDailyFact(animal.species);

                return (
                  <div
                    key={animal.id}
                    className="glass card-futuristic holographic-shimmer rounded-2xl p-4 flex-shrink-0 w-[85vw] max-w-[340px]"
                  >
                    {/* Top row: photo + info */}
                    <div className="flex gap-3 items-start">
                      <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 neon-orange">
                        {animal.photo_url ? (
                          <Image
                            src={animal.photo_url}
                            alt={animal.name}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center text-2xl"
                            style={{ background: "var(--c-card)" }}
                          >
                            {speciesEmoji}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-extrabold truncate" style={{ color: "var(--c-text)" }}>
                          {animal.name}
                        </h3>
                        <p className="text-xs" style={{ color: "var(--c-text-muted)" }}>
                          {speciesEmoji} {animal.breed || animal.species}
                          {animal.age_months !== null && (
                            <span>
                              {" \u2022 "}
                              {animal.age_months >= 12
                                ? `${Math.floor(animal.age_months / 12)} an${Math.floor(animal.age_months / 12) > 1 ? "s" : ""}`
                                : `${animal.age_months} mois`}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Mood indicator */}
                    <div
                      className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2"
                      style={{ background: "rgba(255,255,255,0.05)" }}
                    >
                      <span className="text-lg">{mood.emoji}</span>
                      <div>
                        <p className={`text-sm font-bold ${mood.color}`}>
                          {mood.label}
                        </p>
                        <p className="text-[10px]" style={{ color: "var(--c-text-muted)" }}>
                          Humeur du jour
                        </p>
                      </div>
                    </div>

                    {/* Daily fact */}
                    <div
                      className="mt-3 rounded-xl px-3 py-2 text-xs leading-relaxed"
                      style={{ background: "rgba(249,115,22,0.06)", color: "var(--c-text-muted)" }}
                    >
                      <span className="font-bold" style={{ color: "var(--c-accent)" }}>
                        {"\uD83D\uDCA1"} Le sais-tu ?
                      </span>{" "}
                      {fact}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Dot indicators */}
            {animals.length > 1 && (
              <div className="flex justify-center gap-1.5 mt-3">
                {animals.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => scrollToCard(i)}
                    className="rounded-full transition-all duration-300"
                    style={{
                      width: i === activeCard ? 20 : 6,
                      height: 6,
                      background: i === activeCard ? "var(--c-accent)" : "var(--c-border)",
                    }}
                    aria-label={`Animal ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* No animals CTA */}
        {animals.length === 0 && (
          <section className="glass rounded-2xl p-5 text-center">
            <div className="text-4xl mb-2">{"\uD83D\uDC3E"}</div>
            <p className="text-sm font-semibold mb-3" style={{ color: "var(--c-text)" }}>
              Ajoute ton premier compagnon !
            </p>
            <Link
              href="/profile/animals/new"
              className="btn-futuristic inline-block text-sm px-6 py-3"
            >
              + Ajouter un animal
            </Link>
          </section>
        )}

        {/* ====== 3. STREAK COUNTER ====== */}
        <section className="glass rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl animate-pulse-glow"
              style={{ background: "linear-gradient(135deg, rgba(249,115,22,0.2), rgba(234,88,12,0.1))" }}
            >
              {streak.count >= 7 ? "\uD83D\uDD25" : "\u2B50"}
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black gradient-text-warm">
                  {streak.count}
                </span>
                <span className="text-sm font-bold" style={{ color: "var(--c-text)" }}>
                  {streak.count === 1 ? "jour" : "jours"}
                </span>
              </div>
              <p className="text-xs" style={{ color: "var(--c-text-muted)" }}>
                de suite sur Pawly
              </p>
            </div>
          </div>

          {milestone && (
            <div
              className="mt-3 rounded-xl px-3 py-2 text-xs font-medium animate-scale-in"
              style={{ background: "rgba(249,115,22,0.08)", color: "var(--c-accent)" }}
            >
              {milestone}
            </div>
          )}
        </section>

        {/* ====== 4. DAILY TIP ====== */}
        <section className="glass rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
              style={{ background: "rgba(56,189,248,0.1)" }}
            >
              {"\uD83D\uDCDD"}
            </div>
            <div>
              <h2 className="text-sm font-bold mb-1" style={{ color: "var(--c-text)" }}>
                Conseil du jour
              </h2>
              <p className="text-xs leading-relaxed" style={{ color: "var(--c-text-muted)" }}>
                {getDailyTip()}
              </p>
            </div>
          </div>
        </section>

        {/* ====== 5. ACTIVITY STATS ====== */}
        <section className="glass rounded-2xl p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: "var(--c-text-muted)" }}>
            Cette semaine
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Matchs", value: matchCount, icon: "\uD83D\uDC95", glow: "rgba(244,114,182,0.15)" },
              { label: "Messages", value: messageCount, icon: "\uD83D\uDCAC", glow: "rgba(96,165,250,0.15)" },
              { label: "Animaux", value: animals.length, icon: "\uD83D\uDC3E", glow: "rgba(249,115,22,0.15)" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl p-3 text-center"
                style={{ background: stat.glow }}
              >
                <div className="text-xl mb-1">{stat.icon}</div>
                <div className="text-2xl font-black gradient-text animate-count-up">
                  {stat.value}
                </div>
                <div className="text-[10px] font-semibold mt-0.5" style={{ color: "var(--c-text-muted)" }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ====== 6. QUICK ACTIONS ====== */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wider mb-3 px-1" style={{ color: "var(--c-text-muted)" }}>
            Actions rapides
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { emoji: "\uD83D\uDD0D", label: "Flairer", href: "/flairer", gradient: "linear-gradient(135deg, rgba(249,115,22,0.15), rgba(234,88,12,0.08))" },
              { emoji: "\uD83D\uDCAC", label: "Messages", href: "/matches", gradient: "linear-gradient(135deg, rgba(96,165,250,0.15), rgba(59,130,246,0.08))" },
              { emoji: "\uD83D\uDCCD", label: "Carte", href: "/carte", gradient: "linear-gradient(135deg, rgba(52,211,153,0.15), rgba(16,185,129,0.08))" },
              { emoji: "\uD83D\uDC3E", label: "Mon profil", href: "/profile", gradient: "linear-gradient(135deg, rgba(167,139,250,0.15), rgba(139,92,246,0.08))" },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="glass card-futuristic rounded-2xl p-4 flex items-center gap-3 active:scale-95 transition-transform"
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ background: action.gradient }}
                >
                  {action.emoji}
                </div>
                <span className="text-sm font-bold" style={{ color: "var(--c-text)" }}>
                  {action.label}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* ====== 7. CROSS-APP CTA ====== */}
        <section>
          <a
            href="https://pawdirectory.ch"
            target="_blank"
            rel="noopener noreferrer"
            className="glass gradient-border rounded-2xl p-5 flex items-center gap-4 active:scale-[0.98] transition-transform block"
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
              style={{ background: "rgba(249,115,22,0.12)" }}
            >
              {"\uD83C\uDFE5"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold" style={{ color: "var(--c-text)" }}>
                Besoin d&apos;un v&eacute;to ?
              </p>
              <p className="text-xs" style={{ color: "var(--c-text-muted)" }}>
                Trouve un v&eacute;t&eacute;rinaire de confiance sur PawDirectory
              </p>
            </div>
            <span className="text-lg" style={{ color: "var(--c-accent)" }}>
              {"\u2192"}
            </span>
          </a>
        </section>

      </div>
    </main>
  );
}
