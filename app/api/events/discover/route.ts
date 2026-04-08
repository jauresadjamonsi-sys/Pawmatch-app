import { NextResponse } from "next/server";

export type DiscoveredEvent = {
  id: string;
  title: string;
  snippet: string;
  url: string;
  source: string;
  canton: string;
  image?: string;
};

// Canton names for search queries
const CANTON_NAMES: Record<string, string> = {
  AG: "Argovie Aargau", AI: "Appenzell", AR: "Appenzell",
  BE: "Berne Bern", BL: "Bale Basel", BS: "Bale Basel",
  FR: "Fribourg", GE: "Geneve Geneva", GL: "Glaris",
  GR: "Grisons Graubunden", JU: "Jura", LU: "Lucerne Luzern",
  NE: "Neuchatel", NW: "Nidwald", OW: "Obwald",
  SG: "Saint-Gall St Gallen", SH: "Schaffhouse", SO: "Soleure",
  SZ: "Schwyz", TG: "Thurgovie Thurgau", TI: "Tessin Ticino",
  UR: "Uri", VD: "Vaud Lausanne", VS: "Valais",
  ZG: "Zoug Zug", ZH: "Zurich",
};

// Curated Swiss animal event sources — always shown as suggestions
const CURATED_SOURCES = [
  {
    name: "Protection Suisse des Animaux (PSA)",
    url: "https://www.protection-animaux.com/evenements",
    description: "Evenements officiels de la PSA pour le bien-etre animal en Suisse",
  },
  {
    name: "Societe Cynologique Suisse (SCS)",
    url: "https://www.skg.ch/fr/manifestations/",
    description: "Expositions et concours canins organises dans toute la Suisse",
  },
  {
    name: "Animaux.ch",
    url: "https://www.animaux.ch",
    description: "Portail suisse des animaux de compagnie — evenements et actualites",
  },
  {
    name: "Petfriendly.ch",
    url: "https://www.petfriendly.ch",
    description: "Activites et lieux accueillant les animaux en Suisse",
  },
  {
    name: "Eventbrite Suisse — Animaux",
    url: "https://www.eventbrite.com/d/switzerland/pet-events/",
    description: "Evenements pour animaux sur Eventbrite en Suisse",
  },
];

// In-memory cache (serverless: per-instance, 1h TTL)
const cache = new Map<string, { data: DiscoveredEvent[]; ts: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const canton = searchParams.get("canton") || "";
  const cacheKey = `discover-${canton || "all"}`;

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json({
      events: cached.data,
      sources: CURATED_SOURCES,
      searchUrl: buildGoogleSearchUrl(canton),
      cached: true,
    });
  }

  const googleApiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const googleCseId = process.env.GOOGLE_CSE_ID;

  let discovered: DiscoveredEvent[] = [];

  if (googleApiKey && googleCseId) {
    // Use Google Custom Search API
    try {
      discovered = await searchGoogle(canton, googleApiKey, googleCseId);
    } catch (err) {
      console.error("[Events Discover] Google search error:", err);
    }
  }

  // If no Google results, try SerpAPI as fallback
  if (discovered.length === 0 && process.env.SERPAPI_KEY) {
    try {
      discovered = await searchSerpApi(canton, process.env.SERPAPI_KEY);
    } catch (err) {
      console.error("[Events Discover] SerpAPI error:", err);
    }
  }

  // Cache results
  if (discovered.length > 0) {
    cache.set(cacheKey, { data: discovered, ts: Date.now() });
  }

  return NextResponse.json({
    events: discovered,
    sources: CURATED_SOURCES,
    searchUrl: buildGoogleSearchUrl(canton),
    cached: false,
  });
}

function buildGoogleSearchUrl(canton: string): string {
  const cantonName = canton ? CANTON_NAMES[canton] || canton : "Suisse";
  const q = encodeURIComponent(`evenements animaux chiens chats ${cantonName} Suisse 2026`);
  return `https://www.google.com/search?q=${q}`;
}

async function searchGoogle(
  canton: string,
  apiKey: string,
  cseId: string
): Promise<DiscoveredEvent[]> {
  const cantonName = canton ? CANTON_NAMES[canton] || canton : "Suisse";
  const query = `evenements animaux chiens chats ${cantonName} Suisse`;
  const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cseId}&q=${encodeURIComponent(query)}&num=8&lr=lang_fr&gl=ch&dateRestrict=m6`;

  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) return [];

  const data = await res.json();
  if (!data.items) return [];

  return data.items.map((item: any, i: number) => ({
    id: `google-${canton || "ch"}-${i}`,
    title: item.title || "",
    snippet: item.snippet || "",
    url: item.link || "",
    source: new URL(item.link).hostname.replace("www.", ""),
    canton: canton || "CH",
    image: item.pagemap?.cse_image?.[0]?.src || item.pagemap?.cse_thumbnail?.[0]?.src || undefined,
  }));
}

async function searchSerpApi(
  canton: string,
  apiKey: string
): Promise<DiscoveredEvent[]> {
  const cantonName = canton ? CANTON_NAMES[canton] || canton : "Suisse";
  const query = `evenements animaux chiens chats ${cantonName} Suisse`;
  const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&location=Switzerland&hl=fr&gl=ch&num=8&api_key=${apiKey}`;

  const res = await fetch(url);
  if (!res.ok) return [];

  const data = await res.json();
  if (!data.organic_results) return [];

  return data.organic_results.slice(0, 8).map((item: any, i: number) => ({
    id: `serp-${canton || "ch"}-${i}`,
    title: item.title || "",
    snippet: item.snippet || "",
    url: item.link || "",
    source: item.displayed_link?.replace("https://", "").replace("www.", "").split("/")[0] || "",
    canton: canton || "CH",
    image: item.thumbnail || undefined,
  }));
}
