"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { useAppContext } from "@/lib/contexts/AppContext";
import { getMyMatches, respondToMatch, MatchWithAnimals } from "@/lib/services/matches";
import Link from "next/link";

const EMOJI_MAP: Record<string, string> = {
  chien: "🐕", chat: "🐱", lapin: "🐰",
  oiseau: "🐦", rongeur: "🐹", autre: "🐾",
};

const CONFETTI_COLORS = ["#f97316","#fb923c","#fbbf24","#34d399","#60a5fa","#f472b6","#a78bfa"];

function CoupDeTruffe({ match, onClose, t }: { match: MatchWithAnimals; onClose: () => void; t: Record<string, string> }) {
  const [confetti, setConfetti] = useState<Array<{id:number;x:number;color:string;size:number;delay:number;duration:number}>>([]);

  useEffect(() => {
    const items = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: Math.random() * 8 + 6,
      delay: Math.random() * 1.5,
      duration: Math.random() * 2 + 2,
    }));
    setConfetti(items);
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes confettiFall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        @keyframes truffePop {
          0% { transform: scale(0) rotate(-10deg); opacity: 0; }
          60% { transform: scale(1.2) rotate(5deg); opacity: 1; }
          80% { transform: scale(0.95) rotate(-2deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes pawBeat {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
        @keyframes slideUp {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .confetti-piece { animation: confettiFall linear infinite; }
        .truffe-pop { animation: truffePop 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        .paw-beat { animation: pawBeat 1s ease-in-out infinite; }
        .slide-up { animation: slideUp 0.5s ease-out forwards; }
      `}} />

      {/* Confetti */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {confetti.map((c) => (
          <div key={c.id} className="confetti-piece absolute top-0 rounded-sm"
            style={{
              left: c.x + "%",
              width: c.size + "px",
              height: c.size + "px",
              backgroundColor: c.color,
              animationDelay: c.delay + "s",
              animationDuration: c.duration + "s",
            }} />
        ))}
      </div>

      {/* Card */}
      <div className="relative truffe-pop bg-gradient-to-br from-[#241d33] to-[#1a1225] border border-orange-500/30 rounded-3xl p-10 text-center max-w-sm mx-4 shadow-2xl shadow-orange-500/20"
        onClick={(e) => e.stopPropagation()}>

        {/* Glow */}
        <div className="absolute inset-0 rounded-3xl bg-orange-500/5 blur-xl" />

        {/* Paw */}
        <div className="paw-beat text-7xl mb-4">🐾</div>

        {/* Title */}
        <h2 className="slide-up text-3xl font-extrabold bg-gradient-to-r from-orange-400 to-orange-300 bg-clip-text text-transparent mb-1"
          style={{ animationDelay: "0.2s" }}>
          {t.matchesCoup}
        </h2>
        <p className="slide-up text-gray-400 text-sm mb-6" style={{ animationDelay: "0.3s" }}>
          {t.matchesMutual} 🎉
        </p>

        {/* Animals */}
        <div className="slide-up flex items-center justify-center gap-4 mb-6" style={{ animationDelay: "0.4s" }}>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-orange-500/20 border-2 border-orange-500/50 flex items-center justify-center overflow-hidden mx-auto mb-1">
              {match.sender_animal.photo_url
                ? <img src={match.sender_animal.photo_url} alt={match.sender_animal.name} className="w-full h-full object-cover" />
                : <span className="text-2xl">{EMOJI_MAP[match.sender_animal.species] || "🐾"}</span>}
            </div>
            <p className="text-xs text-white font-semibold">{match.sender_animal.name}</p>
          </div>

          <div className="text-3xl paw-beat">💥</div>

          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-pink-500/20 border-2 border-pink-500/50 flex items-center justify-center overflow-hidden mx-auto mb-1">
              {match.receiver_animal.photo_url
                ? <img src={match.receiver_animal.photo_url} alt={match.receiver_animal.name} className="w-full h-full object-cover" />
                : <span className="text-2xl">{EMOJI_MAP[match.receiver_animal.species] || "🐾"}</span>}
            </div>
            <p className="text-xs text-white font-semibold">{match.receiver_animal.name}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="slide-up flex gap-3" style={{ animationDelay: "0.5s" }}>
          <Link href={"/matches/" + match.id}
            className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-2xl text-sm transition hover:from-orange-600 hover:to-orange-700">
            {t.matchesChat}
          </Link>
          <button onClick={onClose}
            className="px-4 py-3 bg-white/5 border border-white/10 text-gray-400 rounded-2xl text-sm hover:bg-white/10 transition">
            {t.matchesLater}
          </button>
        </div>

        <p className="text-[10px] text-gray-600 mt-4">{t.matchesAutoClose}</p>
      </div>
    </div>
  );
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<MatchWithAnimals[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coupDeTruffe, setCoupDeTruffe] = useState<MatchWithAnimals | null>(null);
  const supabase = createClient();
  const { profile, loading: authLoading } = useAuth();
  const { t } = useAppContext();

  useEffect(() => {
    if (profile) fetchMatches();
    else if (!authLoading) setLoading(false);
  }, [profile, authLoading]);

  async function fetchMatches() {
    setLoading(true);
    const result = await getMyMatches(supabase, profile!.id);
    if (result.error) {
      setError(result.error);
    } else {
      setMatches(result.data || []);
    }
    setLoading(false);
  }

  async function handleRespond(matchId: string, response: "accepted" | "rejected") {
    const result = await respondToMatch(supabase, matchId, response);
    if (result.error) {
      setError(result.error);
    } else {
      await fetchMatches();
      if (response === "accepted") {
        const result2 = await getMyMatches(supabase, profile!.id);
        const acceptedMatch = (result2.data || []).find(m => m.id === matchId);
        if (acceptedMatch) setCoupDeTruffe(acceptedMatch);
      }
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#1a1225] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">{t.loading}</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#1a1225] flex items-center justify-center">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center max-w-md">
          <h2 className="text-xl font-bold text-white mb-2">{t.matchesLoginRequired}</h2>
          <p className="text-gray-500">{t.matchesLoginMsg}</p>
        </div>
      </div>
    );
  }

  const pendingReceived = matches.filter((m) => m.status === "pending" && m.receiver_user_id === profile.id);
  const pendingSent = matches.filter((m) => m.status === "pending" && m.sender_user_id === profile.id);
  const accepted = matches.filter((m) => m.status === "accepted");

  function AnimalBadge({ animal }: { animal: { name: string; species: string; breed: string | null; photo_url: string | null } }) {
    return (
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center overflow-hidden flex-shrink-0 border border-white/10">
          {animal.photo_url
            ? <img src={animal.photo_url} alt={animal.name} className="w-full h-full object-cover" />
            : <span className="text-xl">{EMOJI_MAP[animal.species] || "🐾"}</span>}
        </div>
        <div>
          <p className="font-semibold text-white text-sm">{animal.name}</p>
          <p className="text-xs text-gray-500">
            {animal.species.charAt(0).toUpperCase() + animal.species.slice(1)}
            {animal.breed ? " · " + animal.breed : ""}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1225] p-6">
      {coupDeTruffe && (
        <CoupDeTruffe match={coupDeTruffe} onClose={() => setCoupDeTruffe(null)} t={t} />
      )}

      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">{t.matchesTitle}</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm">{error}</div>
        )}

        {/* Demandes reçues */}
        {pendingReceived.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-3">
              {t.matchesReceived}
              <span className="ml-2 px-2 py-0.5 bg-orange-500/20 text-orange-300 rounded-full normal-case">{pendingReceived.length}</span>
            </h2>
            <div className="space-y-3">
              {pendingReceived.map((match) => (
                <div key={match.id} className="bg-white/5 border border-orange-500/20 rounded-2xl p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <AnimalBadge animal={match.sender_animal} />
                    <span className="text-orange-500 font-bold">→</span>
                    <AnimalBadge animal={match.receiver_animal} />
                  </div>
                  <p className="text-sm text-gray-500 mb-4">
                    {match.sender_profile.full_name || match.sender_profile.email} {t.matchesWants} {match.sender_animal.name} {t.matchesMeet} {match.receiver_animal.name}
                  </p>
                  <div className="flex gap-3">
                    <button onClick={() => handleRespond(match.id, "accepted")}
                      className="flex-1 py-2.5 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition text-sm">
                      {t.matchesAccept}
                    </button>
                    <button onClick={() => handleRespond(match.id, "rejected")}
                      className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 font-semibold rounded-xl transition text-sm">
                      {t.matchesDecline}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Matchs confirmés */}
        {accepted.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-3">
              {t.matchesConfirmed}
              <span className="ml-2 px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full normal-case">{accepted.length}</span>
            </h2>
            <div className="space-y-3">
              {accepted.map((match) => {
                const isMe = match.sender_user_id === profile.id;
                const myAnimal = isMe ? match.sender_animal : match.receiver_animal;
                const theirAnimal = isMe ? match.receiver_animal : match.sender_animal;
                return (
                  <div key={match.id} className="bg-white/5 border border-green-500/20 rounded-2xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <AnimalBadge animal={myAnimal} />
                      <span className="text-green-400 font-bold">♥</span>
                      <AnimalBadge animal={theirAnimal} />
                    </div>
                    <div className="flex gap-3 mt-3">
                      <button onClick={() => setCoupDeTruffe(match)}
                        className="px-4 py-2 bg-orange-500/20 border border-orange-500/30 text-orange-300 rounded-xl text-xs font-semibold hover:bg-orange-500/30 transition">
                        {"🐾 " + t.matchesCoup}
                      </button>
                      <Link href={"/matches/" + match.id}
                        className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition text-sm text-center">
                        {t.matchesChat}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* En attente */}
        {pendingSent.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-3">
              {t.matchesPending}
              <span className="ml-2 px-2 py-0.5 bg-white/10 text-gray-400 rounded-full normal-case">{pendingSent.length}</span>
            </h2>
            <div className="space-y-3">
              {pendingSent.map((match) => (
                <div key={match.id} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                  <div className="flex items-center gap-3">
                    <AnimalBadge animal={match.sender_animal} />
                    <span className="text-gray-500 font-bold">→</span>
                    <AnimalBadge animal={match.receiver_animal} />
                  </div>
                  <p className="text-xs text-gray-500 mt-3">{t.matchesWaiting} {match.receiver_profile.full_name || match.receiver_profile.email}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {matches.length === 0 && (
          <div className="text-center py-16">
            <p className="text-5xl mb-4">💕</p>
            <p className="text-xl text-white font-medium">{t.matchesNone}</p>
            <p className="text-gray-500 mt-2 text-sm">{t.matchesBrowse}</p>
            <Link href="/animals" className="inline-block mt-6 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition">
              {t.matchesDiscover}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
