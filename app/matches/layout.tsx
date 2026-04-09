import type { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://pawlyapp.ch";

export const metadata: Metadata = {
  title: "Mes matchs",
  description:
    "Retrouve tous tes matchs sur Pawly. Accepte ou refuse les demandes de rencontre et commence a discuter avec d'autres proprietaires d'animaux en Suisse.",
  openGraph: {
    title: "Mes matchs | Pawly",
    description:
      "Retrouve tous tes matchs et demandes de rencontre entre animaux sur Pawly.",
    url: `${BASE_URL}/matches`,
    siteName: "Pawly",
    locale: "fr_CH",
    type: "website",
    images: [
      {
        url: "/promo-hero.jpg",
        width: 2026,
        height: 893,
        alt: "Pawly — Mes matchs entre animaux",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mes matchs | Pawly",
    description:
      "Retrouve tous tes matchs et demandes de rencontre entre animaux sur Pawly.",
    images: ["/promo-hero.jpg"],
  },
  alternates: {
    canonical: `${BASE_URL}/matches`,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "name": "Mes matchs sur Pawly",
  "description":
    "Retrouve tous tes matchs et demandes de rencontre entre animaux sur Pawly.",
  "url": `${BASE_URL}/matches`,
  "isPartOf": { "@type": "WebSite", "name": "Pawly", "url": BASE_URL },
};

export default function MatchesLayout({
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
