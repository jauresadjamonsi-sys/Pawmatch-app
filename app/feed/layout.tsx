import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Feed",
  description: "Le fil d'actualité de tes animaux sur Pawband",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
