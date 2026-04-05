import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: ["/api/", "/profile/", "/admin/", "/matches/"],
      },
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/profile/", "/admin/", "/matches/"],
      },
    ],
    sitemap: "https://pawlyapp.ch/sitemap.xml",
  };
}
