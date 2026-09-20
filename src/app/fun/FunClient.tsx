"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLang } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { generateQuestions } from "@/lib/integrations";
import { createLiveGame, kickPlayer } from "@/lib/realtimeDb";
import { useGame } from "@/hooks/useGame";
import { logHandled, reportProblem } from "@/components/ui/ErrorReporter";
import {
  FUN_MIN_QUESTIONS,
  FUN_MAX_QUESTIONS,
  FUN_MAX_PER_WINDOW,
  buildFunQuiz,
  ensureHost,
  funCooldownMinutes,
  funStartsLeft,
  isAnonDisabled,
  keepFunQuiz,
  recordFunStart,
  type FunLang,
} from "@/lib/funGame";
import type { Quiz } from "@/types";
import Button from "@/components/ui/Button";

const LANG_LABEL: Record<FunLang, string> = { en: "English", ar: "العربية", uk: "Українська" };

const IDEAS = ["General knowledge", "Animals", "Geography", "Science", "History", "Movies & TV", "Music", "Sports"];

export default function FunClient() {
  const router = useRouter();
  const { t, lang } = useLang();
  const { user } = useAuth();

  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(FUN_MIN_QUESTIONS);
  const [qLang, setQLang] = useState<FunLang>(lang === "ar" ? "ar" : lang === "uk" ? "uk" : "en");
  const [phase, setPhase] = useState<"setup" | "working" | "lobby">("setup");
  const [error, setError] = useState("");
  const [gameId, setGameId] = useState("");
  const [pin, setPin] = useState("");
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [copied, setCopied] = useState<"" | "link" | "pin">("");
  const [left, setLeft] = useState(FUN_MAX_PER_WINDOW);
  const [progress, setProgress] = useState(0);
  const [reported, setReported] = useState(false);

  const { state } = useGame(gameId || null);
  const players = state?.players ? Object.values(state.players) : [];
  const startedRef = useRef(false);

  useEffect(() => { setLeft(funStartsLeft()); }, []);
  useEffect(() => { setQLang(lang === "ar" ? "ar" : lang === "uk" ? "uk" : "en"); }, [lang]);
  // Estimated progress: the AI returns everything at once, so ease toward 90%
  // over the typical wait, then the lobby replaces this on success.
  useEffect(() => {
    if (phase !== "working") { setProgress(0); return; }
    setProgress(8);
    const id = setInterval(() => {
      setProgress((p) => (p >= 90 ? 90 : p + Math.max(1, Math.round((93 - p) / 12))));
    }, 600);
    return () => clearInterval(id);
  }, [phase]);

  const origin = typeof window !== "undefined" ? window.location.origin : "https://quizups.com";
  const joinLink = gameId ? origin + "/join?gameId=" + gameId : "";

  const copy = async (value: string, which: "link" | "pin") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(which);
      setTimeout(() => setCopied(""), 1800);
    } catch (e) {
      setError(t("Could not copy — select the link and copy it manually."));
    }
  };

  const start = async () => {
    const subject = topic.trim();
    if (!subject) { setError(t("Type a topic first - anything at all.")); return; }
    if (funStartsLeft() <= 0) {
      setError(t("You have started a few games recently. Try again in") + " " + funCooldownMinutes() + " " + t("minutes."));
      return;
    }
    setError("");
    setReported(false);
    setPhase("working");
    try {
      const questions = await generateQuestions(subject, count, qLang, [], "");
      if (!questions.length) {
        setError(t("The AI came back empty. Try describing the topic differently."));
        setPhase("setup");
        return;
      }
      let hostId: string;
      try {
        hostId = await ensureHost();
      } catch (authErr: any) {
        logHandled("fun anonymous sign-in", authErr);
        setError(
          isAnonDisabled(authErr)
            ? t("Playing without an account is not switched on yet. Please sign in and try again.")
            : t("We could not start the game. Please try again.")
        );
        setPhase("setup");
        return;
      }
      const built = buildFunQuiz(subject, questions, qLang, hostId);
      const game = await createLiveGame(built.id, hostId, built);
      recordFunStart();
      setLeft(funStartsLeft());
      setQuiz(built);
      setGameId(game.gameId);
      setPin(game.pin);
      keepFunQuiz(built);
      setPhase("lobby");
    } catch (err: any) {
      logHandled("fun game start", err);
      setError(t("We could not build that one. Try again, or word the topic differently."));
      setPhase("setup");
    }
  };

  const play = () => {
    if (!quiz || startedRef.current) return;
    startedRef.current = true;
    router.push("/host/play?gameId=" + gameId + "&quizId=" + quiz.id);
  };

  const reportFun = () => {
    try { reportProblem("Just for Fun problem", error, "reported by user from /fun"); } catch (e) {}
    setReported(true);
  };

  /* ----------------------------------------------------------------- lobby */
  if (phase === "lobby" && quiz) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-kahoot-dark text-white px-4 sm:px-6 py-8">
        <div className="max-w-2xl mx-auto">
          <p className="text-white/60 font-semibold">{t("🎉 Just for fun")}</p>
          <h1 className="text-2xl sm:text-3xl font-black mb-1" dir="auto">{quiz.title}</h1>
          <p className="text-white/60 mb-6">
            {quiz.questions.length} {t("questions")} · {LANG_LABEL[qLang]}
          </p>

          <div className="bg-white/10 rounded-2xl p-5 mb-4">
            <p className="text-white/70 text-sm font-bold uppercase tracking-wide mb-1">{t("Game PIN")}</p>
            <p className="text-5xl sm:text-6xl font-black tracking-widest mb-3">{pin}</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => copy(pin, "pin")} className="text-sm font-bold px-3 py-2 rounded-lg bg-white/15 hover:bg-white/25">
                {copied === "pin" ? t("Copied") : t("Copy PIN")}
              </button>
              <button onClick={() => copy(joinLink, "link")} className="text-sm font-bold px-3 py-2 rounded-lg bg-white/15 hover:bg-white/25">
                {copied === "link" ? t("✓ Link copied") : t("🔗 Copy join link")}
              </button>
            </div>
            <p className="text-white/50 text-xs mt-3 break-all">{joinLink}</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-start mb-6">
            <img
              alt={t("Scan to join")}
              className="bg-white rounded-xl p-2 w-[160px] h-[160px] shrink-0 mx-auto sm:mx-0"
              src={"https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=" + encodeURIComponent(joinLink)}
            />
            <div className="flex-1 min-w-0">
              <p className="font-bold mb-2">
                {players.length} {players.length === 1 ? t("player in") : t("players in")}
              </p>
              {players.length === 0 ? (
                <p className="text-white/60 text-sm">{t("Share the PIN or the link. Friends join from any phone — no account needed.")}</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {players.map((p: any) => (
                    <span key={p.id} className="bg-white/15 rounded-full ps-3 pe-2 py-1 text-sm font-semibold flex items-center gap-2">
                      <span dir="auto">{p.nickname}</span>
                      <button onClick={() => kickPlayer(gameId, p.id)} aria-label={t("Remove")} className="text-white/50 hover:text-white font-black">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Button size="lg" className="w-full" onClick={play} disabled={players.length === 0}>
            {players.length === 0 ? t("Waiting for players…") : t("Start the game")}
          </Button>

          <p className="text-white/50 text-xs mt-6">
            {/* An anonymous host is signed in, so `user` alone is not the test. */}
            {user && !user.isAnonymous
              ? t("This round is not saved. It will be in your dashboard after the game if you want to keep it.")
              : t("This round is not saved anywhere. Create a free account after the game to keep it and host again.")}
          </p>
        </div>
      </div>
    );
  }

  /* ----------------------------------------------------------------- setup */
  return (
    <div className="min-h-[calc(100vh-64px)] bg-kahoot-dark text-white px-4 sm:px-6 py-10">
      <div className="max-w-lg mx-auto">
        <h1 className="text-3xl sm:text-4xl font-black mb-2">{t("🎉 Just for fun")}</h1>
        <p className="text-white/70 mb-8">
          {t("Pick a topic, get a code, play with your friends. No account, no setup, about a minute.")}
        </p>

        <label className="block text-sm font-bold mb-2" htmlFor="fun-topic">{t("What is it about?")}</label>
        <input
          id="fun-topic"
          dir="auto"
          value={topic}
          onChange={(e) => { setTopic(e.target.value); setError(""); }}
          onKeyDown={(e) => { if (e.key === "Enter" && phase === "setup") start(); }}
          placeholder={t("90s pop music, the solar system, our office…")}
          className="w-full rounded-xl px-4 py-3 text-gray-900 text-lg font-semibold mb-2"
          disabled={phase === "working"}
        />
        <div className="flex flex-wrap gap-2 mb-6">
          {IDEAS.map((idea) => (
            <button
              key={idea}
              type="button"
              onClick={() => { setTopic(t(idea)); setError(""); }}
              disabled={phase === "working"}
              className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-50"
            >
              {t(idea)}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-bold mb-2" htmlFor="fun-count">
              {t("How many questions?")} <span className="text-white/60 font-semibold">{count}</span>
            </label>
            <input
              id="fun-count"
              type="range"
              min={FUN_MIN_QUESTIONS}
              max={FUN_MAX_QUESTIONS}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              disabled={phase === "working"}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-white/50">
              <span>{FUN_MIN_QUESTIONS}</span>
              <span>{FUN_MAX_QUESTIONS}</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold mb-2" htmlFor="fun-lang">{t("Language")}</label>
            <select
              id="fun-lang"
              value={qLang}
              onChange={(e) => setQLang(e.target.value as FunLang)}
              disabled={phase === "working"}
              className="w-full rounded-xl px-4 py-3 text-gray-900 font-semibold"
            >
              <option value="en">{LANG_LABEL.en}</option>
              <option value="ar">{LANG_LABEL.ar}</option>
              <option value="uk">{LANG_LABEL.uk}</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-4">
            <p className="text-red-300 font-semibold text-sm">{error}</p>
            {reported ? (
              <p className="text-green-300 text-xs mt-1">{t("Thanks — reported. We'll look into it.")}</p>
            ) : (
              <button type="button" onClick={reportFun} className="text-xs underline text-white/70 hover:text-white mt-1">{t("Report this problem")}</button>
            )}
          </div>
        )}

        <Button size="lg" className="w-full" onClick={start} loading={phase === "working"} disabled={phase === "working" || !topic.trim()}>
          {phase === "working" ? t("Writing your questions…") : t("Get my game code")}
        </Button>

        {phase === "working" && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-white/70 mb-1">
              <span>{progress < 35 ? t("Thinking up your questions…") : progress < 75 ? t("Writing the answer choices…") : t("Almost ready…")}</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-green-400 transition-all duration-500" style={{ width: progress + "%" }} />
            </div>
            <p className="text-white/50 text-xs mt-2 text-center">{t("This takes a few seconds.")}</p>
          </div>
        )}

        {phase === "setup" && left < FUN_MAX_PER_WINDOW && (
          <p className="text-white/50 text-xs mt-4 text-center">
            {left > 0 ? left + " " + t("more games this hour.") : t("You have started a few games recently. Try again in") + " " + funCooldownMinutes() + " " + t("minutes.")}
          </p>
        )}

        <p className="text-white/50 text-sm mt-8 text-center">
          {t("Want to build your own questions instead?")}{" "}
          <Link href="/try" className="underline hover:text-white">{t("Build a quiz right now")}</Link>
        </p>
      </div>
    </div>
  );
}
