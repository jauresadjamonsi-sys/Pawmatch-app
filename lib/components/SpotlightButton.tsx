"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAppContext } from "@/lib/contexts/AppContext";
import { useAuth } from "@/lib/hooks/useAuth";
import Link from "next/link";
import { toast } from "sonner";

interface SpotlightButtonProps {
  animalId: string;
  animalName: string;
  hasPhoto: boolean;
}

export default function SpotlightButton({ animalId, animalName, hasPhoto }: SpotlightButtonProps) {
  const { t } = useAppContext();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [occupied, setOccupied] = useState(false);
  const [occupiedBy, setOccupiedBy] = useState("");
  const [remainingSec, setRemainingSec] = useState(0);
  const [success, setSuccess] = useState(false);
  const [successDuration, setSuccessDuration] = useState("");

  const plan = profile?.subscription || "free";
  const isPremium = plan === "premium" || plan === "pro";

  useEffect(() => {
    // Check if spotlight is currently occupied
    fetch("/api/spotlight")
      .then(r => r.json())
      .then(data => {
        if (data.active) {
          setOccupied(true);
          setOccupiedBy(data.animal_name || "");
          const sec = Math.ceil((new Date(data.expires_at).getTime() - Date.now()) / 1000);
          setRemainingSec(Math.max(0, sec));
        }
      })
      .catch(() => {});
  }, []);

  // Countdown timer when occupied
  useEffect(() => {
    if (!occupied || remainingSec <= 0) return;
    const interval = setInterval(() => {
      setRemainingSec(prev => {
        if (prev <= 1) {
          setOccupied(false);
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [occupied, remainingSec]);

  function formatTime(sec: number) {
    if (sec >= 3600) {
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      return `${h}h${m > 0 ? m.toString().padStart(2, "0") : "00"}`;
    }
    if (sec >= 60) {
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return `${m}m${s > 0 ? s.toString().padStart(2, "0") + "s" : ""}`;
    }
    return `${sec}s`;
  }

  async function handleActivate() {
    setLoading(true);
    try {
      const res = await fetch("/api/spotlight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ animal_id: animalId }),
      });
      const data = await res.json();

      if (data.ok) {
        setSuccess(true);
        setSuccessDuration(data.duration);
        toast.success(`${animalName} ${t.spotlightSuccess} (${data.duration})`);
      } else if (data.error === "occupied") {
        setOccupied(true);
        setOccupiedBy(data.message || "");
        setRemainingSec(data.remaining_seconds || 0);
        toast.error(t.spotlightOccupied);
      } else if (data.error === "cooldown") {
        toast.error(data.message);
      } else {
        toast.error(data.error || "Erreur");
      }
    } catch {
      toast.error("Erreur de connexion");
    }
    setLoading(false);
  }

  if (!hasPhoto) return null;

  // Success state
  if (success) {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 14, padding: 18,
        background: "linear-gradient(135deg, rgba(249,115,22,0.12), rgba(168,85,247,0.08))",
        border: "2px solid rgba(249,115,22,0.3)", borderRadius: 16, marginBottom: 16,
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14,
          background: "linear-gradient(135deg, #f97316, #a855f7)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22, flexShrink: 0, animation: "pulse 2s ease-in-out infinite",
        }}>
          👑
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: "var(--c-text)" }}>
            {animalName} {t.spotlightIsLive}
          </div>
          <div style={{ fontSize: 12, color: "var(--c-text-muted)", marginTop: 2 }}>
            {t.spotlightDuration}: {successDuration}
          </div>
        </div>
        <span style={{ fontSize: 20 }}>🌟</span>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Main CTA */}
      <button
        onClick={handleActivate}
        disabled={loading || occupied}
        style={{
          display: "flex", alignItems: "center", gap: 14, padding: 18,
          width: "100%", textAlign: "left",
          background: occupied
            ? "linear-gradient(135deg, rgba(107,114,128,0.08), rgba(107,114,128,0.04))"
            : "linear-gradient(135deg, rgba(249,115,22,0.1), rgba(168,85,247,0.06))",
          border: occupied
            ? "2px solid rgba(107,114,128,0.2)"
            : "2px solid rgba(249,115,22,0.25)",
          borderRadius: 16,
          cursor: occupied ? "not-allowed" : "pointer",
          opacity: loading ? 0.6 : 1,
          transition: "all 0.2s",
        }}
      >
        <div style={{
          width: 48, height: 48, borderRadius: 14,
          background: occupied
            ? "linear-gradient(135deg, #6b7280, #9ca3af)"
            : "linear-gradient(135deg, #f97316, #a855f7)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22, flexShrink: 0,
        }}>
          {occupied ? "⏳" : "👑"}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: "var(--c-text)" }}>
            {loading ? "..." : occupied ? t.spotlightOccupied : t.spotlightBecomeMascot}
          </div>
          <div style={{ fontSize: 12, color: "var(--c-text-muted)", marginTop: 2 }}>
            {occupied
              ? `${occupiedBy} — ${formatTime(remainingSec)}`
              : isPremium
                ? t.spotlightPremiumDuration
                : t.spotlightFreeDuration
            }
          </div>
        </div>
        {!occupied && <span style={{ fontSize: 18, color: "var(--c-text-muted)" }}>→</span>}
      </button>

      {/* Upsell for free users */}
      {!isPremium && !occupied && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          marginTop: 8, padding: "8px 12px",
          background: "rgba(249,115,22,0.05)",
          borderRadius: 10, fontSize: 11, color: "var(--c-text-muted)",
        }}>
          <span>💎</span>
          <span>{t.spotlightUpgrade}</span>
          <Link href="/pricing" style={{ color: "#f97316", fontWeight: 700, textDecoration: "none", marginLeft: 4 }}>
            Premium →
          </Link>
        </div>
      )}
    </div>
  );
}
