"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { getAnimalById, AnimalRow } from "@/lib/services/animals";
import { sendMatchWithLimit } from "@/lib/services/matches";
import { CANTONS } from "@/lib/cantons";
import Image from "next/image";
import { computeCompatibility } from "@/lib/services/compatibility";
import { detectPersonality } from "@/lib/services/personality";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAppContext } from "@/lib/contexts/AppContext";
import { SimulationRencontre } from "@/lib/components/SimulationRencontre";
import { HealthDashboard } from "@/lib/components/HealthDashboard";
import { HealthScore } from "@/lib/components/HealthScore";
import { DailyTip } from "@/lib/components/DailyTip";
import { SmartServices } from "@/lib/components/SmartServices";
import { QRIdentity } from "@/lib/components/QRIdentity";
import { AIRecommendations } from "@/lib/components/AIRecommendations";
import { MoodTracker } from "@/lib/components/MoodTracker";
import { ActivityAlert } from "@/lib/components/ActivityAlert";
import BlockReportModal from "@/lib/components/BlockReportModal";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";
import PresenceDot from "@/lib/components/PresenceDot";
import { EMOJI_MAP } from "@/lib/constants";

export default function AnimalDetailPage() {
  const [animal, setAnimal] = useState<AnimalRow | null>(null);
  const [myAnimals, setMyAnimals] = useState<AnimalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchSending, setMatchSending] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [matchSuccess, setMatchSuccess] = useState(false);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [showSimulation, setShowSimulation] = useState(false);
  const [activePhoto, setActivePhoto] = useState(0);
  const [hasCoupDeTruffe, setHasCoupDeTruffe] = useState(false);
  const [showBlockReport, setShowBlockReport] = useState(false);
  const [compatibility, setCompatibility] = useState<any>(null);
  const personality = animal ? detectPersonality(animal.traits || []) : null;
  const { t, lang } = useAppContext();
  const params = useParams();
  const supabase = createClient();
  const { profile, isAuthenticated } = useAuth();

  // Presence for the animal owner
  const ownerPresenceIds = animal?.created_by ? [animal.created_by] : [];
  const { onlineMap: ownerOnlineMap } = useOnlineStatus(ownerPresenceIds);

  useEffect(() => {
    if (animal) document.title = animal.name + " — Pawly";
  }, [animal]);

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
    if (!months) return t.animalUnknown;
    if (months < 12) return months + " " + t.animalMonths;
    const y = Math.floor(months / 12);
    const r = months % 12;
    return y + " " + (y > 1 ? t.animalYears : t.animalYear) + (r > 0 ? " " + r + " " + t.animalMonths : "");
  }

  if (loading) return <p className="text-center py-12 text-[var(--c-text-muted)]">{t.loading}</p>;
  if (!animal) return <p className="text-center py-12 text-[var(--c-text-muted)]">{t.animalNotFound}</p>;

  const cantonName = animal.canton ? CANTONS.find((c) => c.code === animal.canton)?.name || animal.canton : null;
  const traits: string[] = animal.traits || [];
  const isOwner = profile?.id === animal.created_by;

  return (
    <div className="min-h-screen px-6 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/animals" className="text-orange-400 hover:underline text-sm">{t.animalBackCatalog}</Link>
          <div className="flex-1" />
          {!isOwner && isAuthenticated && animal.created_by && (
            <button
              onClick={() => setShowBlockReport(true)}
              className="p-2 rounded-full hover:bg-red-500/10 transition"
              title="Signaler ou bloquer"
              style={{ color: "var(--c-text-muted, #9b93b8)" }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
              </svg>
            </button>
          )}
          {/* compatibility moved */}
              {false && (
                <div className="mt-6 bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🤖</span>
                      <h3 className="font-bold text-[var(--c-text)] text-sm">{t.animalWhyMatch}</h3>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black" style={{ color: compatibility.color }}>{compatibility.score}%</span>
                      <p className="text-[10px] text-[var(--c-text-muted)]">{compatibility.label}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 mb-4">
                    {[
                      { label: t.animalSpeciesLabel, score: Math.min(100, (compatibility.score * 1.2)) },
                      { label: t.animalCharacter, score: Math.min(100, (compatibility.score * 0.9)) },
                      { label: t.animalLocationLabel, score: Math.min(100, (compatibility.score * 1.1)) },
                      { label: t.animalAgeLabel, score: Math.min(100, (compatibility.score * 0.8)) },
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

              {isOwner && <Link href={"/animals/" + animal.id + "/edit"} className="text-orange-400 hover:underline text-sm">{t.edit}</Link>}
            {compatibility && (
              <div className="mt-6 bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🤖</span>
                    <h3 className="font-bold text-[var(--c-text)] text-sm">{t.animalWhyMatch}</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black" style={{ color: compatibility.color }}>{compatibility.score}%</span>
                    <p className="text-[10px] text-[var(--c-text-muted)]">{compatibility.label}</p>
                  </div>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:16 }}>
                  {[
                    { label: t.animalSpeciesLabel, score: Math.min(100, (compatibility.score * 1.2)) },
                    { label: t.animalCharacter, score: Math.min(100, (compatibility.score * 0.9)) },
                    { label: t.animalLocationLabel, score: Math.min(100, (compatibility.score * 1.1)) },
                    { label: t.animalAgeLabel, score: Math.min(100, (compatibility.score * 0.8)) },
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

        <div className="bg-white/5 border border-[var(--c-border)] rounded-2xl overflow-hidden">
          <div className="h-72 bg-[var(--c-card)] flex items-center justify-center overflow-hidden">
            {(() => {
              const photos = [animal.photo_url, ...(animal.photos || [])].filter(Boolean);
              if (photos.length === 0) return <span className="text-8xl">{EMOJI_MAP[animal.species] || "🐾"}</span>;
              return (
                <div className="relative w-full h-full">
                  <Image src={photos[activePhoto] || photos[0]} alt={animal.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 600px" />
                  {photos.length > 1 && (
                    <>
                      <button onClick={() => setActivePhoto(p => (p - 1 + photos.length) % photos.length)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center text-sm">‹</button>
                      <button onClick={() => setActivePhoto(p => (p + 1) % photos.length)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center text-sm">›</button>
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {photos.map((_: any, i: number) => (
                          <button key={i} onClick={() => setActivePhoto(i)}
                            className={"w-2 h-2 rounded-full transition-all " + (i === activePhoto ? "bg-white scale-125" : "bg-white/50")} />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })()}
          </div>

          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold text-[var(--c-text)]">{animal.name}</h1>
                {animal.created_by && !isOwner && (
                  <PresenceDot isOnline={ownerOnlineMap.get(animal.created_by) ?? false} size="lg" />
                )}
              </div>
              {personality && <a href={"/animals/" + animal.id + "/personality"} style={{ display:"inline-block", marginTop:8, background: personality.bgColor, color: personality.color, border: "1px solid " + personality.color + "40", fontSize: 12, fontWeight: 800, padding: "4px 14px", borderRadius: 50, textDecoration: "none" }}>{personality.emoji} {personality.name}</a>}
              {hasCoupDeTruffe && (
                <span className="bg-pink-500/20 text-pink-400 px-3 py-1.5 rounded-full text-xs font-bold border border-pink-500/30 animate-pulse">
                  💥 Coup de Truffe
                </span>
              )}
              <span className="bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-sm font-medium">
                {animal.status === "disponible" ? t.animalAvailable : animal.status === "en_cours" ? t.animalInProgress : t.animalMatched}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { label: t.animalSpeciesLabel, value: animal.species.charAt(0).toUpperCase() + animal.species.slice(1) },
                { label: t.animalBreedLabel, value: animal.breed || t.animalNotSpecifiedF },
                { label: t.animalAgeLabel, value: formatAge(animal.age_months) },
                { label: t.animalGenderLabel, value: animal.gender === "male" ? t.animalMale : animal.gender === "femelle" ? t.animalFemale : t.animalUnknown },
                { label: t.animalWeightLabel, value: animal.weight_kg ? animal.weight_kg + " kg" : t.animalNotSpecified },
                { label: t.animalLocationLabel, value: [animal.city, cantonName ? cantonName + " (" + animal.canton + ")" : ""].filter(Boolean).join(", ") || t.animalNotSpecifiedF },
              ].map((item) => (
                <div key={item.label} className="bg-white/5 rounded-xl p-4">
                  <p className="text-xs text-[var(--c-text-muted)]">{item.label}</p>
                  <p className="font-semibold text-[var(--c-text)] text-sm">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-3 mb-4">
              <span className={"px-3 py-1 rounded-full text-xs font-medium " + (animal.vaccinated ? "bg-green-500/20 text-green-300" : "bg-white/5 text-[var(--c-text-muted)]")}>
                {animal.vaccinated ? "✓ " + t.animalVaccinated : t.animalNotVaccinated}
              </span>
              <span className={"px-3 py-1 rounded-full text-xs font-medium " + (animal.sterilized ? "bg-green-500/20 text-green-300" : "bg-white/5 text-[var(--c-text-muted)]")}>
                {animal.sterilized ? "✓ " + t.animalSterilized : t.animalNotSterilized}
              </span>
            </div>

            {/* Alimentation */}
            {(animal.diet_type || animal.food_brand || animal.treats || animal.allergies) && (
              <div className="bg-teal-500/5 border border-teal-500/15 rounded-2xl p-4 mb-6">
                <h3 className="text-sm font-bold text-teal-300 mb-3 flex items-center gap-2">
                  {"🍖 " + t.dietTitle}
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {animal.diet_type && (
                    <div>
                      <span className="text-[var(--c-text-muted)] text-xs">{t.animalRegime}</span>
                      <p className="text-[var(--c-text)] font-medium capitalize">{animal.diet_type.replace("_", " ")}</p>
                    </div>
                  )}
                  {animal.food_brand && (
                    <div>
                      <span className="text-[var(--c-text-muted)] text-xs">{t.animalBrandLabel}</span>
                      <p className="text-[var(--c-text)] font-medium">{animal.food_brand}</p>
                    </div>
                  )}
                  {animal.treats && (
                    <div>
                      <span className="text-[var(--c-text-muted)] text-xs">{t.animalTreatsLabel}</span>
                      <p className="text-[var(--c-text)] font-medium">{animal.treats}</p>
                    </div>
                  )}
                  {animal.allergies && (
                    <div>
                      <span className="text-[var(--c-text-muted)] text-xs">{t.animalAllergiesLabel}</span>
                      <p className="text-red-300 font-medium">{animal.allergies}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PawCare Hub — CTA prominent */}
            {isOwner && (
              <Link href={"/animals/" + animal.id + "/care"} style={{
                display: "flex", alignItems: "center", gap: 14, padding: 18,
                background: "linear-gradient(135deg, rgba(239,68,68,0.08), rgba(249,115,22,0.06))",
                border: "2px solid rgba(239,68,68,0.2)", borderRadius: 16,
                textDecoration: "none", marginBottom: 16, transition: "all 0.2s",
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14,
                  background: "linear-gradient(135deg, #ef4444, #f97316)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 22, flexShrink: 0,
                }}>
                  ❤️‍🩹
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: "var(--c-text, #fff)" }}>
                    PawCare Hub
                  </div>
                  <div style={{ fontSize: 12, color: "var(--c-text-muted, #9ca3af)", marginTop: 2 }}>
                    {t.animalPawCareDesc}
                  </div>
                </div>
                <span style={{ fontSize: 18, color: "var(--c-text-muted, #9ca3af)" }}>→</span>
              </Link>
            )}

            {traits.length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-[var(--c-text-muted)] uppercase tracking-wider mb-3">{t.animalCharacter}</h2>
                <div className="flex flex-wrap gap-2">
                  {traits.map((trait) => (
                    <span key={trait} className="px-3 py-1.5 bg-orange-500/10 text-orange-300 rounded-full text-xs font-medium">{trait}</span>
                  ))}
                </div>
              </div>
            )}

            {animal.description && (
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-[var(--c-text-muted)] uppercase tracking-wider mb-2">{t.animalDescription}</h2>
                <p className="text-[var(--c-text-muted)] leading-relaxed text-sm">{animal.description}</p>
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
                {t.animalSimulate}
              </button>
            )}

            
            {/* Alertes intelligentes */}
            {animal && isOwner && profile && (
              <ActivityAlert
                animalId={animal.id}
                animalName={animal.name}
                species={animal.species}
                userId={profile.id}
              />
            )}

            {/* Mood Tracker */}
            {animal && isOwner && profile && (
              <MoodTracker
                animalId={animal.id}
                animalName={animal.name}
                userId={profile.id}
                isOwner={isOwner}
              />
            )}

            {/* Conseil quotidien */}
            {animal && (
              <DailyTip animal={animal} />
            )}

            {/* Services intelligents */}
            {animal && (
              <SmartServices animal={animal} />
            )}

            {/* Recommandations IA */}
            {animal && (
              <AIRecommendations
                animal={animal}
                lang={typeof lang !== "undefined" ? lang : "fr"}
              />
            )}

            {/* Score santé instantané */}
            {animal && (
              <HealthScore animal={animal} />
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

            {/* Carte digitale */}
            <Link
              href={"/animals/" + animal.id + "/card"}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: 14, background: "linear-gradient(135deg, rgba(168,85,247,0.1), rgba(249,115,22,0.08))",
                border: "1.5px solid rgba(168,85,247,0.25)", borderRadius: 14,
                fontWeight: 700, fontSize: 13, color: "#a78bfa",
                textDecoration: "none", marginBottom: 12,
              }}
            >
              {"\u{1FAAA}"} {t.cardTitle || "Carte digitale"}
            </Link>

            {/* Carte */}
            <a href="/carte" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, background: "linear-gradient(135deg, #3B82F6, #2563EB)", color: "#fff", borderRadius: 14, fontWeight: 700, fontSize: 13, textDecoration: "none", marginBottom: 16, boxShadow: "0 2px 8px rgba(59,130,246,0.3)" }}>
              {t.animalMapFriends}
            </a>

            {/* Services recommandés — pont vers PawDirectory */}
            <div style={{ marginTop: 16, background: "linear-gradient(135deg, rgba(13,148,136,0.08), rgba(6,95,70,0.04))", border: "1.5px solid rgba(13,148,136,0.15)", borderRadius: 16, padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 20 }}>🏥</span>
                <h3 className="font-bold text-sm text-[var(--c-text)]">{t.animalServicesFor} {animal.name}</h3>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <a href={"https://pawdirectory.ch/annuaire?cat=" + encodeURIComponent("Vétérinaire") + (animal.canton ? "&cn=" + animal.canton : "")}
                  target="_blank" rel="noopener"
                  style={{ padding: "10px 12px", background: "rgba(255,255,255,0.6)", borderRadius: 10, textDecoration: "none", textAlign: "center", fontSize: 12, fontWeight: 700, color: "#0D9488", border: "1px solid rgba(13,148,136,0.15)" }}>
                  {t.animalVet}
                </a>
                <a href={"https://pawdirectory.ch/annuaire?cat=" + encodeURIComponent("Toiletteur") + (animal.canton ? "&cn=" + animal.canton : "")}
                  target="_blank" rel="noopener"
                  style={{ padding: "10px 12px", background: "rgba(255,255,255,0.6)", borderRadius: 10, textDecoration: "none", textAlign: "center", fontSize: 12, fontWeight: 700, color: "#0D9488", border: "1px solid rgba(13,148,136,0.15)" }}>
                  {t.animalGroomer}
                </a>
                <a href={"https://pawdirectory.ch/annuaire?cat=" + encodeURIComponent("Garde & Promeneur") + (animal.canton ? "&cn=" + animal.canton : "")}
                  target="_blank" rel="noopener"
                  style={{ padding: "10px 12px", background: "rgba(255,255,255,0.6)", borderRadius: 10, textDecoration: "none", textAlign: "center", fontSize: 12, fontWeight: 700, color: "#0D9488", border: "1px solid rgba(13,148,136,0.15)" }}>
                  {t.animalSitter}
                </a>
                <a href={"https://pawdirectory.ch/annuaire?cat=" + encodeURIComponent("Dresseur") + (animal.canton ? "&cn=" + animal.canton : "")}
                  target="_blank" rel="noopener"
                  style={{ padding: "10px 12px", background: "rgba(255,255,255,0.6)", borderRadius: 10, textDecoration: "none", textAlign: "center", fontSize: 12, fontWeight: 700, color: "#0D9488", border: "1px solid rgba(13,148,136,0.15)" }}>
                  {t.animalTrainer}
                </a>
              </div>
              <a href="https://pawdirectory.ch" target="_blank" rel="noopener"
                style={{ display: "block", marginTop: 10, textAlign: "center", fontSize: 11, color: "#0D9488", fontWeight: 700, textDecoration: "none" }}>
                {t.animalAllServices}
              </a>
            </div>

            {/* Match section */}
            {!isOwner && (
              <>
                {matchSuccess ? (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center">
                    <p className="text-green-300 font-semibold">{t.animalMatchSent}</p>
                    <p className="text-green-400/70 text-sm mt-1">{t.animalMatchNotify}</p>
                    <Link href="/matches" className="inline-block mt-3 text-orange-400 hover:underline text-sm font-medium">{t.animalViewMatches}</Link>
                  </div>
                ) : !isAuthenticated ? (
                  <Link href="/login" className="block w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition text-center">
                    {t.animalLoginToMatch}
                  </Link>
                ) : myAnimals.length === 0 ? (
                  <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 text-center">
                    <p className="text-orange-300 font-medium">{t.animalAddFirst}</p>
                    <Link href="/profile/animals/new" className="inline-block mt-2 text-orange-400 hover:underline text-sm font-medium">{t.animalAddMine}</Link>
                  </div>
                ) : (
                  <button onClick={() => setShowMatchModal(true)} className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition text-lg">
                    {t.animalSniff} {animal.name}
                  </button>
                )}
              </>
            )}

            {/* Modal */}
            {showMatchModal && (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                <div className="bg-[var(--c-card)] border border-[var(--c-border)] rounded-2xl max-w-md w-full p-6">
                  <h3 className="text-lg font-bold text-[var(--c-text)] mb-2">{t.animalWithWhich}</h3>
                  <p className="text-sm text-[var(--c-text-muted)] mb-4">{t.animalChooseWhich} {animal.name}</p>

                  {matchError && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">{matchError}</div>}

                  <div className="space-y-2 mb-4">
                    {myAnimals.map((myAnimal) => (
                      <button key={myAnimal.id} onClick={() => handleMatch(myAnimal.id)} disabled={matchSending}
                        className="w-full flex items-center gap-3 p-3 bg-white/5 hover:bg-orange-500/10 rounded-xl transition text-left disabled:opacity-50 border border-[var(--c-border)]">
                        <div className="w-12 h-12 rounded-full bg-[var(--c-deep)] border-2 border-orange-400 flex items-center justify-center overflow-hidden flex-shrink-0 relative">
                          {myAnimal.photo_url ? (
                            <Image src={myAnimal.photo_url} alt={myAnimal.name} fill className="object-cover" sizes="(max-width: 768px) 48px, 48px" />
                          ) : (
                            <span className="text-xl">{EMOJI_MAP[myAnimal.species] || "🐾"}</span>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-[var(--c-text)] text-sm">{myAnimal.name}</p>
                          <p className="text-xs text-[var(--c-text-muted)]">{myAnimal.species} {myAnimal.breed ? "· " + myAnimal.breed : ""}</p>
                        </div>
                      </button>
                    ))}
                  </div>

                  <button onClick={() => { setShowMatchModal(false); setMatchError(null); }}
                    className="w-full py-2 bg-white/10 hover:bg-white/20 text-[var(--c-text-muted)] font-medium rounded-xl transition text-sm">
                    {t.cancel}
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

        {/* Block/Report modal */}
        {showBlockReport && animal.created_by && (
          <BlockReportModal
            targetUserId={animal.created_by}
            targetAnimalId={animal.id}
            targetName={animal.name}
            onClose={() => setShowBlockReport(false)}
            onBlocked={() => { window.location.href = "/animals"; }}
          />
        )}
      </div>
    </div>
  );
}
