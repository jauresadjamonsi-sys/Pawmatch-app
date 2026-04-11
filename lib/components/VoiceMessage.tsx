"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface VoiceMessageProps {
  audioUrl: string;
  isMine: boolean;
}

const BAR_COUNT = 20;

export default function VoiceMessage({ audioUrl, isMine }: VoiceMessageProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [bars, setBars] = useState<number[]>(() => {
    // Generate deterministic pseudo-random bars based on url hash
    const result: number[] = [];
    let seed = 0;
    for (let i = 0; i < audioUrl.length; i++) seed = ((seed << 5) - seed + audioUrl.charCodeAt(i)) | 0;
    for (let i = 0; i < BAR_COUNT; i++) {
      seed = (seed * 16807 + 7) % 2147483647;
      result.push(8 + (seed % 20));
    }
    return result;
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.addEventListener("loadedmetadata", () => {
      if (isFinite(audio.duration)) setDuration(audio.duration);
    });
    audio.addEventListener("durationchange", () => {
      if (isFinite(audio.duration)) setDuration(audio.duration);
    });
    audio.addEventListener("timeupdate", () => {
      setCurrentTime(audio.currentTime);
    });
    audio.addEventListener("ended", () => {
      setIsPlaying(false);
      setCurrentTime(0);
      audio.currentTime = 0;
    });

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, [audioUrl]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }, [isPlaying]);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const bar = progressRef.current;
    if (!audio || !bar || !duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * duration;
    setCurrentTime(audio.currentTime);
  }, [duration]);

  const progress = duration > 0 ? currentTime / duration : 0;

  function formatDuration(secs: number) {
    if (!secs || !isFinite(secs)) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  const activeColor = isMine ? "rgba(255,255,255,0.9)" : "rgba(251,191,36,0.9)";
  const inactiveColor = isMine ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.15)";
  const playBtnBg = isMine ? "rgba(255,255,255,0.2)" : "rgba(249,115,22,0.15)";
  const playIconColor = isMine ? "text-white" : "text-amber-400";
  const timeColor = isMine ? "text-white/60" : "text-[var(--c-text-muted)]";

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes voiceBarPlay {
          0%, 100% { transform: scaleY(0.4); }
          50% { transform: scaleY(1); }
        }
      `}} />
      <div className="flex items-center gap-2.5 min-w-[200px] max-w-[260px] px-3 py-2">
        {/* Play/Pause button */}
        <button
          onClick={togglePlay}
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition active:scale-90"
          style={{ background: playBtnBg }}
        >
          {isPlaying ? (
            <svg className={`w-3.5 h-3.5 ${playIconColor}`} fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          ) : (
            <svg className={`w-3.5 h-3.5 ${playIconColor} ml-0.5`} fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Waveform + progress */}
        <div className="flex-1 flex flex-col gap-1">
          <div
            ref={progressRef}
            className="flex items-center gap-[2px] h-6 cursor-pointer"
            onClick={handleProgressClick}
          >
            {bars.map((h, i) => {
              const barProgress = i / BAR_COUNT;
              const isActive = barProgress <= progress;
              return (
                <div
                  key={i}
                  className="rounded-full flex-1"
                  style={{
                    height: h,
                    minWidth: 2,
                    background: isActive ? activeColor : inactiveColor,
                    transition: "background 0.15s ease",
                    animation: isPlaying && isActive ? `voiceBarPlay ${0.4 + (i % 3) * 0.15}s ease-in-out infinite` : "none",
                    transformOrigin: "bottom",
                  }}
                />
              );
            })}
          </div>

          {/* Duration / Time */}
          <div className={`flex justify-between text-[10px] font-mono ${timeColor}`}>
            <span>{formatDuration(isPlaying ? currentTime : 0)}</span>
            <span>{formatDuration(duration)}</span>
          </div>
        </div>

        {/* Microphone icon */}
        <div className="flex-shrink-0 opacity-40">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z" />
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
          </svg>
        </div>
      </div>
    </>
  );
}
