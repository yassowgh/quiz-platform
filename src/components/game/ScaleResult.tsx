"use client";
import { useLang } from "@/contexts/LanguageContext";

export default function ScaleResult({ responses, min = 0, max = 10, minLabel, maxLabel }: { responses: Record<string, any>; min?: number; max?: number; minLabel?: string; maxLabel?: string }) {
  const { t } = useLang();
  const lo = Math.min(min, max), hi = Math.max(min, max);
  const nums = Object.values(responses || {})
    .map((r: any) => Number((r && r.text) || 0))
    .filter((n) => !isNaN(n) && n >= lo && n <= hi);
  const total = nums.length;
  const avg = total ? nums.reduce((a, b) => a + b, 0) / total : 0;
  const vals: number[] = [];
  for (let v = lo; v <= hi && vals.length < 40; v++) vals.push(v);
  const dist = vals.map((v) => nums.filter((n) => n === v).length);
  const mx = Math.max(1, ...dist);
  if (!total) return <p className="text-white/50 text-center text-xl">{t("Waiting for responses…")}</p>;
  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="text-center mb-4">
        <span className="text-6xl font-black text-kahoot-yellow">{avg.toFixed(1)}</span>
        <span className="text-white/60 text-2xl"> {t("avg")}</span>
      </div>
      <div className="flex items-end gap-1 h-32">
        {vals.map((v, i) => (
          <div key={v} className="flex-1 flex flex-col items-center gap-1 min-w-0">
            <span className="text-white/70 text-xs">{dist[i] || ""}</span>
            <div className="w-full bg-kahoot-yellow rounded-t transition-all" style={{ height: Math.max(2, (dist[i] / mx) * 100) + "%" }} />
            <span className="text-white/50 text-[10px]">{v}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-between text-white/60 text-xs mt-1">
        <span dir="auto">{minLabel || lo}</span>
        <span dir="auto">{maxLabel || hi}</span>
      </div>
      <p className="text-center text-white/50 mt-3 text-sm">{total} {t("responses")}</p>
    </div>
  );
}
