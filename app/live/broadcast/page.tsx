"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

type ChatMsg = {
  id: string;
  user: string;
  avatar?: string;
  text: string;
  ts: number;
};

type FloatingReaction = {
  id: number;
  emoji: string;
  x: number;
};

const REACTION_EMOJIS = ["❤️", "🔥", "🐾", "😍", "👏", "⭐"];

export default function BroadcastPage() {
  const searchParams = useSearchParams();
  const watchId = searchParams.get("watch");
  const router = useRouter();
  const { profile } = useAuth();
  const supabase = createClient();

  const [mode, setMode] = useState<"setup" | "broadcasting" | "watching">(watchId ? "watching" : "setup");
  const [title, setTitle] = useState("");
  const [species, setSpecies] = useState("");
  const [streamId, setStreamId] = useState<string | null>(watchId);
  const [streamInfo, setStreamInfo] = useState<any>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [duration, setDuration] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const reactionIdRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout>();

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Duration timer
  useEffect(() => {
    if (mode === "broadcasting" || mode === "watching") {
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [mode]);

  // Supabase Realtime for chat and reactions
  useEffect(() => {
    if (!streamId) return;
    const channel = supabase.channel(`live:${streamId}`);

    channel
      .on("broadcast", { event: "chat" }, ({ payload }) => {
        setChatMessages(prev => [...prev.slice(-100), {
          id: `${Date.now()}-${Math.random()}`,
          user: payload.user || "Anonyme",
          avatar: payload.avatar,
          text: payload.text,
          ts: Date.now(),
        }]);
      })
      .on("broadcast", { event: "reaction" }, ({ payload }) => {
        addFloatingReaction(payload.emoji);
      })
      .on("broadcast", { event: "viewer_count" }, ({ payload }) => {
        setViewerCount(payload.count || 0);
      })
      .on("broadcast", { event: "end_stream" }, () => {
        if (mode === "watching") {
          alert("Le live est termine !");
          router.push("/live");
        }
      })
      .subscribe();

    // Announce presence
    if (mode === "watching") {
      channel.send({
        type: "broadcast",
        event: "viewer_join",
        payload: { user: profile?.full_name || "Visiteur" },
      });
    }

    return () => {
      supabase.removeChannel(channel);
    };
  }, [streamId, mode]);

  // Start camera for broadcasting
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraError(null);
    } catch (err: any) {
      console.error("[Camera] error:", err);
      setCameraError("Impossible d'acceder a la camera. Verifiez les permissions de votre navigateur.");
    }
  };

  // Go live
  const handleGoLive = async () => {
    if (!title.trim() || !profile) return;

    await startCamera();

    try {
      const res = await fetch("/api/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), species_filter: species || null }),
      });
      const data = await res.json();
      if (data.stream) {
        setStreamId(data.stream.id);
        setMode("broadcasting");
      } else {
        alert(data.error || "Erreur lors du lancement du live");
      }
    } catch {
      alert("Erreur reseau");
    }
  };

  // End stream
  const handleEndStream = async () => {
    if (!streamId) return;
    const confirmed = confirm("Terminer le live ?");
    if (!confirmed) return;

    // Notify viewers
    const channel = supabase.channel(`live:${streamId}`);
    await channel.send({ type: "broadcast", event: "end_stream", payload: {} });

    // Stop camera
    streamRef.current?.getTracks().forEach(t => t.stop());

    // Update DB
    await fetch("/api/live", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stream_id: streamId, action: "end" }),
    });

    router.push("/live");
  };

  // Send chat message
  const sendChat = () => {
    if (!chatInput.trim() || !streamId) return;
    const channel = supabase.channel(`live:${streamId}`);
    channel.send({
      type: "broadcast",
      event: "chat",
      payload: {
        user: profile?.full_name || "Anonyme",
        avatar: profile?.avatar_url,
        text: chatInput.trim(),
      },
    });
    setChatInput("");
  };

  // Send reaction
  const sendReaction = (emoji: string) => {
    if (!streamId) return;
    const channel = supabase.channel(`live:${streamId}`);
    channel.send({
      type: "broadcast",
      event: "reaction",
      payload: { emoji },
    });
    addFloatingReaction(emoji);
  };

  // Add floating reaction animation
  const addFloatingReaction = useCallback((emoji: string) => {
    const id = reactionIdRef.current++;
    const x = 60 + Math.random() * 30;
    setReactions(prev => [...prev.slice(-20), { id, emoji, x }]);
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== id));
    }, 2000);
  }, []);

  // Fetch stream info when watching
  useEffect(() => {
    if (watchId) {
      supabase
        .from("live_streams")
        .select("*")
        .eq("id", watchId)
        .single()
        .then(({ data }) => {
          if (data) {
            setStreamInfo(data);
            setTitle(data.title);
          }
        });
    }
  }, [watchId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      clearInterval(timerRef.current);
    };
  }, []);

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return h > 0
      ? `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
      : `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Setup screen
  if (mode === "setup") {
    return (
      <div className="min-h-screen flex items-center justify-center pb-32" style={{ background: "var(--c-deep)" }}>
        <div className="max-w-md w-full mx-4">
          <div className="glass rounded-3xl p-6 border border-[var(--c-border)]">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center mx-auto mb-3">
                <span className="text-3xl">📡</span>
              </div>
              <div className="flex items-center justify-center gap-3 mb-2">
                <button onClick={() => window.history.length > 1 ? window.history.back() : (window.location.href = "/feed")} aria-label="Retour" className="inline-flex items-center justify-center w-9 h-9 rounded-full transition-all active:scale-90 flex-shrink-0" style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--c-text)" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                </button>
                <h1 className="text-xl font-extrabold text-[var(--c-text)]">Lancer un live</h1>
              </div>
              <p className="text-sm text-[var(--c-text-muted)] mt-1">Partagez un moment avec votre animal</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-[var(--c-text)] mb-1.5 block">Titre du live *</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Ex: Balade avec Rex au parc"
                  maxLength={80}
                  className="w-full px-4 py-3 rounded-xl text-sm border border-[var(--c-border)] bg-[var(--c-card)] text-[var(--c-text)] placeholder:text-[var(--c-text-muted)] focus:outline-none focus:ring-2 focus:ring-red-500/30"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-[var(--c-text)] mb-1.5 block">Categorie</label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { v: "", l: "Tous" },
                    { v: "chien", l: "🐕 Chien" },
                    { v: "chat", l: "🐱 Chat" },
                    { v: "autre", l: "🐾 Autre" },
                  ].map(o => (
                    <button
                      key={o.v}
                      onClick={() => setSpecies(o.v)}
                      className={
                        "px-3 py-1.5 rounded-full text-xs font-medium transition-all " +
                        (species === o.v
                          ? "bg-red-500 text-white"
                          : "bg-[var(--c-card)] text-[var(--c-text-muted)] border border-[var(--c-border)]")
                      }
                    >
                      {o.l}
                    </button>
                  ))}
                </div>
              </div>

              {cameraError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {cameraError}
                </div>
              )}

              <button
                onClick={handleGoLive}
                disabled={!title.trim() || !profile}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-500 to-pink-500 text-white font-bold text-sm shadow-lg shadow-red-500/30 hover:shadow-red-500/50 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                Demarrer le live
              </button>

              {!profile && (
                <p className="text-center text-xs text-[var(--c-text-muted)]">
                  <Link href="/login" className="text-amber-400">Connectez-vous</Link> pour lancer un live
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Broadcasting / Watching
  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes floatUp {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-300px) scale(1.5); opacity: 0; }
        }
        .float-reaction { animation: floatUp 2s ease-out forwards; }
      `}} />

      {/* Video */}
      <div className="relative w-full h-screen">
        {mode === "broadcasting" ? (
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
            <div className="text-center">
              <p className="text-5xl mb-3">📡</p>
              <p className="text-white font-bold">{title}</p>
              <p className="text-white/50 text-sm mt-1">Live en cours...</p>
            </div>
          </div>
        )}

        {/* Top overlay */}
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Live badge */}
              <div className="flex items-center gap-1.5 bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                LIVE
              </div>
              {/* Duration */}
              <span className="text-white/80 text-xs font-mono bg-black/40 px-2 py-1 rounded-full">
                {formatTime(duration)}
              </span>
              {/* Viewers */}
              <span className="flex items-center gap-1 text-white/80 text-xs bg-black/40 px-2 py-1 rounded-full">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                </svg>
                {viewerCount}
              </span>
            </div>
            {/* Close / End */}
            <button
              onClick={mode === "broadcasting" ? handleEndStream : () => router.push("/live")}
              className="w-9 h-9 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white hover:bg-red-500/50 transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {/* Stream info */}
          <div className="mt-3 flex items-center gap-2">
            {streamInfo?.profiles?.avatar_url && (
              <Image src={streamInfo.profiles.avatar_url} alt="" width={28} height={28} className="w-7 h-7 rounded-full object-cover" />
            )}
            <div>
              <p className="text-white text-sm font-semibold">{title}</p>
              <p className="text-white/50 text-xs">{streamInfo?.profiles?.full_name || profile?.full_name}</p>
            </div>
          </div>
        </div>

        {/* Floating reactions */}
        <div className="absolute bottom-32 right-4 pointer-events-none">
          {reactions.map(r => (
            <div
              key={r.id}
              className="float-reaction absolute bottom-0 text-3xl"
              style={{ right: `${r.x - 60}%` }}
            >
              {r.emoji}
            </div>
          ))}
        </div>

        {/* Bottom overlay - chat & reactions */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
          {/* Chat messages */}
          <div className="max-h-48 overflow-y-auto px-4 pb-2 space-y-1.5">
            {chatMessages.map(msg => (
              <div key={msg.id} className="flex items-start gap-2">
                <span className="text-xs font-bold text-amber-400 whitespace-nowrap">{msg.user}</span>
                <span className="text-xs text-white/90">{msg.text}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Reaction bar */}
          <div className="flex items-center gap-2 px-4 py-2">
            {REACTION_EMOJIS.map(emoji => (
              <button
                key={emoji}
                onClick={() => sendReaction(emoji)}
                className="w-10 h-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-lg hover:bg-white/20 hover:scale-110 transition-all active:scale-90"
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Chat input */}
          <div className="flex items-center gap-2 px-4 pb-6 pt-1">
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendChat()}
              placeholder="Envoyer un message..."
              maxLength={200}
              className="flex-1 px-4 py-2.5 rounded-full text-sm bg-white/10 backdrop-blur border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-white/30"
            />
            <button
              onClick={sendChat}
              disabled={!chatInput.trim()}
              className="w-10 h-10 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 flex items-center justify-center text-white shadow-lg disabled:opacity-40 transition-all"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
