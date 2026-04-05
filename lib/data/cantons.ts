export type CantonData = {
  slug: string;
  name: string;
  code: string;
  cities: string[];
};

export const CANTONS_SEO: CantonData[] = [
  { slug: "geneve", name: "Geneve", code: "GE", cities: ["Geneve", "Carouge", "Lancy", "Meyrin", "Vernier", "Onex"] },
  { slug: "vaud", name: "Vaud", code: "VD", cities: ["Lausanne", "Montreux", "Nyon", "Morges", "Yverdon-les-Bains", "Renens", "Vevey"] },
  { slug: "zurich", name: "Zurich", code: "ZH", cities: ["Zurich", "Winterthur", "Uster", "Dubendorf", "Dietikon", "Wadenswil"] },
  { slug: "berne", name: "Berne", code: "BE", cities: ["Berne", "Biel/Bienne", "Thoune", "Koniz", "Langenthal"] },
  { slug: "valais", name: "Valais", code: "VS", cities: ["Sion", "Sierre", "Martigny", "Monthey", "Visp"] },
  { slug: "fribourg", name: "Fribourg", code: "FR", cities: ["Fribourg", "Bulle", "Villars-sur-Glane", "Marly"] },
  { slug: "neuchatel", name: "Neuchatel", code: "NE", cities: ["Neuchatel", "La Chaux-de-Fonds", "Le Locle"] },
  { slug: "tessin", name: "Ticino", code: "TI", cities: ["Lugano", "Bellinzona", "Locarno", "Mendrisio", "Chiasso"] },
  { slug: "bale", name: "Bale", code: "BS", cities: ["Bale", "Riehen", "Allschwil", "Binningen"] },
  { slug: "lucerne", name: "Lucerne", code: "LU", cities: ["Lucerne", "Emmen", "Kriens", "Horw"] },
  { slug: "argovie", name: "Argovie", code: "AG", cities: ["Aarau", "Baden", "Wettingen", "Wohlen"] },
  { slug: "saint-gall", name: "Saint-Gall", code: "SG", cities: ["Saint-Gall", "Rapperswil-Jona", "Wil", "Gossau"] },
  { slug: "soleure", name: "Soleure", code: "SO", cities: ["Soleure", "Olten", "Grenchen"] },
  { slug: "jura", name: "Jura", code: "JU", cities: ["Delemont", "Porrentruy"] },
];

export function getCantonBySlug(slug: string): CantonData | undefined {
  return CANTONS_SEO.find((c) => c.slug === slug);
}

export function getCitySlug(city: string): string {
  return city
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[àâä]/g, "a")
    .replace(/[éèêë]/g, "e")
    .replace(/[îï]/g, "i")
    .replace(/[ôö]/g, "o")
    .replace(/[ùûü]/g, "u")
    .replace(/[ç]/g, "c")
    .replace(/[^a-z0-9-]/g, "");
}

export function findCityInCanton(canton: CantonData, citySlug: string): string | undefined {
  return canton.cities.find((c) => getCitySlug(c) === citySlug);
}
