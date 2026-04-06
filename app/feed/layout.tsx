import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Feed",
  description: "Le fil d'actualité de tes animaux sur Pawly",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
