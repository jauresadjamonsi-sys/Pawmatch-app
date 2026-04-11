"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

type PublicProfile = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  canton: string | null;
  species_preference: string | null;
  is_verified: boolean;
  created_at: string;
};

type Animal = {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  photos: string[];
  canton: string | null;
};

type Reel = {
  id: string;
  thumbnail_url: string | null;
  caption: string | null;
  likes_count: number;
};

export default function PublicProfilePage() {
  const params = useParams();
  const userId = params.id as string;
  const router = useRouter();
  const { profile: myProfile } = useAuth();
  const supabase = createClient();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [reels, setReels] = useState<Reel[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"animals" | "reels">("animals");
  const [followLoading, setFollowLoading] = useState(false);

  const isOwnProfile = myProfile?.id === userId;

  useEffect(() => {
    if (!userId) return;
    fetchProfile();
  }, [userId]);

  async function fetchProfile() {
    setLoading(true);
    try {
      // Fetch profile
      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (!prof) {
        setLoading(false);
        return;
      }
      setProfile(prof);

      // Fetch animals, reels, followers in parallel
      const [animalsRes, reelsRes, followersRes, followingRes, isFollowingRes] = await Promise.all([
        supabase.from("animals").select("id, name, species, breed, photos, canton").eq("created_by", userId).order("created_at", { ascending: false }),
        supabase.from("reels").select("id, thumbnail_url, caption, likes_count").eq("user_id", userId).order("created_at", { ascending: false }).limit(30),
        supabase.from("followers").select("*", { count: "exact", head: true }).eq("followed_id", userId),
        supabase.from("followers").select("*", { count: "exact", head: true }).eq("follower_id", userId),
        myProfile ? supabase.from("followers").select("id").eq("follower_id", myProfile.id).eq("followed_id", userId).single() : Promise.resolve({ data: null }),
      ]);

      setAnimals(animalsRes.data || []);
      setReels(reelsRes.data || []);
      setFollowerCount(followersRes.count || 0);
      setFollowingCount(followingRes.count || 0);
      setIsFollowing(!!isFollowingRes.data);
    } catch (err) {
      console.error("[PublicProfile] error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleFollow() {
    if (!myProfile || isOwnProfile) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await supabase.from("followers").delete().eq("follower_id", myProfile.id).eq("followed_id", userId);
        setIsFollowing(false);
        setFollowerCount(c => Math.max(0, c - 1));
      } else {
        await supabase.from("followers").insert({ follower_id: myProfile.id, followed_id: userId });
        setIsFollowing(true);
        setFollowerCount(c => c + 1);
        // Send notification
        await fetch("/api/followers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ followed_id: userId }),
        }).catch(() => {});
      }
    } catch (err) {
      console.error("[Follow] error:", err);
    } finally {
      setFollowLoading(false);
    }
  }

  async function handleDM() {
    if (!myProfile) return;
    // Check if a match/DM already exists
    const { data: existingMatch } = await supabase
      .from("matches")
      .select("id")
      .or(`and(sender_user_id.eq.${myProfile.id},receiver_user_id.eq.${userId}),and(sender_user_id.eq.${userId},receiver_user_id.eq.${myProfile.id})`)
      .single();

    if (existingMatch) {
      router.push(`/matches/${existingMatch.id}`);
      return;
    }

    // Create DM match
    const { data: newMatch } = await supabase
      .from("matches")
      .insert({
        sender_user_id: myProfile.id,
        receiver_user_id: userId,
        status: "dm",
      })
      .select()
      .single();

    if (newMatch) {
      router.push(`/matches/${newMatch.id}`);
    }
  }

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("fr-CH", { month: "long", year: "numeric" })
    : "";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pb-32" style={{ background: "var(--c-deep)" }}>
        <div className="w-10 h-10 border-3 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center pb-32" style={{ background: "var(--c-deep)" }}>
        <p className="text-5xl mb-4">👻</p>
        <p className="text-lg font-semibold text-[var(--c-text)]">Profil introuvable</p>
        <Link href="/explore" className="mt-4 text-green-400 hover:text-green-300 text-sm">
          ← Retour a l&apos;exploration
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32" style={{ background: "var(--c-deep)" }}>
      {/* Header banner */}
      <div className="relative h-32 bg-gradient-to-br from-green-500 via-purple-500 to-pink-500">
        <div className="absolute inset-0 bg-black/20" />
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-16 relative z-10">
        {/* Profile card */}
        <div className="glass rounded-3xl p-6 border border-[var(--c-border)]">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4">
            {/* Avatar */}
            <div className="relative -mt-16 sm:-mt-12">
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[var(--c-deep)] bg-[var(--c-card)] shadow-xl">
                {profile.avatar_url ? (
                  <Image src={profile.avatar_url} alt={profile.full_name} width={96} height={96} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl bg-gradient-to-br from-green-500 to-emerald-600 text-white">
                    {profile.full_name?.[0]?.toUpperCase() || "?"}
                  </div>
                )}
              </div>
              {profile.is_verified && (
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-blue-500 border-2 border-[var(--c-deep)] flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-xl font-extrabold text-[var(--c-text)] flex items-center gap-2 justify-center sm:justify-start">
                {profile.full_name}
                {profile.is_verified && (
                  <span className="text-blue-400 text-sm">Verifie</span>
                )}
              </h1>
              {profile.canton && (
                <p className="text-sm text-[var(--c-text-muted)] mt-0.5">
                  📍 {profile.canton} · Membre depuis {memberSince}
                </p>
              )}
            </div>

            {/* Actions */}
            {!isOwnProfile && myProfile && (
              <div className="flex gap-2">
                <button
                  onClick={handleFollow}
                  disabled={followLoading}
                  className={
                    "px-5 py-2 rounded-xl text-sm font-bold transition-all " +
                    (isFollowing
                      ? "bg-[var(--c-card)] border border-[var(--c-border)] text-[var(--c-text)] hover:border-red-500/30 hover:text-red-400"
                      : "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/25")
                  }
                >
                  {followLoading ? "..." : isFollowing ? "Abonne" : "Suivre"}
                </button>
                <button
                  onClick={handleDM}
                  className="px-4 py-2 rounded-xl bg-[var(--c-card)] border border-[var(--c-border)] text-[var(--c-text)] text-sm font-medium hover:border-green-500/30 transition-all"
                >
                  💬
                </button>
              </div>
            )}
            {isOwnProfile && (
              <Link href="/profile/edit" className="px-5 py-2 rounded-xl bg-[var(--c-card)] border border-[var(--c-border)] text-[var(--c-text)] text-sm font-medium hover:border-green-500/30 transition-all">
                Modifier
              </Link>
            )}
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="text-sm text-[var(--c-text)] mt-4 whitespace-pre-line">{profile.bio}</p>
          )}

          {/* Stats */}
          <div className="flex items-center gap-6 mt-4 pt-4 border-t border-[var(--c-border)]">
            <div className="text-center">
              <p className="text-lg font-bold text-[var(--c-text)]">{animals.length}</p>
              <p className="text-xs text-[var(--c-text-muted)]">Animaux</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-[var(--c-text)]">{reels.length}</p>
              <p className="text-xs text-[var(--c-text-muted)]">Reels</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-[var(--c-text)]">{followerCount}</p>
              <p className="text-xs text-[var(--c-text-muted)]">Abonnes</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-[var(--c-text)]">{followingCount}</p>
              <p className="text-xs text-[var(--c-text-muted)]">Abonnements</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-6 mb-4">
          <button
            onClick={() => setTab("animals")}
            className={
              "flex-1 py-2.5 rounded-xl text-sm font-medium transition-all " +
              (tab === "animals"
                ? "bg-green-500 text-white shadow-lg shadow-green-500/25"
                : "bg-[var(--c-card)] text-[var(--c-text-muted)] border border-[var(--c-border)]")
            }
          >
            🐾 Animaux ({animals.length})
          </button>
          <button
            onClick={() => setTab("reels")}
            className={
              "flex-1 py-2.5 rounded-xl text-sm font-medium transition-all " +
              (tab === "reels"
                ? "bg-green-500 text-white shadow-lg shadow-green-500/25"
                : "bg-[var(--c-card)] text-[var(--c-text-muted)] border border-[var(--c-border)]")
            }
          >
            🎬 Reels ({reels.length})
          </button>
        </div>

        {/* Animals grid */}
        {tab === "animals" && (
          <div className="grid grid-cols-2 gap-3">
            {animals.map(a => (
              <Link
                key={a.id}
                href={`/animals/${a.id}`}
                className="rounded-2xl overflow-hidden bg-[var(--c-card)] border border-[var(--c-border)] hover:border-green-500/30 transition-all group"
              >
                <div className="aspect-square bg-[var(--c-border)] relative">
                  {a.photos?.[0] ? (
                    <Image src={a.photos[0]} alt={a.name} fill className="object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">🐾</div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-sm font-semibold text-[var(--c-text)] truncate">{a.name}</p>
                  <p className="text-xs text-[var(--c-text-muted)]">{a.species}{a.breed ? ` · ${a.breed}` : ""}</p>
                </div>
              </Link>
            ))}
            {animals.length === 0 && (
              <div className="col-span-2 text-center py-12">
                <p className="text-3xl mb-2">🐾</p>
                <p className="text-sm text-[var(--c-text-muted)]">Aucun animal enregistre</p>
              </div>
            )}
          </div>
        )}

        {/* Reels grid */}
        {tab === "reels" && (
          <div className="grid grid-cols-3 gap-1.5">
            {reels.map(r => (
              <Link
                key={r.id}
                href={`/reels?id=${r.id}`}
                className="aspect-[9/16] rounded-xl overflow-hidden bg-[var(--c-card)] relative group"
              >
                {r.thumbnail_url ? (
                  <Image src={r.thumbnail_url} alt={r.caption || ""} fill className="object-cover group-hover:scale-105 transition-transform" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl bg-gradient-to-br from-purple-500/20 to-green-500/20">
                    🎬
                  </div>
                )}
                <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 bg-black/50 backdrop-blur rounded-full px-2 py-0.5">
                  <span className="text-white text-[10px]">❤️ {r.likes_count || 0}</span>
                </div>
              </Link>
            ))}
            {reels.length === 0 && (
              <div className="col-span-3 text-center py-12">
                <p className="text-3xl mb-2">🎬</p>
                <p className="text-sm text-[var(--c-text-muted)]">Aucun reel publie</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
