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
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem("pawly_theme")||"auto";var e=t;if(t==="auto"){e=window.matchMedia("(prefers-color-scheme: dark)").matches?"nuit":"clair"}var v={"nuit":{"--c-deep":"#0f0c1a","--c-nav":"#130f22","--c-card":"#1e1830","--c-border":"#2d2545","--c-text":"#f0eeff","--c-text-muted":"#9b93b8","--c-accent":"#A78BFA"},"aurore":{"--c-deep":"#1a0f05","--c-nav":"#150c04","--c-card":"#261508","--c-border":"#3d2510","--c-text":"#fff0e0","--c-text-muted":"#b89070","--c-accent":"#F59E0B"},"ocean":{"--c-deep":"#080f1a","--c-nav":"#060d18","--c-card":"#0d1a2e","--c-border":"#152840","--c-text":"#e0f0ff","--c-text-muted":"#7099bb","--c-accent":"#38BDF8"},"clair":{"--c-deep":"#FAF8F4","--c-nav":"#FFFFFF","--c-card":"#FFFFFF","--c-border":"#E8E2D9","--c-text":"#1A1714","--c-text-muted":"#3d3833","--c-accent":"#EA580C"}};var c=v[e];if(c){var r=document.documentElement;for(var k in c){r.style.setProperty(k,c[k])}r.setAttribute("data-theme",e)}}catch(x){}}())` }} />
        <meta name="theme-color" content="#1a1225" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
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
