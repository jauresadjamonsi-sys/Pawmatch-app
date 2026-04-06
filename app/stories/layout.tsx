import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stories",
  description: "Découvre les stories des animaux de la communauté Pawly",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
