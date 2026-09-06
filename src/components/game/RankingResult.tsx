"use client";
import { useLang } from "@/contexts/LanguageContext";

export default function RankingResult({ options, responses }: { options: string[]; responses: Record<string, any> }) {
  const { t } = useLang();
  const opts = (options || []).filter((o) => o && o.trim());
  const sums = opts.map(() => 0);
  const cnts = opts.map(() => 0);
  Object.values(responses || {}).forEach((r: any) => {
    let order: number[] = [];
    try { order = JSON.parse((r && r.text) || "[]"); } catch (e) { return; }
    if (!Array.isArray(order)) return;
    order.forEach((optIdx: number, pos: number) => {
      if (optIdx >= 0 && optIdx < opts.length) { sums[optIdx] += pos + 1; cnts[optIdx] += 1; }
    });
  });
  const total = Math.max(0, ...cnts);
  const ranked = opts.map((o, i) => ({ o, i, avg: cnts[i] ? sums[i] / cnts[i] : opts.length + 1 })).sort((a, b) => a.avg - b.avg);
  if (!total) return <p className="text-white/50 text-center text-xl">{t("Waiting for rankings…")}</p>;
  return (
    <div className="w-full max-w-xl mx-auto flex flex-col gap-2">
      {ranked.map((r, pos) => (
        <div key={r.i} className="flex items-center gap-3 bg-white rounded-xl p-4 border border-gray-100">
          <span className="w-9 h-9 rounded-full bg-kahoot-purple text-white flex items-center justify-center font-black shrink-0">{pos + 1}</span>
          <span className="flex-1 font-semibold text-gray-800" dir="auto">{r.o}</span>
          <span className="text-gray-400 text-sm shrink-0">avg {r.avg.toFixed(1)}</span>
        </div>
      ))}
    </div>
  );
}
