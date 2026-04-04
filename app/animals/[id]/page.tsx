"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { getAnimalById, AnimalRow } from "@/lib/services/animals";
import { sendMatchWithLimit } from "@/lib/services/matches";
import { CANTONS } from "@/lib/cantons";
import { computeCompatibility } from "@/lib/services/compatibility";
import { detectPersonality } from "@/lib/services/personality";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAppContext } from "@/lib/contexts/AppContext";
import { SimulationRencontre } from "@/lib/components/SimulationRencontre";
import { HealthDashboard } from "@/lib/components/HealthDashboard";
import { QRIdentity } from "@/lib/components/QRIdentity";

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
  const [showSimulation, setShowSimulation] = useState(false);
  const [hasCoupDeTruffe, setHasCoupDeTruffe] = useState(false);
  const [compatibility, setCompatibility] = useState<any>(null);
  const personality = animal ? detectPersonality(animal.traits || []) : null;
  const { lang } = useAppContext();
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
      // Vérifier si Coup de Truffe existe
      if (user && result.data) {
        const { data: myAnimalsList } = await supabase.from("animals").select("id").eq("created_by", user.id);
        if (myAnimalsList) {
          const myIds = myAnimalsList.map(a => a.id);
          const { data: coupMatch } = await supabase
            .from("matches")
            .select("id")
            .eq("status", "accepted")
            .or(myIds.map(id => `sender_animal_id.eq.${id},receiver_animal_id.eq.${id}`).join(","))
            .or(`sender_animal_id.eq.${result.data.id},receiver_animal_id.eq.${result.data.id}`)
            .limit(1);
          if (coupMatch && coupMatch.length > 0) setHasCoupDeTruffe(true);
        }
      }
      // Calculer compatibilité si on a un animal principal
      if (user) {
        const { data: myAnimals } = await supabase.from('animals').select('*').eq('created_by', user.id);
        if (myAnimals && myAnimals.length > 0 && result.data) {
          setCompatibility(computeCompatibility(myAnimals[0], result.data));
        }
      }
    }
    fetchData();
  }, [params.id]);

  async function handleMatch(myAnimalId: string) {
    if (!animal || !profile) return;
    setMatchSending(true);
    setMatchError(null);
    const result = await sendMatchWithLimit(supabase, myAnimalId, animal.id, profile.id, animal.created_by || "NONE", profile.subscription || "free");
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
          {/* compatibility moved */}
              {false && (
                <div className="mt-6 bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🤖</span>
                      <h3 className="font-bold text-[var(--c-text)] text-sm">Pourquoi ce match ?</h3>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black" style={{ color: compatibility.color }}>{compatibility.score}%</span>
                      <p className="text-[10px] text-[var(--c-text-muted)]">{compatibility.label}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 mb-4">
                    {[
                      { label: 'Espèce', score: Math.min(100, (compatibility.score * 1.2)) },
                      { label: 'Caractère', score: Math.min(100, (compatibility.score * 0.9)) },
                      { label: 'Localisation', score: Math.min(100, (compatibility.score * 1.1)) },
                      { label: 'Âge', score: Math.min(100, (compatibility.score * 0.8)) },
                    ].map((trait, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-[10px] mb-1">
                          <span className="text-[var(--c-text-muted)]">{trait.label}</span>
                          <span className="font-bold" style={{ color: compatibility.color }}>{Math.round(trait.score)}%</span>
                        </div>
                        <div className="h-1.5 bg-[var(--c-border)] rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: trait.score + '%', background: compatibility.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  {compatibility.reasons.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {compatibility.reasons.map((r: string, i: number) => (
                        <span key={i} className="px-3 py-1 rounded-full text-xs font-bold border" style={{ color: compatibility.color, borderColor: compatibility.color + '40', background: compatibility.color + '15' }}>
                          ✓ {r}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {isOwner && <Link href={"/animals/" + animal.id + "/edit"} className="text-orange-400 hover:underline text-sm">Modifier</Link>}
            {compatibility && (
              <div className="mt-6 bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🤖</span>
                    <h3 className="font-bold text-[var(--c-text)] text-sm">Pourquoi ce match ?</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black" style={{ color: compatibility.color }}>{compatibility.score}%</span>
                    <p className="text-[10px] text-[var(--c-text-muted)]">{compatibility.label}</p>
                  </div>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:16 }}>
                  {[
                    { label: 'Espèce', score: Math.min(100, (compatibility.score * 1.2)) },
                    { label: 'Caractère', score: Math.min(100, (compatibility.score * 0.9)) },
                    { label: 'Localisation', score: Math.min(100, (compatibility.score * 1.1)) },
                    { label: 'Âge', score: Math.min(100, (compatibility.score * 0.8)) },
                  ].map((trait, i) => (
                    <div key={i}>
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, marginBottom:3 }}>
                        <span className="text-[var(--c-text-muted)]">{trait.label}</span>
                        <span className="font-bold" style={{ color: compatibility.color }}>{Math.round(trait.score)}%</span>
                      </div>
                      <div className="h-1.5 bg-[var(--c-border)] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: trait.score + '%', background: compatibility.color }} />
                      </div>
                    </div>
                  ))}
                </div>
                {compatibility.reasons.length > 0 && (
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                    {compatibility.reasons.map((r, i) => (
                      <span key={i} className="px-3 py-1 rounded-full text-xs font-bold border" style={{ color: compatibility.color, borderColor: compatibility.color + '40', background: compatibility.bgColor || compatibility.color + '15' }}>
                        ✓ {r}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
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
              {personality && <a href={"/animals/" + animal.id + "/personality"} style={{ display:"inline-block", marginTop:8, background: personality.bgColor, color: personality.color, border: "1px solid " + personality.color + "40", fontSize: 12, fontWeight: 800, padding: "4px 14px", borderRadius: 50, textDecoration: "none" }}>{personality.emoji} {personality.name}</a>}
              {hasCoupDeTruffe && (
                <span className="bg-pink-500/20 text-pink-400 px-3 py-1.5 rounded-full text-xs font-bold border border-pink-500/30 animate-pulse">
                  💥 Coup de Truffe
                </span>
              )}
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

            
            {/* Simulation de rencontre */}
            {!isOwner && compatibility && myAnimals.length > 0 && (
              <button
                onClick={() => setShowSimulation(true)}
                className="w-full py-3 mb-3 border-2 font-bold rounded-xl transition text-sm"
                style={{
                  borderColor: "var(--c-accent, rgba(249,115,22,.4))",
                  color: "var(--c-accent, #f97316)",
                  background: "var(--c-accent, rgba(249,115,22,.05))"
                }}
              >
                🎬 Simuler la rencontre
              </button>
            )}

            
            {/* Dashboard santé */}
            {animal && (
              <HealthDashboard
                animal={animal}
                isOwner={isOwner}
                editUrl={"/animals/" + animal.id + "/edit"}
                lang={typeof lang !== "undefined" ? lang : "fr"}
              />
            )}

            {/* QR Code identité */}
            <QRIdentity
              animalId={animal.id}
              animalName={animal.name}
              species={animal.species}
              breed={animal.breed}
              canton={animal.canton}
              ownerName={profile?.full_name || null}
              lang={typeof lang !== "undefined" ? lang : "fr"}
            />

            {/* Services recommandés — pont vers PawDirectory */}
            <div style={{ marginTop: 16, background: "linear-gradient(135deg, rgba(13,148,136,0.08), rgba(6,95,70,0.04))", border: "1.5px solid rgba(13,148,136,0.15)", borderRadius: 16, padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 20 }}>🏥</span>
                <h3 className="font-bold text-sm text-[var(--c-text)]">Services pour {animal.name}</h3>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <a href={"https://pawdirectory.ch/annuaire?cat=" + encodeURIComponent("Vétérinaire") + (animal.canton ? "&cn=" + animal.canton : "")}
                  target="_blank" rel="noopener"
                  style={{ padding: "10px 12px", background: "rgba(255,255,255,0.6)", borderRadius: 10, textDecoration: "none", textAlign: "center", fontSize: 12, fontWeight: 700, color: "#0D9488", border: "1px solid rgba(13,148,136,0.15)" }}>
                  🏥 Véto
                </a>
                <a href={"https://pawdirectory.ch/annuaire?cat=" + encodeURIComponent("Toiletteur") + (animal.canton ? "&cn=" + animal.canton : "")}
                  target="_blank" rel="noopener"
                  style={{ padding: "10px 12px", background: "rgba(255,255,255,0.6)", borderRadius: 10, textDecoration: "none", textAlign: "center", fontSize: 12, fontWeight: 700, color: "#0D9488", border: "1px solid rgba(13,148,136,0.15)" }}>
                  ✂️ Toiletteur
                </a>
                <a href={"https://pawdirectory.ch/annuaire?cat=" + encodeURIComponent("Garde & Promeneur") + (animal.canton ? "&cn=" + animal.canton : "")}
                  target="_blank" rel="noopener"
                  style={{ padding: "10px 12px", background: "rgba(255,255,255,0.6)", borderRadius: 10, textDecoration: "none", textAlign: "center", fontSize: 12, fontWeight: 700, color: "#0D9488", border: "1px solid rgba(13,148,136,0.15)" }}>
                  🦮 Garde
                </a>
                <a href={"https://pawdirectory.ch/annuaire?cat=" + encodeURIComponent("Dresseur") + (animal.canton ? "&cn=" + animal.canton : "")}
                  target="_blank" rel="noopener"
                  style={{ padding: "10px 12px", background: "rgba(255,255,255,0.6)", borderRadius: 10, textDecoration: "none", textAlign: "center", fontSize: 12, fontWeight: 700, color: "#0D9488", border: "1px solid rgba(13,148,136,0.15)" }}>
                  🎓 Éducateur
                </a>
              </div>
              <a href="https://pawdirectory.ch" target="_blank" rel="noopener"
                style={{ display: "block", marginTop: 10, textAlign: "center", fontSize: 11, color: "#0D9488", fontWeight: 700, textDecoration: "none" }}>
                Voir tous les services sur PawDirectory →
              </a>
            </div>

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

            {/* Simulation modal */}
            {showSimulation && compatibility && myAnimals.length > 0 && (
              <SimulationRencontre
                myAnimal={myAnimals[0]}
                otherAnimal={animal}
                compatibilityScore={compatibility.score}
                onClose={() => setShowSimulation(false)}
                lang={lang}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
