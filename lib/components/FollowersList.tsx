"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import FollowButton from "./FollowButton";

interface FollowersListProps {
  userId: string;
  type: "followers" | "following";
  onClose: () => void;
}

interface UserItem {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export default function FollowersList({ userId, type, onClose }: FollowersListProps) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);

      if (type === "followers") {
        const { data } = await supabase
          .from("followers")
          .select("follower_id")
          .eq("following_id", userId);
        if (data && data.length > 0) {
          const ids = data.map((d: any) => d.follower_id);
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name, avatar_url")
            .in("id", ids);
          setUsers((profiles || []) as UserItem[]);
        }
      } else {
        const { data } = await supabase
          .from("followers")
          .select("following_id")
          .eq("follower_id", userId);
        if (data && data.length > 0) {
          const ids = data.map((d: any) => d.following_id);
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name, avatar_url")
            .in("id", ids);
          setUsers((profiles || []) as UserItem[]);
        }
      }
      setLoading(false);
    }
    load();
  }, [userId, type]);

  const filtered = search
    ? users.filter(u => (u.full_name || "").toLowerCase().includes(search.toLowerCase()))
    : users;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-t-3xl overflow-hidden"
        style={{ background: "var(--c-card)", maxHeight: "70vh", animation: "slideUp 0.3s ease-out" }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>

        {/* Handle bar */}
        <div className="flex justify-center py-3">
          <div className="w-10 h-1 rounded-full" style={{ background: "var(--c-border)" }} />
        </div>

        {/* Header */}
        <div className="px-5 pb-3">
          <h2 className="text-lg font-bold" style={{ color: "var(--c-text)" }}>
            {type === "followers" ? "Abonnes" : "Abonnements"}
          </h2>
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full mt-2 px-4 py-2 rounded-xl text-sm outline-none"
            style={{ background: "var(--c-glass, rgba(255,255,255,0.05))", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
          />
        </div>

        {/* List */}
        <div className="px-5 pb-8 overflow-y-auto" style={{ maxHeight: "50vh" }}>
          {loading ? (
            <div className="space-y-3 py-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full animate-pulse" style={{ background: "var(--c-border)" }} />
                  <div className="flex-1">
                    <div className="h-3 w-24 rounded animate-pulse mb-1" style={{ background: "var(--c-border)" }} />
                    <div className="h-2 w-16 rounded animate-pulse" style={{ background: "var(--c-border)" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-8 text-sm" style={{ color: "var(--c-text-muted)" }}>
              {search ? "Aucun resultat" : type === "followers" ? "Pas encore d'abonnes" : "Pas encore d'abonnements"}
            </p>
          ) : (
            <div className="space-y-2 py-2">
              {filtered.map(user => (
                <div key={user.id} className="flex items-center gap-3 py-2">
                  <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 relative" style={{ background: "var(--c-glass)" }}>
                    {user.avatar_url ? (
                      <Image src={user.avatar_url} alt={user.full_name || ""} fill className="object-cover" sizes="40px" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm font-bold" style={{ color: "var(--c-accent)" }}>
                        {(user.full_name || "?").charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--c-text)" }}>
                      {user.full_name || "Utilisateur"}
                    </p>
                  </div>
                  {currentUserId && currentUserId !== user.id && (
                    <FollowButton userId={user.id} size="sm" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
