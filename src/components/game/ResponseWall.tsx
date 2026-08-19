"use client";

export default function ResponseWall({ responses }: { responses: Record<string, any> }) {
  const items = Object.values(responses || {})
    .filter((r: any) => r && String(r.text || "").trim())
    .sort((a: any, b: any) => (b.ts || 0) - (a.ts || 0));
  if (!items.length) return <p className="text-white/50 text-center text-xl">Waiting for responses…</p>;
  const colors = ["bg-kahoot-red", "bg-kahoot-blue", "bg-kahoot-green", "bg-kahoot-purple", "bg-pink-500", "bg-cyan-600"];
  return (
    <div className="w-full">
      <div className="columns-1 sm:columns-2 md:columns-3 gap-3">
        {items.slice(0, 60).map((r: any, i: number) => (
          <div key={i} dir="auto" className={"break-inside-avoid mb-3 rounded-2xl p-4 text-white font-semibold shadow-lg " + colors[i % colors.length]}>
            {r.text}
          </div>
        ))}
      </div>
      <p className="text-center text-white/50 mt-3 text-sm">{items.length} response{items.length === 1 ? "" : "s"}</p>
    </div>
  );
}
