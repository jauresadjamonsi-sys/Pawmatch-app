"use client";

import { Suspense, useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type {
  AdminUserRow as UserRow,
  AnimalRow,
  ReportRow,
  AdminStats,
} from "@/lib/types";

/* ────────────────────────────────────────────── Types ── */

type TabKey = "overview" | "members" | "animals" | "revenue" | "reports" | "feedback" | "verification";

const SPECIES_EMOJI: Record<string, string> = {
  chien: "🐕", chat: "🐱", lapin: "🐰",
  oiseau: "🐦", rongeur: "🐹", autre: "🐾",
};

/* ────────────────────────────────────────────── Main ── */

export default function AdminPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--c-bg, #0f0c1a)" }}><div style={{ color: "var(--c-text-muted, #9b93b8)", fontSize: 18 }}>Chargement...</div></div>}>
      <AdminPageInner />
    </Suspense>
  );
}

function AdminPageInner() {
  const { profile, loading: authLoading, isAdmin, isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const initialTab = (searchParams.get("tab") as TabKey) || "overview";
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  const fetchStats = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/admin/stats");
      if (res.status === 401) { router.push("/login?redirectTo=/admin"); return; }
      if (res.status === 403) { setError("Accès refusé. Vous n'êtes pas administrateur."); setLoading(false); return; }
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
    if (!isAdmin) { setError("Accès refusé. Vous n'êtes pas administrateur."); setLoading(false); return; }
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
    toast.success("Données exportées dans la console (F12)");
  };

  const TABS: { key: TabKey; label: string }[] = [
    { key: "overview", label: "Vue d'ensemble" },
    { key: "members", label: "Membres" },
    { key: "animals", label: "Animaux" },
    { key: "revenue", label: "Revenue" },
    { key: "reports", label: "Signalements" },
    { key: "feedback", label: "💡 Feedback" },
    { key: "verification", label: "📸 Verification" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--c-bg, #0f0c1a)", padding: "24px 16px 48px" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={() => window.history.length > 1 ? window.history.back() : (window.location.href = "/feed")} aria-label="Retour" className="inline-flex items-center justify-center w-9 h-9 rounded-full transition-all active:scale-90 flex-shrink-0" style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--c-text)" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
              </button>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--c-text, #f0eeff)", margin: 0 }}>
                Dashboard Admin
              </h1>
            </div>
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
              {t.key === "reports" && stats.pendingReports.length > 0 && <span style={{ marginLeft: 6, fontSize: 10, background: "#ef4444", color: "#fff", borderRadius: 20, padding: "2px 7px", fontWeight: 800 }}>{stats.pendingReports.length}</span>}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && <OverviewTab stats={stats} onTabSwitch={setActiveTab} />}
        {activeTab === "members" && <MembersTab stats={stats} />}
        {activeTab === "animals" && <AnimalsTab stats={stats} />}
        {activeTab === "revenue" && <RevenueTab stats={stats} />}
        {activeTab === "reports" && <ReportsTab stats={stats} onRefresh={fetchStats} />}
        {activeTab === "feedback" && <FeedbackTab />}
        {activeTab === "verification" && <VerificationTab />}

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
          subColor="#F59E0B"
          icon="U"
          iconBg="rgba(139,92,246,0.15)"
          iconColor="#A78BFA"
          onClick={() => onTabSwitch("members")}
        />
        <KPICard
          label="Animaux"
          value={stats.totalAnimals}
          sub={stats.animalsToday > 0 ? `+${stats.animalsToday} aujourd'hui` : undefined}
          subColor="#F59E0B"
          icon="A"
          iconBg="rgba(56,189,248,0.15)"
          iconColor="#38BDF8"
          onClick={() => onTabSwitch("animals")}
        />
        <KPICard
          label="Matchs"
          value={stats.totalMatches}
          sub={stats.matchesToday > 0 ? `+${stats.matchesToday} aujourd'hui` : undefined}
          subColor="#F59E0B"
          icon="M"
          iconBg="rgba(245,158,11,0.15)"
          iconColor="#F59E0B"
        />
        <KPICard
          label="MRR estimé"
          value={`CHF ${stats.estimatedMRR.toFixed(2)}`}
          sub={`${stats.premiumCount} premium / ${stats.proCount} pro`}
          subColor="#F59E0B"
          icon="$"
          iconBg="rgba(245,158,11,0.15)"
          iconColor="#F59E0B"
          onClick={() => onTabSwitch("revenue")}
        />
        <KPICard
          label="Croissance"
          value={`${stats.growthRate >= 0 ? "+" : ""}${stats.growthRate}%`}
          sub="vs semaine dernière"
          subColor={stats.growthRate >= 0 ? "#F59E0B" : "#ef4444"}
          icon="G"
          iconBg={stats.growthRate >= 0 ? "rgba(245,158,11,0.15)" : "rgba(239,68,68,0.15)"}
          iconColor={stats.growthRate >= 0 ? "#F59E0B" : "#ef4444"}
        />
        <KPICard
          label="Événements"
          value={stats.totalEvents}
          icon="E"
          iconBg="rgba(236,72,153,0.15)"
          iconColor="#EC4899"
        />
      </div>

      {/* Last 24h section */}
      <div style={{ ...cardStyle, marginBottom: 24, padding: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--c-text, #f0eeff)", margin: "0 0 12px" }}>
          Dernières 24h
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
            Animaux par espèce
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {speciesEntries.length === 0 && (
              <span style={{ color: "var(--c-text-muted, #9b93b8)", fontSize: 13 }}>Aucune donnée</span>
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
            Activité récente
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {stats.recentActivity.length === 0 && (
              <span style={{ color: "var(--c-text-muted, #9b93b8)", fontSize: 13 }}>Aucune activité</span>
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
    if (days <= 7) return "#F59E0B";
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
                <SortHeader label="Dernière co." sortField="last_sign_in_at" />
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
                              <MiniStat label="Canton" value={u.canton || "Non renseigné"} color="#38BDF8" />
                              <MiniStat label="Ville" value={u.city || "Non renseigné"} color="#F59E0B" />
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
                                Aucun animal enregistré
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
        (a.created_by ? userMap[a.created_by]?.full_name || "" : "").toLowerCase().includes(q)
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
            <option value="">Toutes les espèces</option>
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
                {["", "Nom", "Espèce", "Race", "Canton", "Propriétaire", "Créé le"].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => {
                const owner = a.created_by ? userMap[a.created_by] : undefined;
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
          label="MRR estimé"
          value={`CHF ${stats.estimatedMRR.toFixed(2)}`}
          icon="$"
          iconBg="rgba(245,158,11,0.15)"
          iconColor="#F59E0B"
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
              <span style={{ color: "#F59E0B", fontWeight: 800, fontSize: 18 }}>CHF {stats.estimatedMRR.toFixed(2)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid var(--c-border, #2d2545)" }}>
              <span style={{ color: "var(--c-text-muted, #9b93b8)", fontSize: 13 }}>ARR estimé</span>
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
      <Image
        src={url}
        alt=""
        width={size}
        height={size}
        style={{ borderRadius: size / 3, objectFit: "cover", flexShrink: 0 }}
        unoptimized
        sizes={`${size}px`}
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

/* ────────────────────────────────────── Tab: Reports ── */

function ReportsTab({ stats, onRefresh }: { stats: AdminStats; onRefresh: () => void }) {
  const [processingId, setProcessingId] = useState<string | null>(null);

  async function handleResolve(reportId: string) {
    setProcessingId(reportId);
    try {
      const res = await fetch("/api/admin/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report_id: reportId, action: "resolved" }),
      });
      if (res.ok) onRefresh();
    } catch {}
    setProcessingId(null);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("fr-CH", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const REASON_COLORS: Record<string, string> = {
    "Maltraitance animale": "#ef4444",
    "Harcelement": "#F59E0B",
    "Arnaque": "#f59e0b",
    "Contenu inapproprie": "#8b5cf6",
    "Faux profil": "#3b82f6",
    "Spam": "#6b7280",
    "Autre": "#9ca3af",
  };

  return (
    <>
      {/* KPI */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
        <div style={{ ...cardStyle, padding: 20 }}>
          <p style={{ fontSize: 28, fontWeight: 800, color: "#ef4444" }}>{stats.pendingReports.length}</p>
          <p style={{ fontSize: 12, color: "var(--c-text-muted, #9b93b8)", marginTop: 4 }}>En attente</p>
        </div>
        <div style={{ ...cardStyle, padding: 20 }}>
          <p style={{ fontSize: 28, fontWeight: 800, color: "var(--c-text, #f0eeff)" }}>{stats.totalReports}</p>
          <p style={{ fontSize: 12, color: "var(--c-text-muted, #9b93b8)", marginTop: 4 }}>Total signalements</p>
        </div>
      </div>

      {stats.pendingReports.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60 }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>✅</p>
          <p style={{ color: "var(--c-text-muted, #9b93b8)", fontSize: 14 }}>Aucun signalement en attente</p>
        </div>
      ) : (
        <div style={{ ...cardStyle, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Signalé par</th>
                  <th style={thStyle}>Utilisateur signalé</th>
                  <th style={thStyle}>Raison</th>
                  <th style={thStyle}>Details</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {stats.pendingReports.map((report) => (
                  <tr key={report.id}>
                    <td style={{ ...tdStyle, color: "var(--c-text-muted, #9b93b8)", fontSize: 12, whiteSpace: "nowrap" }}>
                      {formatDate(report.created_at)}
                    </td>
                    <td style={{ ...tdStyle, color: "var(--c-text, #f0eeff)", fontWeight: 500 }}>
                      {report.reporter_name}
                    </td>
                    <td style={{ ...tdStyle, color: "var(--c-text, #f0eeff)", fontWeight: 500 }}>
                      {report.reported_user_name}
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        display: "inline-block",
                        padding: "3px 10px",
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 700,
                        color: REASON_COLORS[report.reason] || "#9ca3af",
                        background: (REASON_COLORS[report.reason] || "#9ca3af") + "18",
                        border: `1px solid ${(REASON_COLORS[report.reason] || "#9ca3af")}30`,
                      }}>
                        {report.reason}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, color: "var(--c-text-muted, #9b93b8)", fontSize: 12, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {report.details || "—"}
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => handleResolve(report.id)}
                          disabled={processingId === report.id}
                          style={{
                            padding: "5px 12px",
                            borderRadius: 8,
                            border: "1px solid rgba(245,158,11,0.3)",
                            background: "rgba(245,158,11,0.1)",
                            color: "#F59E0B",
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: "pointer",
                            opacity: processingId === report.id ? 0.5 : 1,
                          }}
                        >
                          {processingId === report.id ? "..." : "Traite"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

/* ────────────────────────────────────── Tab: Feedback ── */

interface FeedbackRow {
  id: string;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  type: string;
  category: string | null;
  title: string;
  description: string;
  priority: string;
  status: string;
  admin_notes: string | null;
  page_url: string | null;
  device: string | null;
  app_source: string;
  created_at: string;
}

function FeedbackTab() {
  const [feedbacks, setFeedbacks] = useState<FeedbackRow[]>([]);
  const [fbLoading, setFbLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterApp, setFilterApp] = useState("all");
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesText, setNotesText] = useState("");
  const [processingFbId, setProcessingFbId] = useState<string | null>(null);

  const fetchFeedbacks = useCallback(async () => {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data, error } = await supabase
        .from("feedback")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      setFeedbacks(data || []);
    } catch {
      toast.error("Erreur chargement feedback");
    } finally {
      setFbLoading(false);
    }
  }, []);

  useEffect(() => { fetchFeedbacks(); }, [fetchFeedbacks]);

  async function updateFbStatus(id: string, status: string) {
    setProcessingFbId(id);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error } = await supabase
        .from("feedback")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, status } : f));
      toast.success(`Statut → ${status}`);
    } catch {
      toast.error("Erreur mise à jour");
    } finally {
      setProcessingFbId(null);
    }
  }

  async function saveFbNotes(id: string) {
    setProcessingFbId(id);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error } = await supabase
        .from("feedback")
        .update({ admin_notes: notesText, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, admin_notes: notesText } : f));
      setEditingNotes(null);
      toast.success("Notes sauvegardées");
    } catch {
      toast.error("Erreur sauvegarde");
    } finally {
      setProcessingFbId(null);
    }
  }

  const filtered = feedbacks.filter(f => {
    if (filterStatus !== "all" && f.status !== filterStatus) return false;
    if (filterType !== "all" && f.type !== filterType) return false;
    if (filterApp !== "all" && f.app_source !== filterApp) return false;
    return true;
  });

  const countNew = feedbacks.filter(f => f.status === "new").length;
  const countInProgress = feedbacks.filter(f => f.status === "in_progress").length;

  const FB_TYPE_COLORS: Record<string, string> = {
    bug: "#ef4444", suggestion: "#3b82f6", feature: "#8b5cf6",
    praise: "#F59E0B", complaint: "#f59e0b",
  };
  const FB_TYPE_ICONS: Record<string, string> = {
    bug: "🐛", suggestion: "💡", feature: "✨", praise: "👏", complaint: "⚠️",
  };
  const FB_STATUS_COLORS: Record<string, string> = {
    new: "#3b82f6", read: "#8b5cf6", in_progress: "#f59e0b",
    done: "#F59E0B", rejected: "#6b7280",
  };
  const FB_STATUS_LABELS: Record<string, string> = {
    new: "Nouveau", read: "Lu", in_progress: "En cours",
    done: "Fait", rejected: "Rejeté",
  };

  if (fbLoading) {
    return <div style={{ textAlign: "center", padding: 60, color: "var(--c-text-muted, #9b93b8)" }}>Chargement des feedbacks...</div>;
  }

  return (
    <>
      {/* KPI */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
        <div style={{ ...cardStyle, padding: 20 }}>
          <p style={{ fontSize: 28, fontWeight: 800, color: "var(--c-accent, #A78BFA)" }}>{feedbacks.length}</p>
          <p style={{ fontSize: 12, color: "var(--c-text-muted)", marginTop: 4 }}>Total feedbacks</p>
        </div>
        <div style={{ ...cardStyle, padding: 20 }}>
          <p style={{ fontSize: 28, fontWeight: 800, color: "#3b82f6" }}>{countNew}</p>
          <p style={{ fontSize: 12, color: "var(--c-text-muted)", marginTop: 4 }}>Nouveaux</p>
        </div>
        <div style={{ ...cardStyle, padding: 20 }}>
          <p style={{ fontSize: 28, fontWeight: 800, color: "#f59e0b" }}>{countInProgress}</p>
          <p style={{ fontSize: 12, color: "var(--c-text-muted)", marginTop: 4 }}>En cours</p>
        </div>
        <div style={{ ...cardStyle, padding: 20 }}>
          <p style={{ fontSize: 28, fontWeight: 800, color: "#F59E0B" }}>{feedbacks.filter(f => f.status === "done").length}</p>
          <p style={{ fontSize: 12, color: "var(--c-text-muted)", marginTop: 4 }}>Terminés</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: 10, background: "var(--c-card)", border: "1px solid var(--c-border)", color: "var(--c-text)", fontSize: 13 }}>
          <option value="all">Tous statuts</option>
          <option value="new">Nouveau ({countNew})</option>
          <option value="read">Lu</option>
          <option value="in_progress">En cours ({countInProgress})</option>
          <option value="done">Fait</option>
          <option value="rejected">Rejeté</option>
        </select>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: 10, background: "var(--c-card)", border: "1px solid var(--c-border)", color: "var(--c-text)", fontSize: 13 }}>
          <option value="all">Tous types</option>
          <option value="bug">🐛 Bug</option>
          <option value="suggestion">💡 Suggestion</option>
          <option value="feature">✨ Feature</option>
          <option value="praise">👏 Compliment</option>
          <option value="complaint">⚠️ Plainte</option>
        </select>
        <select value={filterApp} onChange={(e) => setFilterApp(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: 10, background: "var(--c-card)", border: "1px solid var(--c-border)", color: "var(--c-text)", fontSize: 13 }}>
          <option value="all">Toutes apps</option>
          <option value="pawly">🐾 Pawly</option>
          <option value="pawdirectory">📂 PawDirectory</option>
        </select>
      </div>

      {/* Feedback list */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60 }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>📭</p>
          <p style={{ color: "var(--c-text-muted)", fontSize: 14 }}>Aucun feedback avec ces filtres</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((fb) => (
            <div key={fb.id} style={{ ...cardStyle, padding: 20 }}>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 20 }}>{FB_TYPE_ICONS[fb.type] || "💬"}</span>
                  <div style={{ minWidth: 0 }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--c-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {fb.title}
                    </h3>
                    <p style={{ margin: 0, fontSize: 12, color: "var(--c-text-muted)", marginTop: 2 }}>
                      {fb.user_email || "Anonyme"} • {fb.category || "—"} • {new Date(fb.created_at).toLocaleDateString("fr-CH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
                  <span style={{
                    padding: "3px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700,
                    background: fb.app_source === "pawly" ? "rgba(139,92,246,0.15)" : "rgba(13,148,136,0.15)",
                    color: fb.app_source === "pawly" ? "#A78BFA" : "#0D9488",
                    border: `1px solid ${fb.app_source === "pawly" ? "#A78BFA" : "#0D9488"}30`,
                  }}>
                    {fb.app_source === "pawly" ? "Pawly" : "PawDirectory"}
                  </span>
                  <span style={{
                    padding: "3px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700,
                    color: FB_TYPE_COLORS[fb.type] || "#9ca3af",
                    background: (FB_TYPE_COLORS[fb.type] || "#9ca3af") + "18",
                    border: `1px solid ${(FB_TYPE_COLORS[fb.type] || "#9ca3af")}30`,
                  }}>
                    {fb.type}
                  </span>
                  <span style={{
                    padding: "3px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700,
                    color: FB_STATUS_COLORS[fb.status] || "#9ca3af",
                    background: (FB_STATUS_COLORS[fb.status] || "#9ca3af") + "18",
                    border: `1px solid ${(FB_STATUS_COLORS[fb.status] || "#9ca3af")}30`,
                  }}>
                    {FB_STATUS_LABELS[fb.status] || fb.status}
                  </span>
                </div>
              </div>

              {/* Description */}
              <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--c-text)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                {fb.description}
              </p>

              {fb.page_url && (
                <p style={{ margin: "0 0 14px", fontSize: 11, color: "var(--c-text-muted)" }}>
                  📍 {fb.page_url}
                </p>
              )}

              {/* Admin notes */}
              {editingNotes === fb.id ? (
                <div style={{ marginBottom: 14 }}>
                  <textarea value={notesText} onChange={(e) => setNotesText(e.target.value)} rows={3} placeholder="Notes admin..."
                    style={{ width: "100%", padding: "10px 12px", background: "var(--c-deep, #0f0c1a)", border: "1px solid var(--c-border)", borderRadius: 10, color: "var(--c-text)", fontSize: 13, resize: "vertical", boxSizing: "border-box" }}
                  />
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    <button onClick={() => saveFbNotes(fb.id)} disabled={processingFbId === fb.id}
                      style={{ padding: "5px 14px", borderRadius: 8, background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)", color: "#F59E0B", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                      {processingFbId === fb.id ? "..." : "Sauver"}
                    </button>
                    <button onClick={() => setEditingNotes(null)}
                      style={{ padding: "5px 14px", borderRadius: 8, background: "var(--c-card)", border: "1px solid var(--c-border)", color: "var(--c-text-muted)", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                      Annuler
                    </button>
                  </div>
                </div>
              ) : fb.admin_notes ? (
                <div onClick={() => { setEditingNotes(fb.id); setNotesText(fb.admin_notes || ""); }}
                  style={{ marginBottom: 14, padding: "10px 12px", background: "rgba(139,92,246,0.08)", borderRadius: 10, border: "1px solid rgba(139,92,246,0.15)", cursor: "pointer" }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "var(--c-accent, #A78BFA)", marginBottom: 4 }}>📝 Notes admin</p>
                  <p style={{ margin: 0, fontSize: 12, color: "var(--c-text-muted)" }}>{fb.admin_notes}</p>
                </div>
              ) : null}

              {/* Actions */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {fb.status === "new" && (
                  <button onClick={() => updateFbStatus(fb.id, "read")} disabled={processingFbId === fb.id}
                    style={{ padding: "5px 12px", borderRadius: 8, background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.3)", color: "#A78BFA", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                    👁 Marquer lu
                  </button>
                )}
                {(fb.status === "new" || fb.status === "read") && (
                  <button onClick={() => updateFbStatus(fb.id, "in_progress")} disabled={processingFbId === fb.id}
                    style={{ padding: "5px 12px", borderRadius: 8, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", color: "#f59e0b", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                    🔧 En cours
                  </button>
                )}
                {fb.status !== "done" && (
                  <button onClick={() => updateFbStatus(fb.id, "done")} disabled={processingFbId === fb.id}
                    style={{ padding: "5px 12px", borderRadius: 8, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", color: "#F59E0B", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                    ✅ Fait
                  </button>
                )}
                {fb.status !== "rejected" && (
                  <button onClick={() => updateFbStatus(fb.id, "rejected")} disabled={processingFbId === fb.id}
                    style={{ padding: "5px 12px", borderRadius: 8, background: "rgba(107,114,128,0.1)", border: "1px solid rgba(107,114,128,0.3)", color: "#6b7280", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                    ✗ Rejeter
                  </button>
                )}
                <button onClick={() => { setEditingNotes(fb.id); setNotesText(fb.admin_notes || ""); }}
                  style={{ padding: "5px 12px", borderRadius: 8, background: "var(--c-deep, #0f0c1a)", border: "1px solid var(--c-border)", color: "var(--c-text-muted)", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                  📝 Notes
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ────────────────────────────────────── Tab: Verification ── */

function VerificationTab() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [vLoading, setVLoading] = useState(true);
  const [vFilter, setVFilter] = useState<string>("submitted");
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchVerifications();
  }, [vFilter]);

  async function fetchVerifications() {
    setVLoading(true);
    try {
      const res = await fetch(`/api/admin/verification?status=${vFilter}`);
      const json = await res.json();
      setProfiles(json.profiles || []);
    } catch {
      setProfiles([]);
    }
    setVLoading(false);
  }

  async function updateStatus(profileId: string, status: "approved" | "rejected", note?: string) {
    setProcessingId(profileId);
    try {
      const res = await fetch("/api/admin/verification", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile_id: profileId, status, note }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert("Erreur: " + (json.error || "Echec de la mise a jour"));
      }
    } catch (err: any) {
      alert("Erreur réseau: " + err.message);
    }
    setProcessingId(null);
    fetchVerifications();
  }

  const statusColors: Record<string, string> = {
    pending: "#9ca3af",
    submitted: "#3b82f6",
    approved: "#F59E0B",
    rejected: "#ef4444",
  };
  const statusLabels: Record<string, string> = {
    pending: "En attente",
    submitted: "Soumise",
    approved: "Approuvee",
    rejected: "Refusee",
  };

  const submitted = profiles.filter(p => p.verification_status === "submitted").length;

  return (
    <>
      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { label: "A verifier", val: submitted, color: "#3b82f6" },
          { label: "Total", val: profiles.length, color: "var(--c-text-muted)" },
        ].map(k => (
          <div key={k.label} style={{ background: "var(--c-card)", border: "1px solid var(--c-border)", borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: k.color }}>{k.val}</div>
            <div style={{ fontSize: 11, color: "var(--c-text-muted)", marginTop: 2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {["submitted", "pending", "approved", "rejected", "all"].map(s => (
          <button key={s} onClick={() => setVFilter(s)} style={{
            padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, border: "1px solid",
            background: vFilter === s ? (statusColors[s] || "var(--c-accent)") : "transparent",
            borderColor: vFilter === s ? "transparent" : "var(--c-border)",
            color: vFilter === s ? "#fff" : "var(--c-text-muted)",
          }}>
            {s === "all" ? "Toutes" : statusLabels[s] || s}
          </button>
        ))}
      </div>

      {vLoading ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--c-text-muted)" }}>Chargement...</div>
      ) : profiles.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--c-text-muted)" }}>Aucun profil dans ce filtre.</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {profiles.map(p => (
            <div key={p.id} style={{
              background: "var(--c-card)", border: "1px solid var(--c-border)", borderRadius: 14, padding: 16,
              display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap",
            }}>
              {/* Verification photo */}
              {p.verification_photo_url ? (
                <a href={p.verification_photo_url} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0 }}>
                  <img src={p.verification_photo_url} alt="Verification" style={{
                    width: 120, height: 90, objectFit: "cover", borderRadius: 10,
                    border: `2px solid ${statusColors[p.verification_status] || "#ccc"}`,
                  }} />
                </a>
              ) : (
                <div style={{ width: 120, height: 90, borderRadius: 10, background: "var(--c-bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>📷</div>
              )}

              {/* Info */}
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 800, fontSize: 14, color: "var(--c-text)" }}>{p.full_name || "Sans nom"}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
                    background: statusColors[p.verification_status] + "22",
                    color: statusColors[p.verification_status],
                  }}>
                    {statusLabels[p.verification_status] || p.verification_status}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "var(--c-text-muted)" }}>{p.email}</div>
                <div style={{ fontSize: 11, color: "var(--c-text-muted)", marginTop: 4 }}>
                  {p.verification_submitted_at
                    ? "Soumise le " + new Date(p.verification_submitted_at).toLocaleDateString("fr-CH")
                    : "Jamais soumise"}
                </div>
                {p.verification_note && (
                  <div style={{ fontSize: 11, color: "#ef4444", marginTop: 4 }}>Note: {p.verification_note}</div>
                )}
              </div>

              {/* Actions */}
              {p.verification_status === "submitted" && (
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => updateStatus(p.id, "approved")}
                    disabled={processingId === p.id}
                    style={{
                      padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 800,
                      background: "#F59E0B", color: "#fff", border: "none", cursor: "pointer",
                      opacity: processingId === p.id ? 0.5 : 1,
                    }}>
                    ✅ Approuver
                  </button>
                  <button
                    onClick={() => {
                      const note = prompt("Raison du refus ?");
                      if (note !== null) updateStatus(p.id, "rejected", note || "Photo non conforme");
                    }}
                    disabled={processingId === p.id}
                    style={{
                      padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 800,
                      background: "#ef4444", color: "#fff", border: "none", cursor: "pointer",
                      opacity: processingId === p.id ? 0.5 : 1,
                    }}>
                    ❌ Refuser
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
