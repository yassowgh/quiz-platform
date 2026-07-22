"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getQuiz } from "@/lib/firestore";
import { createLiveGame, kickPlayer, lockLobby } from "@/lib/realtimeDb";
import { listGamesByHost } from "@/lib/firestore";
import { useGame } from "@/hooks/useGame";
import type { Quiz } from "@/types";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

export default function LobbyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const quizId = searchParams.get("quizId") || "";
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [pin, setPin] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [teamMode, setTeamMode] = useState(false);
  const [ghostMode, setGhostMode] = useState(false);
  const [pastGames, setPastGames] = useState<any[]>([]);
  const { state } = useGame(gameId);
  const [muted, setMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Lobby waiting music
  useEffect(() => {
    const audio = new Audio("/music.mp3");
    audio.loop = true;
    audio.volume = 0.3;
    audioRef.current = audio;
    audio.play().catch(() => {
      const resume = () => { audio.play().catch(() => {}); document.removeEventListener("click", resume); };
      document.addEventListener("click", resume);
    });
    return () => { audio.pause(); audio.src = ""; };
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
  }, [muted]);

  useEffect(() => {
    if (!quizId) return;
    getQuiz(quizId).then(setQuiz);
  }, [quizId]);

  useEffect(() => {
    if (!user) return;
    listGamesByHost(user.uid)
      .then((gs) => setPastGames((gs as any[]).filter((g) => g.quizId === quizId && g.players?.length)))
      .catch(() => setPastGames([]));
  }, [user, quizId]);

  const startGame = async () => {
    if (!quiz || !user) return;
    setCreating(true);
    let ghosts: Record<string, any> = {};
    if (ghostMode && pastGames.length) {
      const last = pastGames[0];
      (last.players || []).slice(0, 5).forEach((gp: any, i: number) => {
        const id = "ghost_" + i;
        ghosts[id] = {
          id,
          nickname: "👻 " + (gp.nickname || "Ghost"),
          score: gp.score || 0,
          correctCount: gp.correctCount || 0,
          streak: 0,
          hasAnswered: true,
          isGhost: true,
          joinedAt: Date.now(),
        };
      });
    }
    const { gameId: gid, pin: p } = await createLiveGame(quiz.id, user.uid, quiz, { teamMode, ghosts });
    setGameId(gid);
    setPin(p);
    setCreating(false);
  };

  const handleStart = () => {
    if (!gameId) return;
    router.push(`/host/play?gameId=${gameId}&quizId=${quiz?.id}`);
  };

  const players = state?.players ? Object.values(state.players) : [];

  return (
    <div className="min-h-[calc(100vh-64px)] bg-kahoot-dark bg-grid-pattern flex flex-col items-center justify-center p-6">
      <button onClick={() => setMuted((m) => !m)} className="fixed bottom-4 right-4 z-40 text-2xl bg-white/10 hover:bg-white/20 rounded-full p-3" title="Mute music">{muted ? "🔇" : "🔊"}</button>
      {!gameId ? (
        <Card className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">🎮</div>
            <h1 className="text-2xl font-black" dir="auto">{quiz?.title || "Loading..."}</h1>
            <p className="text-gray-500">{quiz?.questions.length ?? 0} questions</p>
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Game options</p>
          <div className="flex flex-col gap-3 mb-6">
            <label className="flex items-start gap-3 p-3 rounded-xl border-2 border-gray-200 cursor-pointer hover:border-kahoot-purple/40 transition-colors">
              <input type="checkbox" checked={teamMode} onChange={(e) => setTeamMode(e.target.checked)} className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <span>
                <span className="font-bold text-gray-800 block">👥 Team mode</span>
                <span className="text-gray-500 text-sm">Players join a team; scores are pooled.</span>
              </span>
            </label>
            <label className={"flex items-start gap-3 p-3 rounded-xl border-2 transition-colors " + (pastGames.length ? "border-gray-200 cursor-pointer hover:border-kahoot-purple/40" : "border-gray-100 opacity-60 cursor-not-allowed")}>
              <input type="checkbox" checked={ghostMode} onChange={(e) => setGhostMode(e.target.checked)} disabled={!pastGames.length} className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <span>
                <span className="font-bold text-gray-800 block">👻 Ghost mode {!pastGames.length && <span className="text-gray-400 text-xs font-normal">(no past games yet)</span>}</span>
                <span className="text-gray-500 text-sm">Race against the top 5 from your last game.</span>
              </span>
            </label>
          </div>
          <Button onClick={startGame} loading={creating} size="lg" className="w-full">
            Create Game Room
          </Button>
        </Card>
      ) : (
        <div className="w-full max-w-2xl flex flex-col gap-6">
          <Card className="text-center">
            <p className="text-gray-500 font-semibold mb-1">Game PIN</p>
            <p className="text-7xl font-black tracking-widest text-kahoot-purple">{pin}</p>
            <p className="text-gray-400 mt-2">Players join at quiz-platform-e46ba.web.app</p>
            <div className="flex justify-center mt-4">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`https://quiz-platform-e46ba.web.app/join?gameId=${gameId}`)}`}
                alt="Scan to join"
                width={180}
                height={180}
                className="rounded-lg border-4 border-kahoot-purple"
              />
            </div>
            <p className="text-gray-400 text-sm mt-2">📱 Scan the QR code to join instantly</p>
          </Card>
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">{players.length} Players{state?.teamMode ? " · 👥 Teams" : ""}</h2>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => lockLobby(gameId)}>Lock</Button>
                <Button size="sm" onClick={handleStart} disabled={players.length === 0}>Start!</Button>
              </div>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {players.map((p) => (
                <div key={p.id} className="flex items-center justify-between bg-gray-100 rounded-lg px-3 py-2">
                  <span className="font-semibold truncate text-sm" dir="auto">{p.nickname}{(p as any).team ? " · " + (p as any).team : ""}</span>
                  <button
                    onClick={() => kickPlayer(gameId, p.id)}
                    className="ml-1 text-red-400 hover:text-red-600 text-xs"
                    title="Kick"
                  >×</button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
