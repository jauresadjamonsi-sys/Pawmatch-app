"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type Position = {
  lat: number;
  lng: number;
  timestamp: number;
};

export default function BaladePage() {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<Position | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [trackedPosition, setTrackedPosition] = useState<Position | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Check for tracked user in URL
  const [trackUserId, setTrackUserId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const track = params.get("track");
    if (track) setTrackUserId(track);
  }, []);

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, [supabase]);

  // Duration timer
  useEffect(() => {
    if (sharing) {
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        if (startTimeRef.current) {
          setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setDuration(0);
      startTimeRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sharing]);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // Start sharing position
  const startSharing = useCallback(() => {
    if (!userId) return;
    if (!navigator.geolocation) {
      setError("Geolocalisation non supportee par votre navigateur");
      return;
    }

    setError(null);
    setSharing(true);

    // Create realtime channel
    const channel = supabase.channel(`balade-${userId}`);
    channelRef.current = channel;
    channel.subscribe();

    // Watch position
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const position: Position = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          timestamp: Date.now(),
        };
        setCurrentPosition(position);

        // Broadcast position via Realtime
        channel.send({
          type: "broadcast",
          event: "position",
          payload: position,
        });
      },
      (err) => {
        setError(`Erreur GPS: ${err.message}`);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      }
    );
  }, [userId, supabase]);

  // Stop sharing
  const stopSharing = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setSharing(false);
    setCurrentPosition(null);
  }, [supabase]);

  // Track another user's position
  useEffect(() => {
    if (!trackUserId) return;

    const channel = supabase.channel(`balade-${trackUserId}`);
    channel.on("broadcast", { event: "position" }, ({ payload }) => {
      if (payload) {
        setTrackedPosition(payload as Position);
        setLastUpdate(Date.now());
      }
    });
    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [trackUserId, supabase]);

  // Time since last update
  const [timeSinceUpdate, setTimeSinceUpdate] = useState<number>(0);
  useEffect(() => {
    if (!lastUpdate) return;
    const interval = setInterval(() => {
      setTimeSinceUpdate(Math.floor((Date.now() - lastUpdate) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [lastUpdate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [supabase]);

  const shareLink = userId
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/balade?track=${userId}`
    : "";

  const copyLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
    }
  };

  return (
    <div className="min-h-screen px-4 py-6 pb-32" style={{ background: "var(--c-deep)" }}>
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="mb-6 animate-slide-up">
          <h1 className="text-2xl font-bold gradient-text-animated">Balade en cours</h1>
          <p className="text-[var(--c-text-muted)] text-sm mt-1">
            Partagez votre position en toute securite pendant vos sorties
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Sharing controls */}
        {!trackUserId && (
          <div className="glass rounded-2xl p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center text-xl">
                  {sharing ? "\uD83D\uDCCD" : "\uD83D\uDEB6"}
                </div>
                <div>
                  <div className="text-sm font-bold text-[var(--c-text)]">Partager ma position</div>
                  <div className="text-xs text-[var(--c-text-muted)]">
                    {sharing ? "Position partagee en direct" : "Activez pour demarrer"}
                  </div>
                </div>
              </div>

              {/* Toggle switch */}
              <button
                onClick={() => (sharing ? stopSharing() : startSharing())}
                className={
                  "btn-press relative w-14 h-7 rounded-full transition-colors duration-300 " +
                  (sharing ? "bg-green-500 animate-pulse-glow" : "bg-[var(--c-border)]")
                }
              >
                <div
                  className={
                    "absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-300 " +
                    (sharing ? "translate-x-7" : "translate-x-0.5")
                  }
                />
              </button>
            </div>

            {/* Active sharing state */}
            {sharing && (
              <div className="space-y-3">
                {/* Duration */}
                <div className="glass-strong rounded-xl p-4 text-center">
                  <div className="text-xs text-[var(--c-text-muted)] mb-1">Duree de la balade</div>
                  <div className="text-3xl font-bold text-[var(--c-text)] font-mono">
                    {formatDuration(duration)}
                  </div>
                </div>

                {/* Current position */}
                {currentPosition && (
                  <div className="glass-strong rounded-xl p-4">
                    <div className="text-xs text-[var(--c-text-muted)] mb-2">Position actuelle</div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                      <div className="text-sm text-[var(--c-text)] font-mono">
                        {currentPosition.lat.toFixed(6)}, {currentPosition.lng.toFixed(6)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Share link */}
                <div className="glass-strong rounded-xl p-4">
                  <div className="text-xs text-[var(--c-text-muted)] mb-2">Lien de suivi</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 text-xs text-[var(--c-text)] bg-[var(--c-deep)] rounded-lg px-3 py-2 truncate font-mono">
                      {shareLink}
                    </div>
                    <button
                      onClick={copyLink}
                      className="px-3 py-2 bg-orange-500 text-white text-xs font-bold rounded-lg shrink-0"
                    >
                      Copier
                    </button>
                  </div>
                  <p className="text-[10px] text-[var(--c-text-muted)] mt-2">
                    Partagez ce lien avec vos proches pour qu'ils suivent votre balade
                  </p>
                </div>

                {/* Action buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <Link
                    href="/urgence"
                    className="flex items-center justify-center gap-2 py-3 bg-red-500/15 border border-red-500/30 text-red-400 font-bold text-sm rounded-xl"
                  >
                    <span className="text-lg">{"\uD83C\uDD98"}</span> SOS Urgence
                  </Link>
                  <button
                    onClick={stopSharing}
                    className="flex items-center justify-center gap-2 py-3 bg-[var(--c-card)] border border-[var(--c-border)] text-[var(--c-text-muted)] font-bold text-sm rounded-xl"
                  >
                    Arreter le partage
                  </button>
                </div>
              </div>
            )}

            {/* Inactive state hint */}
            {!sharing && (
              <div className="text-center py-6">
                <div className="text-4xl mb-3">{"\uD83D\uDC3E"}</div>
                <p className="text-sm text-[var(--c-text-muted)]">
                  Activez le partage avant de partir en promenade.<br />
                  Vos proches pourront suivre votre position en temps reel.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tracking view */}
        {trackUserId && (
          <div className="glass rounded-2xl p-5 mb-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center text-xl">
                {"\uD83D\uDCE1"}
              </div>
              <div>
                <div className="text-sm font-bold text-[var(--c-text)]">Suivi en cours</div>
                <div className="text-xs text-[var(--c-text-muted)]">
                  Vous suivez la position d'un promeneur
                </div>
              </div>
            </div>

            {trackedPosition ? (
              <div className="space-y-3">
                <div className="glass-strong rounded-xl p-4">
                  <div className="text-xs text-[var(--c-text-muted)] mb-2">Derniere position connue</div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
                    <div className="text-sm text-[var(--c-text)] font-mono">
                      {trackedPosition.lat.toFixed(6)}, {trackedPosition.lng.toFixed(6)}
                    </div>
                  </div>
                  <div className="text-xs text-[var(--c-text-muted)]">
                    Derniere mise a jour : il y a {timeSinceUpdate} seconde{timeSinceUpdate !== 1 ? "s" : ""}
                  </div>
                </div>

                <Link
                  href="/urgence"
                  className="flex items-center justify-center gap-2 w-full py-3 bg-red-500/15 border border-red-500/30 text-red-400 font-bold text-sm rounded-xl"
                >
                  <span className="text-lg">{"\uD83C\uDD98"}</span> SOS Urgence
                </Link>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-[var(--c-text-muted)]">
                  En attente de la position du promeneur...
                </p>
              </div>
            )}
          </div>
        )}

        {/* Safety tips */}
        <div className="glass rounded-2xl p-5">
          <div className="text-sm font-bold text-[var(--c-text)] mb-3">Conseils de securite</div>
          <div className="space-y-2">
            {[
              "Partagez votre lien avec un proche avant de partir",
              "Gardez votre telephone charge et accessible",
              "Restez dans des zones eclairees et frequentees",
              "En cas d'urgence, utilisez le bouton SOS",
            ].map((tip, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-[var(--c-text-muted)]">
                <span className="text-green-400 mt-0.5">{"\u2713"}</span>
                <span>{tip}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
