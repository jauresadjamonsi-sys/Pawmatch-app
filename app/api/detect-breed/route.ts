import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const { image_url } = await request.json();
  if (!image_url) return NextResponse.json({ error: "Image requise" }, { status: 400 });

  try {
    const anthropic = new Anthropic();
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "url", url: image_url } },
          { type: "text", text: "Analyse cette photo d'animal. Reponds en JSON strict: {\"species\": \"chien/chat/lapin/etc\", \"breed\": \"race detectee\", \"confidence\": 0.0-1.0, \"traits\": [\"trait1\", \"trait2\"], \"description\": \"courte description en francais\"}. Si ce n'est pas un animal, reponds {\"error\": \"Pas un animal detecte\"}." }
        ]
      }]
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: "Analyse echouee" }, { status: 500 });

    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Erreur d'analyse" }, { status: 500 });
  }
}
