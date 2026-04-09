"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface FollowButtonProps {
  userId: string;
  initialIsFollowing?: boolean;
  size?: "sm" | "md";
}

export default function FollowButton({ userId, initialIsFollowing, size = "md" }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing ?? false);
  const [loading, setLoading] = useState(!initialIsFollowing);
  const [hover, setHover] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (initialIsFollowing !== undefined) {
      setIsFollowing(initialIsFollowing);
      setLoading(false);
      return;
    }
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id === userId) { setLoading(false); return; }
      const { data } = await supabase
        .from("followers")
        .select("id")
        .eq("follower_id", user.id)
        .eq("following_id", userId)
        .maybeSingle();
      setIsFollowing(!!data);
      setLoading(false);
    }
    check();
  }, [userId, initialIsFollowing]);

  async function toggle() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = "/login"; return; }
    setLoading(true);
    if (isFollowing) {
      await supabase.from("followers").delete().eq("follower_id", user.id).eq("following_id", userId);
      setIsFollowing(false);
    } else {
      await supabase.from("followers").insert({ follower_id: user.id, following_id: userId });
      setIsFollowing(true);
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div
        className={`rounded-full animate-pulse ${size === "sm" ? "w-16 h-7" : "w-20 h-8"}`}
        style={{ background: "var(--c-border)" }}
      />
    );
  }

  const sm = size === "sm";

  if (isFollowing) {
    return (
      <button
        onClick={toggle}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className={`rounded-full font-bold transition-all duration-200 border ${sm ? "px-3 py-1 text-[10px]" : "px-4 py-1.5 text-xs"}`}
        style={{
          background: hover ? "rgba(239,68,68,0.1)" : "var(--c-glass, rgba(255,255,255,0.05))",
          borderColor: hover ? "rgba(239,68,68,0.4)" : "var(--c-border)",
          color: hover ? "#ef4444" : "var(--c-text-muted)",
        }}
      >
        {hover ? "Ne plus suivre" : "Suivi"}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      className={`rounded-full font-bold transition-all duration-200 ${sm ? "px-3 py-1 text-[10px]" : "px-4 py-1.5 text-xs"}`}
      style={{
        background: "linear-gradient(135deg, #f97316, #ea580c)",
        color: "#fff",
        boxShadow: "0 2px 8px rgba(249,115,22,0.3)",
      }}
    >
      Suivre
    </button>
  );
}
