"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function PawCoinsBadge() {
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("pawcoins").eq("id", user.id).single();
      setBalance(data?.pawcoins ?? 0);
    }
    load();
  }, []);

  if (balance === null) return null;

  return (
    <Link
      href="/wallet"
      className="flex items-center gap-1 px-2.5 py-1 rounded-full transition-all hover:scale-105"
      style={{
        background: "linear-gradient(135deg, rgba(252,211,77,0.12), rgba(249,115,22,0.08))",
        border: "1px solid rgba(252,211,77,0.2)",
      }}
    >
      <span className="text-sm">🪙</span>
      <span className="text-xs font-bold" style={{ color: "#FCD34D" }}>{balance}</span>
    </Link>
  );
}
