"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { getAnimalById, AnimalRow } from "@/lib/services/animals";
import { sendMatch } from "@/lib/services/matches";
import { CANTONS } from "@/lib/cantons";
import Link from "next/link";
import { useParams } from "next/navigation";

const EMOJI_MAP: Record<string, string> = {
  chien: "🐕", chat: "🐱", lapin: "🐰",
  oiseau: "🐦", rongeur: "🐹", autre: "🐾",
};

export default function AnimalDetailPage() {
  const [animal, setAnimal] = useState<AnimalRow | null>(null);
  const [myAnimals, setMyAnimals] = useState<AnimalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchSending, setMatchSending] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [matchSuccess, setMatchSuccess] = useState(false);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const params = useParams();
  const supabase = createClient();
  const { profile, isAuthenticated } = useAuth();

  useEffect(() => {
    async function fetchData() {
      const result = await getAnimalById(supabase, params.id as string);
      if (result.data) setAnimal(result.data);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: animals } = await supabase.from("animals").select("*").eq("created_by", user.id);
        setMyAnimals(animals || []);
      }
      setLoading(false);
    }
    fetchData();
  }, [params.id]);

  async function handleMatch(myAnimalId: string) {
    if (!animal || !profile) return;
    setMatchSending(true);
    setMatchError(null);
    const result = await sendMatch(supabase, myAnimalId, animal.id, profile.id, animal.created_by || "NONE");
    if (result.error) { setMatchError(result.error); } else { setMatchSuccess(true); setShowMatchModal(false); }
    setMatchSending(false);
  }

  function formatAge(months: number | null) {
    if (!months) return "Inconnu";
    if (months < 12) return months + " mois";
    const y = Math.floor(months / 12);
    const r = months % 12;
    return y + " an" + (y > 1 ? "s" : "") + (r > 0 ? " " + r + " mois" : "");
  }

  if (loading) return <p className="text-center py-12 text-gray-500">Chargement...</p>;
  if (!animal) return <p className="text-center py-12 text-gray-500">Animal introuvable</p>;

  const cantonName = animal.canton ? CANTONS.find((c) => c.code === animal.canton)?.name || animal.canton : null;
  const traits: string[] = animal.traits || [];
  const isOwner = profile?.id === animal.created_by;

  return (
    <div className="min-h-screen px-6 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/animals" className="text-orange-400 hover:underline text-sm">← Retour au catalogue</Link>
          {isOwner && <Link href={"/animals/" + animal.id + "/edit"} className="text-orange-400 hover:underline text-sm">Modifier</Link>}
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="h-72 bg-[#2a1f3a] flex items-center justify-center overflow-hidden">
            {animal.photo_url ? (
              <img src={animal.photo_url} alt={animal.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-8xl">{EMOJI_MAP[animal.species] || "🐾"}</span>
            )}
          </div>

          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold text-white">{animal.name}</h1>
              <span className="bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-sm font-medium">
                {animal.status === "disponible" ? "Disponible" : animal.status === "en_cours" ? "En cours" : "Matché"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { label: "Espèce", value: animal.species.charAt(0).toUpperCase() + animal.species.slice(1) },
                { label: "Race", value: animal.breed || "Non renseignée" },
                { label: "Âge", value: formatAge(animal.age_months) },
                { label: "Genre", value: animal.gender === "male" ? "Mâle" : animal.gender === "femelle" ? "Femelle" : "Inconnu" },
                { label: "Poids", value: animal.weight_kg ? animal.weight_kg + " kg" : "Non renseigné" },
                { label: "Localisation", value: [animal.city, cantonName ? cantonName + " (" + animal.canton + ")" : ""].filter(Boolean).join(", ") || "Non renseignée" },
              ].map((item) => (
                <div key={item.label} className="bg-white/5 rounded-xl p-4">
                  <p className="text-xs text-gray-500">{item.label}</p>
                  <p className="font-semibold text-white text-sm">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-3 mb-6">
              <span className={"px-3 py-1 rounded-full text-xs font-medium " + (animal.vaccinated ? "bg-green-500/20 text-green-300" : "bg-white/5 text-gray-500")}>
                {animal.vaccinated ? "✓ Vacciné" : "Non vacciné"}
              </span>
              <span className={"px-3 py-1 rounded-full text-xs font-medium " + (animal.sterilized ? "bg-green-500/20 text-green-300" : "bg-white/5 text-gray-500")}>
                {animal.sterilized ? "✓ Stérilisé" : "Non stérilisé"}
              </span>
            </div>

            {traits.length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Caractère</h2>
                <div className="flex flex-wrap gap-2">
                  {traits.map((trait) => (
                    <span key={trait} className="px-3 py-1.5 bg-orange-500/10 text-orange-300 rounded-full text-xs font-medium">{trait}</span>
                  ))}
                </div>
              </div>
            )}

            {animal.description && (
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Description</h2>
                <p className="text-gray-300 leading-relaxed text-sm">{animal.description}</p>
              </div>
            )}

            {/* Match section */}
            {!isOwner && (
              <>
                {matchSuccess ? (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center">
                    <p className="text-green-300 font-semibold">Demande envoyée !</p>
                    <p className="text-green-400/70 text-sm mt-1">Vous serez notifié quand le propriétaire répondra.</p>
                    <Link href="/matches" className="inline-block mt-3 text-orange-400 hover:underline text-sm font-medium">Voir mes matchs →</Link>
                  </div>
                ) : !isAuthenticated ? (
                  <Link href="/login" className="block w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition text-center">
                    Se connecter pour matcher
                  </Link>
                ) : myAnimals.length === 0 ? (
                  <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 text-center">
                    <p className="text-orange-300 font-medium">Ajoutez d'abord votre compagnon pour matcher.</p>
                    <Link href="/profile/animals/new" className="inline-block mt-2 text-orange-400 hover:underline text-sm font-medium">+ Ajouter mon compagnon</Link>
                  </div>
                ) : (
                  <button onClick={() => setShowMatchModal(true)} className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition text-lg">
                    👃 Je flaire {animal.name}
                  </button>
                )}
              </>
            )}

            {/* Modal */}
            {showMatchModal && (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                <div className="bg-[#2a1f3a] border border-white/10 rounded-2xl max-w-md w-full p-6">
                  <h3 className="text-lg font-bold text-white mb-2">Avec quel compagnon ?</h3>
                  <p className="text-sm text-gray-400 mb-4">Choisissez lequel de vos compagnons rencontrera {animal.name}</p>

                  {matchError && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">{matchError}</div>}

                  <div className="space-y-2 mb-4">
                    {myAnimals.map((myAnimal) => (
                      <button key={myAnimal.id} onClick={() => handleMatch(myAnimal.id)} disabled={matchSending}
                        className="w-full flex items-center gap-3 p-3 bg-white/5 hover:bg-orange-500/10 rounded-xl transition text-left disabled:opacity-50 border border-white/5">
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

                  <button onClick={() => { setShowMatchModal(false); setMatchError(null); }}
                    className="w-full py-2 bg-white/10 hover:bg-white/20 text-gray-300 font-medium rounded-xl transition text-sm">
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
