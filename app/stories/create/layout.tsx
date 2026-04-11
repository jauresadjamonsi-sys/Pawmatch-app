import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Créer une Story",
  description: "Partage un moment de ton animal avec la communauté PawlyApp",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
