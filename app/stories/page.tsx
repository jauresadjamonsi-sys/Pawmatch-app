"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useAppContext } from "@/lib/contexts/AppContext";
import { EMOJI_MAP } from "@/lib/constants";
import type { StoryRow, ViewableStory, UserStoryGroup } from "@/lib/types";

/** Stories page requires the stories array to be present. */
type UserGroup = UserStoryGroup & { stories: ViewableStory[] };

// ---------------------------------------------------------------------------
// Gradients for text-only / template stories
// ---------------------------------------------------------------------------

const FALLBACK_GRADIENTS = [
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
  "linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)",
  "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const IMAGE_DURATION = 5000; // 5s for images / text-only
const PROGRESS_TICK = 50;

function isVideoUrl(url: string | null): boolean {
  if (!url) return false;
  const lower = url.toLowerCase().split("?")[0];
  return (
    lower.endsWith(".mp4") ||
    lower.endsWith(".webm") ||
    lower.endsWith(".mov") ||
    lower.endsWith(".ogg")
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "maintenant";
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}j`;
}

function gradientForStory(story: StoryRow, index: number): string {
  if (story.bg_gradient) return story.bg_gradient;
  return FALLBACK_GRADIENTS[index % FALLBACK_GRADIENTS.length];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StoriesPage() {
  const router = useRouter();
  const { t } = useAppContext();

  // Data state
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Navigation state
  const [groupIdx, setGroupIdx] = useState(0);
  const [storyIdx, setStoryIdx] = useState(0);

  // Progress bar
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(Date.now());

  // Video ref
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Pause state (long-press)
  const isPausedRef = useRef(false);
  const [isPaused, setIsPaused] = useState(false);

  // Touch tracking
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  // Text animation
  const [textVisible, setTextVisible] = useState(false);

  // Track which stories we already recorded a view for
  const viewedRef = useRef<Set<string>>(new Set());

  // Edit caption state
  const [isEditing, setIsEditing] = useState(false);
  const [editCaption, setEditCaption] = useState("");

  // Viewers modal state
  const [showViewers, setShowViewers] = useState(false);
  const [viewers, setViewers] = useState<
    { id: string; full_name: string | null; avatar_url: string | null; viewed_at: string }[]
  >([]);
  const [loadingViewers, setLoadingViewers] = useState(false);

  // -----------------------------------------------------------------------
  // Fetch stories
  // -----------------------------------------------------------------------

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/feed");
        return;
      }
      setCurrentUserId(user.id);

      // Fetch stories with animal join only (profiles FK → auth.users, not profiles)
      const { data, error } = await supabase
        .from("stories")
        .select(
          "*, animals(id, name, species, photo_url)"
        )
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("[StoriesPage] fetch error:", error.message, error);
        setGroups([]);
        setLoading(false);
        return;
      }

      if (!data || data.length === 0) {
        console.log("[StoriesPage] no active stories found (all expired or none created)");
        setGroups([]);
        setLoading(false);
        return;
      }

      console.log("[StoriesPage] fetched", data.length, "active stories");

      // Batch-fetch profiles for all story authors
      const userIds = [...new Set((data as StoryRow[]).map((r) => r.user_id))];
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

      // Group stories by user_id, preserving order
      const groupMap = new Map<string, StoryRow[]>();
      for (const row of data as StoryRow[]) {
        const existing = groupMap.get(row.user_id) || [];
        existing.push(row);
        groupMap.set(row.user_id, existing);
      }

      const built: UserGroup[] = [];
      for (const [userId, rows] of groupMap) {
        // Reverse so oldest story in a group is first (chronological within group)
        const ordered = [...rows].reverse();
        const firstRow = ordered[0];
        const profile = profileMap.get(userId);

        const displayName =
          profile?.full_name ||
          firstRow.animals?.name ||
          "Utilisateur";
        const avatarUrl =
          profile?.avatar_url ||
          firstRow.animals?.photo_url ||
          null;

        built.push({
          userId,
          displayName,
          avatarUrl,
          stories: ordered.map((r) => {
            const effectiveUrl = r.media_url || r.image_url || null;
            return {
              row: r,
              mediaType: effectiveUrl
                ? isVideoUrl(effectiveUrl)
                  ? "video"
                  : "image"
                : "none",
            };
          }),
        });
      }

      setGroups(built);
      setLoading(false);
    }

    load();
  }, [router]);

  // -----------------------------------------------------------------------
  // Current story helpers
  // -----------------------------------------------------------------------

  const group = groups[groupIdx] as UserGroup | undefined;
  const story = group?.stories[storyIdx] as ViewableStory | undefined;
  const totalStoriesInGroup = group?.stories.length ?? 0;

  // -----------------------------------------------------------------------
  // View tracking
  // -----------------------------------------------------------------------

  const trackView = useCallback(
    async (storyRow: StoryRow) => {
      if (!currentUserId) return;
      if (viewedRef.current.has(storyRow.id)) return;
      viewedRef.current.add(storyRow.id);

      // Use server-side API to bypass RLS (fire-and-forget)
      fetch("/api/stories/view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ story_id: storyRow.id }),
      }).catch(() => {});
    },
    [currentUserId]
  );

  // Track view whenever story changes
  useEffect(() => {
    if (story) {
      trackView(story.row);
    }
  }, [groupIdx, storyIdx, story, trackView]);

  // Reset edit/viewers state when story changes
  useEffect(() => {
    setIsEditing(false);
    setShowViewers(false);
    setViewers([]);
  }, [groupIdx, storyIdx]);

  // -----------------------------------------------------------------------
  // Navigation
  // -----------------------------------------------------------------------

  const close = useCallback(() => {
    router.push("/feed");
  }, [router]);

  // -----------------------------------------------------------------------
  // Delete story
  // -----------------------------------------------------------------------

  const handleDeleteStory = useCallback(
    async (storyRow: StoryRow) => {
      if (!confirm("Supprimer cette story ?")) return;

      const supabase = createClient();

      // Delete media from storage if present
      const mediaUrl = storyRow.media_url || storyRow.image_url;
      if (mediaUrl) {
        try {
          const url = new URL(mediaUrl);
          const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/stories\/(.+)/);
          if (pathMatch) {
            await supabase.storage.from("stories").remove([decodeURIComponent(pathMatch[1])]);
          }
        } catch {
          // Ignore URL parsing errors
        }
      }

      // Delete the story row
      await supabase.from("stories").delete().eq("id", storyRow.id);

      // Update local state: remove story from current group
      setGroups((prev) => {
        const updated = prev.map((g) => ({
          ...g,
          stories: g.stories.filter((s) => s.row.id !== storyRow.id),
        }));
        return updated.filter((g) => g.stories.length > 0);
      });

      // Navigate: if more stories in group, stay; otherwise next group or close
      if (group && group.stories.length > 1) {
        if (storyIdx >= group.stories.length - 1) {
          setStoryIdx(Math.max(0, storyIdx - 1));
        }
      } else if (groups.length > 1) {
        if (groupIdx >= groups.length - 1) {
          setGroupIdx(Math.max(0, groupIdx - 1));
        }
        setStoryIdx(0);
      } else {
        close();
      }
    },
    [group, groups.length, groupIdx, storyIdx, close]
  );

  // -----------------------------------------------------------------------
  // Edit caption
  // -----------------------------------------------------------------------

  const handleSaveCaption = useCallback(
    async (storyRow: StoryRow) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("stories")
        .update({ caption: editCaption })
        .eq("id", storyRow.id);

      if (!error) {
        // Update local state
        setGroups((prev) =>
          prev.map((g) => ({
            ...g,
            stories: g.stories.map((s) =>
              s.row.id === storyRow.id
                ? { ...s, row: { ...s.row, caption: editCaption } }
                : s
            ),
          }))
        );
      }
      setIsEditing(false);
    },
    [editCaption]
  );

  // -----------------------------------------------------------------------
  // Fetch viewers
  // -----------------------------------------------------------------------

  const fetchViewers = useCallback(async (storyId: string) => {
    setLoadingViewers(true);
    const supabase = createClient();

    // Get viewer IDs and timestamps
    const { data: views } = await supabase
      .from("story_views")
      .select("viewer_id, viewed_at")
      .eq("story_id", storyId);

    if (!views || views.length === 0) {
      setViewers([]);
      setLoadingViewers(false);
      return;
    }

    const viewerIds = views.map((v) => v.viewer_id);

    // Get profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", viewerIds);

    const profileMap = new Map(
      (profiles || []).map((p) => [p.id, p])
    );

    const merged = views.map((v) => {
      const prof = profileMap.get(v.viewer_id);
      return {
        id: v.viewer_id,
        full_name: prof?.full_name || null,
        avatar_url: prof?.avatar_url || null,
        viewed_at: v.viewed_at,
      };
    });

    setViewers(merged);
    setLoadingViewers(false);
  }, []);

  const goNext = useCallback(() => {
    if (!group) return;
    if (storyIdx < group.stories.length - 1) {
      // Next story in current group
      setStoryIdx((p) => p + 1);
    } else if (groupIdx < groups.length - 1) {
      // Move to next user group
      setGroupIdx((p) => p + 1);
      setStoryIdx(0);
    } else {
      // End of all stories
      close();
    }
  }, [group, storyIdx, groupIdx, groups.length, close]);

  const goPrev = useCallback(() => {
    if (storyIdx > 0) {
      setStoryIdx((p) => p - 1);
    } else if (groupIdx > 0) {
      // Go to last story of previous group
      setGroupIdx((p) => p - 1);
      const prevGroup = groups[groupIdx - 1];
      setStoryIdx(prevGroup ? prevGroup.stories.length - 1 : 0);
    }
  }, [storyIdx, groupIdx, groups]);

  // -----------------------------------------------------------------------
  // Timer for image / text-only stories
  // -----------------------------------------------------------------------

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startImageTimer = useCallback(() => {
    clearTimer();
    startTimeRef.current = Date.now();
    setProgress(0);

    timerRef.current = setInterval(() => {
      if (isPausedRef.current) return;
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min((elapsed / IMAGE_DURATION) * 100, 100);
      setProgress(pct);

      if (elapsed >= IMAGE_DURATION) {
        clearTimer();
        goNext();
      }
    }, PROGRESS_TICK);
  }, [clearTimer, goNext]);

  // -----------------------------------------------------------------------
  // Effect: manage timer / video per story change
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (!story) return;
    setTextVisible(false);
    setProgress(0);
    isPausedRef.current = false;
    setIsPaused(false);

    const textTimeout = setTimeout(() => setTextVisible(true), 200);

    if (story.mediaType === "video") {
      // Video: progress driven by video element, not timer
      clearTimer();
    } else {
      // Image or text-only: 5-second auto-advance
      startImageTimer();
    }

    return () => {
      clearTimeout(textTimeout);
      clearTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupIdx, storyIdx]);

  // -----------------------------------------------------------------------
  // Video event handlers
  // -----------------------------------------------------------------------

  const handleVideoTimeUpdate = useCallback(() => {
    const vid = videoRef.current;
    if (!vid || !vid.duration) return;
    setProgress((vid.currentTime / vid.duration) * 100);
  }, []);

  const handleVideoEnded = useCallback(() => {
    goNext();
  }, [goNext]);

  // -----------------------------------------------------------------------
  // Pause / Resume (long-press)
  // -----------------------------------------------------------------------

  const pause = useCallback(() => {
    isPausedRef.current = true;
    setIsPaused(true);
    if (story?.mediaType === "video" && videoRef.current) {
      videoRef.current.pause();
    }
    // For image timer: we freeze startTimeRef by adjusting it on resume
  }, [story]);

  const resume = useCallback(() => {
    isPausedRef.current = false;
    setIsPaused(false);
    if (story?.mediaType === "video" && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [story]);

  // -----------------------------------------------------------------------
  // Tap handling
  // -----------------------------------------------------------------------

  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasLongPressRef = useRef(false);

  function handlePointerDown() {
    wasLongPressRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      wasLongPressRef.current = true;
      pause();
    }, 300);
  }

  function handlePointerUp(e: React.MouseEvent<HTMLDivElement>) {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (wasLongPressRef.current) {
      wasLongPressRef.current = false;
      resume();
      return;
    }

    // Tap navigation
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width / 3) {
      goPrev();
    } else {
      goNext();
    }
  }

  function handlePointerLeave() {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (wasLongPressRef.current) {
      wasLongPressRef.current = false;
      resume();
    }
  }

  // -----------------------------------------------------------------------
  // Swipe down to close
  // -----------------------------------------------------------------------

  function handleTouchStart(e: React.TouchEvent) {
    setTouchStartY(e.touches[0].clientY);
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartY === null) return;
    const deltaY = e.changedTouches[0].clientY - touchStartY;
    if (deltaY > 100) {
      close();
    }
    setTouchStartY(null);
  }

  // -----------------------------------------------------------------------
  // Loading
  // -----------------------------------------------------------------------

  if (loading) {
    return (
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center"
        style={{ background: "var(--c-deep)" }}
      >
        <div className="w-10 h-10 border-4 border-[var(--c-border)] border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Empty state
  // -----------------------------------------------------------------------

  if (groups.length === 0) {
    return (
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center"
        style={{ background: "var(--c-deep)" }}
      >
        <div className="text-center px-8">
          <div className="text-6xl mb-5">{"📸"}</div>
          <h2
            className="text-xl font-extrabold mb-2"
            style={{ color: "var(--c-text)" }}
          >
            {t.storiesEmptyTitle || "Aucune story pour le moment"}
          </h2>
          <p
            className="text-sm mb-6 leading-relaxed"
            style={{ color: "var(--c-text-muted)" }}
          >
            {t.storiesEmptyDesc ||
              "Sois le premier a partager un moment avec ton compagnon !"}
          </p>
          <div className="flex flex-col gap-3 items-center">
            <button
              onClick={() => router.push("/stories/create")}
              className="rounded-xl px-6 py-3 text-sm font-bold text-white transition-all active:scale-[0.97]"
              style={{ background: "var(--c-accent)" }}
            >
              + {t.storiesCreate || "Creer une story"}
            </button>
            <button
              onClick={() => router.push("/feed")}
              className="rounded-xl px-6 py-3 text-sm font-semibold transition-all active:scale-[0.97]"
              style={{
                background: "var(--c-card)",
                color: "var(--c-text-muted)",
                border: "1px solid var(--c-border)",
              }}
            >
              {t.storiesBack || "Retour"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Active story render
  // -----------------------------------------------------------------------

  if (!group || !story) return null;

  const { row } = story;
  const animalEmoji =
    row.animals?.species ? EMOJI_MAP[row.animals.species] || "\uD83D\uDC3E" : "\uD83D\uDC3E";
  const gradientBg = gradientForStory(row, storyIdx);

  return (
    <div
      className="fixed inset-0 z-[9999] select-none"
      style={{ width: "100vw", height: "100vh", background: "var(--c-deep)" }}
      onMouseDown={handlePointerDown}
      onMouseUp={handlePointerUp}
      onMouseLeave={handlePointerLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ---- Background media ---- */}
      {(() => {
        const effectiveUrl = row.media_url || row.image_url || null;
        if (story.mediaType === "video" && effectiveUrl) {
          return (
            <video
              ref={videoRef}
              key={row.id}
              src={effectiveUrl}
              autoPlay
              playsInline
              muted={false}
              loop={false}
              onTimeUpdate={handleVideoTimeUpdate}
              onEnded={handleVideoEnded}
              className="absolute inset-0 w-full h-full object-cover"
            />
          );
        }
        if (story.mediaType === "image" && effectiveUrl) {
          return (
            <Image
              key={row.id}
              src={effectiveUrl}
              alt={row.caption || "Story"}
              fill
              className="object-cover"
              sizes="100vw"
              priority
            />
          );
        }
        return (
          /* Text-only / template: gradient background */
          <div className="absolute inset-0" style={{ background: gradientBg }} />
        );
      })()}

      {/* Dark gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.05) 30%, rgba(0,0,0,0.05) 60%, rgba(0,0,0,0.7) 100%)",
        }}
      />

      {/* ---- Progress bars (one per story in current group) ---- */}
      <div className="absolute top-0 left-0 right-0 flex gap-1 px-3 pt-3 z-10">
        {group.stories.map((_, idx) => (
          <div
            key={idx}
            className="flex-1 h-[3px] rounded-full overflow-hidden"
            style={{ background: "rgba(255,255,255,0.3)" }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width:
                  idx < storyIdx
                    ? "100%"
                    : idx === storyIdx
                    ? `${progress}%`
                    : "0%",
                background: "#fff",
                transition: idx === storyIdx ? "none" : "width 0.3s",
              }}
            />
          </div>
        ))}
      </div>

      {/* ---- Top bar: user avatar + name + time ago + close ---- */}
      <div className="absolute top-8 left-0 right-0 px-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/30 flex-shrink-0">
            {group.avatarUrl ? (
              <Image
                src={group.avatarUrl}
                alt={group.displayName}
                width={40}
                height={40}
                className="object-cover w-full h-full"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-lg"
                style={{ background: gradientBg }}
              >
                {animalEmoji}
              </div>
            )}
          </div>
          <div>
            <p className="text-white text-sm font-bold drop-shadow-md">
              {group.displayName}
            </p>
            <p className="text-white/60 text-[10px] drop-shadow-sm">
              {timeAgo(row.created_at)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Edit button (own stories only) */}
          {currentUserId === row.user_id && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                pause();
                setEditCaption(row.caption || "");
                setIsEditing(true);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onMouseUp={(e) => e.stopPropagation()}
              className="w-10 h-10 flex items-center justify-center rounded-full text-white active:scale-90 transition-transform"
              style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)" }}
              aria-label="Modifier"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          )}

          {/* Delete button (own stories only) */}
          {currentUserId === row.user_id && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteStory(row);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onMouseUp={(e) => e.stopPropagation()}
              className="w-10 h-10 flex items-center justify-center rounded-full text-red-400 active:scale-90 transition-transform"
              style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)" }}
              aria-label="Supprimer"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          )}

          {/* Close button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              close();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            className="w-10 h-10 flex items-center justify-center rounded-full text-white active:scale-90 transition-transform"
            style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)" }}
            aria-label={t.storiesBack || "Retour"}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* ---- Paused indicator ---- */}
      {isPaused && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div
            className="px-4 py-2 rounded-full text-white text-xs font-semibold"
            style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
          >
            {"||  "}
            {t.storiesPaused || "En pause"}
          </div>
        </div>
      )}

      {/* ---- Story content (text-only / template stories) ---- */}
      {story.mediaType === "none" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-8 z-10 pointer-events-none">
          {/* Sticker */}
          {row.sticker && (
            <div
              className={`text-7xl mb-6 transition-all duration-700 ${
                textVisible ? "opacity-100 scale-100" : "opacity-0 scale-50"
              }`}
            >
              {row.sticker}
            </div>
          )}

          {/* Caption as large centered text */}
          {row.caption && (
            <div
              className={`text-center transition-all duration-700 delay-200 ${
                textVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-6"
              }`}
            >
              <h1
                className="text-3xl font-black leading-tight whitespace-pre-line drop-shadow-lg"
                style={{ color: row.text_color || "#ffffff" }}
              >
                {row.caption}
              </h1>
            </div>
          )}

          {/* Animal name badge */}
          {row.animals && (
            <div
              className={`mt-6 transition-all duration-700 delay-500 ${
                textVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-4"
              }`}
            >
              <span
                className="px-4 py-2 rounded-full text-sm font-semibold text-white"
                style={{
                  background: "rgba(255,255,255,0.2)",
                  backdropFilter: "blur(10px)",
                }}
              >
                {row.animals.name} {animalEmoji}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ---- Caption overlay at bottom (for image/video stories) ---- */}
      {story.mediaType !== "none" && row.caption && (
        <div
          className={`absolute bottom-20 left-0 right-0 px-6 z-10 pointer-events-none transition-all duration-500 ${
            textVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <p
            className="text-center text-lg font-bold leading-snug"
            style={{
              color: row.text_color || "#ffffff",
              textShadow: "0 2px 8px rgba(0,0,0,0.6)",
            }}
          >
            {row.caption}
          </p>
          {row.animals && (
            <p className="text-center text-white/60 text-xs mt-2">
              {row.animals.name} {animalEmoji}
            </p>
          )}
        </div>
      )}

      {/* ---- Bottom: views + story counter + group nav dots ---- */}
      <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-2 z-10">
        {/* View count */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (currentUserId === row.user_id) {
              pause();
              setShowViewers(true);
              fetchViewers(row.id);
            }
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-white text-sm font-semibold active:scale-95 transition-transform"
          style={{
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(8px)",
            cursor: currentUserId === row.user_id ? "pointer" : "default",
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          {row.views_count || 0}
        </button>

        {/* Group navigation dots */}
        {groups.length > 1 && (
          <div className="flex gap-1.5 pointer-events-none">
            {groups.map((_, idx) => (
              <div
                key={idx}
                className="rounded-full transition-all duration-300"
                style={{
                  width: idx === groupIdx ? 16 : 6,
                  height: 6,
                  background:
                    idx === groupIdx
                      ? "rgba(255,255,255,0.9)"
                      : "rgba(255,255,255,0.3)",
                }}
              />
            ))}
          </div>
        )}
        <p className="text-white/40 text-[10px] pointer-events-none">
          {storyIdx + 1} / {totalStoriesInGroup}
        </p>
      </div>

      {/* ---- Edit caption overlay ---- */}
      {isEditing && (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
        >
          <div
            className="w-[85%] max-w-sm rounded-2xl p-5 flex flex-col gap-4"
            style={{ background: "var(--c-card)", border: "1px solid var(--c-border)" }}
          >
            <h3
              className="text-base font-bold"
              style={{ color: "var(--c-text)" }}
            >
              Modifier la legende
            </h3>
            <textarea
              value={editCaption}
              onChange={(e) => setEditCaption(e.target.value)}
              rows={3}
              className="w-full rounded-xl px-4 py-3 text-sm resize-none focus:outline-none"
              style={{
                background: "var(--c-deep)",
                color: "var(--c-text)",
                border: "1px solid var(--c-border)",
              }}
              placeholder="Ajouter une legende..."
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setIsEditing(false);
                  resume();
                }}
                className="px-4 py-2 rounded-xl text-sm font-semibold"
                style={{
                  background: "var(--c-deep)",
                  color: "var(--c-text-muted)",
                  border: "1px solid var(--c-border)",
                }}
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  handleSaveCaption(row);
                  resume();
                }}
                className="px-4 py-2 rounded-xl text-sm font-bold text-white"
                style={{ background: "var(--c-accent)" }}
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Viewers modal ---- */}
      {showViewers && (
        <div
          className="absolute inset-0 z-20 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={(e) => {
            e.stopPropagation();
            setShowViewers(false);
            resume();
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
        >
          <div
            className="w-full max-h-[60vh] rounded-t-2xl p-5 flex flex-col gap-3 overflow-y-auto"
            style={{
              background: "var(--c-card)",
              border: "1px solid var(--c-border)",
              borderBottom: "none",
              backdropFilter: "blur(20px)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="flex justify-center mb-1">
              <div
                className="w-10 h-1 rounded-full"
                style={{ background: "var(--c-border)" }}
              />
            </div>

            <div className="flex items-center justify-between">
              <h3
                className="text-base font-bold flex items-center gap-2"
                style={{ color: "var(--c-text)" }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                Vues ({row.views_count || 0})
              </h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowViewers(false);
                  resume();
                }}
                className="w-7 h-7 flex items-center justify-center rounded-full"
                style={{ background: "var(--c-deep)" }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  style={{ color: "var(--c-text-muted)" }}
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {loadingViewers ? (
              <div className="flex justify-center py-6">
                <div className="w-6 h-6 border-2 border-[var(--c-border)] border-t-white rounded-full animate-spin" />
              </div>
            ) : viewers.length === 0 ? (
              <p
                className="text-center py-6 text-sm"
                style={{ color: "var(--c-text-muted)" }}
              >
                Aucune vue pour le moment
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {viewers.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center gap-3 py-2 px-1"
                  >
                    <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 border border-white/10">
                      {v.avatar_url ? (
                        <Image
                          src={v.avatar_url}
                          alt={v.full_name || ""}
                          width={36}
                          height={36}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center text-sm"
                          style={{ background: "var(--c-deep)", color: "var(--c-text-muted)" }}
                        >
                          {(v.full_name || "?")[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-semibold truncate"
                        style={{ color: "var(--c-text)" }}
                      >
                        {v.full_name || "Utilisateur"}
                      </p>
                      <p
                        className="text-[10px]"
                        style={{ color: "var(--c-text-muted)" }}
                      >
                        {timeAgo(v.viewed_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
