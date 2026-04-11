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
  const [fetchError, setFetchError] = useState<string | null>(null);
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

  // Touch tracking for swipe
  const touchStartRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const isSwipingRef = useRef(false);

  // Text animation
  const [textVisible, setTextVisible] = useState(false);

  // Transition animation
  const [transitioning, setTransitioning] = useState(false);
  const [slideDirection, setSlideDirection] = useState<"left" | "right" | null>(null);

  // Track which stories we already recorded a view for
  const viewedRef = useRef<Set<string>>(new Set());

  // Reply state
  const [replyText, setReplyText] = useState("");
  const [replySending, setReplySending] = useState(false);
  const [replySent, setReplySent] = useState(false);
  const replyInputRef = useRef<HTMLInputElement>(null);

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
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.push("/feed");
          return;
        }
        setCurrentUserId(user.id);

        // Fetch active stories (try with animal join, fallback without)
        let data: any[] | null = null;
        let error: any = null;

        const res1 = await supabase
          .from("stories")
          .select("*, animals(id, name, species, photo_url)")
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false })
          .limit(50);

        if (res1.error) {
          // Fallback: fetch without animal join (FK may not exist)
          console.warn("[StoriesPage] animal join failed, retrying without:", res1.error.message);
          const res2 = await supabase
            .from("stories")
            .select("*")
            .gt("expires_at", new Date().toISOString())
            .order("created_at", { ascending: false })
            .limit(50);
          data = res2.data;
          error = res2.error;
        } else {
          data = res1.data;
          error = res1.error;
        }

        if (error) {
          console.error("[StoriesPage] fetch error:", error.message, error);
          setFetchError("Impossible de charger les stories. Reessayez.");
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
      } catch (err) {
        console.error("[StoriesPage] unexpected error:", err);
        setFetchError("Erreur inattendue. Reessayez plus tard.");
        setGroups([]);
      } finally {
        setLoading(false);
      }
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

  // Reset edit/viewers/reply state when story changes
  useEffect(() => {
    setIsEditing(false);
    setShowViewers(false);
    setViewers([]);
    setReplyText("");
    setReplySent(false);
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

  // -----------------------------------------------------------------------
  // Reply to story
  // -----------------------------------------------------------------------

  const handleReply = useCallback(async () => {
    if (!replyText.trim() || !story || !currentUserId || replySending) return;
    if (currentUserId === story.row.user_id) return; // Can't reply to own story

    setReplySending(true);
    try {
      // Send reply as a notification / message (fire-and-forget)
      await fetch("/api/stories/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          story_id: story.row.id,
          story_owner_id: story.row.user_id,
          message: replyText.trim(),
        }),
      });
      setReplyText("");
      setReplySent(true);
      setTimeout(() => setReplySent(false), 2000);
    } catch {
      // Silent fail
    } finally {
      setReplySending(false);
    }
  }, [replyText, story, currentUserId, replySending]);

  const goNext = useCallback(() => {
    if (!group) return;
    setSlideDirection("left");
    setTransitioning(true);

    setTimeout(() => {
      if (storyIdx < group.stories.length - 1) {
        setStoryIdx((p) => p + 1);
      } else if (groupIdx < groups.length - 1) {
        setGroupIdx((p) => p + 1);
        setStoryIdx(0);
      } else {
        close();
        return;
      }
      setTimeout(() => {
        setTransitioning(false);
        setSlideDirection(null);
      }, 50);
    }, 150);
  }, [group, storyIdx, groupIdx, groups.length, close]);

  const goPrev = useCallback(() => {
    setSlideDirection("right");
    setTransitioning(true);

    setTimeout(() => {
      if (storyIdx > 0) {
        setStoryIdx((p) => p - 1);
      } else if (groupIdx > 0) {
        setGroupIdx((p) => p - 1);
        const prevGroup = groups[groupIdx - 1];
        setStoryIdx(prevGroup ? prevGroup.stories.length - 1 : 0);
      }
      setTimeout(() => {
        setTransitioning(false);
        setSlideDirection(null);
      }, 50);
    }, 150);
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

    // Tap navigation: left 30% = previous, right 70% = next (Instagram-style)
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width * 0.3) {
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
  // Touch swipe (horizontal for prev/next, vertical down to close)
  // -----------------------------------------------------------------------

  function handleTouchStart(e: React.TouchEvent) {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, t: Date.now() };
    isSwipingRef.current = false;
    setSwipeOffset(0);
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!touchStartRef.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;

    // Determine swipe direction once
    if (!isSwipingRef.current && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
      isSwipingRef.current = true;
    }

    if (isSwipingRef.current) {
      // Horizontal swipe: apply rubber-band offset
      if (Math.abs(dx) > Math.abs(dy)) {
        setSwipeOffset(dx * 0.4);
      }
    }
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (!touchStartRef.current) return;

    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const elapsed = Date.now() - touchStartRef.current.t;
    const velocity = Math.abs(dx) / Math.max(elapsed, 1);

    // Swipe down to close
    if (dy > 100 && Math.abs(dy) > Math.abs(dx)) {
      close();
      touchStartRef.current = null;
      setSwipeOffset(0);
      return;
    }

    // Horizontal swipe threshold: either distance > 60px or fast flick
    if (Math.abs(dx) > 60 || (velocity > 0.5 && Math.abs(dx) > 30)) {
      if (dx < 0) {
        // Swipe left -> next
        goNext();
      } else {
        // Swipe right -> prev
        goPrev();
      }
    }

    touchStartRef.current = null;
    setSwipeOffset(0);
  }

  // -----------------------------------------------------------------------
  // Loading
  // -----------------------------------------------------------------------

  if (loading) {
    return (
      <div
        className="fixed inset-0 z-[9999] flex flex-col"
        style={{ background: "var(--c-deep)" }}
      >
        {/* Skeleton progress bars */}
        <div className="flex gap-1 px-3 pt-3">
          <div className="flex-1 h-[3px] glass rounded-full animate-breathe" />
          <div className="flex-1 h-[3px] glass rounded-full animate-breathe" style={{ animationDelay: "0.1s" }} />
          <div className="flex-1 h-[3px] glass rounded-full animate-breathe" style={{ animationDelay: "0.2s" }} />
        </div>
        {/* Skeleton top bar */}
        <div className="flex items-center gap-3 px-4 mt-6">
          <div className="w-10 h-10 rounded-full glass animate-breathe" />
          <div className="flex flex-col gap-1.5">
            <div className="w-24 h-3 glass rounded-full animate-breathe" style={{ animationDelay: "0.15s" }} />
            <div className="w-12 h-2 glass rounded-full animate-breathe" style={{ animationDelay: "0.3s" }} />
          </div>
        </div>
        {/* Skeleton body */}
        <div className="flex-1 flex items-center justify-center px-8">
          <div className="w-full max-w-xs space-y-4">
            <div className="glass rounded-2xl animate-breathe" style={{ height: 200, animationDelay: "0.1s" }} />
            <div className="glass rounded-2xl animate-breathe mx-auto" style={{ height: 16, width: "60%", animationDelay: "0.25s" }} />
          </div>
        </div>
        {/* Skeleton bottom */}
        <div className="flex justify-center pb-8">
          <div className="w-28 h-9 glass rounded-full animate-breathe" style={{ animationDelay: "0.4s" }} />
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Error state
  // -----------------------------------------------------------------------

  if (fetchError) {
    return (
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center"
        style={{ background: "var(--c-deep)" }}
      >
        <div className="text-center px-8">
          <div className="text-5xl mb-4">{"⚠️"}</div>
          <h2
            className="text-lg font-bold mb-2"
            style={{ color: "var(--c-text)" }}
          >
            Oups, quelque chose a mal tourne
          </h2>
          <p
            className="text-sm mb-6"
            style={{ color: "var(--c-text-muted)" }}
          >
            {fetchError}
          </p>
          <div className="flex flex-col gap-3 items-center">
            <button
              onClick={() => {
                setFetchError(null);
                setLoading(true);
                window.location.reload();
              }}
              className="rounded-xl px-6 py-3 text-sm font-bold text-white transition-all active:scale-[0.97]"
              style={{ background: "var(--c-accent)" }}
            >
              Reessayer
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
  const isOwnStory = currentUserId === row.user_id;

  return (
    <div
      className="fixed inset-0 z-[9999] select-none overflow-hidden"
      style={{ width: "100vw", height: "100dvh", background: "#000" }}
    >
      {/* ---- Story content with swipe offset + crossfade transition ---- */}
      <div
        key={`story-${groupIdx}-${storyIdx}`}
        className="absolute inset-0 animate-story-crossfade"
        style={{
          transform: `translateX(${swipeOffset}px)`,
          opacity: transitioning ? 0 : undefined,
          transition: transitioning
            ? "opacity 0.15s ease-out"
            : swipeOffset !== 0
            ? "none"
            : undefined,
        }}
        onMouseDown={handlePointerDown}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* ---- Background media with fade-in-scale on load ---- */}
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
                preload="auto"
                muted={false}
                loop={false}
                onTimeUpdate={handleVideoTimeUpdate}
                onEnded={handleVideoEnded}
                className="absolute inset-0 w-full h-full object-cover animate-fade-in-scale"
                style={{ aspectRatio: "9/16" }}
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
                className="object-cover animate-fade-in-scale"
                sizes="100vw"
                priority
              />
            );
          }
          return (
            /* Text-only / template: gradient background */
            <div className="absolute inset-0 animate-fade-in-scale" style={{ background: gradientBg }} />
          );
        })()}

        {/* Dark gradient overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.05) 30%, rgba(0,0,0,0.05) 55%, rgba(0,0,0,0.7) 100%)",
          }}
        />

        {/* ---- Progress bars (one per story in current group) ---- */}
        <div className="absolute top-0 left-0 right-0 flex gap-[3px] px-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))] z-10">
          {group.stories.map((_, idx) => (
            <div
              key={idx}
              className="flex-1 h-[2.5px] rounded-full overflow-hidden"
              style={{ background: "rgba(255,255,255,0.25)" }}
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
                  transition: idx === storyIdx
                    ? `width ${PROGRESS_TICK}ms linear`
                    : "width 0.3s ease",
                }}
              />
            </div>
          ))}
        </div>

        {/* ---- Top bar: user avatar + name + time ago + close ---- */}
        <div
          className="absolute left-0 right-0 px-4 flex items-center justify-between z-10"
          style={{ top: "calc(max(0.75rem, env(safe-area-inset-top, 0px)) + 12px)" }}
        >
          <div className="flex items-center gap-3 animate-author-slide-in">
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

          <div className="flex items-center gap-2">
            {/* Edit button (own stories only) */}
            {isOwnStory && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  pause();
                  setEditCaption(row.caption || "");
                  setIsEditing(true);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onMouseUp={(e) => e.stopPropagation()}
                className="w-9 h-9 flex items-center justify-center rounded-full text-white active:scale-90 transition-transform"
                style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)" }}
                aria-label="Modifier"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            )}

            {/* Delete button (own stories only) */}
            {isOwnStory && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteStory(row);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onMouseUp={(e) => e.stopPropagation()}
                className="w-9 h-9 flex items-center justify-center rounded-full text-red-400 active:scale-90 transition-transform"
                style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)" }}
                aria-label="Supprimer"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
              className="w-9 h-9 flex items-center justify-center rounded-full text-white active:scale-90 transition-transform"
              style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)" }}
              aria-label={t.storiesBack || "Retour"}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* ---- Paused indicator ---- */}
        {isPaused && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div
              className="px-5 py-2.5 rounded-full text-white text-sm font-semibold flex items-center gap-2"
              style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
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
            className={`absolute left-0 right-0 px-6 z-10 pointer-events-none transition-all duration-500 ${
              textVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
            style={{ bottom: isOwnStory ? "7rem" : "6.5rem" }}
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
      </div>

      {/* ---- Bottom section: reply + views + dots (always visible above swipe) ---- */}
      <div
        className="absolute left-0 right-0 z-20 flex flex-col items-center gap-2"
        style={{ bottom: "max(1rem, env(safe-area-inset-bottom, 0px) + 0.5rem)" }}
      >
        {/* Reply input (only for other people's stories) */}
        {!isOwnStory && (
          <div
            className="w-full px-4 mb-1 animate-reply-slide-up"
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-center gap-2 rounded-full overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.12)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              <input
                ref={replyInputRef}
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onFocus={() => pause()}
                onBlur={() => {
                  if (!replyText.trim()) resume();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleReply();
                  }
                }}
                placeholder="Envoyer un message..."
                className="flex-1 bg-transparent px-4 py-3 text-sm text-white placeholder-white/50 outline-none"
                maxLength={200}
              />
              {replyText.trim() && (
                <button
                  onClick={handleReply}
                  disabled={replySending}
                  className="pr-3 pl-1 py-2 text-white/90 active:scale-90 transition-transform disabled:opacity-50"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                </button>
              )}
            </div>
            {/* Reply sent confirmation */}
            {replySent && (
              <p className="text-center text-xs text-amber-300 mt-1.5 font-medium animate-pulse">
                Message envoye !
              </p>
            )}
          </div>
        )}

        {/* View count — clickable for owner to see who viewed */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (isOwnStory) {
              pause();
              setShowViewers(true);
              fetchViewers(row.id);
            }
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-white text-xs font-semibold active:scale-95 transition-transform"
          style={{
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            cursor: isOwnStory ? "pointer" : "default",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          {row.views_count || 0} {isOwnStory ? "vues" : ""}
        </button>

        {/* Group navigation dots */}
        {groups.length > 1 && (
          <div className="flex gap-1.5 pointer-events-none">
            {groups.map((_, idx) => (
              <div
                key={idx}
                className="rounded-full transition-all duration-300"
                style={{
                  width: idx === groupIdx ? 14 : 5,
                  height: 5,
                  background:
                    idx === groupIdx
                      ? "rgba(255,255,255,0.9)"
                      : "rgba(255,255,255,0.3)",
                }}
              />
            ))}
          </div>
        )}
        <p className="text-white/30 text-[9px] pointer-events-none">
          {storyIdx + 1} / {totalStoriesInGroup}
        </p>
      </div>

      {/* ---- Edit caption overlay ---- */}
      {isEditing && (
        <div
          className="absolute inset-0 z-30 flex items-center justify-center"
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
          className="absolute inset-0 z-30 flex items-end justify-center"
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
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ color: "var(--c-text-muted)" }}>
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
