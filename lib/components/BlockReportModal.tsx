"use client";

import { useState } from "react";

interface BlockReportModalProps {
  targetUserId: string;
  targetAnimalId?: string;
  targetName: string;
  onClose: () => void;
  onBlocked?: () => void;
}

const BLOCK_REASONS = [
  "Comportement inapproprie",
  "Spam",
  "Harcelement",
  "Faux profil",
  "Autre",
];

const REPORT_REASONS = [
  "Contenu inapproprie",
  "Faux profil",
  "Spam",
  "Harcelement",
  "Arnaque",
  "Maltraitance animale",
  "Autre",
];

type Tab = "block" | "report";
type Status = "idle" | "loading" | "success" | "error";

export default function BlockReportModal({
  targetUserId,
  targetAnimalId,
  targetName,
  onClose,
  onBlocked,
}: BlockReportModalProps) {
  const [tab, setTab] = useState<Tab>("block");
  const [blockReason, setBlockReason] = useState("");
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleBlock() {
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blocked_user_id: targetUserId,
          reason: blockReason || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erreur lors du blocage");
      }
      setStatus("success");
      onBlocked?.();
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err.message || "Erreur inconnue");
    }
  }

  async function handleReport() {
    if (!reportReason) return;
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reported_user_id: targetUserId,
          reported_animal_id: targetAnimalId || undefined,
          reason: reportReason,
          details: reportDetails || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erreur lors du signalement");
      }
      setStatus("success");
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err.message || "Erreur inconnue");
    }
  }

  // Success states
  if (status === "success") {
    const isBlock = tab === "block";
    return (
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
        onClick={onClose}
      >
        <div
          className="w-full max-w-sm rounded-2xl p-6 text-center"
          style={{
            background: "var(--c-card, #1e1830)",
            border: "1px solid var(--c-border, #2d2545)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-4xl mb-3">{isBlock ? "🚫" : "✅"}</div>
          <h3
            className="text-lg font-bold mb-2"
            style={{ color: "var(--c-text, #f0eeff)" }}
          >
            {isBlock ? "Utilisateur bloque" : "Signalement envoye"}
          </h3>
          <p
            className="text-sm mb-5"
            style={{ color: "var(--c-text-muted, #9b93b8)" }}
          >
            {isBlock
              ? `${targetName} ne peut plus voir tes animaux ni te contacter.`
              : "Merci. Notre equipe examinera ton signalement."}
          </p>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm font-bold transition"
            style={{
              background: "var(--c-border, #2d2545)",
              color: "var(--c-text, #f0eeff)",
            }}
          >
            Fermer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{
          background: "var(--c-card, #1e1830)",
          border: "1px solid var(--c-border, #2d2545)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tabs */}
        <div
          className="flex"
          style={{ borderBottom: "1px solid var(--c-border, #2d2545)" }}
        >
          {(["block", "report"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                setStatus("idle");
                setErrorMsg("");
              }}
              className="flex-1 py-3 text-sm font-bold transition"
              style={{
                color:
                  tab === t
                    ? t === "block"
                      ? "#ef4444"
                      : "#F59E0B"
                    : "var(--c-text-muted, #9b93b8)",
                background:
                  tab === t
                    ? t === "block"
                      ? "rgba(239,68,68,0.08)"
                      : "rgba(249,115,22,0.08)"
                    : "transparent",
                borderBottom:
                  tab === t
                    ? `2px solid ${t === "block" ? "#ef4444" : "#F59E0B"}`
                    : "2px solid transparent",
              }}
            >
              {t === "block" ? "🚫 Bloquer" : "🚩 Signaler"}
            </button>
          ))}
        </div>

        <div className="p-5">
          {/* Error */}
          {status === "error" && errorMsg && (
            <div
              className="mb-4 p-3 rounded-xl text-sm"
              style={{
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.2)",
                color: "#ef4444",
              }}
            >
              {errorMsg}
            </div>
          )}

          {tab === "block" ? (
            <>
              <h3
                className="text-base font-bold mb-1"
                style={{ color: "var(--c-text, #f0eeff)" }}
              >
                Bloquer {targetName} ?
              </h3>
              <p
                className="text-sm mb-4"
                style={{ color: "var(--c-text-muted, #9b93b8)" }}
              >
                Cette personne ne pourra plus voir tes animaux ni te contacter.
              </p>

              <label
                className="block text-xs font-semibold mb-2"
                style={{ color: "var(--c-text-muted, #9b93b8)" }}
              >
                Raison (optionnel)
              </label>
              <select
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                className="w-full mb-5 p-2.5 rounded-xl text-sm outline-none"
                style={{
                  background: "var(--c-bg, #0f0c1a)",
                  border: "1px solid var(--c-border, #2d2545)",
                  color: "var(--c-text, #f0eeff)",
                }}
              >
                <option value="">Choisir une raison...</option>
                {BLOCK_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold transition"
                  style={{
                    background: "var(--c-border, #2d2545)",
                    color: "var(--c-text-muted, #9b93b8)",
                  }}
                >
                  Annuler
                </button>
                <button
                  onClick={handleBlock}
                  disabled={status === "loading"}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold transition disabled:opacity-50"
                  style={{
                    background: "#ef4444",
                    color: "#fff",
                  }}
                >
                  {status === "loading" ? "..." : "Bloquer"}
                </button>
              </div>
            </>
          ) : (
            <>
              <h3
                className="text-base font-bold mb-1"
                style={{ color: "var(--c-text, #f0eeff)" }}
              >
                Signaler {targetName}
              </h3>
              <p
                className="text-sm mb-4"
                style={{ color: "var(--c-text-muted, #9b93b8)" }}
              >
                Ton signalement est anonyme et sera examine par notre equipe.
              </p>

              <label
                className="block text-xs font-semibold mb-2"
                style={{ color: "var(--c-text-muted, #9b93b8)" }}
              >
                Raison *
              </label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full mb-3 p-2.5 rounded-xl text-sm outline-none"
                style={{
                  background: "var(--c-bg, #0f0c1a)",
                  border: `1px solid ${
                    !reportReason && status === "error"
                      ? "#ef4444"
                      : "var(--c-border, #2d2545)"
                  }`,
                  color: "var(--c-text, #f0eeff)",
                }}
              >
                <option value="">Choisir une raison...</option>
                {REPORT_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              <label
                className="block text-xs font-semibold mb-2"
                style={{ color: "var(--c-text-muted, #9b93b8)" }}
              >
                Details (optionnel)
              </label>
              <textarea
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Decris le probleme..."
                rows={3}
                className="w-full mb-4 p-2.5 rounded-xl text-sm outline-none resize-none"
                style={{
                  background: "var(--c-bg, #0f0c1a)",
                  border: "1px solid var(--c-border, #2d2545)",
                  color: "var(--c-text, #f0eeff)",
                }}
              />

              <button
                onClick={handleReport}
                disabled={status === "loading" || !reportReason}
                className="w-full py-2.5 rounded-xl text-sm font-bold transition disabled:opacity-50"
                style={{
                  background: !reportReason
                    ? "var(--c-border, #2d2545)"
                    : "#F59E0B",
                  color: !reportReason
                    ? "var(--c-text-muted, #9b93b8)"
                    : "#fff",
                }}
              >
                {status === "loading" ? "..." : "Envoyer le signalement"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
