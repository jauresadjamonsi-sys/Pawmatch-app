"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getWallet, getDailyLoginBonus } from "@/lib/services/pawcoins";
import type { PawCoinTransaction, PawCoinTxType } from "@/lib/types";

const TX_ICONS: Record<PawCoinTxType, string> = {
  welcome_bonus: "🎉", daily_login: "☀️", streak_bonus: "🔥",
  reel_posted: "🎬", reel_liked: "❤️", reel_viral: "🚀",
  match_made: "🐾", super_flair_sent: "⚡", super_flair_received: "💫",
  boost_purchased: "🔝", boost_used: "📣",
  referral_bonus: "🤝", challenge_completed: "🎯",
  purchase: "💳", admin_grant: "👑",
};

const EARN_OPTIONS = [
  { icon: "☀️", label: "Connexion quotidienne", coins: "+5", desc: "Reviens chaque jour" },
  { icon: "🔥", label: "Bonus streak", coins: "+5 a +50", desc: "3, 7, 14 ou 30 jours de suite" },
  { icon: "🎬", label: "Poste un Reel", coins: "+10", desc: "Partage une video de ton animal" },
  { icon: "🐾", label: "Match mutuel", coins: "+5", desc: "Quand un Coup de Truffe est fait" },
  { icon: "🤝", label: "Parrainage", coins: "+20", desc: "Invite un ami qui s'inscrit" },
  { icon: "🎯", label: "Defi du jour", coins: "+10", desc: "Complete le challenge quotidien" },
];

const SHOP_ITEMS = [
  { icon: "⚡", label: "Super Flair", cost: 15, desc: "Envoie un coup de coeur special" },
  { icon: "🔝", label: "Boost 30min", cost: 20, desc: "Ton profil en priorite pendant 30 min" },
  { icon: "🎨", label: "Stickers Premium", cost: 10, desc: "Debloque des stickers exclusifs" },
];

export default function PawCoinsWallet() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<PawCoinTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [buyingItem, setBuyingItem] = useState<string | null>(null);
  const [shopMsg, setShopMsg] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);
      const wallet = await getWallet(supabase, user.id);
      setBalance(wallet.balance);
      setTransactions(wallet.transactions);
      setLoading(false);
    }
    load();
  }, []);

  async function claimDaily() {
    if (!userId || claiming) return;
    setClaiming(true);
    setClaimResult(null);
    const supabase = createClient();
    const result = await getDailyLoginBonus(supabase, userId);
    if (result.claimed) {
      setBalance(result.balance ?? balance + 5);
      setClaimResult("+ 5 PawCoins !");
      const wallet = await getWallet(supabase, userId);
      setTransactions(wallet.transactions);
    } else {
      setClaimResult(result.error || "Deja reclame");
    }
    setClaiming(false);
  }

  async function handleShopBuy(label: string, cost: number) {
    if (!userId || buyingItem) return;
    if (balance < cost) return;
    setBuyingItem(label);
    setShopMsg(null);
    const supabase = createClient();

    try {
      if (label === "Boost 30min") {
        // Get user's first animal
        const { data: animals } = await supabase.from("animals").select("id").eq("created_by", userId).limit(1);
        if (!animals || animals.length === 0) {
          setShopMsg("Ajoute un animal d'abord !");
          setBuyingItem(null);
          return;
        }
        // Deduct coins
        await supabase.from("profiles").update({ pawcoins: balance - cost }).eq("id", userId);
        // Insert boost
        await supabase.from("profile_boosts").insert({
          user_id: userId,
          animal_id: animals[0].id,
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        });
        // Log transaction
        await supabase.from("pawcoin_transactions").insert({
          user_id: userId,
          type: "boost_purchased",
          amount: -cost,
          description: "Boost 30 min active",
        });
        setBalance(balance - cost);
        setShopMsg("Boost active pendant 30 min !");
      } else if (label === "Super Flair") {
        setShopMsg("Utilise le Super Flair sur le profil d'un animal !");
      } else if (label === "Stickers Premium") {
        setShopMsg("Stickers bientot disponibles !");
      }
    } catch {
      setShopMsg("Erreur, reessaye.");
    }
    setBuyingItem(null);
  }

  if (loading) {
    return (
      <div className="space-y-4 stagger-children">
        <div className="glass rounded-2xl p-8 animate-breathe" style={{ height: 160 }} />
        <div className="glass rounded-2xl p-5 animate-breathe" style={{ height: 120, animationDelay: "0.15s" }} />
        <div className="glass rounded-2xl p-5 animate-breathe" style={{ height: 200, animationDelay: "0.3s" }} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Balance Card */}
      <section className="glass-strong rounded-2xl p-6 text-center relative overflow-hidden">
        <div className="absolute -top-8 -right-8 text-[100px] opacity-5 pointer-events-none select-none">🪙</div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--c-text-muted)" }}>
          Mon solde
        </p>
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="text-4xl">🪙</span>
          <span className="text-5xl font-black" style={{ color: "#fbbf24" }}>{balance}</span>
        </div>
        <p className="text-xs" style={{ color: "var(--c-text-muted)" }}>PawCoins</p>

        {/* Daily claim */}
        <button
          onClick={claimDaily}
          disabled={claiming}
          className="mt-4 px-6 py-2.5 rounded-full font-bold text-sm transition-all"
          style={{
            background: claimResult?.startsWith("+") ? "rgba(52,211,153,0.15)" : "linear-gradient(135deg, #fbbf24, #f97316)",
            color: claimResult?.startsWith("+") ? "#34d399" : "#fff",
            boxShadow: claimResult ? "none" : "0 4px 15px rgba(251,191,36,0.3)",
            cursor: claiming ? "wait" : "pointer",
          }}
        >
          {claiming ? "..." : claimResult || "☀️ Reclamer le bonus quotidien (+5)"}
        </button>
      </section>

      {/* Earn Section */}
      <section className="glass rounded-2xl p-5">
        <h2 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: "var(--c-text-muted)" }}>
          Comment gagner des coins
        </h2>
        <div className="space-y-2">
          {EARN_OPTIONS.map((opt) => (
            <div key={opt.label} className="flex items-center gap-3 py-2">
              <span className="text-xl w-8 text-center">{opt.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: "var(--c-text)" }}>{opt.label}</p>
                <p className="text-[10px]" style={{ color: "var(--c-text-muted)" }}>{opt.desc}</p>
              </div>
              <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: "rgba(251,191,36,0.1)", color: "#fbbf24" }}>
                {opt.coins}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Shop Section */}
      <section className="glass rounded-2xl p-5">
        <h2 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: "var(--c-text-muted)" }}>
          Boutique
        </h2>
        <div className="space-y-2">
          {SHOP_ITEMS.map((item) => (
            <div key={item.label} className="flex items-center gap-3 py-2 rounded-xl px-3 transition-all hover:bg-[var(--c-glass)]">
              <span className="text-xl w-8 text-center">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: "var(--c-text)" }}>{item.label}</p>
                <p className="text-[10px]" style={{ color: "var(--c-text-muted)" }}>{item.desc}</p>
              </div>
              <button
                disabled={balance < item.cost || buyingItem === item.label}
                onClick={() => handleShopBuy(item.label, item.cost)}
                className="text-xs font-bold px-3 py-1.5 rounded-full transition-all"
                style={{
                  background: balance >= item.cost ? "linear-gradient(135deg, #fbbf24, #f97316)" : "var(--c-border)",
                  color: balance >= item.cost ? "#fff" : "var(--c-text-muted)",
                  opacity: balance >= item.cost ? 1 : 0.5,
                  cursor: balance >= item.cost ? "pointer" : "not-allowed",
                }}
              >
                {buyingItem === item.label ? "..." : `🪙 ${item.cost}`}
              </button>
            </div>
          ))}
          {shopMsg && (
            <p className="text-xs font-semibold text-center mt-2 py-2 rounded-lg" style={{
              background: shopMsg.includes("Erreur") ? "rgba(239,68,68,0.1)" : "rgba(52,211,153,0.1)",
              color: shopMsg.includes("Erreur") ? "#ef4444" : "#34d399",
            }}>
              {shopMsg}
            </p>
          )}
        </div>
      </section>

      {/* Transaction History */}
      <section className="glass rounded-2xl p-5">
        <h2 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: "var(--c-text-muted)" }}>
          Historique
        </h2>
        {transactions.length === 0 ? (
          <p className="text-center py-4 text-sm" style={{ color: "var(--c-text-muted)" }}>Pas encore de transactions</p>
        ) : (
          <div className="space-y-1">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 py-2">
                <span className="text-lg w-7 text-center">{TX_ICONS[tx.type] || "🪙"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: "var(--c-text)" }}>
                    {tx.description || tx.type.replace(/_/g, " ")}
                  </p>
                  <p className="text-[10px]" style={{ color: "var(--c-text-muted)" }}>
                    {new Date(tx.created_at).toLocaleDateString("fr-CH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <span className={`text-xs font-bold ${tx.amount > 0 ? "text-green-400" : "text-red-400"}`}>
                  {tx.amount > 0 ? "+" : ""}{tx.amount}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
