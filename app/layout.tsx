import { AppProvider } from "@/lib/contexts/AppContext";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css"
import { CookieBanner } from "@/lib/components/CookieBanner";
import { Toaster } from "sonner";
import Navbar from "@/lib/components/Navbar";
import Footer from "@/lib/components/Footer";
import { WelcomeModal } from "@/lib/components/WelcomeModal";
import { PostHogProvider } from "@/lib/components/PostHogProvider";
import PresenceHeartbeat from "@/lib/components/PresenceHeartbeat";
import { ServiceWorkerRegistrar } from "@/lib/components/ServiceWorkerRegistrar";

const inter = Inter({ subsets: ["latin"] });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://pawlyapp.ch";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Pawly — Ton compagnon de sortie en Suisse",
    template: "%s | Pawly",
  },
  description:
    "La premiere app qui connecte les proprietaires d'animaux en Suisse. Matching par compatibilite, 26 cantons, toutes les especes.",
  keywords: [
    "animaux",
    "suisse",
    "chien",
    "chat",
    "matching",
    "balade",
    "pawly",
    "animaux de compagnie",
    "promenade chien",
    "rencontre animaux",
  ],
  authors: [{ name: "Pawly" }],
  creator: "Pawly",
  publisher: "Pawly",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  openGraph: {
    title: "Pawly — Ton compagnon de sortie en Suisse",
    description:
      "Connecte-toi avec des proprietaires d'animaux pres de chez toi. Gratuit.",
    url: SITE_URL,
    siteName: "Pawly",
    locale: "fr_CH",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Pawly — Trouve des copains pour ton animal",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pawly — Ton compagnon de sortie en Suisse",
    description:
      "Connecte-toi avec des proprietaires d'animaux pres de chez toi.",
    images: ["/opengraph-image"],
  },
  manifest: "/manifest.json",
  alternates: {
    canonical: SITE_URL,
  },
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
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem("pawly_theme")||"auto";var e=t;if(t==="auto"){e=window.matchMedia("(prefers-color-scheme: dark)").matches?"nuit":"clair"}var v={"nuit":{"--c-deep":"#2a2248","--c-nav":"#332a55","--c-card":"#3d3462","--c-border":"#524878","--c-text":"#f0eeff","--c-text-muted":"#b5aad0","--c-accent":"#A78BFA"},"aurore":{"--c-deep":"#F5EDE0","--c-nav":"#EDE3D4","--c-card":"#FBF7F0","--c-border":"#D9C9B0","--c-text":"#3D2810","--c-text-muted":"#7A5C3A","--c-accent":"#D97706"},"ocean":{"--c-deep":"#E0EBF5","--c-nav":"#D4E2F0","--c-card":"#F0F5FB","--c-border":"#B0C8E0","--c-text":"#1E3A5F","--c-text-muted":"#4A7CAA","--c-accent":"#0284C7"},"clair":{"--c-deep":"#FAF8F4","--c-nav":"#FFFFFF","--c-card":"#FFFFFF","--c-border":"#E8E2D9","--c-text":"#1A1714","--c-text-muted":"#3d3833","--c-accent":"#EA580C"}};var c=v[e];if(c){var r=document.documentElement;for(var k in c){r.style.setProperty(k,c[k])}r.setAttribute("data-theme",e)}}catch(x){}}())` }} />
        <meta name="theme-color" content="#F0ECE4" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        {/* Preconnect hints for faster resource loading */}
        <link rel="preconnect" href="https://crpgrbfekusgannqbdyr.supabase.co" />
        <link rel="dns-prefetch" href="https://crpgrbfekusgannqbdyr.supabase.co" />
        <link rel="preconnect" href="https://unpkg.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      </head>
      <body className={inter.className + " min-h-screen"} style={{ background: "var(--c-deep, #F0ECE4)", color: "var(--c-text, #1A1714)" }}>
<AppProvider>
        <PostHogProvider>
        <PresenceHeartbeat />
        <Navbar />
        {children}
        <Footer />
        <WelcomeModal />
        </PostHogProvider>
      </AppProvider>
  <CookieBanner />
        <Toaster position="top-center" richColors />
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
