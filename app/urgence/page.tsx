"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import Image from "next/image";
import Link from "next/link";

type Animal = {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  photo_url: string | null;
  canton: string | null;
};

type LostAlert = {
  id: string;
  animal_id: string;
  user_id: string;
  canton: string;
  last_seen_location: string;
  description: string | null;
  status: string;
  created_at: string;
  animal: {
    name: string;
    breed: string | null;
    photo_url: string | null;
    species: string;
  } | null;
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "a l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days}j`;
}

export default function UrgencePage() {
  const supabase = createClient();
  const { profile, loading: authLoading } = useAuth();

  const [animals, setAnimals] = useState<Animal[]>([]);
  const [selectedAnimalId, setSelectedAnimalId] = useState("");
  const [lastSeenLocation, setLastSeenLocation] = useState("");
  const [lastSeenDate, setLastSeenDate] = useState("");
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentAnimal, setSentAnimal] = useState<Animal | null>(null);
  const [error, setError] = useState("");

  const [alerts, setAlerts] = useState<LostAlert[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [userCanton, setUserCanton] = useState<string | null>(null);

  // Fetch user's animals
  useEffect(() => {
    if (!profile) return;
    async function fetchAnimals() {
      const { data } = await supabase
        .from("animals")
        .select("id, name, species, breed, photo_url, canton")
        .eq("created_by", profile!.id)
        .order("created_at", { ascending: false });
      if (data && data.length > 0) {
        setAnimals(data);
        // Detect user canton from first animal
        const canton = data.find((a) => a.canton)?.canton || null;
        setUserCanton(canton);
      }
    }
    fetchAnimals();
  }, [profile]);

  // Auto-fill canton when animal is selected
  const selectedAnimal = animals.find((a) => a.id === selectedAnimalId) || null;
  const alertCanton = selectedAnimal?.canton || userCanton || "";

  // Fetch active alerts in the same canton
  useEffect(() => {
    async function fetchAlerts() {
      setLoadingAlerts(true);
      let query = supabase
        .from("lost_animals")
        .select("id, animal_id, user_id, canton, last_seen_location, description, status, created_at")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(20);

      if (alertCanton) {
        query = query.eq("canton", alertCanton);
      }

      const { data } = await query;

      if (data && data.length > 0) {
        // Fetch animal details for each alert
        const animalIds = [...new Set(data.map((a) => a.animal_id))];
        const { data: animalData } = await supabase
          .from("animals")
          .select("id, name, breed, photo_url, species")
          .in("id", animalIds);

        const animalMap = new Map(
          (animalData || []).map((a) => [a.id, a])
        );

        const enriched = data.map((alert) => ({
          ...alert,
          animal: animalMap.get(alert.animal_id) || null,
        }));

        // Filter out current user's own alerts
        setAlerts(
          profile
            ? enriched.filter((a) => a.user_id !== profile.id)
            : enriched
        );
      } else {
        setAlerts([]);
      }
      setLoadingAlerts(false);
    }
    fetchAlerts();
  }, [alertCanton, sent]);

  // Set default date/time to now
  useEffect(() => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    setLastSeenDate(local.toISOString().slice(0, 16));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!profile) {
      setError("Tu dois etre connecte pour lancer une alerte.");
      return;
    }
    if (!selectedAnimalId) {
      setError("Selectionne ton animal.");
      return;
    }
    if (!lastSeenLocation.trim()) {
      setError("Indique le dernier endroit ou tu l'as vu.");
      return;
    }
    if (!alertCanton) {
      setError("Le canton n'a pas pu etre determine. Verifie le profil de ton animal.");
      return;
    }

    setSending(true);

    const { error: insertError } = await supabase.from("lost_animals").insert({
      animal_id: selectedAnimalId,
      user_id: profile.id,
      canton: alertCanton,
      last_seen_location: lastSeenLocation.trim(),
      description: description.trim() || null,
      status: "active",
    });

    if (insertError) {
      console.error("[Urgence] Insert error:", insertError);
      setError("Erreur lors de l'envoi de l'alerte. Reessaye.");
      setSending(false);
      return;
    }

    setSentAnimal(selectedAnimal);
    setSent(true);
    setSending(false);
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center pb-32" style={{ background: "var(--c-deep)" }}>
        <div className="animate-pulse text-[var(--c-text-muted)]">Chargement...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 pb-32" style={{ background: "var(--c-deep)" }}>
        <p className="text-[var(--c-text-muted)] text-center">
          Connecte-toi pour signaler un animal perdu ou voir les alertes.
        </p>
        <Link href="/login" className="btn-futuristic px-6 py-2.5 rounded-full text-sm font-bold">
          Se connecter
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32" style={{ background: "var(--c-deep)" }}>
     <div className="px-4 pt-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8 animate-slide-up">
        <h1 className="text-3xl font-extrabold gradient-text-animated mb-2">
          {"\u{1F198}"} Animal perdu
        </h1>
        <p className="text-[var(--c-text-muted)] text-sm">
          Alerte tous les utilisateurs de ton canton
        </p>
      </div>

      {/* Success state */}
      {sent && sentAnimal ? (
        <div className="glass-strong rounded-2xl p-6 text-center space-y-4 animate-bounce-in">
          {sentAnimal.photo_url && (
            <div className="relative w-32 h-32 mx-auto rounded-2xl overflow-hidden border-2 border-orange-500/30">
              <Image
                src={sentAnimal.photo_url}
                alt={sentAnimal.name}
                fill
                className="object-cover"
              />
            </div>
          )}
          <div>
            <p className="text-2xl font-bold text-[var(--c-text)]">Alerte envoyee !</p>
            <p className="text-[var(--c-text-muted)] text-sm mt-1">
              Tous les utilisateurs du canton {alertCanton} ont ete alertes pour {sentAnimal.name}.
            </p>
          </div>
          <button
            onClick={() => {
              setSent(false);
              setSentAnimal(null);
              setSelectedAnimalId("");
              setLastSeenLocation("");
              setDescription("");
              setError("");
            }}
            className="btn-futuristic px-6 py-2.5 rounded-full text-sm font-bold"
          >
            Nouvelle alerte
          </button>
        </div>
      ) : (
        /* Form */
        <form onSubmit={handleSubmit} className="glass rounded-2xl p-5 space-y-5">
          {/* Animal selection */}
          <div>
            <label className="block text-sm font-semibold text-[var(--c-text)] mb-2">
              Quel animal as-tu perdu ?
            </label>
            {animals.length === 0 ? (
              <p className="text-sm text-[var(--c-text-muted)]">
                Aucun animal enregistre.{" "}
                <Link href="/animals/new" className="text-orange-500 underline">
                  Ajoute ton animal
                </Link>{" "}
                d'abord.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {animals.map((animal) => (
                  <button
                    key={animal.id}
                    type="button"
                    onClick={() => setSelectedAnimalId(animal.id)}
                    className={
                      "flex items-center gap-3 p-3 rounded-xl border transition-all text-left " +
                      (selectedAnimalId === animal.id
                        ? "border-orange-500 bg-orange-500/10"
                        : "border-[var(--c-border)] hover:border-orange-500/40")
                    }
                  >
                    {animal.photo_url ? (
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                        <Image
                          src={animal.photo_url}
                          alt={animal.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-[var(--c-deep)] flex items-center justify-center flex-shrink-0 text-lg">
                        {animal.species === "chien" ? "\uD83D\uDC36" : animal.species === "chat" ? "\uD83D\uDC31" : "\uD83D\uDC3E"}
                      </div>
                    )}
                    <div className="overflow-hidden">
                      <p className="text-sm font-semibold text-[var(--c-text)] truncate">{animal.name}</p>
                      <p className="text-xs text-[var(--c-text-muted)] truncate">{animal.breed || animal.species}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Canton auto-filled */}
          {alertCanton && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--c-deep)] border border-[var(--c-border)]">
              <span className="text-sm text-[var(--c-text-muted)]">Canton :</span>
              <span className="text-sm font-semibold text-[var(--c-text)]">{alertCanton}</span>
            </div>
          )}

          {/* Last seen location */}
          <div>
            <label className="block text-sm font-semibold text-[var(--c-text)] mb-1.5">
              Dernier endroit vu
            </label>
            <input
              type="text"
              value={lastSeenLocation}
              onChange={(e) => setLastSeenLocation(e.target.value)}
              placeholder="Ex: Parc de Mon-Repos, Lausanne"
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--c-deep)] border border-[var(--c-border)] text-[var(--c-text)] placeholder:text-[var(--c-text-muted)] text-sm focus:outline-none focus:border-orange-500 transition"
            />
          </div>

          {/* Date/time */}
          <div>
            <label className="block text-sm font-semibold text-[var(--c-text)] mb-1.5">
              Quand l'as-tu vu pour la derniere fois ?
            </label>
            <input
              type="datetime-local"
              value={lastSeenDate}
              onChange={(e) => setLastSeenDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--c-deep)] border border-[var(--c-border)] text-[var(--c-text)] text-sm focus:outline-none focus:border-orange-500 transition"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-[var(--c-text)] mb-1.5">
              Circonstances (optionnel)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Il s'est echappe pendant une promenade, portait un collier bleu..."
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--c-deep)] border border-[var(--c-border)] text-[var(--c-text)] placeholder:text-[var(--c-text-muted)] text-sm focus:outline-none focus:border-orange-500 transition resize-none"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={sending || !selectedAnimalId || !lastSeenLocation.trim()}
            className="btn-futuristic w-full py-3 rounded-xl text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? "Envoi en cours..." : "Lancer l'alerte"}
          </button>
        </form>
      )}

      {/* Active alerts in canton */}
      <div className="mt-10">
        <h2 className="text-lg font-bold text-[var(--c-text)] mb-4">
          {alertCanton ? `Alertes actives dans ${alertCanton}` : "Alertes actives"}
        </h2>

        {loadingAlerts ? (
          <div className="text-center py-8">
            <div className="animate-pulse text-[var(--c-text-muted)] text-sm">Chargement des alertes...</div>
          </div>
        ) : alerts.length === 0 ? (
          <div className="glass rounded-2xl p-6 text-center">
            <p className="text-[var(--c-text-muted)] text-sm">
              {alertCanton
                ? `Aucune alerte active dans le canton ${alertCanton}. Bonne nouvelle !`
                : "Aucune alerte active pour le moment."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="glass rounded-2xl p-4 flex items-start gap-4"
              >
                {/* Animal photo */}
                <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border border-red-500/30">
                  {alert.animal?.photo_url ? (
                    <Image
                      src={alert.animal.photo_url}
                      alt={alert.animal?.name || "Animal perdu"}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-[var(--c-deep)] flex items-center justify-center text-2xl">
                      {"\uD83D\uDC3E"}
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-[var(--c-text)] truncate">
                      {alert.animal?.name || "Animal"}
                    </span>
                    {alert.animal?.breed && (
                      <span className="text-xs text-[var(--c-text-muted)]">
                        {alert.animal.breed}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--c-text-muted)] mb-1">
                    {"\uD83D\uDCCD"} {alert.last_seen_location}
                  </p>
                  {alert.description && (
                    <p className="text-xs text-[var(--c-text-muted)] line-clamp-2 mb-2">
                      {alert.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[var(--c-text-muted)]">
                      {timeAgo(alert.created_at)}
                    </span>
                    <Link
                      href={`/matches/${alert.user_id}`}
                      className="text-xs font-bold text-orange-500 hover:text-orange-400 transition px-3 py-1.5 rounded-full border border-orange-500/30 hover:bg-orange-500/10"
                    >
                      Je l'ai vu !
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
     </div>
    </div>
  );
}
