import { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://pawband.ch";

type Props = {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
};

async function getMatch(id: string) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data } = await supabase
      .from("matches")
      .select(
        "id, status, sender_animal:sender_animal_id(name, species, photo_url), receiver_animal:receiver_animal_id(name, species, photo_url)"
      )
      .eq("id", id)
      .single();

    return data;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const match = await getMatch(id);

  if (!match) {
    return {
      title: "Conversation introuvable",
      description: "Ce match n'existe pas ou n'est plus disponible.",
    };
  }

  type AnimalInfo = { name: string; species: string; photo_url: string | null };
  const senderRaw = match.sender_animal;
  const receiverRaw = match.receiver_animal;
  const senderAnimal: AnimalInfo | null = Array.isArray(senderRaw) ? senderRaw[0] ?? null : senderRaw ?? null;
  const receiverAnimal: AnimalInfo | null = Array.isArray(receiverRaw) ? receiverRaw[0] ?? null : receiverRaw ?? null;

  const senderName = senderAnimal?.name || "Animal";
  const receiverName = receiverAnimal?.name || "Animal";

  const title = `${senderName} & ${receiverName} - Conversation`;
  const description = `Conversation entre ${senderName} et ${receiverName} sur PawBand. Organisez des balades et rencontres entre vos animaux.`;

  const ogImage = senderAnimal?.photo_url || receiverAnimal?.photo_url;

  return {
    title,
    description,
    robots: {
      index: false,
      follow: false,
    },
    openGraph: {
      title: `${senderName} & ${receiverName} | PawBand`,
      description,
      url: `${BASE_URL}/matches/${id}`,
      siteName: "PawBand",
      locale: "fr_CH",
      type: "website",
      ...(ogImage
        ? {
            images: [
              {
                url: ogImage,
                width: 600,
                height: 600,
                alt: `${senderName} & ${receiverName}`,
              },
            ],
          }
        : {}),
    },
  };
}

export default async function MatchLayout({ children }: Props) {
  return <>{children}</>;
}
