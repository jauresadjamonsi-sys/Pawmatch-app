import type { Metadata } from "next";
import PawCoinsWallet from "@/lib/components/PawCoinsWallet";

export const metadata: Metadata = {
  title: "PawCoins Wallet | Pawly",
  description: "Gere tes PawCoins, reclame ton bonus quotidien et decouvre la boutique.",
};

export default function WalletPage() {
  return (
    <main id="main-content" className="max-w-lg mx-auto px-4 py-6 pb-32">
      <PawCoinsWallet />
    </main>
  );
}
