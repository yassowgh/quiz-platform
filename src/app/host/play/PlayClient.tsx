"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getQuiz } from "@/lib/firestore";
import { startQuestion, revealAnswer, showLeaderboard, showPodium, endGame, resetPlayerAnswered } from "@/lib/realtimeDb";
import { saveGameRecord } from "@/lib/firestore";
import { useGame } from "@/hooks/useGame";
import { rankPlayers, aggregateTeams } from "@/lib/scoring";
import { useLang } from "@/contexts/LanguageContext";
import type { Quiz } from "@/types";
import Timer from "@/components/game/Timer";
import AnswerDistribution from "@/components/game/AnswerDistribution";
import Leaderboard from "@/components/game/Leaderboard";
import Podium from "@/components/game/Podium";
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
  const { t } = useLang();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [timerKey, setTimerKey] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [muted, setMuted] = useState(false);
  const musicRef = useRef<HTMLAudioElement | null>(null);

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
    // Build a detailed per-question / per-player report
    const questionReport = (quiz?.questions || []).map((q: any, qi: number) => {
      const qAnswers = (state.answers?.[qi] || {}) as Record<string, any>;
      const responses = Object.entries(qAnswers).map(([pid, a]) => ({
        playerId: pid,
        nickname: state.players?.[pid]?.nickname || "—",
        answerIndex: a.answerIndex,
        isCorrect: !!a.isCorrect,
        pointsEarned: a.pointsEarned || 0,
        timeTakenMs: a.timeTakenMs || 0,
      }));
      const correctCount = responses.filter((r) => r.isCorrect).length;
      return {
        index: qi,
        text: q.text,
        type: q.type || "multiple",
        options: q.options || [],
        correctAnswer: q.correctAnswer ?? 0,
        correctAnswers: q.correctAnswers || null,
        correctText: q.correctText || null,
        responses,
        correctCount,
        totalResponses: responses.length,
        accuracy: responses.length ? Math.round((correctCount / responses.length) * 100) : 0,
        avgTimeMs: responses.length ? Math.round(responses.reduce((s, r) => s + r.timeTakenMs, 0) / responses.length) : 0,
      };
    });
    await saveGameRecord({
      quizId,
      quizTitle: quiz?.title || "",
      hostId: user?.uid,
      players: ranked,
      teams: state.teamMode ? aggregateTeams(players as any) : null,
      teamMode: !!state.teamMode,
      pin: state.pin,
      totalQuestions: quiz?.questions.length || 0,
      questionReport,
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
    musicRef.current = audio;
    const tryPlay = () => audio.play().catch(() => {
      // Autoplay blocked: retry on first user interaction
      const resume = () => { audio.play().catch(() => {}); document.removeEventListener("click", resume); document.removeEventListener("touchstart", resume); };
      document.addEventListener("click", resume);
      document.addEventListener("touchstart", resume);
    });
    tryPlay();
    return () => { audio.pause(); audio.src = ""; };
  }, [state?.status]);

  // Per-question audio clip
  useEffect(() => {
    if (state?.status !== "question" || !currentQ?.audioUrl) return;
    const clip = new Audio(currentQ.audioUrl);
    clip.play().catch(() => {});
    return () => { clip.pause(); clip.src = ""; };
  }, [state?.status, state?.currentQuestionIndex]);

  useEffect(() => {
    if (musicRef.current) musicRef.current.muted = muted;
  }, [muted]);

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
    <div className="min-h-[calc(100vh-64px)] bg-kahoot-dark text-white p-6" style={quiz?.branding?.primaryColor ? { background: quiz.branding.primaryColor } : undefined}>
      {quiz?.branding?.logoUrl && <img src={quiz.branding.logoUrl} alt="" className="h-10 mx-auto mb-3" />}
      {countdown !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="text-9xl font-black text-white animate-bounce">{countdown}</div>
        </div>
      )}
      <button onClick={() => setMuted((m) => !m)} className="fixed bottom-4 right-4 z-40 text-2xl bg-white/10 hover:bg-white/20 rounded-full p-3" title="Mute music">{muted ? "🔇" : "🔊"}</button>
      {state.status === "lobby" && (
        <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6">
          <Card className="text-center bg-white/10 text-white">
            <p className="text-2xl mb-2 font-semibold">PIN: <span className="font-black text-4xl tracking-widest">{state.pin}</span></p>
            <p className="text-white/70">{players.length} {t("players")}</p>
          </Card>
          <Button size="lg" onClick={handleStart} disabled={players.length === 0}> {t("startGame")} </Button>
        </div>
      )}
      {state.status === "question" && currentQ && (
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <span className="text-white/70">Q {state.currentQuestionIndex + 1}/{quiz?.questions.length}</span>
            <span className="text-white/70">{answeredCount}/{players.length} {t("answered")}</span>
          </div>
          <Card className="mb-4 text-center text-gray-900">
            <h2 className="text-2xl font-black" dir="auto">{currentQ.text}</h2>
            {currentQ.imageUrl && (
              <img src={currentQ.imageUrl} alt="" className="max-h-64 mx-auto rounded-xl mt-3" />
            )}
            {currentQ.videoUrl && (
              currentQ.videoUrl.includes("youtube.com") || currentQ.videoUrl.includes("youtu.be") ? (
                <iframe src={"https://www.youtube.com/embed/" + (currentQ.videoUrl.match(/(?:v=|youtu\.be\/)([\w-]+)/)?.[1] || "")} className="w-full max-w-lg aspect-video mx-auto rounded-xl mt-3" allow="autoplay; encrypted-media" allowFullScreen />
              ) : (
                <video src={currentQ.videoUrl} controls className="max-h-72 mx-auto rounded-xl mt-3" />
              )
            )}
          </Card>
          <Timer
            key={timerKey}
            durationSeconds={currentQ.timeLimit}
            startTime={state.questionStartTime + 3000}
            onExpire={handleReveal}
            className="mb-4"
          />
          {currentQ.type === "typeanswer" ? (
            <div className="text-center text-xl font-bold bg-white/10 rounded-xl p-6 mb-4">⌨️ Players type their answer on their devices!</div>
          ) : currentQ.type === "sorting" ? (
            <div className="bg-white/10 rounded-xl p-6 mb-4">
              <p className="text-center text-xl font-bold mb-3">🔀 Sort these on your device!</p>
              <div className="flex flex-wrap justify-center gap-2">
                {currentQ.options.filter((o) => o && o.trim()).map((opt, i) => (
                  <span key={i} dir="auto" className="bg-white text-gray-900 rounded-lg px-3 py-1 font-bold">{opt}</span>
                ))}
              </div>
            </div>
          ) : (
          <div className="grid grid-cols-2 gap-3 mb-4">
            {currentQ.options.map((opt, i) => !opt || !opt.trim() ? null : (
              <div key={i} className={`p-4 rounded-xl font-bold flex items-center gap-2 ${ANSWER_COLORS[i].bg} ${ANSWER_COLORS[i].text}`}>
                <span className="text-2xl">{ANSWER_COLORS[i].shape}</span> <span dir="auto">{opt}</span>
              </div>
            ))}
          </div>
          )}
          <Button onClick={handleReveal} variant="secondary" className="w-full">{t("skipReveal")}</Button>
        </div>
      )}
      {state.status === "answer_reveal" && currentQ && (
        <div className="max-w-3xl mx-auto">
          <Card className="mb-4 text-center text-gray-900">
            <h2 className="text-2xl font-black mb-1" dir="auto">{currentQ.text}</h2>
            <p className="text-kahoot-green font-bold text-xl">✓ {currentQ.multiSelect && currentQ.correctAnswers?.length ? currentQ.correctAnswers.map((ci) => currentQ.options[ci]).join(", ") : currentQ.type === "typeanswer" ? currentQ.correctText : currentQ.type === "sorting" ? currentQ.options.filter((o) => o && o.trim()).join(" → ") : currentQ.type === "poll" ? "Poll — every vote counts!" : currentQ.options[Number(currentQ.correctAnswer)]}</p>
          </Card>
          {currentQ.type !== "typeanswer" && currentQ.type !== "sorting" && (
          <div className="mb-6">
            <AnswerDistribution
              answers={answers}
              totalPlayers={players.length}
              correctAnswer={currentQ.type === "poll" ? -1 : Number(currentQ.correctAnswer)}
              options={currentQ.options}
            />
          </div>
          )}
          <Button onClick={handleLeaderboard} size="lg" className="w-full">{t("showLeaderboard")}</Button>
        </div>
      )}
      {state.status === "leaderboard" && (
        <div className="max-w-xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-6">{t("leaderboard")}{state.teamMode ? " (Teams)" : ""}</h2>
          {state.teamMode ? (
            <div className="flex flex-col gap-2">
              {aggregateTeams(players as any).map((tm, i) => (
                <div key={tm.id} className="flex items-center gap-3 bg-white/10 rounded-xl p-3">
                  <span className="font-black text-xl w-8">{i + 1}</span>
                  <span className="flex-1 font-bold" dir="auto">{tm.nickname}</span>
                  <span className="text-white/60 text-sm">{tm.members} players</span>
                  <span className="font-black">{tm.score.toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <Leaderboard players={state.players} />
          )}
          <Button onClick={nextQuestion} size="lg" className="w-full mt-6">
            {quiz && state.currentQuestionIndex + 1 >= quiz.questions.length ? t("showPodium") : t("nextQuestion")}
          </Button>
        </div>
      )}
      {state.status === "podium" && (
        <div className="max-w-xl mx-auto text-center">
          <Confetti />
          <h2 className="text-4xl font-black mb-8">🏆 {t("finalResults")}</h2>
          <Podium players={state.players || {}} />
          <Button onClick={handleEnd} size="lg" variant="danger" className="w-full mt-6">{t("endGame")}</Button>
        </div>
      )}
    </div>
  );
}
