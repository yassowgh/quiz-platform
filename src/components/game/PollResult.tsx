"use client";

export default function PollResult({ options, answers }: { options: string[]; answers: Record<string, any> }) {
  const opts = (options || []).filter((o) => o && o.trim());
  const counts = opts.map((_, i) => Object.values(answers || {}).filter((a: any) => a && Number(a.answerIndex) === i).length);
  const total = counts.reduce((a, b) => a + b, 0);
  const max = Math.max(1, ...counts);
  const colors = ["#2b2d6e", "#fb5c5c", "#4f6bed", "#1a9e5f", "#e0a80d", "#8e44ad"];
  return (
    <div className="w-full flex flex-col gap-5 py-1">
      {opts.map((opt, i) => (
        <div key={i} className="flex items-start gap-3 sm:gap-4">
          <span className="w-6 text-right text-gray-400 font-bold text-2xl leading-none pt-8">{i + 1}.</span>
          <div className="flex-1 min-w-0">
            <div className="text-gray-700 font-semibold mb-1 text-lg truncate" dir="auto">{opt}</div>
            <div className="bg-gray-100 rounded-lg h-11 overflow-hidden">
              <div className="h-11 rounded-lg transition-all duration-500" style={{ width: (total ? Math.max(3, (counts[i] / max) * 100) : 0) + "%", background: colors[i % colors.length] }} />
            </div>
          </div>
          <span className="w-14 text-right text-gray-500 font-bold pt-8">{total ? Math.round((counts[i] / total) * 100) + "%" : "0%"}</span>
        </div>
      ))}
    </div>
  );
}
