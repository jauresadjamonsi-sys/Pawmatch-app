import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const BLOCKED_PATTERNS = [
  /\b(vente|acheter|prix|euros?|chf|francs?)\b.*\b(animal|chien|chat|chiot|chaton)\b/i,
  /\b(sexe|porn|nude|xxx)\b/i,
  /\b(tuer|violence|maltraiter|battre)\b.*\b(animal|chien|chat)\b/i,
  /\b(arme|drogue|illegal)\b/i,
];

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const { content, type } = await request.json();
  if (!content) return NextResponse.json({ safe: true });

  // Check against blocked patterns
  const flagged = BLOCKED_PATTERNS.some(pattern => pattern.test(content));

  if (flagged) {
    // Log the flagged content
    await supabase.from("moderation_logs").insert({
      user_id: user.id,
      content_type: type || "text",
      content_preview: content.slice(0, 200),
      action: "blocked",
    }).catch(() => {});

    return NextResponse.json({
      safe: false,
      reason: "Ce contenu ne respecte pas nos regles communautaires."
    });
  }

  return NextResponse.json({ safe: true });
}
