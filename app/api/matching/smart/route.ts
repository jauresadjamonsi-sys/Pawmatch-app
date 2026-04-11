import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Swiss canton neighbor map for proximity scoring
// ---------------------------------------------------------------------------

const CANTON_NEIGHBORS: Record<string, string[]> = {
  ZH: ["SH", "TG", "SG", "SZ", "ZG", "AG"],
  BE: ["SO", "JU", "NE", "FR", "VS", "VD", "LU", "OW", "NW"],
  VD: ["GE", "VS", "FR", "BE", "NE"],
  GE: ["VD"],
  VS: ["VD", "BE", "FR", "TI"],
  FR: ["VD", "BE", "NE"],
  NE: ["VD", "FR", "BE", "JU"],
  LU: ["AG", "ZG", "SZ", "NW", "OW", "BE", "UR"],
  AG: ["ZH", "LU", "SO", "BL", "BS"],
  SG: ["ZH", "TG", "AR", "AI", "GR", "GL", "SZ"],
  GR: ["SG", "GL", "UR", "TI"],
  TG: ["ZH", "SG", "SH"],
  SO: ["AG", "BL", "BS", "BE", "JU"],
  SZ: ["ZH", "ZG", "LU", "UR", "GL", "SG"],
  ZG: ["ZH", "SZ", "LU"],
  SH: ["ZH", "TG"],
  JU: ["SO", "BE", "NE", "BL"],
  BS: ["BL", "AG", "SO"],
  BL: ["BS", "AG", "SO", "JU"],
  TI: ["GR", "VS", "UR"],
  UR: ["SZ", "LU", "OW", "NW", "GR", "TI"],
  OW: ["BE", "LU", "NW"],
  NW: ["OW", "LU", "UR"],
  GL: ["SZ", "SG", "GR", "UR"],
  AR: ["SG", "AI"],
  AI: ["SG", "AR"],
};

// ---------------------------------------------------------------------------
// Species compatibility matrix (score 0-30)
// ---------------------------------------------------------------------------

const SPECIES_SCORE: Record<string, Record<string, number>> = {
  chien:   { chien: 30, chat: 15, lapin: 8, oiseau: 5, rongeur: 5, autre: 10 },
  chat:    { chat: 30, chien: 15, lapin: 10, oiseau: 5, rongeur: 5, autre: 10 },
  lapin:   { lapin: 30, chat: 10, chien: 8, oiseau: 12, rongeur: 18, autre: 10 },
  oiseau:  { oiseau: 30, lapin: 12, rongeur: 12, chat: 5, chien: 5, autre: 10 },
  rongeur: { rongeur: 30, oiseau: 12, lapin: 18, chat: 5, chien: 5, autre: 10 },
  autre:   { autre: 30, chien: 10, chat: 10, lapin: 10, oiseau: 10, rongeur: 10 },
};

// ---------------------------------------------------------------------------
// Synergy trait pairs used for activity-level matching
// ---------------------------------------------------------------------------

const ACTIVITY_TRAITS = [
  "Energique", "Sportif", "Actif", "Joueur", "Calme", "Curieux",
  "Aime l'eau", "Chasseur",
];

// ---------------------------------------------------------------------------
// Scoring functions
// ---------------------------------------------------------------------------

function scoreSpecies(mySpecies: string, otherSpecies: string): number {
  return SPECIES_SCORE[mySpecies]?.[otherSpecies] ?? 10;
}

function scoreCanton(myCanton: string | null, otherCanton: string | null): number {
  if (!myCanton || !otherCanton) return 10; // neutral if unknown
  if (myCanton === otherCanton) return 25;
  const neighbors = CANTON_NEIGHBORS[myCanton];
  if (neighbors && neighbors.includes(otherCanton)) return 15;
  return 5;
}

function scoreActivityLevel(myTraits: string[], otherTraits: string[]): number {
  const myActivity = myTraits.filter((t) => ACTIVITY_TRAITS.includes(t));
  const otherActivity = otherTraits.filter((t) => ACTIVITY_TRAITS.includes(t));
  if (myActivity.length === 0 && otherActivity.length === 0) return 8; // neutral
  const shared = myActivity.filter((t) => otherActivity.includes(t));
  if (shared.length >= 3) return 15;
  if (shared.length >= 2) return 12;
  if (shared.length >= 1) return 8;
  return 3;
}

function scoreAge(myAgeMonths: number | null, otherAgeMonths: number | null): number {
  if (!myAgeMonths || !otherAgeMonths) return 5; // neutral
  const diff = Math.abs(myAgeMonths - otherAgeMonths);
  if (diff <= 6) return 10;
  if (diff <= 12) return 8;
  if (diff <= 24) return 5;
  if (diff <= 48) return 3;
  return 1;
}

function computeSmartScore(
  myAnimal: {
    species: string;
    canton: string | null;
    traits: string[];
    age_months: number | null;
  },
  otherAnimal: {
    species: string;
    canton: string | null;
    traits: string[];
    age_months: number | null;
  },
  collaborativeBoost: number
): {
  total: number;
  breakdown: {
    species: number;
    canton: number;
    activity: number;
    age: number;
    collaborative: number;
  };
  reasons: string[];
} {
  const species = scoreSpecies(myAnimal.species, otherAnimal.species);
  const canton = scoreCanton(myAnimal.canton, otherAnimal.canton);
  const activity = scoreActivityLevel(myAnimal.traits || [], otherAnimal.traits || []);
  const age = scoreAge(myAnimal.age_months, otherAnimal.age_months);
  const collaborative = Math.min(collaborativeBoost, 20);

  const total = Math.min(100, Math.max(0, species + canton + activity + age + collaborative));

  // Build human-readable reasons
  const reasons: string[] = [];

  if (species >= 30) reasons.push("Meme espece");
  else if (species >= 15) reasons.push("Especes compatibles");

  if (canton >= 25) reasons.push("Meme canton");
  else if (canton >= 15) reasons.push("Cantons voisins");

  if (activity >= 12) reasons.push("Niveau d'activite similaire");

  if (age >= 8) reasons.push("Tranche d'age proche");

  if (collaborative >= 10) reasons.push("Recommande par les affinites");

  return {
    total,
    breakdown: { species, canton, activity, age, collaborative },
    reasons: reasons.slice(0, 3),
  };
}

function getScoreLabel(score: number): { label: string; color: string } {
  if (score >= 85) return { label: "Coup de foudre", color: "#FBBF24" };
  if (score >= 70) return { label: "Tres compatible", color: "#FBBF24" };
  if (score >= 55) return { label: "Compatible", color: "#60a5fa" };
  if (score >= 35) return { label: "Possible", color: "#a78bfa" };
  return { label: "Prudence", color: "#6b7280" };
}

// ---------------------------------------------------------------------------
// GET /api/matching/smart
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const animalId = request.nextUrl.searchParams.get("animal_id");

  // 1. Get user profile for canton
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, canton")
    .eq("id", user.id)
    .single();

  // 2. Get user's animals
  const { data: myAnimals } = await supabase
    .from("animals")
    .select("id, species, breed, age_months, gender, traits, canton")
    .eq("created_by", user.id);

  if (!myAnimals || myAnimals.length === 0) {
    return NextResponse.json({ error: "Aucun animal enregistre", candidates: [] }, { status: 200 });
  }

  // Use the specified animal or default to the first one
  const primaryAnimal = animalId
    ? myAnimals.find((a: any) => a.id === animalId) || myAnimals[0]
    : myAnimals[0];

  // 3. Get already-swiped animal IDs to exclude
  const { data: existingSwipes } = await supabase
    .from("matches")
    .select("receiver_animal_id")
    .eq("sender_user_id", user.id);
  const swipedIds = new Set((existingSwipes || []).map((s: any) => s.receiver_animal_id));

  // 4. Get blocked user IDs
  const [{ data: blocksOut }, { data: blocksIn }] = await Promise.all([
    supabase.from("blocks").select("blocked_id").eq("blocker_id", user.id),
    supabase.from("blocks").select("blocker_id").eq("blocked_id", user.id),
  ]);
  const blockedIds = new Set([
    ...(blocksOut || []).map((b: any) => b.blocked_id),
    ...(blocksIn || []).map((b: any) => b.blocker_id),
  ]);

  // 5. Fetch candidate animals (exclude own, swiped, blocked)
  const { data: allAnimals, error: animalsError } = await supabase
    .from("animals")
    .select(
      "id, name, species, breed, age_months, gender, photo_url, extra_photos, canton, city, traits, created_by, weight_kg, description, energy_level"
    )
    .neq("created_by", user.id)
    .eq("status", "disponible")
    .order("created_at", { ascending: false })
    .limit(200);

  if (animalsError) {
    return NextResponse.json({ error: animalsError.message }, { status: 500 });
  }

  // Filter out swiped and blocked
  const candidates = (allAnimals || []).filter(
    (a: any) =>
      !swipedIds.has(a.id) &&
      !blockedIds.has(a.created_by || "")
  );

  // 6. Collaborative filtering: find animals liked by users who liked similar animals
  // Get animals the current user liked
  const { data: userLikes } = await supabase
    .from("matches")
    .select("receiver_animal_id")
    .eq("sender_user_id", user.id)
    .eq("status", "accepted");

  const likedAnimalIds = (userLikes || []).map((l: any) => l.receiver_animal_id);

  // Find other users who also liked those animals
  let collaborativeScores: Record<string, number> = {};

  if (likedAnimalIds.length > 0) {
    const { data: similarUsers } = await supabase
      .from("matches")
      .select("sender_user_id, receiver_animal_id")
      .in("receiver_animal_id", likedAnimalIds.slice(0, 20))
      .neq("sender_user_id", user.id)
      .limit(200);

    if (similarUsers && similarUsers.length > 0) {
      // Get what those similar users also liked
      const similarUserIds = Array.from(new Set(similarUsers.map((s: any) => s.sender_user_id))).slice(0, 20);

      const { data: theirLikes } = await supabase
        .from("matches")
        .select("receiver_animal_id")
        .in("sender_user_id", similarUserIds)
        .limit(500);

      if (theirLikes) {
        // Count how many similar users liked each candidate
        const likeCounts: Record<string, number> = {};
        for (const like of theirLikes) {
          const aid = like.receiver_animal_id;
          if (!swipedIds.has(aid)) {
            likeCounts[aid] = (likeCounts[aid] || 0) + 1;
          }
        }

        // Normalize to 0-20 scale
        const maxCount = Math.max(...Object.values(likeCounts), 1);
        for (const [aid, count] of Object.entries(likeCounts)) {
          collaborativeScores[aid] = Math.round((count / maxCount) * 20);
        }
      }
    }
  }

  // 7. Score and sort all candidates
  const scored = candidates.map((animal: any) => {
    const collab = collaborativeScores[animal.id] || 0;
    const result = computeSmartScore(
      {
        species: primaryAnimal.species,
        canton: primaryAnimal.canton || profile?.canton || null,
        traits: primaryAnimal.traits || [],
        age_months: primaryAnimal.age_months,
      },
      {
        species: animal.species,
        canton: animal.canton,
        traits: animal.traits || [],
        age_months: animal.age_months,
      },
      collab
    );

    const { label, color } = getScoreLabel(result.total);

    return {
      ...animal,
      compatibility: {
        score: result.total,
        label,
        color,
        reasons: result.reasons,
        breakdown: result.breakdown,
      },
    };
  });

  // Sort by score descending
  scored.sort((a: any, b: any) => b.compatibility.score - a.compatibility.score);

  // Return top 20
  const top = scored.slice(0, 20);

  return NextResponse.json({
    candidates: top,
    total_available: scored.length,
    algorithm: "smart_v1",
    primary_animal: {
      id: primaryAnimal.id,
      species: primaryAnimal.species,
      canton: primaryAnimal.canton,
    },
  });
}
