import type { MetadataRoute } from "next";
export const dynamic = "force-static";
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://quizups.com";
  const now = new Date();
  const vs = ["kahoot", "quizizz", "blooket", "gimkit"].map((s) => ({ url: base + "/vs/" + s, lastModified: now, changeFrequency: "monthly" as const, priority: 0.8 }));
  return [
    { url: base, lastModified: now, changeFrequency: "weekly", priority: 1 },
    ...vs,
  ];
}
