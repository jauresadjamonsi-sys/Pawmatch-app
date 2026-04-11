"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { getAnimalById, AnimalRow } from "@/lib/services/animals";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useAppContext } from "@/lib/contexts/AppContext";
import { EMOJI_MAP } from "@/lib/constants";
import { formatAge } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type HealthRecord = {
  id: string;
  animal_id: string;
  user_id: string;
  type: "vaccine" | "vet_visit" | "medication" | "weight" | "allergy" | "note";
  title: string;
  description: string | null;
  date: string;
  next_due: string | null;
  value: number | null;
  unit: string | null;
  recurring: boolean;
  recurring_interval_days: number | null;
  status: "active" | "completed" | "missed" | "cancelled";
  created_at: string;
  updated_at: string;
};

type RecordFormData = {
  type: HealthRecord["type"];
  title: string;
  description: string;
  date: string;
  next_due: string;
  value: string;
  unit: string;
  status: string;
};

type TabKey = "overview" | "weight" | "vaccines" | "appointments" | "notes";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RECORD_TYPES: { value: HealthRecord["type"]; label: string; emoji: string; color: string }[] = [
  { value: "weight", label: "Poids", emoji: "\u2696\uFE0F", color: "#3b82f6" },
  { value: "vaccine", label: "Vaccin", emoji: "\uD83D\uDC89", color: "#8b5cf6" },
  { value: "vet_visit", label: "Visite veto", emoji: "\uD83C\uDFE5", color: "#06b6d4" },
  { value: "medication", label: "Medicament", emoji: "\uD83D\uDC8A", color: "#FBBF24" },
  { value: "allergy", label: "Allergie", emoji: "\u26A0\uFE0F", color: "#ef4444" },
  { value: "note", label: "Note", emoji: "\uD83D\uDCDD", color: "#FBBF24" },
];

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  active: { label: "Actif", bg: "rgba(251,191,36,0.15)", text: "#FBBF24" },
  completed: { label: "Termine", bg: "rgba(59,130,246,0.15)", text: "#3b82f6" },
  missed: { label: "Manque", bg: "rgba(239,68,68,0.15)", text: "#ef4444" },
  cancelled: { label: "Annule", bg: "rgba(156,163,175,0.15)", text: "#9ca3af" },
};

const TABS: { key: TabKey; label: string; emoji: string }[] = [
  { key: "overview", label: "Vue d'ensemble", emoji: "\uD83D\uDCCA" },
  { key: "weight", label: "Poids", emoji: "\u2696\uFE0F" },
  { key: "vaccines", label: "Vaccins", emoji: "\uD83D\uDC89" },
  { key: "appointments", label: "Rendez-vous", emoji: "\uD83D\uDCC5" },
  { key: "notes", label: "Notes", emoji: "\uD83D\uDCDD" },
];

const emptyForm: RecordFormData = {
  type: "weight",
  title: "",
  description: "",
  date: new Date().toISOString().split("T")[0],
  next_due: "",
  value: "",
  unit: "kg",
  status: "active",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("fr-CH", { day: "numeric", month: "short", year: "numeric" });
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function getTypeConfig(type: string) {
  return RECORD_TYPES.find((t) => t.value === type) || RECORD_TYPES[5];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function HealthTrackerPage() {
  const [animal, setAnimal] = useState<AnimalRow | null>(null);
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<RecordFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const params = useParams();
  const supabase = createClient();
  const { profile } = useAuth();
  const { lang } = useAppContext();
  const animalId = params.id as string;

  // -- Data fetching --

  const fetchRecords = useCallback(async () => {
    try {
      const res = await fetch(`/api/animals/${animalId}/health`);
      const json = await res.json();
      if (json.records) setRecords(json.records);
    } catch (e) {
      console.error("Failed to fetch health records", e);
    }
  }, [animalId]);

  useEffect(() => {
    async function load() {
      const result = await getAnimalById(supabase, animalId);
      if (result.data) {
        setAnimal(result.data);
        document.title = result.data.name + " — Suivi sante";
      }
      await fetchRecords();
      setLoading(false);
    }
    load();
  }, [animalId]);

  // -- Form handlers --

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError("Le titre est requis");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/animals/${animalId}/health`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: formData.type,
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          date: formData.date,
          next_due: formData.next_due || null,
          value: formData.value ? parseFloat(formData.value) : null,
          unit: formData.unit || null,
          status: formData.status,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Erreur lors de l'enregistrement");
      }

      await fetchRecords();
      setShowForm(false);
      setFormData(emptyForm);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(recordId: string) {
    try {
      await fetch(`/api/animals/${animalId}/health?recordId=${recordId}`, { method: "DELETE" });
      await fetchRecords();
      setDeleteConfirm(null);
    } catch (e) {
      console.error("Delete failed", e);
    }
  }

  // -- Derived data --

  const weightRecords = records.filter((r) => r.type === "weight").sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const vaccineRecords = records.filter((r) => r.type === "vaccine");
  const appointmentRecords = records.filter((r) => r.type === "vet_visit");
  const noteRecords = records.filter((r) => r.type === "note" || r.type === "medication" || r.type === "allergy");

  const upcomingAppointments = appointmentRecords.filter((r) => r.next_due && daysUntil(r.next_due) >= 0);
  const pastAppointments = appointmentRecords.filter((r) => !r.next_due || daysUntil(r.next_due) < 0);

  const latestWeight = weightRecords.length > 0 ? weightRecords[weightRecords.length - 1] : null;
  const maxWeight = weightRecords.length > 0 ? Math.max(...weightRecords.map((r) => r.value || 0)) : 1;

  const overdueVaccines = vaccineRecords.filter((r) => r.next_due && daysUntil(r.next_due) < 0 && r.status === "active");
  const upcomingVaccines = vaccineRecords.filter((r) => r.next_due && daysUntil(r.next_due) >= 0 && r.status === "active");

  // -----------------------------------------------------------------------
  // Loading skeleton
  // -----------------------------------------------------------------------

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", padding: "24px 16px", background: "var(--c-deep)" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          {/* Shimmer header */}
          <div
            className="animate-shimmer"
            style={{ height: 14, width: 100, borderRadius: 8, background: "var(--c-border)", marginBottom: 16 }}
          />
          <div
            className="animate-shimmer"
            style={{
              height: 100,
              borderRadius: 20,
              background: "var(--c-card)",
              border: "1.5px solid var(--c-border)",
              marginBottom: 20,
            }}
          />
          {/* Shimmer tabs */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="animate-shimmer"
                style={{ height: 36, width: 80, borderRadius: 14, background: "var(--c-card)" }}
              />
            ))}
          </div>
          {/* Shimmer cards */}
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-shimmer"
              style={{
                height: 120,
                borderRadius: 20,
                background: "var(--c-card)",
                border: "1.5px solid var(--c-border)",
                marginBottom: 12,
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!animal) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--c-text-muted)" }}>Animal introuvable</p>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Render helpers
  // -----------------------------------------------------------------------

  function renderStatusBadge(status: string) {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.active;
    return (
      <span
        style={{
          display: "inline-block",
          padding: "3px 10px",
          borderRadius: 10,
          fontSize: 11,
          fontWeight: 700,
          background: cfg.bg,
          color: cfg.text,
          letterSpacing: 0.3,
        }}
      >
        {cfg.label}
      </span>
    );
  }

  function renderWeightChart() {
    if (weightRecords.length === 0) {
      return (
        <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--c-text-muted)" }}>
          <p style={{ fontSize: 40, marginBottom: 8 }}>{"\u2696\uFE0F"}</p>
          <p style={{ fontSize: 14 }}>Aucun releve de poids enregistre</p>
          <button
            onClick={() => {
              setFormData({ ...emptyForm, type: "weight", title: "Releve de poids" });
              setShowForm(true);
            }}
            className="btn-press"
            style={{
              marginTop: 12,
              padding: "10px 20px",
              borderRadius: 14,
              border: "none",
              background: "var(--c-accent)",
              color: "#000",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            + Ajouter un poids
          </button>
        </div>
      );
    }

    const displayRecords = weightRecords.slice(-10); // show last 10
    const chartMax = maxWeight * 1.2;

    return (
      <div>
        {/* Current weight */}
        {latestWeight && (
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <p style={{ fontSize: 42, fontWeight: 900, color: "var(--c-accent)", margin: 0, lineHeight: 1 }}>
              {latestWeight.value}
              <span style={{ fontSize: 16, fontWeight: 600, color: "var(--c-text-muted)" }}>
                {" "}{latestWeight.unit || "kg"}
              </span>
            </p>
            <p style={{ fontSize: 12, color: "var(--c-text-muted)", marginTop: 4 }}>
              {formatDate(latestWeight.date)}
            </p>
            {weightRecords.length >= 2 && (() => {
              const prev = weightRecords[weightRecords.length - 2];
              const diff = (latestWeight.value || 0) - (prev.value || 0);
              const sign = diff > 0 ? "+" : "";
              const color = Math.abs(diff) < 0.1 ? "var(--c-text-muted)" : diff > 0 ? "#FBBF24" : "#3b82f6";
              return (
                <p style={{ fontSize: 12, fontWeight: 700, color, marginTop: 2 }}>
                  {sign}{diff.toFixed(1)} {latestWeight.unit || "kg"} vs precedent
                </p>
              );
            })()}
          </div>
        )}

        {/* Bar chart */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 120, padding: "0 4px" }}>
          {displayRecords.map((r, i) => {
            const pct = ((r.value || 0) / chartMax) * 100;
            const isLatest = i === displayRecords.length - 1;
            return (
              <div key={r.id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: isLatest ? "var(--c-accent)" : "var(--c-text-muted)" }}>
                  {r.value}
                </span>
                <div
                  className="animate-slide-up"
                  style={{
                    width: "100%",
                    maxWidth: 32,
                    height: `${Math.max(pct, 8)}%`,
                    borderRadius: 8,
                    background: isLatest
                      ? "linear-gradient(to top, var(--c-accent), #4ade80)"
                      : "rgba(251,191,36,0.2)",
                    transition: "height 0.5s ease",
                  }}
                />
                <span style={{ fontSize: 8, color: "var(--c-text-muted)", whiteSpace: "nowrap" }}>
                  {new Date(r.date + "T00:00:00").toLocaleDateString("fr-CH", { day: "numeric", month: "short" })}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderVaccineCard(record: HealthRecord) {
    const isOverdue = record.next_due && daysUntil(record.next_due) < 0;
    const isUpcoming = record.next_due && daysUntil(record.next_due) >= 0 && daysUntil(record.next_due) <= 30;
    const borderColor = isOverdue ? "rgba(239,68,68,0.4)" : isUpcoming ? "rgba(251,191,36,0.4)" : "var(--c-border)";

    return (
      <div
        key={record.id}
        className="animate-slide-up card-hover"
        style={{
          background: "var(--c-card)",
          borderRadius: 16,
          border: `1.5px solid ${borderColor}`,
          padding: 16,
          marginBottom: 10,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 18 }}>{"\uD83D\uDC89"}</span>
              <span style={{ fontWeight: 800, fontSize: 14, color: "var(--c-text)" }}>{record.title}</span>
            </div>
            {record.description && (
              <p style={{ fontSize: 12, color: "var(--c-text-muted)", margin: "4px 0 0", lineHeight: 1.4 }}>
                {record.description}
              </p>
            )}
            <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, color: "var(--c-text-muted)" }}>
                {"\uD83D\uDCC5"} {formatDate(record.date)}
              </span>
              {record.next_due && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: isOverdue ? "#ef4444" : isUpcoming ? "#FBBF24" : "var(--c-text-muted)",
                  }}
                >
                  {isOverdue
                    ? `\u26A0\uFE0F En retard de ${Math.abs(daysUntil(record.next_due))}j`
                    : `Prochain: ${formatDate(record.next_due)}`}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            {renderStatusBadge(record.status)}
            {deleteConfirm === record.id ? (
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  onClick={() => handleDelete(record.id)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 8,
                    border: "none",
                    background: "rgba(239,68,68,0.2)",
                    color: "#ef4444",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Oui
                </button>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 8,
                    border: "none",
                    background: "var(--c-border)",
                    color: "var(--c-text-muted)",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Non
                </button>
              </div>
            ) : (
              <button
                onClick={() => setDeleteConfirm(record.id)}
                style={{
                  padding: "4px 8px",
                  borderRadius: 8,
                  border: "none",
                  background: "transparent",
                  color: "var(--c-text-muted)",
                  fontSize: 11,
                  cursor: "pointer",
                }}
              >
                {"\uD83D\uDDD1\uFE0F"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderRecordCard(record: HealthRecord) {
    const typeConf = getTypeConfig(record.type);
    return (
      <div
        key={record.id}
        className="animate-slide-up card-hover"
        style={{
          background: "var(--c-card)",
          borderRadius: 16,
          border: "1.5px solid var(--c-border)",
          padding: 16,
          marginBottom: 10,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: `${typeConf.color}20`,
                  fontSize: 14,
                }}
              >
                {typeConf.emoji}
              </span>
              <span style={{ fontWeight: 800, fontSize: 14, color: "var(--c-text)" }}>{record.title}</span>
            </div>
            {record.description && (
              <p style={{ fontSize: 12, color: "var(--c-text-muted)", margin: "4px 0 0", lineHeight: 1.4 }}>
                {record.description}
              </p>
            )}
            {record.value != null && (
              <p style={{ fontSize: 13, fontWeight: 700, color: typeConf.color, marginTop: 4 }}>
                {record.value} {record.unit || ""}
              </p>
            )}
            <p style={{ fontSize: 11, color: "var(--c-text-muted)", marginTop: 6 }}>
              {"\uD83D\uDCC5"} {formatDate(record.date)}
              {record.next_due && ` \u2192 Prochain: ${formatDate(record.next_due)}`}
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            {renderStatusBadge(record.status)}
            {deleteConfirm === record.id ? (
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  onClick={() => handleDelete(record.id)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 8,
                    border: "none",
                    background: "rgba(239,68,68,0.2)",
                    color: "#ef4444",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Oui
                </button>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 8,
                    border: "none",
                    background: "var(--c-border)",
                    color: "var(--c-text-muted)",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Non
                </button>
              </div>
            ) : (
              <button
                onClick={() => setDeleteConfirm(record.id)}
                style={{
                  padding: "4px 8px",
                  borderRadius: 8,
                  border: "none",
                  background: "transparent",
                  color: "var(--c-text-muted)",
                  fontSize: 11,
                  cursor: "pointer",
                }}
              >
                {"\uD83D\uDDD1\uFE0F"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderAppointments() {
    if (appointmentRecords.length === 0) {
      return (
        <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--c-text-muted)" }}>
          <p style={{ fontSize: 40, marginBottom: 8 }}>{"\uD83D\uDCC5"}</p>
          <p style={{ fontSize: 14 }}>Aucun rendez-vous enregistre</p>
          <button
            onClick={() => {
              setFormData({ ...emptyForm, type: "vet_visit", title: "" });
              setShowForm(true);
            }}
            className="btn-press"
            style={{
              marginTop: 12,
              padding: "10px 20px",
              borderRadius: 14,
              border: "none",
              background: "var(--c-accent)",
              color: "#000",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            + Ajouter un rendez-vous
          </button>
        </div>
      );
    }

    return (
      <div className="stagger-children">
        {upcomingAppointments.length > 0 && (
          <>
            <h3 style={{ fontSize: 13, fontWeight: 800, color: "var(--c-accent)", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>
              A venir
            </h3>
            {upcomingAppointments.map((r) => renderRecordCard(r))}
          </>
        )}
        {pastAppointments.length > 0 && (
          <>
            <h3 style={{ fontSize: 13, fontWeight: 800, color: "var(--c-text-muted)", marginTop: 20, marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>
              Passes
            </h3>
            {pastAppointments.map((r) => renderRecordCard(r))}
          </>
        )}
      </div>
    );
  }

  function renderNotes() {
    if (noteRecords.length === 0) {
      return (
        <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--c-text-muted)" }}>
          <p style={{ fontSize: 40, marginBottom: 8 }}>{"\uD83D\uDCDD"}</p>
          <p style={{ fontSize: 14 }}>Aucune note enregistree</p>
          <button
            onClick={() => {
              setFormData({ ...emptyForm, type: "note", title: "" });
              setShowForm(true);
            }}
            className="btn-press"
            style={{
              marginTop: 12,
              padding: "10px 20px",
              borderRadius: 14,
              border: "none",
              background: "var(--c-accent)",
              color: "#000",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            + Ajouter une note
          </button>
        </div>
      );
    }

    return (
      <div className="stagger-children">
        {noteRecords.map((r) => renderRecordCard(r))}
      </div>
    );
  }

  function renderOverview() {
    return (
      <div className="stagger-children">
        {/* Quick stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          {/* Weight */}
          <div
            className="glass card-hover"
            style={{ borderRadius: 16, padding: 16, textAlign: "center", border: "1.5px solid var(--c-border)" }}
          >
            <p style={{ fontSize: 11, color: "var(--c-text-muted)", fontWeight: 600, marginBottom: 4 }}>{"\u2696\uFE0F"} Poids actuel</p>
            <p style={{ fontSize: 26, fontWeight: 900, color: "var(--c-accent)", margin: 0, lineHeight: 1 }}>
              {latestWeight ? `${latestWeight.value}` : "--"}
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--c-text-muted)" }}> {latestWeight?.unit || "kg"}</span>
            </p>
          </div>
          {/* Vaccines */}
          <div
            className="glass card-hover"
            style={{ borderRadius: 16, padding: 16, textAlign: "center", border: "1.5px solid var(--c-border)" }}
          >
            <p style={{ fontSize: 11, color: "var(--c-text-muted)", fontWeight: 600, marginBottom: 4 }}>{"\uD83D\uDC89"} Vaccins</p>
            <p style={{ fontSize: 26, fontWeight: 900, color: overdueVaccines.length > 0 ? "#ef4444" : "var(--c-accent)", margin: 0, lineHeight: 1 }}>
              {vaccineRecords.length}
            </p>
            {overdueVaccines.length > 0 && (
              <p style={{ fontSize: 10, fontWeight: 700, color: "#ef4444", marginTop: 2 }}>
                {overdueVaccines.length} en retard
              </p>
            )}
          </div>
          {/* Appointments */}
          <div
            className="glass card-hover"
            style={{ borderRadius: 16, padding: 16, textAlign: "center", border: "1.5px solid var(--c-border)" }}
          >
            <p style={{ fontSize: 11, color: "var(--c-text-muted)", fontWeight: 600, marginBottom: 4 }}>{"\uD83C\uDFE5"} RDV veto</p>
            <p style={{ fontSize: 26, fontWeight: 900, color: "#06b6d4", margin: 0, lineHeight: 1 }}>
              {appointmentRecords.length}
            </p>
            {upcomingAppointments.length > 0 && (
              <p style={{ fontSize: 10, fontWeight: 600, color: "var(--c-text-muted)", marginTop: 2 }}>
                {upcomingAppointments.length} a venir
              </p>
            )}
          </div>
          {/* Notes */}
          <div
            className="glass card-hover"
            style={{ borderRadius: 16, padding: 16, textAlign: "center", border: "1.5px solid var(--c-border)" }}
          >
            <p style={{ fontSize: 11, color: "var(--c-text-muted)", fontWeight: 600, marginBottom: 4 }}>{"\uD83D\uDCDD"} Notes</p>
            <p style={{ fontSize: 26, fontWeight: 900, color: "#FBBF24", margin: 0, lineHeight: 1 }}>
              {noteRecords.length}
            </p>
          </div>
        </div>

        {/* Alerts */}
        {overdueVaccines.length > 0 && (
          <div
            className="animate-slide-up"
            style={{
              background: "rgba(239,68,68,0.08)",
              border: "1.5px solid rgba(239,68,68,0.25)",
              borderRadius: 16,
              padding: 16,
              marginBottom: 12,
            }}
          >
            <p style={{ fontWeight: 800, fontSize: 13, color: "#ef4444", margin: 0 }}>
              {"\u26A0\uFE0F"} {overdueVaccines.length} vaccin{overdueVaccines.length > 1 ? "s" : ""} en retard
            </p>
            {overdueVaccines.map((v) => (
              <p key={v.id} style={{ fontSize: 12, color: "var(--c-text-muted)", margin: "4px 0 0" }}>
                {v.title} - en retard de {Math.abs(daysUntil(v.next_due!))} jours
              </p>
            ))}
          </div>
        )}

        {upcomingVaccines.length > 0 && (
          <div
            className="animate-slide-up"
            style={{
              background: "rgba(251,191,36,0.08)",
              border: "1.5px solid rgba(251,191,36,0.25)",
              borderRadius: 16,
              padding: 16,
              marginBottom: 12,
            }}
          >
            <p style={{ fontWeight: 800, fontSize: 13, color: "#FBBF24", margin: 0 }}>
              {"\uD83D\uDC89"} Vaccins a prevoir
            </p>
            {upcomingVaccines.map((v) => (
              <p key={v.id} style={{ fontSize: 12, color: "var(--c-text-muted)", margin: "4px 0 0" }}>
                {v.title} - dans {daysUntil(v.next_due!)} jours ({formatDate(v.next_due!)})
              </p>
            ))}
          </div>
        )}

        {/* Weight mini chart */}
        {weightRecords.length > 0 && (
          <div
            className="glass animate-slide-up"
            style={{ borderRadius: 20, border: "1.5px solid var(--c-border)", padding: 20, marginBottom: 12 }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: "var(--c-text)", margin: 0 }}>
                {"\u2696\uFE0F"} Evolution du poids
              </h3>
              <button
                onClick={() => setActiveTab("weight")}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--c-accent)",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Voir tout
              </button>
            </div>
            {renderWeightChart()}
          </div>
        )}

        {/* Recent records */}
        {records.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <h3 style={{ fontSize: 13, fontWeight: 800, color: "var(--c-text-muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>
              Derniers enregistrements
            </h3>
            <div className="stagger-children">
              {records.slice(0, 5).map((r) => renderRecordCard(r))}
            </div>
          </div>
        )}

        {records.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 16px", color: "var(--c-text-muted)" }}>
            <p style={{ fontSize: 48, marginBottom: 12 }}>{"\uD83D\uDC3E"}</p>
            <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Aucun enregistrement de sante</p>
            <p style={{ fontSize: 13, marginBottom: 16 }}>
              Commencez a suivre la sante de {animal.name} en ajoutant un premier enregistrement.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="btn-futuristic btn-press"
              style={{
                padding: "12px 24px",
                borderRadius: 14,
                border: "none",
                background: "var(--c-accent)",
                color: "#000",
                fontWeight: 800,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              + Ajouter un enregistrement
            </button>
          </div>
        )}
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Form modal
  // -----------------------------------------------------------------------

  function renderFormModal() {
    if (!showForm) return null;

    const selectedType = RECORD_TYPES.find((t) => t.value === formData.type);
    const showValue = formData.type === "weight" || formData.type === "medication";
    const showNextDue = formData.type === "vaccine" || formData.type === "vet_visit";

    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1000,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) setShowForm(false);
        }}
      >
        <div
          className="animate-slide-up"
          style={{
            width: "100%",
            maxWidth: 480,
            maxHeight: "85vh",
            overflowY: "auto",
            background: "var(--c-card)",
            borderRadius: "24px 24px 0 0",
            padding: "24px 20px",
            paddingBottom: 40,
            border: "1.5px solid var(--c-border)",
            borderBottom: "none",
          }}
        >
          {/* Handle bar */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--c-border)" }} />
          </div>

          <h2 style={{ fontSize: 18, fontWeight: 900, color: "var(--c-text)", margin: "0 0 20px" }}>
            Nouvel enregistrement
          </h2>

          <form onSubmit={handleSubmit}>
            {/* Type selector */}
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--c-text-muted)", marginBottom: 8 }}>
              Type
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
              {RECORD_TYPES.map((rt) => (
                <button
                  key={rt.value}
                  type="button"
                  onClick={() => {
                    setFormData({
                      ...formData,
                      type: rt.value,
                      title: rt.value === "weight" ? "Releve de poids" : formData.title,
                      unit: rt.value === "weight" ? "kg" : rt.value === "medication" ? "mg" : "",
                    });
                  }}
                  className="btn-press"
                  style={{
                    padding: "8px 14px",
                    borderRadius: 12,
                    border: `1.5px solid ${formData.type === rt.value ? rt.color : "var(--c-border)"}`,
                    background: formData.type === rt.value ? `${rt.color}20` : "transparent",
                    color: formData.type === rt.value ? rt.color : "var(--c-text-muted)",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span>{rt.emoji}</span> {rt.label}
                </button>
              ))}
            </div>

            {/* Title */}
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--c-text-muted)", marginBottom: 6 }}>
              Titre
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={`Ex: ${selectedType?.label || "Note"}`}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 14,
                border: "1.5px solid var(--c-border)",
                background: "var(--c-deep)",
                color: "var(--c-text)",
                fontSize: 14,
                outline: "none",
                marginBottom: 16,
                boxSizing: "border-box",
              }}
            />

            {/* Value + unit for weight/medication */}
            {showValue && (
              <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--c-text-muted)", marginBottom: 6 }}>
                    Valeur
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    placeholder="0.0"
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: 14,
                      border: "1.5px solid var(--c-border)",
                      background: "var(--c-deep)",
                      color: "var(--c-text)",
                      fontSize: 14,
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div style={{ width: 80 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--c-text-muted)", marginBottom: 6 }}>
                    Unite
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "12px 10px",
                      borderRadius: 14,
                      border: "1.5px solid var(--c-border)",
                      background: "var(--c-deep)",
                      color: "var(--c-text)",
                      fontSize: 14,
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  >
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="mg">mg</option>
                    <option value="ml">ml</option>
                  </select>
                </div>
              </div>
            )}

            {/* Date */}
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--c-text-muted)", marginBottom: 6 }}>
              Date
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 14,
                border: "1.5px solid var(--c-border)",
                background: "var(--c-deep)",
                color: "var(--c-text)",
                fontSize: 14,
                outline: "none",
                marginBottom: 16,
                boxSizing: "border-box",
              }}
            />

            {/* Next due date for vaccines/appointments */}
            {showNextDue && (
              <>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--c-text-muted)", marginBottom: 6 }}>
                  Prochain rendez-vous / rappel
                </label>
                <input
                  type="date"
                  value={formData.next_due}
                  onChange={(e) => setFormData({ ...formData, next_due: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: 14,
                    border: "1.5px solid var(--c-border)",
                    background: "var(--c-deep)",
                    color: "var(--c-text)",
                    fontSize: 14,
                    outline: "none",
                    marginBottom: 16,
                    boxSizing: "border-box",
                  }}
                />
              </>
            )}

            {/* Description */}
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--c-text-muted)", marginBottom: 6 }}>
              Notes / description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Details supplementaires..."
              rows={3}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 14,
                border: "1.5px solid var(--c-border)",
                background: "var(--c-deep)",
                color: "var(--c-text)",
                fontSize: 14,
                outline: "none",
                resize: "vertical",
                marginBottom: 16,
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            />

            {/* Status */}
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--c-text-muted)", marginBottom: 6 }}>
              Statut
            </label>
            <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFormData({ ...formData, status: key })}
                  className="btn-press"
                  style={{
                    padding: "8px 14px",
                    borderRadius: 12,
                    border: `1.5px solid ${formData.status === key ? cfg.text : "var(--c-border)"}`,
                    background: formData.status === key ? cfg.bg : "transparent",
                    color: formData.status === key ? cfg.text : "var(--c-text-muted)",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {cfg.label}
                </button>
              ))}
            </div>

            {/* Error */}
            {error && (
              <p style={{ color: "#ef4444", fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{error}</p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="btn-futuristic btn-press"
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: 14,
                border: "none",
                background: submitting ? "var(--c-border)" : "var(--c-accent)",
                color: submitting ? "var(--c-text-muted)" : "#000",
                fontWeight: 900,
                fontSize: 15,
                cursor: submitting ? "not-allowed" : "pointer",
              }}
            >
              {submitting ? "Enregistrement..." : "Enregistrer"}
            </button>

            {/* Cancel */}
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setFormData(emptyForm);
                setError(null);
              }}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 14,
                border: "none",
                background: "transparent",
                color: "var(--c-text-muted)",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                marginTop: 8,
              }}
            >
              Annuler
            </button>
          </form>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Main render
  // -----------------------------------------------------------------------

  return (
    <div style={{ minHeight: "100vh", padding: "24px 16px", background: "var(--c-deep)" }} className="safe-bottom">
      <div style={{ maxWidth: 640, margin: "0 auto" }}>

        {/* Back button */}
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => window.history.length > 1 ? window.history.back() : (window.location.href = "/feed")} aria-label="Retour" className="inline-flex items-center justify-center w-9 h-9 rounded-full transition-all active:scale-90 flex-shrink-0" style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--c-text)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <Link
            href={"/animals/" + animal.id}
            style={{ color: "var(--c-accent)", fontSize: 13, textDecoration: "none", fontWeight: 600 }}
          >
            Retour au profil
          </Link>
        </div>

        {/* ====== HEADER ====== */}
        <div
          className="glass animate-slide-up"
          style={{
            marginTop: 16,
            background: "var(--c-card)",
            borderRadius: 20,
            border: "1.5px solid var(--c-border)",
            padding: 20,
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          {/* Photo */}
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: "50%",
              overflow: "hidden",
              flexShrink: 0,
              background: "var(--c-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "3px solid rgba(251,191,36,0.3)",
              position: "relative",
            }}
          >
            {animal.photo_url ? (
              <Image src={animal.photo_url} alt={animal.name} fill className="object-cover" sizes="60px" />
            ) : (
              <span style={{ fontSize: 28 }}>{EMOJI_MAP[animal.species] || "\uD83D\uDC3E"}</span>
            )}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: 20, fontWeight: 900, color: "var(--c-text)", margin: 0 }}>{animal.name}</h1>
            <p style={{ fontSize: 12, color: "var(--c-text-muted)", margin: "2px 0 0" }}>
              {animal.breed || animal.species}
              {animal.age_months ? ` \u2022 ${formatAge(animal.age_months)}` : ""}
              {animal.weight_kg ? ` \u2022 ${animal.weight_kg} kg` : ""}
            </p>
          </div>

          {/* Health badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 42,
              height: 42,
              borderRadius: "50%",
              background: overdueVaccines.length > 0 ? "rgba(239,68,68,0.15)" : "rgba(251,191,36,0.15)",
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 20 }}>{overdueVaccines.length > 0 ? "\u26A0\uFE0F" : "\u2764\uFE0F"}</span>
          </div>
        </div>

        {/* ====== TABS ====== */}
        <div
          style={{
            display: "flex",
            gap: 6,
            marginTop: 16,
            overflowX: "auto",
            paddingBottom: 4,
            scrollbarWidth: "none",
          }}
        >
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="btn-press"
              style={{
                padding: "8px 14px",
                borderRadius: 14,
                border: `1.5px solid ${activeTab === tab.key ? "var(--c-accent)" : "var(--c-border)"}`,
                background: activeTab === tab.key ? "rgba(251,191,36,0.12)" : "var(--c-card)",
                color: activeTab === tab.key ? "var(--c-accent)" : "var(--c-text-muted)",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                whiteSpace: "nowrap",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span>{tab.emoji}</span> {tab.label}
            </button>
          ))}
        </div>

        {/* ====== TAB CONTENT ====== */}
        <div style={{ marginTop: 16 }}>
          {activeTab === "overview" && renderOverview()}

          {activeTab === "weight" && (
            <div className="glass animate-slide-up" style={{ borderRadius: 20, border: "1.5px solid var(--c-border)", padding: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 900, color: "var(--c-text)", margin: "0 0 16px" }}>
                {"\u2696\uFE0F"} Suivi du poids
              </h2>
              {renderWeightChart()}
              {/* History list */}
              {weightRecords.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <h3 style={{ fontSize: 13, fontWeight: 800, color: "var(--c-text-muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>
                    Historique
                  </h3>
                  <div className="stagger-children">
                    {[...weightRecords].reverse().map((r) => renderRecordCard(r))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "vaccines" && (
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 900, color: "var(--c-text)", margin: "0 0 16px" }}>
                {"\uD83D\uDC89"} Carnet de vaccination
              </h2>
              {vaccineRecords.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--c-text-muted)" }}>
                  <p style={{ fontSize: 40, marginBottom: 8 }}>{"\uD83D\uDC89"}</p>
                  <p style={{ fontSize: 14 }}>Aucun vaccin enregistre</p>
                  <button
                    onClick={() => {
                      setFormData({ ...emptyForm, type: "vaccine", title: "" });
                      setShowForm(true);
                    }}
                    className="btn-press"
                    style={{
                      marginTop: 12,
                      padding: "10px 20px",
                      borderRadius: 14,
                      border: "none",
                      background: "var(--c-accent)",
                      color: "#000",
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    + Ajouter un vaccin
                  </button>
                </div>
              ) : (
                <div className="stagger-children">
                  {vaccineRecords.map((r) => renderVaccineCard(r))}
                </div>
              )}
            </div>
          )}

          {activeTab === "appointments" && (
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 900, color: "var(--c-text)", margin: "0 0 16px" }}>
                {"\uD83C\uDFE5"} Rendez-vous veterinaires
              </h2>
              {renderAppointments()}
            </div>
          )}

          {activeTab === "notes" && (
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 900, color: "var(--c-text)", margin: "0 0 16px" }}>
                {"\uD83D\uDCDD"} Notes & observations
              </h2>
              {renderNotes()}
            </div>
          )}
        </div>

        {/* ====== FAB ====== */}
        {profile && (
          <button
            onClick={() => setShowForm(true)}
            className="btn-futuristic btn-press"
            style={{
              position: "fixed",
              bottom: 24,
              right: 24,
              width: 56,
              height: 56,
              borderRadius: "50%",
              border: "none",
              background: "var(--c-accent)",
              color: "#000",
              fontSize: 28,
              fontWeight: 300,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 4px 20px rgba(251,191,36,0.4)",
              zIndex: 100,
            }}
          >
            +
          </button>
        )}

        {/* ====== FORM MODAL ====== */}
        {renderFormModal()}
      </div>
    </div>
  );
}
