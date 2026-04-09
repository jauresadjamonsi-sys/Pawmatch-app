import type { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://pawlyapp.ch";

export const metadata: Metadata = {
  title: "Rejoins Pawly — L'app des animaux en Suisse",
  description:
    "Connecte ton compagnon avec d'autres animaux pres de chez toi. Matching IA, balades, PawReels, evenements — 100% gratuit pour commencer.",
  openGraph: {
    title: "Rejoins Pawly — L'app des animaux en Suisse 🐾",
    description:
      "Trouve des copains de balade pour ton animal. Matching IA, stories, reels et bien plus. Gratuit et concu en Suisse.",
    url: `${BASE_URL}/share/promo`,
    siteName: "Pawly",
    locale: "fr_CH",
    type: "website",
    images: [
      {
        url: `${BASE_URL}/promo-hero.jpg`,
        width: 1200,
        height: 630,
        alt: "Pawly — Connecte ton animal avec d'autres en Suisse",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rejoins Pawly — L'app des animaux en Suisse 🐾",
    description:
      "Trouve des copains de balade pour ton animal. Gratuit et concu en Suisse.",
    images: [`${BASE_URL}/promo-hero.jpg`],
  },
};

export default function PromoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
