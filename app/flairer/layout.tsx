import type { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://pawlyapp.ch";

export const metadata: Metadata = {
  title: "Flairer — Decouvre des animaux compatibles",
  description:
    "Parcours les profils d'animaux en Suisse et trouve des compagnons compatibles pour ton animal. Matching IA, filtres par espece et canton.",
  openGraph: {
    title: "Flairer | Pawly",
    description:
      "Parcours les profils d'animaux en Suisse et trouve des compagnons compatibles pour ton animal.",
    url: `${BASE_URL}/flairer`,
    siteName: "Pawly",
    locale: "fr_CH",
    type: "website",
    images: [
      {
        url: "/promo-hero.jpg",
        width: 2026,
        height: 893,
        alt: "Pawly — Flairer des animaux compatibles",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Flairer | Pawly",
    description:
      "Parcours les profils d'animaux en Suisse et trouve des compagnons compatibles.",
    images: ["/promo-hero.jpg"],
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
  "isPartOf": { "@type": "WebSite", "name": "Pawly", "url": BASE_URL },
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
