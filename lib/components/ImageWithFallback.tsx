"use client";
import { useState } from "react";

interface Props {
  src: string | null | undefined;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  fallbackEmoji?: string;
}

export default function ImageWithFallback({ src, alt, className = "", style, fallbackEmoji = "\uD83D\uDC3E" }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <div className={`flex items-center justify-center ${className}`}
        style={{ ...style, background: "rgba(251,191,36,0.1)" }}>
        <span className="text-2xl">{fallbackEmoji}</span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`} style={style}>
      {!loaded && (
        <div className="absolute inset-0 animate-shimmer rounded-inherit" />
      )}
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </div>
  );
}
