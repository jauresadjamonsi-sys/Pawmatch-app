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
    // OG image inherited from root opengraph-image.tsx (1200x630)
  },
  twitter: {
    card: "summary_large_image",
    title: "Rejoins Pawly — L'app des animaux en Suisse 🐾",
    description:
      "Trouve des copains de balade pour ton animal. Gratuit et concu en Suisse.",
    // Twitter image inherited from root twitter-image.tsx
  },
};

export default function PromoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
