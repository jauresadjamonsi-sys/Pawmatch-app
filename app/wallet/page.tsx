import type { Metadata } from "next";
import { Suspense } from "react";
import PawCoinsWallet from "@/lib/components/PawCoinsWallet";
import BackButton from "@/lib/components/BackButton";

export const metadata: Metadata = {
  title: "PawCoins Wallet | PawBand",
  description: "Gere tes PawCoins, reclame ton bonus quotidien et decouvre la boutique.",
};

export default function WalletPage() {
  return (
    <main id="main-content" className="max-w-lg mx-auto px-4 py-6 pb-32">
      <div className="flex items-center gap-3 mb-4">
        <BackButton fallback="/feed" />
        <h1 className="text-lg font-bold" style={{ color: "var(--c-text)" }}>PawCoins Wallet</h1>
      </div>
      <Suspense fallback={
        <div className="space-y-4 stagger-children">
          <div className="glass rounded-2xl p-8 animate-breathe" style={{ height: 160 }} />
          <div className="glass rounded-2xl p-5 animate-breathe" style={{ height: 120, animationDelay: "0.15s" }} />
          <div className="glass rounded-2xl p-5 animate-breathe" style={{ height: 200, animationDelay: "0.3s" }} />
        </div>
      }>
        <PawCoinsWallet />
      </Suspense>
    </main>
  );
}
