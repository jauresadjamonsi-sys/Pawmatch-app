import { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { CANTONS_SEO, getCitySlug } from "@/lib/data/cantons";
import Link from "next/link";
import BackButton from "@/lib/components/BackButton";

const BASE_URL = "https://pawlyapp.ch";

export const metadata: Metadata = {
  title: "Animaux en Suisse - Trouvez des compagnons de balade | Pawly",
  description:
    "Trouvez des compagnons de balade pour votre animal en Suisse. Parcourez les animaux par canton et ville : Geneve, Vaud, Zurich, Berne et plus encore.",
  keywords: [
    "animaux suisse",
    "chien balade suisse",
    "chat compagnon suisse",
    "animaux geneve",
    "animaux lausanne",
    "pawly",
  ],
  openGraph: {
    title: "Animaux en Suisse - Trouvez des compagnons de balade | Pawly",
    description:
      "Parcourez les animaux inscrits sur Pawly par canton et ville en Suisse.",
    url: `${BASE_URL}/animaux`,
    siteName: "Pawly",
    locale: "fr_CH",
    type: "website",
  },
  alternates: {
    canonical: `${BASE_URL}/animaux`,
  },
};

async function getAnimalCountByCanton(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data } = await supabase
      .from("animals")
      .select("canton")
      .not("canton", "is", null);

    if (data) {
      for (const row of data) {
        const canton = (row.canton || "").toLowerCase();
        counts[canton] = (counts[canton] || 0) + 1;
      }
    }
  } catch (e) {
    console.error("Failed to fetch animal counts", e);
  }

  return counts;
}

export default async function AnimauxIndexPage() {
  const counts = await getAnimalCountByCanton();

  const totalAnimals = Object.values(counts).reduce((sum, c) => sum + c, 0);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Hero */}
      <section className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 py-16 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <BackButton fallback="/feed" />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
            Trouvez des compagnons de balade pour votre animal en Suisse
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Pawly connecte les proprietaires d&apos;animaux dans toute la Suisse.
            Parcourez {totalAnimals > 0 ? `les ${totalAnimals} animaux inscrits` : "les animaux inscrits"} par
            canton et ville pour trouver le compagnon ideal.
          </p>
        </div>
      </section>

      {/* Canton Grid */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-semibold text-gray-900 mb-8">
          Parcourir par canton
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {CANTONS_SEO.map((canton) => {
            const cantonCount = getCountForCanton(counts, canton.name, canton.code);
            return (
              <Link
                key={canton.slug}
                href={`/animaux/${canton.slug}`}
                className="group block bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg hover:border-green-300 transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xl font-semibold text-gray-900 group-hover:text-green-600 transition-colors">
                    {canton.name}
                  </h3>
                  <span className="text-sm font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full">
                    {cantonCount} {cantonCount === 1 ? "animal" : "animaux"}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {canton.cities.slice(0, 4).map((city) => (
                    <span
                      key={city}
                      className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md"
                    >
                      {city}
                    </span>
                  ))}
                  {canton.cities.length > 4 && (
                    <span className="text-xs text-gray-400">
                      +{canton.cities.length - 4} villes
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-green-500 to-emerald-600 py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Votre animal cherche un compagnon de balade ?
          </h2>
          <p className="text-white/90 mb-8 text-lg">
            Inscrivez-le gratuitement sur Pawly et trouvez des copains pres de chez vous.
          </p>
          <Link
            href="/signup"
            className="inline-block bg-white text-green-600 font-semibold px-8 py-3 rounded-full hover:bg-green-50 transition-colors text-lg"
          >
            Creer un compte gratuit
          </Link>
        </div>
      </section>

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "Animaux en Suisse - Pawly",
            description:
              "Trouvez des compagnons de balade pour votre animal en Suisse.",
            url: `${BASE_URL}/animaux`,
            isPartOf: {
              "@type": "WebSite",
              name: "Pawly",
              url: BASE_URL,
            },
            about: {
              "@type": "Thing",
              name: "Animaux de compagnie en Suisse",
            },
          }),
        }}
      />
    </div>
  );
}

function getCountForCanton(
  counts: Record<string, number>,
  name: string,
  code: string
): number {
  let total = 0;
  for (const [key, value] of Object.entries(counts)) {
    if (
      key === name.toLowerCase() ||
      key === code.toLowerCase() ||
      key.includes(name.toLowerCase())
    ) {
      total += value;
    }
  }
  return total;
}
