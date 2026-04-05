import { AppProvider } from "@/lib/contexts/AppContext";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css"
import { CookieBanner } from "@/lib/components/CookieBanner";
import Navbar from "@/lib/components/Navbar";
import Footer from "@/lib/components/Footer";
import { WelcomeModal } from "@/lib/components/WelcomeModal";
import { PostHogProvider } from "@/lib/components/PostHogProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Pawly — Ton compagnon de sortie en Suisse",
  description: "La premiere app qui connecte les proprietaires d'animaux en Suisse. Matching par compatibilite, 26 cantons, toutes les especes.",
  keywords: ["animaux", "suisse", "chien", "chat", "matching", "balade", "pawly"],
  openGraph: {
    title: "Pawly — Ton compagnon de sortie en Suisse",
    description: "Connecte-toi avec des proprietaires d'animaux pres de chez toi. Gratuit.",
    url: "https://pawly.ch",
    siteName: "Pawly",
    locale: "fr_CH",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pawly — Ton compagnon de sortie en Suisse",
    description: "Connecte-toi avec des proprietaires d'animaux pres de chez toi.",
  },
  manifest: "/manifest.json",
  };

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      </head>
      <body className={inter.className + " bg-[#0d0a14] text-white min-h-screen"}>
<AppProvider>
        <PostHogProvider>
        <Navbar />
        {children}
        <Footer />
        <WelcomeModal />
        </PostHogProvider>
      </AppProvider>
  <CookieBanner />
      </body>
    </html>
  );
}
