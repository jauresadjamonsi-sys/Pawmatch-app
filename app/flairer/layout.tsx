import type { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://pawband.ch";

export const metadata: Metadata = {
  title: "Flairer — Decouvre des animaux compatibles",
  description:
    "Parcours les profils d'animaux en Suisse et trouve des compagnons compatibles pour ton animal. Matching IA, filtres par espece et canton.",
  openGraph: {
    title: "Flairer | PawBand",
    description:
      "Parcours les profils d'animaux en Suisse et trouve des compagnons compatibles pour ton animal.",
    url: `${BASE_URL}/flairer`,
    siteName: "PawBand",
    locale: "fr_CH",
    type: "website",
    // OG image inherited from root opengraph-image.tsx (1200x630)
  },
  twitter: {
    card: "summary_large_image",
    title: "Flairer | PawBand",
    description:
      "Parcours les profils d'animaux en Suisse et trouve des compagnons compatibles.",
    // Twitter image inherited from root twitter-image.tsx
  },
  alternates: {
    canonical: `${BASE_URL}/flairer`,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "name": "Flairer — Decouvre des animaux compatibles",
  "description":
    "Parcours les profils d'animaux en Suisse et trouve des compagnons compatibles pour ton animal.",
  "url": `${BASE_URL}/flairer`,
  "isPartOf": { "@type": "WebSite", "name": "PawBand", "url": BASE_URL },
};

export default function FlairerLayout({
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
