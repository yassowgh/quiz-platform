"use client";
import { useEffect, useRef, useState } from "react";
import { rtdb } from "@/lib/firebase";
import { ref, push, onChildAdded, query, limitToLast } from "firebase/database";

const EMOJIS = ["\uD83D\uDC4D", "\uD83D\uDE02", "\u2764\uFE0F", "\uD83D\uDE2E", "\uD83D\uDD25", "\uD83D\uDC4F"];

export function ReactionBar({ gameId }: { gameId: string }) {
  if (!gameId) return null;
  const send = (e: string) => { try { push(ref(rtdb, "games/" + gameId + "/reactions"), { e, t: Date.now() }); } catch {} };
  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 flex gap-1 bg-black/40 backdrop-blur rounded-full px-2 py-1 z-40">
      {EMOJIS.map((e) => (
        <button key={e} type="button" onClick={() => send(e)} className="text-2xl px-1 active:scale-125 transition-transform" aria-label="react">{e}</button>
      ))}
    </div>
  );
}

export function ReactionOverlay({ gameId }: { gameId: string }) {
  const [items, setItems] = useState<{ id: number; e: string; x: number }[]>([]);
  useEffect(() => {
    if (!gameId) return;
    const q = query(ref(rtdb, "games/" + gameId + "/reactions"), limitToLast(1));
    const start = Date.now();
    const off = onChildAdded(q, (snap) => {
      const v: any = snap.val() || {};
      if (!v.t || v.t < start - 1500) return;
      const id = Math.random();
      const x = 4 + Math.random() * 90;
      setItems((it) => [...it, { id, e: v.e || "\uD83D\uDC4D", x }]);
      setTimeout(() => setItems((it) => it.filter((o) => o.id !== id)), 3000);
    });
    return () => off();
  }, [gameId]);
  return (
    <div className="pointer-events-none fixed inset-0 z-30 overflow-hidden">
      {items.map((it) => (
        <span key={it.id} className="absolute bottom-4 text-4xl" style={{ left: it.x + "%", animation: "floatUp 3s ease-out forwards" }}>{it.e}</span>
      ))}
    </div>
  );
}
