"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/contexts/LanguageContext";
import { createLiveGame } from "@/lib/realtimeDb";
import { useGame } from "@/hooks/useGame";
import { copyText, randomNickname } from "@/lib/utils";
import { logHandled } from "@/components/ui/ErrorReporter";
import { ensureHost, isAnonDisabled, buildFunQuiz } from "@/lib/funGame";
import { submitTriviaScore, topTriviaScores } from "@/lib/firestore";
import { TRIVIA_CATEGORIES, pickQuestions, seededCompetitors, bankSize } from "@/lib/triviaBanks";
import { playSuccess, playFail, isSfxEnabled, toggleSfx } from "@/lib/sfx";
import Button from "@/components/ui/Button";

const SOLO_COUNT = 8;
const ANSWER_STYLES = ["bg-kahoot-red", "bg-kahoot-blue", "bg-kahoot-yellow text-gray-900", "bg-kahoot-green"];
const SHAPES = ["▲", "◆", "●", "■"];

export default function TriviaClient() {
  const router = useRouter();
  const { t, lang } = useLang();
  const [view, setView] = useState<string>("home");
  const [cat, setCat] = useState<any>(null);
  const [name, setName] = useState("");
  const [sfxOn, setSfxOn] = useState(true);
  const [level, setLevel] = useState<string>("intermediate");
  const [timePer, setTimePer] = useState(15);
  const [qs, setQs] = useState<any[]>([]);
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [cd, setCd] = useState(3);
  const [board, setBoard] = useState<any[]>([]);
  const [rank, setRank] = useState(0);
  const [total, setTotal] = useState(0);
  const [gameId, setGameId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState("");
  const { state } = useGame(gameId);

  useEffect(() => { setName(randomNickname()); setSfxOn(isSfxEnabled()); }, []);

  const scrollTop = () => { try { window.scrollTo(0, 0); } catch (e) {} };

  // Countdown before the questions start.
  useEffect(() => {
    if (view !== "count") return;
    if (cd <= 0) { setView("solo"); scrollTop(); return; }
    const id = setTimeout(() => setCd((c) => c - 1), 850);
    return () => clearTimeout(id);
  }, [view, cd]);

  // Per-question timer.
  useEffect(() => {
    if (view !== "solo" || locked) return;
    if (timeLeft <= 0) { lockAnswer(-1); return; }
    const id = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [view, locked, timeLeft]);

  const catName = (c: any) => (c ? (c.name[lang] || c.name.en) : "");

  const startSolo = () => {
    const tp = level === "easy" ? 20 : level === "hard" ? 10 : 15;
    const picks = pickQuestions(cat.id, SOLO_COUNT, lang as any, level);
    setTimePer(tp);
    setQs(picks); setQi(0); setPicked(null); setLocked(false);
    setScore(0); setCorrect(0); setTimeLeft(tp); setCd(3); setView("count"); scrollTop();
  };

  const lockAnswer = (idx: number) => {
    if (locked) return;
    const q = qs[qi];
    const right = !!q && idx === q.correctAnswer;
    try { if (right) playSuccess(); else playFail(); } catch (e) {}
    const pts = right ? 500 + Math.round((500 * Math.max(0, timeLeft)) / timePer) : 0;
    const newScore = score + pts;
    const newCorrect = correct + (right ? 1 : 0);
    setLocked(true); setPicked(idx); setScore(newScore); setCorrect(newCorrect);
    const last = qi + 1 >= qs.length;
    setTimeout(() => {
      if (last) finish(newScore, newCorrect);
      else { setQi(qi + 1); setPicked(null); setLocked(false); setTimeLeft(timePer); }
    }, 1300);
  };

  const finish = async (sc: number, cor: number) => {
    setTotal(qs.length); setView("result"); scrollTop();
    const n = (name || "").trim() || "You";
    try { await submitTriviaScore(cat.id, n, sc, cor, qs.length); } catch (e) { logHandled("trivia score submit", e); }
    let real: any[] = [];
    try { real = await topTriviaScores(cat.id, 50); } catch (e) {}
    const fakes = seededCompetitors(cat.id, 20);
    const me = { name: n, score: sc, you: true };
    const all = fakes.map((f) => ({ name: f.name, score: f.score }))
      .concat(real.map((r) => ({ name: r.name || "Player", score: r.score || 0 })))
      .concat([me as any]);
    all.sort((a, b) => b.score - a.score);
    const rk = all.findIndex((x: any) => x.you);
    setRank(rk + 1); setBoard(all.slice(0, 15));
  };

  const startFamily = async () => {
    if (busy) return; setBusy(true); setError("");
    try {
      let hostId: string;
      try { hostId = await ensureHost(); }
      catch (e: any) {
        setError(isAnonDisabled(e) ? t("Playing without an account is not switched on yet. Please sign in and try again.") : t("We could not start the game. Please try again."));
        setBusy(false); return;
      }
      const picks = pickQuestions(cat.id, SOLO_COUNT, lang as any, level);
      const quiz = buildFunQuiz(catName(cat), picks as any, "en" as any, hostId);
      const game = await createLiveGame(quiz.id, hostId, quiz);
      setGameId(game.gameId); setPin(game.pin); setView("family"); scrollTop();
    } catch (e) { logHandled("trivia family start", e); setError(t("We could not start the game. Please try again.")); }
    setBusy(false);
  };

  const joinUrl = gameId ? "https://quizups.com/join?gameId=" + gameId : "";
  const qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=" + encodeURIComponent(joinUrl);
  const waUrl = "https://wa.me/?text=" + encodeURIComponent(t("Join my trivia game on QuizUps!") + " " + joinUrl);
  const playerCount = state && state.players ? Object.keys(state.players).length : 0;

  const doCopy = async (val: string, which: string) => {
    const ok = await copyText(val);
    if (ok) { setCopied(which); setTimeout(() => setCopied(""), 1800); }
  };

  const toggleSound = () => { setSfxOn(toggleSfx()); };
  const reset = () => { setView("home"); setCat(null); setGameId(""); setPin(""); setError(""); scrollTop(); };

  const SoundBtn = () => (
    <button onClick={toggleSound} aria-label="sound" title="Sound" className="text-xl leading-none px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200">{sfxOn ? "🔊" : "🔇"}</button>
  );

  // ----- HOME -----
  if (view === "home") {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-indigo-50 to-white px-4 py-8">
        <div className="max-w-3xl mx-auto text-center">
          <div className="flex justify-end mb-1"><SoundBtn /></div>
          <div className="text-6xl mb-2">🎉</div>
          <h1 className="text-3xl sm:text-4xl font-black mb-2 text-kahoot-purple">{t("Trivia Arena")}</h1>
          <p className="text-gray-500 mb-6">{t("Pick a category. Play solo against the world, or invite your family.")}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {TRIVIA_CATEGORIES.map((c: any) => (
              <button key={c.id} onClick={() => { setCat(c); setError(""); setView("mode"); scrollTop(); }}
                className="bg-white rounded-2xl p-4 sm:p-5 shadow-md border border-gray-100 hover:scale-105 active:scale-95 transition-transform flex flex-col items-center gap-1">
                <span className="text-4xl sm:text-5xl">{c.emoji}</span>
                <span className={"font-black text-sm sm:text-base leading-tight " + (c.tc || "text-gray-800")}>{c.name[lang] || c.name.en}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-6">{t("No sign-up needed to play.")}</p>
        </div>
      </div>
    );
  }

  // ----- MODE -----
  if (view === "mode") {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-indigo-50 to-white px-4 py-8">
        <div className="max-w-md mx-auto">
          <button onClick={reset} className="text-sm font-bold text-gray-500 mb-4">{t("← Back")}</button>
          <div className={"bg-gradient-to-br " + cat.color + " text-white rounded-3xl p-6 text-center mb-5 shadow-lg"}>
            <div className="text-6xl mb-1">{cat.emoji}</div>
            <h1 className="text-2xl font-black">{catName(cat)}</h1>
          </div>
          <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-50 p-4 mb-5">
            <label htmlFor="tname" className="block text-base font-black text-kahoot-purple mb-1">👤 {t("Your name")}</label>
            <input id="tname" value={name} onChange={(e) => setName(e.target.value)} maxLength={20} onFocus={(e) => e.target.select()}
              className="w-full text-center text-2xl font-black rounded-xl border-2 border-indigo-300 bg-white py-3 focus:outline-none focus:border-indigo-500" />
            <p className="text-xs text-gray-500 mt-2">{t("This name goes on the worldwide leaderboard.")}</p>
          </div>
          <div className="mb-5">
            <p className="text-sm font-black text-gray-700 mb-2">{t("Choose a level")}</p>
            <div className="grid grid-cols-3 gap-2">
              {[["easy", t("Easy")], ["intermediate", t("Intermediate")], ["hard", t("Hard")]].map(([lv, lab]) => (
                <button key={lv} onClick={() => setLevel(lv)} className={"rounded-xl py-2 text-sm font-bold border-2 " + (level === lv ? "border-kahoot-purple bg-kahoot-purple text-white" : "border-gray-200 bg-white text-gray-600")}>{lab}</button>
              ))}
            </div>
          </div>
          {error && <p className="text-red-500 text-sm font-semibold mb-3 text-center">{error}</p>}
          <button onClick={startSolo} className="w-full mb-3 rounded-2xl bg-kahoot-purple text-white p-5 text-left shadow-lg hover:scale-[1.02] active:scale-95 transition-transform">
            <div className="text-2xl font-black">🌍 {t("Play solo")}</div>
            <div className="text-sm opacity-90">{t("Answer fast and climb the worldwide leaderboard.")}</div>
          </button>
          <button onClick={startFamily} disabled={busy} className="w-full rounded-2xl bg-emerald-600 text-white p-5 text-left shadow-lg hover:scale-[1.02] active:scale-95 transition-transform disabled:opacity-60">
            <div className="text-2xl font-black">👨‍👩‍👧‍👦 {busy ? t("One moment…") : t("Play with family")}</div>
            <div className="text-sm opacity-90">{t("Invite everyone by WhatsApp or QR and play together.")}</div>
          </button>
        </div>
      </div>
    );
  }

  // ----- COUNTDOWN -----
  if (view === "count") {
    return (
      <div className={"min-h-[calc(100vh-64px)] bg-gradient-to-br " + (cat ? cat.color : "from-indigo-500 to-purple-600") + " flex flex-col items-center justify-center text-white"}>
        <p className="text-2xl font-bold mb-2">{t("Get ready…")}</p>
        <div className="text-8xl font-black animate-pulse">{cd > 0 ? cd : "Go!"}</div>
        <p className="mt-4 text-white/80 font-bold">{cat ? cat.emoji + " " + catName(cat) : ""}</p>
      </div>
    );
  }

  // ----- SOLO PLAY -----
  if (view === "solo") {
    const q = qs[qi];
    if (!q) return <div className="p-10 text-center text-gray-400 font-bold">{t("Loading…")}</div>;
    return (
      <div className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-indigo-50 to-white px-4 py-6">
        <div className="max-w-xl mx-auto">
          <div className="flex items-center justify-between mb-3 text-sm font-bold text-gray-600">
            <span>{cat.emoji} {catName(cat)}</span>
            <span>{t("Question")} {qi + 1}/{qs.length}</span>
            <span className="flex items-center gap-2"><span className="text-kahoot-purple">⭐ {score}</span><SoundBtn /></span>
          </div>
          <div className="h-2 rounded-full bg-gray-200 mb-4 overflow-hidden">
            <div className={"h-full " + (timeLeft <= 5 ? "bg-kahoot-red" : "bg-kahoot-green")} style={{ width: (timeLeft / timePer) * 100 + "%", transition: "width 1s linear" }} />
          </div>
          <div className="bg-white rounded-2xl shadow p-6 mb-4 text-center min-h-[96px] flex items-center justify-center">
            <h2 className="text-xl sm:text-2xl font-black" dir="auto">{q.text}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {q.options.map((opt: string, i: number) => {
              const isRight = i === q.correctAnswer;
              const show = locked;
              const cls = show
                ? (isRight ? "bg-kahoot-green text-white" : (i === picked ? "bg-kahoot-red text-white opacity-90" : "bg-gray-100 text-gray-400"))
                : ANSWER_STYLES[i % 4] + " text-white";
              return (
                <button key={i} disabled={locked} onClick={() => lockAnswer(i)} dir="auto"
                  className={"rounded-2xl p-4 font-bold text-lg flex items-center gap-3 shadow transition-transform active:scale-95 " + cls}>
                  <span className="text-xl">{SHAPES[i % 4]}</span>
                  <span>{opt}</span>
                </button>
              );
            })}
          </div>
          {locked && (
            <p className={"text-center mt-4 text-xl font-black " + (picked === q.correctAnswer ? "text-kahoot-green" : "text-kahoot-red")}>
              {picked === q.correctAnswer ? t("Correct! 🎉") : t("Oops!")}
            </p>
          )}
        </div>
      </div>
    );
  }

  // ----- RESULT -----
  if (view === "result") {
    const pct = total ? Math.round((correct / total) * 100) : 0;
    const cheer = pct >= 80 ? t("Amazing! 🏆") : pct >= 50 ? t("Well played! 👏") : t("Good try — play again! 💪");
    return (
      <div className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-indigo-50 to-white px-4 py-8">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-5">
            <div className="text-6xl mb-1">{pct >= 80 ? "🏆" : pct >= 50 ? "🎉" : "💪"}</div>
            <h1 className="text-3xl font-black">{cheer}</h1>
            <p className="text-gray-500 mt-1">{catName(cat)}</p>
            <div className="flex justify-center gap-6 mt-4">
              <div><div className="text-3xl font-black text-kahoot-purple">{score}</div><div className="text-xs font-bold text-gray-500">{t("Score")}</div></div>
              <div><div className="text-3xl font-black text-kahoot-green">{correct}/{total}</div><div className="text-xs font-bold text-gray-500">{t("Correct")}</div></div>
              <div><div className="text-3xl font-black text-amber-500">#{rank || "—"}</div><div className="text-xs font-bold text-gray-500">{t("World rank")}</div></div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow p-4 mb-5">
            <h2 className="font-black text-gray-700 mb-2 text-center">🌍 {t("Worldwide leaderboard")}</h2>
            <div className="flex flex-col gap-1">
              {board.map((r: any, i: number) => (
                <div key={i} className={"flex items-center justify-between rounded-lg px-3 py-2 text-sm " + (r.you ? "bg-indigo-100 font-black" : "")}>
                  <span className="flex items-center gap-2"><span className="w-6 text-gray-400 font-bold">{i + 1}</span><span dir="auto">{r.you ? t("You") : r.name}</span></span>
                  <span className="font-bold text-kahoot-purple">{r.score}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Button onClick={reset} size="lg" className="w-full">{t("Play again")}</Button>
            <Button onClick={startFamily} variant="secondary" className="w-full">👨‍👩‍👧‍👦 {t("Play with family")}</Button>
          </div>
        </div>
      </div>
    );
  }

  // ----- FAMILY LOBBY -----
  if (view === "family") {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-emerald-50 to-white px-4 py-8">
        <div className="max-w-md mx-auto text-center">
          <div className="text-5xl mb-1">{cat.emoji}</div>
          <h1 className="text-2xl font-black mb-1">{catName(cat)}</h1>
          <p className="text-gray-500 mb-4">{t("Invite everyone by WhatsApp or QR and play together.")}</p>
          <div className="bg-white rounded-2xl shadow p-5 mb-4">
            <p className="text-gray-400 text-sm font-bold">{t("Game PIN")}</p>
            <p className="text-6xl font-black tracking-widest text-emerald-600">{pin}</p>
            <div className="flex justify-center my-3">
              {gameId && <img src={qrUrl} alt="QR" className="w-40 h-40 rounded-xl" />}
            </div>
            <p className="text-xs text-gray-400">{t("Scan to join")}</p>
          </div>
          <div className="flex flex-col gap-2 mb-4">
            <a href={waUrl} target="_blank" rel="noopener noreferrer" className="w-full rounded-xl bg-green-500 text-white font-bold py-3 shadow hover:bg-green-600">{t("Share on WhatsApp")}</a>
            <button onClick={() => doCopy(joinUrl, "link")} className="w-full rounded-xl bg-emerald-100 text-emerald-700 font-bold py-3">{copied === "link" ? t("✓ Link copied") : t("🔗 Copy join link")}</button>
          </div>
          <p className="text-sm font-bold text-gray-600 mb-3">{playerCount > 0 ? (playerCount + " " + t("players in")) : t("Waiting for players…")}</p>
          {error && <p className="text-red-500 text-sm font-semibold mb-3">{error}</p>}
          <Button onClick={() => router.push("/host/play?gameId=" + gameId)} size="lg" className="w-full" disabled={!gameId}>{t("Start the game")}</Button>
          <button onClick={reset} className="text-sm font-bold text-gray-500 mt-3">{t("← Back")}</button>
        </div>
      </div>
    );
  }

  return null;
}
