"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getQuiz } from "@/lib/firestore";
import { createLiveGame, kickPlayer, lockLobby } from "@/lib/realtimeDb";
import { useGame } from "@/hooks/useGame";
import type { Quiz } from "@/types";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

export function generateStaticParams() { return []; }


export default function LobbyPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [pin, setPin] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const { state } = useGame(gameId);

  useEffect(() => {
    if (!params.gameId) return;
    getQuiz(params.gameId as string).then(setQuiz);
  }, [params.gameId]);

  const startGame = async () => {
    if (!quiz || !user) return;
    setCreating(true);
    const { gameId: gid, pin: p } = await createLiveGame(quiz.id, user.uid);
    setGameId(gid);
    setPin(p);
    setCreating(false);
  };

  const handleStart = () => {
    if (!gameId) return;
    router.push(`/host/${gameId}/play?quizId=${quiz?.id}`);
  };

  const players = state ? Object.values(state.players) : [];

  return (
    <div className="min-h-[calc(100vh-64px)] bg-kahoot-dark bg-grid-pattern flex flex-col items-center justify-center p-6">
      {!gameId ? (
        <Card className="w-full max-w-md text-center">
          <h1 className="text-3xl font-black mb-2">{quiz?.title || "Loading..."}</h1>
          <p className="text-gray-500 mb-6">{quiz?.questions.length} questions</p>
          <Button onClick={startGame} loading={creating} size="lg" className="w-full">
            Create Game Room
          </Button>
        </Card>
      ) : (
        <div className="w-full max-w-2xl flex flex-col gap-6">
          <Card className="text-center">
            <p className="text-gray-500 font-semibold mb-1">Game PIN</p>
            <p className="text-7xl font-black tracking-widest text-kahoot-purple">{pin}</p>
            <p className="text-gray-400 mt-2">Players join at QuizLive.app</p>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">{players.length} Players</h2>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => lockLobby(gameId)}>Lock</Button>
                <Button size="sm" onClick={handleStart} disabled={players.length === 0}>Start!</Button>
              </div>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {players.map((p) => (
                <div key={p.id} className="flex items-center justify-between bg-gray-100 rounded-lg px-3 py-2">
                  <span className="font-semibold truncate text-sm">{p.nickname}</span>
                  <button
                    onClick={() => kickPlayer(gameId, p.id)}
                    className="ml-1 text-red-400 hover:text-red-600 text-xs"
                    title="Kick"
                  >â</button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}