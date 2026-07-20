"use client";
import { useEffect, useState } from "react";
import type { GamePlayer } from "@/types";
import { playFanfare } from "@/lib/sfx";

export default function Podium({ players, withSound = true }: { players: Record<string, GamePlayer>; withSound?: boolean }) {
  const ranked = Object.values(players || {}).sort((a, b) => b.score - a.score);
  const [stage, setStage] = useState(0);

  // Reveal one by one: 3rd → 2nd → 1st (biggest fanfare last)
  useEffect(() => {
    const t1 = setTimeout(() => { setStage(1); if (withSound) playFanfare(false); }, 500);
    const t2 = setTimeout(() => { setStage(2); if (withSound) playFanfare(false); }, 2000);
    const t3 = setTimeout(() => { setStage(3); if (withSound) playFanfare(true); }, 3500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [withSound]);

  const slots = [ranked[2], ranked[1], ranked[0]];
  const ht = ["h-16", "h-24", "h-32"];
  const bg = ["bg-orange-500", "bg-gray-400", "bg-yellow-400"];
  const md = ["🥉", "🥈", "🥇"];
  const lb = ["3rd", "2nd", "1st"];
  const showAt = [1, 2, 3];

  return (
    <div className="flex items-end justify-center gap-4 mb-8 min-h-[180px]">
      {slots.map((p, i) =>
        p ? (
          <div
            key={p.id}
            className={
              "flex flex-col items-center transition-all duration-700 " +
              (stage >= showAt[i] ? "opacity-100 translate-y-0 " : "opacity-0 translate-y-10 ") +
              (i === 2 && stage >= 3 ? "animate-bounce" : "")
            }
          >
            <div className="text-3xl mb-1">{md[i]}</div>
            <div className="font-bold text-white text-sm mb-1 truncate max-w-[90px]" dir="auto">{p.nickname}</div>
            <div className="text-white/80 text-xs mb-2">{p.score.toLocaleString()} pts</div>
            <div className={["w-24", ht[i], bg[i], "rounded-t-xl flex items-center justify-center font-black text-white text-xl"].join(" ")}>
              {lb[i]}
            </div>
          </div>
        ) : null
      )}
    </div>
  );
}
