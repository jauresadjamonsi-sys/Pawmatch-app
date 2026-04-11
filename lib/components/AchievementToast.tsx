"use client";

import { useState, useEffect, useCallback, createContext, useContext, useRef } from "react";

// ═══ Types ═══
type AchievementNotif = {
  id: string;
  emoji: string;
  title: string;
  points: number;
};

type AchievementContextType = {
  showAchievement: (notif: AchievementNotif) => void;
};

const AchievementContext = createContext<AchievementContextType>({
  showAchievement: () => {},
});

export function useAchievementToast() {
  return useContext(AchievementContext);
}

// ═══ Particle component ═══
function Particles({ count }: { count: number }) {
  const particles = Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.8,
    size: Math.random() * 6 + 3,
    color: ["#F59E0B", "#fbbf24", "#34d399", "#60a5fa", "#f472b6", "#a78bfa"][i % 6],
    angle: Math.random() * 360,
    distance: Math.random() * 60 + 30,
  }));

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes achieveParticle {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
          50% { opacity: 1; }
          100% { opacity: 0; transform: translate(
            calc(-50% + var(--px) * 1px),
            calc(-50% + var(--py) * 1px)
          ) scale(0.3); }
        }
      `}} />
      {particles.map(p => (
        <span
          key={p.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: `${p.x}%`,
            top: "50%",
            width: p.size,
            height: p.size,
            background: p.color,
            "--px": Math.cos(p.angle * Math.PI / 180) * p.distance,
            "--py": Math.sin(p.angle * Math.PI / 180) * p.distance,
            animation: `achieveParticle 1.2s ${p.delay}s ease-out forwards`,
          } as React.CSSProperties}
        />
      ))}
    </>
  );
}

// ═══ Toast component ═══
function AchievementToastUI({ notif, onDone }: { notif: AchievementNotif; onDone: () => void }) {
  const [phase, setPhase] = useState<"enter" | "idle" | "exit">("enter");

  useEffect(() => {
    const enterTimer = setTimeout(() => setPhase("idle"), 50);
    const exitTimer = setTimeout(() => setPhase("exit"), 3600);
    const doneTimer = setTimeout(onDone, 4000);
    return () => {
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, [onDone]);

  const translateY = phase === "enter" ? "-120%" : phase === "exit" ? "-120%" : "0";
  const opacity = phase === "idle" ? 1 : 0;

  return (
    <div
      className="fixed top-4 left-1/2 z-[200] pointer-events-none"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      style={{
        transform: `translateX(-50%) translateY(${translateY})`,
        opacity,
        transition: "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease",
      }}
    >
      <div
        className="relative rounded-2xl px-6 py-4 shadow-2xl pointer-events-auto overflow-hidden"
        style={{
          background: "var(--c-card)",
          border: "2px solid var(--c-accent)",
          minWidth: 280,
          maxWidth: 360,
        }}
      >
        {/* Glow effect behind */}
        <div
          className="absolute inset-0 rounded-2xl opacity-20"
          style={{
            background: `radial-gradient(circle at 50% 50%, var(--c-accent), transparent 70%)`,
          }}
        />

        {/* Particles */}
        <Particles count={18} />

        {/* Content */}
        <div className="relative flex items-center gap-3">
          <div className="text-3xl flex-shrink-0" aria-hidden="true" style={{
            animation: "achieveBounce 0.6s 0.3s ease-out both",
          }}>
            {notif.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--c-accent)" }}>
              Succes debloque !
            </div>
            <div className="font-semibold text-sm truncate" style={{ color: "var(--c-text)" }}>
              {notif.title}
            </div>
            <div className="text-xs mt-0.5" style={{ color: "var(--c-text-muted)" }}>
              +{notif.points} points
            </div>
          </div>
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes achieveBounce {
            0% { transform: scale(0) rotate(-20deg); }
            60% { transform: scale(1.3) rotate(5deg); }
            100% { transform: scale(1) rotate(0deg); }
          }
        `}} />
      </div>
    </div>
  );
}

// ═══ Provider ═══
export function AchievementProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<AchievementNotif[]>([]);
  const [active, setActive] = useState<AchievementNotif | null>(null);
  const processingRef = useRef(false);

  const showAchievement = useCallback((notif: AchievementNotif) => {
    setQueue(prev => [...prev, notif]);
  }, []);

  // Process queue
  useEffect(() => {
    if (processingRef.current || queue.length === 0) return;
    processingRef.current = true;
    const next = queue[0];
    setActive(next);
    setQueue(prev => prev.slice(1));
  }, [queue]);

  const handleDone = useCallback(() => {
    setActive(null);
    processingRef.current = false;
  }, []);

  return (
    <AchievementContext.Provider value={{ showAchievement }}>
      {children}
      {active && <AchievementToastUI notif={active} onDone={handleDone} />}
    </AchievementContext.Provider>
  );
}
