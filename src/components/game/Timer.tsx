"use client";
import { useEffect, useRef } from "react";
import { useCountdown } from "@/hooks/useCountdown";
import { cn } from "@/lib/utils";

interface TimerProps {
  durationSeconds: number;
  startTime: number;
  onExpire?: () => void;
  className?: string;
}

export default function Timer({ durationSeconds, startTime, onExpire, className }: TimerProps) {
  const { fraction, seconds } = useCountdown(durationSeconds * 1000, startTime);
  const firedRef = useRef(false);

  useEffect(() => {
    if (seconds === 0 && !firedRef.current && onExpire) {
      firedRef.current = true;
      onExpire();
    }
  }, [seconds, onExpire]);

  useEffect(() => {
    firedRef.current = false;
  }, [startTime]);

  const color = fraction > 0.5 ? "bg-kahoot-green" : fraction > 0.25 ? "bg-kahoot-yellow" : "bg-kahoot-red";

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div className="text-4xl font-black tabular-nums">{seconds}</div>
      <div className="w-full h-3 bg-white/30 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${fraction * 100}%` }}
        />
      </div>
    </div>
  );
}