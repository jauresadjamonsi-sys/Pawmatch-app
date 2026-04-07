import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

// ── Types ───────────────────────────────────────────────────
type AnimalInput = {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  personality: string[];
  energy: string | null;
};

type CompatResult = {
  score: number;
  reason: string;
  emoji: string;
};

// ── In-memory cache (keyed by sorted pair of IDs) ───────────
const cache = new Map<string, { result: CompatResult; ts: number }>();
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

function cacheKey(a: string, b: string): string {
  return [a, b].sort().join(":");
}

function getCached(a: string, b: string): CompatResult | null {
  const key = cacheKey(a, b);
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.result;
}

function setCache(a: string, b: string, result: CompatResult) {
  const key = cacheKey(a, b);
  cache.set(key, { result, ts: Date.now() });
  // Evict old entries if cache grows too large
  if (cache.size > 500) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].ts - b[1].ts);
    for (let i = 0; i < 100; i++) cache.delete(oldest[i][0]);
  }
}

// ── POST handler ────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { myAnimal, otherAnimal } = body as {
      myAnimal: AnimalInput;
      otherAnimal: AnimalInput;
    };

    if (!myAnimal?.id || !otherAnimal?.id) {
      return NextResponse.json({ error: "Missing animal data" }, { status: 400 });
    }

    // Check cache first
    const cached = getCached(myAnimal.id, otherAnimal.id);
    if (cached) {
      return NextResponse.json(cached);
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      // No API key — return deterministic fallback based on traits overlap
      const sharedTraits = (myAnimal.personality || []).filter((t) =>
        (otherAnimal.personality || []).includes(t)
      );
      const sameSpecies = myAnimal.species === otherAnimal.species;
      const base = sameSpecies ? 60 : 45;
      const bonus = Math.min(sharedTraits.length * 8, 30);
      const score = Math.min(95, base + bonus);
      setCache(myAnimal.id, otherAnimal.id, {
        score,
        reason: sameSpecies
          ? `${myAnimal.name} et ${otherAnimal.name} sont de la m\u00eame esp\u00e8ce, bonne base pour s\u2019entendre\u202F!`
          : `${myAnimal.name} et ${otherAnimal.name} pourraient bien se compl\u00e9ter\u202F!`,
        emoji: sameSpecies ? "\uD83E\uDD1D" : "\uD83D\uDC3E",
      });
      return NextResponse.json(getCached(myAnimal.id, otherAnimal.id));
    }

    const client = new Anthropic({ apiKey });

    const prompt = `Tu es un expert en comportement animal et compatibilité entre animaux de compagnie. Analyse la compatibilité entre ces deux animaux et réponds UNIQUEMENT en JSON valide.

Animal 1: ${myAnimal.name} — ${myAnimal.species}${myAnimal.breed ? " (" + myAnimal.breed + ")" : ""}, traits: ${(myAnimal.personality || []).join(", ") || "non spécifié"}, énergie: ${myAnimal.energy || "non spécifié"}

Animal 2: ${otherAnimal.name} — ${otherAnimal.species}${otherAnimal.breed ? " (" + otherAnimal.breed + ")" : ""}, traits: ${(otherAnimal.personality || []).join(", ") || "non spécifié"}, énergie: ${otherAnimal.energy || "non spécifié"}

Réponds UNIQUEMENT avec ce JSON (pas de markdown, pas de backticks) :
{"score": <nombre 0-100>, "reason": "<1 phrase fun et personnalisée en français, utilise les prénoms des animaux, max 120 caractères>", "emoji": "<1 emoji pertinent>"}

La raison doit être engageante, mignonne et personnalisée. Exemples de ton :
- "Ruby et Luna sont toutes les deux des aventurières — elles vont devenir inséparables !"
- "Max adore jouer et Milo est le compagnon parfait pour ses folles aventures !"
- "Nala la câline va adorer les siestes avec Felix le doux !"`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 200,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Parse JSON from response (handle possible markdown wrapping)
    let jsonStr = text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    }

    const result: CompatResult = JSON.parse(jsonStr);

    // Validate and clamp
    result.score = Math.min(100, Math.max(0, Math.round(result.score)));
    if (!result.reason) result.reason = "Ces deux compagnons pourraient bien s'entendre !";
    if (!result.emoji) result.emoji = "🐾";

    // Cache the result
    setCache(myAnimal.id, otherAnimal.id, result);

    return NextResponse.json(result);
  } catch {
    // Graceful fallback — never 500
    return NextResponse.json({
      score: 65,
      reason: "Ces deux compagnons ont du potentiel ensemble\u202F!",
      emoji: "\uD83D\uDC3E",
    });
  }
}
