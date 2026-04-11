import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Promos PawlyApp — Videos partageables",
  description:
    "Cree et partage des promos PawlyApp sur WhatsApp, Instagram et TikTok. Fais decouvrir la communaute d'animaux suisse a tes amis !",
  robots: { index: false, follow: false },
};

export default function PromoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
