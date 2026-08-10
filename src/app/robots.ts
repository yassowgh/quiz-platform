import type { MetadataRoute } from "next";
export const dynamic = "force-static";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/dashboard", "/admin", "/reports", "/quiz/", "/host/", "/play", "/join", "/game/", "/assignment", "/watch", "/study", "/login", "/signup"] }],
    sitemap: "https://quizups.com/sitemap.xml",
    host: "https://quizups.com",
  };
}
