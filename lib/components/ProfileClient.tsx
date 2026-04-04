"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PushButton from "./PushButton";
import { useAppContext } from "@/lib/contexts/AppContext";

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

  const subColor = profile?.subscription === "pro"
    ? "bg-purple-500/20 text-purple-300"
    : profile?.subscription === "premium"
    ? "bg-orange-500/20 text-orange-300"
    : "bg-[var(--c-border)] text-[var(--c-text-muted)]";

  return (
    <div className="min-h-screen bg-[var(--c-bg,var(--c-deep))] px-4 py-8">
      <div className="max-w-2xl mx-auto">

        {/* Carte profil */}
        <div className="bg-[var(--c-card)] border border-[var(--c-border)] rounded-2xl p-6 mb-6 shadow-sm">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xl font-bold text-orange-400">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-[var(--c-text)] truncate">{profile?.full_name || "Utilisateur"}</h1>
              <p className="text-sm text-[var(--c-text-muted)] truncate">{user.email}</p>
              <span className={"inline-block mt-1 text-xs px-3 py-1 rounded-full font-semibold " + subColor}>{subLabel}</span>
            </div>
          </div>

          {/* Stats engagement */}
          <div className="grid grid-cols-4 gap-2 mb-5">
            <div className="bg-orange-500/10 rounded-xl p-3 text-center">
              <p className="text-lg font-black text-orange-400">{stats.animals}</p>
              <p className="text-[9px] text-[var(--c-text-muted)] font-bold uppercase">Animaux</p>
            </div>
            <div className="bg-green-500/10 rounded-xl p-3 text-center">
              <p className="text-lg font-black text-green-400">{stats.matches}</p>
              <p className="text-[9px] text-[var(--c-text-muted)] font-bold uppercase">Matchs</p>
            </div>
            <div className="bg-blue-500/10 rounded-xl p-3 text-center">
              <p className="text-lg font-black text-blue-400">{stats.messages}</p>
              <p className="text-[9px] text-[var(--c-text-muted)] font-bold uppercase">Messages</p>
            </div>
            <div className="bg-purple-500/10 rounded-xl p-3 text-center">
              <p className="text-lg font-black text-purple-400">{stats.days}j</p>
              <p className="text-[9px] text-[var(--c-text-muted)] font-bold uppercase">Membre</p>
            </div>
          </div>

          {(profile?.city || profile?.phone) && (
            <div className="grid grid-cols-2 gap-3 mb-5">
              {profile?.city && (
                <div className="bg-[var(--c-deep)]/30 rounded-xl p-3">
                  <p className="text-xs text-[var(--c-text-muted)] mb-1">Ville</p>
                  <p className="text-sm font-medium text-[var(--c-text)]">{profile.city}</p>
                </div>
              )}
              {profile?.phone && (
                <div className="bg-[var(--c-deep)]/30 rounded-xl p-3">
                  <p className="text-xs text-[var(--c-text-muted)] mb-1">Téléphone</p>
                  <p className="text-sm font-medium text-[var(--c-text)]">{profile.phone}</p>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Link href="/profile/edit"
              className="px-4 py-2 bg-[var(--c-border)] text-[var(--c-text)] text-sm font-medium rounded-xl hover:opacity-80 transition">
              ✏️ Modifier
            </Link>
            <PushButton />
            <Link href="/pricing"
              className="px-4 py-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 text-sm font-medium rounded-xl transition border border-orange-500/20">
              {profile?.subscription === "free" ? "⭐ Passer Premium" : "⚙️ Gérer mon plan"}
            </Link>
            <form action={logout}>
              <button type="submit"
                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium rounded-xl transition border border-red-500/20">
                Déconnexion
              </button>
            </form>
          </div>
        </div>

        {/* Mes compagnons */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[var(--c-text)]">Mes compagnons</h2>
            <Link href="/profile/animals/new"
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-xl transition">
              + Ajouter
            </Link>
          </div>

          {animals.length === 0 ? (
            <div className="text-center py-12 bg-[var(--c-card)] border border-[var(--c-border)] rounded-2xl">
              <p className="text-4xl mb-3">🐾</p>
              <p className="text-[var(--c-text-muted)] text-sm">Aucun compagnon pour l'instant</p>
              <Link href="/profile/animals/new"
                className="inline-block mt-4 px-5 py-2 bg-orange-500 text-white text-sm font-bold rounded-xl">
                + Ajouter mon premier compagnon
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {animals.map(animal => (
                <div key={animal.id} className="bg-[var(--c-card)] border border-[var(--c-border)] rounded-2xl overflow-hidden">
                  <div className="h-36 bg-[var(--c-deep)]/50 flex items-center justify-center overflow-hidden relative">
                    {animal.photo_url
                      ? <img src={animal.photo_url} alt={animal.name} className="w-full h-full object-cover" />
                      : <span className="text-5xl">{EMOJI_MAP[animal.species] || "🐾"}</span>}
                  </div>
                  <div className="p-3">
                    <p className="font-bold text-[var(--c-text)] text-sm truncate">{animal.name}</p>
                    <p className="text-xs text-[var(--c-text-muted)] truncate">{animal.breed || animal.species}</p>
                    {animal.canton && <span className="inline-block mt-1 text-[10px] px-2 py-0.5 bg-orange-500/15 text-orange-400 rounded-full">{animal.canton}</span>}
                    <div className="flex gap-2 mt-3">
                      <Link href={"/animals/" + animal.id + "/edit"}
                        className="flex-1 py-1.5 text-center text-xs font-bold bg-[var(--c-border)] text-[var(--c-text-muted)] rounded-lg hover:opacity-80 transition">
                        ✏️ Modifier
                      </Link>
                      <button onClick={() => setDeletingAnimal(animal.id)}
                        className="flex-1 py-1.5 text-xs font-bold bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition">
                        🗑️ Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Zone danger */}
        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5">
          <h3 className="font-bold text-red-400 text-sm mb-2">⚠️ Zone de danger</h3>
          <p className="text-xs text-[var(--c-text-muted)] mb-4">La suppression de ton compte est irréversible. Tous tes animaux et matchs seront supprimés.</p>
          <button onClick={() => setShowDeleteProfile(true)}
            className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-bold rounded-xl transition border border-red-500/20">
            🗑️ Supprimer mon compte
          </button>
        </div>
      </div>

      {/* Modal suppression animal */}
      {deletingAnimal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[var(--c-card)] border border-[var(--c-border)] rounded-2xl p-6 max-w-sm w-full text-center">
            <p className="text-3xl mb-3">🗑️</p>
            <h3 className="font-bold text-[var(--c-text)] mb-2">Supprimer ce compagnon ?</h3>
            <p className="text-sm text-[var(--c-text-muted)] mb-5">Cette action est irréversible.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingAnimal(null)}
                className="flex-1 py-2.5 bg-[var(--c-border)] text-[var(--c-text-muted)] font-bold rounded-xl text-sm">
                Annuler
              </button>
              <button onClick={() => deleteAnimal(deletingAnimal)} disabled={loading}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl text-sm disabled:opacity-50">
                {loading ? "..." : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal suppression profil */}
      {showDeleteProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[var(--c-card)] border border-[var(--c-border)] rounded-2xl p-6 max-w-sm w-full text-center">
            <p className="text-3xl mb-3">⚠️</p>
            <h3 className="font-bold text-[var(--c-text)] mb-2">Supprimer ton compte ?</h3>
            <p className="text-sm text-[var(--c-text-muted)] mb-5">Tous tes animaux, matchs et messages seront supprimés définitivement.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteProfile(false)}
                className="flex-1 py-2.5 bg-[var(--c-border)] text-[var(--c-text-muted)] font-bold rounded-xl text-sm">
                Annuler
              </button>
              <button onClick={deleteProfile} disabled={loading}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl text-sm disabled:opacity-50">
                {loading ? "..." : "Supprimer définitivement"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
