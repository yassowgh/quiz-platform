"use client";
import { rankPlayers } from "@/lib/scoring";
import { ordinal } from "@/lib/utils";
import type { GamePlayer } from "@/types";
import { cn } from "@/lib/utils";

interface LeaderboardProps {
  players: Record<string, GamePlayer>;
  currentPlayerId?: string;
  limit?: number;
}

export default function Leaderboard({ players, currentPlayerId, limit = 10 }: LeaderboardProps) {
  const all = rankPlayers(Object.values(players));
  const ranked = all.slice(0, limit);
  const medals = ["🥇", "🥈", "🥉"];
  const myIndex = currentPlayerId ? all.findIndex((p) => p.id === currentPlayerId) : -1;
  const me = myIndex >= limit ? all[myIndex] : null;

  return (
    <div className="flex flex-col gap-2">
      {ranked.map((player, i) => (
        <div
          key={player.id}
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-lg",
            player.id === currentPlayerId ? "bg-kahoot-yellow text-black" : "bg-white/20 text-white"
          )}
        >
          <span className="w-8 text-center text-xl">{medals[i] || ordinal(i + 1)}</span>
          <span className="flex-1" dir="auto">{player.nickname}</span>
          <span className="tabular-nums">{player.score.toLocaleString()} pts</span>
        </div>
      ))}
      {me && (
        <>
          <div className="text-center text-white/40 text-sm py-1">• • •</div>
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-lg bg-kahoot-yellow text-black">
            <span className="w-8 text-center text-xl">{ordinal(myIndex + 1)}</span>
            <span className="flex-1" dir="auto">{me.nickname}</span>
            <span className="tabular-nums">{me.score.toLocaleString()} pts</span>
          </div>
        </>
      )}
    </div>
  );
}
