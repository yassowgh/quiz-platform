"use client";
import { useLang } from "@/contexts/LanguageContext";

export default function RatingResult({ responses }: { responses: Record<string, any> }) {
  const { t } = useLang();
  const nums = Object.values(responses || {})
    .map((r: any) => Number((r && r.text) || 0))
    .filter((n) => n >= 1 && n <= 5);
  const total = nums.length;
  const avg = total ? nums.reduce((a, b) => a + b, 0) / total : 0;
  const dist = [1, 2, 3, 4, 5].map((s) => nums.filter((n) => n === s).length);
  const max = Math.max(1, ...dist);
  if (!total) return <p className="text-white/50 text-center text-xl">{t("Waiting for ratings…")}</p>;
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-4">
        <span className="text-6xl font-black text-kahoot-yellow">{avg.toFixed(1)}</span>
        <span className="text-white/60 text-2xl"> / 5</span>
      </div>
      <div className="flex flex-col gap-2">
        {[5, 4, 3, 2, 1].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <span className="w-12 text-right text-sm">{s} ⭐</span>
            <div className="flex-1 bg-white/10 rounded-full h-4">
              <div className="bg-kahoot-yellow h-4 rounded-full transition-all" style={{ width: (dist[s - 1] / max) * 100 + "%" }} />
            </div>
            <span className="w-8 text-sm text-white/70">{dist[s - 1]}</span>
          </div>
        ))}
      </div>
      <p className="text-center text-white/50 mt-3 text-sm">{total} rating{total === 1 ? "" : "s"}</p>
    </div>
  );
}
