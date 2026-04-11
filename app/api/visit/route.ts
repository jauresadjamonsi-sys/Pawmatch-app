import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// POST /api/visit — increment visit counter
export async function POST(req: Request) {
  try {
    const { site } = await req.json().catch(() => ({ site: "pawlyapp" }));
    const siteName = site || "pawlyapp";

    const supabase = await createClient();

    // Try using the increment_visit RPC function first
    const { data: rpcCount, error: rpcError } = await supabase.rpc(
      "increment_visit",
      { p_site: siteName }
    );

    if (!rpcError && rpcCount !== null) {
      return NextResponse.json({ count: rpcCount });
    }

    // Fallback: try direct upsert if RPC not available yet
    // (e.g. migration not run yet)
    const { data: existing } = await supabase
      .from("site_stats")
      .select("visit_count")
      .eq("site_name", siteName)
      .single();

    if (existing) {
      const newCount = (existing.visit_count || 0) + 1;
      await supabase
        .from("site_stats")
        .update({ visit_count: newCount, last_visited: new Date().toISOString() })
        .eq("site_name", siteName);
      return NextResponse.json({ count: newCount });
    }

    // Table doesn't exist yet — return a static fallback count
    return NextResponse.json({ count: 1, fallback: true });
  } catch (err: unknown) {
    console.error("Visit POST error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ count: 1, fallback: true });
  }
}

// GET /api/visit — return current count
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const siteName = searchParams.get("site") || "pawlyapp";

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("site_stats")
      .select("visit_count")
      .eq("site_name", siteName)
      .single();

    if (error || !data) {
      return NextResponse.json({ count: 0, fallback: true });
    }

    return NextResponse.json({ count: data.visit_count });
  } catch (err: unknown) {
    console.error("Visit GET error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ count: 0, fallback: true });
  }
}
