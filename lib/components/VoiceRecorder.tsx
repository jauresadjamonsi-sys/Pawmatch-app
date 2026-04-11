"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface VoiceRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  onCancel: () => void;
}

const MAX_DURATION = 60; // seconds
const BAR_COUNT = 24;

function getSupportedMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "audio/webm";
  // iOS Safari needs audio/mp4; most others support webm/opus
  if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) return "audio/webm;codecs=opus";
  if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
  if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
  if (MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")) return "audio/ogg;codecs=opus";
  return "audio/webm";
}

function getFileExtension(mimeType: string): string {
  if (mimeType.includes("mp4")) return "m4a";
  if (mimeType.includes("ogg")) return "ogg";
  return "webm";
}

export { getFileExtension, getSupportedMimeType };

export default function VoiceRecorder({ onRecordingComplete, onCancel }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [bars, setBars] = useState<number[]>(new Array(BAR_COUNT).fill(4));
  const [permissionDenied, setPermissionDenied] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const cleanup = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    analyserRef.current = null;
    mediaRecorderRef.current = null;
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up analyser for waveform visualization
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        onRecordingComplete(blob);
        cleanup();
      };

      recorder.start(100); // collect data every 100ms
      setIsRecording(true);
      setElapsed(0);
      startTimeRef.current = Date.now();

      // Elapsed timer
      timerRef.current = setInterval(() => {
        const secs = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setElapsed(secs);
        if (secs >= MAX_DURATION) {
          // Auto-stop at 60s
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
          }
        }
      }, 250);

      // Waveform animation
      const updateBars = () => {
        if (!analyserRef.current) return;
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        const newBars: number[] = [];
        const step = Math.max(1, Math.floor(dataArray.length / BAR_COUNT));
        for (let i = 0; i < BAR_COUNT; i++) {
          const value = dataArray[Math.min(i * step, dataArray.length - 1)] || 0;
          const height = Math.max(4, (value / 255) * 32);
          newBars.push(height);
        }
        setBars(newBars);
        animFrameRef.current = requestAnimationFrame(updateBars);
      };
      animFrameRef.current = requestAnimationFrame(updateBars);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("Permission") || msg.includes("NotAllowed") || msg.includes("denied")) {
        setPermissionDenied(true);
      }
      cleanup();
    }
  }, [onRecordingComplete, cleanup]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  const handleCancel = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      // Remove onstop handler to prevent sending
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    cleanup();
    setIsRecording(false);
    setElapsed(0);
    onCancel();
  }, [cleanup, onCancel]);

  // Auto-start recording on mount
  useEffect(() => {
    startRecording();
  }, [startRecording]);

  function formatTime(secs: number) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  if (permissionDenied) {
    return (
      <div className="flex items-center gap-3 flex-1 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-2xl">
        <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        <span className="text-red-300 text-xs flex-1">Microphone non autorise. Verifie les permissions.</span>
        <button onClick={onCancel} className="text-[var(--c-text-muted)] text-xs hover:text-[var(--c-text)] transition">
          Fermer
        </button>
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes voicePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }
        .voice-pulse { animation: voicePulse 1s ease-in-out infinite; }
        @keyframes barBounce {
          0%, 100% { transform: scaleY(0.3); }
          50% { transform: scaleY(1); }
        }
      `}} />
      <div className="flex items-center gap-3 flex-1 px-3 py-2 bg-[var(--c-card)] border border-red-500/30 rounded-2xl">
        {/* Cancel button */}
        <button
          onClick={handleCancel}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--c-card)] transition flex-shrink-0"
          title="Annuler"
        >
          <svg className="w-4 h-4 text-[var(--c-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Recording indicator */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="voice-pulse w-2.5 h-2.5 rounded-full bg-red-500" />
          <span className="text-red-400 text-xs font-mono font-medium tabular-nums">
            {formatTime(elapsed)}
          </span>
        </div>

        {/* Waveform bars */}
        <div className="flex-1 flex items-center justify-center gap-[2px] h-8 overflow-hidden">
          {bars.map((h, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-75"
              style={{
                width: 3,
                height: h,
                background: isRecording
                  ? `linear-gradient(to top, rgba(249,115,22,0.6), rgba(239,68,68,0.8))`
                  : "rgba(255,255,255,0.15)",
                transition: "height 75ms ease-out",
              }}
            />
          ))}
        </div>

        {/* Stop / Send button */}
        <button
          onClick={stopRecording}
          disabled={!isRecording || elapsed < 1}
          className="w-9 h-9 bg-gradient-to-br from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 disabled:opacity-30 rounded-full flex items-center justify-center transition active:scale-95 flex-shrink-0"
          title="Envoyer"
        >
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
          </svg>
        </button>
      </div>
    </>
  );
}
