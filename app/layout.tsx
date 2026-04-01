import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/lib/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Compaw — Ton compagnon de sortie en Suisse",
  description: "Compaw connecte les propriétaires d'animaux de toute la Suisse.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={inter.className + " bg-[#1a1225] text-white min-h-screen"}>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
