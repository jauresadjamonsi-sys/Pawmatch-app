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
import SuperFlairModal from "@/lib/components/SuperFlairModal";
import FollowButton from "@/lib/components/FollowButton";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";
import PresenceDot from "@/lib/components/PresenceDot";
import { EMOJI_MAP } from "@/lib/constants";
import SpotlightButton from "@/lib/components/SpotlightButton";
import BackButton from "@/lib/components/BackButton";
import { formatAge } from "@/lib/utils";

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
  const [showSuperFlair, setShowSuperFlair] = useState(false);
  const [dmLoading, setDmLoading] = useState(false);
  const [compatibility, setCompatibility] = useState<any>(null);
  const [ownerVerified, setOwnerVerified] = useState(false);
  const [ownerRating, setOwnerRating] = useState<number>(0);
  const [ownerReviewCount, setOwnerReviewCount] = useState<number>(0);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState<number>(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [mutualMatchId, setMutualMatchId] = useState<string | null>(null);
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
      if (result.data) {
        setAnimal(result.data);
        // Fetch owner verified_photo status
        if (result.data.created_by) {
          const { data: ownerProfile } = await supabase
            .from("profiles")
            .select("verified_photo")
            .eq("id", result.data.created_by)
            .single();
          if (ownerProfile?.verified_photo) setOwnerVerified(true);
        }
        // Fetch owner reputation
        if (result.data.created_by) {
          try {
            const revRes = await fetch("/api/reviews?user_id=" + result.data.created_by);
            if (revRes.ok) {
              const revData = await revRes.json();
              setOwnerRating(revData.averageRating || 0);
              setOwnerReviewCount(revData.reviewCount || 0);
            }
          } catch {}
        }
      }
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
        // Check for mutual match (for review button)
        if (myAnimalsList) {
          const myIds = myAnimalsList.map(a => a.id);
          const { data: mutualMatch } = await supabase
            .from("matches")
            .select("id")
            .eq("status", "accepted")
            .or(myIds.map(id => `sender_animal_id.eq.${id},receiver_animal_id.eq.${id}`).join(","))
            .or(`sender_animal_id.eq.${result.data.id},receiver_animal_id.eq.${result.data.id}`)
            .limit(1);
          if (mutualMatch && mutualMatch.length > 0) {
            setMutualMatchId(mutualMatch[0].id);
          }
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

  async function handleDM() {
    if (!animal || !profile || myAnimals.length === 0) return;
    setDmLoading(true);
    try {
      // Check if a conversation already exists between my animal and this animal
      const myAnimalId = myAnimals[0].id;
      const { data: existing } = await supabase
        .from("matches")
        .select("id")
        .or(
          `and(sender_animal_id.eq.${myAnimalId},receiver_animal_id.eq.${animal.id}),and(sender_animal_id.eq.${animal.id},receiver_animal_id.eq.${myAnimalId})`
        )
        .limit(1)
        .single();

      if (existing) {
        window.location.href = `/matches/${existing.id}`;
        return;
      }

      // No existing conversation — create a DM entry
      const { data: dm } = await supabase
        .from("matches")
        .insert({
          sender_animal_id: myAnimalId,
          receiver_animal_id: animal.id,
          sender_user_id: profile.id,
          receiver_user_id: animal.created_by,
          status: "dm",
        })
        .select("id")
        .single();

      if (dm) {
        window.location.href = `/matches/${dm.id}`;
      }
    } catch (err) {
      console.error("DM error:", err);
    } finally {
      setDmLoading(false);
    }
  }

  if (loading) return <p className="text-center py-12 text-[var(--c-text-muted)]">{t.loading}</p>;
  if (!animal) return <p className="text-center py-12 text-[var(--c-text-muted)]">{t.animalNotFound}</p>;

  const cantonName = animal.canton ? CANTONS.find((c) => c.code === animal.canton)?.name || animal.canton : null;
  const traits: string[] = animal.traits || [];
  const isOwner = profile?.id === animal.created_by;

  return (
    <div className="min-h-screen px-4 md:px-6 py-6 pb-28">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <BackButton fallback="/animals" />
          <Link href="/animals" className="text-green-400 hover:underline text-sm">{t.animalBackCatalog}</Link>
          <div className="flex-1" />
          {!isOwner && isAuthenticated && animal.created_by && (
            <div className="flex items-center gap-2">
              <FollowButton userId={animal.created_by} size="sm" />
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
            </div>
          )}
            {compatibility && (
              <div className="mt-6 bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-2xl p-5">
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
                    {compatibility.reasons.map((r: string, i: number) => (
                      <span key={i} className="px-3 py-1 rounded-full text-xs font-bold border" style={{ color: compatibility.color, borderColor: compatibility.color + '40', background: compatibility.bgColor || compatibility.color + '15' }}>
                        ✓ {r}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
        </div>

        <div className="bg-[var(--c-card)] border border-[var(--c-border)] rounded-2xl overflow-hidden">
          {/* ═══ HERO PHOTO — full width, tall, with overlay ═══ */}
          <div className="relative w-full" style={{ aspectRatio: "3/4", maxHeight: "70vh" }}>
            {(() => {
              const photos = [animal.photo_url, ...(animal.photos || [])].filter(Boolean);
              if (photos.length === 0) return (
                <div className="w-full h-full flex items-center justify-center" style={{ background: "var(--c-card)" }}>
                  <span className="text-8xl">{EMOJI_MAP[animal.species] || "🐾"}</span>
                </div>
              );
              return (
                <>
                  <Image src={photos[activePhoto] || photos[0] || ""} alt={animal.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 768px" priority />
                  {/* Photo navigation */}
                  {photos.length > 1 && (
                    <>
                      {/* Top progress bars (Instagram-style) */}
                      <div className="absolute top-3 left-3 right-3 flex gap-1 z-10">
                        {photos.map((_: any, i: number) => (
                          <button key={i} onClick={() => setActivePhoto(i)} className="h-[3px] flex-1 rounded-full transition-all" style={{ background: i === activePhoto ? "#fff" : "rgba(255,255,255,0.35)" }} />
                        ))}
                      </div>
                      {/* Invisible tap zones (left/right halves) */}
                      <button onClick={() => setActivePhoto(p => (p - 1 + photos.length) % photos.length)}
                        className="absolute left-0 top-0 w-1/3 h-full z-10" aria-label="Photo précédente" />
                      <button onClick={() => setActivePhoto(p => (p + 1) % photos.length)}
                        className="absolute right-0 top-0 w-1/3 h-full z-10" aria-label="Photo suivante" />
                    </>
                  )}
                  {/* Bottom gradient overlay for text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none" />
                  {/* Name & key info overlaid on photo */}
                  <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
                    <div className="flex items-end justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h1 className="text-3xl font-black text-white drop-shadow-lg truncate">{animal.name}</h1>
                          {ownerVerified && (
                            <span title="Profil verifie" className="inline-flex items-center ml-1">
                              <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </span>
                          )}
                          {animal.created_by && !isOwner && (
                            <PresenceDot isOnline={ownerOnlineMap.get(animal.created_by) ?? false} size="lg" />
                          )}
                        </div>
                        <p className="text-sm text-white/80 drop-shadow">
                          {EMOJI_MAP[animal.species] || "🐾"} {animal.breed || animal.species}
                          {animal.age_months !== null && <span> &bull; {formatAge(animal.age_months)}</span>}
                          {animal.city && <span> &bull; {animal.city}</span>}
                        </p>
                        {ownerReviewCount > 0 && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <svg key={star} className="w-3.5 h-3.5" viewBox="0 0 20 20" fill={star <= Math.round(ownerRating) ? "#f59e0b" : "rgba(255,255,255,0.25)"}>
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              ))}
                            </div>
                            <span className="text-xs text-white/70 font-medium drop-shadow">
                              {ownerRating}/5 ({ownerReviewCount} avis)
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        {personality && (
                          <a href={"/animals/" + animal.id + "/personality"} className="backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold no-underline" style={{ background: personality.bgColor + "cc", color: personality.color, border: "1px solid " + personality.color + "40" }}>
                            {personality.emoji} {personality.name}
                          </a>
                        )}
                        {hasCoupDeTruffe && (
                          <span className="backdrop-blur-md bg-pink-500/30 text-pink-200 px-3 py-1 rounded-full text-xs font-bold border border-pink-400/30">
                            💥 Coup de Truffe
                          </span>
                        )}
                        {!isOwner && mutualMatchId && !reviewSuccess && (
                          <button
                            onClick={() => setShowReviewModal(true)}
                            className="backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold border transition hover:scale-105"
                            style={{ background: "rgba(34, 197, 94,0.3)", color: "#86efac", borderColor: "rgba(34, 197, 94,0.4)" }}
                          >
                            Laisser un avis
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>

          <div className="p-5 md:p-6">
            {/* ═══ COMPACT INFO GRID ═══ */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <span className="bg-green-500/15 text-green-400 px-3 py-1 rounded-full text-xs font-semibold">
                {animal.status === "disponible" ? t.animalAvailable : animal.status === "en_cours" ? t.animalInProgress : t.animalMatched}
              </span>
              {isOwner && <Link href={"/animals/" + animal.id + "/edit"} className="text-green-400 hover:underline text-xs font-medium">{t.edit}</Link>}
            </div>

            <div className="grid grid-cols-4 gap-2 mb-5">
              {[
                { label: t.animalSpeciesLabel, value: animal.species.charAt(0).toUpperCase() + animal.species.slice(1) },
                { label: t.animalBreedLabel, value: animal.breed || "—" },
                { label: t.animalGenderLabel, value: animal.gender === "male" ? t.animalMale : animal.gender === "femelle" ? t.animalFemale : t.animalUnknown },
                { label: t.animalAgeLabel, value: formatAge(animal.age_months) },
                { label: t.animalWeightLabel, value: animal.weight_kg ? animal.weight_kg + " kg" : "—" },
                { label: t.animalLocationLabel, value: cantonName ? (animal.canton || "") : "—" },
                { label: "Pedigree", value: animal.pedigree || "—" },
                { label: "Puce", value: animal.microchip_id || "—" },
              ].map((item) => (
                <div key={item.label} className="rounded-xl px-3 py-2.5" style={{ background: "var(--c-glass, rgba(255,255,255,0.03))" }}>
                  <p className="text-[10px] text-[var(--c-text-muted)] uppercase tracking-wider">{item.label}</p>
                  <p className="font-bold text-[var(--c-text)] text-sm truncate">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-3 mb-4">
              <span className={"px-3 py-1 rounded-full text-xs font-medium " + (animal.vaccinated ? "bg-green-500/20 text-green-300" : "bg-[var(--c-card)] text-[var(--c-text-muted)]")}>
                {animal.vaccinated ? "✓ " + t.animalVaccinated : t.animalNotVaccinated}
              </span>
              <span className={"px-3 py-1 rounded-full text-xs font-medium " + (animal.sterilized ? "bg-green-500/20 text-green-300" : "bg-[var(--c-card)] text-[var(--c-text-muted)]")}>
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

            {/* Mascot Spotlight */}
            {isOwner && (
              <SpotlightButton
                animalId={animal.id}
                animalName={animal.name}
                hasPhoto={!!animal.photo_url}
              />
            )}

            {/* PawCare Hub — CTA prominent */}
            {isOwner && (
              <Link href={"/animals/" + animal.id + "/care"} style={{
                display: "flex", alignItems: "center", gap: 14, padding: 18,
                background: "linear-gradient(135deg, rgba(239,68,68,0.08), rgba(34, 197, 94,0.06))",
                border: "2px solid rgba(239,68,68,0.2)", borderRadius: 16,
                textDecoration: "none", marginBottom: 16, transition: "all 0.2s",
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14,
                  background: "linear-gradient(135deg, #ef4444, #22C55E)",
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
                    <span key={trait} className="px-3 py-1.5 bg-green-500/10 text-green-300 rounded-full text-xs font-medium">{trait}</span>
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
                  borderColor: "var(--c-accent, rgba(34, 197, 94,.4))",
                  color: "var(--c-accent, #22C55E)",
                  background: "var(--c-accent, rgba(34, 197, 94,.05))"
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

            {/* Partager */}
            <button
              onClick={() => {
                const url = `https://pawlyapp.ch/animals/${animal.id}`;
                const text = `Decouvre ${animal.name} sur Pawly ! ${url}`;
                if (navigator.share) {
                  navigator.share({ title: animal.name + " | Pawly", text, url }).catch(() => {});
                } else {
                  navigator.clipboard.writeText(url);
                }
              }}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: 14, background: "linear-gradient(135deg, rgba(34, 197, 94,0.08), rgba(167,139,250,0.06))",
                border: "1.5px solid rgba(34, 197, 94,0.2)", borderRadius: 14,
                fontWeight: 700, fontSize: 13, color: "#22C55E",
                width: "100%", marginBottom: 12, cursor: "pointer",
              }}
            >
              📤 Partager le profil de {animal.name}
            </button>

            {/* Carte digitale */}
            <Link
              href={"/animals/" + animal.id + "/card"}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: 14, background: "linear-gradient(135deg, rgba(168,85,247,0.1), rgba(34, 197, 94,0.08))",
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
                    <Link href="/matches" className="inline-block mt-3 text-green-400 hover:underline text-sm font-medium">{t.animalViewMatches}</Link>
                  </div>
                ) : !isAuthenticated ? (
                  <Link href="/login" className="block w-full py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition text-center">
                    {t.animalLoginToMatch}
                  </Link>
                ) : myAnimals.length === 0 ? (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center">
                    <p className="text-green-300 font-medium">{t.animalAddFirst}</p>
                    <Link href="/profile/animals/new" className="inline-block mt-2 text-green-400 hover:underline text-sm font-medium">{t.animalAddMine}</Link>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <button onClick={() => setShowMatchModal(true)} className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition text-lg">
                      {t.animalSniff} {animal.name}
                    </button>
                    <button
                      onClick={() => setShowSuperFlair(true)}
                      className="px-5 py-3 rounded-xl font-bold text-sm transition-all"
                      style={{ background: "linear-gradient(135deg, rgba(167,139,250,0.15), rgba(34,197,94,0.1))", border: "1.5px solid rgba(167,139,250,0.3)", color: "#a78bfa" }}
                    >
                      ⚡ Super Flair
                    </button>
                    <button
                      onClick={handleDM}
                      disabled={dmLoading}
                      className="px-5 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
                      style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(12px)", border: "1.5px solid rgba(255,255,255,0.12)", color: "var(--c-text)" }}
                    >
                      {dmLoading ? "..." : "💬 Message"}
                    </button>
                  </div>
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
                        className="w-full flex items-center gap-3 p-3 bg-[var(--c-card)] hover:bg-green-500/10 rounded-xl transition text-left disabled:opacity-50 border border-[var(--c-border)]">
                        <div className="w-12 h-12 rounded-full bg-[var(--c-deep)] border-2 border-green-400 flex items-center justify-center overflow-hidden flex-shrink-0 relative">
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
                    className="w-full py-2 bg-[var(--c-card)] hover:bg-[var(--c-card)] text-[var(--c-text-muted)] font-medium rounded-xl transition text-sm">
                    {t.cancel}
                  </button>
                </div>
              </div>
            )}

            {/* Simulation modal */}
            {showSimulation && compatibility && myAnimals.length > 0 && (
              <SimulationRencontre
                myAnimal={myAnimals[0] as any}
                otherAnimal={animal as any}
                compatibilityScore={compatibility.score}
                onClose={() => setShowSimulation(false)}
                lang={lang}
              />
            )}
          </div>
        </div>

        {/* Super Flair modal */}
        {showSuperFlair && animal.created_by && myAnimals.length > 0 && (
          <SuperFlairModal
            senderAnimalId={myAnimals[0].id}
            receiverAnimalId={animal.id}
            receiverUserId={animal.created_by}
            receiverName={animal.name}
            onClose={() => setShowSuperFlair(false)}
          />
        )}

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

        {/* Review modal */}
        {showReviewModal && animal.created_by && mutualMatchId && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--c-card)] border border-[var(--c-border)] rounded-2xl max-w-md w-full p-6">
              <h3 className="text-lg font-bold text-[var(--c-text)] mb-1">Laisser un avis</h3>
              <p className="text-sm text-[var(--c-text-muted)] mb-5">
                Comment s'est passee votre rencontre avec {animal.name} ?
              </p>

              {reviewError && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">{reviewError}</div>
              )}

              {/* Star selector */}
              <div className="flex items-center justify-center gap-2 mb-5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    className="transition-transform hover:scale-110"
                  >
                    <svg className="w-10 h-10" viewBox="0 0 20 20" fill={star <= reviewRating ? "#f59e0b" : "rgba(255,255,255,0.1)"} stroke={star <= reviewRating ? "#f59e0b" : "rgba(255,255,255,0.2)"} strokeWidth={0.5}>
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </button>
                ))}
              </div>
              <p className="text-center text-xs text-[var(--c-text-muted)] mb-4">
                {reviewRating === 0 ? "Selectionnez une note" : reviewRating + "/5"}
              </p>

              {/* Comment textarea */}
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value.slice(0, 300))}
                placeholder="Partagez votre experience (optionnel)..."
                rows={3}
                className="w-full bg-[var(--c-deep)] border border-[var(--c-border)] rounded-xl p-3 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text-muted)] resize-none focus:outline-none focus:ring-2 focus:ring-green-500/40 mb-1"
              />
              <p className="text-right text-xs text-[var(--c-text-muted)] mb-4">{reviewComment.length}/300</p>

              {/* Submit */}
              <button
                disabled={reviewRating === 0 || reviewSubmitting}
                onClick={async () => {
                  if (reviewRating === 0) return;
                  setReviewSubmitting(true);
                  setReviewError(null);
                  try {
                    const res = await fetch("/api/reviews", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        reviewed_user_id: animal.created_by,
                        match_id: mutualMatchId,
                        rating: reviewRating,
                        comment: reviewComment.trim() || null,
                      }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || "Erreur");
                    setReviewSuccess(true);
                    setShowReviewModal(false);
                    // Refresh rating display
                    setOwnerReviewCount((prev) => prev + 1);
                    setOwnerRating((prev) => {
                      const total = prev * ownerReviewCount + reviewRating;
                      return Math.round((total / (ownerReviewCount + 1)) * 10) / 10;
                    });
                  } catch (err: any) {
                    setReviewError(err.message);
                  }
                  setReviewSubmitting(false);
                }}
                className="w-full py-3 bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition text-sm mb-2"
              >
                {reviewSubmitting ? "Envoi..." : "Envoyer mon avis (+5 PawCoins)"}
              </button>

              <button
                onClick={() => { setShowReviewModal(false); setReviewError(null); }}
                className="w-full py-2 text-[var(--c-text-muted)] font-medium rounded-xl transition text-sm hover:bg-[var(--c-deep)]"
              >
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
