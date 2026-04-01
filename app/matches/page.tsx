"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { getMyMatches, respondToMatch, MatchWithAnimals } from "@/lib/services/matches";
import Link from "next/link";

const EMOJI_MAP: Record<string, string> = {
  chien: "🐕", chat: "🐱", lapin: "🐰",
  oiseau: "🐦", rongeur: "🐹", autre: "🐾",
};

export default function MatchesPage() {
  const [matches, setMatches] = useState<MatchWithAnimals[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const { profile, loading: authLoading } = useAuth();

  useEffect(() => {
    if (profile) fetchMatches();
  }, [profile]);

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
      fetchMatches();
    }
  }

  if (authLoading || loading) {
    return <p className="text-center py-12 text-gray-500">Chargement...</p>;
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#1a1225] flex items-center justify-center">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center max-w-md">
          <h2 className="text-xl font-bold text-white mb-2">Connexion requise</h2>
          <p className="text-gray-500">Connectez-vous pour voir vos matchs.</p>
        </div>
      </div>
    );
  }

  const pendingReceived = matches.filter((m) => m.status === "pending" && m.receiver_user_id === profile.id);
  const pendingSent = matches.filter((m) => m.status === "pending" && m.sender_user_id === profile.id);
  const accepted = matches.filter((m) => m.status === "accepted");
  const rejected = matches.filter((m) => m.status === "rejected");

  function AnimalBadge({ animal }: { animal: { name: string; species: string; breed: string | null; photo_url: string | null } }) {
    return (
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
          {animal.photo_url ? (
            <img src={animal.photo_url} alt={animal.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-xl">{EMOJI_MAP[animal.species] || "🐾"}</span>
          )}
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
    <div className="min-h-screen bg-[#1a1225] p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Mes matchs</h1>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Demandes reçues */}
        {pendingReceived.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-white mb-4">
              Demandes reçues
              <span className="ml-2 px-2 py-0.5 bg-orange-500/20 text-orange-300 rounded-full text-sm">{pendingReceived.length}</span>
            </h2>
            <div className="space-y-3">
              {pendingReceived.map((match) => (
                <div key={match.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 border border-orange-500/20">
                  <div className="flex items-center gap-3 mb-4">
                    <AnimalBadge animal={match.sender_animal} />
                    <span className="text-orange-500 font-bold text-lg">→</span>
                    <AnimalBadge animal={match.receiver_animal} />
                  </div>
                  <p className="text-sm text-gray-500 mb-4">
                    {match.sender_profile.full_name || match.sender_profile.email} veut que {match.sender_animal.name} rencontre {match.receiver_animal.name}
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleRespond(match.id, "accepted")}
                      className="flex-1 py-2 bg-green-500/100 hover:bg-green-600 text-white font-semibold rounded-xl transition text-sm"
                    >
                      Accepter
                    </button>
                    <button
                      onClick={() => handleRespond(match.id, "rejected")}
                      className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-500 font-semibold rounded-xl transition text-sm"
                    >
                      Décliner
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Matchs acceptés */}
        {accepted.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-white mb-4">
              Matchs confirmés
              <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-400 rounded-full text-sm">{accepted.length}</span>
            </h2>
            <div className="space-y-3">
              {accepted.map((match) => {
                const isMe = match.sender_user_id === profile.id;
                const otherProfile = isMe ? match.receiver_profile : match.sender_profile;
                const myAnimal = isMe ? match.sender_animal : match.receiver_animal;
                const theirAnimal = isMe ? match.receiver_animal : match.sender_animal;

                return (
                  <div key={match.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 border border-green-500/20">
                    <div className="flex items-center gap-3 mb-3">
                      <AnimalBadge animal={myAnimal} />
                      <span className="text-green-500 font-bold text-lg">♥</span>
                      <AnimalBadge animal={theirAnimal} />
                    </div>
                    <div className="bg-green-500/10 rounded-xl p-4">
                      <p className="text-sm font-medium text-green-300">C'est un match !</p>
                      <Link href={"/matches/" + match.id} className="inline-block mt-2 px-5 py-2 bg-green-500/100 hover:bg-green-600 text-white font-semibold rounded-xl transition text-sm">Discuter</Link>
                      
                      
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Demandes envoyées en attente */}
        {pendingSent.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-white mb-4">
              En attente de réponse
              <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-sm">{pendingSent.length}</span>
            </h2>
            <div className="space-y-3">
              {pendingSent.map((match) => (
                <div key={match.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 border border-white/10">
                  <div className="flex items-center gap-3">
                    <AnimalBadge animal={match.sender_animal} />
                    <span className="text-gray-500 font-bold text-lg">→</span>
                    <AnimalBadge animal={match.receiver_animal} />
                  </div>
                  <p className="text-xs text-gray-500 mt-3">En attente de réponse de {match.receiver_profile.full_name || match.receiver_profile.email}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Aucun match */}
        {matches.length === 0 && (
          <div className="text-center py-16">
            <p className="text-5xl mb-4">💕</p>
            <p className="text-xl text-gray-500 font-medium">Aucun match pour l'instant</p>
            <p className="text-gray-500 mt-2">Parcourez le catalogue et craquez pour un compagnon.</p>
            <Link href="/animals" className="inline-block mt-6 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition">
              Découvrir les profils
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
