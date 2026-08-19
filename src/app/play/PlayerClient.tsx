"use client";
import { useEffect, useRef, useState } from "react";
import { ReactionBar } from "@/components/game/Reactions";
import { useSearchParams, useRouter } from "next/navigation";
import { useGame } from "@/hooks/useGame";
import { submitAnswer, applyChest, submitResponse, setPlayerResponse } from "@/lib/realtimeDb";
import AnswerButton from "@/components/game/AnswerButton";
import MathText from "@/components/ui/MathText";
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
  const [muted, setMuted] = useState(false);
  const [questionShownAt, setQuestionShownAt] = useState(0);
  const [timeUp, setTimeUp] = useState(false);
  const [chestQ, setChestQ] = useState(-1);
  const [chestMsg, setChestMsg] = useState("");
  const [wordDraft, setWordDraft] = useState("");
  const [wordSent, setWordSent] = useState(0);
  const [myRating, setMyRating] = useState(0);
  const [openDraft, setOpenDraft] = useState("");
  const [openSent, setOpenSent] = useState(0);
  const [rankOrder, setRankOrder] = useState<number[] | null>(null);
  const [rankSent, setRankSent] = useState(false);
  const musicRef = useRef<HTMLAudioElement | null>(null);

  // Reset answer when a new question starts
  useEffect(() => {
    setSelectedAnswer(null);
  }, [state?.currentQuestionIndex]);

  // Background music is disabled on players' devices in competition mode (the host plays the music).

  useEffect(() => {
    if (musicRef.current) musicRef.current.muted = muted;
  }, [muted]);

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
      setTimeUp(false);
      setQuestionShownAt(Date.now());
      setTimerKey((k) => k + 1);
    }
  }, [state?.status, state?.currentQuestionIndex]);

  const handleAnswer = async (index: number) => {
    if (!state || !playerId || selectedAnswer !== null || timeUp) return;
    if (state.status !== "question") return;
    const q = state.currentQuestionIndex;
    const question = (state as any)._quiz?.questions?.[q];
    const timeTaken = Math.max(0, Date.now() - questionShownAt - 3000);
    const timeLimit = question?.timeLimit || 20;
    const mode: "score" | "poll" = question?.type === "poll" ? "poll" : "score";
    const isCorrect = mode === "score" && question ? index === Number(question.correctAnswer) : false;
    setSelectedAnswer(index);
    await submitAnswer(gameId, q, playerId, index, timeTaken, timeLimit, isCorrect, undefined, mode);
  };

  const handleTypeAnswer = async (text: string) => {
    if (!state || !playerId || selectedAnswer !== null || timeUp) return;
    if (state.status !== "question") return;
    const q = state.currentQuestionIndex;
    const question = (state as any)._quiz?.questions?.[q];
    const timeTaken = Math.max(0, Date.now() - questionShownAt - 3000);
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
    const timeTaken = Math.max(0, Date.now() - questionShownAt - 3000);
    const timeLimit = question?.timeLimit || 20;
    setSelectedAnswer(-2);
    await submitAnswer(gameId, q, playerId, -2, timeTaken, timeLimit, ratio === 1, ratio);
  };

  const handleMultiSubmit = async () => {
    if (!state || !playerId || selectedAnswer !== null || timeUp) return;
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
    const timeTaken = Math.max(0, Date.now() - questionShownAt - 3000);
    const timeLimit = question?.timeLimit || 20;
    setSelectedAnswer(-3);
    const mode: "score" | "poll" = question?.type === "poll" ? "poll" : "score";
    await submitAnswer(gameId, q, playerId, picked[0] ?? -1, timeTaken, timeLimit, exact, ratio, mode);
  };

  const myPlayer = state && playerId ? state.players[playerId] : null;
  const isGold = (state as any)?.mode === "goldquest";
  const isBattle = (state as any)?.mode === "battle";
  useEffect(() => {
    setWordSent(0); setWordDraft(""); setMyRating(0); setOpenSent(0); setOpenDraft(""); setRankSent(false);
    if (currentQ?.type === "ranking") {
      const n = (currentQ.options || []).filter((o: string) => o && o.trim()).length;
      setRankOrder(Array.from({ length: n }, (_, i) => i));
    } else { setRankOrder(null); }
  }, [state?.currentQuestionIndex]);
  const sendRank = async () => {
    if (!rankOrder || !playerId || !state) return;
    await setPlayerResponse(gameId, state.currentQuestionIndex, playerId, JSON.stringify(rankOrder));
    setRankSent(true);
  };
  const sendOpen = async () => {
    const txt = openDraft.trim();
    if (!txt || !playerId || !state) return;
    await submitResponse(gameId, state.currentQuestionIndex, playerId, txt);
    setOpenSent((n) => n + 1);
    setOpenDraft("");
  };
  const rateStar = async (s: number) => {
    setMyRating(s);
    if (playerId && state) await setPlayerResponse(gameId, state.currentQuestionIndex, playerId, String(s));
  };
  const sendWord = async () => {
    const w = wordDraft.trim();
    if (!w || !playerId || !state) return;
    await submitResponse(gameId, state.currentQuestionIndex, playerId, w);
    setWordSent((n) => n + 1);
    setWordDraft("");
  };
  const openChest = async () => {
    if (!state || !playerId) return;
    if (chestQ === state.currentQuestionIndex) return;
    setChestQ(state.currentQuestionIndex);
    const roll = Math.random();
    const others: any[] = Object.values(state.players || {}).filter((p: any) => p.id !== playerId);
    let outcome: any; let msg = "";
    if (roll < 0.10) { const amt = 50 + Math.floor(Math.random() * 11) * 10; outcome = { type: "lose", amount: amt }; msg = "💀 Lost " + amt + " gold!"; }
    else if (roll < 0.25 && others.length) { const tgt: any = others[Math.floor(Math.random() * others.length)]; const amt = 50 + Math.floor(Math.random() * 16) * 10; outcome = { type: "steal", amount: amt, targetId: tgt.id }; msg = "🗡️ Stole " + amt + " from " + tgt.nickname + "!"; }
    else if (roll < 0.80) { const amt = 50 + Math.floor(Math.random() * 26) * 10; outcome = { type: "gain", amount: amt }; msg = "🪙 +" + amt + " gold!"; }
    else { const amt = 300 + Math.floor(Math.random() * 31) * 10; outcome = { type: "gain", amount: amt }; msg = "💰 JACKPOT +" + amt + " gold!"; }
    setChestMsg(msg);
    try { await applyChest(gameId, playerId, outcome); } catch (e) {}
  };
  const answerMap = state && state.currentQuestionIndex >= 0 ? (state.answers?.[state.currentQuestionIndex] || {}) : {};
  const myAnswer = playerId ? answerMap[playerId] : null;

  if (!state) return (
    <div className="min-h-[calc(100vh-64px)] bg-kahoot-dark flex items-center justify-center">
      <p className="text-white text-2xl font-bold animate-pulse">Connecting...</p>
    </div>
  );


  return (
    <div className="min-h-[calc(100vh-64px)] bg-kahoot-dark text-white flex flex-col" style={(state as any)?._quiz?.branding?.primaryColor ? { background: (state as any)._quiz.branding.primaryColor } : undefined}>
      <ReactionBar gameId={gameId} />
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
      {state.status === "question" && isBattle && (myPlayer as any)?.eliminated && (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 p-6 text-center">
          <div className="text-6xl">💀</div>
          <h2 className="text-2xl font-black">You're eliminated</h2>
          <p className="text-white/60">Watching the rest of the battle…</p>
        </div>
      )}
      {state.status === "question" && !(isBattle && (myPlayer as any)?.eliminated) && (
        <div className="flex flex-col flex-1 p-4 gap-4">
          <div className="flex justify-between items-center">
            <span className="text-white/70 font-semibold">Q {state.currentQuestionIndex + 1}</span>
            <span className="font-bold">{myPlayer?.score.toLocaleString() ?? 0} pts</span>
          </div>
          <Timer key={timerKey} durationSeconds={currentQ?.timeLimit || 20} startTime={questionShownAt + 3000} onExpire={() => setTimeUp(true)} className="mb-2" />
          {currentQ && (
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="font-bold text-lg" dir="auto"><MathText text={currentQ.text} /></p>
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
          {currentQ?.type === "ranking" ? (
            <div className="flex flex-col gap-2 flex-1 justify-center">
              <p className="text-center text-white/70 text-sm">Order them — top = best</p>
              {(rankOrder || []).map((optIdx, pos) => (
                <div key={optIdx} className="flex items-center gap-2 bg-white text-gray-900 rounded-xl p-3 font-bold">
                  <span className="w-7 h-7 bg-kahoot-purple text-white rounded-full flex items-center justify-center text-sm flex-shrink-0">{pos + 1}</span>
                  <span className="flex-1" dir="auto">{((currentQ.options || []).filter((o: string) => o && o.trim()))[optIdx]}</span>
                  <button type="button" disabled={pos === 0 || rankSent} onClick={() => setRankOrder((o) => { if (!o) return o; const n = [...o]; const tmp = n[pos - 1]; n[pos - 1] = n[pos]; n[pos] = tmp; return n; })} className="text-xl px-1 disabled:opacity-30">⬆️</button>
                  <button type="button" disabled={pos === (rankOrder || []).length - 1 || rankSent} onClick={() => setRankOrder((o) => { if (!o) return o; const n = [...o]; const tmp = n[pos + 1]; n[pos + 1] = n[pos]; n[pos] = tmp; return n; })} className="text-xl px-1 disabled:opacity-30">⬇️</button>
                </div>
              ))}
              <button type="button" onClick={sendRank} disabled={rankSent} className="bg-green-500 text-white font-black text-lg rounded-2xl py-3 mt-2 disabled:opacity-40">{rankSent ? "Ranking submitted ✓" : "Submit ranking"}</button>
            </div>
          ) : currentQ?.type === "openended" ? (
            <div className="flex flex-col gap-3 flex-1 justify-center">
              <textarea value={openDraft} onChange={(e) => setOpenDraft(e.target.value)} maxLength={140} rows={3} placeholder="Type your answer…" className="px-4 py-3 rounded-2xl text-gray-900 text-lg resize-none" dir="auto" />
              <button type="button" onClick={sendOpen} disabled={!openDraft.trim() || openSent >= 3} className="bg-green-500 text-white font-black text-lg rounded-2xl py-4 disabled:opacity-40">{openSent >= 3 ? "Max reached" : "Send answer" + (openSent > 0 ? " (" + openSent + "/3)" : "")}</button>
              <p className="text-center text-white/60 text-sm">Send up to 3 answers from your phone.</p>
            </div>
          ) : currentQ?.type === "rating" ? (
            <div className="flex flex-col gap-4 flex-1 justify-center items-center">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} type="button" onClick={() => rateStar(s)} className={"text-5xl transition-transform hover:scale-110 " + ((myRating || 0) >= s ? "opacity-100" : "opacity-30")}>⭐</button>
                ))}
              </div>
              <p className="text-white/70 font-semibold">{myRating ? "You rated " + myRating + "/5 — tap to change" : "Tap a star to rate"}</p>
            </div>
          ) : currentQ?.type === "wordcloud" ? (
            <div className="flex flex-col gap-3 flex-1 justify-center">
              <input value={wordDraft} onChange={(e) => setWordDraft(e.target.value)} maxLength={30} placeholder="Type a word…" onKeyDown={(e) => { if (e.key === "Enter") sendWord(); }} className="px-4 py-4 rounded-2xl text-gray-900 text-xl text-center font-bold" dir="auto" />
              <button type="button" onClick={sendWord} disabled={!wordDraft.trim() || wordSent >= 8} className="bg-green-500 text-white font-black text-lg rounded-2xl py-4 disabled:opacity-40">{wordSent >= 8 ? "Max reached" : "Send word" + (wordSent > 0 ? " (" + wordSent + ")" : "")}</button>
              <p className="text-center text-white/60 text-sm">Add up to 8 words from your phone.</p>
            </div>
          ) : currentQ?.type === "sorting" && sortOrder ? (
            <div className="flex flex-col gap-2 flex-1 justify-center">
              {sortOrder.map((item, i) => (
                <div key={item} className="flex items-center gap-2 bg-white text-gray-900 rounded-xl p-3 font-bold">
                  <span className="w-7 h-7 bg-kahoot-purple text-white rounded-full flex items-center justify-center text-sm flex-shrink-0">{i + 1}</span>
                  <span className="flex-1" dir="auto">{item}</span>
                  <button type="button" disabled={i === 0 || selectedAnswer !== null} onClick={() => setSortOrder((o) => { if (!o) return o; const n = [...o]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; return n; })} className="text-xl px-2 disabled:opacity-30">⬆️</button>
                  <button type="button" disabled={i === sortOrder.length - 1 || selectedAnswer !== null} onClick={() => setSortOrder((o) => { if (!o) return o; const n = [...o]; [n[i + 1], n[i]] = [n[i], n[i + 1]]; return n; })} className="text-xl px-2 disabled:opacity-30">⬇️</button>
                </div>
              ))}
              <Button size="lg" disabled={selectedAnswer !== null || countdown !== null || timeUp} onClick={handleSortSubmit}>
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
                disabled={selectedAnswer !== null || countdown !== null || timeUp}
                placeholder={t("typeYourAnswer")}
                autoComplete="off"
                className="text-center text-2xl font-bold rounded-xl py-4 px-3 text-gray-900"
              />
              <Button type="submit" size="lg" disabled={selectedAnswer !== null || countdown !== null || timeUp}>
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
                disabled={selectedAnswer !== null || countdown !== null || timeUp}
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
            <Button size="lg" disabled={!multiSel.length || countdown !== null || timeUp} onClick={handleMultiSubmit} className="mt-2">
              {t("submitSelection")} ({multiSel.length})
            </Button>
          )}
          </>
          )}
          {selectedAnswer !== null && (
            <div className="text-center space-y-2">
              <p className="text-white/70 font-semibold animate-pulse">{t("waitingForResults")}</p>
              <p className="text-2xl font-black text-kahoot-yellow">{t("yourScore")}: {isGold ? (((((myPlayer as any) || {}).gold) || 0).toLocaleString() + " 🪙") : ((myPlayer?.score ?? 0).toLocaleString() + " pts")}</p>
            </div>
          )}
          {timeUp && selectedAnswer === null && (
            <p className="text-center text-kahoot-red font-bold text-lg">⏰ {t("timesUp")}</p>
          )}
        </div>
      )}
      {state.status === "answer_reveal" && (
        <div className="flex flex-col items-center justify-center flex-1 gap-6 p-6">
          {myAnswer ? (
            <>
              <div className="text-6xl">{currentQ?.type === "poll" ? "🗳️" : myAnswer.isCorrect ? "✓" : "✗"}</div>
              <h2 className="text-3xl font-black">{currentQ?.type === "poll" ? t("voteRecorded") : myAnswer.isCorrect ? t("correct") : t("wrong")}</h2>
              {isBattle && (
                <p className={"text-xl font-black " + (myAnswer.isCorrect ? "text-green-400" : "text-kahoot-red")}>{myAnswer.isCorrect ? "✓ Survived!" : "💀 Knocked out"}</p>
              )}
              {isGold && myAnswer.isCorrect && chestQ !== state.currentQuestionIndex && (
                <div className="flex flex-col items-center gap-2">
                  <p className="text-white/80 font-bold">Pick a chest!</p>
                  <div className="flex gap-4">
                    {[0, 1, 2].map((c) => (
                      <button key={c} onClick={openChest} className="text-5xl hover:scale-125 transition-transform">🎁</button>
                    ))}
                  </div>
                </div>
              )}
              {isGold && chestQ === state.currentQuestionIndex && chestMsg && (
                <p className="text-2xl font-black text-kahoot-yellow">{chestMsg}</p>
              )}
              {isGold && (
                <p className="text-white/70 font-bold text-lg">🪙 {((((myPlayer as any) || {}).gold) || 0).toLocaleString()} gold</p>
              )}
              {myAnswer.isCorrect && (state.players?.[playerId || ""]?.streak || 0) > 1 && (
                <p className="text-orange-400 font-bold text-xl">🔥 {state.players?.[playerId || ""]?.streak} {t("answerStreak")}</p>
              )}
              {!isGold && myAnswer.pointsEarned > 0 && (
                <p className="text-2xl font-bold text-kahoot-yellow">+{myAnswer.pointsEarned} pts</p>
              )}
            </>
          ) : (
            <h2 className="text-3xl font-black">{t("timesUp")}</h2>
          )}
          {!isGold && (<p className="text-white/60">Total: {(myPlayer?.score ?? 0).toLocaleString()} pts</p>)}
        </div>
      )}
      {state.status === "leaderboard" && (
        <div className="p-6">
          <h2 className="text-3xl font-black text-center mb-6">{t("leaderboard")}</h2>
          <Leaderboard players={state.players} currentPlayerId={playerId ?? undefined} limit={5} metric={isGold ? "gold" : "score"} />
        </div>
      )}
      {state.status === "podium" && (
        <div className="flex flex-col items-center justify-center flex-1 p-6 text-center">
          <Confetti />
          <h2 className="text-4xl font-black mb-8">🎉 {t("gameOver")}</h2>
          <Podium players={state.players || {}} metric={isGold ? "gold" : "score"} />
          <Leaderboard players={state.players} currentPlayerId={playerId ?? undefined} limit={5} metric={isGold ? "gold" : "score"} />
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
