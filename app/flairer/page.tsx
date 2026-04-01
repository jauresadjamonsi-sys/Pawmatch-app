"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { sendMatch } from "@/lib/services/matches";
import { CANTONS } from "@/lib/cantons";
import Link from "next/link";

const EMOJI_MAP: Record<string, string> = {
  chien: "🐕", chat: "🐱", lapin: "🐰",
  oiseau: "🐦", rongeur: "🐹", autre: "🐾",
};

type Animal = {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  age_months: number | null;
  gender: string;
  description: string | null;
  photo_url: string | null;
  canton: string | null;
  city: string | null;
  traits: string[];
  created_by: string | null;
};

export default function FlairerPage() {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [myAnimals, setMyAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matchSuccess, setMatchSuccess] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const supabase = createClient();
  const { profile, isAuthenticated, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading) fetchData();
  }, [authLoading]);

  async function fetchData() {
    const { data: allAnimals } = await supabase
      .from("animals")
      .select("*")
      .eq("status", "disponible")
      .order("created_at", { ascending: false });

    // Exclure ses propres animaux
    const filtered = (allAnimals || []).filter(
      (a: Animal) => a.created_by !== profile?.id
    );

    // Mélanger aléatoirement
    const shuffled = filtered.sort(() => Math.random() - 0.5);
    setAnimals(shuffled);

    if (profile) {
      const { data: mine } = await supabase
        .from("animals")
        .select("*")
        .eq("created_by", profile.id);
      setMyAnimals(mine || []);
    }

    setLoading(false);
  }

  function formatAge(months: number | null) {
    if (!months) return "Âge inconnu";
    if (months < 12) return months + " mois";
    const y = Math.floor(months / 12);
    return y + " an" + (y > 1 ? "s" : "");
  }

  function handlePass() {
    setSwipeDirection("left");
    setTimeout(() => {
      setSwipeDirection(null);
      setDragX(0);
      setCurrentIndex((i) => i + 1);
    }, 300);
  }

  function handleLike() {
    if (!isAuthenticated) {
      window.location.href = "/login";
      return;
    }
    if (myAnimals.length === 0) {
      window.location.href = "/profile/animals/new";
      return;
    }
    setShowMatchModal(true);
  }

  async function handleMatch(myAnimalId: string) {
    const animal = animals[currentIndex];
    if (!animal || !profile) return;
    setMatchError(null);

    const result = await sendMatch(
      supabase,
      myAnimalId,
      animal.id,
      profile.id,
      animal.created_by || "NONE"
    );

    if (result.error) {
      setMatchError(result.error);
    } else {
      setMatchSuccess(true);
      setTimeout(() => {
        setMatchSuccess(false);
        setShowMatchModal(false);
        setSwipeDirection("right");
        setTimeout(() => {
          setSwipeDirection(null);
          setDragX(0);
          setCurrentIndex((i) => i + 1);
        }, 300);
      }, 1500);
    }
  }

  // Touch handlers
  function onTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX;
    setIsDragging(true);
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!isDragging) return;
    const diff = e.touches[0].clientX - startX.current;
    setDragX(diff);
  }

  function onTouchEnd() {
    setIsDragging(false);
    if (dragX > 100) {
      handleLike();
      if (!isAuthenticated || myAnimals.length === 0) setDragX(0);
    } else if (dragX < -100) {
      handlePass();
    } else {
      setDragX(0);
    }
  }

  // Mouse handlers
  function onMouseDown(e: React.MouseEvent) {
    startX.current = e.clientX;
    setIsDragging(true);
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!isDragging) return;
    const diff = e.clientX - startX.current;
    setDragX(diff);
  }

  function onMouseUp() {
    setIsDragging(false);
    if (dragX > 100) {
      handleLike();
      if (!isAuthenticated || myAnimals.length === 0) setDragX(0);
    } else if (dragX < -100) {
      handlePass();
    } else {
      setDragX(0);
    }
  }

  if (loading || authLoading) {
    return <p className="text-center py-20 text-gray-500">Chargement...</p>;
  }

  const animal = animals[currentIndex];

  if (!animal) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-6xl mb-4">👃</p>
          <h2 className="text-2xl font-bold text-white mb-2">Plus personne à flairer !</h2>
          <p className="text-gray-400 mb-6">Tu as vu tous les profils disponibles. Reviens plus tard !</p>
          <Link href="/animals" className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition">
            Voir le catalogue
          </Link>
        </div>
      </div>
    );
  }

  const cantonName = animal.canton ? CANTONS.find((c) => c.code === animal.canton)?.name : null;
  const rotation = dragX * 0.1;
  const opacity = Math.max(0, 1 - Math.abs(dragX) / 500);

  const cardStyle = swipeDirection
    ? {
        transform: `translateX(${swipeDirection === "left" ? "-120%" : "120%"}) rotate(${swipeDirection === "left" ? "-30" : "30"}deg)`,
        transition: "transform 0.3s ease-out",
        opacity: 0,
      }
    : {
        transform: `translateX(${dragX}px) rotate(${rotation}deg)`,
        transition: isDragging ? "none" : "transform 0.3s ease-out",
      };

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-6">
      {/* Header */}
      <div className="w-full max-w-md flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-white">👃 Flairer</h1>
        <span className="text-xs text-gray-500">{animals.length - currentIndex} restants</span>
      </div>

      {/* Card */}
      <div className="w-full max-w-md relative" style={{ height: "65vh" }}>
        {/* Indicateurs swipe */}
        {dragX > 50 && (
          <div className="absolute top-8 left-8 z-20 bg-green-500 text-white font-bold text-xl px-6 py-2 rounded-xl rotate-[-15deg] border-4 border-green-400">
            JE FLAIRE 👃
          </div>
        )}
        {dragX < -50 && (
          <div className="absolute top-8 right-8 z-20 bg-red-500 text-white font-bold text-xl px-6 py-2 rounded-xl rotate-[15deg] border-4 border-red-400">
            SUIVANT ✋
          </div>
        )}

        <div
          className="w-full h-full bg-white/5 border border-white/10 rounded-3xl overflow-hidden cursor-grab active:cursor-grabbing select-none"
          style={cardStyle}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={() => { if (isDragging) { setIsDragging(false); setDragX(0); } }}
        >
          {/* Photo */}
          <div className="h-[55%] bg-[#2a1f3a] flex items-center justify-center overflow-hidden relative">
            {animal.photo_url ? (
              <img src={animal.photo_url} alt={animal.name} className="w-full h-full object-cover" draggable={false} />
            ) : (
              <span className="text-8xl">{EMOJI_MAP[animal.species] || "🐾"}</span>
            )}

            {/* Overlay gradient */}
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#1a1225] to-transparent"></div>

            {/* Nom sur la photo */}
            <div className="absolute bottom-4 left-5">
              <h2 className="text-2xl font-bold text-white">{animal.name}</h2>
              <p className="text-sm text-gray-300">
                {animal.species.charAt(0).toUpperCase() + animal.species.slice(1)}
                {animal.breed ? " · " + animal.breed : ""}
              </p>
            </div>
          </div>

          {/* Infos */}
          <div className="h-[45%] p-5 overflow-y-auto">
            <div className="flex flex-wrap gap-2 mb-3">
              {animal.canton && (
                <span className="px-3 py-1 bg-orange-500/20 text-orange-300 rounded-full text-xs font-medium">
                  📍 {cantonName || animal.canton}
                </span>
              )}
              {animal.city && (
                <span className="px-3 py-1 bg-white/10 text-gray-300 rounded-full text-xs">{animal.city}</span>
              )}
              <span className="px-3 py-1 bg-white/10 text-gray-300 rounded-full text-xs">
                {formatAge(animal.age_months)}
              </span>
              <span className="px-3 py-1 bg-white/10 text-gray-300 rounded-full text-xs">
                {animal.gender === "male" ? "♂ Mâle" : animal.gender === "femelle" ? "♀ Femelle" : "Inconnu"}
              </span>
            </div>

            {animal.traits && animal.traits.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {animal.traits.map((trait: string) => (
                  <span key={trait} className="px-2 py-1 bg-purple-500/10 text-purple-300 rounded-full text-[11px]">{trait}</span>
                ))}
              </div>
            )}

            {animal.description && (
              <p className="text-gray-400 text-sm leading-relaxed">{animal.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Boutons */}
      <div className="flex items-center gap-6 mt-6">
        <button
          onClick={handlePass}
          className="w-16 h-16 bg-white/5 border border-white/10 rounded-full flex items-center justify-center hover:bg-red-500/20 hover:border-red-500/50 transition text-2xl"
        >
          ✋
        </button>

        <button
          onClick={() => { setCurrentIndex((i) => Math.max(0, i - 1)); }}
          className="w-12 h-12 bg-white/5 border border-white/10 rounded-full flex items-center justify-center hover:bg-white/10 transition text-lg"
        >
          ↩️
        </button>

        <button
          onClick={handleLike}
          className="w-16 h-16 bg-orange-500 border-2 border-orange-400 rounded-full flex items-center justify-center hover:bg-orange-600 transition text-2xl shadow-lg shadow-orange-500/30"
        >
          👃
        </button>
      </div>

      <p className="text-gray-600 text-xs mt-4">Swipe droite pour flairer, gauche pour passer</p>

      {/* Match Modal */}
      {showMatchModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#2a1f3a] border border-white/10 rounded-2xl max-w-md w-full p-6">
            {matchSuccess ? (
              <div className="text-center py-4">
                <p className="text-5xl mb-3">🎉</p>
                <h3 className="text-xl font-bold text-white mb-2">Demande envoyée !</h3>
                <p className="text-gray-400 text-sm">{animal.name} sera bientôt prévenu</p>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-bold text-white mb-2">Avec quel compagnon ?</h3>
                <p className="text-sm text-gray-400 mb-4">Qui va flairer {animal.name} ?</p>

                {matchError && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">{matchError}</div>}

                <div className="space-y-2 mb-4">
                  {myAnimals.map((myAnimal) => (
                    <button key={myAnimal.id} onClick={() => handleMatch(myAnimal.id)}
                      className="w-full flex items-center gap-3 p-3 bg-white/5 hover:bg-orange-500/10 rounded-xl transition text-left border border-white/5">
                      <div className="w-12 h-12 rounded-full bg-[#1a1225] border-2 border-orange-400 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {myAnimal.photo_url ? (
                          <img src={myAnimal.photo_url} alt={myAnimal.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xl">{EMOJI_MAP[myAnimal.species] || "🐾"}</span>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-white text-sm">{myAnimal.name}</p>
                        <p className="text-xs text-gray-500">{myAnimal.species} {myAnimal.breed ? "· " + myAnimal.breed : ""}</p>
                      </div>
                    </button>
                  ))}
                </div>

                <button onClick={() => { setShowMatchModal(false); setMatchError(null); setDragX(0); }}
                  className="w-full py-2 bg-white/10 hover:bg-white/20 text-gray-300 font-medium rounded-xl transition text-sm">
                  Annuler
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
