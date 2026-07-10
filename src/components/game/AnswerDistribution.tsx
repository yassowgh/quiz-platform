"use client";
import { ANSWER_COLORS } from "@/types";
import type { PlayerAnswer } from "@/types";

interface AnswerDistributionProps {
  answers: Record<string, PlayerAnswer>;
  totalPlayers: number;
  correctAnswer: number;
  options: string[];
}

export default function AnswerDistribution({ answers, totalPlayers, correctAnswer, options }: AnswerDistributionProps) {
  const counts = [0, 0, 0, 0];
  Object.values(answers).forEach((a) => { if (a.answerIndex >= 0) counts[a.answerIndex]++; });
  const max = Math.max(...counts, 1);

  return (
    <div className="flex items-end gap-3 h-40">
      {counts.slice(0, options.length).map((count, i) => {
        const pct = (count / max) * 100;
        const color = ANSWER_COLORS[i];
        const isCorrect = i === correctAnswer;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-white font-bold">{count}</span>
            <div
              className={`w-full rounded-t-lg transition-all ${color.bg} ${isCorrect ? "ring-4 ring-white" : ""}`}
              style={{ height: `${Math.max(pct, 4)}%` }}
            />
            <span className="text-2xl">{color.shape}</span>
          </div>
        );
      })}
    </div>
  );
}