"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useAppContext } from "@/lib/contexts/AppContext";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StoryRow {
  id: string;
  user_id: string;
  animal_id: string;
  media_url: string | null;
  expires_at: string;
  animals: {
    id: string;
    name: string;
    photo_url: string | null;
  } | null;
}

interface UserStoryGroup {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  /** Most recent animal photo as fallback avatar */
  animalPhotoUrl: string | null;
  storyIds: string[];
  latestStoryAt: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StoriesRing() {
  const router = useRouter();
  const { t } = useAppContext();
  const [groups, setGroups] = useState<UserStoryGroup[]>([]);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  // -----------------------------------------------------------------------
  // Load active stories from ALL users, grouped by user
  // -----------------------------------------------------------------------

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      // Fetch all active (non-expired) stories, joined with animal only
      // (profiles FK points to auth.users, not profiles — join separately)
      const { data, error } = await supabase
        .from("stories")
        .select(
          `
          id,
          user_id,
          animal_id,
          media_url,
          expires_at,
          animals ( id, name, photo_url )
        `
        )
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("[StoriesRing] fetch error:", error.message, error);
        setLoaded(true);
        return;
      }

      if (!data || data.length === 0) {
        console.log("[StoriesRing] no active stories found");
        setLoaded(true);
        return;
      }

      const stories = (data as unknown as StoryRow[]) || [];

      // Batch-fetch profiles for all story authors (avoids N+1)
      const userIds = [...new Set(stories.map((s) => s.user_id))];
      const profileMap = new Map<string, { full_name: string; avatar_url: string | null }>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", userIds);
        for (const p of profiles || []) {
          profileMap.set(p.id, { full_name: p.full_name, avatar_url: p.avatar_url });
        }
      }

      // Group by user_id
      const groupMap = new Map<string, UserStoryGroup>();

      for (const story of stories) {
        const profile = profileMap.get(story.user_id);
        const existing = groupMap.get(story.user_id);

        if (existing) {
          existing.storyIds.push(story.id);
          if (story.expires_at > existing.latestStoryAt) {
            existing.latestStoryAt = story.expires_at;
          }
          if (!existing.avatarUrl && story.animals?.photo_url) {
            existing.animalPhotoUrl = story.animals.photo_url;
          }
        } else {
          groupMap.set(story.user_id, {
            userId: story.user_id,
            displayName:
              profile?.full_name ||
              story.animals?.name ||
              "Utilisateur",
            avatarUrl: profile?.avatar_url || null,
            animalPhotoUrl: story.animals?.photo_url || null,
            storyIds: [story.id],
            latestStoryAt: story.expires_at,
          });
        }
      }

      // Sort: users with newest stories first
      const sorted = Array.from(groupMap.values()).sort(
        (a, b) => b.latestStoryAt.localeCompare(a.latestStoryAt)
      );

      setGroups(sorted);

      // Load seen story IDs from localStorage
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

  // -----------------------------------------------------------------------
  // Has this user's stories all been seen?
  // -----------------------------------------------------------------------

  function isGroupSeen(group: UserStoryGroup): boolean {
    return group.storyIds.every((id) => seenIds.has(id));
  }

  // -----------------------------------------------------------------------
  // Handle click: mark stories as seen, navigate to user's stories
  // -----------------------------------------------------------------------

  function handleStoryClick(group: UserStoryGroup) {
    // Mark all of this user's story IDs as seen
    const newSeen = new Set(seenIds);
    for (const id of group.storyIds) {
      newSeen.add(id);
    }
    setSeenIds(newSeen);

    try {
      localStorage.setItem("pawly_stories_seen", JSON.stringify([...newSeen]));
    } catch {
      // Ignore
    }

    router.push(`/stories?user=${group.userId}`);
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  if (!loaded) return null;

  // Always show at least the "+" button, even if no stories exist
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
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
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

        {/* User story rings */}
        {groups.map((group) => {
          const seen = isGroupSeen(group);
          const avatarSrc = group.avatarUrl || group.animalPhotoUrl;

          return (
            <button
              key={group.userId}
              onClick={() => handleStoryClick(group)}
              className="flex flex-col items-center gap-1.5 flex-shrink-0"
              role="listitem"
              aria-label={`Story de ${group.displayName}${seen ? " (vue)" : " (nouvelle)"}`}
            >
              {/* Gradient ring wrapper */}
              <div
                className="relative w-[68px] h-[68px] rounded-full p-[3px]"
                style={{
                  background: seen
                    ? "var(--c-border)"
                    : "linear-gradient(135deg, #FBBF24, #ec4899, #FBBF24)",
                }}
              >
                <div
                  className="w-full h-full rounded-full overflow-hidden"
                  style={{ background: "var(--c-deep)", padding: "2px" }}
                >
                  <div className="w-full h-full rounded-full overflow-hidden">
                    {avatarSrc ? (
                      <Image
                        src={avatarSrc}
                        alt={group.displayName}
                        width={62}
                        height={62}
                        className="object-cover w-full h-full rounded-full"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center text-2xl rounded-full"
                        style={{ background: "var(--c-card)" }}
                      >
                        {group.displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* User display name */}
              <span
                className="text-[10px] font-semibold truncate w-[68px] text-center"
                style={{
                  color: seen ? "var(--c-text-muted)" : "var(--c-text)",
                }}
              >
                {group.displayName}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
