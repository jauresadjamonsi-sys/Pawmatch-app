"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useRouter } from "next/navigation";

interface AdminStats {
  totalUsers: number;
  usersToday: number;
  usersWeek: number;
  usersMonth: number;
  totalAnimals: number;
  animalsBySpecies: Record<string, number>;
  totalMatches: number;
  matchesToday: number;
  totalMessages: number;
  premiumCount: number;
  proCount: number;
  recentUsers: { email: string; full_name: string | null; created_at: string; subscription: string | null }[];
  recentAnimals: { name: string; species: string; canton: string; created_at: string }[];
  dailySignups: { date: string; count: number }[];
}

export default function AdminPage() {
  const { profile, loading: authLoading, isAdmin, isAuthenticated } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchStats = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/admin/stats");
      if (res.status === 401) {
        router.push("/login?redirectTo=/admin");
        return;
      }
      if (res.status === 403) {
        setError("Acces refuse. Vous n'etes pas administrateur.");
        setLoading(false);
        return;
      }
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
    if (!isAuthenticated) {
      router.push("/login?redirectTo=/admin");
      return;
    }
    if (!isAdmin) {
      setError("Acces refuse. Vous n'etes pas administrateur.");
      setLoading(false);
      return;
    }
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
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--c-deep, #0f0c1a)" }}>
        <div style={{ color: "var(--c-text-muted, #9b93b8)", fontSize: 18 }}>Chargement...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--c-deep, #0f0c1a)" }}>
        <div style={{ color: "#ef4444", fontSize: 18, textAlign: "center", padding: 32 }}>{error}</div>
      </div>
    );
  }

  if (!stats) return null;

  const maxDailySignup = Math.max(...stats.dailySignups.map(d => d.count), 1);
  const speciesEntries = Object.entries(stats.animalsBySpecies).sort((a, b) => b[1] - a[1]);
  const maxSpeciesCount = Math.max(...speciesEntries.map(e => e[1]), 1);

  return (
    <div style={{ minHeight: "100vh", background: "var(--c-deep, #0f0c1a)", padding: "24px 16px 48px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--c-text, #f0eeff)", margin: 0 }}>
              Dashboard Admin
            </h1>
            <p style={{ color: "var(--c-text-muted, #9b93b8)", fontSize: 13, marginTop: 4 }}>
              Derniere MAJ : {lastRefresh.toLocaleTimeString("fr-CH")}
            </p>
          </div>
          <button
            onClick={() => { setLoading(true); fetchStats(); }}
            style={{
              background: "var(--c-card, #1e1830)",
              border: "1px solid var(--c-border, #2d2545)",
              color: "var(--c-text, #f0eeff)",
              padding: "10px 20px",
              borderRadius: 12,
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 600,
              transition: "opacity 0.2s",
            }}
          >
            Actualiser
          </button>
        </div>

        {/* KPI Cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
          marginBottom: 32,
        }}>
          <KPICard
            label="Total utilisateurs"
            value={stats.totalUsers}
            sub={stats.usersToday > 0 ? `+${stats.usersToday} aujourd'hui` : undefined}
            subColor="#22c55e"
            icon="U"
            iconBg="rgba(139,92,246,0.15)"
            iconColor="#A78BFA"
          />
          <KPICard
            label="Total animaux"
            value={stats.totalAnimals}
            icon="A"
            iconBg="rgba(56,189,248,0.15)"
            iconColor="#38BDF8"
          />
          <KPICard
            label="Total matchs"
            value={stats.totalMatches}
            sub={stats.matchesToday > 0 ? `+${stats.matchesToday} aujourd'hui` : undefined}
            subColor="#22c55e"
            icon="M"
            iconBg="rgba(245,158,11,0.15)"
            iconColor="#F59E0B"
          />
          <KPICard
            label="Abonnements actifs"
            value={stats.premiumCount + stats.proCount}
            sub={`${stats.premiumCount} premium / ${stats.proCount} pro`}
            subColor="#F59E0B"
            icon="$"
            iconBg="rgba(34,197,94,0.15)"
            iconColor="#22c55e"
          />
        </div>

        {/* Charts Row */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: 16,
          marginBottom: 32,
        }}>
          {/* Weekly Signups Chart */}
          <div style={{
            background: "var(--c-card, #1e1830)",
            border: "1px solid var(--c-border, #2d2545)",
            borderRadius: 16,
            padding: 24,
          }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--c-text, #f0eeff)", margin: "0 0 20px" }}>
              Inscriptions cette semaine
            </h2>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 120 }}>
              {stats.dailySignups.map((d, i) => (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "var(--c-text, #f0eeff)" }}>
                    {d.count}
                  </span>
                  <div style={{
                    width: "100%",
                    maxWidth: 40,
                    height: `${Math.max((d.count / maxDailySignup) * 80, 4)}px`,
                    background: "linear-gradient(180deg, var(--c-accent, #A78BFA), rgba(139,92,246,0.4))",
                    borderRadius: 6,
                    transition: "height 0.3s ease",
                  }} />
                  <span style={{ fontSize: 10, color: "var(--c-text-muted, #9b93b8)", whiteSpace: "nowrap" }}>
                    {d.date.split(" ")[0]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Animals by Species Chart */}
          <div style={{
            background: "var(--c-card, #1e1830)",
            border: "1px solid var(--c-border, #2d2545)",
            borderRadius: 16,
            padding: 24,
          }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--c-text, #f0eeff)", margin: "0 0 20px" }}>
              Animaux par espece
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {speciesEntries.length === 0 && (
                <span style={{ color: "var(--c-text-muted, #9b93b8)", fontSize: 13 }}>Aucune donnee</span>
              )}
              {speciesEntries.map(([species, count]) => (
                <div key={species} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{
                    fontSize: 13,
                    color: "var(--c-text-muted, #9b93b8)",
                    width: 80,
                    flexShrink: 0,
                    textTransform: "capitalize",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}>
                    {species}
                  </span>
                  <div style={{ flex: 1, height: 20, background: "rgba(255,255,255,0.05)", borderRadius: 6, overflow: "hidden" }}>
                    <div style={{
                      width: `${(count / maxSpeciesCount) * 100}%`,
                      height: "100%",
                      background: "linear-gradient(90deg, var(--c-accent, #A78BFA), rgba(139,92,246,0.5))",
                      borderRadius: 6,
                      transition: "width 0.3s ease",
                    }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text, #f0eeff)", width: 36, textAlign: "right" }}>
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity Tables */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: 16,
        }}>
          {/* Recent Signups */}
          <div style={{
            background: "var(--c-card, #1e1830)",
            border: "1px solid var(--c-border, #2d2545)",
            borderRadius: 16,
            padding: 24,
            overflow: "hidden",
          }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--c-text, #f0eeff)", margin: "0 0 16px" }}>
              Dernieres inscriptions
            </h2>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    {["Date", "Nom", "Email", "Abo"].map(h => (
                      <th key={h} style={{
                        textAlign: "left",
                        padding: "8px 10px",
                        color: "var(--c-text-muted, #9b93b8)",
                        fontWeight: 600,
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        borderBottom: "1px solid var(--c-border, #2d2545)",
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.recentUsers.map((u, i) => (
                    <tr key={i}>
                      <td style={{ padding: "8px 10px", color: "var(--c-text-muted, #9b93b8)", whiteSpace: "nowrap" }}>
                        {formatDate(u.created_at)}
                      </td>
                      <td style={{ padding: "8px 10px", color: "var(--c-text, #f0eeff)", fontWeight: 500 }}>
                        {u.full_name || "-"}
                      </td>
                      <td style={{ padding: "8px 10px", color: "var(--c-text-muted, #9b93b8)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {u.email}
                      </td>
                      <td style={{ padding: "8px 10px" }}>
                        <SubscriptionBadge sub={u.subscription} />
                      </td>
                    </tr>
                  ))}
                  {stats.recentUsers.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ padding: 16, textAlign: "center", color: "var(--c-text-muted, #9b93b8)" }}>
                        Aucune inscription
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Animals */}
          <div style={{
            background: "var(--c-card, #1e1830)",
            border: "1px solid var(--c-border, #2d2545)",
            borderRadius: 16,
            padding: 24,
            overflow: "hidden",
          }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--c-text, #f0eeff)", margin: "0 0 16px" }}>
              Derniers animaux
            </h2>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    {["Date", "Nom", "Espece", "Canton"].map(h => (
                      <th key={h} style={{
                        textAlign: "left",
                        padding: "8px 10px",
                        color: "var(--c-text-muted, #9b93b8)",
                        fontWeight: 600,
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        borderBottom: "1px solid var(--c-border, #2d2545)",
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.recentAnimals.map((a, i) => (
                    <tr key={i}>
                      <td style={{ padding: "8px 10px", color: "var(--c-text-muted, #9b93b8)", whiteSpace: "nowrap" }}>
                        {formatDate(a.created_at)}
                      </td>
                      <td style={{ padding: "8px 10px", color: "var(--c-text, #f0eeff)", fontWeight: 500 }}>
                        {a.name}
                      </td>
                      <td style={{ padding: "8px 10px", color: "var(--c-text-muted, #9b93b8)", textTransform: "capitalize" }}>
                        {a.species}
                      </td>
                      <td style={{ padding: "8px 10px", color: "var(--c-text-muted, #9b93b8)" }}>
                        {a.canton || "-"}
                      </td>
                    </tr>
                  ))}
                  {stats.recentAnimals.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ padding: 16, textAlign: "center", color: "var(--c-text-muted, #9b93b8)" }}>
                        Aucun animal
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer stats */}
        <div style={{
          marginTop: 24,
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          justifyContent: "center",
        }}>
          <StatPill label="Messages totaux" value={stats.totalMessages} />
          <StatPill label="Inscrits ce mois" value={stats.usersMonth} />
          <StatPill label="Inscrits cette semaine" value={stats.usersWeek} />
        </div>
      </div>
    </div>
  );
}

function KPICard({ label, value, sub, subColor, icon, iconBg, iconColor }: {
  label: string;
  value: number;
  sub?: string;
  subColor?: string;
  icon: string;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div style={{
      background: "var(--c-card, #1e1830)",
      border: "1px solid var(--c-border, #2d2545)",
      borderRadius: 16,
      padding: 24,
      display: "flex",
      alignItems: "flex-start",
      gap: 16,
    }}>
      <div style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        background: iconBg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 18,
        fontWeight: 800,
        color: iconColor,
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <p style={{ color: "var(--c-text-muted, #9b93b8)", fontSize: 13, margin: 0, marginBottom: 4 }}>
          {label}
        </p>
        <p style={{ color: "var(--c-text, #f0eeff)", fontSize: 28, fontWeight: 800, margin: 0, lineHeight: 1 }}>
          {value.toLocaleString("fr-CH")}
        </p>
        {sub && (
          <p style={{ color: subColor || "var(--c-text-muted)", fontSize: 12, margin: 0, marginTop: 4, fontWeight: 600 }}>
            {sub}
          </p>
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
    <span style={{
      padding: "3px 10px",
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 600,
      background: c.bg,
      color: c.color,
    }}>
      {c.label}
    </span>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div style={{
      background: "var(--c-card, #1e1830)",
      border: "1px solid var(--c-border, #2d2545)",
      borderRadius: 20,
      padding: "8px 18px",
      fontSize: 13,
      color: "var(--c-text-muted, #9b93b8)",
    }}>
      {label}: <span style={{ fontWeight: 700, color: "var(--c-text, #f0eeff)" }}>{value.toLocaleString("fr-CH")}</span>
    </div>
  );
}

function formatDate(iso: string) {
  if (!iso) return "-";
  const d = new Date(iso);
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}
