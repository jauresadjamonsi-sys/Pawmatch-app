import { AppProvider } from "@/lib/contexts/AppContext";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/lib/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Compaw — Ton compagnon de sortie en Suisse",
  description: "La premiere app qui connecte les proprietaires d'animaux en Suisse. Matching par compatibilite, 26 cantons, toutes les especes.",
  keywords: ["animaux", "suisse", "chien", "chat", "matching", "balade", "compaw"],
  openGraph: {
    title: "Compaw — Ton compagnon de sortie en Suisse",
    description: "Connecte-toi avec des proprietaires d'animaux pres de chez toi. Gratuit.",
    url: "https://compaw.ch",
    siteName: "Compaw",
    locale: "fr_CH",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Compaw — Ton compagnon de sortie en Suisse",
    description: "Connecte-toi avec des proprietaires d'animaux pres de chez toi.",
  },
  manifest: "/manifest.json",
  themeColor: "#1a1225",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1a1225",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className={inter.className + " bg-[#0d0a14] text-white min-h-screen"}>
<AppProvider>
        <Navbar />
        {children}
      </AppProvider>
</body>
    </html>
  );
}
