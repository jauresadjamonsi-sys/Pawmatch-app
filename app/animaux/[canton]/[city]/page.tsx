import { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import { CANTONS_SEO, getCantonBySlug, getCitySlug, findCityInCanton } from "@/lib/data/cantons";
import Link from "next/link";
import Image from "next/image";

const BASE_URL = "https://pawlyapp.ch";

type Props = {
  params: Promise<{ canton: string; city: string }>;
};

export async function generateStaticParams() {
  const results: { canton: string; city: string }[] = [];
  for (const c of CANTONS_SEO) {
    for (const city of c.cities) {
      results.push({ canton: c.slug, city: getCitySlug(city) });
    }
  }
  return results;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { canton: cantonSlug, city: citySlug } = await params;
  const canton = getCantonBySlug(cantonSlug);
  if (!canton) return {};

  const cityName = findCityInCanton(canton, citySlug);
  if (!cityName) return {};

  const title = `Animaux a ${cityName}, ${canton.name} - Compagnons de balade | Pawly`;
  const description = `Trouvez des compagnons de balade pour votre animal a ${cityName} dans le canton de ${canton.name}. Chiens, chats et autres animaux pres de chez vous.`;

  return {
    title,
    description,
    keywords: [
      `animaux ${cityName.toLowerCase()}`,
      `chien ${cityName.toLowerCase()}`,
      `chat ${cityName.toLowerCase()}`,
      `balade animaux ${cityName.toLowerCase()}`,
      `animaux ${canton.name.toLowerCase()}`,
    ],
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/animaux/${canton.slug}/${citySlug}`,
      siteName: "Pawly",
      locale: "fr_CH",
      type: "website",
    },
    alternates: {
      canonical: `${BASE_URL}/animaux/${canton.slug}/${citySlug}`,
    },
  };
}

import { EMOJI_MAP } from "@/lib/constants";

type AnimalCard = {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  photo_url: string | null;
  city: string | null;
};

async function getAnimalsForCity(cityName: string): Promise<AnimalCard[]> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data } = await supabase
      .from("animals")
      .select("id, name, species, breed, photo_url, city")
      .ilike("city", `%${cityName}%`)
      .order("created_at", { ascending: false })
      .limit(60);

    return (data as AnimalCard[]) || [];
  } catch {
    return [];
  }
}

export default async function CityPage({ params }: Props) {
  const { canton: cantonSlug, city: citySlug } = await params;
  const canton = getCantonBySlug(cantonSlug);

  if (!canton) {
    notFound();
  }

  const cityName = findCityInCanton(canton, citySlug);
  if (!cityName) {
    notFound();
  }

  const animals = await getAnimalsForCity(cityName);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Animaux a ${cityName}, ${canton.name} - Pawly`,
    description: `Trouvez des compagnons de balade pour votre animal a ${cityName}.`,
    url: `${BASE_URL}/animaux/${canton.slug}/${citySlug}`,
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
        "@type": "City",
        name: cityName,
        containedInPlace: {
          "@type": "AdministrativeArea",
          name: `Canton de ${canton.name}, Suisse`,
        },
      },
    },
    numberOfItems: animals.length,
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Breadcrumb */}
      <nav className="max-w-6xl mx-auto px-4 pt-6 text-sm text-gray-500" aria-label="Fil d'Ariane">
        <ol className="flex items-center gap-2 flex-wrap">
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
          <li>
            <Link href={`/animaux/${canton.slug}`} className="hover:text-orange-600 transition-colors">
              {canton.name}
            </Link>
          </li>
          <li>/</li>
          <li className="text-gray-900 font-medium">{cityName}</li>
        </ol>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 py-12 px-4 mt-2">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Animaux a {cityName}, {canton.name}
          </h1>
          <p className="mt-3 text-lg text-gray-600">
            {animals.length > 0
              ? `${animals.length} ${animals.length === 1 ? "animal inscrit" : "animaux inscrits"} a ${cityName}.`
              : `Aucun animal inscrit pour le moment a ${cityName}. Soyez le premier !`}
          </p>
        </div>
      </section>

      {/* Nearby cities */}
      <section className="max-w-6xl mx-auto px-4 py-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Autres villes dans le canton de {canton.name}
        </h2>
        <div className="flex flex-wrap gap-3">
          {canton.cities
            .filter((c) => getCitySlug(c) !== citySlug)
            .map((city) => (
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
            Animaux a {cityName}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {animals.map((animal) => (
              <Link
                key={animal.id}
                href={`/animals/${animal.id}`}
                className="group bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-lg hover:border-orange-200 transition-all duration-200"
              >
                <div className="relative w-full aspect-[4/5] bg-gray-100">
                  {animal.photo_url ? (
                    <Image
                      src={animal.photo_url}
                      alt={`${animal.name} - ${animal.species} a ${cityName}`}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
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
            Pas encore d&apos;animaux a {cityName}
          </h2>
          <p className="text-gray-600 mb-8">
            Soyez le premier a inscrire votre animal a {cityName} et trouvez des copains de balade.
          </p>
          <Link
            href="/signup"
            className="inline-block bg-orange-500 text-white font-semibold px-8 py-3 rounded-full hover:bg-orange-600 transition-colors"
          >
            Inscrire mon animal
          </Link>
        </section>
      )}

      {/* SEO content block */}
      <section className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Trouver un compagnon de balade a {cityName}
        </h2>
        <div className="prose prose-gray max-w-none text-gray-600">
          <p>
            Pawly est la premiere application en Suisse qui permet aux proprietaires d&apos;animaux
            de se connecter pour organiser des balades et des rencontres entre compagnons.
            A {cityName}, dans le canton de {canton.name}, de nombreux proprietaires cherchent
            des copains pour leurs animaux.
          </p>
          <p>
            Que vous ayez un chien, un chat, un lapin ou tout autre animal de compagnie,
            Pawly vous aide a trouver des compagnons compatibles grace a notre algorithme
            de matching par personnalite. Inscrivez votre animal gratuitement et commencez
            a organiser des sorties.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-orange-500 to-rose-500 py-14 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Votre animal cherche un copain a {cityName} ?
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
