import { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import { CANTONS_SEO, getCantonBySlug, getCitySlug } from "@/lib/data/cantons";
import Link from "next/link";

const BASE_URL = "https://pawlyapp.ch";

type Props = {
  params: Promise<{ canton: string }>;
};

export async function generateStaticParams() {
  return CANTONS_SEO.map((c) => ({ canton: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { canton: cantonSlug } = await params;
  const canton = getCantonBySlug(cantonSlug);
  if (!canton) return {};

  const title = `Animaux a ${canton.name} - Compagnons de balade | Pawly`;
  const description = `Trouvez des compagnons de balade pour votre animal dans le canton de ${canton.name}. Chiens, chats et autres animaux a ${canton.cities.slice(0, 3).join(", ")} et plus.`;

  return {
    title,
    description,
    keywords: [
      `animaux ${canton.name.toLowerCase()}`,
      `chien ${canton.name.toLowerCase()}`,
      `chat ${canton.name.toLowerCase()}`,
      `balade animaux ${canton.name.toLowerCase()}`,
      ...canton.cities.map((c) => `animaux ${c.toLowerCase()}`),
    ],
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/animaux/${canton.slug}`,
      siteName: "Pawly",
      locale: "fr_CH",
      type: "website",
    },
    alternates: {
      canonical: `${BASE_URL}/animaux/${canton.slug}`,
    },
  };
}

const EMOJI_MAP: Record<string, string> = {
  chien: "🐕",
  chat: "🐱",
  lapin: "🐰",
  oiseau: "🐦",
  rongeur: "🐹",
  autre: "🐾",
};

type AnimalCard = {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  photo_url: string | null;
  city: string | null;
};

async function getAnimalsForCanton(cantonName: string, cantonCode: string): Promise<AnimalCard[]> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data } = await supabase
      .from("animals")
      .select("id, name, species, breed, photo_url, city, canton")
      .or(`canton.ilike.%${cantonName}%,canton.ilike.%${cantonCode}%`)
      .order("created_at", { ascending: false })
      .limit(60);

    return (data as AnimalCard[]) || [];
  } catch {
    return [];
  }
}

export default async function CantonPage({ params }: Props) {
  const { canton: cantonSlug } = await params;
  const canton = getCantonBySlug(cantonSlug);

  if (!canton) {
    notFound();
  }

  const animals = await getAnimalsForCanton(canton.name, canton.code);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Animaux a ${canton.name} - Pawly`,
    description: `Trouvez des compagnons de balade pour votre animal dans le canton de ${canton.name}.`,
    url: `${BASE_URL}/animaux/${canton.slug}`,
    isPartOf: {
      "@type": "WebSite",
      name: "Pawly",
      url: BASE_URL,
    },
    about: {
      "@type": "Organization",
      name: "Pawly",
      description: "Plateforme de rencontre pour animaux de compagnie en Suisse",
      areaServed: {
        "@type": "AdministrativeArea",
        name: `Canton de ${canton.name}, Suisse`,
      },
    },
    numberOfItems: animals.length,
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Breadcrumb */}
      <nav className="max-w-6xl mx-auto px-4 pt-6 text-sm text-gray-500" aria-label="Fil d'Ariane">
        <ol className="flex items-center gap-2">
          <li>
            <Link href="/" className="hover:text-orange-600 transition-colors">
              Accueil
            </Link>
          </li>
          <li>/</li>
          <li>
            <Link href="/animaux" className="hover:text-orange-600 transition-colors">
              Animaux
            </Link>
          </li>
          <li>/</li>
          <li className="text-gray-900 font-medium">{canton.name}</li>
        </ol>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 py-12 px-4 mt-2">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Animaux a {canton.name}
          </h1>
          <p className="mt-3 text-lg text-gray-600">
            {animals.length > 0
              ? `${animals.length} ${animals.length === 1 ? "animal inscrit" : "animaux inscrits"} dans le canton de ${canton.name}.`
              : `Aucun animal inscrit pour le moment dans le canton de ${canton.name}. Soyez le premier !`}
          </p>
        </div>
      </section>

      {/* Cities navigation */}
      <section className="max-w-6xl mx-auto px-4 py-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Villes dans le canton de {canton.name}
        </h2>
        <div className="flex flex-wrap gap-3">
          {canton.cities.map((city) => (
            <Link
              key={city}
              href={`/animaux/${canton.slug}/${getCitySlug(city)}`}
              className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-full text-sm font-medium hover:border-orange-300 hover:text-orange-600 hover:bg-orange-50 transition-all"
            >
              {city}
            </Link>
          ))}
        </div>
      </section>

      {/* Animals Grid */}
      {animals.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 pb-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Tous les animaux
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {animals.map((animal) => (
              <Link
                key={animal.id}
                href={`/animals/${animal.id}`}
                className="group bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-lg hover:border-orange-200 transition-all duration-200"
              >
                <div className="relative w-full h-48 bg-gray-100">
                  {animal.photo_url ? (
                    <img
                      src={animal.photo_url}
                      alt={`${animal.name} - ${animal.species} a ${canton.name}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">
                      {EMOJI_MAP[animal.species?.toLowerCase()] || "🐾"}
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">
                    {animal.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {EMOJI_MAP[animal.species?.toLowerCase()] || "🐾"}{" "}
                    {animal.species}
                    {animal.breed && ` - ${animal.breed}`}
                  </p>
                  {animal.city && (
                    <p className="text-xs text-gray-400 mt-1">
                      📍 {animal.city}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {animals.length === 0 && (
        <section className="max-w-3xl mx-auto px-4 py-16 text-center">
          <div className="text-6xl mb-4">🐾</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Pas encore d&apos;animaux a {canton.name}
          </h2>
          <p className="text-gray-600 mb-8">
            Soyez le premier a inscrire votre animal dans le canton de {canton.name} et trouvez des copains de balade.
          </p>
          <Link
            href="/signup"
            className="inline-block bg-orange-500 text-white font-semibold px-8 py-3 rounded-full hover:bg-orange-600 transition-colors"
          >
            Inscrire mon animal
          </Link>
        </section>
      )}

      {/* CTA */}
      <section className="bg-gradient-to-r from-orange-500 to-rose-500 py-14 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Votre animal cherche un copain a {canton.name} ?
          </h2>
          <p className="text-white/90 mb-8">
            Inscrivez-le gratuitement et trouvez des compagnons de balade pres de chez vous.
          </p>
          <Link
            href="/signup"
            className="inline-block bg-white text-orange-600 font-semibold px-8 py-3 rounded-full hover:bg-orange-50 transition-colors text-lg"
          >
            Creer un compte gratuit
          </Link>
        </div>
      </section>

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </div>
  );
}
