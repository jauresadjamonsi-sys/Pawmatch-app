import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Supabase admin client (service role — bypasses RLS)
// ---------------------------------------------------------------------------

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ---------------------------------------------------------------------------
// Helper: extract storage path from a full media_url
// e.g. "https://xyz.supabase.co/storage/v1/object/public/stories/user123/abc.jpg"
//   => "user123/abc.jpg"
// ---------------------------------------------------------------------------

function extractStoragePath(mediaUrl: string): string | null {
  try {
    const marker = "/storage/v1/object/public/stories/";
    const idx = mediaUrl.indexOf(marker);
    if (idx !== -1) {
      return mediaUrl.substring(idx + marker.length);
    }

    // Fallback: try signed URL pattern
    const signedMarker = "/storage/v1/object/sign/stories/";
    const sIdx = mediaUrl.indexOf(signedMarker);
    if (sIdx !== -1) {
      const pathWithParams = mediaUrl.substring(sIdx + signedMarker.length);
      return pathWithParams.split("?")[0];
    }

    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// GET /api/stories/cleanup
// Automatic cleanup of expired stories (24h auto-deletion)
// Protected by CRON_SECRET
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  // ------ Auth: verify CRON_SECRET from header or query param ------
  const authHeader = request.headers.get("authorization");
  const { searchParams } = new URL(request.url);
  const querySecret = searchParams.get("secret");

  const cronSecret = process.env.CRON_SECRET;

  if (
    authHeader !== `Bearer ${cronSecret}` &&
    querySecret !== cronSecret
  ) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const startTime = Date.now();
  const logs: string[] = [];

  try {
    // ------------------------------------------------------------------
    // Step 1: Fetch all expired stories
    // ------------------------------------------------------------------
    const now = new Date().toISOString();

    const { data: expiredStories, error: fetchError } = await supabase
      .from("stories")
      .select("id, media_url")
      .lt("expires_at", now);

    if (fetchError) {
      console.error("[stories/cleanup] Fetch expired stories error:", fetchError.message);
      return NextResponse.json(
        { error: "Failed to fetch expired stories", details: fetchError.message },
        { status: 500 }
      );
    }

    if (!expiredStories || expiredStories.length === 0) {
      logs.push("No expired stories found.");
      console.log("[stories/cleanup]", logs.join(" "));
      return NextResponse.json({
        success: true,
        cleaned: 0,
        storageDeleted: 0,
        duration_ms: Date.now() - startTime,
        logs,
      });
    }

    const storyIds = expiredStories.map((s) => s.id);
    logs.push(`Found ${expiredStories.length} expired story(ies).`);

    // ------------------------------------------------------------------
    // Step 2: Delete media files from Supabase Storage ("stories" bucket)
    // ------------------------------------------------------------------
    const storagePaths: string[] = [];

    for (const story of expiredStories) {
      if (story.media_url) {
        const path = extractStoragePath(story.media_url);
        if (path) {
          storagePaths.push(path);
        }
      }
    }

    let storageDeletedCount = 0;

    if (storagePaths.length > 0) {
      // Supabase storage.remove accepts an array of paths
      const { data: removedFiles, error: storageError } = await supabase.storage
        .from("stories")
        .remove(storagePaths);

      if (storageError) {
        console.error("[stories/cleanup] Storage deletion error:", storageError.message);
        logs.push(`Storage deletion error: ${storageError.message}`);
      } else {
        storageDeletedCount = removedFiles?.length || 0;
        logs.push(`Deleted ${storageDeletedCount} file(s) from storage.`);
      }
    } else {
      logs.push("No media files to delete from storage.");
    }

    // ------------------------------------------------------------------
    // Step 3: Delete orphaned story_views for these stories
    // (in case cascade is not set up)
    // ------------------------------------------------------------------
    const { error: viewsError } = await supabase
      .from("story_views")
      .delete()
      .in("story_id", storyIds);

    if (viewsError) {
      // Non-fatal: the table may not exist or cascade handles it
      console.warn("[stories/cleanup] story_views cleanup warning:", viewsError.message);
      logs.push(`story_views cleanup warning: ${viewsError.message}`);
    } else {
      logs.push("Cleaned up related story_views.");
    }

    // ------------------------------------------------------------------
    // Step 4: Delete expired story rows from the database
    // ------------------------------------------------------------------
    const { error: deleteError } = await supabase
      .from("stories")
      .delete()
      .in("id", storyIds);

    if (deleteError) {
      console.error("[stories/cleanup] Delete stories error:", deleteError.message);
      return NextResponse.json(
        { error: "Failed to delete expired stories", details: deleteError.message },
        { status: 500 }
      );
    }

    logs.push(`Deleted ${storyIds.length} expired story row(s).`);

    // ------------------------------------------------------------------
    // Done
    // ------------------------------------------------------------------
    const duration = Date.now() - startTime;
    console.log(`[stories/cleanup] Cleaned ${storyIds.length} stories in ${duration}ms`);

    return NextResponse.json({
      success: true,
      cleaned: storyIds.length,
      storageDeleted: storageDeletedCount,
      duration_ms: duration,
      logs,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[stories/cleanup] Unexpected error:", message);
    return NextResponse.json(
      { error: "Cleanup failed", details: message },
      { status: 500 }
    );
  }
}
