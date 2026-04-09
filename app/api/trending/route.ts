import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Get hashtags from last 7 days, count occurrences
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data } = await supabase
      .from("reel_hashtags")
      .select("hashtag")
      .gte("created_at", sevenDaysAgo);

    // Count and sort
    const counts: Record<string, number> = {};
    (data || []).forEach(row => {
      counts[row.hashtag] = (counts[row.hashtag] || 0) + 1;
    });

    const trending = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([hashtag, count]) => ({ hashtag, count }));

    return NextResponse.json({ trending });
  } catch {
    return NextResponse.json({ trending: [] });
  }
}
