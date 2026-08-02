"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getQuiz } from "@/lib/firestore";
import type { Quiz } from "@/types";
import Button from "@/components/ui/Button";
import MathText from "@/components/ui/MathText";

export default function StudyClient() {
  const params = useSearchParams();
  const quizId = params.get("quizId") || "";
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<number[]>([]);
  const [i, setI] = useState(0);
  const [flip, setFlip] = useState(false);

  useEffect(() => {
    if (!quizId) { setError("No quiz specified."); return; }
    getQuiz(quizId).then((q) => {
      if (!q) { setError("Quiz not found or not shared."); return; }
      const playable = ((q.questions || []) as any[]).filter((qq) => qq.text && qq.text.trim());
      setQuiz({ ...q, questions: playable } as Quiz);
      setOrder(playable.map((_, idx) => idx));
    }).catch(() => setError("Could not load this quiz."));
  }, [quizId]);

  const cards: any[] = (quiz?.questions || []) as any[];
  const shuffle = () => { const o = order.slice(); for (let k = o.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); const t = o[k]; o[k] = o[j]; o[j] = t; } setOrder(o); setI(0); setFlip(false); };
  const answerOf = (q: any) => (q.type === "typeanswer" ? (q.correctText || "") : ((q.options || [])[Number(q.correctAnswer ?? 0)] || ""));

  if (error) return <div className="p-10 text-center text-red-400 font-semibold">{error}</div>;
  if (!quiz) return <div className="p-10 text-center text-gray-500 font-bold">Loading…</div>;
  if (!cards.length) return <div className="p-10 text-center text-gray-500 font-bold">No questions to study yet.</div>;
  const q: any = cards[order[i]] || cards[0];

  return (
    <div className="min-h-[calc(100vh-64px)] bg-kahoot-dark bg-grid-pattern flex flex-col items-center justify-center p-6 text-white">
      <div className="w-full max-w-lg">
        <div className="flex justify-between items-center mb-3">
          <span className="font-bold truncate">{quiz.title}</span>
          <span className="text-white/70 text-sm">{i + 1} / {cards.length}</span>
        </div>
        <button type="button" onClick={() => setFlip((f) => !f)} className="w-full min-h-[220px] bg-white text-gray-900 rounded-2xl p-6 flex items-center justify-center text-center shadow-lg">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">{flip ? "Answer" : "Question"} — tap to flip</p>
            <p className="text-2xl font-black" dir="auto"><MathText text={flip ? answerOf(q) : q.text} /></p>
          </div>
        </button>
        <div className="flex gap-2 mt-4">
          <Button variant="secondary" className="flex-1" disabled={i === 0} onClick={() => { setI(i - 1); setFlip(false); }}>← Prev</Button>
          <Button variant="secondary" onClick={shuffle}>🔀</Button>
          <Button className="flex-1" disabled={i >= cards.length - 1} onClick={() => { setI(i + 1); setFlip(false); }}>Next →</Button>
        </div>
      </div>
    </div>
  );
}
