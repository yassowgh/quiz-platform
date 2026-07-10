"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useGame } from "@/hooks/useGame";
import { submitAnswer } from "@/lib/realtimeDb";
import type { GameStatus } from "@/types";
import AnswerButton from "@/components/game/AnswerButton";
import Timer from "@/components/game/Timer";
import Leaderboard from "@/components/game/Leaderboard";
import Confetti from "@/components/game/Confetti";
import Card from "@/components/ui/Card";

export function generateStaticParams() { return []; }


export default function PlayPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.gameId as string;
  const { state } = useGame(gameId);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [nickname, setNickname] = useState<string>("");
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [timerKey, setTimerKey] = useState(0);

  useEffect(() => {
    const pid = sessionStorage.getItem("playerId");
    const nick = sessionStorage.getItem("nickname");
    if (!pid || !nick) { router.push("/"); return; }
    setPlayerId(pid);
    setNickname(nick);
  }, [router]);

  useEffect(() => {
    if (state?.status === "question") {
      setSelectedAnswer(null);
      setTimerKey((k) => k + 1);
    }
  }, [state?.status, state?.currentQuestionIndex]);

  const handleAnswer = async (index: number) => {
    if (!state || !playerId || selectedAnswer !== null) return;
    if (state.status !== "question") return;
    const q = state.currentQuestionIndex;
    const question = (state as any)._quiz?.questions?.[q];
    const timeTaken = Date.now() - state.questionStartTime;
    const timeLimit = question?.timeLimit || 20;
    const isCorrect = question ? index === question.correctAnswer : false;
    setSelectedAnswer(index);
    await submitAnswer(gameId, q, playerId, index, timeTaken, timeLimit, isCorrect);
  };

  const myPlayer = state && playerId ? state.players[playerId] : null;
  const answerMap = state && state.currentQuestionIndex >= 0 ? (state.answers?.[state.currentQuestionIndex] || {}) : {};
  const myAnswer = playerId ? answerMap[playerId] : null;

  if (!state) return (
    <div className="min-h-[calc(100vh-64px)] bg-kahoot-dark flex items-center justify-center">
      <p className="text-white text-2xl font-bold animate-pulse">Connecting...</p>
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-64px)] bg-kahoot-dark text-white flex flex-col">
      {state.status === "lobby" && (
        <div className="flex flex-col items-center justify-center flex-1 gap-4 p-6">
          <div className="text-6xl">ð®</div>
          <h1 className="text-3xl font-black">{nickname}</h1>
          <p className="text-white/60 text-xl animate-pulse">Waiting for host to start...</p>
        </div>
      )}

      {state.status === "question" && (
        <div className="flex flex-col flex-1 p-4 gap-4">
          <div className="flex justify-between items-center">
            <span className="text-white/70 font-semibold">Q {state.currentQuestionIndex + 1}</span>
            <span className="font-bold">{myPlayer?.score.toLocaleString() ?? 0} pts</span>
          </div>
          <Timer key={timerKey} durationSeconds={20} startTime={state.questionStartTime} className="mb-2" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
            {[0, 1, 2, 3].map((i) => (
              <AnswerButton
                key={i}
                index={i}
                text={selectedAnswer !== null ? (i === selectedAnswer ? "Your answer" : "") : "Tap to answer"}
                selected={selectedAnswer === i}
                disabled={selectedAnswer !== null}
                onClick={() => handleAnswer(i)}
              />
            ))}
          </div>
          {selectedAnswer !== null && (
            <p className="text-center text-white/70 font-semibold animate-pulse">Waiting for results...</p>
          )}
        </div>
      )}

      {state.status === "answer_reveal" && (
        <div className="flex flex-col items-center justify-center flex-1 gap-6 p-6">
          {myAnswer ? (
            <>
              <div className="text-6xl">{myAnswer.isCorrect ? "â" : "â"}</div>
              <h2 className="text-3xl font-black">{myAnswer.isCorrect ? "Correct!" : "Wrong!"}</h2>
              {myAnswer.isCorrect && (
                <p className="text-2xl font-bold text-kahoot-yellow">+{myAnswer.pointsEarned} pts</p>
              )}
            </>
          ) : (
            <h2 className="text-3xl font-black">Time's up!</h2>
          )}
          <p className="text-white/60">Total: {myPlayer?.score.toLocaleString() ?? 0} pts</p>
        </div>
      )}

      {state.status === "leaderboard" && (
        <div className="p-6">
          <h2 className="text-3xl font-black text-center mb-6">Leaderboard</h2>
          <Leaderboard players={state.players} currentPlayerId={playerId ?? undefined} />
        </div>
      )}

      {state.status === "podium" && (
        <div className="flex flex-col items-center justify-center flex-1 p-6 text-center">
          <Confetti />
          <h2 className="text-4xl font-black mb-8">ð Game Over!</h2>
          <Leaderboard players={state.players} currentPlayerId={playerId ?? undefined} limit={5} />
        </div>
      )}

      {state.status === "ended" && (
        <div className="flex flex-col items-center justify-center flex-1 p-6 text-center">
          <h2 className="text-4xl font-black mb-4">Thanks for playing!</h2>
          <p className="text-white/60 mb-6">Final score: {myPlayer?.score.toLocaleString() ?? 0} pts</p>
          <a href="/" className="text-kahoot-yellow font-bold text-xl hover:underline">Play again â</a>
        </div>
      )}
    </div>
  );
}