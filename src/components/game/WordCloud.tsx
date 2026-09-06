"use client";
import { useLang } from "@/contexts/LanguageContext";
import type { ReactNode } from "react";

export default function WordCloud({ responses }: { responses: Record<string, any> }) {
  const { t } = useLang();
  const counts: Record<string, number> = {};
  Object.values(responses || {}).forEach((r: any) => {
    const w = String((r && r.text) || "").trim();
    if (!w) return;
    const key = w.toLowerCase();
    counts[key] = (counts[key] || 0) + 1;
  });
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 40);
  const total = Object.values(responses || {}).length;
  const max = entries.length ? entries[0][1] : 1;
  const colors = ["#e21b3c", "#1368ce", "#26890c", "#ffa602", "#9c27b0", "#00b8d4", "#ff4fa3"];
  if (!entries.length) {
    return <p className="text-white/50 text-center text-xl">{t("Waiting for words…")}</p> as ReactNode;
  }
  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-x-5 gap-y-2 justify-center items-center content-center">
        {entries.map(([word, n], i) => (
          <span
            key={word}
            dir="auto"
            className="font-black leading-none transition-all"
            style={{ fontSize: (1 + (n / max) * 3) + "rem", color: colors[i % colors.length] }}
          >
            {word}
          </span>
        ))}
      </div>
      <p className="text-center text-white/50 mt-4 text-sm">{total} response{total === 1 ? "" : "s"}</p>
    </div>
  );
}
