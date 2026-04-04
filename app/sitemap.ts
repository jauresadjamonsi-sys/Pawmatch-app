import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://pawlyapp.ch", lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: "https://pawlyapp.ch/flairer", lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: "https://pawlyapp.ch/animals", lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: "https://pawlyapp.ch/events", lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: "https://pawlyapp.ch/pricing", lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: "https://pawlyapp.ch/signup", lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  ];
}
