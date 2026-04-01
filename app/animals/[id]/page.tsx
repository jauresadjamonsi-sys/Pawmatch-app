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
      const id = params.id as string;
      const result = await getAnimalById(supabase, id);
      if (result.data) {
        setAnimal(result.data);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: animals } = await supabase
          .from("animals")
          .select("*")
          .eq("created_by", user.id);
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
      setShowMatchModal(false);
    }
    setMatchSending(false);
  }

  function formatAge(months: number | null) {
    if (!months) return "Âge inconnu";
    if (months < 12) return months + " mois";
    const years = Math.floor(months / 12);
    const rest = months % 12;
    if (rest > 0) return years + " an" + (years > 1 ? "s" : "") + " " + rest + " mois";
    return years + " an" + (years > 1 ? "s" : "");
  }

  if (loading) return <p className="text-center py-12 text-gray-500">Chargement...</p>;
  if (!animal) return <p className="text-center py-12 text-gray-500">Animal introuvable</p>;

  const cantonName = animal.canton ? CANTONS.find((c) => c.code === animal.canton)?.name || animal.canton : null;
  const traits: string[] = animal.traits || [];
  const isOwner = profile?.id === animal.created_by;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/animals" className="text-orange-500 hover:underline text-sm">
            ← Retour au catalogue
          </Link>
          {isOwner && (
            <Link href={"/admin/animals/" + animal.id + "/edit"} className="text-orange-500 hover:underline text-sm">
              Modifier
            </Link>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="h-64 bg-gray-100 flex items-center justify-center">
            {animal.photo_url ? (
              <img src={animal.photo_url} alt={animal.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-8xl">{EMOJI_MAP[animal.species] || "🐾"}</span>
            )}
          </div>

          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold text-gray-900">{animal.name}</h1>
              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                {animal.status === "disponible" ? "Disponible" : animal.status === "en_cours" ? "En cours" : "Matché"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-500">Espèce</p>
                <p className="font-semibold">{animal.species.charAt(0).toUpperCase() + animal.species.slice(1)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-500">Race</p>
                <p className="font-semibold">{animal.breed || "Non renseignée"}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-500">Âge</p>
                <p className="font-semibold">{formatAge(animal.age_months)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-500">Genre</p>
                <p className="font-semibold">{animal.gender === "male" ? "Mâle" : animal.gender === "femelle" ? "Femelle" : "Inconnu"}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-500">Poids</p>
                <p className="font-semibold">{animal.weight_kg ? animal.weight_kg + " kg" : "Non renseigné"}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-500">Localisation</p>
                <p className="font-semibold">
                  {animal.city || ""}
                  {animal.city && cantonName ? ", " : ""}
                  {cantonName ? cantonName + " (" + animal.canton + ")" : ""}
                  {!animal.city && !cantonName ? "Non renseignée" : ""}
                </p>
              </div>
            </div>

            <div className="flex gap-4 mb-6">
              <span className={"px-3 py-1 rounded-full text-sm font-medium " + (animal.vaccinated ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}>
                {animal.vaccinated ? "Vacciné" : "Non vacciné"}
              </span>
              <span className={"px-3 py-1 rounded-full text-sm font-medium " + (animal.sterilized ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}>
                {animal.sterilized ? "Stérilisé" : "Non stérilisé"}
              </span>
            </div>

            {traits.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-3">Caractère</h2>
                <div className="flex flex-wrap gap-2">
                  {traits.map((trait) => (
                    <span key={trait} className="px-3 py-1.5 bg-orange-50 text-orange-700 rounded-full text-sm font-medium">
                      {trait}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {animal.description && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-2">Description</h2>
                <p className="text-gray-600 leading-relaxed">{animal.description}</p>
              </div>
            )}

            {/* Bouton match */}
            {!isOwner && (
              <>
                {matchSuccess ? (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                    <p className="text-green-700 font-semibold">Demande envoyée !</p>
                    <p className="text-green-600 text-sm mt-1">Vous serez notifié quand le propriétaire répondra.</p>
                    <Link href="/matches" className="inline-block mt-3 text-orange-500 hover:underline text-sm font-medium">
                      Voir mes matchs →
                    </Link>
                  </div>
                ) : !isAuthenticated ? (
                  <Link href="/login" className="block w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition text-center">
                    Se connecter pour matcher
                  </Link>
                ) : myAnimals.length === 0 ? (
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
                    <p className="text-orange-700 font-medium">Ajoutez d'abord votre compagnon pour matcher.</p>
                    <Link href="/profile/animals/new" className="inline-block mt-2 text-orange-500 hover:underline text-sm font-medium">
                      + Ajouter mon compagnon
                    </Link>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowMatchModal(true)}
                    className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition"
                  >
                    Je craque pour {animal.name}
                  </button>
                )}
              </>
            )}

            {/* Modal sélection animal */}
            {showMatchModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Avec quel compagnon ?</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Choisissez lequel de vos compagnons rencontrera {animal.name}
                  </p>

                  {matchError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                      {matchError}
                    </div>
                  )}

                  <div className="space-y-2 mb-4">
                    {myAnimals.map((myAnimal) => (
                      <button
                        key={myAnimal.id}
                        onClick={() => handleMatch(myAnimal.id)}
                        disabled={matchSending}
                        className="w-full flex items-center gap-3 p-3 bg-gray-50 hover:bg-orange-50 rounded-xl transition text-left disabled:opacity-50"
                      >
                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {myAnimal.photo_url ? (
                            <img src={myAnimal.photo_url} alt={myAnimal.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xl">{EMOJI_MAP[myAnimal.species] || "🐾"}</span>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{myAnimal.name}</p>
                          <p className="text-xs text-gray-500">
                            {myAnimal.species.charAt(0).toUpperCase() + myAnimal.species.slice(1)}
                            {myAnimal.breed ? " · " + myAnimal.breed : ""}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => { setShowMatchModal(false); setMatchError(null); }}
                    className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium rounded-xl transition text-sm"
                  >
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
