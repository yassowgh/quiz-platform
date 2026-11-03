import type { MetadataRoute } from "next";
export const dynamic = "force-static";

// Keep in step with DATA in src/app/vs/[slug]/page.tsx
const VS_SLUGS = ["kahoot", "quizizz", "blooket", "gimkit", "mentimeter", "slido", "quizlet", "socrative", "wordwall"];
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://quizups.com";
  const now = new Date();
  const vs = VS_SLUGS.map((s) => ({ url: base + "/vs/" + s, lastModified: now, changeFrequency: "monthly" as const, priority: 0.8 }));
  const pages = ["/fun", "/trivia", "/family", "/features", "/pricing", "/about"].map((p) => ({ url: base + p, lastModified: now, changeFrequency: "monthly" as const, priority: 0.7 }));
  return [
    { url: base, lastModified: now, changeFrequency: "weekly", priority: 1, alternates: { languages: { ar: base + "/ar", uk: base + "/uk", fr: base + "/fr", de: base + "/de", tr: base + "/tr" } } },
    ...["/ar", "/uk", "/fr", "/de", "/tr"].map((p) => ({ url: base + p, lastModified: now, changeFrequency: "weekly" as const, priority: 0.9 })),
    ...pages,
    ...vs,
  ];
}
