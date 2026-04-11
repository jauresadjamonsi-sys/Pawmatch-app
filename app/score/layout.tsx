import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PawScore",
  description: "Ton score d'activité et tes badges sur PawBand",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
