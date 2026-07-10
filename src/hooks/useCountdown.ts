import { useEffect, useRef, useState, useCallback } from "react";

interface CountdownResult {
  elapsed: number;
  remaining: number;
  fraction: number;
  seconds: number;
}

export function useCountdown(durationMs: number, startTime: number): CountdownResult {
  const [elapsed, setElapsed] = useState(0);
  const rafRef = useRef<number>(0);

  const tick = useCallback(() => {
    const e = Math.min(Date.now() - startTime, durationMs);
    setElapsed(e);
    if (e < durationMs) {
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [durationMs, startTime]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tick]);

  const remaining = Math.max(0, durationMs - elapsed);
  const fraction = remaining / durationMs;
  const seconds = Math.ceil(remaining / 1000);

  return { elapsed, remaining, fraction, seconds };
}