import { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://pawband.ch";

async function getUpcomingEventCount(): Promise<number> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { count } = await supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .gte("event_date", new Date().toISOString());

    return count || 0;
  } catch {
    return 0;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const eventCount = await getUpcomingEventCount();

  const title = "Evenements et balades";
  const description = eventCount > 0
    ? `${eventCount} ${eventCount === 1 ? "evenement a venir" : "evenements a venir"} sur PawBand. Rejoignez des balades et rencontres entre animaux pres de chez vous en Suisse.`
    : "Decouvrez les prochaines balades et rencontres entre animaux en Suisse sur PawBand. Organisez ou rejoignez un evenement.";

  return {
    title,
    description,
    openGraph: {
      title: `Evenements | PawBand`,
      description,
      url: `${BASE_URL}/events`,
      siteName: "PawBand",
      locale: "fr_CH",
      type: "website",
    },
    alternates: {
      canonical: `${BASE_URL}/events`,
    },
  };
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "name": "Evenements pour animaux en Suisse",
  "description": "Balades, rencontres et evenements pour animaux de compagnie dans les 26 cantons suisses",
  "url": `${BASE_URL}/events`,
  "isPartOf": { "@type": "WebSite", "name": "PawBand", "url": BASE_URL },
};

export default function EventsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  );
}
