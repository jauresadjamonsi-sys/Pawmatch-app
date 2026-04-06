import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Notifications",
  description: "Tes notifications Pawly",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
