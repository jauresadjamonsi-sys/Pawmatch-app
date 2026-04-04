import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { computeCompatibility } from "@/lib/services/compatibility";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ match: null });

    // Récupérer mes animaux
    const { data: myAnimals } = await supabase
      .from("animals").select("*").eq("created_by", user.id);

    if (!myAnimals || myAnimals.length === 0) {
      return NextResponse.json({ match: null });
    }

    const myAnimal = myAnimals[0];

    // Récupérer tous les autres animaux
    const { data: others } = await supabase
      .from("animals").select("*").neq("created_by", user.id);

    if (!others || others.length === 0) {
      return NextResponse.json({ match: null });
    }

    // Scorer et trier par compatibilité
    const scored = others.map(other => ({
      ...other,
      compatibility: computeCompatibility(myAnimal, other),
    })).sort((a, b) => b.compatibility.score - a.compatibility.score);

    // Sélectionner en fonction du jour (rotation quotidienne)
    const today = new Date();
    const dayOfYear = Math.floor(
      (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
    );
    const topN = Math.min(scored.length, 5); // Top 5
    const index = dayOfYear % topN;
    const dailyMatch = scored[index];

    return NextResponse.json({
      match: {
        animal: {
          id: dailyMatch.id,
          name: dailyMatch.name,
          species: dailyMatch.species,
          breed: dailyMatch.breed,
          photo_url: dailyMatch.photo_url,
          canton: dailyMatch.canton,
          city: dailyMatch.city,
          traits: dailyMatch.traits,
        },
        compatibility: dailyMatch.compatibility,
        myAnimalName: myAnimal.name,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ match: null, error: err.message });
  }
}
