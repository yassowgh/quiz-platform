"use client";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useGame } from "@/hooks/useGame";
import { submitAnswer } from "@/lib/realtimeDb";
import AnswerButton from "@/components/game/AnswerButton";
import Timer from "@/components/game/Timer";
import Leaderboard from "@/components/game/Leaderboard";
import Confetti from "@/components/game/Confetti";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Podium from "@/components/game/Podium";
import { playSuccess, playFail } from "@/lib/sfx";
import { useLang } from "@/contexts/LanguageContext";

export default function PlayPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const gameId = searchParams.get("gameId") || "";
  const { state } = useGame(gameId);
  const { t } = useLang();
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [nickname, setNickname] = useState<string>("");
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [sortOrder, setSortOrder] = useState<string[] | null>(null);
  const [multiSel, setMultiSel] = useState<number[]>([]);

  // Reset answer when a new question starts
  useEffect(() => {
    setSelectedAnswer(null);
  }, [state?.currentQuestionIndex]);

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

  // Per-question audio clip
  useEffect(() => {
    if (state?.status !== "question" || !currentQ?.audioUrl) return;
    const clip = new Audio(currentQ.audioUrl);
    clip.volume = 1;
    clip.play().catch(() => {
      const resume = () => { clip.play().catch(() => {}); document.removeEventListener("click", resume); };
      document.addEventListener("click", resume);
    });
    return () => { clip.pause(); clip.src = ""; };
  }, [state?.status, state?.currentQuestionIndex]);

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
  const [timerKey, setTimerKey] = useState(0);
  const currentQ: any = (state as any)?._quiz?.questions?.[state?.currentQuestionIndex ?? -1] ?? null;

  // Success / shame sound when results are revealed
  useEffect(() => {
    if (state?.status !== "answer_reveal") return;
    if (currentQ?.type === "poll") return;
    const mine = state.answers?.[state.currentQuestionIndex]?.[playerId || ""];
    if (!mine) return;
    if (mine.isCorrect || mine.pointsEarned > 0) playSuccess(); else playFail();
  }, [state?.status]);

  // Shuffle items when a sorting question starts
  useEffect(() => {
    if (state?.status !== "question" || currentQ?.type !== "sorting") return;
    const arr = (currentQ.options || []).filter((o: string) => o && o.trim());
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    setSortOrder(arr);
  }, [state?.status, state?.currentQuestionIndex]);

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
      setMultiSel([]);
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
    const mode: "score" | "poll" = question?.type === "poll" ? "poll" : "score";
    const isCorrect = mode === "score" && question ? index === Number(question.correctAnswer) : false;
    setSelectedAnswer(index);
    await submitAnswer(gameId, q, playerId, index, timeTaken, timeLimit, isCorrect, undefined, mode);
  };

  const handleTypeAnswer = async (text: string) => {
    if (!state || !playerId || selectedAnswer !== null) return;
    if (state.status !== "question") return;
    const q = state.currentQuestionIndex;
    const question = (state as any)._quiz?.questions?.[q];
    const timeTaken = Date.now() - state.questionStartTime;
    const timeLimit = question?.timeLimit || 20;
    const isCorrect = question
      ? text.trim().toLowerCase() === String(question.correctText || "").trim().toLowerCase()
      : false;
    setSelectedAnswer(-1);
    await submitAnswer(gameId, q, playerId, -1, timeTaken, timeLimit, isCorrect);
  };

  const handleSortSubmit = async () => {
    if (!state || !playerId || selectedAnswer !== null || !sortOrder) return;
    if (state.status !== "question") return;
    const q = state.currentQuestionIndex;
    const question = (state as any)._quiz?.questions?.[q];
    const correct = (question?.options || []).filter((o: string) => o && o.trim());
    let match = 0;
    sortOrder.forEach((item, i) => { if (item === correct[i]) match++; });
    const ratio = correct.length ? match / correct.length : 0;
    const timeTaken = Date.now() - state.questionStartTime;
    const timeLimit = question?.timeLimit || 20;
    setSelectedAnswer(-2);
    await submitAnswer(gameId, q, playerId, -2, timeTaken, timeLimit, ratio === 1, ratio);
  };

  const handleMultiSubmit = async () => {
    if (!state || !playerId || selectedAnswer !== null) return;
    if (state.status !== "question") return;
    const q = state.currentQuestionIndex;
    const question = (state as any)._quiz?.questions?.[q];
    const correct: number[] = question?.correctAnswers?.length
      ? question.correctAnswers
      : [Number(question?.correctAnswer ?? 0)];
    const picked = [...multiSel].sort((a, b) => a - b);
    const correctSorted = [...correct].sort((a, b) => a - b);
    // Partial credit: right picks minus wrong picks, floored at 0
    const hits = picked.filter((i) => correctSorted.includes(i)).length;
    const misses = picked.filter((i) => !correctSorted.includes(i)).length;
    const ratio = correctSorted.length ? Math.max(0, (hits - misses) / correctSorted.length) : 0;
    const exact = picked.length === correctSorted.length && picked.every((x, i) => x === correctSorted[i]);
    const timeTaken = Date.now() - state.questionStartTime;
    const timeLimit = question?.timeLimit || 20;
    setSelectedAnswer(-3);
    const mode: "score" | "poll" = question?.type === "poll" ? "poll" : "score";
    await submitAnswer(gameId, q, playerId, picked[0] ?? -1, timeTaken, timeLimit, exact, ratio, mode);
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
    <div className="min-h-[calc(100vh-64px)] bg-kahoot-dark text-white flex flex-col" style={(state as any)?._quiz?.branding?.primaryColor ? { background: (state as any)._quiz.branding.primaryColor } : undefined}>
      {countdown !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="text-9xl font-black text-white animate-bounce">{countdown}</div>
        </div>
      )}
      {state.status === "lobby" && (
        <div className="flex flex-col items-center justify-center flex-1 gap-4 p-6">
          <div className="text-6xl">🎮</div>
          <h1 className="text-3xl font-black">{nickname}</h1>
          <p className="text-white/60 text-xl animate-pulse">{t("waitingForHost")}</p>
        </div>
      )}
      {state.status === "question" && (
        <div className="flex flex-col flex-1 p-4 gap-4">
          <div className="flex justify-between items-center">
            <span className="text-white/70 font-semibold">Q {state.currentQuestionIndex + 1}</span>
            <span className="font-bold">{myPlayer?.score.toLocaleString() ?? 0} pts</span>
          </div>
          <Timer key={timerKey} durationSeconds={currentQ?.timeLimit || 20} startTime={state.questionStartTime} className="mb-2" />
          {currentQ && (
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="font-bold text-lg" dir="auto">{currentQ.text}</p>
              {currentQ.multiSelect && (
                <p className="text-kahoot-yellow text-sm font-semibold mt-1">☑️ {t("selectAllThatApply")}</p>
              )}
              {currentQ.imageUrl && (
                <img src={currentQ.imageUrl} alt="" className="max-h-40 mx-auto rounded-lg mt-2" />
              )}
              {currentQ.videoUrl && (
                currentQ.videoUrl.includes("youtube.com") || currentQ.videoUrl.includes("youtu.be") ? (
                  <iframe src={"https://www.youtube.com/embed/" + (currentQ.videoUrl.match(/(?:v=|youtu\.be\/)([\w-]+)/)?.[1] || "")} className="w-full aspect-video rounded-lg mt-2" allow="autoplay; encrypted-media" allowFullScreen />
                ) : (
                  <video src={currentQ.videoUrl} controls className="max-h-48 mx-auto rounded-lg mt-2" />
                )
              )}
            </div>
          )}
          {currentQ?.type === "sorting" && sortOrder ? (
            <div className="flex flex-col gap-2 flex-1 justify-center">
              {sortOrder.map((item, i) => (
                <div key={item} className="flex items-center gap-2 bg-white text-gray-900 rounded-xl p-3 font-bold">
                  <span className="w-7 h-7 bg-kahoot-purple text-white rounded-full flex items-center justify-center text-sm flex-shrink-0">{i + 1}</span>
                  <span className="flex-1" dir="auto">{item}</span>
                  <button type="button" disabled={i === 0 || selectedAnswer !== null} onClick={() => setSortOrder((o) => { if (!o) return o; const n = [...o]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; return n; })} className="text-xl px-2 disabled:opacity-30">⬆️</button>
                  <button type="button" disabled={i === sortOrder.length - 1 || selectedAnswer !== null} onClick={() => setSortOrder((o) => { if (!o) return o; const n = [...o]; [n[i + 1], n[i]] = [n[i], n[i + 1]]; return n; })} className="text-xl px-2 disabled:opacity-30">⬇️</button>
                </div>
              ))}
              <Button size="lg" disabled={selectedAnswer !== null || countdown !== null} onClick={handleSortSubmit}>
                {t("submitOrder")}
              </Button>
              {selectedAnswer !== null && <p className="text-center text-white/70 font-semibold animate-pulse">{t("orderSubmitted")}</p>}
            </div>
          ) : currentQ?.type === "typeanswer" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const inp = e.currentTarget.elements.namedItem("ta") as HTMLInputElement;
                if (inp && inp.value.trim()) handleTypeAnswer(inp.value);
              }}
              className="flex flex-col gap-3 flex-1 justify-center"
            >
              <input
                name="ta"
                dir="auto"
                type="text"
                disabled={selectedAnswer !== null || countdown !== null}
                placeholder={t("typeYourAnswer")}
                autoComplete="off"
                className="text-center text-2xl font-bold rounded-xl py-4 px-3 text-gray-900"
              />
              <Button type="submit" size="lg" disabled={selectedAnswer !== null || countdown !== null}>
                {t("submitAnswer")}
              </Button>
            </form>
          ) : (
          <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
            {[0, 1, 2, 3, 4, 5].slice(0, currentQ?.options?.length || 4).filter((i) => !currentQ || (currentQ.options?.[i] && currentQ.options[i].trim())).map((i) => (
              <AnswerButton
                key={i}
                index={i}
                text={currentQ?.options?.[i] ?? (selectedAnswer !== null ? (i === selectedAnswer ? t("yourAnswer") : "") : t("tapToAnswer"))}
                selected={currentQ?.multiSelect ? multiSel.includes(i) : selectedAnswer === i}
                disabled={selectedAnswer !== null || countdown !== null}
                onClick={() => {
                  if (currentQ?.multiSelect) {
                    setMultiSel((cur) => (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]));
                  } else {
                    handleAnswer(i);
                  }
                }}
              />
            ))}
          </div>
          {currentQ?.multiSelect && selectedAnswer === null && (
            <Button size="lg" disabled={!multiSel.length || countdown !== null} onClick={handleMultiSubmit} className="mt-2">
              {t("submitSelection")} ({multiSel.length})
            </Button>
          )}
          </>
          )}
          {selectedAnswer !== null && (
            <p className="text-center text-white/70 font-semibold animate-pulse">{t("waitingForResults")}</p>
          )}
        </div>
      )}
      {state.status === "answer_reveal" && (
        <div className="flex flex-col items-center justify-center flex-1 gap-6 p-6">
          {myAnswer ? (
            <>
              <div className="text-6xl">{currentQ?.type === "poll" ? "🗳️" : myAnswer.isCorrect ? "✓" : "✗"}</div>
              <h2 className="text-3xl font-black">{currentQ?.type === "poll" ? t("voteRecorded") : myAnswer.isCorrect ? t("correct") : t("wrong")}</h2>
              {myAnswer.isCorrect && (state.players?.[playerId || ""]?.streak || 0) > 1 && (
                <p className="text-orange-400 font-bold text-xl">🔥 {state.players?.[playerId || ""]?.streak} {t("answerStreak")}</p>
              )}
              {myAnswer.pointsEarned > 0 && (
                <p className="text-2xl font-bold text-kahoot-yellow">+{myAnswer.pointsEarned} pts</p>
              )}
            </>
          ) : (
            <h2 className="text-3xl font-black">{t("timesUp")}</h2>
          )}
          <p className="text-white/60">Total: {myPlayer?.score.toLocaleString() ?? 0} pts</p>
        </div>
      )}
      {state.status === "leaderboard" && (
        <div className="p-6">
          <h2 className="text-3xl font-black text-center mb-6">{t("leaderboard")}</h2>
          <Leaderboard players={state.players} currentPlayerId={playerId ?? undefined} />
        </div>
      )}
      {state.status === "podium" && (
        <div className="flex flex-col items-center justify-center flex-1 p-6 text-center">
          <Confetti />
          <h2 className="text-4xl font-black mb-8">🎉 {t("gameOver")}</h2>
          <Podium players={state.players || {}} />
          <Leaderboard players={state.players} currentPlayerId={playerId ?? undefined} limit={5} />
        </div>
      )}
      {state.status === "ended" && (
        <div className="flex flex-col items-center justify-center flex-1 p-6 text-center">
          <h2 className="text-4xl font-black mb-4">{t("thanksForPlaying")}</h2>
          <p className="text-white/60 mb-6">Final score: {myPlayer?.score.toLocaleString() ?? 0} pts</p>
          <a href="/" className="text-kahoot-yellow font-bold text-xl hover:underline">Play again →</a>
        </div>
      )}
    </div>
  );
}
