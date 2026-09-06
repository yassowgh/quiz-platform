"use client";
import { useLang } from "@/contexts/LanguageContext";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getQuiz, saveAssignmentResult } from "@/lib/firestore";
import { playSuccess, playFail, isSfxEnabled, toggleSfx } from "@/lib/sfx";
import type { Quiz, VideoSegment } from "@/types";
import { ANSWER_COLORS } from "@/types";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import MathText from "@/components/ui/MathText";

function ytId(url: string): string | null {
  const m = (url || "").match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}
function ensureYT(): Promise<any> {
  return new Promise((resolve) => {
    const w = window as any;
    if (w.YT && w.YT.Player) return resolve(w.YT);
    if (!document.querySelector('script[data-yt]')) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api"; tag.setAttribute("data-yt", "1");
      document.head.appendChild(tag);
    }
    const iv = setInterval(() => { if (w.YT && w.YT.Player) { clearInterval(iv); resolve(w.YT); } }, 150);
  });
}

export default function VideoQuizClient() {
  const { t } = useLang();
  const params = useSearchParams();
  const quizId = params.get("quizId") || "";
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [error, setError] = useState("");
  const [unavailable, setUnavailable] = useState(false);
  const [name, setName] = useState("");
  const [started, setStarted] = useState(false);
  const [rate, setRate] = useState(1);
  const [sound, setSound] = useState(true);
  const [activeSeg, setActiveSeg] = useState<VideoSegment | null>(null);
  const [qIdx, setQIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);

  const ytRef = useRef<any>(null);
  const htmlRef = useRef<HTMLVideoElement | null>(null);
  const doneSegs = useRef<Set<number>>(new Set());
  const pollRef = useRef<any>(null);
  const activeRef = useRef<boolean>(false);

  const isYT = quiz?.videoType === "youtube";
  const segments: VideoSegment[] = ((quiz?.videoSegments || []) as VideoSegment[]).slice().sort((a, b) => a.time - b.time);
  const totalQ = segments.reduce((n, s) => n + (s.questions?.length || 0), 0);

  useEffect(() => {
    if (!quizId) { setError("No quiz specified."); return; }
    getQuiz(quizId).then((q) => {
      if (!q) { setError("Quiz not found or not shared."); return; }
      if (!(q as any).videoMode) { setError("This is not a video quiz."); return; }
      setQuiz(q);
    }).catch(() => setError("Could not load this quiz."));
  }, [quizId]);
  useEffect(() => { setSound(isSfxEnabled()); }, []);
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const getTime = () => (isYT ? (ytRef.current?.getCurrentTime?.() || 0) : (htmlRef.current?.currentTime || 0));
  const pause = () => { if (isYT) ytRef.current?.pauseVideo?.(); else htmlRef.current?.pause(); };
  const resume = () => { if (isYT) ytRef.current?.playVideo?.(); else htmlRef.current?.play().catch(() => {}); };
  const setSpeed = (r: number) => { setRate(r); if (isYT) ytRef.current?.setPlaybackRate?.(r); else if (htmlRef.current) htmlRef.current.playbackRate = r; };

  const startPoll = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      if (activeRef.current) return;
      const t = getTime();
      for (const seg of segments) {
        if (!doneSegs.current.has(seg.time) && t >= seg.time && (seg.questions || []).length) {
          doneSegs.current.add(seg.time);
          activeRef.current = true;
          pause();
          setActiveSeg(seg); setQIdx(0); setPicked(null); setRevealed(false);
          return;
        }
      }
    }, 500);
  };

  const begin = async () => {
    setStarted(true);
    if (isYT) {
      const vid = ytId(quiz!.videoUrl || "");
      if (!vid) { setError("Invalid YouTube link."); return; }
      const YT = await ensureYT();
      ytRef.current = new YT.Player("yt-player", {
        videoId: vid,
        playerVars: { autoplay: 1, playsinline: 1, rel: 0, modestbranding: 1 },
        events: {
          onReady: (e: any) => { try { e.target.setPlaybackRate(rate); } catch {} ; e.target.playVideo(); startPoll(); },
          onError: () => setUnavailable(true),
          onStateChange: (e: any) => { if (e.data === 0) finish(); },
        },
      });
    } else {
      setTimeout(() => { if (htmlRef.current) { htmlRef.current.playbackRate = rate; htmlRef.current.play().catch(() => {}); startPoll(); } }, 150);
    }
  };

  const submitAnswer = () => {
    if (picked === null || !activeSeg || revealed) return;
    const q: any = activeSeg.questions[qIdx];
    const ok = picked === Number(q.correctAnswer ?? 0);
    setRevealed(true);
    if (ok) { if (sound) playSuccess(); setScore((s) => s + (q.points || 1000)); setCorrect((c) => c + 1); }
    else { if (sound) playFail(); }
  };
  const nextQ = () => {
    const q: any = activeSeg!.questions[qIdx];
    const ok = picked === Number(q.correctAnswer ?? 0);
    if (quiz?.videoBlockUntilCorrect && !ok) { setPicked(null); setRevealed(false); return; }
    if (qIdx + 1 < activeSeg!.questions.length) { setQIdx((i) => i + 1); setPicked(null); setRevealed(false); }
    else { setActiveSeg(null); activeRef.current = false; setPicked(null); setRevealed(false); resume(); }
  };

  const finish = async () => {
    if (done) return;
    setDone(true);
    if (pollRef.current) clearInterval(pollRef.current);
    try {
      await saveAssignmentResult({ quizId, quizTitle: quiz!.title, hostId: quiz!.hostId, nickname: name.trim() || "Anonymous", ccEmail: null, score, correctCount: correct, totalQuestions: totalQ });
    } catch {}
  };

  const wrap = "min-h-[calc(100vh-64px)] bg-kahoot-dark bg-grid-pattern text-white";
  if (error) return <div className="p-10 text-center text-red-400 font-semibold">{error}</div>;
  if (unavailable) return (
    <div className={wrap + " flex items-center justify-center p-6 text-center"}>
      <div className="max-w-sm"><h1 className="text-3xl font-black mb-2">{t("Activity unavailable")}</h1><p className="text-white/70">{t("This activity is no longer available — the video was removed or made private.")}</p></div>
    </div>
  );
  if (!quiz) return <div className="p-10 text-center text-gray-500 font-bold">{t("Loading…")}</div>;

  if (!started) return (
    <div className={wrap + " flex items-center justify-center p-6"}>
      <div className="flex flex-col items-center text-center w-full max-w-sm">
        <h1 className="text-3xl font-black mb-2">{quiz.title}</h1>
        <p className="text-white/70 mb-6">{t("🎬 Interactive video — it will pause to ask you questions.")}</p>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("Your name")} className="px-4 py-3 rounded-xl text-gray-900 w-full mb-3 text-center" />
        <Button size="lg" className="w-full" onClick={begin}>{t("Start")}</Button>
      </div>
    </div>
  );

  if (done) return (
    <div className={wrap + " flex items-center justify-center p-6 text-center"}>
      <div><h1 className="text-4xl font-black mb-2">{t("Done! 🎉")}</h1><p className="text-2xl font-bold">{score.toLocaleString()} pts</p><p className="text-white/70">{correct} / {totalQ} correct</p></div>
    </div>
  );

  return (
    <div className={wrap + " p-4"}>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-2 gap-2">
          <span className="font-bold truncate">{quiz.title}</span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setSound(toggleSfx())} className="text-2xl leading-none" title={t("Sound")}>{sound ? "\uD83D\uDD0A" : "\uD83D\uDD07"}</button>
            <span className="text-sm text-white/70">{t("Speed")}</span>
            {[1, 1.5, 2].map((r) => (
              <button key={r} type="button" onClick={() => setSpeed(r)} className={"px-2 py-1 rounded-lg text-sm font-bold " + (rate === r ? "bg-white text-gray-900" : "bg-white/20 text-white")}>{r}x</button>
            ))}
          </div>
        </div>
        <div className="relative w-full" style={{ aspectRatio: "16 / 9" }}>
          {isYT ? (
            <div id="yt-player" className="w-full h-full rounded-xl overflow-hidden" />
          ) : (
            <video ref={htmlRef} src={quiz.videoUrl} controls playsInline onEnded={finish} onError={() => setUnavailable(true)} className="w-full h-full rounded-xl bg-black" />
          )}
        </div>

        {activeSeg && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
            <Card className="w-full max-w-lg text-gray-900">
              <p className="text-sm text-gray-500 mb-1">Question {qIdx + 1} of {activeSeg.questions.length}</p>
              <h2 className="text-xl font-black mb-3" dir="auto"><MathText text={(activeSeg.questions[qIdx] as any).text} /></h2>
              <div className="grid gap-2">
                {((activeSeg.questions[qIdx] as any).options || []).filter((o: string) => o && o.trim()).map((opt: string, i: number) => {
                  const q: any = activeSeg.questions[qIdx];
                  const isCorrect = i === Number(q.correctAnswer ?? 0);
                  const color = ANSWER_COLORS[i] || ANSWER_COLORS[0];
                  const cls = revealed ? (isCorrect ? "bg-green-500 text-white" : (picked === i ? "bg-red-500 text-white" : "bg-gray-100 text-gray-700")) : (picked === i ? color.bg + " " + color.text + " ring-4 ring-kahoot-purple" : color.bg + " " + color.text);
                  return (
                    <button key={i} type="button" disabled={revealed} onClick={() => setPicked(i)} className={"p-3 rounded-xl text-left font-bold " + cls}>
                      <MathText text={opt} />
                    </button>
                  );
                })}
              </div>
              {!revealed ? (
                <Button className="w-full mt-4" disabled={picked === null} onClick={submitAnswer}>{t("Submit")}</Button>
              ) : (
                <Button className="w-full mt-4" onClick={nextQ}>
                  {quiz.videoBlockUntilCorrect && picked !== Number((activeSeg.questions[qIdx] as any).correctAnswer ?? 0) ? "Try again" : (qIdx + 1 < activeSeg.questions.length ? "Next question" : "Resume video")}
                </Button>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
