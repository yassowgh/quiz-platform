"use client";
import { useEffect } from "react";
import type { GamePlayer } from "@/types";
import { playFanfare } from "@/lib/sfx";

export default function Podium({ players, withSound = true }: { players: Record<string, GamePlayer>; withSound?: boolean }) {
  const ranked = Object.values(players || {}).sort((a, b) => b.score - a.score);

  // Staggered celebrations: 3rd, then 2nd, then the big one for 1st
  useEffect(() => {
    if (!withSound) return;
    const t1 = setTimeout(() => playFanfare(false), 200);
    const t2 = setTimeout(() => playFanfare(false), 1300);
    const t3 = setTimeout(() => playFanfare(true), 2500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [withSound]);

  const slots = [ranked[2], ranked[1], ranked[0]];
  const ht = ["h-16", "h-24", "h-32"];
  const bg = ["bg-orange-500", "bg-gray-400", "bg-yellow-400"];
  const md = ["\u{1F949}", "\u{1F948}", "\u{1F947}"];
  const lb = ["3rd", "2nd", "1st"];

  return (
    <div className="flex items-end justify-center gap-4 mb-8">
      {slots.map((p, i) =>
        p ? (
          <div key={p.id} className={"flex flex-col items-center" + (i === 2 ? " animate-bounce" : "")}>
            <div className="text-3xl mb-1">{md[i]}</div>
            <div className="font-bold text-white text-sm mb-1 truncate max-w-[90px]">{p.nickname}</div>
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
