"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

// ──────────────────────────────────────────────────
// ICE / STUN config
// ──────────────────────────────────────────────────
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

type ConnectionState = "idle" | "ringing" | "connecting" | "connected" | "disconnected" | "error";

// ──────────────────────────────────────────────────
// Video Call Page
// ──────────────────────────────────────────────────
export default function VideoCallPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.id as string;
  const supabase = createClient();
  const { profile } = useAuth();

  // ── Refs ──
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);

  // ── State ──
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [webrtcSupported, setWebrtcSupported] = useState(true);

  // ── Check WebRTC support ──
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (!window.RTCPeerConnection || !navigator.mediaDevices?.getUserMedia) {
        setWebrtcSupported(false);
        setErrorMessage("Votre navigateur ne supporte pas les appels video. Utilisez Chrome, Safari ou Firefox.");
      }
    }
  }, []);

  // ── Call timer ──
  useEffect(() => {
    if (connectionState === "connected") {
      callTimerRef.current = setInterval(() => {
        setCallDuration((d) => d + 1);
      }, 1000);
    } else {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
    }
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, [connectionState]);

  // ── Format duration ──
  function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  // ── Cleanup function ──
  const cleanup = useCallback(() => {
    // Stop local media tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    // Close peer connection
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    // Unsubscribe channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    // Stop timer
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Unmount cleanup ──
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      cleanup();
    };
  }, [cleanup]);

  // ── Send notification to other user ──
  const sendCallNotification = useCallback(async () => {
    try {
      await fetch("/api/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId }),
      });
    } catch {
      // Non-blocking -- notification is best-effort
    }
  }, [matchId]);

  // ── Create peer connection ──
  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.oniceconnectionstatechange = () => {
      if (!isMountedRef.current) return;
      const state = pc.iceConnectionState;
      if (state === "connected" || state === "completed") {
        setConnectionState("connected");
        setRemoteConnected(true);
      } else if (state === "disconnected" || state === "failed" || state === "closed") {
        setConnectionState("disconnected");
        setRemoteConnected(false);
      }
    };

    pc.ontrack = (event) => {
      if (!isMountedRef.current) return;
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    return pc;
  }, []);

  // ── Start the call ──
  const startCall = useCallback(async () => {
    if (!profile || !webrtcSupported) return;

    setConnectionState("ringing");
    setErrorMessage(null);

    // 1. Get local media
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: isFrontCamera ? "user" : "environment" },
        audio: true,
      });
    } catch (err: any) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setErrorMessage("Acces camera/micro refuse. Veuillez autoriser l'acces dans les parametres de votre navigateur.");
      } else if (err.name === "NotFoundError") {
        setErrorMessage("Aucune camera ou micro detecte sur votre appareil.");
      } else {
        setErrorMessage("Impossible d'acceder a la camera: " + (err.message || "erreur inconnue"));
      }
      setConnectionState("error");
      return;
    }

    localStreamRef.current = stream;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    // 2. Create RTCPeerConnection
    const pc = createPeerConnection();
    pcRef.current = pc;

    // Add local tracks to peer connection
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    // 3. Signaling via Supabase Realtime
    const channel = supabase.channel(`call:${matchId}`, {
      config: { broadcast: { self: false } },
    });

    channelRef.current = channel;

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        channel.send({
          type: "broadcast",
          event: "ice-candidate",
          payload: { candidate: event.candidate.toJSON(), sender: profile.id },
        });
      }
    };

    channel.on("broadcast", { event: "offer" }, async ({ payload }) => {
      if (!isMountedRef.current || !pcRef.current) return;
      if (payload.sender === profile.id) return;

      try {
        setConnectionState("connecting");
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        const answer = await pcRef.current.createAnswer();
        await pcRef.current.setLocalDescription(answer);

        channel.send({
          type: "broadcast",
          event: "answer",
          payload: { sdp: answer, sender: profile.id },
        });
      } catch (e) {
        console.error("[Call] Error handling offer:", e);
      }
    });

    channel.on("broadcast", { event: "answer" }, async ({ payload }) => {
      if (!isMountedRef.current || !pcRef.current) return;
      if (payload.sender === profile.id) return;

      try {
        setConnectionState("connecting");
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      } catch (e) {
        console.error("[Call] Error handling answer:", e);
      }
    });

    channel.on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
      if (!isMountedRef.current || !pcRef.current) return;
      if (payload.sender === profile.id) return;

      try {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
      } catch (e) {
        console.error("[Call] Error adding ICE candidate:", e);
      }
    });

    channel.on("broadcast", { event: "call-end" }, ({ payload }) => {
      if (!isMountedRef.current) return;
      if (payload.sender === profile.id) return;
      setConnectionState("disconnected");
      cleanup();
    });

    // Join a peer when they signal readiness
    channel.on("broadcast", { event: "peer-ready" }, async ({ payload }) => {
      if (!isMountedRef.current || !pcRef.current) return;
      if (payload.sender === profile.id) return;

      // We received a peer-ready signal -- if we haven't created an offer, do so
      try {
        setConnectionState("connecting");
        const offer = await pcRef.current.createOffer();
        await pcRef.current.setLocalDescription(offer);

        channel.send({
          type: "broadcast",
          event: "offer",
          payload: { sdp: offer, sender: profile.id },
        });
      } catch (e) {
        console.error("[Call] Error creating offer:", e);
      }
    });

    await channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        // Send notification and signal readiness
        await sendCallNotification();

        channel.send({
          type: "broadcast",
          event: "peer-ready",
          payload: { sender: profile.id },
        });
      }
    });
  }, [profile, webrtcSupported, isFrontCamera, matchId, createPeerConnection, cleanup, sendCallNotification, supabase]);

  // ── Auto-start on mount ──
  useEffect(() => {
    if (profile && webrtcSupported) {
      startCall();
    }
  }, [profile, webrtcSupported]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Toggle mute ──
  function toggleMute() {
    if (!localStreamRef.current) return;
    const audioTracks = localStreamRef.current.getAudioTracks();
    audioTracks.forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsMuted(!isMuted);
  }

  // ── Toggle camera ──
  function toggleCamera() {
    if (!localStreamRef.current) return;
    const videoTracks = localStreamRef.current.getVideoTracks();
    videoTracks.forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsCameraOff(!isCameraOff);
  }

  // ── Switch camera (front/back) ──
  async function switchCamera() {
    if (!localStreamRef.current || !pcRef.current) return;
    const newFacing = !isFrontCamera;
    setIsFrontCamera(newFacing);

    try {
      // Stop current video track
      const currentVideoTrack = localStreamRef.current.getVideoTracks()[0];
      if (currentVideoTrack) currentVideoTrack.stop();

      // Get new stream with different facing mode
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacing ? "user" : "environment" },
        audio: false,
      });

      const newVideoTrack = newStream.getVideoTracks()[0];

      // Replace track in peer connection
      const sender = pcRef.current.getSenders().find((s) => s.track?.kind === "video");
      if (sender) {
        await sender.replaceTrack(newVideoTrack);
      }

      // Replace track in local stream
      localStreamRef.current.removeTrack(currentVideoTrack);
      localStreamRef.current.addTrack(newVideoTrack);

      // Update local video preview
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
    } catch (e) {
      console.error("[Call] Error switching camera:", e);
    }
  }

  // ── End call ──
  function endCall() {
    if (channelRef.current && profile) {
      channelRef.current.send({
        type: "broadcast",
        event: "call-end",
        payload: { sender: profile.id },
      });
    }
    cleanup();
    router.push(`/matches/${matchId}`);
  }

  // ── Handle beforeunload ──
  useEffect(() => {
    function handleBeforeUnload() {
      if (channelRef.current && profile) {
        channelRef.current.send({
          type: "broadcast",
          event: "call-end",
          payload: { sender: profile.id },
        });
      }
      cleanup();
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [profile, cleanup]);

  // ── Connection status label ──
  function getStatusLabel(): string {
    switch (connectionState) {
      case "idle":
        return "Initialisation...";
      case "ringing":
        return "Appel en cours...";
      case "connecting":
        return "Connexion...";
      case "connected":
        return "Connecte";
      case "disconnected":
        return "Deconnecte";
      case "error":
        return "Erreur";
      default:
        return "";
    }
  }

  function getStatusColor(): string {
    switch (connectionState) {
      case "connected":
        return "bg-amber-400";
      case "ringing":
      case "connecting":
        return "bg-amber-400";
      case "disconnected":
      case "error":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  }

  // ── WebRTC not supported ──
  if (!webrtcSupported) {
    return (
      <div className="min-h-screen bg-[var(--c-deep)] flex items-center justify-center px-4 pb-32">
        <div className="glass rounded-2xl p-6 max-w-sm text-center">
          <div className="text-5xl mb-4">📵</div>
          <h2 className="text-lg font-bold text-[var(--c-text)] mb-2">Appels video non supportes</h2>
          <p className="text-sm text-[var(--c-text-muted)] mb-4">{errorMessage}</p>
          <Link href={`/matches/${matchId}`} className="btn-futuristic inline-block px-6 py-2.5 text-sm">
            Retour au chat
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col relative overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes callPulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes ringPulse {
          0% { transform: scale(0.8); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0.5; }
          100% { transform: scale(0.8); opacity: 1; }
        }
        @keyframes floatIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes dotBlink {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        .call-pulse::before, .call-pulse::after {
          content: '';
          position: absolute;
          inset: -8px;
          border-radius: 50%;
          border: 2px solid rgba(249, 115, 22, 0.4);
          animation: callPulse 2s ease-out infinite;
        }
        .call-pulse::after { animation-delay: 0.6s; }
        .ring-anim { animation: ringPulse 1.5s ease-in-out infinite; }
        .float-in { animation: floatIn 0.4s ease-out forwards; }
        .dot-blink { animation: dotBlink 1.2s infinite; }
        .dot-blink:nth-child(2) { animation-delay: 0.2s; }
        .dot-blink:nth-child(3) { animation-delay: 0.4s; }
      `}} />

      {/* ── Remote video (full-screen) ── */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* ── Background overlay when no remote video ── */}
      {!remoteConnected && (
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f] via-[#0f0f1a] to-[#0a0a0f] flex items-center justify-center">
          <div className="text-center float-in">
            {/* Ringing animation */}
            {(connectionState === "ringing" || connectionState === "connecting") && (
              <div className="relative w-24 h-24 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-400/20 to-amber-500/10 ring-anim" />
                <div className="absolute inset-2 rounded-full bg-gradient-to-br from-amber-400/30 to-amber-500/20 flex items-center justify-center ring-anim" style={{ animationDelay: "0.3s" }}>
                  <span className="text-4xl">📹</span>
                </div>
                <div className="call-pulse absolute inset-0 rounded-full" />
              </div>
            )}

            {connectionState === "disconnected" && (
              <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">📵</span>
              </div>
            )}

            {connectionState === "error" && (
              <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">⚠️</span>
              </div>
            )}

            <p className="text-white/90 font-semibold text-lg mb-2">
              {connectionState === "ringing" && "En attente de l'autre personne..."}
              {connectionState === "connecting" && "Connexion en cours..."}
              {connectionState === "disconnected" && "Appel termine"}
              {connectionState === "error" && "Erreur de connexion"}
              {connectionState === "idle" && "Initialisation..."}
            </p>

            {(connectionState === "ringing" || connectionState === "connecting") && (
              <div className="flex items-center justify-center gap-1 mt-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 dot-blink" />
                <span className="w-2 h-2 rounded-full bg-amber-400 dot-blink" />
                <span className="w-2 h-2 rounded-full bg-amber-400 dot-blink" />
              </div>
            )}

            {errorMessage && (
              <p className="text-red-400 text-sm mt-3 max-w-xs mx-auto px-4">{errorMessage}</p>
            )}

            {connectionState === "disconnected" && (
              <button
                onClick={() => router.push(`/matches/${matchId}`)}
                className="mt-6 px-6 py-2.5 rounded-full bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition"
              >
                Retour au chat
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Top bar: status + timer ── */}
      <div className="absolute top-0 inset-x-0 z-20 safe-area-top">
        <div className="flex items-center justify-between px-4 pt-12 pb-3" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)" }}>
          <Link
            href={`/matches/${matchId}`}
            className="text-white/80 hover:text-white transition p-1"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>

          <div className="flex items-center gap-2">
            {/* Status indicator */}
            <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md rounded-full px-3 py-1.5">
              <div className={`w-2 h-2 rounded-full ${getStatusColor()} ${connectionState === "ringing" || connectionState === "connecting" ? "animate-pulse" : ""}`} />
              <span className="text-white/90 text-xs font-medium">{getStatusLabel()}</span>
            </div>

            {/* Timer */}
            {connectionState === "connected" && (
              <div className="bg-black/40 backdrop-blur-md rounded-full px-3 py-1.5">
                <span className="text-white/90 text-xs font-mono">{formatDuration(callDuration)}</span>
              </div>
            )}
          </div>

          <div className="w-6" /> {/* Spacer for centering */}
        </div>
      </div>

      {/* ── Local video (small, bottom-right) ── */}
      <div className="absolute bottom-36 right-4 z-20 w-28 h-40 sm:w-32 sm:h-44 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl">
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${isFrontCamera ? "scale-x-[-1]" : ""}`}
        />
        {isCameraOff && (
          <div className="absolute inset-0 bg-[#1a1a2e] flex items-center justify-center">
            <span className="text-2xl">📷</span>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-0.5 bg-red-500 rotate-45" />
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom controls ── */}
      <div className="absolute bottom-0 inset-x-0 z-20 pb-32">
        <div className="flex items-center justify-center gap-4 px-6 py-4" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)" }}>
          {/* Mute mic */}
          <button
            onClick={toggleMute}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-95 ${
              isMuted
                ? "bg-red-500/80 text-white"
                : "bg-white/15 backdrop-blur-md text-white hover:bg-white/25"
            }`}
            title={isMuted ? "Activer le micro" : "Couper le micro"}
          >
            {isMuted ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 19L5 5m14 0v4a2 2 0 01-2 2h0M12 18.75a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M9 4.5v.75a3 3 0 003 3v0" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
              </svg>
            )}
          </button>

          {/* Toggle camera */}
          <button
            onClick={toggleCamera}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-95 ${
              isCameraOff
                ? "bg-red-500/80 text-white"
                : "bg-white/15 backdrop-blur-md text-white hover:bg-white/25"
            }`}
            title={isCameraOff ? "Activer la camera" : "Couper la camera"}
          >
            {isCameraOff ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9A2.25 2.25 0 0013.5 5.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9A2.25 2.25 0 0013.5 5.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
              </svg>
            )}
          </button>

          {/* End call */}
          <button
            onClick={endCall}
            className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center transition-all active:scale-95 hover:bg-red-600 shadow-lg shadow-red-500/30"
            title="Raccrocher"
          >
            <svg className="w-7 h-7 text-white rotate-[135deg]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
            </svg>
          </button>

          {/* Switch camera */}
          <button
            onClick={switchCamera}
            className="w-14 h-14 rounded-full bg-white/15 backdrop-blur-md text-white flex items-center justify-center transition-all active:scale-95 hover:bg-white/25"
            title="Changer de camera"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M2.985 19.644l3.181-3.182" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
