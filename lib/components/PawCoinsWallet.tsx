"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getWallet, getDailyLoginBonus, getStreakBonus } from "@/lib/services/pawcoins";
import type { PawCoinTransaction, PawCoinTxType } from "@/lib/types";

// ---------------------------------------------------------------------------
// Coin pack types
// ---------------------------------------------------------------------------

interface CoinPack {
  id: string;
  coins: number;
  price: number;
  label: string;
  popular: boolean;
}

// ---------------------------------------------------------------------------
// Streak helpers
// ---------------------------------------------------------------------------

interface StreakInfo {
  count: number;
  weekDays: boolean[]; // 7 booleans, Mon-Sun of current week
}

const STREAK_MILESTONES = [
  { min: 30, label: "Diamant", color: "#b9f2ff", bg: "rgba(185,242,255,0.15)", icon: "\uD83D\uDC8E" },
  { min: 14, label: "Or", color: "#FCD34D", bg: "rgba(252,211,77,0.15)", icon: "\uD83E\uDD47" },
  { min: 7, label: "Argent", color: "#c0c0c0", bg: "rgba(192,192,192,0.15)", icon: "\uD83E\uDD48" },
  { min: 3, label: "Bronze", color: "#cd7f32", bg: "rgba(205,127,50,0.15)", icon: "\uD83E\uDD49" },
];

function getCurrentMilestone(streak: number) {
  return STREAK_MILESTONES.find((m) => streak >= m.min) || null;
}

async function fetchStreakInfo(supabase: ReturnType<typeof createClient>, userId: string): Promise<StreakInfo> {
  // Fetch daily_login transactions ordered by date descending
  const { data: logins } = await supabase
    .from("pawcoin_transactions")
    .select("created_at")
    .eq("user_id", userId)
    .eq("type", "daily_login")
    .order("created_at", { ascending: false })
    .limit(60);

  const loginDates = (logins || []).map((tx) => {
    const d = new Date(tx.created_at);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });

  // Deduplicate by date
  const uniqueDates = [...new Set(loginDates)];

  // Count consecutive days ending today or yesterday
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(today);

  // If today is not in the list, start checking from yesterday
  const todayStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, "0")}-${String(checkDate.getDate()).padStart(2, "0")}`;
  if (!uniqueDates.includes(todayStr)) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  for (let i = 0; i < 60; i++) {
    const dateStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, "0")}-${String(checkDate.getDate()).padStart(2, "0")}`;
    if (uniqueDates.includes(dateStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  // Build current week (Mon-Sun)
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  const weekDays: boolean[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    weekDays.push(uniqueDates.includes(ds));
  }

  return { count: streak, weekDays };
}

const TX_ICONS: Record<PawCoinTxType, string> = {
  welcome_bonus: "🎉", daily_login: "☀️", streak_bonus: "🔥",
  reel_posted: "🎬", reel_liked: "❤️", reel_viral: "🚀",
  match_made: "🐾", super_flair_sent: "⚡", super_flair_received: "💫",
  boost_purchased: "🔝", boost_used: "📣",
  referral_bonus: "🤝", challenge_completed: "🎯",
  review_posted: "📝", marketplace_listing: "🏪",
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

const WEEKLY_CHALLENGES = [
  { id: "post_reel", icon: "\uD83C\uDFAC", title: "Poste un Reel", desc: "Publie une video de ton animal", reward: 10, target: 1 },
  { id: "send_flair", icon: "\u26A1", title: "Envoie un Super Flair", desc: "Montre ton interet a un animal", reward: 5, target: 1 },
  { id: "make_match", icon: "\uD83D\uDC3E", title: "3 Coups de Truffe", desc: "Envoie 3 demandes de match", reward: 15, target: 3 },
  { id: "share_profile", icon: "\uD83D\uDCE4", title: "Partage un profil", desc: "Fais decouvrir Pawband a tes amis", reward: 5, target: 1 },
  { id: "daily_streak", icon: "\uD83D\uDD25", title: "5 jours de suite", desc: "Connecte-toi 5 jours consecutifs", reward: 25, target: 5 },
];

const SHOP_ITEMS = [
  { icon: "⚡", label: "Super Flair", cost: 15, desc: "Envoie un coup de coeur special" },
  { icon: "🔝", label: "Boost 30min", cost: 20, desc: "Ton profil en priorite pendant 30 min" },
  { icon: "🎨", label: "Stickers Premium", cost: 10, desc: "Debloque des stickers exclusifs" },
];

export default function PawCoinsWallet() {
  const searchParams = useSearchParams();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<PawCoinTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [buyingItem, setBuyingItem] = useState<string | null>(null);
  const [shopMsg, setShopMsg] = useState<string | null>(null);
  const [streak, setStreak] = useState<StreakInfo>({ count: 0, weekDays: Array(7).fill(false) });
  const [challengeProgress, setChallengeProgress] = useState<Record<string, number>>({});

  // PawCoins purchase state
  const [coinPacks, setCoinPacks] = useState<CoinPack[]>([]);
  const [buyingPack, setBuyingPack] = useState<string | null>(null);
  const [purchaseToast, setPurchaseToast] = useState<string | null>(null);

  // Detect ?purchase=success from Stripe redirect
  useEffect(() => {
    const purchaseStatus = searchParams.get("purchase");
    const coins = searchParams.get("coins");
    if (purchaseStatus === "success" && coins) {
      setPurchaseToast(`+${coins} PawCoins credites sur ton compte !`);
      // Clear the toast after 5s
      const timer = setTimeout(() => setPurchaseToast(null), 5000);
      // Remove query params from URL without reload
      window.history.replaceState({}, "", "/wallet");
      return () => clearTimeout(timer);
    }
    if (purchaseStatus === "cancelled") {
      setPurchaseToast("Achat annule.");
      const timer = setTimeout(() => setPurchaseToast(null), 4000);
      window.history.replaceState({}, "", "/wallet");
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  // Fetch coin packs
  useEffect(() => {
    fetch("/api/stripe/pawcoins")
      .then((res) => res.json())
      .then((data) => setCoinPacks(data.packs || []))
      .catch(() => {});
  }, []);

  async function handleBuyPack(packId: string) {
    if (buyingPack) return;
    setBuyingPack(packId);
    try {
      const res = await fetch("/api/stripe/pawcoins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setPurchaseToast(data.error || "Erreur, reessaye.");
        setTimeout(() => setPurchaseToast(null), 4000);
        setBuyingPack(null);
      }
    } catch {
      setPurchaseToast("Erreur de connexion.");
      setTimeout(() => setPurchaseToast(null), 4000);
      setBuyingPack(null);
    }
  }

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);
      const [wallet, streakInfo] = await Promise.all([
        getWallet(supabase, user.id),
        fetchStreakInfo(supabase, user.id),
      ]);
      setBalance(wallet.balance);
      setTransactions(wallet.transactions);
      setStreak(streakInfo);

      // Fetch weekly challenge progress
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
      weekStart.setHours(0, 0, 0, 0);
      const weekStartISO = weekStart.toISOString();

      const { count: reelCount } = await supabase
        .from("reels")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", weekStartISO);

      setChallengeProgress({
        post_reel: reelCount || 0,
        send_flair: 0,
        make_match: 0,
        share_profile: 0,
        daily_streak: streakInfo.count,
      });

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
      setBalance("balance" in result && result.balance != null ? result.balance : balance + 5);
      setClaimResult("+ 5 PawCoins !");
      const [wallet, streakInfo] = await Promise.all([
        getWallet(supabase, userId),
        fetchStreakInfo(supabase, userId),
      ]);
      setTransactions(wallet.transactions);
      setStreak(streakInfo);
      // Check for streak bonus
      const bonus = getStreakBonus(streakInfo.count);
      if (bonus > 0) {
        setClaimResult(`+ 5 PawCoins ! (+ bonus streak \uD83D\uDD25 ${bonus})`);
      }
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

  // Format price in CHF
  function formatCHF(cents: number) {
    return `CHF ${(cents / 100).toFixed(2)}`;
  }

  return (
    <div className="space-y-5">
      {/* Purchase toast */}
      {purchaseToast && (
        <div
          className="animate-slide-up rounded-2xl p-4 text-center text-sm font-bold"
          style={{
            background: purchaseToast.startsWith("+")
              ? "linear-gradient(135deg, rgba(52,211,153,0.15), rgba(16,185,129,0.1))"
              : "rgba(239,68,68,0.1)",
            color: purchaseToast.startsWith("+") ? "#34d399" : "#ef4444",
            border: purchaseToast.startsWith("+")
              ? "1px solid rgba(52,211,153,0.3)"
              : "1px solid rgba(239,68,68,0.3)",
          }}
        >
          {purchaseToast}
        </div>
      )}

      {/* Balance Card */}
      <section className="glass-strong rounded-2xl p-6 text-center relative overflow-hidden">
        <div className="absolute -top-8 -right-8 text-[100px] opacity-5 pointer-events-none select-none">🪙</div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--c-text-muted)" }}>
          Mon solde
        </p>
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="text-4xl">🪙</span>
          <span className="text-5xl font-black" style={{ color: "#FCD34D" }}>{balance}</span>
        </div>
        <p className="text-xs" style={{ color: "var(--c-text-muted)" }}>PawCoins</p>

        {/* Daily claim */}
        <button
          onClick={claimDaily}
          disabled={claiming}
          className="mt-4 px-6 py-2.5 rounded-full font-bold text-sm transition-all"
          style={{
            background: claimResult?.startsWith("+") ? "rgba(52,211,153,0.15)" : "linear-gradient(135deg, #FCD34D, #FBBF24)",
            color: claimResult?.startsWith("+") ? "#34d399" : "#fff",
            boxShadow: claimResult ? "none" : "0 4px 15px rgba(252,211,77,0.3)",
            cursor: claiming ? "wait" : "pointer",
          }}
        >
          {claiming ? "..." : claimResult || "☀️ Reclamer le bonus quotidien (+5)"}
        </button>
      </section>

      {/* Buy PawCoins */}
      {coinPacks.length > 0 && (
        <section className="glass rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute -top-6 -right-6 text-[80px] opacity-5 pointer-events-none select-none">
            {"\uD83D\uDCB0"}
          </div>
          <h2
            className="text-sm font-bold uppercase tracking-wider mb-4"
            style={{ color: "var(--c-text-muted)" }}
          >
            Acheter des PawCoins
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {coinPacks.map((pack, idx) => (
              <div
                key={pack.id}
                className="animate-slide-up relative rounded-xl p-4 flex flex-col items-center text-center transition-all"
                style={{
                  animationDelay: `${idx * 0.08}s`,
                  animationFillMode: "backwards",
                  background:
                    "linear-gradient(135deg, rgba(252,211,77,0.06), rgba(251,191,36,0.03))",
                  border: pack.popular
                    ? "2px solid rgba(252,211,77,0.5)"
                    : "1px solid var(--c-border)",
                  boxShadow: pack.popular
                    ? "0 0 20px rgba(252,211,77,0.1), inset 0 1px 0 rgba(255,215,0,0.15)"
                    : "none",
                }}
              >
                {pack.popular && (
                  <span
                    className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded-full text-white"
                    style={{
                      background:
                        "linear-gradient(135deg, #FCD34D, #FBBF24)",
                      boxShadow: "0 2px 8px rgba(252,211,77,0.3)",
                    }}
                  >
                    Populaire
                  </span>
                )}

                <span className="text-3xl mb-1">{"\uD83E\uDE99"}</span>
                <p
                  className="text-lg font-black mb-0.5"
                  style={{ color: "#FCD34D" }}
                >
                  {pack.coins}
                </p>
                <p
                  className="text-[10px] mb-3"
                  style={{ color: "var(--c-text-muted)" }}
                >
                  {formatCHF(pack.price)}
                </p>

                <button
                  onClick={() => handleBuyPack(pack.id)}
                  disabled={!!buyingPack}
                  className="btn-press w-full py-2 rounded-xl font-bold text-xs transition-all disabled:opacity-50"
                  style={{
                    background:
                      "linear-gradient(135deg, #FCD34D, #FBBF24)",
                    color: "#fff",
                    boxShadow: "0 3px 12px rgba(252,211,77,0.25)",
                    cursor: buyingPack ? "wait" : "pointer",
                  }}
                >
                  {buyingPack === pack.id ? "Redirection..." : "Acheter"}
                </button>
              </div>
            ))}
          </div>
          <p
            className="text-[10px] text-center mt-3"
            style={{ color: "var(--c-text-muted)" }}
          >
            Paiement securise par Stripe
          </p>
        </section>
      )}

      {/* Streak Display */}
      <section className="glass rounded-2xl p-5 relative overflow-hidden">
        <div className="absolute -top-6 -right-6 text-[80px] opacity-5 pointer-events-none select-none">{"\uD83D\uDD25"}</div>

        {/* Streak counter */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{"\uD83D\uDD25"}</span>
            <div>
              <p className="text-lg font-black" style={{ color: "var(--c-text)" }}>
                {streak.count} jour{streak.count !== 1 ? "s" : ""} de suite
              </p>
              <p className="text-[10px]" style={{ color: "var(--c-text-muted)" }}>
                {streak.count > 0 ? "Continue comme ca !" : "Connecte-toi chaque jour"}
              </p>
            </div>
          </div>

          {/* Milestone badge */}
          {(() => {
            const milestone = getCurrentMilestone(streak.count);
            if (!milestone) return null;
            return (
              <span
                className="px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1"
                style={{ background: milestone.bg, color: milestone.color }}
              >
                {milestone.icon} {milestone.label}
              </span>
            );
          })()}
        </div>

        {/* Week circles */}
        <div className="flex items-center justify-between gap-1 mb-3">
          {["L", "M", "M", "J", "V", "S", "D"].map((day, idx) => {
            const isActive = streak.weekDays[idx];
            const now = new Date();
            const dayOfWeek = now.getDay();
            const todayIdx = (dayOfWeek + 6) % 7; // Mon=0 ... Sun=6
            const isToday = idx === todayIdx;

            return (
              <div key={idx} className="flex flex-col items-center gap-1.5">
                <span
                  className="text-[9px] font-semibold uppercase"
                  style={{ color: isToday ? "var(--c-accent)" : "var(--c-text-muted)" }}
                >
                  {day}
                </span>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                  style={{
                    background: isActive
                      ? "linear-gradient(135deg, #FBBF24, #FCD34D)"
                      : "var(--c-card)",
                    border: isToday && !isActive
                      ? "2px solid var(--c-accent)"
                      : isActive
                        ? "none"
                        : "1px solid var(--c-border)",
                    boxShadow: isActive && isToday
                      ? "0 0 12px rgba(252,211,77,0.5), 0 0 24px rgba(249,115,22,0.25)"
                      : isActive
                        ? "0 0 8px rgba(252,211,77,0.3)"
                        : "none",
                  }}
                >
                  {isActive ? (
                    <span className="text-xs">{"\uD83D\uDD25"}</span>
                  ) : (
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: "var(--c-border)" }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Milestone progress bar */}
        {(() => {
          const nextMilestone = STREAK_MILESTONES.slice().reverse().find((m) => streak.count < m.min);
          if (!nextMilestone) return (
            <p className="text-[10px] text-center font-semibold" style={{ color: "#b9f2ff" }}>
              {"\uD83D\uDC8E"} Niveau maximum atteint !
            </p>
          );
          const prevMin = STREAK_MILESTONES.find((m) => m.min < nextMilestone.min && streak.count >= m.min)?.min || 0;
          const progress = Math.min(100, ((streak.count - prevMin) / (nextMilestone.min - prevMin)) * 100);
          return (
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-semibold" style={{ color: "var(--c-text-muted)" }}>
                  Prochain : {nextMilestone.icon} {nextMilestone.label}
                </span>
                <span className="text-[10px] font-bold" style={{ color: nextMilestone.color }}>
                  {streak.count}/{nextMilestone.min} jours
                </span>
              </div>
              <div
                className="w-full h-1.5 rounded-full overflow-hidden"
                style={{ background: "var(--c-border)" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${progress}%`,
                    background: `linear-gradient(90deg, ${nextMilestone.color}, ${nextMilestone.color}88)`,
                  }}
                />
              </div>
            </div>
          );
        })()}

        {/* Streak bonus info */}
        {streak.count >= 3 && (
          <p className="text-[10px] text-center mt-3 font-semibold" style={{ color: "#FCD34D" }}>
            Bonus streak actif : +{getStreakBonus(streak.count)} PawCoins
          </p>
        )}
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
              <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: "rgba(252,211,77,0.1)", color: "#FCD34D" }}>
                {opt.coins}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Weekly Challenges */}
      <section className="glass rounded-2xl p-5 relative overflow-hidden">
        <div className="absolute -top-6 -right-6 text-[80px] opacity-5 pointer-events-none select-none">{"\uD83C\uDFAF"}</div>
        <h2 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: "var(--c-text-muted)" }}>
          Defis de la semaine
        </h2>
        <div className="space-y-3">
          {WEEKLY_CHALLENGES.map((ch) => {
            const progress = Math.min(challengeProgress[ch.id] || 0, ch.target);
            const completed = progress >= ch.target;
            const pct = Math.round((progress / ch.target) * 100);
            return (
              <div
                key={ch.id}
                className="rounded-xl p-3 transition-all"
                style={{
                  background: completed ? "rgba(52,211,153,0.08)" : "rgba(255,255,255,0.03)",
                  border: completed ? "1px solid rgba(52,211,153,0.2)" : "1px solid var(--c-border)",
                  opacity: completed ? 0.7 : 1,
                }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xl w-8 text-center">{ch.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold" style={{ color: completed ? "#34d399" : "var(--c-text)" }}>
                        {ch.title}
                      </p>
                      {completed && <span className="text-sm">{"\u2705"}</span>}
                    </div>
                    <p className="text-[10px]" style={{ color: "var(--c-text-muted)" }}>{ch.desc}</p>
                  </div>
                  <span
                    className="text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap"
                    style={{
                      background: completed ? "rgba(52,211,153,0.15)" : "rgba(252,211,77,0.1)",
                      color: completed ? "#34d399" : "#FCD34D",
                    }}
                  >
                    {"\uD83E\uDE99"} +{ch.reward}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="flex-1 h-2 rounded-full overflow-hidden"
                    style={{ background: "var(--c-border)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        background: completed
                          ? "linear-gradient(90deg, #34d399, #FBBF24)"
                          : "linear-gradient(90deg, #FBBF24, #FCD34D)",
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-bold min-w-[32px] text-right" style={{ color: "var(--c-text-muted)" }}>
                    {progress}/{ch.target}
                  </span>
                </div>
              </div>
            );
          })}
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
                  background: balance >= item.cost ? "linear-gradient(135deg, #FCD34D, #FBBF24)" : "var(--c-border)",
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
                <span className={`text-xs font-bold ${tx.amount > 0 ? "text-amber-300" : "text-red-400"}`}>
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
