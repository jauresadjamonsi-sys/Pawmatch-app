import { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://pawband.ch";

type Props = {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
};

async function getAnimal(id: string) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data } = await supabase
      .from("animals")
      .select("id, name, species, breed, photo_url, city, canton, description")
      .eq("id", id)
      .single();

    return data;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const animal = await getAnimal(id);

  if (!animal) {
    return {
      title: "Animal introuvable",
      description: "Ce profil d'animal n'existe pas ou a ete supprime.",
    };
  }

  const speciesLabel = animal.species
    ? animal.species.charAt(0).toUpperCase() + animal.species.slice(1)
    : "Animal";
  const locationParts = [animal.city, animal.canton].filter(Boolean);
  const locationStr = locationParts.length > 0 ? ` a ${locationParts.join(", ")}` : "";
  const breedStr = animal.breed ? ` (${animal.breed})` : "";

  const title = `${animal.name} - ${speciesLabel}${breedStr}${locationStr}`;
  const desc = animal.description || "";
  const description = desc
    ? `${animal.name}, ${speciesLabel.toLowerCase()}${breedStr}${locationStr}. ${desc.slice(0, 120)}${desc.length > 120 ? "..." : ""}`
    : `Decouvrez le profil de ${animal.name}, ${speciesLabel.toLowerCase()}${breedStr}${locationStr} sur PawBand. Trouvez des compagnons de balade compatibles.`;

  return {
    title,
    description,
    openGraph: {
      title: `${animal.name} | PawBand`,
      description,
      url: `${BASE_URL}/animals/${animal.id}`,
      siteName: "PawBand",
      locale: "fr_CH",
      type: "profile",
      ...(animal.photo_url
        ? {
            images: [
              {
                url: animal.photo_url,
                width: 600,
                height: 600,
                alt: `${animal.name} - ${speciesLabel} sur PawBand`,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: animal.photo_url ? "summary_large_image" : "summary",
      title: `${animal.name} | PawBand`,
      description,
      ...(animal.photo_url ? { images: [animal.photo_url] } : {}),
    },
    alternates: {
      canonical: `${BASE_URL}/animals/${animal.id}`,
    },
  };
}

export default async function AnimalLayout({ children }: Props) {
  return <>{children}</>;
}
