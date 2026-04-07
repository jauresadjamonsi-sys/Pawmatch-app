"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useAppContext } from "@/lib/contexts/AppContext";
import { EMOJI_MAP } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AnimalSpecies = "chien" | "chat" | "lapin" | "oiseau" | "rongeur" | "autre";

interface AnimalRow {
  id: string;
  name: string;
  species: AnimalSpecies;
  photo_url: string | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StoriesRing() {
  const router = useRouter();
  const { t } = useAppContext();
  const [animals, setAnimals] = useState<AnimalRow[]>([]);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoaded(true);
        return;
      }

      const { data } = await supabase
        .from("animals")
        .select("id, name, species, photo_url")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });

      setAnimals((data as AnimalRow[] | null) || []);

      // Load seen stories from localStorage
      try {
        const raw = localStorage.getItem("pawly_stories_seen");
        if (raw) {
          const parsed: string[] = JSON.parse(raw);
          setSeenIds(new Set(parsed));
        }
      } catch {
        // Ignore
      }

      setLoaded(true);
    }

    load();
  }, []);

  function handleStoryClick(animalId: string) {
    // Mark as seen
    const newSeen = new Set(seenIds);
    newSeen.add(animalId);
    setSeenIds(newSeen);
    try {
      localStorage.setItem("pawly_stories_seen", JSON.stringify([...newSeen]));
    } catch {
      // Ignore
    }

    router.push("/stories");
  }

  if (!loaded || animals.length === 0) return null;

  return (
    <section className="mb-5" aria-label={t.petStoriesTitle || "Stories"}>
      <h2
        className="text-sm font-bold uppercase tracking-wider mb-3 px-1"
        style={{ color: "var(--c-text-muted)" }}
      >
        {t.petStoriesTitle || "Stories"}
      </h2>

      <div
        className="flex gap-4 overflow-x-auto -mx-4 px-4 pb-2"
        role="list"
        aria-label={t.petStoriesTitle || "Stories"}
        style={{ scrollbarWidth: "none" }}
      >
        {/* Create story button */}
        <button
          onClick={() => router.push("/stories/create")}
          className="flex flex-col items-center gap-1.5 flex-shrink-0"
          role="listitem"
          aria-label={t.storiesNewStory || "Nouvelle story"}
        >
          <div
            className="relative w-[68px] h-[68px] rounded-full flex items-center justify-center"
            style={{
              background: "var(--c-card)",
              border: "2px dashed var(--c-border)",
            }}
          >
            <svg
              width="24" height="24" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
              style={{ color: "var(--c-accent)" }}
              aria-hidden="true"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </div>
          <span
            className="text-[10px] font-semibold truncate w-[68px] text-center"
            style={{ color: "var(--c-text-muted)" }}
          >
            {t.storiesNewStory || "Nouvelle"}
          </span>
        </button>

        {/* Animal story rings */}
        {animals.map((animal) => {
          const isSeen = seenIds.has(animal.id);
          const emoji = EMOJI_MAP[animal.species] || "\uD83D\uDC3E";

          return (
            <button
              key={animal.id}
              onClick={() => handleStoryClick(animal.id)}
              className="flex flex-col items-center gap-1.5 flex-shrink-0"
              role="listitem"
              aria-label={`Story de ${animal.name}${isSeen ? " (vue)" : " (nouvelle)"}`}
            >
              {/* Gradient ring wrapper */}
              <div
                className="relative w-[68px] h-[68px] rounded-full p-[3px]"
                style={{
                  background: isSeen
                    ? "var(--c-border)"
                    : "linear-gradient(135deg, #f97316, #ec4899, #f97316)",
                }}
              >
                <div
                  className="w-full h-full rounded-full overflow-hidden"
                  style={{ background: "var(--c-deep)", padding: "2px" }}
                >
                  <div className="w-full h-full rounded-full overflow-hidden">
                    {animal.photo_url ? (
                      <Image
                        src={animal.photo_url}
                        alt={animal.name}
                        width={62}
                        height={62}
                        className="object-cover w-full h-full rounded-full"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center text-2xl rounded-full"
                        style={{ background: "var(--c-card)" }}
                      >
                        {emoji}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Pet name */}
              <span
                className="text-[10px] font-semibold truncate w-[68px] text-center"
                style={{ color: isSeen ? "var(--c-text-muted)" : "var(--c-text)" }}
              >
                {animal.name}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
