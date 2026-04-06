"use client";

import { useEffect, useState, useRef } from "react";

type AnimalData = {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  traits: string[];
  description: string | null;
};

type CompatResult = {
  score: number;
  reason: string;
  emoji: string;
};

export default function CompatibilityBadge({
  myAnimal,
  otherAnimal,
}: {
  myAnimal: AnimalData;
  otherAnimal: AnimalData;
}) {
  const [data, setData] = useState<CompatResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const fetchedRef = useRef<string>("");

  useEffect(() => {
    const key = myAnimal.id + ":" + otherAnimal.id;
    if (fetchedRef.current === key) return;
    fetchedRef.current = key;
    setLoading(true);
    setVisible(false);

    const controller = new AbortController();

    fetch("/api/compatibility", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        myAnimal: {
          id: myAnimal.id,
          name: myAnimal.name,
          species: myAnimal.species,
          breed: myAnimal.breed,
          personality: myAnimal.traits || [],
          energy: null,
        },
        otherAnimal: {
          id: otherAnimal.id,
          name: otherAnimal.name,
          species: otherAnimal.species,
          breed: otherAnimal.breed,
          personality: otherAnimal.traits || [],
          energy: null,
        },
      }),
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((result: CompatResult) => {
        setData(result);
        setLoading(false);
        // Delay appearance for smooth entrance
        requestAnimationFrame(() => {
          setTimeout(() => setVisible(true), 50);
        });
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [myAnimal.id, otherAnimal.id]);

  // Determine glow color based on score
  const glowColor =
    data && data.score >= 75
      ? "rgba(52,211,153,0.6)"
      : data && data.score >= 50
        ? "rgba(251,191,36,0.5)"
        : "rgba(156,163,175,0.4)";

  const ringColor =
    data && data.score >= 75
      ? "#34d399"
      : data && data.score >= 50
        ? "#fbbf24"
        : "#9ca3af";

  const circumference = 2 * Math.PI * 18;
  const offset = data ? circumference - (data.score / 100) * circumference : circumference;

  // Shimmer loading state
  if (loading) {
    return (
      <div className="ai-compat-badge ai-compat-loading">
        <style>{compatStyles}</style>
        <div className="ai-compat-shimmer" />
        <div className="ai-compat-loading-inner">
          <div className="ai-compat-loading-ring" />
          <span className="ai-compat-loading-text">IA...</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div
      className={`ai-compat-badge ${visible ? "ai-compat-visible" : ""}`}
      style={
        {
          "--glow-color": glowColor,
          "--ring-color": ringColor,
        } as React.CSSProperties
      }
    >
      <style>{compatStyles}</style>

      {/* Pulsing glow background */}
      <div className="ai-compat-glow" />

      {/* Circular score ring */}
      <div className="ai-compat-ring-wrap">
        <svg width="44" height="44" viewBox="0 0 44 44" className="ai-compat-svg">
          {/* Background track */}
          <circle
            cx="22"
            cy="22"
            r="18"
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="3"
          />
          {/* Animated progress */}
          <circle
            cx="22"
            cy="22"
            r="18"
            fill="none"
            stroke={ringColor}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="ai-compat-ring-progress"
            style={{
              filter: `drop-shadow(0 0 4px ${ringColor})`,
            }}
          />
        </svg>
        <div className="ai-compat-score-num">
          {data.score}
          <span className="ai-compat-percent">%</span>
        </div>
      </div>

      {/* Reason text + emoji */}
      <div className="ai-compat-info">
        <div className="ai-compat-label">
          <span className="ai-compat-ai-tag">IA</span>
          Compatibilite
        </div>
        <p className="ai-compat-reason">
          {data.emoji} {data.reason}
        </p>
      </div>
    </div>
  );
}

// ── Scoped styles ─────────────────────────────────────────────
const compatStyles = `
  .ai-compat-badge {
    position: relative;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px 10px 10px;
    border-radius: 20px;
    background: rgba(15, 10, 25, 0.65);
    backdrop-filter: blur(20px) saturate(1.8);
    -webkit-backdrop-filter: blur(20px) saturate(1.8);
    border: 1px solid rgba(255,255,255,0.08);
    overflow: hidden;
    opacity: 0;
    transform: translateY(8px) scale(0.96);
    transition: opacity 0.5s cubic-bezier(0.16,1,0.3,1),
                transform 0.5s cubic-bezier(0.16,1,0.3,1);
    max-width: 100%;
  }

  .ai-compat-visible {
    opacity: 1;
    transform: translateY(0) scale(1);
  }

  .ai-compat-glow {
    position: absolute;
    inset: -2px;
    border-radius: 22px;
    background: radial-gradient(ellipse at 30% 50%, var(--glow-color, rgba(52,211,153,0.3)) 0%, transparent 70%);
    opacity: 0;
    animation: aiCompatPulse 3s ease-in-out infinite;
    pointer-events: none;
    z-index: 0;
  }

  .ai-compat-ring-wrap {
    position: relative;
    width: 44px;
    height: 44px;
    flex-shrink: 0;
    z-index: 1;
  }

  .ai-compat-svg {
    transform: rotate(-90deg);
    display: block;
  }

  .ai-compat-ring-progress {
    transition: stroke-dashoffset 1.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .ai-compat-score-num {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 800;
    color: var(--c-text, #fff);
    line-height: 1;
    text-shadow: 0 0 8px var(--glow-color, rgba(52,211,153,0.4));
  }

  .ai-compat-percent {
    font-size: 8px;
    opacity: 0.7;
    margin-left: 0.5px;
  }

  .ai-compat-info {
    flex: 1;
    min-width: 0;
    z-index: 1;
  }

  .ai-compat-label {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--c-text-muted, rgba(255,255,255,0.5));
    margin-bottom: 2px;
  }

  .ai-compat-ai-tag {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 1px 5px;
    border-radius: 6px;
    font-size: 8px;
    font-weight: 800;
    letter-spacing: 0.05em;
    background: linear-gradient(135deg, #a78bfa, #60a5fa);
    color: #fff;
    line-height: 1.4;
  }

  .ai-compat-reason {
    font-size: 11px;
    line-height: 1.35;
    color: var(--c-text, #fff);
    opacity: 0.85;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    margin: 0;
  }

  /* Loading state */
  .ai-compat-loading {
    opacity: 1 !important;
    transform: none !important;
    min-height: 64px;
    min-width: 160px;
  }

  .ai-compat-shimmer {
    position: absolute;
    inset: 0;
    border-radius: 20px;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255,255,255,0.04) 40%,
      rgba(255,255,255,0.08) 50%,
      rgba(255,255,255,0.04) 60%,
      transparent 100%
    );
    background-size: 200% 100%;
    animation: aiCompatShimmer 2s linear infinite;
    z-index: 2;
    pointer-events: none;
  }

  .ai-compat-loading-inner {
    display: flex;
    align-items: center;
    gap: 8px;
    z-index: 1;
    position: relative;
  }

  .ai-compat-loading-ring {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 2.5px solid rgba(255,255,255,0.06);
    border-top-color: rgba(167,139,250,0.5);
    animation: aiCompatSpin 1s linear infinite;
  }

  .ai-compat-loading-text {
    font-size: 11px;
    font-weight: 600;
    color: var(--c-text-muted, rgba(255,255,255,0.4));
    letter-spacing: 0.05em;
  }

  @keyframes aiCompatPulse {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 0.6; }
  }

  @keyframes aiCompatShimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  @keyframes aiCompatSpin {
    to { transform: rotate(360deg); }
  }
`;
