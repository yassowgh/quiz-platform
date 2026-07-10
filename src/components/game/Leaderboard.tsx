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
  const ranked = rankPlayers(Object.values(players)).slice(0, limit);
  const medals = ["🥇", "🥈", "🥉"];

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
          <span className="flex-1">{player.nickname}</span>
          {player.streak >= 3 && <span title="On a streak!">🔥</span>}
          <span className="tabular-nums">{player.score.toLocaleString()} pts</span>
        </div>
      ))}
    </div>
  );
}