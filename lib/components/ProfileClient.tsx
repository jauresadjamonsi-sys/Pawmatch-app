"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PushButton from "./PushButton";
import { useAppContext } from "@/lib/contexts/AppContext";
import { BadgesSection } from "./Badges";
import ReferralCard from "./ReferralCard";

const EMOJI_MAP: Record<string, string> = {
  chien: "🐕", chat: "🐱", lapin: "🐰",
  oiseau: "🐦", rongeur: "🐹", autre: "🐾",
};

interface Props {
  profile: any;
  animals: any[];
  user: { id: string; email: string };
  subLabel: string;
  stats: { matches: number; messages: number; days: number; animals: number };
  initials: string;
  logout: () => Promise<void>;
}

export default function ProfileClient({ profile, animals: initialAnimals, user, subLabel, initials, logout, stats }: Props) {
  const { t } = useAppContext();
  const [animals, setAnimals] = useState(initialAnimals);
  const [showDeleteProfile, setShowDeleteProfile] = useState(false);
  const [deletingAnimal, setDeletingAnimal] = useState<string|null>(null);
  const [loading, setLoading] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);
  const router = useRouter();
  const supabase = createClient();

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
    } catch {}
    setLoadingBlocked(false);
  }

  async function unblockUser(userId: string) {
    try {
      const res = await fetch(`/api/block/${userId}`, { method: "DELETE" });
      if (res.ok) {
        setBlockedUsers(prev => prev.filter(u => u.user_id !== userId));
      }
    } catch {}
  }

  const isPremium = profile?.subscription === "premium" || profile?.subscription === "pro";

  const subColor = profile?.subscription === "pro"
    ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
    : profile?.subscription === "premium"
    ? "bg-orange-500/20 text-orange-300 border border-orange-500/30"
    : "bg-[var(--c-border)] text-[var(--c-text-muted)]";

  return (
    <div className="min-h-screen bg-[var(--c-bg,var(--c-deep))] px-4 py-8">
      <div className="max-w-2xl mx-auto">

        {/* Profile card - glass with gradient border */}
        <div className="glass-strong gradient-border card-futuristic rounded-2xl p-6 mb-6 animate-slide-up">
          <div className="flex items-center gap-4 mb-5">
            {/* Avatar with animated gradient border */}
            <div className="gradient-border flex-shrink-0" style={{ borderRadius: "50%", padding: 2 }}>
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{
                  background: "rgba(249,115,22,0.15)",
                  boxShadow: isPremium
                    ? "0 0 20px rgba(249,115,22,0.3), 0 0 40px rgba(167,139,250,0.15)"
                    : "none",
                }}
              >
                <span className="text-xl font-bold text-orange-400">{initials}</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h1
                className="text-xl font-bold text-[var(--c-text)] truncate profile-name-hover"
                style={{ transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)" }}
              >
                {profile?.full_name || "Utilisateur"}
              </h1>
              <p className="text-sm text-[var(--c-text-muted)] truncate">{user.email}</p>
              <span
                className={"inline-block mt-1 text-xs px-3 py-1 rounded-full font-semibold " + subColor}
                style={isPremium ? { boxShadow: "0 0 12px rgba(249,115,22,0.2)" } : {}}
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
          <div className="grid grid-cols-4 gap-2 mb-5">
            <button
              onClick={() => document.getElementById("compagnons")?.scrollIntoView({ behavior: "smooth" })}
              className="glass rounded-xl p-3 text-center transition cursor-pointer profile-stat-card"
              style={{
                border: "1px solid rgba(249,115,22,0.15)",
                boxShadow: "0 0 12px rgba(249,115,22,0.05)",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              <p className="text-lg font-black neon-orange">{stats.animals}</p>
              <p className="text-[9px] text-[var(--c-text-muted)] font-bold uppercase">Animaux</p>
            </button>
            <Link
              href="/matches"
              className="glass rounded-xl p-3 text-center transition cursor-pointer block profile-stat-card"
              style={{
                border: "1px solid rgba(34,197,94,0.15)",
                boxShadow: "0 0 12px rgba(34,197,94,0.05)",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              <p className="text-lg font-black" style={{ color: "#22c55e", textShadow: "0 0 8px rgba(34,197,94,0.3)" }}>{stats.matches}</p>
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
                <div className="glass rounded-xl p-3" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                  <p className="text-xs text-[var(--c-text-muted)] mb-1">Ville</p>
                  <p className="text-sm font-medium text-[var(--c-text)]">{profile.city}</p>
                </div>
              )}
              {profile?.phone && (
                <div className="glass rounded-xl p-3" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
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
              className="btn-futuristic px-4 py-2 text-sm font-medium rounded-xl neon-orange"
            >
              {profile?.subscription === "free" ? "⭐ Passer Premium" : "⚙️ Gérer mon plan"}
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

        {/* Mes compagnons */}
        <div className="mb-6 animate-slide-up" id="compagnons" style={{ animationDelay: "0.2s" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[var(--c-text)]">Mes compagnons</h2>
            <Link href="/profile/animals/new" className="btn-futuristic neon-orange px-4 py-2 text-sm font-bold rounded-xl">
              + Ajouter
            </Link>
          </div>

          {animals.length === 0 ? (
            <div className="text-center py-12 glass-strong gradient-border rounded-2xl">
              <p className="text-4xl mb-3">🐾</p>
              <p className="text-[var(--c-text-muted)] text-sm">Aucun compagnon pour l&apos;instant</p>
              <Link href="/profile/animals/new" className="inline-block mt-4 btn-futuristic neon-orange px-5 py-2 text-sm font-bold rounded-xl">
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
                    border: "1px solid rgba(255,255,255,0.06)",
                    animationDelay: `${0.25 + idx * 0.05}s`,
                  }}
                >
                  <div className="h-36 flex items-center justify-center overflow-hidden relative" style={{ background: "rgba(255,255,255,0.02)" }}>
                    {animal.photo_url
                      ? <img src={animal.photo_url} alt={animal.name} className="w-full h-full object-cover" />
                      : <span className="text-5xl">{EMOJI_MAP[animal.species] || "🐾"}</span>}
                  </div>
                  <div className="p-3">
                    <p className="font-bold text-[var(--c-text)] text-sm truncate">{animal.name}</p>
                    <p className="text-xs text-[var(--c-text-muted)] truncate">{animal.breed || animal.species}</p>
                    {animal.canton && (
                      <span
                        className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full neon-orange"
                        style={{
                          background: "rgba(249,115,22,0.12)",
                          border: "1px solid rgba(249,115,22,0.2)",
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
                          border: "1px solid rgba(255,255,255,0.08)",
                          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                        }}
                      >
                        ✏️ Modifier
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
                        🗑️ Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Utilisateurs bloques */}
        <div className="mb-6 animate-slide-up" style={{ animationDelay: "0.3s" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[var(--c-text)]">Utilisateurs bloques</h2>
            <button
              onClick={fetchBlockedUsers}
              className="btn-futuristic px-3 py-1.5 text-xs font-bold rounded-xl"
            >
              {loadingBlocked ? "..." : "Voir"}
            </button>
          </div>

          {blockedUsers.length === 0 && !loadingBlocked && (
            <div className="text-center py-8 glass-strong rounded-2xl" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-sm" style={{ color: "var(--c-text-muted)" }}>
                Aucun utilisateur bloque
              </p>
            </div>
          )}

          {blockedUsers.length > 0 && (
            <div className="glass-strong rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
              {blockedUsers.map((u, i) => (
                <div
                  key={u.user_id}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{
                    borderBottom: i < blockedUsers.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
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
                      color: "#22c55e",
                      borderColor: "rgba(34,197,94,0.25)",
                    }}
                  >
                    Debloquer
                  </button>
                </div>
              ))}
            </div>
          )}
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
            className="btn-futuristic px-4 py-2 text-sm font-bold rounded-xl"
            style={{
              color: "#f87171",
              borderColor: "rgba(239,68,68,0.25)",
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

      {/* Hover styles */}
      <style>{`
        .profile-name-hover:hover {
          background: linear-gradient(135deg, #f97316, #a78bfa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .profile-stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 24px rgba(255,255,255,0.06) !important;
        }
      `}</style>
    </div>
  );
}
