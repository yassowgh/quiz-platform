import { useEffect, useState } from "react";
import { subscribeToGame } from "@/lib/realtimeDb";
import { isValidGameId } from "@/lib/utils";
import type { LiveGameState } from "@/types";

export function useGame(gameId: string | null) {
  const [state, setState] = useState<LiveGameState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // A malformed id (e.g. a pasted URL) makes Firebase throw on ref(),
    // which would take down the whole React tree. Never subscribe to one.
    if (!gameId || !isValidGameId(gameId)) { setLoading(false); return; }
    let unsub: (() => void) | undefined;
    try {
      unsub = subscribeToGame(gameId, (s) => {
        setState(s);
        setLoading(false);
      });
    } catch {
      setLoading(false);
      return;
    }
    return unsub;
  }, [gameId]);

  return { state, loading };
}