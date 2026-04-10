"use client";
import { useEffect, useState } from "react";

const CONFETTI_COLORS = ["#f97316", "#ec4899", "#22c55e", "#3b82f6", "#eab308", "#8b5cf6"];
const CONFETTI_SHAPES = ["\u25CF", "\u25A0", "\u25B2", "\u2605", "\u2665"];

export default function ConfettiOverlay({ active }: { active: boolean }) {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; color: string; shape: string; delay: number; duration: number }>>([]);

  useEffect(() => {
    if (!active) { setParticles([]); return; }
    const p = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      shape: CONFETTI_SHAPES[Math.floor(Math.random() * CONFETTI_SHAPES.length)],
      delay: Math.random() * 0.5,
      duration: 1 + Math.random() * 1.5,
    }));
    setParticles(p);
    const timer = setTimeout(() => setParticles([]), 3000);
    return () => clearTimeout(timer);
  }, [active]);

  if (particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute text-lg animate-confetti"
          style={{
            left: `${p.x}%`,
            top: "-10px",
            color: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        >
          {p.shape}
        </span>
      ))}
    </div>
  );
}
