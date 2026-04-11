import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ── Types ──────────────────────────────────────────────────────
interface Animal {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  age: number | null;
  weight: number | null;
  personality: string[] | null;
  energy: string | null;
  vaccinated: boolean | null;
  sterilized: boolean | null;
  diet: string | null;
  allergies: string | null;
  gender: string | null;
}

interface PatternRule {
  keywords: string[];
  handler: (animal: Animal, msg: string) => string;
}

// ── Helpers ────────────────────────────────────────────────────
function speciesLabel(s: string): string {
  const map: Record<string, string> = {
    chien: "chien",
    chat: "chat",
    lapin: "lapin",
    oiseau: "oiseau",
    rongeur: "rongeur",
  };
  return map[s] || "animal";
}

function speciesArticle(s: string): string {
  const map: Record<string, string> = {
    chien: "un chien",
    chat: "un chat",
    lapin: "un lapin",
    oiseau: "un oiseau",
    rongeur: "un rongeur",
  };
  return map[s] || "un animal";
}

function ageLabel(age: number | null): string {
  if (!age) return "";
  if (age < 1) return "chiot/chaton";
  if (age <= 2) return "jeune";
  if (age <= 7) return "adulte";
  return "senior";
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ");
}

// ── Pattern Database (50+ rules) ───────────────────────────────
function buildPatterns(animal: Animal): PatternRule[] {
  const name = animal.name || "votre animal";
  const sp = speciesLabel(animal.species);
  const age = animal.age;
  const weight = animal.weight;
  const ageDesc = ageLabel(age);
  const vaccinated = animal.vaccinated;
  const sterilized = animal.sterilized;
  const diet = animal.diet;
  const allergies = animal.allergies;
  const breed = animal.breed || "";

  return [
    // ═══════════════════════════════════════════════════════════
    // ALIMENTATION (8 patterns)
    // ═══════════════════════════════════════════════════════════
    {
      keywords: ["mange moins", "mange plus", "appetit", "perte appetit", "ne mange pas", "refuse manger", "anorexie"],
      handler: () =>
        `Si ${name} mange moins que d'habitude, cela peut etre lie au stress, a un changement de saison ou a un probleme dentaire. Pour ${speciesArticle(animal.species)}${ageDesc ? " " + ageDesc : ""}, c'est important de surveiller sur 24-48h. Si la perte d'appetit dure plus de 2 jours, je te conseille de consulter ton veterinaire pour verifier que tout va bien.`,
    },
    {
      keywords: ["changement nourriture", "changer croquette", "nouvelle nourriture", "transition alimentaire", "changer alimentation"],
      handler: () =>
        `Pour changer l'alimentation de ${name}, il faut faire une transition progressive sur 7 a 10 jours : melange 75% ancien / 25% nouveau pendant 3 jours, puis 50/50, puis 25/75, et enfin 100% nouveau.${diet ? ` Actuellement, ${name} est au regime "${diet}".` : ""} Une transition trop rapide peut causer des troubles digestifs chez ${speciesArticle(animal.species)}.`,
    },
    {
      keywords: ["friandise", "gourmandise", "recompense", "treat", "gater"],
      handler: () =>
        `Les friandises sont super pour l'education de ${name}, mais elles ne doivent pas depasser 10% de sa ration journaliere.${weight ? ` Avec ses ${weight} kg, adapte les portions en consequence.` : ""} Privilegiez les friandises naturelles et evitez le chocolat, les raisins et les oignons qui sont toxiques pour les ${sp}s.`,
    },
    {
      keywords: ["poids", "grossir", "maigrir", "regime", "obesite", "surpoids", "trop gros", "trop maigre"],
      handler: () =>
        `${weight ? `${name} pese actuellement ${weight} kg. ` : ""}Pour ${speciesArticle(animal.species)}${breed ? " de race " + breed : ""}${ageDesc ? " " + ageDesc : ""}, le maintien d'un poids sante est essentiel. Je te recommande de consulter ton veterinaire pour verifier que ${name} est dans la bonne fourchette de poids et adapter sa ration si besoin.`,
    },
    {
      keywords: ["allergie alimentaire", "intolerance", "allergie nourriture", "vomit apres manger", "diarrhee nourriture"],
      handler: () =>
        `${allergies ? `${name} a des allergies connues : ${allergies}. Assure-toi d'eviter ces ingredients dans son alimentation. ` : `Si tu suspectes une allergie alimentaire chez ${name}, les signes courants sont des demangeaisons, des vomissements ou de la diarrhee apres les repas. `}Un regime d'eviction supervise par un veterinaire est le meilleur moyen d'identifier l'allergene. N'hesite pas a en parler lors de la prochaine visite.`,
    },
    {
      keywords: ["eau", "boit beaucoup", "boit pas", "hydratation", "soif"],
      handler: () =>
        `L'hydratation est cruciale pour ${name}. ${sp === "chat" ? "Les chats boivent naturellement peu, pense a une fontaine a eau ou a de la nourriture humide pour encourager l'hydratation." : `Un ${sp} doit boire environ 50-60 ml d'eau par kg de poids corporel par jour.`}${weight ? ` Pour ${name} (${weight} kg), cela represente environ ${Math.round((weight || 5) * 55)} ml par jour.` : ""} Si tu remarques un changement soudain dans sa consommation d'eau, consulte ton veterinaire.`,
    },
    {
      keywords: ["herbe", "mange herbe", "mange plante", "plante toxique"],
      handler: () =>
        `${sp === "chat" ? `Les chats mangent parfois de l'herbe pour faciliter leur digestion. C'est un comportement normal pour ${name}. Propose-lui de l'herbe a chat (cataire) et verifie que tes plantes d'interieur ne sont pas toxiques.` : `Si ${name} mange de l'herbe occasionnellement, c'est generalement normal et aide a la digestion.`} Attention aux plantes toxiques comme le lys, le philodendron ou le muguet. En cas de doute, consulte ton veterinaire.`,
    },
    {
      keywords: ["cru", "barf", "raw", "viande crue", "os"],
      handler: () =>
        `Le regime BARF (alimentation crue) pour ${name} demande une preparation rigoureuse pour eviter les carences et les risques bacteriens. ${sp === "chat" ? "Les chats sont des carnivores stricts et peuvent beneficier d'une alimentation crue bien equilibree." : ""}Si tu envisages cette transition, je te recommande de consulter un veterinaire nutritionniste pour etablir un plan adapte a ${speciesArticle(animal.species)}${ageDesc ? " " + ageDesc : ""}.`,
    },

    // ═══════════════════════════════════════════════════════════
    // EXERCICE (7 patterns)
    // ═══════════════════════════════════════════════════════════
    {
      keywords: ["energie", "hyperactif", "trop actif", "surexcite", "calmer", "excite"],
      handler: () =>
        `Si ${name} est tres energique, c'est probablement un signe qu'il a besoin de plus de stimulation physique et mentale.${age && age < 2 ? " A son jeune age, c'est tout a fait normal !" : ""}${sp === "chien" ? " Prevois au moins 2 promenades par jour et ajoute des jeux de recherche ou un Kong garni pour le fatiguer mentalement." : sp === "chat" ? " Des sessions de jeu interactives de 15-20 minutes, 2 fois par jour, avec une canne a peche ou un laser, feront des merveilles." : ` Adapte les activites au niveau d'energie de ${name}.`}`,
    },
    {
      keywords: ["promenade", "balade", "sortir", "marche", "combien marcher"],
      handler: () =>
        `${sp === "chien" ? `Pour ${name}${breed ? " (" + breed + ")" : ""}${ageDesc ? ", un " + sp + " " + ageDesc : ""}, je recommande au moins 2 sorties par jour de 30 minutes minimum. Varie les parcours pour stimuler ses sens et laisse-le renifler — c'est son moment de decouverte !` : sp === "chat" ? `${name} peut profiter de sorties en harnais si il/elle est habitue(e) progressivement. Sinon, des sessions de jeu interactives a la maison remplacent tres bien les promenades.` : `Les besoins en exercice de ${name} dependent de son espece et de son age. Propose-lui des activites adaptees quotidiennement.`}${age && age > 8 ? " A son age, privilegiez les balades calmes et regulieres." : ""}`,
    },
    {
      keywords: ["jeu", "jouer", "jouet", "ennui", "s ennuie", "occupation"],
      handler: () =>
        `Pour divertir ${name}, voici quelques idees : ${sp === "chien" ? "les jeux de recherche (cache des friandises), le tug-of-war, les puzzles alimentaires, et les sessions de dressage courtes qui stimulent son cerveau" : sp === "chat" ? "les cannes a peche, les circuits a balles, les boites en carton, et les puzzles alimentaires sont parfaits pour stimuler son instinct de chasseur" : "les jouets interactifs et les puzzles alimentaires sont excellents"}. Alterne les jouets regulierement pour maintenir l'interet de ${name}.`,
    },
    {
      keywords: ["interieur", "appartement", "petit espace", "pas de jardin"],
      handler: () =>
        `Vivre en appartement avec ${name}, c'est tout a fait possible ! ${sp === "chien" ? "Compense avec des promenades regulieres et des jeux de stimulation mentale a la maison. Les tapis de fouille et les puzzles alimentaires sont parfaits." : sp === "chat" ? "Amenage-lui des espaces en hauteur (arbre a chat, etageres), des cachettes et des postes d'observation pres des fenetres. Les chats s'adaptent tres bien a la vie en appartement." : `Adapte l'espace de vie de ${name} avec des zones d'activite et de repos bien definies.`}`,
    },
    {
      keywords: ["nager", "piscine", "lac", "eau baignade", "natation"],
      handler: () =>
        `${sp === "chien" ? `La natation est un excellent exercice pour ${name}, doux pour les articulations ! Commence dans une eau peu profonde et calme, et ne force jamais. Rince ${name} apres chaque baignade pour eviter les irritations.` : sp === "chat" ? `La plupart des chats n'aiment pas l'eau, et ${name} n'est probablement pas une exception ! Evite de le/la forcer.` : `La baignade n'est pas recommandee pour tous les animaux.`}${age && age > 7 ? " A son age, la natation est particulierement benefique car elle menage les articulations." : ""} Surveille toujours ${name} pres de l'eau.`,
    },
    {
      keywords: ["fatigue", "dort beaucoup", "lethargie", "plus envie", "ne bouge plus"],
      handler: () =>
        `Si ${name} semble plus fatigue que d'habitude, cela peut etre lie a la saison, a un changement de routine ou a un probleme de sante.${age && age > 7 ? ` A ${age} ans, c'est normal que ${name} ralentisse un peu.` : ""} ${sp === "chat" ? "Les chats dorment 12 a 16 heures par jour, c'est normal." : ""} Si la fatigue s'accompagne de perte d'appetit ou d'autres symptomes, n'hesite pas a consulter ton veterinaire pour un bilan.`,
    },
    {
      keywords: ["course", "courir", "running", "canicross", "sport"],
      handler: () =>
        `${sp === "chien" ? `Courir avec ${name}, c'est une super idee ! ${breed ? `La race ${breed} ` : "Selon la race, "}peut etre plus ou moins adaptee aux courses longues. Commence progressivement et verifie aupres de ton veterinaire que ${name} est apte.${age && age < 1 ? " Attention, les chiots ne devraient pas courir de longues distances avant 12-18 mois (risque pour les articulations en croissance)." : ""}` : `Le ${sp} n'est pas l'animal ideal pour la course a pied, mais ${name} a besoin d'exercice adapte a son espece.`} Pense a bien hydrater ${name} pendant et apres l'effort.`,
    },

    // ═══════════════════════════════════════════════════════════
    // SANTE (8 patterns)
    // ═══════════════════════════════════════════════════════════
    {
      keywords: ["vaccin", "vaccination", "rappel vaccin", "premier vaccin", "vaccines recommandes"],
      handler: () =>
        `${vaccinated ? `${name} est bien vaccine(e), c'est parfait ! ` : `Il est important de verifier le carnet de vaccination de ${name}. `}${sp === "chien" ? "Les vaccins essentiels sont : maladie de Carre, parvovirose, hepatite (DHP) et rage. Le rappel annuel est recommande." : sp === "chat" ? "Les vaccins essentiels sont : typhus, coryza et leucose (FeLV). Le rappel annuel permet de maintenir la protection." : "Chaque espece a ses propres vaccins recommandes."} Ton veterinaire etablira un calendrier vaccinal adapte a ${name}.`,
    },
    {
      keywords: ["veterinaire", "veto", "visite", "bilan", "check-up", "controle"],
      handler: () =>
        `Une visite veterinaire annuelle est recommandee pour ${name}${age && age > 7 ? ", et meme tous les 6 mois a son age" : ""}.${weight ? ` Lors de la visite, ton veto pourra verifier son poids (${weight} kg) et adapter les soins.` : ""} C'est l'occasion de faire le point sur les vaccins, la vermifugation et la sante generale. N'attends pas qu'il y ait un probleme pour consulter !`,
    },
    {
      keywords: ["symptome", "malade", "fievre", "vomit", "diarrhee", "tousse", "tremble"],
      handler: () =>
        `Si ${name} presente des symptomes comme des vomissements, de la diarrhee, de la toux ou des tremblements, il est important de surveiller leur duree et leur frequence. Un episode isole peut etre benin, mais si les symptomes persistent plus de 24h ou s'aggravent, consulte rapidement ton veterinaire. Ne donne jamais de medicament humain a ${name} sans avis veterinaire.`,
    },
    {
      keywords: ["sterilisation", "steriliser", "castrer", "castration", "chaleur", "reproduction"],
      handler: () =>
        `${sterilized ? `${name} est deja sterilise(e), ce qui reduit les risques de certains cancers et comportements indesirables. ` : `La sterilisation de ${name} est a discuter avec ton veterinaire. `}${sp === "chien" ? "Elle est generalement recommandee entre 6 et 12 mois selon la taille de la race." : sp === "chat" ? "Pour les chats, la sterilisation est recommandee des 6 mois pour eviter les portees non desirees et les fugues." : "Ton veterinaire pourra te conseiller sur le meilleur moment."} C'est un acte courant et bien maitrise.`,
    },
    {
      keywords: ["parasite", "puce", "tique", "ver", "vermifuge", "antiparasitaire"],
      handler: () =>
        `La protection antiparasitaire est essentielle pour ${name}. ${sp === "chien" || sp === "chat" ? `Traite ${name} contre les puces et les tiques tous les mois (surtout au printemps/ete) et vermifuge-le tous les 3 a 6 mois.` : `Adapte le traitement antiparasitaire a l'espece de ${name}.`}${age && age < 1 ? " Les jeunes animaux sont plus sensibles aux parasites, sois vigilant(e)." : ""} Ton veterinaire peut te recommander les produits les plus adaptes.`,
    },
    {
      keywords: ["urgence", "accident", "empoisonnement", "intoxication", "avale", "blesse"],
      handler: () =>
        `En cas d'urgence pour ${name}, garde ton calme et contacte immediatement une clinique veterinaire d'urgence. Les signes d'urgence : difficulte a respirer, saignement important, perte de connaissance, convulsions ou ingestion de produit toxique. Ne tente pas de faire vomir ${name} sans avis veterinaire. Garde le numero de ton veto d'urgence accessible en permanence.`,
    },
    {
      keywords: ["dent", "dentaire", "haleine", "gencive", "tartre", "bouche"],
      handler: () =>
        `L'hygiene dentaire de ${name} est souvent negligee mais tres importante. ${sp === "chien" ? "Les chiens peuvent developper du tartre des 3 ans. Propose des os a macher adaptes et idealement un brossage des dents 2-3 fois par semaine." : sp === "chat" ? "Les chats sont sujets aux gingivites et aux resorptions dentaires. Surveille les gencives rouges ou l'haleine tres forte." : "Surveille regulierement la bouche de ton animal."} Une mauvaise haleine persistante merite une visite chez le veterinaire.`,
    },
    {
      keywords: ["yeux", "oeil", "larmoiement", "oeil rouge", "conjonctivite", "pleure"],
      handler: () =>
        `Si les yeux de ${name} sont rouges, larmoyants ou presentent des ecoulements, cela peut indiquer une conjonctivite, une allergie ou un corps etranger. Nettoie delicatement avec du serum physiologique. Si le probleme persiste plus de 24h ou si ${name} se frotte les yeux, consulte ton veterinaire rapidement pour eviter toute complication.`,
    },

    // ═══════════════════════════════════════════════════════════
    // COMPORTEMENT (8 patterns)
    // ═══════════════════════════════════════════════════════════
    {
      keywords: ["anxiete", "anxieux", "stress", "peur", "panique", "tremble de peur", "angoisse"],
      handler: () =>
        `L'anxiete chez ${name} peut se manifester par des tremblements, des halettements ou un comportement destructeur. ${sp === "chien" ? "Les chiens anxieux beneficient d'une routine stable, d'exercice regulier et de zones de repli securisantes. Les pheromones apaisantes (Adaptil) peuvent aussi aider." : sp === "chat" ? "Les chats stresses se cachent souvent, mangent moins ou marquent leur territoire. Feliway (pheromones) et des cachettes en hauteur peuvent aider." : "Offre a ton animal un environnement calme et securisant."} Si l'anxiete est severe, un comportementaliste peut accompagner ${name}.`,
    },
    {
      keywords: ["agressif", "agressivite", "mord", "mordre", "griffe", "attaque", "grogne"],
      handler: () =>
        `L'agressivite de ${name} est un signal qu'il ne faut pas ignorer. Cela peut etre lie a la peur, la douleur ou un probleme de territorialite.${sp === "chien" ? " Ne punis jamais un chien qui grogne — c'est sa facon de communiquer un malaise." : ""} Je te recommande vivement de consulter un veterinaire (pour exclure la douleur) puis un comportementaliste certifie. En attendant, evite les situations qui declenchent l'agressivite.`,
    },
    {
      keywords: ["aboiement", "aboie", "miaule", "miaulement", "bruit", "hurle", "pleure la nuit"],
      handler: () =>
        `${sp === "chien" ? `Si ${name} aboie beaucoup, c'est un moyen de communication. Les causes principales : ennui, anxiete de separation, alerte ou demande d'attention. Identifie le declencheur et travaille dessus avec du renforcement positif.` : sp === "chat" ? `Si ${name} miaule excessivement, cela peut signifier la faim, l'ennui, le stress ou parfois un probleme de sante (surtout chez les chats ages). Un check-up veterinaire peut etre utile.` : `Les vocalisations excessives de ${name} meritent d'etre analysees.`} Ignorer les vocalisations de demande d'attention (sans punir) peut aider.`,
    },
    {
      keywords: ["fugue", "s echappe", "s enfuit", "perdu", "porte", "cloture", "fugueur"],
      handler: () =>
        `${sp === "chien" ? `Si ${name} a tendance a fuguer, verifie d'abord que ses besoins en exercice et stimulation sont couverts. La sterilisation reduit aussi les fugues (surtout chez les males).` : sp === "chat" ? `Pour eviter que ${name} ne fugue, securise les fenetres avec des filets et ne laisse pas les portes ouvertes.` : ""}${sterilized === false ? ` La sterilisation pourrait aider a reduire ce comportement chez ${name}.` : ""} Assure-toi que ${name} porte une medaille et est puce(e) pour le retrouver en cas de fugue.`,
    },
    {
      keywords: ["socialisation", "sociabiliser", "autres animaux", "rencontre", "congener", "parc a chien"],
      handler: () =>
        `La socialisation de ${name} est essentielle ${age && age < 1 ? "surtout a son jeune age (periode critique avant 4 mois pour les chiots et 7 semaines pour les chatons)" : "meme a l'age adulte"}. ${sp === "chien" ? "Propose des rencontres progressives et positives avec d'autres chiens. PawBand est parfait pour trouver des compagnons de balade compatibles !" : sp === "chat" ? "Les chats sont plus territoriaux. Introduis tout nouvel animal progressivement (piece separee, echange d'odeurs)." : "Procede toujours progressivement et dans un environnement securise."}`,
    },
    {
      keywords: ["detruit", "destruction", "gratte", "ronge", "mache", "canape", "meuble", "chaussure"],
      handler: () =>
        `La destruction chez ${name} est souvent liee a l'ennui, l'anxiete de separation ou un exces d'energie. ${sp === "chien" ? "Assure-toi qu'il a suffisamment d'exercice et de jouets a macher. Un Kong garni de friandises peut l'occuper pendant des heures !" : sp === "chat" ? "Propose un griffoir adapte (vertical ou horizontal selon sa preference) et de l'herbe a chat pour l'attirer. Jamais de punition, plutot la redirection." : "Propose des alternatives acceptables pour canaliser ce comportement."} La patience et la constance sont cles.`,
    },
    {
      keywords: ["separation", "seul", "rester seul", "absence", "partir", "quitte maison"],
      handler: () =>
        `L'anxiete de separation est courante ${sp === "chien" ? "chez les chiens" : sp === "chat" ? "chez certains chats" : "chez les animaux de compagnie"}. Pour aider ${name} : habitue-le progressivement a ton absence (departs courts puis plus longs), ne dramatise pas les departs et retrouvailles, et laisse-lui des jouets d'occupation. ${sp === "chien" ? "Un vetement avec ton odeur peut aussi le rassurer." : ""} Si le probleme est severe, un comportementaliste peut vous aider.`,
    },
    {
      keywords: ["nuit", "dort pas", "reveille", "insomnie", "agite la nuit", "nocturne"],
      handler: () =>
        `${sp === "chat" ? `Les chats sont naturellement plus actifs la nuit. Pour aider ${name} a s'adapter a ton rythme, joue intensement avec lui/elle le soir avant le coucher et donne le repas principal le soir.` : sp === "chien" ? `Si ${name} est agite la nuit, assure-toi qu'il a eu suffisamment d'exercice en journee. Un chien bien fatigue dort mieux ! Etablis une routine calme avant le coucher.` : `Pour aider ${name} a dormir la nuit, etablis une routine reguliere.`} Si les troubles du sommeil sont recents, une visite chez le veto peut etre utile.`,
    },

    // ═══════════════════════════════════════════════════════════
    // SAISONS (5 patterns)
    // ═══════════════════════════════════════════════════════════
    {
      keywords: ["ete", "chaleur", "chaud", "canicule", "coup de chaleur", "soleil", "temperature"],
      handler: () =>
        `En ete, protege ${name} de la chaleur ! ${sp === "chien" ? `Ne promene jamais ${name} aux heures les plus chaudes (11h-16h), verifie la temperature de l'asphalte avec ta main, et assure une eau fraiche en permanence. Les races a museau plat sont particulierement vulnerables.` : sp === "chat" ? `Laisse toujours de l'eau fraiche a disposition et un endroit ombre pour ${name}. Les chats gerent generalement bien la chaleur en cherchant la fraicheur.` : `Assure-toi que ${name} a acces a de l'ombre et de l'eau fraiche.`} Ne laisse JAMAIS ${name} dans une voiture, meme 5 minutes !`,
    },
    {
      keywords: ["hiver", "froid", "neige", "gel", "temperature basse", "proteger froid"],
      handler: () =>
        `En hiver, protege ${name} du froid. ${sp === "chien" ? `Apres les promenades, rince les pattes de ${name} pour enlever le sel de deneigement qui peut irriter. Les petites races et les chiens a poil court peuvent avoir besoin d'un manteau.` : sp === "chat" ? `Si ${name} sort, limite les sorties par grand froid et offre-lui un endroit bien chaud a l'interieur.` : `Adapte l'environnement de ${name} pour qu'il reste au chaud.`}${age && age > 7 ? ` A son age, ${name} est plus sensible au froid — sois encore plus vigilant(e).` : ""}`,
    },
    {
      keywords: ["printemps", "allergie saisonniere", "pollen", "se gratte beaucoup", "demangeaison"],
      handler: () =>
        `Au printemps, ${name} peut souffrir d'allergies saisonnieres comme nous ! Les signes : grattage excessif, leche de pattes, eternuements ou yeux rouges.${allergies ? ` ${name} a des allergies connues (${allergies}), sois vigilant(e).` : ""} Rince les pattes apres les sorties et brosse ${name} regulierement. Si les demangeaisons sont intenses, ton veterinaire peut prescrire un traitement adapte.`,
    },
    {
      keywords: ["automne", "mue", "poils partout", "perd ses poils", "changement pelage"],
      handler: () =>
        `La mue saisonniere est normale chez ${name}, surtout en automne et au printemps. ${sp === "chat" ? `Les chats perdent beaucoup de poils en automne — brosse ${name} quotidiennement pour eviter les boules de poils.` : sp === "chien" ? `Brosse ${name} 2 a 3 fois par semaine pendant la mue pour limiter les poils dans la maison et maintenir un beau pelage.` : "Un brossage regulier aide a gerer la mue."} Si la perte de poils est excessive ou par plaques, consulte ton veterinaire.`,
    },
    {
      keywords: ["orage", "petard", "feu artifice", "bruit fort", "tonnerre", "phobie bruit"],
      handler: () =>
        `La peur des bruits forts (orages, feux d'artifice) est tres courante chez ${speciesArticle(animal.species)}. Pour aider ${name} : cree un espace refuge calme et securisant, ferme les volets, mets une musique douce et reste calme toi-meme. ${sp === "chien" ? "Un Thunder Shirt (gilet de compression) peut aider certains chiens." : ""} Ne force jamais ${name} a affronter le bruit. Pour les cas severes, ton veterinaire peut prescrire un traitement ponctuel.`,
    },

    // ═══════════════════════════════════════════════════════════
    // TOILETTAGE (6 patterns)
    // ═══════════════════════════════════════════════════════════
    {
      keywords: ["poil", "brossage", "pelage", "brosser", "toilettage", "toiletter", "entretien poil"],
      handler: () =>
        `Le brossage regulier de ${name} est important pour la sante de son pelage et de sa peau. ${sp === "chat" ? "Les chats a poils longs doivent etre brosses quotidiennement, ceux a poils courts 1 a 2 fois par semaine." : sp === "chien" ? `Selon le type de poil${breed ? " de " + breed : ""}, brosse ${name} de 2 a 5 fois par semaine. C'est aussi un moment de complicite !` : `Adapte la frequence de brossage au type de pelage de ${name}.`} Le brossage permet aussi de detecter tot les parasites ou problemes de peau.`,
    },
    {
      keywords: ["bain", "laver", "shampooing", "douche", "propre"],
      handler: () =>
        `${sp === "chien" ? `Lave ${name} tous les 1 a 3 mois avec un shampooing specifique pour chiens (jamais de produit humain qui desequilibre le pH de la peau). Rince abondamment et seche bien, surtout les oreilles.` : sp === "chat" ? `Les chats se toilettent eux-memes et n'ont generalement pas besoin de bains. Si un bain est necessaire pour ${name}, utilise un shampooing special chat et rince tres soigneusement.` : `Utilise toujours des produits specifiques pour ${sp}s.`} Apres le bain, seche ${name} completement pour eviter les refroidissements.`,
    },
    {
      keywords: ["griffe", "ongle", "couper griffe", "coupe ongle", "lime"],
      handler: () =>
        `La coupe des griffes de ${name} doit etre faite regulierement.${sp === "chat" ? " Les chats d'interieur ont besoin qu'on leur coupe les griffes toutes les 2-3 semaines. Si tu n'es pas a l'aise, demande a ton veterinaire de te montrer la technique." : sp === "chien" ? ` Si tu entends les griffes de ${name} cliqueter sur le sol, il est temps de les couper ! Attention a ne pas couper le quick (partie vivante).` : ""} Si tu as peur de blesser ${name}, ton veterinaire ou un toiletteur peut s'en charger.`,
    },
    {
      keywords: ["oreille", "otite", "gratte oreille", "secoue tete", "oreille sale"],
      handler: () =>
        `Si ${name} se gratte les oreilles ou secoue la tete, cela peut indiquer une otite ou des parasites auriculaires. Nettoie les oreilles de ${name} toutes les 2 semaines avec un nettoyant auriculaire adapte.${sp === "chien" ? " Les races aux oreilles tombantes sont plus sujettes aux otites." : ""} Si tu remarques une odeur forte, un ecoulement ou des rougeurs, consulte ton veterinaire sans tarder.`,
    },
    {
      keywords: ["odeur", "sent mauvais", "puanteur", "mauvaise odeur"],
      handler: () =>
        `Si ${name} sent mauvais, les causes courantes sont : problemes dentaires, infection d'oreilles, probleme de peau, ou glandes anales (chez les chiens). ${sp === "chien" ? `Un bain peut aider temporairement, mais si l'odeur revient vite, c'est probablement un signe que ${name} a besoin d'une visite veterinaire.` : sp === "chat" ? "Les chats se toilettent bien normalement. Une mauvaise odeur peut indiquer un probleme de sante." : ""} N'utilise jamais de parfum ou desodorisant sur ton animal.`,
    },
    {
      keywords: ["noeud", "poil emmele", "demeler", "feutre"],
      handler: () =>
        `Les noeuds dans le pelage de ${name} peuvent etre douloureux et favoriser les problemes de peau. Demele-les delicatement avec un peigne adapte en commencant par les extremites. Si le noeud est trop serre, coupe-le doucement aux ciseaux a bouts ronds. Pour eviter les noeuds, brosse ${name} regulierement, surtout derriere les oreilles et sous les aisselles.`,
    },

    // ═══════════════════════════════════════════════════════════
    // VOYAGE (5 patterns)
    // ═══════════════════════════════════════════════════════════
    {
      keywords: ["voyage", "vacances", "partir", "avion", "train", "deplacement"],
      handler: () =>
        `Pour voyager avec ${name}, prepare-toi a l'avance ! Verifie que ses vaccins sont a jour${vaccinated ? " (c'est le cas)" : ""}, emporte son carnet de sante et suffisamment de nourriture. ${sp === "chien" ? "En train suisse (CFF), les chiens de plus de 30 cm necessitent un billet demi-tarif." : sp === "chat" ? "Utilise une caisse de transport securisee et familiere (laisse-la ouverte a la maison quelques jours avant)." : "Prevois une caisse de transport adaptee."} Pense aussi a la puce electronique et une medaille avec tes coordonnees.`,
    },
    {
      keywords: ["voiture", "transport voiture", "mal des transports", "vomit voiture", "trajet"],
      handler: () =>
        `${sp === "chien" ? `Pour les trajets en voiture avec ${name}, utilise une ceinture de securite speciale ou une caisse de transport. Ne le laisse pas la tete a la fenetre (risque d'otite et de projections).` : `Transporte ${name} en caisse de transport securisee dans la voiture.`} Si ${name} a le mal des transports, fais des trajets courts pour l'habituer progressivement. Ne donne pas de nourriture dans les 2h avant le depart et prevois des pauses regulieres.`,
    },
    {
      keywords: ["pension", "garde", "garderie", "garder", "pet sitter", "faire garder"],
      handler: () =>
        `Si tu dois faire garder ${name}, plusieurs options s'offrent a toi : pension specialisee, pet-sitter a domicile, ou un ami de confiance. ${sp === "chat" ? "Les chats preferent generalement rester chez eux avec un pet-sitter qui passe 1-2 fois par jour." : `Visite la pension avant pour verifier les conditions et presente ${name} pour un essai.`} Laisse les coordonnees de ton veterinaire et les instructions pour l'alimentation${diet ? ` (actuellement : ${diet})` : ""} et les medicaments eventuels.`,
    },
    {
      keywords: ["demenagement", "demenager", "nouvelle maison", "nouvel environnement", "changement maison"],
      handler: () =>
        `Le demenagement peut etre stressant pour ${name}. ${sp === "chat" ? `Les chats sont tres attaches a leur territoire. Installe ${name} dans une seule piece au debut avec ses affaires familieres et ouvre progressivement l'acces au reste du logement.` : sp === "chien" ? "Les chiens s'adaptent generalement bien si leur routine est maintenue. Garde les memes horaires de promenades et de repas." : "Conserve les habitudes et les objets familiers."} Sois patient(e), ${name} peut mettre quelques semaines a s'adapter.`,
    },
    {
      keywords: ["hotel", "hebergement", "camping", "restaurant", "lieu public"],
      handler: () =>
        `En Suisse, de plus en plus d'hotels et restaurants acceptent les animaux, surtout les chiens. Verifie a l'avance la politique de l'etablissement. ${sp === "chien" ? `Assure-toi que ${name} est bien eduque pour les lieux publics et emporte ses affaires (gamelle, coussin, laisse).` : `Pour ${name}, prevois toujours sa caisse de transport.`} Les CFF autorisent les animaux de compagnie dans les trains suisses, ce qui facilite les deplacements.`,
    },

    // ═══════════════════════════════════════════════════════════
    // EDUCATION (7 patterns)
    // ═══════════════════════════════════════════════════════════
    {
      keywords: ["obeissance", "dresser", "dressage", "education", "eduquer", "ordre", "commande"],
      handler: () =>
        `L'education de ${name} doit se faire avec du renforcement positif — recompense les bons comportements plutot que de punir les mauvais. ${sp === "chien" ? "Commence par les ordres de base : assis, couche, reste, viens. Des seances courtes (5-10 min) plusieurs fois par jour sont plus efficaces qu'une longue seance." : sp === "chat" ? "Oui, les chats sont aussi educables ! Le clicker training fonctionne tres bien. Commence par des tricks simples." : `Adapte les methodes d'education a l'espece de ${name}.`} La patience et la constance sont les cles du succes.`,
    },
    {
      keywords: ["proprete", "pipi", "caca", "accident", "marque", "urine", "selles", "litiere", "pas propre"],
      handler: () =>
        `${sp === "chien" ? `Pour la proprete de ${name}, sors-le apres chaque repas, apres la sieste et apres le jeu. Felicite-le chaleureusement quand il fait dehors et nettoie les accidents sans punir (il ne comprendrait pas). La patience est essentielle, surtout pour un chiot !` : sp === "chat" ? `Si ${name} fait ses besoins hors de la litiere, cela peut signaler un stress, un probleme medical ou un probleme avec la litiere elle-meme (proprete, emplacement, substrat). Prevois une litiere par chat + 1 supplementaire.` : `Les problemes de proprete chez ${name} meritent une investigation.`} Si le probleme persiste, consulte ton veterinaire.`,
    },
    {
      keywords: ["rappel", "revenir", "viens", "pas revenir", "ne revient pas", "lacher", "detacher"],
      handler: () =>
        `Le rappel est l'un des ordres les plus importants pour ${name} !${sp === "chien" ? " Entraine-le dans un endroit clos d'abord, puis avec une longe. Utilise toujours la meme commande et recompense genereusement quand il revient. Ne l'appelle JAMAIS pour quelque chose de negatif (bain, fin de promenade)." : ""} La fiabilite du rappel prend du temps — commence dans des environnements peu stimulants et augmente progressivement la difficulte.`,
    },
    {
      keywords: ["laisse", "tire", "tire en laisse", "marche au pied", "harnais"],
      handler: () =>
        `${sp === "chien" ? `Si ${name} tire en laisse, utilise un harnais anti-traction (type Y) plutot qu'un collier etrangleur. Arrete-toi quand il tire et reprends la marche quand la laisse est detendue. Recompense les moments ou il marche bien. C'est un apprentissage progressif, ne te decourage pas !` : sp === "chat" ? `Promener ${name} en harnais peut etre une super experience ! Commence par habituer ${name} au harnais a l'interieur pendant plusieurs jours avant de sortir.` : `Pour les promenades en laisse, utilise du renforcement positif.`}`,
    },
    {
      keywords: ["chiot", "chaton", "bebe", "nouveau", "premier animal", "adopter", "adoption"],
      handler: () =>
        `Felicitations pour ${name} ! ${age && age < 1 ? "Les premiers mois sont cruciaux pour l'education et la socialisation." : ""}${sp === "chien" ? " Les priorites : socialisation (avant 4 mois idealement), proprete, ordres de base, et habituation aux manipulations (pattes, oreilles, gueule)." : sp === "chat" ? " Laisse-le decouvrir son nouvel environnement a son rythme. Prepare une piece calme avec litiere, eau, nourriture et cachettes." : ""} Patience et amour sont les meilleurs ingredients pour un debut reussi avec ${name}.`,
    },
    {
      keywords: ["clicker", "renforcement positif", "recompense", "methode douce"],
      handler: () =>
        `Le renforcement positif est la methode la plus efficace et respectueuse pour eduquer ${name}. Le principe : recompense (friandise, jeu, caresse) chaque bon comportement. Le clicker est un outil formidable qui marque l'instant exact du bon comportement. ${sp === "chien" ? "Commence avec 'assis' — c'est le plus facile !" : sp === "chat" ? "Les chats repondent tres bien au clicker training avec des friandises motivantes." : "Cette methode fonctionne pour toutes les especes."} Seances courtes et frequentes sont ideales.`,
    },
    {
      keywords: ["mordillement", "mordille", "morsure chiot", "griffe jouer", "joue trop fort"],
      handler: () =>
        `Le mordillement est normal chez ${age && age < 1 ? "un jeune animal" : name} mais doit etre canalise. ${sp === "chien" ? `Quand ${name} mordille, pousse un petit cri aigu (comme un autre chiot le ferait) et arrete immediatement le jeu pendant 10 secondes. Propose un jouet a macher en alternative.` : sp === "chat" ? `Ne joue jamais directement avec tes mains ! Utilise toujours un jouet intermediaire. Si ${name} mordille, arrete le jeu et ignore-le quelques secondes.` : "Redirige le comportement vers des jouets adaptes."} La coherence est essentielle : tous les membres de la famille doivent reagir de la meme facon.`,
    },

    // ═══════════════════════════════════════════════════════════
    // GENERAL / DIVERS (5 patterns)
    // ═══════════════════════════════════════════════════════════
    {
      keywords: ["assurance", "mutuelle", "cout", "prix", "budget", "depense"],
      handler: () =>
        `En Suisse, une assurance pour ${name} peut couvrir les frais veterinaires imprevus. Les forfaits varient generalement entre 20 et 80 CHF par mois selon la couverture et l'age de l'animal. Compare les offres (Animalia, Helvetia, etc.) et verifie les exclusions. Les soins preventifs (vaccins, vermifuge) coutent environ 200-400 CHF par an. Un bon budget previsionnel t'evitera les mauvaises surprises !`,
    },
    {
      keywords: ["identification", "puce", "puce electronique", "tatouage", "amicus", "medaille"],
      handler: () =>
        `En Suisse, la puce electronique est obligatoire pour les chiens et fortement recommandee pour les chats. Enregistre ${name} sur la base de donnees AMICUS (chiens) ou aures (chats). Une medaille avec ton numero de telephone sur le collier est aussi un bon complement. Si ${name} se perd, contacte immediatement AMICUS et les refuges locaux. L'identification est le meilleur moyen de retrouver ton compagnon.`,
    },
    {
      keywords: ["race", "caractere", "temperament", "personnalite"],
      handler: () =>
        `${breed ? `${name} est un(e) ${breed}. Chaque race a ses specificites en termes de temperament, d'activite et de sante.` : `Le caractere de ${name} depend de sa genetique et de son education.`}${animal.personality && animal.personality.length > 0 ? ` D'apres ton profil, ${name} est : ${animal.personality.join(", ")}.` : ""} Souviens-toi que chaque animal est unique — la race donne des tendances, mais ${name} a sa propre personnalite ! L'essentiel est de respecter ses besoins individuels.`,
    },
    {
      keywords: ["enfant", "bebe humain", "famille", "cohabitation", "securite enfant"],
      handler: () =>
        `La cohabitation entre ${name} et des enfants peut etre merveilleuse avec les bonnes regles ! ${sp === "chien" ? `Apprends aux enfants a respecter l'espace de ${name} (ne pas le deranger quand il mange ou dort) et supervise toujours les interactions.` : sp === "chat" ? `Les enfants doivent apprendre a caresser ${name} doucement et a ne pas le poursuivre. Offre au chat des refuges en hauteur hors de portee.` : ""} Ne laisse jamais un jeune enfant seul avec un animal, quelle que soit sa gentillesse. La prevention est la cle d'une relation harmonieuse.`,
    },
    {
      keywords: ["merci", "cool", "super", "genial", "top", "parfait"],
      handler: () =>
        `De rien ! Je suis la pour t'aider avec ${name}. N'hesite pas a me poser d'autres questions sur son alimentation, sa sante, son comportement ou tout autre sujet. Prends bien soin de ${name} !`,
    },
  ];
}

// ── Match engine ───────────────────────────────────────────────
function findBestResponse(message: string, animal: Animal): string {
  const normalized = normalize(message);
  const patterns = buildPatterns(animal);

  let bestMatch: PatternRule | null = null;
  let bestScore = 0;

  for (const pattern of patterns) {
    let score = 0;
    for (const keyword of pattern.keywords) {
      const normalizedKeyword = normalize(keyword);
      if (normalized.includes(normalizedKeyword)) {
        // Longer keyword matches are worth more (more specific)
        score += normalizedKeyword.length;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = pattern;
    }
  }

  if (bestMatch && bestScore > 0) {
    return bestMatch.handler(animal, message);
  }

  // Fallback: generic helpful message
  const name = animal.name || "votre animal";
  return `Merci pour ta question ! Je n'ai pas de reponse specifique sur ce sujet pour ${name}, mais voici quelques conseils generaux : assure-toi que ${name} a une alimentation equilibree, de l'exercice quotidien, et des visites regulieres chez le veterinaire. Si tu as une question precise sur l'alimentation, la sante, le comportement ou l'education de ${name}, n'hesite pas a me la poser ! Et en cas de doute, ton veterinaire reste le meilleur interlocuteur.`;
}

// ── POST handler ───────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Non authentifie" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { message, animal_id } = body as {
      message: string;
      animal_id?: string;
    };

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json(
        { error: "Message requis" },
        { status: 400 }
      );
    }

    // Fetch the animal
    let animalQuery = supabase
      .from("animals")
      .select("*")
      .eq("created_by", user.id);

    if (animal_id) {
      animalQuery = animalQuery.eq("id", animal_id);
    }

    const { data: animals, error: animalError } = await animalQuery
      .order("created_at", { ascending: true })
      .limit(1);

    if (animalError || !animals || animals.length === 0) {
      return NextResponse.json({
        reply:
          "Je ne trouve pas d'animal sur ton profil. Ajoute d'abord un animal dans ton profil pour que je puisse te donner des conseils personnalises !",
      });
    }

    const animal: Animal = animals[0];

    // Generate response
    const reply = findBestResponse(message.trim(), animal);

    return NextResponse.json({ reply });
  } catch (err: unknown) {
    console.error("Assistant API error:", err);
    return NextResponse.json(
      {
        reply:
          "Oups, j'ai eu un petit probleme technique. Reessaie dans quelques instants !",
      },
      { status: 200 }
    );
  }
}
