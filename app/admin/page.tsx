"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useRouter } from "next/navigation";

/* ────────────────────────────────────────────── Types ── */

interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  subscription: string | null;
  canton: string | null;
  city: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  animal_count: number;
}

interface AnimalRow {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  canton: string | null;
  city: string | null;
  photo_url: string | null;
  created_by: string;
  created_at: string;
  status: string | null;
}

interface ActivityItem {
  type: string;
  text: string;
  time: string;
}

interface AdminStats {
  totalUsers: number;
  usersToday: number;
  usersWeek: number;
  usersLastWeek: number;
  usersMonth: number;
  totalAnimals: number;
  animalsToday: number;
  animalsBySpecies: Record<string, number>;
  totalMatches: number;
  matchesToday: number;
  matchesLast24h: number;
  totalMessages: number;
  totalEvents: number;
  premiumCount: number;
  proCount: number;
  estimatedMRR: number;
  growthRate: number;
  allUsers: UserRow[];
  allAnimals: AnimalRow[];
  dailySignups: { date: string; count: number }[];
  recentActivity: ActivityItem[];
}

type TabKey = "overview" | "members" | "animals" | "revenue";

const SPECIES_EMOJI: Record<string, string> = {
  chien: "🐕", chat: "🐱", lapin: "🐰",
  oiseau: "🐦", rongeur: "🐹", autre: "🐾",
};

/* ────────────────────────────────────────────── Main ── */

export default function AdminPage() {
  const { profile, loading: authLoading, isAdmin, isAuthenticated } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  const fetchStats = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/admin/stats");
      if (res.status === 401) { router.push("/login?redirectTo=/admin"); return; }
      if (res.status === 403) { setError("Acces refuse. Vous n'etes pas administrateur."); setLoading(false); return; }
      if (!res.ok) throw new Error("Erreur serveur");
      const data = await res.json();
      setStats(data);
      setLastRefresh(new Date());
    } catch {
      setError("Impossible de charger les statistiques.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { router.push("/login?redirectTo=/admin"); return; }
    if (!isAdmin) { setError("Acces refuse. Vous n'etes pas administrateur."); setLoading(false); return; }
    fetchStats();
  }, [authLoading, isAuthenticated, isAdmin, router, fetchStats]);

  // Auto-refresh every 30s
  useEffect(() => {
    if (!isAdmin || !isAuthenticated) return;
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [isAdmin, isAuthenticated, fetchStats]);

  if (authLoading || loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--c-bg, #0f0c1a)" }}>
        <div style={{ color: "var(--c-text-muted, #9b93b8)", fontSize: 18 }}>Chargement du dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--c-bg, #0f0c1a)" }}>
        <div style={{ color: "#ef4444", fontSize: 18, textAlign: "center", padding: 32 }}>{error}</div>
      </div>
    );
  }

  if (!stats) return null;

  const handleExport = () => {
    console.log("=== EXPORT ADMIN DATA ===");
    console.log("Users:", JSON.stringify(stats.allUsers, null, 2));
    console.log("Animals:", JSON.stringify(stats.allAnimals, null, 2));
    console.log("Stats:", { totalUsers: stats.totalUsers, totalAnimals: stats.totalAnimals, totalMatches: stats.totalMatches, estimatedMRR: stats.estimatedMRR });
    alert("Donnees exportees dans la console (F12)");
  };

  const TABS: { key: TabKey; label: string }[] = [
    { key: "overview", label: "Vue d'ensemble" },
    { key: "members", label: "Membres" },
    { key: "animals", label: "Animaux" },
    { key: "revenue", label: "Revenue" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--c-bg, #0f0c1a)", padding: "24px 16px 48px" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--c-text, #f0eeff)", margin: 0 }}>
              Dashboard Admin
            </h1>
            <p style={{ color: "var(--c-text-muted, #9b93b8)", fontSize: 13, marginTop: 4 }}>
              MAJ : {lastRefresh.toLocaleTimeString("fr-CH")} — auto-refresh 30s
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleExport} style={btnStyle}>
              Exporter
            </button>
            <button onClick={() => { setLoading(true); fetchStats(); }} style={btnStyle}>
              Actualiser
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24, overflowX: "auto", paddingBottom: 4 }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                padding: "10px 20px",
                borderRadius: 12,
                border: activeTab === t.key ? "1px solid var(--c-accent, #A78BFA)" : "1px solid var(--c-border, #2d2545)",
                background: activeTab === t.key ? "rgba(139,92,246,0.15)" : "var(--c-card, #1e1830)",
                color: activeTab === t.key ? "var(--c-accent, #A78BFA)" : "var(--c-text-muted, #9b93b8)",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 600,
                whiteSpace: "nowrap",
                transition: "all 0.2s",
              }}
            >
              {t.label}
              {t.key === "members" && <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.7 }}>({stats.totalUsers})</span>}
              {t.key === "animals" && <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.7 }}>({stats.totalAnimals})</span>}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && <OverviewTab stats={stats} onTabSwitch={setActiveTab} />}
        {activeTab === "members" && <MembersTab stats={stats} />}
        {activeTab === "animals" && <AnimalsTab stats={stats} />}
        {activeTab === "revenue" && <RevenueTab stats={stats} />}

      </div>
    </div>
  );
}

/* ────────────────────────────────────── Tab: Overview ── */

function OverviewTab({ stats, onTabSwitch }: { stats: AdminStats; onTabSwitch: (t: TabKey) => void }) {
  const maxDailySignup = Math.max(...stats.dailySignups.map(d => d.count), 1);
  const speciesEntries = Object.entries(stats.animalsBySpecies).sort((a, b) => b[1] - a[1]);
  const maxSpeciesCount = Math.max(...speciesEntries.map(e => e[1]), 1);

  return (
    <>
      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 24 }}>
        <KPICard
          label="Utilisateurs"
          value={stats.totalUsers}
          sub={stats.usersToday > 0 ? `+${stats.usersToday} aujourd'hui` : undefined}
          subColor="#22c55e"
          icon="U"
          iconBg="rgba(139,92,246,0.15)"
          iconColor="#A78BFA"
          onClick={() => onTabSwitch("members")}
        />
        <KPICard
          label="Animaux"
          value={stats.totalAnimals}
          sub={stats.animalsToday > 0 ? `+${stats.animalsToday} aujourd'hui` : undefined}
          subColor="#22c55e"
          icon="A"
          iconBg="rgba(56,189,248,0.15)"
          iconColor="#38BDF8"
          onClick={() => onTabSwitch("animals")}
        />
        <KPICard
          label="Matchs"
          value={stats.totalMatches}
          sub={stats.matchesToday > 0 ? `+${stats.matchesToday} aujourd'hui` : undefined}
          subColor="#22c55e"
          icon="M"
          iconBg="rgba(245,158,11,0.15)"
          iconColor="#F59E0B"
        />
        <KPICard
          label="MRR estime"
          value={`CHF ${stats.estimatedMRR.toFixed(2)}`}
          sub={`${stats.premiumCount} premium / ${stats.proCount} pro`}
          subColor="#F59E0B"
          icon="$"
          iconBg="rgba(34,197,94,0.15)"
          iconColor="#22c55e"
          onClick={() => onTabSwitch("revenue")}
        />
        <KPICard
          label="Croissance"
          value={`${stats.growthRate >= 0 ? "+" : ""}${stats.growthRate}%`}
          sub="vs semaine derniere"
          subColor={stats.growthRate >= 0 ? "#22c55e" : "#ef4444"}
          icon="G"
          iconBg={stats.growthRate >= 0 ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)"}
          iconColor={stats.growthRate >= 0 ? "#22c55e" : "#ef4444"}
        />
        <KPICard
          label="Evenements"
          value={stats.totalEvents}
          icon="E"
          iconBg="rgba(236,72,153,0.15)"
          iconColor="#EC4899"
        />
      </div>

      {/* Last 24h section */}
      <div style={{ ...cardStyle, marginBottom: 24, padding: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--c-text, #f0eeff)", margin: "0 0 12px" }}>
          Dernieres 24h
        </h2>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <MiniStat label="Nouvelles inscriptions" value={stats.usersToday} color="#A78BFA" />
          <MiniStat label="Nouveaux animaux" value={stats.animalsToday} color="#38BDF8" />
          <MiniStat label="Nouveaux matchs" value={stats.matchesToday} color="#F59E0B" />
          <MiniStat label="Messages totaux" value={stats.totalMessages} color="#EC4899" />
        </div>
      </div>

      {/* Charts + Activity Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, marginBottom: 24 }}>
        {/* Weekly Signups Chart */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--c-text, #f0eeff)", margin: "0 0 20px" }}>
            Inscriptions cette semaine
          </h2>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 120 }}>
            {stats.dailySignups.map((d, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--c-text, #f0eeff)" }}>{d.count}</span>
                <div style={{
                  width: "100%", maxWidth: 40,
                  height: `${Math.max((d.count / maxDailySignup) * 80, 4)}px`,
                  background: "linear-gradient(180deg, var(--c-accent, #A78BFA), rgba(139,92,246,0.4))",
                  borderRadius: 6, transition: "height 0.3s ease",
                }} />
                <span style={{ fontSize: 10, color: "var(--c-text-muted, #9b93b8)", whiteSpace: "nowrap" }}>
                  {d.date.split(" ")[0]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Animals by Species */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--c-text, #f0eeff)", margin: "0 0 20px" }}>
            Animaux par espece
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {speciesEntries.length === 0 && (
              <span style={{ color: "var(--c-text-muted, #9b93b8)", fontSize: 13 }}>Aucune donnee</span>
            )}
            {speciesEntries.map(([species, count]) => (
              <div key={species} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 18, width: 28, textAlign: "center" }}>{SPECIES_EMOJI[species] || "🐾"}</span>
                <span style={{ fontSize: 13, color: "var(--c-text-muted, #9b93b8)", width: 70, textTransform: "capitalize" }}>{species}</span>
                <div style={{ flex: 1, height: 20, background: "rgba(255,255,255,0.05)", borderRadius: 6, overflow: "hidden" }}>
                  <div style={{
                    width: `${(count / maxSpeciesCount) * 100}%`, height: "100%",
                    background: "linear-gradient(90deg, var(--c-accent, #A78BFA), rgba(139,92,246,0.5))",
                    borderRadius: 6, transition: "width 0.3s ease",
                  }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text, #f0eeff)", width: 36, textAlign: "right" }}>{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Feed */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--c-text, #f0eeff)", margin: "0 0 16px" }}>
            Activite recente
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {stats.recentActivity.length === 0 && (
              <span style={{ color: "var(--c-text-muted, #9b93b8)", fontSize: 13 }}>Aucune activite</span>
            )}
            {stats.recentActivity.map((a, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0,
                  background: a.type === "signup" ? "rgba(139,92,246,0.15)" : a.type === "animal" ? "rgba(56,189,248,0.15)" : "rgba(245,158,11,0.15)",
                }}>
                  {a.type === "signup" ? "👤" : a.type === "animal" ? "🐾" : "💕"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, color: "var(--c-text, #f0eeff)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {a.text}
                  </p>
                  <p style={{ fontSize: 11, color: "var(--c-text-muted, #9b93b8)", margin: 0 }}>
                    {formatRelative(a.time)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer stats */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <StatPill label="Messages" value={stats.totalMessages} />
        <StatPill label="Inscrits ce mois" value={stats.usersMonth} />
        <StatPill label="Inscrits cette semaine" value={stats.usersWeek} />
      </div>
    </>
  );
}

/* ────────────────────────────────────── Tab: Members ── */

function MembersTab({ stats }: { stats: AdminStats }) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string>("created_at");
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = stats.allUsers;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(u =>
        (u.full_name || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.canton || "").toLowerCase().includes(q) ||
        (u.city || "").toLowerCase().includes(q)
      );
    }
    list = [...list].sort((a, b) => {
      let va: string | number = "";
      let vb: string | number = "";
      if (sortKey === "full_name") { va = (a.full_name || "").toLowerCase(); vb = (b.full_name || "").toLowerCase(); }
      else if (sortKey === "email") { va = a.email.toLowerCase(); vb = b.email.toLowerCase(); }
      else if (sortKey === "canton") { va = (a.canton || "").toLowerCase(); vb = (b.canton || "").toLowerCase(); }
      else if (sortKey === "subscription") { va = a.subscription || ""; vb = b.subscription || ""; }
      else if (sortKey === "animal_count") { va = a.animal_count; vb = b.animal_count; }
      else if (sortKey === "created_at") { va = a.created_at; vb = b.created_at; }
      else if (sortKey === "last_sign_in_at") { va = a.last_sign_in_at || ""; vb = b.last_sign_in_at || ""; }
      if (va < vb) return sortAsc ? -1 : 1;
      if (va > vb) return sortAsc ? 1 : -1;
      return 0;
    });
    return list;
  }, [stats.allUsers, search, sortKey, sortAsc]);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const userAnimals = (userId: string) => stats.allAnimals.filter(a => a.created_by === userId);

  const getActivityColor = (lastSignIn: string | null): string => {
    if (!lastSignIn) return "#ef4444";
    const days = (Date.now() - new Date(lastSignIn).getTime()) / 86400000;
    if (days <= 7) return "#22c55e";
    if (days <= 30) return "#F59E0B";
    return "#ef4444";
  };

  const SortHeader = ({ label, sortField }: { label: string; sortField: string }) => (
    <th
      onClick={() => handleSort(sortField)}
      style={{
        ...thStyle,
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      {label} {sortKey === sortField ? (sortAsc ? "▲" : "▼") : ""}
    </th>
  );

  return (
    <>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--c-text, #f0eeff)", margin: 0 }}>
          {filtered.length} membre{filtered.length !== 1 ? "s" : ""} inscrit{filtered.length !== 1 ? "s" : ""}
        </h2>
        <input
          type="text"
          placeholder="Rechercher par nom, email, canton..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            padding: "10px 16px",
            borderRadius: 12,
            border: "1px solid var(--c-border, #2d2545)",
            background: "var(--c-card, #1e1830)",
            color: "var(--c-text, #f0eeff)",
            fontSize: 14,
            width: 320,
            maxWidth: "100%",
            outline: "none",
          }}
        />
      </div>

      {/* Table */}
      <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                <th style={thStyle}></th>
                <SortHeader label="Nom" sortField="full_name" />
                <SortHeader label="Email" sortField="email" />
                <SortHeader label="Canton" sortField="canton" />
                <SortHeader label="Abonnement" sortField="subscription" />
                <SortHeader label="Animaux" sortField="animal_count" />
                <SortHeader label="Inscrit le" sortField="created_at" />
                <SortHeader label="Derniere co." sortField="last_sign_in_at" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => {
                const isExpanded = expandedId === u.id;
                const animals = userAnimals(u.id);
                const actColor = getActivityColor(u.last_sign_in_at);
                return (
                  <Fragment key={u.id}>
                    <tr
                      onClick={() => setExpandedId(isExpanded ? null : u.id)}
                      style={{
                        cursor: "pointer",
                        background: isExpanded ? "rgba(139,92,246,0.05)" : "transparent",
                        borderBottom: isExpanded ? "none" : undefined,
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isExpanded ? "rgba(139,92,246,0.05)" : "transparent"; }}
                    >
                      <td style={tdStyle}>
                        <div style={{
                          width: 4, height: 4, borderRadius: "50%", background: actColor,
                          boxShadow: `0 0 6px ${actColor}`,
                        }} />
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <Avatar url={u.avatar_url} name={u.full_name || u.email} size={32} />
                          <span style={{ fontWeight: 500, color: "var(--c-text, #f0eeff)" }}>
                            {u.full_name || "-"}
                          </span>
                        </div>
                      </td>
                      <td style={{ ...tdStyle, color: "var(--c-text-muted, #9b93b8)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {u.email}
                      </td>
                      <td style={{ ...tdStyle, color: "var(--c-text-muted, #9b93b8)" }}>
                        {u.canton || "-"}
                      </td>
                      <td style={tdStyle}>
                        <SubscriptionBadge sub={u.subscription} />
                      </td>
                      <td style={{ ...tdStyle, textAlign: "center", color: "var(--c-text, #f0eeff)", fontWeight: 600 }}>
                        {u.animal_count}
                      </td>
                      <td style={{ ...tdStyle, color: "var(--c-text-muted, #9b93b8)", whiteSpace: "nowrap" }}>
                        {formatDate(u.created_at)}
                      </td>
                      <td style={{ ...tdStyle, color: "var(--c-text-muted, #9b93b8)", whiteSpace: "nowrap" }}>
                        {u.last_sign_in_at ? formatDate(u.last_sign_in_at) : "-"}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={8} style={{ padding: "0 16px 16px", background: "rgba(139,92,246,0.05)" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", padding: "8px 0" }}>
                              <MiniStat label="Abonnement" value={subLabel(u.subscription)} color="#A78BFA" />
                              <MiniStat label="Canton" value={u.canton || "Non renseigne"} color="#38BDF8" />
                              <MiniStat label="Ville" value={u.city || "Non renseigne"} color="#F59E0B" />
                              <MiniStat label="Animaux" value={u.animal_count} color="#EC4899" />
                            </div>
                            {animals.length > 0 && (
                              <div>
                                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--c-text-muted, #9b93b8)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                  Animaux de {u.full_name || u.email}
                                </p>
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                  {animals.map(a => (
                                    <div key={a.id} style={{
                                      background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: "8px 14px",
                                      display: "flex", alignItems: "center", gap: 8, fontSize: 13,
                                    }}>
                                      <span>{SPECIES_EMOJI[a.species] || "🐾"}</span>
                                      <span style={{ color: "var(--c-text, #f0eeff)", fontWeight: 500 }}>{a.name}</span>
                                      <span style={{ color: "var(--c-text-muted, #9b93b8)", fontSize: 11 }}>({a.species})</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {animals.length === 0 && (
                              <p style={{ fontSize: 13, color: "var(--c-text-muted, #9b93b8)", fontStyle: "italic" }}>
                                Aucun animal enregistre
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: 32, textAlign: "center", color: "var(--c-text-muted, #9b93b8)" }}>
                    Aucun membre trouve
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ────────────────────────────────────── Tab: Animals ── */

function AnimalsTab({ stats }: { stats: AdminStats }) {
  const [filterSpecies, setFilterSpecies] = useState("");
  const [search, setSearch] = useState("");

  const speciesList = useMemo(() => {
    const set = new Set(stats.allAnimals.map(a => a.species));
    return Array.from(set).sort();
  }, [stats.allAnimals]);

  const userMap = useMemo(() => {
    const m: Record<string, UserRow> = {};
    for (const u of stats.allUsers) m[u.id] = u;
    return m;
  }, [stats.allUsers]);

  const filtered = useMemo(() => {
    let list = stats.allAnimals;
    if (filterSpecies) list = list.filter(a => a.species === filterSpecies);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        a.name.toLowerCase().includes(q) ||
        (a.breed || "").toLowerCase().includes(q) ||
        (a.canton || "").toLowerCase().includes(q) ||
        (userMap[a.created_by]?.full_name || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [stats.allAnimals, filterSpecies, search, userMap]);

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--c-text, #f0eeff)", margin: 0 }}>
          {filtered.length} animau{filtered.length !== 1 ? "x" : "l"}
        </h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select
            value={filterSpecies}
            onChange={e => setFilterSpecies(e.target.value)}
            style={{
              padding: "10px 16px",
              borderRadius: 12,
              border: "1px solid var(--c-border, #2d2545)",
              background: "var(--c-card, #1e1830)",
              color: "var(--c-text, #f0eeff)",
              fontSize: 14,
              outline: "none",
            }}
          >
            <option value="">Toutes les especes</option>
            {speciesList.map(s => (
              <option key={s} value={s}>{SPECIES_EMOJI[s] || "🐾"} {s}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              padding: "10px 16px",
              borderRadius: 12,
              border: "1px solid var(--c-border, #2d2545)",
              background: "var(--c-card, #1e1830)",
              color: "var(--c-text, #f0eeff)",
              fontSize: 14,
              width: 240,
              maxWidth: "100%",
              outline: "none",
            }}
          />
        </div>
      </div>

      <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                {["", "Nom", "Espece", "Race", "Canton", "Proprietaire", "Cree le"].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => {
                const owner = userMap[a.created_by];
                return (
                  <tr key={a.id}>
                    <td style={{ ...tdStyle, fontSize: 20, textAlign: "center", width: 40 }}>
                      {SPECIES_EMOJI[a.species] || "🐾"}
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 500, color: "var(--c-text, #f0eeff)" }}>
                      {a.name}
                    </td>
                    <td style={{ ...tdStyle, color: "var(--c-text-muted, #9b93b8)", textTransform: "capitalize" }}>
                      {a.species}
                    </td>
                    <td style={{ ...tdStyle, color: "var(--c-text-muted, #9b93b8)" }}>
                      {a.breed || "-"}
                    </td>
                    <td style={{ ...tdStyle, color: "var(--c-text-muted, #9b93b8)" }}>
                      {a.canton || "-"}
                    </td>
                    <td style={{ ...tdStyle, color: "var(--c-text-muted, #9b93b8)" }}>
                      {owner?.full_name || owner?.email || "-"}
                    </td>
                    <td style={{ ...tdStyle, color: "var(--c-text-muted, #9b93b8)", whiteSpace: "nowrap" }}>
                      {formatDate(a.created_at)}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: 32, textAlign: "center", color: "var(--c-text-muted, #9b93b8)" }}>
                    Aucun animal trouve
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ────────────────────────────────────── Tab: Revenue ── */

function RevenueTab({ stats }: { stats: AdminStats }) {
  const freeCount = stats.totalUsers - stats.premiumCount - stats.proCount;
  const maxSub = Math.max(freeCount, stats.premiumCount, stats.proCount, 1);

  const payingUsers = stats.allUsers.filter(u => u.subscription === "premium" || u.subscription === "pro");

  return (
    <>
      {/* Revenue KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 24 }}>
        <KPICard
          label="MRR estime"
          value={`CHF ${stats.estimatedMRR.toFixed(2)}`}
          icon="$"
          iconBg="rgba(34,197,94,0.15)"
          iconColor="#22c55e"
        />
        <KPICard
          label="Abonnes payants"
          value={stats.premiumCount + stats.proCount}
          sub={`sur ${stats.totalUsers} utilisateurs`}
          subColor="var(--c-text-muted, #9b93b8)"
          icon="P"
          iconBg="rgba(245,158,11,0.15)"
          iconColor="#F59E0B"
        />
        <KPICard
          label="Taux conversion"
          value={stats.totalUsers > 0 ? `${((stats.premiumCount + stats.proCount) / stats.totalUsers * 100).toFixed(1)}%` : "0%"}
          icon="%"
          iconBg="rgba(139,92,246,0.15)"
          iconColor="#A78BFA"
        />
      </div>

      {/* Subscription Distribution */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, marginBottom: 24 }}>
        <div style={cardStyle}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--c-text, #f0eeff)", margin: "0 0 20px" }}>
            Repartition des abonnements
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <SubBar label="Free" count={freeCount} max={maxSub} color="#6B7280" price="CHF 0" />
            <SubBar label="Premium" count={stats.premiumCount} max={maxSub} color="#F59E0B" price="CHF 4.90/mois" />
            <SubBar label="Pro" count={stats.proCount} max={maxSub} color="#A78BFA" price="CHF 9.90/mois" />
          </div>
        </div>

        <div style={cardStyle}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--c-text, #f0eeff)", margin: "0 0 20px" }}>
            Detail revenus mensuels
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--c-border, #2d2545)" }}>
              <span style={{ color: "var(--c-text-muted, #9b93b8)", fontSize: 13 }}>Premium ({stats.premiumCount} x CHF 4.90)</span>
              <span style={{ color: "var(--c-text, #f0eeff)", fontWeight: 600, fontSize: 14 }}>CHF {(stats.premiumCount * 4.90).toFixed(2)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--c-border, #2d2545)" }}>
              <span style={{ color: "var(--c-text-muted, #9b93b8)", fontSize: 13 }}>Pro ({stats.proCount} x CHF 9.90)</span>
              <span style={{ color: "var(--c-text, #f0eeff)", fontWeight: 600, fontSize: 14 }}>CHF {(stats.proCount * 9.90).toFixed(2)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0" }}>
              <span style={{ color: "var(--c-text, #f0eeff)", fontWeight: 700, fontSize: 15 }}>Total MRR</span>
              <span style={{ color: "#22c55e", fontWeight: 800, fontSize: 18 }}>CHF {stats.estimatedMRR.toFixed(2)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid var(--c-border, #2d2545)" }}>
              <span style={{ color: "var(--c-text-muted, #9b93b8)", fontSize: 13 }}>ARR estime</span>
              <span style={{ color: "var(--c-text, #f0eeff)", fontWeight: 600, fontSize: 14 }}>CHF {(stats.estimatedMRR * 12).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Paying Subscribers List */}
      <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--c-border, #2d2545)" }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--c-text, #f0eeff)", margin: 0 }}>
            Abonnes payants ({payingUsers.length})
          </h2>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                {["Nom", "Email", "Plan", "Canton", "Inscrit le"].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payingUsers.map(u => (
                <tr key={u.id}>
                  <td style={{ ...tdStyle, fontWeight: 500, color: "var(--c-text, #f0eeff)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Avatar url={u.avatar_url} name={u.full_name || u.email} size={28} />
                      {u.full_name || "-"}
                    </div>
                  </td>
                  <td style={{ ...tdStyle, color: "var(--c-text-muted, #9b93b8)" }}>{u.email}</td>
                  <td style={tdStyle}><SubscriptionBadge sub={u.subscription} /></td>
                  <td style={{ ...tdStyle, color: "var(--c-text-muted, #9b93b8)" }}>{u.canton || "-"}</td>
                  <td style={{ ...tdStyle, color: "var(--c-text-muted, #9b93b8)", whiteSpace: "nowrap" }}>{formatDate(u.created_at)}</td>
                </tr>
              ))}
              {payingUsers.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: 32, textAlign: "center", color: "var(--c-text-muted, #9b93b8)" }}>
                    Aucun abonne payant
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ────────────────────────────── Shared Components ── */

import { Fragment } from "react";

function KPICard({ label, value, sub, subColor, icon, iconBg, iconColor, onClick }: {
  label: string;
  value: number | string;
  sub?: string;
  subColor?: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--c-card, #1e1830)",
        border: "1px solid var(--c-border, #2d2545)",
        borderRadius: 16,
        padding: 20,
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
        cursor: onClick ? "pointer" : "default",
        transition: "border-color 0.2s, transform 0.15s",
      }}
      onMouseEnter={e => { if (onClick) { (e.currentTarget as HTMLElement).style.borderColor = "var(--c-accent, #A78BFA)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; } }}
      onMouseLeave={e => { if (onClick) { (e.currentTarget as HTMLElement).style.borderColor = "var(--c-border, #2d2545)"; (e.currentTarget as HTMLElement).style.transform = "none"; } }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: iconBg, display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 16, fontWeight: 800, color: iconColor, flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ color: "var(--c-text-muted, #9b93b8)", fontSize: 12, margin: 0, marginBottom: 3 }}>{label}</p>
        <p style={{ color: "var(--c-text, #f0eeff)", fontSize: 24, fontWeight: 800, margin: 0, lineHeight: 1 }}>
          {typeof value === "number" ? value.toLocaleString("fr-CH") : value}
        </p>
        {sub && (
          <p style={{ color: subColor || "var(--c-text-muted)", fontSize: 11, margin: 0, marginTop: 3, fontWeight: 600 }}>{sub}</p>
        )}
      </div>
    </div>
  );
}

function SubscriptionBadge({ sub }: { sub: string | null }) {
  const config: Record<string, { bg: string; color: string; label: string }> = {
    premium: { bg: "rgba(245,158,11,0.15)", color: "#F59E0B", label: "Premium" },
    pro: { bg: "rgba(139,92,246,0.15)", color: "#A78BFA", label: "Pro" },
  };
  const c = config[sub || ""] || { bg: "rgba(255,255,255,0.05)", color: "var(--c-text-muted, #9b93b8)", label: "Free" };
  return (
    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: c.bg, color: c.color }}>
      {c.label}
    </span>
  );
}

function Avatar({ url, name, size }: { url: string | null; name: string; size: number }) {
  if (url) {
    return (
      <img
        src={url}
        alt=""
        style={{ width: size, height: size, borderRadius: size / 3, objectFit: "cover", flexShrink: 0 }}
      />
    );
  }
  const initials = (name || "?").charAt(0).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 3,
      background: "rgba(139,92,246,0.2)", display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.4, fontWeight: 700, color: "#A78BFA", flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

function SubBar({ label, count, max, color, price }: { label: string; count: number; max: number; color: string; price: string }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text, #f0eeff)" }}>{label}</span>
        <span style={{ fontSize: 12, color: "var(--c-text-muted, #9b93b8)" }}>{count} utilisateurs - {price}</span>
      </div>
      <div style={{ height: 24, background: "rgba(255,255,255,0.05)", borderRadius: 8, overflow: "hidden" }}>
        <div style={{
          width: `${Math.max((count / max) * 100, 2)}%`, height: "100%",
          background: color, borderRadius: 8, transition: "width 0.4s ease",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 700, color: "#fff",
        }}>
          {count > 0 ? count : ""}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 13, color: "var(--c-text-muted, #9b93b8)" }}>{label}:</span>
      <span style={{ fontSize: 14, fontWeight: 700, color: "var(--c-text, #f0eeff)" }}>
        {typeof value === "number" ? value.toLocaleString("fr-CH") : value}
      </span>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div style={{
      background: "var(--c-card, #1e1830)", border: "1px solid var(--c-border, #2d2545)",
      borderRadius: 20, padding: "8px 18px", fontSize: 13, color: "var(--c-text-muted, #9b93b8)",
    }}>
      {label}: <span style={{ fontWeight: 700, color: "var(--c-text, #f0eeff)" }}>{value.toLocaleString("fr-CH")}</span>
    </div>
  );
}

/* ────────────────────────────────── Helpers / Styles ── */

function subLabel(sub: string | null) {
  if (sub === "premium") return "Premium";
  if (sub === "pro") return "Pro";
  return "Free";
}

function formatDate(iso: string) {
  if (!iso) return "-";
  const d = new Date(iso);
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear().toString().slice(2)} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

function formatRelative(iso: string) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "A l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Il y a ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `Il y a ${days}j`;
}

const cardStyle: React.CSSProperties = {
  background: "var(--c-card, #1e1830)",
  border: "1px solid var(--c-border, #2d2545)",
  borderRadius: 16,
  padding: 24,
};

const btnStyle: React.CSSProperties = {
  background: "var(--c-card, #1e1830)",
  border: "1px solid var(--c-border, #2d2545)",
  color: "var(--c-text, #f0eeff)",
  padding: "10px 20px",
  borderRadius: 12,
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 600,
  transition: "opacity 0.2s",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 14px",
  color: "var(--c-text-muted, #9b93b8)",
  fontWeight: 600,
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  borderBottom: "1px solid var(--c-border, #2d2545)",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderBottom: "1px solid rgba(255,255,255,0.03)",
};
