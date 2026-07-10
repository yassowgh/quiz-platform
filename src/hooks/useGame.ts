import { useEffect, useState } from "react";
import { subscribeToGame } from "@/lib/realtimeDb";
import type { LiveGameState } from "@/types";

export function useGame(gameId: string | null) {
  const [state, setState] = useState<LiveGameState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gameId) return;
    const unsub = subscribeToGame(gameId, (s) => {
      setState(s);
      setLoading(false);
    });
    return unsub;
  }, [gameId]);

  return { state, loading };
}