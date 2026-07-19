"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getQuiz } from "@/lib/firestore";
import { startQuestion, revealAnswer, showLeaderboard, showPodium, endGame, resetPlayerAnswered } from "@/lib/realtimeDb";
import { saveGameRecord } from "@/lib/firestore";
import { useGame } from "@/hooks/useGame";
import { rankPlayers } from "@/lib/scoring";
import type { Quiz } from "@/types";
import Timer from "@/components/game/Timer";
import AnswerDistribution from "@/components/game/AnswerDistribution";
import Leaderboard from "@/components/game/Leaderboard";
import Confetti from "@/components/game/Confetti";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { ANSWER_COLORS } from "@/types";

export default function HostPlayPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const gameId = searchParams.get("gameId") || "";
  const quizId = searchParams.get("quizId") || "";
  const { state } = useGame(gameId);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [timerKey, setTimerKey] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (quizId) getQuiz(quizId).then(setQuiz);
  }, [quizId]);

  const currentQ = quiz && state ? quiz.questions[state.currentQuestionIndex] : null;
  const players = state?.players ? Object.values(state.players) : [];
  const answers = state && state.currentQuestionIndex >= 0 ? (state.answers?.[state.currentQuestionIndex] || {}) : {};
  const answeredCount = Object.keys(answers).length;

  const nextQuestion = useCallback(async () => {
    if (!state || !quiz) return;
    const next = state.currentQuestionIndex + 1;
    if (next >= quiz.questions.length) {
      await showPodium(gameId);
    } else {
      await resetPlayerAnswered(gameId, state.players);
      await startQuestion(gameId, next);
      setTimerKey((k) => k + 1);
    }
  }, [state, quiz, gameId]);

  const handleStart = async () => {
    if (!state || !quiz) return;
    await resetPlayerAnswered(gameId, state.players);
    await startQuestion(gameId, 0);
    setTimerKey((k) => k + 1);
  };

  const handleEnd = async () => {
    if (!state) return;
    const ranked = rankPlayers(players);
    await saveGameRecord({
      quizId,
      hostId: user?.uid,
      players: ranked,
      pin: state.pin,
      totalQuestions: quiz?.questions.length || 0,
    });
    await endGame(gameId, state.pin);
    router.push("/dashboard");
  };

  const handleReveal = () => revealAnswer(gameId);
  const handleLeaderboard = () => showLeaderboard(gameId);

  // Background music during question phase
  useEffect(() => {
    if (state?.status !== "question") return;
    const audio = new Audio("/music.mp3");
    audio.loop = true;
    audio.volume = 0.4;
    const tryPlay = () => audio.play().catch(() => {
      // Autoplay blocked: retry on first user interaction
      const resume = () => { audio.play().catch(() => {}); document.removeEventListener("click", resume); document.removeEventListener("touchstart", resume); };
      document.addEventListener("click", resume);
      document.addEventListener("touchstart", resume);
    });
    tryPlay();
    return () => { audio.pause(); audio.src = ""; };
  }, [state?.status]);

  // 3-2-1 countdown when a new question starts
  useEffect(() => {
    if (state?.status !== "question") { setCountdown(null); return; }
    setCountdown(3);
    const id = setInterval(() => {
      setCountdown((c) => {
        if (c === null || c <= 1) { clearInterval(id); return null; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [state?.status, state?.currentQuestionIndex]);

  // Auto-reveal once every player has answered
  useEffect(() => {
    if (state?.status === "question" && players.length > 0 && answeredCount >= players.length) {
      revealAnswer(gameId);
    }
  }, [answeredCount, players.length, state?.status, gameId]);

  if (!state) return <div className="flex items-center justify-center min-h-screen text-2xl font-bold text-white bg-kahoot-dark">Loading game...</div>;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-kahoot-dark text-white p-6">
      {countdown !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="text-9xl font-black text-white animate-bounce">{countdown}</div>
        </div>
      )}
      {state.status === "lobby" && (
        <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6">
          <Card className="text-center bg-white/10 text-white">
            <p className="text-2xl mb-2 font-semibold">PIN: <span className="font-black text-4xl tracking-widest">{state.pin}</span></p>
            <p className="text-white/70">{players.length} players waiting</p>
          </Card>
          <Button size="lg" onClick={handleStart} disabled={players.length === 0}> Start Game </Button>
        </div>
      )}
      {state.status === "question" && currentQ && (
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <span className="text-white/70">Q {state.currentQuestionIndex + 1}/{quiz?.questions.length}</span>
            <span className="text-white/70">{answeredCount}/{players.length} answered</span>
          </div>
          <Card className="mb-4 text-center text-gray-900">
            <h2 className="text-2xl font-black">{currentQ.text}</h2>
          </Card>
          <Timer
            key={timerKey}
            durationSeconds={currentQ.timeLimit}
            startTime={state.questionStartTime}
            onExpire={handleReveal}
            className="mb-4"
          />
          <div className="grid grid-cols-2 gap-3 mb-4">
            {currentQ.options.map((opt, i) => (
              <div key={i} className={`p-4 rounded-xl font-bold flex items-center gap-2 ${ANSWER_COLORS[i].bg} ${ANSWER_COLORS[i].text}`}>
                <span className="text-2xl">{ANSWER_COLORS[i].shape}</span> {opt}
              </div>
            ))}
          </div>
          <Button onClick={handleReveal} variant="secondary" className="w-full">Skip / Reveal</Button>
        </div>
      )}
      {state.status === "answer_reveal" && currentQ && (
        <div className="max-w-3xl mx-auto">
          <Card className="mb-4 text-center text-gray-900">
            <h2 className="text-2xl font-black mb-1">{currentQ.text}</h2>
            <p className="text-kahoot-green font-bold text-xl">✓ {currentQ.options[currentQ.correctAnswer]}</p>
          </Card>
          <div className="mb-6">
            <AnswerDistribution
              answers={answers}
              totalPlayers={players.length}
              correctAnswer={currentQ.correctAnswer}
              options={currentQ.options}
            />
          </div>
          <Button onClick={handleLeaderboard} size="lg" className="w-full">Show Leaderboard</Button>
        </div>
      )}
      {state.status === "leaderboard" && (
        <div className="max-w-xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-6">Leaderboard</h2>
          <Leaderboard players={state.players} />
          <Button onClick={nextQuestion} size="lg" className="w-full mt-6">
            {quiz && state.currentQuestionIndex + 1 >= quiz.questions.length ? "Show Podium" : "Next Question"}
          </Button>
        </div>
      )}
      {state.status === "podium" && (
        <div className="max-w-xl mx-auto text-center">
          <Confetti />
          <h2 className="text-4xl font-black mb-8">🏆 Final Results</h2>
          {/* Podium: 3rd (left) → 2nd (middle) → 1st (right) */}
          {(() => {
            const ranked = state.players
              ? (Object.values(state.players) as any[]).sort((a, b) => b.score - a.score)
              : [];
            const slots = [ranked[2], ranked[1], ranked[0]];
            const ht = ["h-16", "h-24", "h-32"];
            const bg = ["bg-orange-500", "bg-gray-400", "bg-yellow-400"];
            const md = ["🥉", "🥈", "🥇"];
            const lb = ["3rd", "2nd", "1st"];
            return (
              <div className="flex items-end justify-center gap-4 mb-8">
                {slots.map((p: any, i: number) => p ? (
                  <div key={i} className="flex flex-col items-center">
                    <div className="text-3xl mb-1">{md[i]}</div>
                    <div className="font-bold text-white text-sm mb-1 truncate max-w-[80px]">{p.name}</div>
                    <div className="text-white/80 text-xs mb-2">{p.score} pts</div>
                    <div className={["w-24", ht[i], bg[i], "rounded-t-xl flex items-center justify-center font-black text-white text-xl"].join(" ")}>
                      {lb[i]}
                    </div>
                  </div>
                ) : null)}
              </div>
            );
          })()}
          <Button onClick={handleEnd} size="lg" variant="danger" className="w-full mt-6">End Game</Button>
        </div>
      )}
    </div>
  );
}
