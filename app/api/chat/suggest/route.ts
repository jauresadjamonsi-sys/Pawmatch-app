import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    // Require authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const { messages, myAnimalName, theirAnimalName, mySpecies, theirSpecies, profileId } = await request.json();

    // Ensure the authenticated user matches the profileId
    if (user.id !== profileId) {
      return NextResponse.json({ error: "Non autorise" }, { status: 403 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ suggestions: [] });
    }

    const context = (messages || []).slice(-6).map((m: any) => ({
      role: m.sender_id === profileId ? "moi" : "eux",
      text: m.content,
    }));

    const prompt = (!messages || messages.length === 0)
      ? `Je viens d'avoir un match avec quelqu'un qui a un ${theirSpecies} nomme ${theirAnimalName}. J'ai un ${mySpecies} nomme ${myAnimalName}. Genere 3 premiers messages courts et naturels pour briser la glace et organiser une rencontre entre nos animaux en Suisse. Reponds UNIQUEMENT en JSON: ["msg1","msg2","msg3"]`
      : `Conversation entre proprietaires d'animaux en Suisse. Mon animal: ${myAnimalName} (${mySpecies}). Leur animal: ${theirAnimalName} (${theirSpecies}). Derniers messages: ${context.map((m: any) => `${m.role}: "${m.text}"`).join(" | ")}. Genere 3 reponses courtes et naturelles en francais pour continuer la conversation et organiser une sortie. Reponds UNIQUEMENT en JSON: ["msg1","msg2","msg3"]`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 200,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return NextResponse.json({ suggestions: parsed.slice(0, 3) });
    }

    return NextResponse.json({ suggestions: [] });
  } catch {
    return NextResponse.json({ suggestions: [] });
  }
}
