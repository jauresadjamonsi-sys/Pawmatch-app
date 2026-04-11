"use client";

import { useState, useEffect } from "react";

interface Props {
  progress: number; // 0..1
  stage: "loading" | "analyzing" | "compressing" | "thumbnail" | "uploading" | "done";
  originalMB?: number;
  compressedMB?: number;
}

const STAGE_LABELS: Record<Props["stage"], string> = {
  loading: "Chargement du moteur...",
  analyzing: "Analyse de la video...",
  compressing: "Compression HD en cours...",
  thumbnail: "Generation de la miniature...",
  uploading: "Upload en cours...",
  done: "Termine !",
};

const STAGE_EMOJI: Record<Props["stage"], string> = {
  loading: "\u2699\uFE0F",
  analyzing: "\uD83D\uDD0D",
  compressing: "\uD83C\uDFAC",
  thumbnail: "\uD83D\uDDBC\uFE0F",
  uploading: "\u2601\uFE0F",
  done: "\u2705",
};

export default function VideoCompressProgress({ progress, stage, originalMB, compressedMB }: Props) {
  const [dots, setDots] = useState("");

  useEffect(() => {
    if (stage === "done") return;
    const interval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."));
    }, 400);
    return () => clearInterval(interval);
  }, [stage]);

  const pct = Math.round(progress * 100);
  const saved = originalMB && compressedMB ? originalMB - compressedMB : 0;

  return (
    <div
      style={{
        background: "var(--c-card, #111827)",
        border: "1px solid var(--c-border, rgba(251,191,36,0.12))",
        borderRadius: 20,
        padding: "24px 28px",
        maxWidth: 400,
        margin: "0 auto",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: 24 }}>{STAGE_EMOJI[stage]}</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--c-text, #fff)" }}>
            {STAGE_LABELS[stage]}{stage !== "done" ? dots : ""}
          </div>
          {stage === "compressing" && (
            <div style={{ fontSize: 11, color: "var(--c-text-muted, #9CA3AF)", marginTop: 2 }}>
              Qualite Instagram (1080p H.264)
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: 8,
          borderRadius: 4,
          background: "rgba(255,255,255,0.06)",
          overflow: "hidden",
          marginBottom: 12,
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            borderRadius: 4,
            background: stage === "done"
              ? "linear-gradient(90deg, #10B981, #059669)"
              : "linear-gradient(90deg, #FBBF24, #F59E0B)",
            transition: "width 0.3s ease",
          }}
        />
      </div>

      {/* Stats */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: "var(--c-accent, #FBBF24)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {pct}%
        </span>

        {originalMB && compressedMB && stage === "done" ? (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "var(--c-text-muted, #9CA3AF)" }}>
              {originalMB.toFixed(1)} MB {"\u2192"} {compressedMB.toFixed(1)} MB
            </div>
            {saved > 0.1 && (
              <div style={{ fontSize: 11, fontWeight: 700, color: "#10B981" }}>
                -{saved.toFixed(1)} MB economises
              </div>
            )}
          </div>
        ) : originalMB ? (
          <span style={{ fontSize: 11, color: "var(--c-text-muted, #9CA3AF)" }}>
            Original: {originalMB.toFixed(1)} MB
          </span>
        ) : null}
      </div>
    </div>
  );
}
