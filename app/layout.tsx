import { AppProvider } from "@/lib/contexts/AppContext";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css"
import { CookieBanner } from "@/lib/components/CookieBanner";
import Navbar from "@/lib/components/Navbar";
import Footer from "@/lib/components/Footer";
import { WelcomeModal } from "@/lib/components/WelcomeModal";
import { PostHogProvider } from "@/lib/components/PostHogProvider";
import PresenceHeartbeat from "@/lib/components/PresenceHeartbeat";

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
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem("pawly_theme")||"auto";var e=t;if(t==="auto"){e=window.matchMedia("(prefers-color-scheme: dark)").matches?"nuit":"clair"}var v={"nuit":{"--c-deep":"#2a2248","--c-nav":"#332a55","--c-card":"#3d3462","--c-border":"#524878","--c-text":"#f0eeff","--c-text-muted":"#b5aad0","--c-accent":"#A78BFA"},"aurore":{"--c-deep":"#FDF6EE","--c-nav":"#FFFFFF","--c-card":"#FFFFFF","--c-border":"#E8D5BE","--c-text":"#3D2810","--c-text-muted":"#7A5C3A","--c-accent":"#D97706"},"ocean":{"--c-deep":"#EFF6FF","--c-nav":"#FFFFFF","--c-card":"#FFFFFF","--c-border":"#BFDBFE","--c-text":"#1E3A5F","--c-text-muted":"#4A7CAA","--c-accent":"#0284C7"},"clair":{"--c-deep":"#FAF8F4","--c-nav":"#FFFFFF","--c-card":"#FFFFFF","--c-border":"#E8E2D9","--c-text":"#1A1714","--c-text-muted":"#3d3833","--c-accent":"#EA580C"}};var c=v[e];if(c){var r=document.documentElement;for(var k in c){r.style.setProperty(k,c[k])}r.setAttribute("data-theme",e)}}catch(x){}}())` }} />
        <meta name="theme-color" content="#FAF8F4" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      </head>
      <body className={inter.className + " min-h-screen"} style={{ background: "var(--c-deep, #FAF8F4)", color: "var(--c-text, #1A1714)" }}>
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
      </body>
    </html>
  );
}
