"use client";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getQuiz, saveAssignmentResult, hasExamAttempt, recordExamAttempt } from "@/lib/firestore";
import { calculatePoints } from "@/lib/scoring";
import { playSuccess, playFail, toggleSfx, isSfxEnabled } from "@/lib/sfx";
import { sendAssignmentEmail } from "@/lib/integrations";
import type { Quiz } from "@/types";
import { ANSWER_COLORS } from "@/types";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Confetti from "@/components/game/Confetti";

function shuffleArr<T>(arr: T[]): T[] {
  const b = [...arr];
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}
function shuffleForExam(questions: any[]): any[] {
  return shuffleArr(questions).map((q: any) => {
    if ((q.type === "multiple" || q.type === "truefalse" || !q.type) && Array.isArray(q.options) && q.options.length) {
      const idxMap: number[] = shuffleArr(q.options.map((_: string, i: number) => i));
      const nq: any = { ...q, options: idxMap.map((i: number) => q.options[i]) };
      if (typeof q.correctAnswer === "number") nq.correctAnswer = idxMap.indexOf(q.correctAnswer);
      if (Array.isArray(q.correctAnswers)) nq.correctAnswers = q.correctAnswers.map((old: number) => idxMap.indexOf(old));
      return nq;
    }
    return q;
  });
}

export default function AssignmentClient() {
  const params = useSearchParams();
  const quizId = params.get("quizId") || "";
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [name, setName] = useState("");
  const [started, setStarted] = useState(false);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [picked, setPicked] = useState<number[]>([]);
  const [typed, setTyped] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [lastPoints, setLastPoints] = useState(0);
  const [done, setDone] = useState(false);
  const [ccEmail, setCcEmail] = useState("");
  const [copyStatus, setCopyStatus] = useState<"" | "sending" | "sent" | "err">("");
  const [error, setError] = useState("");
  const [sound, setSound] = useState(true);
  useEffect(() => { setSound(isSfxEnabled()); }, []);
  const { user, loginWithGoogle } = useAuth();
  const [examBlocked, setExamBlocked] = useState("");
  const startRef = useRef<number>(0);

  useEffect(() => {
    if (!quizId) { setError("No quiz specified."); return; }
    getQuiz(quizId)
      .then((q) => {
        if (!q) { setError("Quiz not found or not shared."); return; }
        const playable = {
          ...q,
          questions: (q.questions || []).filter(
            (qq: any) => qq.type === "typeanswer" || (qq.options || []).some((o: string) => o && o.trim())
          ),
        };
        if (!playable.questions.length) setError("This quiz has no playable questions yet.");
        else setQuiz({ ...playable, questions: (q as any).examMode ? shuffleForExam(playable.questions) : playable.questions });
      })
      .catch(() => setError("Could not load this quiz. The host may not have shared it."));
  }, [quizId]);

  useEffect(() => {
    if (quiz && (quiz as any).examMode && user && quizId) {
      hasExamAttempt(quizId, user.uid).then((taken) => { if (taken) setExamBlocked("attempted"); }).catch(() => {});
    }
  }, [quiz, user, quizId]);

  const q: any = quiz?.questions?.[idx] ?? null;
  const opts: string[] = (q?.options || []).filter((o: string) => o && o.trim());

  const begin = () => {
    if (quiz && (quiz as any).examMode && !user) { setExamBlocked("login"); return; }
    setStarted(true); startRef.current = Date.now();
  };

  const submit = () => {
    if (!q || revealed) return;
    const timeTaken = Date.now() - startRef.current;
    const limit = q.timeLimit || 20;
    let ratio = 0;
    let exact = false;
    if (q.type === "typeanswer") {
      exact = typed.trim().toLowerCase() === String(q.correctText || "").trim().toLowerCase();
      ratio = exact ? 1 : 0;
    } else if (q.type === "poll") {
      ratio = 0; exact = false;
    } else if (q.multiSelect) {
      const correct: number[] = q.correctAnswers?.length ? q.correctAnswers : [Number(q.correctAnswer ?? 0)];
      const hits = picked.filter((i) => correct.includes(i)).length;
      const misses = picked.filter((i) => !correct.includes(i)).length;
      ratio = correct.length ? Math.max(0, (hits - misses) / correct.length) : 0;
      exact = ratio === 1 && picked.length === correct.length;
    } else {
      exact = picked[0] === Number(q.correctAnswer ?? 0);
      ratio = exact ? 1 : 0;
    }
    const pts = q.type === "poll" ? 0 : Math.round(calculatePoints(ratio > 0, timeTaken, limit, q.points || 1000) * ratio);
    setLastPoints(pts);
    setLastCorrect(exact);
    setScore((s) => s + pts);
    if (exact) setCorrectCount((c) => c + 1);
    setRevealed(true);
    if (q.type !== "poll") { if (exact) playSuccess(); else playFail(); }
  };

  const next = async () => {
    if (!quiz) return;
    if (idx + 1 >= quiz.questions.length) {
      setDone(true);
      if ((quiz as any).examMode && user) { try { await recordExamAttempt(quizId, user.uid, user.email || ""); } catch {} }
      try {
        await saveAssignmentResult({
          quizId,
          quizTitle: quiz.title,
          hostId: quiz.hostId,
          nickname: name.trim() || "Anonymous",
          ccEmail: ccEmail.trim() || null,
          score,
          correctCount,
          totalQuestions: quiz.questions.length,
        });
        try {
          await sendAssignmentEmail({
            toEmail: (quiz as any).creatorEmail || "",
            quizTitle: quiz.title,
            playerName: name.trim() || "Anonymous",
            score,
            correctCount,
            totalQuestions: quiz.questions.length,
          });
        } catch { /* email is best-effort; results are still saved */ }
      } catch {}
      return;
    }
    setIdx((i) => i + 1);
    setPicked([]);
    setTyped("");
    setRevealed(false);
    startRef.current = Date.now();
  };

  const sendCopy = async () => {
    if (!ccEmail.trim() || !quiz) return;
    setCopyStatus("sending");
    try {
      await sendAssignmentEmail({
        toEmail: ccEmail.trim(),
        quizTitle: quiz.title,
        playerName: name.trim() || "Anonymous",
        score,
        correctCount,
        totalQuestions: quiz.questions.length,
      });
      setCopyStatus("sent");
    } catch {
      setCopyStatus("err");
    }
  };

  if (error) return <div className="p-10 text-center text-red-500 font-semibold">{error}</div>;
  if (!quiz) return <div className="p-10 text-center text-gray-500 font-bold">Loading quiz...</div>;
  if ((quiz as any).examMode && examBlocked === "attempted") return (
    <div className="min-h-[calc(100vh-64px)] bg-kahoot-dark bg-grid-pattern flex items-center justify-center p-6 text-white text-center">
      <div className="max-w-sm"><h1 className="text-3xl font-black mb-2">Already completed</h1><p className="text-white/70">You have already taken this exam. Only one attempt is allowed.</p></div>
    </div>
  );
  if ((quiz as any).examMode && !user) return (
    <div className="min-h-[calc(100vh-64px)] bg-kahoot-dark bg-grid-pattern flex items-center justify-center p-6 text-white text-center">
      <div className="max-w-sm">
        <h1 className="text-3xl font-black mb-2">Exam sign-in</h1>
        <p className="text-white/70 mb-6">This is an exam. Sign in so your result can be recorded &mdash; only one attempt is allowed.</p>
        <button onClick={() => loginWithGoogle().catch(() => {})} className="bg-white text-gray-900 font-bold px-6 py-3 rounded-xl w-full mb-3">Continue with Google</button>
        <a href="/login" className="text-white/60 underline text-sm">or sign in with email</a>
      </div>
    </div>
  );

  if (!started) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-kahoot-dark bg-grid-pattern flex items-center justify-center p-6">
        <Card className="w-full max-w-md text-center">
          <h1 className="text-3xl font-black mb-1" dir="auto">{quiz.title}</h1>
          <p className="text-gray-500 mb-1">{quiz.questions.length} questions</p>
          <p className="text-gray-400 text-sm mb-6">📝 Self-paced assignment — play any time, no host needed.</p>
          <input
            type="text"
            dir="auto"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            placeholder="Your name"
            className="text-center text-xl font-bold border-b-4 border-kahoot-purple py-2 focus:outline-none w-full mb-4"
          />
          <Button size="lg" className="w-full" onClick={begin}>Start</Button>
        </Card>
      </div>
    );
  }

  if (done) {
    const pct = quiz.questions.length ? Math.round((correctCount / quiz.questions.length) * 100) : 0;
    return (
      <div className="min-h-[calc(100vh-64px)] bg-kahoot-dark bg-grid-pattern flex items-center justify-center p-6 text-white">
        <Confetti />
        <div className="flex flex-col items-center text-center w-full max-w-sm">
          <h1 className="text-4xl font-black mb-4">🎉 All done!</h1>
          <p className="text-3xl font-black mb-1">{score.toLocaleString()} pts</p>
          <p className="text-white/70 mb-6">{correctCount}/{quiz.questions.length} correct ({pct}%)</p>
          <div className="bg-white/10 rounded-2xl p-4 mb-6 w-full text-sm">
            <p className="text-white/80 mb-2">
              📤 Your results have been sent to the quiz creator{quiz.creatorEmail ? ": " : "."}
              {quiz.creatorEmail && <span className="font-bold">{quiz.creatorEmail}</span>}
            </p>
            <p className="text-white/60 mb-1">Want a copy sent to your email too?</p>
            <div className="flex gap-2">
              <input
                type="email"
                dir="auto"
                value={ccEmail}
                onChange={(e) => { setCcEmail(e.target.value); setCopyStatus(""); }}
                placeholder="you@example.com"
                className="flex-1 text-center rounded-lg py-2 px-3 text-gray-900 font-semibold"
              />
              <Button size="sm" onClick={sendCopy} loading={copyStatus === "sending"} disabled={!ccEmail.trim() || copyStatus === "sent"}>
                {copyStatus === "sent" ? "✓ Sent" : "Send"}
              </Button>
            </div>
            {copyStatus === "err" && <p className="text-red-300 text-xs mt-1">Could not send. Check the email and try again.</p>}
          </div>
          <a href="/"><Button size="lg">Back to QuizUps</Button></a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-kahoot-dark bg-grid-pattern p-6 text-white">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <span className="text-white/70 font-semibold">Q {idx + 1}/{quiz.questions.length}</span>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setSound(toggleSfx())} className="text-2xl leading-none" title="Sound effects on/off" aria-label="Toggle sound">{sound ? "\uD83D\uDD0A" : "\uD83D\uDD07"}</button>
            <span className="font-bold">{score.toLocaleString()} pts</span>
          </div>
        </div>

        <Card className="mb-4 text-center text-gray-900">
          <h2 className="text-xl font-black" dir="auto">{q.text}</h2>
          {q.multiSelect && <p className="text-sm text-gray-500 mt-1">☑️ Select all that apply</p>}
          {q.imageUrl && <img src={q.imageUrl} alt="" className="max-h-52 mx-auto rounded-xl mt-3" />}
          {q.audioUrl && <audio src={q.audioUrl} controls className="mx-auto mt-3" />}
        </Card>

        {q.type === "typeanswer" ? (
          <div className="flex flex-col gap-3">
            <input
              type="text"
              dir="auto"
              value={typed}
              disabled={revealed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="Type your answer..."
              className="text-center text-xl font-bold rounded-xl py-3 px-3 text-gray-900"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {opts.map((opt, i) => {
              const color = ANSWER_COLORS[i] || ANSWER_COLORS[0];
              const isPicked = picked.includes(i);
              return (
                <button
                  key={i}
                  dir="auto"
                  disabled={revealed}
                  onClick={() =>
                    setPicked((cur) =>
                      q.multiSelect ? (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]) : [i]
                    )
                  }
                  className={
                    "flex items-center gap-3 p-4 rounded-xl text-left font-bold w-full transition-all " +
                    color.bg + " " + color.text + (isPicked ? " ring-4 ring-white" : "") + (revealed ? " opacity-70" : "")
                  }
                >
                  <span className="text-2xl">{color.shape}</span> {opt}
                </button>
              );
            })}
          </div>
        )}

        {revealed && (
          <div className="text-center mt-4">
            {q.type === "poll" ? (
              <p className="text-2xl font-black">🗳️ Vote recorded!</p>
            ) : (
              <>
                <p className="text-3xl font-black">{lastCorrect ? "✓ Correct!" : "✗ Wrong!"}</p>
                {lastPoints > 0 && <p className="text-kahoot-yellow font-bold text-xl">+{lastPoints} pts</p>}
                {!lastCorrect && q.type !== "typeanswer" && (
                  <p className="text-white/70 mt-1" dir="auto">
                    Answer: {q.multiSelect && q.correctAnswers?.length
                      ? q.correctAnswers.map((ci: number) => opts[ci]).join(", ")
                      : opts[Number(q.correctAnswer ?? 0)]}
                  </p>
                )}
                {!lastCorrect && q.type === "typeanswer" && (
                  <p className="text-white/70 mt-1" dir="auto">Answer: {q.correctText}</p>
                )}
              </>
            )}
          </div>
        )}

        <div className="mt-6">
          {revealed ? (
            <Button size="lg" className="w-full" onClick={next}>
              {idx + 1 >= quiz.questions.length ? "Finish" : "Next question"}
            </Button>
          ) : (
            <Button
              size="lg"
              className="w-full"
              disabled={q.type === "typeanswer" ? !typed.trim() : (opts.length > 0 && !picked.length)}
              onClick={submit}
            >
              {opts.length === 0 && q.type !== "typeanswer" ? "Skip question" : "Submit"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
