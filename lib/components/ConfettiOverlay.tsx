"use client";
import { useEffect, useState, useCallback } from "react";

const CONFETTI_COLORS = ["#FBBF24", "#FCD34D", "#ec4899", "#3b82f6", "#eab308", "#8b5cf6", "#4ADE80", "#f472b6"];
const CONFETTI_SHAPES = ["\u25CF", "\u25A0", "\u25B2", "\u2605", "\u2665", "\uD83D\uDC3E"];

type Particle = {
  id: number;
  x: number;
  color: string;
  shape: string;
  delay: number;
  duration: number;
  size: number;
  rotation: number;
  drift: number;
};

export default function ConfettiOverlay({ active }: { active: boolean }) {
  const [particles, setParticles] = useState<Particle[]>([]);

  const generateBurst = useCallback(() => {
    const p: Particle[] = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      shape: CONFETTI_SHAPES[Math.floor(Math.random() * CONFETTI_SHAPES.length)],
      delay: Math.random() * 0.8,
      duration: 1.5 + Math.random() * 2,
      size: 0.7 + Math.random() * 0.8,
      rotation: Math.random() * 720 - 360,
      drift: (Math.random() - 0.5) * 60,
    }));
    setParticles(p);
  }, []);

  useEffect(() => {
    if (!active) { setParticles([]); return; }
    generateBurst();
    const timer = setTimeout(() => setParticles([]), 4000);
    return () => clearTimeout(timer);
  }, [active, generateBurst]);

  if (particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes confettiEnhanced {
          0% {
            transform: translateY(-20px) rotate(0deg) scale(1);
            opacity: 1;
          }
          25% { opacity: 1; }
          100% {
            transform: translateY(100vh) rotate(var(--confetti-rotate, 720deg)) scale(0.3);
            opacity: 0;
          }
        }
      `}} />
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: "-20px",
            color: p.color,
            fontSize: `${p.size}rem`,
            animation: `confettiEnhanced ${p.duration}s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${p.delay}s forwards`,
            ["--confetti-rotate" as string]: `${p.rotation}deg`,
            filter: `drop-shadow(0 0 3px ${p.color}40)`,
            marginLeft: `${p.drift}px`,
          }}
        >
          {p.shape}
        </span>
      ))}
    </div>
  );
}
