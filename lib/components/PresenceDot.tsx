"use client";

interface PresenceDotProps {
  isOnline: boolean;
  size?: "sm" | "md" | "lg";
}

const SIZE_MAP = { sm: 8, md: 10, lg: 12 } as const;

export default function PresenceDot({ isOnline, size = "md" }: PresenceDotProps) {
  const px = SIZE_MAP[size];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes presencePulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.5); }
          50% { box-shadow: 0 0 8px 2px rgba(34,197,94,0.3); }
        }
      `}} />
      <span
        title={isOnline ? "Online" : "Offline"}
        style={{
          display: "inline-block",
          width: px,
          height: px,
          borderRadius: "50%",
          flexShrink: 0,
          backgroundColor: isOnline ? "#22c55e" : "#6b7280",
          boxShadow: isOnline ? "0 0 8px rgba(34,197,94,0.6)" : "none",
          animation: isOnline ? "presencePulse 2s ease-in-out infinite" : "none",
          border: "2px solid var(--c-card, #1e1830)",
        }}
      />
    </>
  );
}
