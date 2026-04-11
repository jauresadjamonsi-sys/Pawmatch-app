"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PushButton from "./PushButton";
import { useAppContext } from "@/lib/contexts/AppContext";
import { BadgesSection } from "./Badges";
import ReferralCard from "./ReferralCard";
import { EMOJI_MAP } from "@/lib/constants";
import ImageCropper from "./ImageCropper";
import FollowersList from "./FollowersList";
import PawScoreBadge from "./PawScoreBadge";

interface Props {
  profile: any;
  animals: any[];
  user: { id: string; email: string };
  subLabel: string;
  stats: { matches: number; messages: number; days: number; animals: number };
  initials: string;
  logout: () => Promise<void>;
}

export default function ProfileClient({ profile: initialProfile, animals: initialAnimals, user, subLabel: initialSubLabel, initials: initialInitials, logout, stats: initialStats }: Props) {
  const { t } = useAppContext();
  const [profile, setProfile] = useState(initialProfile);
  const [animals, setAnimals] = useState(initialAnimals);
  const [stats, setStats] = useState(initialStats);
  const [showDeleteProfile, setShowDeleteProfile] = useState(false);
  const [deletingAnimal, setDeletingAnimal] = useState<string|null>(null);
  const [loading, setLoading] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [showFollowersList, setShowFollowersList] = useState<"followers" | "following" | null>(null);
  const [wrappedStats, setWrappedStats] = useState<{
    totalMatches: number;
    totalReels: number;
    totalLikes: number;
    favoriteSpecies: string;
    daysOnPawband: number;
    totalCoins: number;
  } | null>(null);
  const [profileTab, setProfileTab] = useState<"posts" | "reels" | "animals">("posts");
  const [userPhotos, setUserPhotos] = useState<{url: string; type: string; id: string}[]>([]);
  const [userReels, setUserReels] = useState<{id: string; video_url: string; caption: string; views: number}[]>([]);
  const router = useRouter();
  const supabase = createClient();

  // Client-side data loading: fetch directly from Supabase via browser client
  useEffect(() => {
    async function loadProfile() {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) return;

        // Stagger: critical data first, counts second (prevents Supabase 503)
        const [profileRes, animalsRes] = await Promise.all([
          supabase.from("profiles").select("id, full_name, email, avatar_url, role, subscription, city, created_at, phone, verified_photo, verification_status").eq("id", authUser.id).single(),
          supabase.from("animals").select("id, name, species, breed, photo_url, canton, city, gender, age_months, created_by").eq("created_by", authUser.id).order("created_at", { ascending: false }),
        ]);
        const [matchRes, messageRes] = await Promise.all([
          Promise.resolve(supabase.from("matches").select("*", { count: "exact", head: true }).or(`sender_user_id.eq.${authUser.id},receiver_user_id.eq.${authUser.id}`)).catch(() => ({ count: 0 })),
          Promise.resolve(supabase.from("messages").select("*", { count: "exact", head: true }).eq("sender_id", authUser.id)).catch(() => ({ count: 0 })),
        ]);

        if (profileRes.data) setProfile(profileRes.data);
        if (animalsRes.data && animalsRes.data.length > 0) setAnimals(animalsRes.data);

        const daysSince = profileRes.data?.created_at
          ? Math.floor((Date.now() - new Date(profileRes.data.created_at).getTime()) / 86400000)
          : 0;
        setStats({
          matches: matchRes.count || 0,
          messages: messageRes.count || 0,
          days: daysSince,
          animals: (animalsRes.data || []).length,
        });

        // Fetch follower counts
        fetch(`/api/followers?user_id=${authUser.id}`)
          .then(r => r.json())
          .then(d => { setFollowersCount(d.followers_count || 0); setFollowingCount(d.following_count || 0); })
          .catch(() => {});

        // Fetch Pawband Wrapped stats
        try {
          const [matchCountRes, reelsRes, profileCoins] = await Promise.all([
            supabase.from("matches").select("*", { count: "exact", head: true }).or(`sender_user_id.eq.${authUser.id},receiver_user_id.eq.${authUser.id}`),
            supabase.from("reels").select("id", { count: "exact", head: true }).eq("user_id", authUser.id),
            supabase.from("profiles").select("pawcoins").eq("id", authUser.id).single(),
          ]);

          // Total likes received on user's reels
          const { data: userReels } = await supabase.from("reels").select("id").eq("user_id", authUser.id);
          let totalLikes = 0;
          if (userReels && userReels.length > 0) {
            const reelIds = userReels.map((r: any) => r.id);
            const { count: likesCount } = await supabase
              .from("reel_likes")
              .select("*", { count: "exact", head: true })
              .in("reel_id", reelIds);
            totalLikes = likesCount || 0;
          }

          // Favorite species: most common species in matches
          let favoriteSpecies = "Aucun";
          const { data: matchAnimals } = await supabase
            .from("matches")
            .select("sender_animal_id, receiver_animal_id")
            .or(`sender_user_id.eq.${authUser.id},receiver_user_id.eq.${authUser.id}`)
            .limit(100);
          if (matchAnimals && matchAnimals.length > 0) {
            const allAnimalIds = matchAnimals.flatMap((m: any) => [m.sender_animal_id, m.receiver_animal_id]).filter(Boolean);
            if (allAnimalIds.length > 0) {
              const { data: speciesData } = await supabase
                .from("animals")
                .select("species")
                .in("id", [...new Set(allAnimalIds)]);
              if (speciesData && speciesData.length > 0) {
                const speciesCount: Record<string, number> = {};
                speciesData.forEach((a: any) => {
                  if (a.species) speciesCount[a.species] = (speciesCount[a.species] || 0) + 1;
                });
                const sorted = Object.entries(speciesCount).sort((a, b) => b[1] - a[1]);
                if (sorted.length > 0) favoriteSpecies = sorted[0][0];
              }
            }
          }

          const daysOnPawband = profileRes.data?.created_at
            ? Math.floor((Date.now() - new Date(profileRes.data.created_at).getTime()) / 86400000)
            : 0;

          setWrappedStats({
            totalMatches: matchCountRes.count || 0,
            totalReels: reelsRes.count || 0,
            totalLikes,
            favoriteSpecies,
            daysOnPawband,
            totalCoins: profileCoins.data?.pawcoins || 0,
          });
        } catch (err) {
          console.error("[Profile] Failed to fetch wrapped stats:", err);
        }

        // Fetch user photos (animals + stories) for Instagram grid
        try {
          const [animalPhotosRes, storyPhotosRes] = await Promise.all([
            supabase.from("animals").select("id, photo_url").eq("created_by", authUser.id).not("photo_url", "is", null),
            supabase.from("stories").select("id, media_url").eq("user_id", authUser.id).not("media_url", "is", null),
          ]);
          const photos: {url: string; type: string; id: string}[] = [];
          if (animalPhotosRes.data) {
            animalPhotosRes.data.forEach((a: any) => {
              if (a.photo_url) photos.push({ url: a.photo_url, type: "animal", id: a.id });
            });
          }
          if (storyPhotosRes.data) {
            storyPhotosRes.data.forEach((s: any) => {
              if (s.media_url) photos.push({ url: s.media_url, type: "story", id: s.id });
            });
          }
          setUserPhotos(photos);
        } catch (err) {
          console.error("[Profile] Failed to fetch user photos:", err);
        }

        // Fetch user reels for Reels tab
        try {
          const { data: reelsData } = await supabase
            .from("reels")
            .select("id, video_url, caption, views_count")
            .eq("user_id", authUser.id)
            .order("created_at", { ascending: false });
          if (reelsData) {
            setUserReels(reelsData.map((r: any) => ({
              id: r.id,
              video_url: r.video_url || "",
              caption: r.caption || "",
              views: r.views_count || 0,
            })));
          }
        } catch (err) {
          console.error("[Profile] Failed to fetch user reels:", err);
        }
      } catch (err) {
        console.error("[Profile] Failed to load profile stats:", err);
      }
    }
    loadProfile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarCropFile, setAvatarCropFile] = useState<File | null>(null);

  function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarCropFile(file);
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  }

  async function handleAvatarCropped(blob: Blob) {
    setAvatarCropFile(null);
    setUploadingAvatar(true);
    try {
      const path = `avatars/${user.id}/${Date.now()}.jpg`;
      const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
      const { error: uploadError } = await supabase.storage.from("photos").upload(path, file, { upsert: true });
      if (uploadError) { console.error("Upload error:", uploadError.message); setUploadingAvatar(false); return; }
      const { data: urlData } = supabase.storage.from("photos").getPublicUrl(path);
      const avatar_url = urlData.publicUrl;
      await supabase.from("profiles").update({ avatar_url }).eq("id", user.id);
      setProfile((prev: any) => ({ ...prev, avatar_url }));
    } catch (err) {
      console.error("Avatar upload failed:", err);
    }
    setUploadingAvatar(false);
  }

  async function deleteAnimal(id: string) {
    setLoading(true);
    await supabase.from("animals").delete().eq("id", id);
    setAnimals(prev => prev.filter(a => a.id !== id));
    setDeletingAnimal(null);
    setLoading(false);
  }

  async function deleteProfile() {
    setLoading(true);
    await supabase.from("animals").delete().eq("created_by", user.id);
    await supabase.from("profiles").delete().eq("id", user.id);
    await supabase.auth.signOut();
    router.push("/");
  }

  async function fetchBlockedUsers() {
    setLoadingBlocked(true);
    try {
      const res = await fetch("/api/block");
      if (res.ok) {
        const data = await res.json();
        setBlockedUsers(data.blocked_users || []);
      }
    } catch (err) {
      console.error("[Profile] Failed to fetch blocked users:", err);
    }
    setLoadingBlocked(false);
  }

  async function unblockUser(userId: string) {
    try {
      const res = await fetch(`/api/block/${userId}`, { method: "DELETE" });
      if (res.ok) {
        setBlockedUsers(prev => prev.filter(u => u.user_id !== userId));
      }
    } catch (err) {
      console.error("[Profile] Failed to unblock user:", err);
    }
  }

  const isPremium = profile?.subscription === "premium" || profile?.subscription === "pro";

  const SUB_LABELS: Record<string, string> = { premium: "PawPlus", pro: "PawPro", free: "Gratuit" };
  const subLabel = SUB_LABELS[profile?.subscription || "free"] || initialSubLabel;
  const initials = (profile?.full_name || user.email || "?").charAt(0).toUpperCase();

  const subColor = profile?.subscription === "pro"
    ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
    : profile?.subscription === "premium"
    ? "bg-amber-400/20 text-amber-200 border border-amber-400/30"
    : "bg-[var(--c-border)] text-[var(--c-text-muted)]";

  return (
    <div className="min-h-screen bg-[var(--c-bg,var(--c-deep))] px-4 py-6 pb-28">
      <div className="max-w-2xl mx-auto">

        {/* Verification prompt banner */}
        {profile && profile.verification_status !== "approved" && !profile.verified_photo && (
          <div className="glass rounded-2xl p-4 mb-4" style={{ border: "1.5px solid rgba(59,130,246,0.3)" }}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{"📸"}</span>
              <div className="flex-1">
                <p className="text-sm font-bold" style={{ color: "var(--c-text)" }}>Verifie ton profil</p>
                <p className="text-[11px]" style={{ color: "var(--c-text-muted)" }}>
                  Prends un selfie avec ton animal pour obtenir le badge verifie et +15 PawCoins
                </p>
              </div>
              <Link href="/profile/verify" className="px-3 py-1.5 rounded-full text-xs font-bold text-white" style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)" }}>
                Verifier
              </Link>
            </div>
          </div>
        )}

        {/* Profile card - glass with gradient border */}
        <div className="glass-strong gradient-border card-futuristic rounded-2xl p-6 mb-6 animate-slide-up">
          <div className="flex items-center gap-4 mb-5">
            {/* Avatar - clickable to upload photo */}
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarSelect}
            />
            <button
              onClick={() => avatarInputRef.current?.click()}
              className="gradient-border flex-shrink-0 relative group"
              style={{ borderRadius: "50%", padding: 2 }}
              disabled={uploadingAvatar}
            >
              {profile?.avatar_url ? (
                <div className="w-20 h-20 rounded-full overflow-hidden relative"
                  style={{ boxShadow: isPremium ? "0 0 20px rgba(251,191,36,0.3), 0 0 40px rgba(167,139,250,0.15)" : "none" }}>
                  <Image src={profile.avatar_url} alt="Avatar" fill className="object-cover" sizes="80px" />
                </div>
              ) : (
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center"
                  style={{
                    background: "rgba(251,191,36,0.15)",
                    boxShadow: isPremium
                      ? "0 0 20px rgba(251,191,36,0.3), 0 0 40px rgba(167,139,250,0.15)"
                      : "none",
                  }}
                >
                  <span className="text-xl font-bold text-amber-300">{initials}</span>
                </div>
              )}
              {/* Camera overlay */}
              <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-white text-lg">{uploadingAvatar ? "⏳" : "📷"}</span>
              </div>
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1
                  className="text-xl font-bold text-[var(--c-text)] truncate profile-name-hover"
                  style={{ transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)" }}
                >
                  {profile?.full_name || "Utilisateur"}
                  {profile?.verification_status === "approved" && (
                    <span className="inline-flex items-center justify-center ml-1.5 w-5 h-5 rounded-full text-[11px] align-middle" style={{ background: "linear-gradient(135deg, #FBBF24, #F59E0B)", color: "#fff", boxShadow: "0 0 8px rgba(251,191,36,0.4)" }} title="Profil verifie">✓</span>
                  )}
                </h1>
                <PawScoreBadge userId={user.id} size="sm" />
              </div>
              <p className="text-sm text-[var(--c-text-muted)] truncate">{user.email}</p>
              <span
                className={"inline-block mt-1 text-xs px-3 py-1 rounded-full font-semibold " + subColor}
                style={isPremium ? { boxShadow: "0 0 12px rgba(251,191,36,0.2)" } : {}}
              >
                {subLabel}
              </span>
              {profile?.role === "admin" && (
                <span
                  className="inline-block mt-1 ml-2 text-xs px-3 py-1 rounded-full font-semibold bg-red-500/20 text-red-400"
                  style={{ boxShadow: "0 0 10px rgba(239,68,68,0.15)" }}
                >
                  👑 Admin
                </span>
              )}
            </div>
          </div>

          {/* Stats engagement - glass cards with neon accents */}
          <div className={`grid gap-2 mb-5 ${profile?.role === "admin" ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"}`}>
            <button
              onClick={() => document.getElementById("compagnons")?.scrollIntoView({ behavior: "smooth" })}
              className="glass rounded-xl p-3 text-center transition cursor-pointer profile-stat-card"
              style={{
                border: "1px solid rgba(251,191,36,0.15)",
                boxShadow: "0 0 12px rgba(251,191,36,0.05)",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              <p className="text-lg font-black neon-green">{stats.animals}</p>
              <p className="text-[9px] text-[var(--c-text-muted)] font-bold uppercase">Animaux</p>
            </button>
            <Link
              href="/matches"
              className="glass rounded-xl p-3 text-center transition cursor-pointer block profile-stat-card"
              style={{
                border: "1px solid rgba(251,191,36,0.15)",
                boxShadow: "0 0 12px rgba(251,191,36,0.05)",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              <p className="text-lg font-black" style={{ color: "#FBBF24", textShadow: "0 0 8px rgba(251,191,36,0.3)" }}>{stats.matches}</p>
              <p className="text-[9px] text-[var(--c-text-muted)] font-bold uppercase">Matchs</p>
            </Link>
            <Link
              href="/matches"
              className="glass rounded-xl p-3 text-center transition cursor-pointer block profile-stat-card"
              style={{
                border: "1px solid rgba(59,130,246,0.15)",
                boxShadow: "0 0 12px rgba(59,130,246,0.05)",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              <p className="text-lg font-black" style={{ color: "#3b82f6", textShadow: "0 0 8px rgba(59,130,246,0.3)" }}>{stats.messages}</p>
              <p className="text-[9px] text-[var(--c-text-muted)] font-bold uppercase">Messages</p>
            </Link>
            {profile?.role === "admin" && (
              <Link
                href="/admin?tab=members"
                className="glass rounded-xl p-3 text-center transition cursor-pointer block profile-stat-card"
                style={{
                  border: "1px solid rgba(167,139,250,0.15)",
                  boxShadow: "0 0 12px rgba(167,139,250,0.05)",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              >
                <p className="text-lg font-black" style={{ color: "#a78bfa", textShadow: "0 0 8px rgba(167,139,250,0.3)" }}>👥</p>
                <p className="text-[9px] text-[var(--c-text-muted)] font-bold uppercase">Membres</p>
              </Link>
            )}
          </div>

          {/* Followers / Following */}
          <div className="flex items-center justify-center gap-6 mb-5">
            <button onClick={() => setShowFollowersList("followers")} className="text-center group">
              <p className="text-lg font-black" style={{ color: "var(--c-text)" }}>{followersCount}</p>
              <p className="text-[9px] text-[var(--c-text-muted)] font-bold uppercase group-hover:text-amber-300 transition-colors">Abonnes</p>
            </button>
            <div className="w-px h-8" style={{ background: "var(--c-border)" }} />
            <button onClick={() => setShowFollowersList("following")} className="text-center group">
              <p className="text-lg font-black" style={{ color: "var(--c-text)" }}>{followingCount}</p>
              <p className="text-[9px] text-[var(--c-text-muted)] font-bold uppercase group-hover:text-amber-300 transition-colors">Abonnements</p>
            </button>
          </div>

          {/* Badges */}
          <BadgesSection
            matchCount={stats.matches}
            messageCount={stats.messages}
            animalCount={stats.animals}
            daysMember={stats.days}
            hasPhoto={animals.some((a: any) => a.photo_url)}
            hasPremium={isPremium}
            lang="fr"
          />

          {(profile?.city || profile?.phone) && (
            <div className="grid grid-cols-2 gap-3 mb-5">
              {profile?.city && (
                <div className="glass rounded-xl p-3" style={{ border: "1px solid var(--c-border)" }}>
                  <p className="text-xs text-[var(--c-text-muted)] mb-1">Ville</p>
                  <p className="text-sm font-medium text-[var(--c-text)]">{profile.city}</p>
                </div>
              )}
              {profile?.phone && (
                <div className="glass rounded-xl p-3" style={{ border: "1px solid var(--c-border)" }}>
                  <p className="text-xs text-[var(--c-text-muted)] mb-1">Telephone</p>
                  <p className="text-sm font-medium text-[var(--c-text)]">{profile.phone}</p>
                </div>
              )}
            </div>
          )}

          {/* Actions - btn-futuristic */}
          <div className="flex flex-wrap gap-2">
            <Link href="/profile/edit" className="btn-futuristic px-4 py-2 text-sm font-medium rounded-xl">
              ✏️ Modifier
            </Link>
            <Link
              href="/profile/stats"
              className="btn-futuristic px-4 py-2 text-sm font-medium rounded-xl"
              style={{ borderColor: "rgba(59,130,246,0.25)" }}
            >
              📊 {t.statsTitle || "Statistiques"}
            </Link>
            <PushButton />
            <Link
              href="/pricing"
              className="btn-futuristic px-4 py-2 text-sm font-medium rounded-xl neon-green"
            >
              {profile?.subscription === "free" ? "⭐ Passer Premium" : "⚙️ Gérer mon plan"}
            </Link>
            <Link
              href="/promo"
              className="btn-futuristic px-4 py-2 text-sm font-medium rounded-xl"
              style={{ borderColor: "rgba(168,85,247,0.25)" }}
            >
              🎬 Vidéo Promo
            </Link>
            <Link
              href="/share"
              className="btn-futuristic px-4 py-2 text-sm font-medium rounded-xl"
            >
              🎁 Inviter des amis
            </Link>
            <form action={logout}>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium rounded-xl transition"
                style={{
                  background: "rgba(239,68,68,0.15)",
                  border: "1px solid rgba(239,68,68,0.4)",
                  color: "#fca5a5",
                }}
              >
                Déconnexion
              </button>
            </form>
          </div>
        </div>

        {/* Referral - with special glow */}
        <div className="animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <ReferralCard userId={user.id} />
        </div>

        {/* Instagram-style tab bar + content grid */}
        <div className="mb-6 animate-slide-up" id="compagnons" style={{ animationDelay: "0.2s" }}>
          {/* Tab bar */}
          <div className="flex" style={{ borderBottom: "1px solid var(--c-border)" }}>
            <button
              onClick={() => setProfileTab("posts")}
              className="flex-1 flex flex-col items-center gap-1 py-3 transition-colors relative"
              style={{ color: profileTab === "posts" ? "var(--c-text)" : "var(--c-text-muted)" }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
              <span className="text-[10px] font-bold">{userPhotos.length}</span>
              {profileTab === "posts" && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: "#FBBF24" }} />
              )}
            </button>
            <button
              onClick={() => setProfileTab("reels")}
              className="flex-1 flex flex-col items-center gap-1 py-3 transition-colors relative"
              style={{ color: profileTab === "reels" ? "var(--c-text)" : "var(--c-text-muted)" }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="2"/><line x1="2" y1="8" x2="22" y2="8"/><line x1="8" y1="2" x2="8" y2="8"/><line x1="16" y1="2" x2="16" y2="8"/><polygon points="10,12 10,18 16,15"/></svg>
              <span className="text-[10px] font-bold">{userReels.length}</span>
              {profileTab === "reels" && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: "#FBBF24" }} />
              )}
            </button>
            <button
              onClick={() => setProfileTab("animals")}
              className="flex-1 flex flex-col items-center gap-1 py-3 transition-colors relative"
              style={{ color: profileTab === "animals" ? "var(--c-text)" : "var(--c-text-muted)" }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21c-1.5 0-6-3.5-6-8.5C6 9 8.5 7 10 6c.7-.5 1.3-1.5 2-3 .7 1.5 1.3 2.5 2 3 1.5 1 4 3 4 6.5 0 5-4.5 8.5-6 8.5z"/><circle cx="8" cy="5" r="2"/><circle cx="16" cy="5" r="2"/><circle cx="5" cy="10" r="1.5"/><circle cx="19" cy="10" r="1.5"/></svg>
              <span className="text-[10px] font-bold">{animals.length}</span>
              {profileTab === "animals" && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: "#FBBF24" }} />
              )}
            </button>
          </div>

          {/* Publications tab */}
          {profileTab === "posts" && (
            <div className="pt-3">
              {userPhotos.length === 0 ? (
                <div className="text-center py-12 glass-strong rounded-2xl" style={{ border: "1px solid var(--c-border)" }}>
                  <p className="text-3xl mb-2">{"📷"}</p>
                  <p className="text-sm" style={{ color: "var(--c-text-muted)" }}>Aucune publication</p>
                </div>
              ) : (
                <>
                  <p className="text-xs font-semibold mb-3" style={{ color: "var(--c-text-muted)" }}>{userPhotos.length} publication{userPhotos.length > 1 ? "s" : ""}</p>
                  <div className="grid grid-cols-3 gap-[2px] rounded-xl overflow-hidden">
                    {userPhotos.map((photo) => (
                      <Link
                        key={photo.id}
                        href={photo.type === "animal" ? `/animals/${photo.id}` : `/stories`}
                        className="block aspect-square relative overflow-hidden group"
                        style={{ background: "var(--c-card)" }}
                      >
                        <Image
                          src={photo.url}
                          alt=""
                          fill
                          className="object-cover transition-transform group-hover:scale-105"
                          sizes="(max-width: 768px) 33vw, 150px"
                        />
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Reels tab */}
          {profileTab === "reels" && (
            <div className="pt-3">
              {userReels.length === 0 ? (
                <div className="text-center py-12 glass-strong rounded-2xl" style={{ border: "1px solid var(--c-border)" }}>
                  <p className="text-3xl mb-2">{"🎬"}</p>
                  <p className="text-sm" style={{ color: "var(--c-text-muted)" }}>Aucun reel</p>
                  <Link href="/reels" className="inline-block mt-3 text-xs font-bold neon-green">Decouvrir les Reels</Link>
                </div>
              ) : (
                <>
                  <p className="text-xs font-semibold mb-3" style={{ color: "var(--c-text-muted)" }}>{userReels.length} reel{userReels.length > 1 ? "s" : ""}</p>
                  <div className="grid grid-cols-3 gap-[2px] rounded-xl overflow-hidden">
                    {userReels.map((reel) => (
                      <Link
                        key={reel.id}
                        href="/reels"
                        className="block aspect-[9/16] relative overflow-hidden group"
                        style={{ background: "var(--c-card)" }}
                      >
                        <video
                          src={reel.video_url}
                          className="w-full h-full object-cover"
                          muted
                          preload="metadata"
                          playsInline
                        />
                        {/* Play overlay */}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="white" opacity="0.9"><polygon points="8,5 19,12 8,19"/></svg>
                        </div>
                        {/* View count */}
                        <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><polygon points="8,5 19,12 8,19"/></svg>
                          <span className="text-[10px] font-bold text-white drop-shadow">{reel.views >= 1000 ? `${(reel.views / 1000).toFixed(1)}k` : reel.views}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Animaux tab (existing Mes compagnons content) */}
          {profileTab === "animals" && (
            <div className="pt-3">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-[var(--c-text)]">Mes compagnons</h2>
                <Link href="/profile/animals/new" className="btn-futuristic neon-green px-4 py-2 text-sm font-bold rounded-xl">
                  + Ajouter
                </Link>
              </div>

              {animals.length === 0 ? (
                <div className="text-center py-12 glass-strong gradient-border rounded-2xl">
                  <p className="text-4xl mb-3">{"🐾"}</p>
                  <p className="text-[var(--c-text-muted)] text-sm">Aucun compagnon pour l&apos;instant</p>
                  <Link href="/profile/animals/new" className="inline-block mt-4 btn-futuristic neon-green px-5 py-2 text-sm font-bold rounded-xl">
                    + Ajouter mon premier compagnon
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {animals.map((animal, idx) => (
                    <div
                      key={animal.id}
                      className="glass card-futuristic rounded-2xl overflow-hidden animate-slide-up"
                      style={{
                        border: "1px solid var(--c-border)",
                        animationDelay: `${0.25 + idx * 0.05}s`,
                      }}
                    >
                      <Link href={`/animals/${animal.id}`} className="block">
                        <div className="aspect-square flex items-center justify-center overflow-hidden relative" style={{ background: "var(--c-card)" }}>
                          {animal.photo_url
                            ? <Image src={animal.photo_url} alt={animal.name} fill className="object-cover" sizes="(max-width: 768px) 50vw, 200px" />
                            : <span className="text-5xl">{EMOJI_MAP[animal.species] || "🐾"}</span>}
                        </div>
                        <div className="p-3">
                          <p className="font-bold text-[var(--c-text)] text-sm truncate">{animal.name}</p>
                          <p className="text-xs text-[var(--c-text-muted)] truncate">{animal.breed || animal.species}</p>
                        </div>
                      </Link>
                      <div className="px-3 pb-3">
                        {animal.canton && (
                          <span
                            className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full neon-green"
                            style={{
                              background: "rgba(251,191,36,0.12)",
                              border: "1px solid rgba(251,191,36,0.2)",
                            }}
                          >
                            {animal.canton}
                          </span>
                        )}
                        <div className="flex gap-2 mt-3">
                          <Link
                            href={"/animals/" + animal.id + "/edit"}
                            className="flex-1 py-1.5 text-center text-xs font-bold glass rounded-lg transition"
                            style={{
                              color: "var(--c-text-muted)",
                              border: "1px solid var(--c-border)",
                              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                            }}
                          >
                            Modifier
                          </Link>
                          <button
                            onClick={() => setDeletingAnimal(animal.id)}
                            className="flex-1 py-1.5 text-xs font-bold rounded-lg transition"
                            style={{
                              background: "rgba(239,68,68,0.08)",
                              color: "#f87171",
                              border: "1px solid rgba(239,68,68,0.15)",
                              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                            }}
                          >
                            Supprimer
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pawband Wrapped */}
        {wrappedStats && (
          <div className="mb-6 animate-slide-up" style={{ animationDelay: "0.25s" }}>
            <div
              className="rounded-2xl p-6 relative overflow-hidden"
              style={{
                background: "linear-gradient(135deg, rgba(251,191,36,0.2), rgba(168,85,247,0.2))",
                border: "1px solid rgba(251,191,36,0.25)",
                boxShadow: "0 0 30px rgba(251,191,36,0.1), 0 0 60px rgba(168,85,247,0.05)",
              }}
            >
              <div
                className="absolute -top-10 -right-10 text-[120px] opacity-[0.06] pointer-events-none select-none"
              >
                {"\uD83C\uDF81"}
              </div>
              <h3
                className="text-lg font-black mb-4"
                style={{
                  background: "linear-gradient(135deg, #FBBF24, #a78bfa)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {"\uD83C\uDF81"} Ton Pawband Wrapped
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
                <div className="glass rounded-xl p-3 text-center" style={{ border: "1px solid rgba(251,191,36,0.15)" }}>
                  <p className="text-2xl font-black" style={{ color: "#FBBF24", textShadow: "0 0 12px rgba(251,191,36,0.4)" }}>
                    {wrappedStats.totalMatches}
                  </p>
                  <p className="text-[10px] font-bold uppercase" style={{ color: "var(--c-text-muted)" }}>Matchs</p>
                </div>
                <div className="glass rounded-xl p-3 text-center" style={{ border: "1px solid rgba(168,85,247,0.15)" }}>
                  <p className="text-2xl font-black" style={{ color: "#a78bfa", textShadow: "0 0 12px rgba(168,85,247,0.4)" }}>
                    {wrappedStats.totalReels}
                  </p>
                  <p className="text-[10px] font-bold uppercase" style={{ color: "var(--c-text-muted)" }}>Reels</p>
                </div>
                <div className="glass rounded-xl p-3 text-center" style={{ border: "1px solid rgba(239,68,68,0.15)" }}>
                  <p className="text-2xl font-black" style={{ color: "#f87171", textShadow: "0 0 12px rgba(239,68,68,0.4)" }}>
                    {wrappedStats.totalLikes}
                  </p>
                  <p className="text-[10px] font-bold uppercase" style={{ color: "var(--c-text-muted)" }}>Likes recus</p>
                </div>
                <div className="glass rounded-xl p-3 text-center" style={{ border: "1px solid rgba(251,191,36,0.15)" }}>
                  <p className="text-2xl font-black" style={{ color: "#FBBF24", textShadow: "0 0 12px rgba(251,191,36,0.4)" }}>
                    {wrappedStats.favoriteSpecies}
                  </p>
                  <p className="text-[10px] font-bold uppercase" style={{ color: "var(--c-text-muted)" }}>Espece preferee</p>
                </div>
                <div className="glass rounded-xl p-3 text-center" style={{ border: "1px solid rgba(59,130,246,0.15)" }}>
                  <p className="text-2xl font-black" style={{ color: "#3b82f6", textShadow: "0 0 12px rgba(59,130,246,0.4)" }}>
                    {wrappedStats.daysOnPawband}
                  </p>
                  <p className="text-[10px] font-bold uppercase" style={{ color: "var(--c-text-muted)" }}>Jours sur Pawband</p>
                </div>
                <div className="glass rounded-xl p-3 text-center" style={{ border: "1px solid rgba(252,211,77,0.15)" }}>
                  <p className="text-2xl font-black" style={{ color: "#FCD34D", textShadow: "0 0 12px rgba(252,211,77,0.4)" }}>
                    {wrappedStats.totalCoins}
                  </p>
                  <p className="text-[10px] font-bold uppercase" style={{ color: "var(--c-text-muted)" }}>PawCoins</p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: "Mon Pawband Wrapped",
                      text: `Sur Pawband : ${wrappedStats.totalMatches} matchs, ${wrappedStats.totalReels} reels, ${wrappedStats.totalLikes} likes ! Mon espece preferee : ${wrappedStats.favoriteSpecies}. ${wrappedStats.daysOnPawband} jours sur Pawband !`,
                      url: window.location.origin,
                    }).catch(() => {});
                  }
                }}
                className="w-full py-2.5 rounded-xl font-bold text-sm transition-all hover:scale-[1.02]"
                style={{
                  background: "linear-gradient(135deg, #FBBF24, #a78bfa)",
                  color: "#fff",
                  boxShadow: "0 4px 20px rgba(251,191,36,0.25), 0 4px 20px rgba(168,85,247,0.15)",
                }}
              >
                {"\uD83D\uDCE4"} Partage tes stats
              </button>
            </div>
          </div>
        )}

        {/* Utilisateurs bloqués */}
        <div className="mb-6 animate-slide-up" style={{ animationDelay: "0.3s" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[var(--c-text)]">Utilisateurs bloqués</h2>
            <button
              onClick={fetchBlockedUsers}
              className="btn-futuristic px-3 py-1.5 text-xs font-bold rounded-xl"
            >
              {loadingBlocked ? "..." : "Voir"}
            </button>
          </div>

          {blockedUsers.length === 0 && !loadingBlocked && (
            <div className="text-center py-8 glass-strong rounded-2xl" style={{ border: "1px solid var(--c-border)" }}>
              <p className="text-sm" style={{ color: "var(--c-text-muted)" }}>
                Aucun utilisateur bloqué
              </p>
            </div>
          )}

          {blockedUsers.length > 0 && (
            <div className="glass-strong rounded-2xl overflow-hidden" style={{ border: "1px solid var(--c-border)" }}>
              {blockedUsers.map((u, i) => (
                <div
                  key={u.user_id}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{
                    borderBottom: i < blockedUsers.length - 1 ? "1px solid var(--c-border)" : "none",
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 glass"
                  >
                    <span className="text-xs font-bold" style={{ color: "var(--c-text-muted)" }}>
                      {(u.full_name || u.email || "?").charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--c-text)" }}>
                      {u.full_name || u.email || "Utilisateur"}
                    </p>
                    {u.reason && (
                      <p className="text-xs truncate" style={{ color: "var(--c-text-muted)" }}>
                        {u.reason}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => unblockUser(u.user_id)}
                    className="btn-futuristic px-3 py-1.5 text-xs font-bold rounded-lg"
                    style={{
                      color: "#FBBF24",
                      borderColor: "rgba(251,191,36,0.25)",
                    }}
                  >
                    Debloquer
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RGPD - Export des donnees */}
        <div
          className="glass rounded-2xl p-5 animate-slide-up"
          style={{
            border: "1px solid rgba(13,148,136,0.2)",
            boxShadow: "0 0 20px rgba(13,148,136,0.05)",
            animationDelay: "0.35s",
          }}
        >
          <h3 className="font-bold text-teal-400 text-sm mb-2" style={{ textShadow: "0 0 8px rgba(13,148,136,0.3)" }}>
            📋 Mes donnees (RGPD/nLPD)
          </h3>
          <p className="text-xs text-[var(--c-text-muted)] mb-4">
            Tu as le droit d&apos;exporter toutes tes donnees personnelles conformement au RGPD (art. 20) et a la nLPD suisse.
          </p>
          <a
            href="/api/user/export"
            download
            className="px-4 py-2 text-sm font-bold rounded-xl transition hover:scale-105 inline-block"
            style={{
              background: "rgba(13,148,136,0.15)",
              color: "#5eead4",
              border: "1px solid rgba(13,148,136,0.3)",
            }}
          >
            📥 Exporter mes donnees (JSON)
          </a>
        </div>

        {/* Zone danger - glass with red neon edge */}
        <div
          className="glass rounded-2xl p-5 animate-slide-up"
          style={{
            border: "1px solid rgba(239,68,68,0.2)",
            boxShadow: "0 0 20px rgba(239,68,68,0.05)",
            animationDelay: "0.4s",
          }}
        >
          <h3 className="font-bold text-red-400 text-sm mb-2" style={{ textShadow: "0 0 8px rgba(239,68,68,0.3)" }}>
            ⚠️ Zone de danger
          </h3>
          <p className="text-xs text-[var(--c-text-muted)] mb-4">La suppression de ton compte est irreversible. Tous tes animaux et matchs seront supprimes.</p>
          <button
            onClick={() => setShowDeleteProfile(true)}
            className="px-4 py-2 text-sm font-bold rounded-xl transition hover:scale-105"
            style={{
              background: "rgba(239,68,68,0.2)",
              color: "#fca5a5",
              border: "1px solid rgba(239,68,68,0.4)",
            }}
          >
            🗑️ Supprimer mon compte
          </button>
        </div>
      </div>

      {/* Modal suppression animal */}
      {deletingAnimal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="glass-strong gradient-border rounded-2xl p-6 max-w-sm w-full text-center animate-slide-up">
            <p className="text-3xl mb-3">🗑️</p>
            <h3 className="font-bold text-[var(--c-text)] mb-2">Supprimer ce compagnon ?</h3>
            <p className="text-sm text-[var(--c-text-muted)] mb-5">Cette action est irreversible.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingAnimal(null)}
                className="btn-futuristic flex-1 py-2.5 font-bold rounded-xl text-sm"
              >
                Annuler
              </button>
              <button
                onClick={() => deleteAnimal(deletingAnimal)}
                disabled={loading}
                className="flex-1 py-2.5 font-bold rounded-xl text-sm disabled:opacity-50 transition"
                style={{
                  background: "linear-gradient(135deg, rgba(239,68,68,0.8), rgba(220,38,38,0.9))",
                  color: "#fff",
                  boxShadow: "0 0 20px rgba(239,68,68,0.3)",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              >
                {loading ? "..." : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal suppression profil */}
      {showDeleteProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="glass-strong gradient-border rounded-2xl p-6 max-w-sm w-full text-center animate-slide-up">
            <p className="text-3xl mb-3">⚠️</p>
            <h3 className="font-bold text-[var(--c-text)] mb-2">Supprimer ton compte ?</h3>
            <p className="text-sm text-[var(--c-text-muted)] mb-5">Tous tes animaux, matchs et messages seront supprimes definitivement.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteProfile(false)}
                className="btn-futuristic flex-1 py-2.5 font-bold rounded-xl text-sm"
              >
                Annuler
              </button>
              <button
                onClick={deleteProfile}
                disabled={loading}
                className="flex-1 py-2.5 font-bold rounded-xl text-sm disabled:opacity-50 transition"
                style={{
                  background: "linear-gradient(135deg, rgba(239,68,68,0.8), rgba(220,38,38,0.9))",
                  color: "#fff",
                  boxShadow: "0 0 20px rgba(239,68,68,0.3)",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              >
                {loading ? "..." : "Supprimer definitivement"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Avatar crop modal */}
      {avatarCropFile && (
        <ImageCropper
          file={avatarCropFile}
          aspectRatio={1}
          outputWidth={512}
          title="Recadrer ta photo"
          onConfirm={handleAvatarCropped}
          onCancel={() => setAvatarCropFile(null)}
        />
      )}

      {/* Hover styles */}
      {/* Followers/Following list modal */}
      {showFollowersList && (
        <FollowersList
          userId={user.id}
          type={showFollowersList}
          onClose={() => setShowFollowersList(null)}
        />
      )}

      <style>{`
        .profile-name-hover:hover {
          background: linear-gradient(135deg, #FBBF24, #a78bfa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .profile-stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 24px var(--c-border) !important;
        }
      `}</style>
    </div>
  );
}
