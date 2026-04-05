import { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { CANTONS_SEO, getCitySlug } from "@/lib/data/cantons";

const BASE_URL = "https://pawlyapp.ch";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/login`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/signup`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/pricing`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/carte`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/flairer`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/events`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/animals`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/matches`, lastModified: new Date(), changeFrequency: "daily", priority: 0.6 },
    { url: `${BASE_URL}/legal/cgu`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/legal/privacy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  ];

  // SEO canton & city pages
  const cantonRoutes: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/animaux`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ];

  for (const canton of CANTONS_SEO) {
    cantonRoutes.push({
      url: `${BASE_URL}/animaux/${canton.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    });

    for (const city of canton.cities) {
      cantonRoutes.push({
        url: `${BASE_URL}/animaux/${canton.slug}/${getCitySlug(city)}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  }

  // Fetch all animals for dynamic routes
  let animalRoutes: MetadataRoute.Sitemap = [];
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: animals } = await supabase
      .from("animals")
      .select("id, updated_at")
      .order("created_at", { ascending: false });

    if (animals) {
      animalRoutes = animals.map((animal) => ({
        url: `${BASE_URL}/animals/${animal.id}`,
        lastModified: animal.updated_at ? new Date(animal.updated_at) : new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.6,
      }));
    }
  } catch (e) {
    console.error("Sitemap: failed to fetch animals", e);
  }

  return [...staticRoutes, ...cantonRoutes, ...animalRoutes];
}
