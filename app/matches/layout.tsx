import type { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://pawlyapp.ch";

export const metadata: Metadata = {
  title: "Mes matchs",
  description:
    "Retrouve tous tes matchs sur PawlyApp. Accepte ou refuse les demandes de rencontre et commence a discuter avec d'autres proprietaires d'animaux en Suisse.",
  openGraph: {
    title: "Mes matchs | PawlyApp",
    description:
      "Retrouve tous tes matchs et demandes de rencontre entre animaux sur PawlyApp.",
    url: `${BASE_URL}/matches`,
    siteName: "PawlyApp",
    locale: "fr_CH",
    type: "website",
    // OG image inherited from root opengraph-image.tsx (1200x630)
  },
  twitter: {
    card: "summary_large_image",
    title: "Mes matchs | PawlyApp",
    description:
      "Retrouve tous tes matchs et demandes de rencontre entre animaux sur PawlyApp.",
    // Twitter image inherited from root twitter-image.tsx
  },
  alternates: {
    canonical: `${BASE_URL}/matches`,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "name": "Mes matchs sur PawlyApp",
  "description":
    "Retrouve tous tes matchs et demandes de rencontre entre animaux sur PawlyApp.",
  "url": `${BASE_URL}/matches`,
  "isPartOf": { "@type": "WebSite", "name": "PawlyApp", "url": BASE_URL },
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
