"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { useAppContext } from "@/lib/contexts/AppContext";
import { CANTONS } from "@/lib/cantons";
import Link from "next/link";

type Group = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  canton: string | null;
  species: string | null;
  icon: string | null;
  created_by: string;
  created_at: string;
  member_count: number;
  is_member?: boolean;
};

const CATEGORY_OPTIONS = [
  { value: "Race", label: "Race" },
  { value: "Canton", label: "Canton" },
  { value: "Activite", label: "Activite" },
  { value: "Autre", label: "Autre" },
];

const CATEGORY_ICONS: Record<string, string> = {
  Race: "🐾",
  Canton: "🏔️",
  Activite: "🎾",
  Autre: "✨",
};

const DEFAULT_ICONS = ["🐕", "🐱", "🐾", "🦴", "🏔️", "🎾", "🐰", "🐦", "🐹", "🌿", "❤️", "⭐"];

type Tab = "popular" | "my" | "canton";

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("popular");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [joining, setJoining] = useState<string | null>(null);
  const { profile } = useAuth();
  const { t } = useAppContext();
  const supabase = createClient();

  // Create form state
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "Race",
    canton: "",
    species: "",
    icon: "🐾",
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    fetchGroups();
  }, [profile]);

  async function fetchGroups() {
    setLoading(true);
    setFetchError(null);
    try {
      const { data: groupsData, error } = await supabase
        .from("groups")
        .select("*")
        .order("member_count", { ascending: false });

      if (error) {
        console.error("[Groups] query error:", error);
        setFetchError("Impossible de charger les groupes. Reessayez.");
        setLoading(false);
        return;
      }
      if (!groupsData) {
        setLoading(false);
        return;
      }

      // Check which groups the user has joined
      const joinedSet = new Set<string>();
      if (profile) {
        const groupIds = groupsData.map((g) => g.id);
        if (groupIds.length > 0) {
          const { data: memberships } = await supabase
            .from("group_members")
            .select("group_id")
            .eq("user_id", profile.id)
            .in("group_id", groupIds);
          for (const m of memberships || []) {
            joinedSet.add(m.group_id);
          }
        }
      }

      const enriched: Group[] = groupsData.map((g) => ({
        ...g,
        is_member: joinedSet.has(g.id),
      }));

      setGroups(enriched);
    } catch (err) {
      console.error("[Groups] fetchGroups error:", err);
      setFetchError("Erreur inattendue. Reessayez plus tard.");
    } finally {
      setLoading(false);
    }
  }

  async function handleJoinLeave(groupId: string, isMember: boolean) {
    if (!profile) {
      window.location.href = "/login";
      return;
    }
    setJoining(groupId);

    try {
      if (isMember) {
        await supabase
          .from("group_members")
          .delete()
          .eq("group_id", groupId)
          .eq("user_id", profile.id);

        // Decrement member_count
        const group = groups.find((g) => g.id === groupId);
        if (group) {
          await supabase
            .from("groups")
            .update({ member_count: Math.max(0, group.member_count - 1) })
            .eq("id", groupId);
        }
      } else {
        await supabase
          .from("group_members")
          .insert({ group_id: groupId, user_id: profile.id });

        // Increment member_count
        const group = groups.find((g) => g.id === groupId);
        if (group) {
          await supabase
            .from("groups")
            .update({ member_count: group.member_count + 1 })
            .eq("id", groupId);
        }
      }

      await fetchGroups();
    } catch (err) {
      console.error("[Groups] join/leave error:", err);
    } finally {
      setJoining(null);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setCreating(true);
    setCreateError(null);

    const { error } = await supabase.from("groups").insert({
      name: form.name,
      description: form.description || null,
      category: form.category,
      canton: form.canton || null,
      species: form.species || null,
      icon: form.icon || "🐾",
      created_by: profile.id,
      member_count: 1,
    });

    if (error) {
      setCreating(false);
      setCreateError(error.message);
      return;
    }

    // Auto-join the creator
    const { data: newGroup } = await supabase
      .from("groups")
      .select("id")
      .eq("name", form.name)
      .eq("created_by", profile.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (newGroup) {
      await supabase
        .from("group_members")
        .insert({ group_id: newGroup.id, user_id: profile.id });
    }

    setCreating(false);
    setShowCreate(false);
    setForm({
      name: "",
      description: "",
      category: "Race",
      canton: "",
      species: "",
      icon: "🐾",
    });
    fetchGroups();
  }

  // Filtered groups based on tab and search
  const filteredGroups = useMemo(() => {
    let result = groups;

    // Tab filter
    if (activeTab === "my") {
      result = result.filter((g) => g.is_member);
    } else if (activeTab === "canton") {
      result = result.filter((g) => g.category === "Canton");
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          (g.description && g.description.toLowerCase().includes(q)) ||
          (g.canton && g.canton.toLowerCase().includes(q)) ||
          g.category.toLowerCase().includes(q)
      );
    }

    return result;
  }, [groups, activeTab, search]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "popular", label: "Populaires" },
    { key: "my", label: "Mes groupes" },
    { key: "canton", label: "Par canton" },
  ];

  return (
    <main className="min-h-screen pb-32" style={{ background: "var(--c-deep)" }}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <button onClick={() => window.history.length > 1 ? window.history.back() : (window.location.href = "/feed")} aria-label="Retour" className="inline-flex items-center justify-center w-9 h-9 rounded-full transition-all active:scale-90 flex-shrink-0" style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--c-text)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <h1 className="text-3xl md:text-4xl font-extrabold gradient-text-warm">
              Communautes
            </h1>
          </div>
          <p className="text-[var(--c-text-muted)] text-sm md:text-base">
            Rejoins des groupes par race, canton ou activite
          </p>
        </div>

        {/* Search + Create button row */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--c-text-muted)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
            <input
              type="text"
              placeholder="Rechercher un groupe..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border border-[var(--c-border)] bg-[var(--c-card)] text-[var(--c-text)] placeholder:text-[var(--c-text-muted)] focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all"
            />
          </div>
          {profile ? (
            <button
              onClick={() => setShowCreate(true)}
              className="btn-press relative px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white text-sm font-bold shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-all whitespace-nowrap"
              style={{ backgroundSize: "200% 200%", animation: "gradient-shift 3s ease infinite" }}
            >
              <span className="absolute inset-0 rounded-xl" style={{ background: "linear-gradient(135deg, #F59E0B, #a78bfa, #F59E0B)", opacity: 0.3, filter: "blur(4px)", animation: "gradient-shift 3s ease infinite", backgroundSize: "200% 200%" }} />
              <span className="relative">+ Creer un groupe</span>
            </button>
          ) : !loading && (
            <button
              onClick={async () => {
                const s = createClient();
                await s.auth.signInWithOAuth({
                  provider: "google",
                  options: { redirectTo: window.location.origin + "/auth/callback" },
                });
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg transition-all whitespace-nowrap"
              style={{ background: "var(--c-card)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Connexion Google
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={
                "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 ease-out " +
                (activeTab === tab.key
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/20 scale-105"
                  : "glass text-[var(--c-text-muted)] hover:text-[var(--c-text)] hover:bg-[var(--c-glass)] hover:scale-[1.02]")
              }
            >
              {tab.label}
              {tab.key === "my" && profile && (
                <span className="ml-1.5 text-xs opacity-80">
                  ({groups.filter((g) => g.is_member).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl animate-shimmer overflow-hidden" style={{ border: "1px solid var(--c-border)" }}>
                <div className="p-5 flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl" style={{ background: "var(--c-glass)" }} />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 rounded-lg w-3/4" style={{ background: "var(--c-glass)" }} />
                      <div className="h-3 rounded-lg w-1/2" style={{ background: "var(--c-glass)" }} />
                    </div>
                  </div>
                  <div className="h-3 rounded-lg w-full" style={{ background: "var(--c-glass)" }} />
                  <div className="h-3 rounded-lg w-2/3" style={{ background: "var(--c-glass)" }} />
                  <div className="h-9 rounded-xl w-full mt-auto" style={{ background: "var(--c-glass)" }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {fetchError && !loading && (
          <div className="glass-strong rounded-2xl p-6 text-center">
            <p className="text-red-400 mb-3">{fetchError}</p>
            <button
              onClick={fetchGroups}
              className="px-4 py-2 rounded-xl bg-amber-500/20 text-amber-400 text-sm font-medium hover:bg-amber-500/30 transition-all"
            >
              Reessayer
            </button>
          </div>
        )}

        {/* Empty states */}
        {!loading && !fetchError && filteredGroups.length === 0 && (
          <div className="glass-strong rounded-2xl p-10 text-center">
            <div className="text-4xl mb-3">
              {activeTab === "my" ? "📭" : search ? "🔍" : "🐾"}
            </div>
            <p className="text-[var(--c-text)] font-semibold mb-1">
              {activeTab === "my"
                ? "Tu n'as rejoint aucun groupe"
                : search
                  ? "Aucun groupe trouve"
                  : "Aucun groupe disponible"}
            </p>
            <p className="text-[var(--c-text-muted)] text-sm">
              {activeTab === "my"
                ? "Explore les groupes populaires et rejoins ceux qui t'interessent !"
                : search
                  ? "Essaie avec d'autres mots-cles"
                  : "Sois le premier a creer un groupe !"}
            </p>
          </div>
        )}

        {/* Group cards grid */}
        {!loading && !fetchError && filteredGroups.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
            {filteredGroups.map((group) => (
              <div
                key={group.id}
                className="glass-strong rounded-2xl p-5 flex flex-col gap-3 card-hover animate-slide-up border border-[var(--c-border)]"
              >
                {/* Icon + Name */}
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[var(--c-glass)] flex items-center justify-center text-2xl shrink-0">
                    {group.icon || CATEGORY_ICONS[group.category] || "🐾"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/groups/${group.id}`}
                      className="font-bold text-[var(--c-text)] hover:text-amber-400 transition-colors line-clamp-1 block"
                    >
                      {group.name}
                    </Link>
                    <div className="flex items-center gap-2 mt-0.5">
                      {/* Overlapping avatar stack */}
                      <div className="flex items-center -space-x-1.5 group/avatars hover:space-x-0.5 transition-all duration-300">
                        {Array.from({ length: Math.min(group.member_count, 3) }).map((_, i) => (
                          <div
                            key={i}
                            className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold border border-[var(--c-card)] transition-transform duration-300 group-hover/avatars:scale-110"
                            style={{ background: ["#F59E0B", "#a78bfa", "#F59E0B", "#3b82f6"][i % 4], zIndex: 3 - i }}
                          >
                            {CATEGORY_ICONS[group.category]?.slice(0, 1) || "🐾"}
                          </div>
                        ))}
                        <span className="text-[10px] text-[var(--c-text-muted)] ml-1.5">
                          {group.member_count}
                        </span>
                      </div>
                      <span className="w-1 h-1 rounded-full bg-[var(--c-text-muted)] opacity-40" />
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--c-glass)] text-[var(--c-text-muted)] transition-all duration-200">
                        {group.category}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {group.description && (
                  <p className="text-sm text-[var(--c-text-muted)] line-clamp-2">
                    {group.description}
                  </p>
                )}

                {/* Canton tag if present */}
                {group.canton && (
                  <div className="flex items-center gap-1 text-xs text-[var(--c-text-muted)]">
                    <span>📍</span>
                    <span>
                      {CANTONS.find((c) => c.code === group.canton)?.name ||
                        group.canton}
                    </span>
                  </div>
                )}

                {/* Join/Leave button */}
                <button
                  onClick={() =>
                    handleJoinLeave(group.id, group.is_member || false)
                  }
                  disabled={joining === group.id}
                  className={
                    "mt-auto w-full py-2 rounded-xl text-sm font-semibold transition-all " +
                    (group.is_member
                      ? "border border-[var(--c-border)] text-[var(--c-text-muted)] hover:border-red-400/50 hover:text-red-400 hover:bg-red-500/10"
                      : "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/15 hover:shadow-amber-500/30")
                  }
                >
                  {joining === group.id
                    ? "..."
                    : group.is_member
                      ? "Quitter"
                      : "Rejoindre"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ══ Create Group Modal ══ */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreate(false);
          }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Modal */}
          <div className="relative w-full max-w-md glass-strong rounded-2xl p-6 border border-[var(--c-border)] shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-[var(--c-text)]">
                Creer un groupe
              </h2>
              <button
                onClick={() => setShowCreate(false)}
                className="p-1.5 rounded-full hover:bg-[var(--c-glass)] transition-colors text-[var(--c-text-muted)]"
                aria-label="Fermer"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              {/* Icon selector */}
              <div>
                <label className="text-sm font-medium text-[var(--c-text)] mb-1.5 block">
                  Icone
                </label>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, icon }))}
                      className={
                        "w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all " +
                        (form.icon === icon
                          ? "bg-amber-500/20 ring-2 ring-amber-500 scale-110"
                          : "bg-[var(--c-glass)] hover:bg-[var(--c-glass)] hover:scale-105")
                      }
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="text-sm font-medium text-[var(--c-text)] mb-1.5 block">
                  Nom du groupe *
                </label>
                <input
                  type="text"
                  required
                  maxLength={80}
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="ex: Golden Retrievers Suisse"
                  className="w-full px-3 py-2.5 rounded-xl text-sm border border-[var(--c-border)] bg-[var(--c-card)] text-[var(--c-text)] placeholder:text-[var(--c-text-muted)] focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-medium text-[var(--c-text)] mb-1.5 block">
                  Description
                </label>
                <textarea
                  maxLength={300}
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="Decris ton groupe en quelques mots..."
                  className="w-full px-3 py-2.5 rounded-xl text-sm border border-[var(--c-border)] bg-[var(--c-card)] text-[var(--c-text)] placeholder:text-[var(--c-text-muted)] focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all resize-none"
                />
              </div>

              {/* Category */}
              <div>
                <label className="text-sm font-medium text-[var(--c-text)] mb-1.5 block">
                  Categorie *
                </label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_OPTIONS.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() =>
                        setForm((f) => ({ ...f, category: cat.value }))
                      }
                      className={
                        "px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ease-out " +
                        (form.category === cat.value
                          ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md scale-105"
                          : "border border-[var(--c-border)] text-[var(--c-text-muted)] hover:text-[var(--c-text)] hover:border-amber-500/30 hover:scale-[1.02]")
                      }
                    >
                      {CATEGORY_ICONS[cat.value]} {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Canton (optional) */}
              <div>
                <label className="text-sm font-medium text-[var(--c-text)] mb-1.5 block">
                  Canton{" "}
                  <span className="text-[var(--c-text-muted)] font-normal">
                    (optionnel)
                  </span>
                </label>
                <select
                  value={form.canton}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, canton: e.target.value }))
                  }
                  className="w-full px-3 py-2.5 rounded-xl text-sm border border-[var(--c-border)] bg-[var(--c-card)] text-[var(--c-text)] focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all"
                >
                  <option value="">Tous les cantons</option>
                  {CANTONS.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Species (optional) */}
              <div>
                <label className="text-sm font-medium text-[var(--c-text)] mb-1.5 block">
                  Espece{" "}
                  <span className="text-[var(--c-text-muted)] font-normal">
                    (optionnel)
                  </span>
                </label>
                <select
                  value={form.species}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, species: e.target.value }))
                  }
                  className="w-full px-3 py-2.5 rounded-xl text-sm border border-[var(--c-border)] bg-[var(--c-card)] text-[var(--c-text)] focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all"
                >
                  <option value="">Toutes les especes</option>
                  <option value="chien">Chien</option>
                  <option value="chat">Chat</option>
                  <option value="lapin">Lapin</option>
                  <option value="oiseau">Oiseau</option>
                  <option value="rongeur">Rongeur</option>
                  <option value="autre">Autre</option>
                </select>
              </div>

              {/* Error */}
              {createError && (
                <p className="text-red-400 text-sm text-center">
                  {createError}
                </p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={creating || !form.name.trim()}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {creating ? "Creation..." : "Creer le groupe"}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
