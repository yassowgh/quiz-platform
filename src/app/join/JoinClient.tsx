"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { joinGame } from "@/lib/realtimeDb";
import { useGame } from "@/hooks/useGame";
import { randomNickname, nanoid } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { useLang } from "@/contexts/LanguageContext";

export default function JoinClient() {
  const router = useRouter();
  const { t } = useLang();
  const searchParams = useSearchParams();
  const gameId = searchParams.get("gameId") || "";
  const [nickname, setNickname] = useState("");
  const [team, setTeam] = useState("");
  const { state } = useGame(gameId);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { setNickname(randomNickname()); }, []);

  const autoJoinedRef = useRef(false);
  useEffect(() => {
    const q = (state as any)?._quiz;
    if (autoJoinedRef.current || !q || q.kind !== "poll" || q.requireName || !nickname.trim() || !gameId) return;
    autoJoinedRef.current = true;
    (async () => {
      try {
        const playerId = sessionStorage.getItem("playerId") || nanoid();
        sessionStorage.setItem("playerId", playerId);
        sessionStorage.setItem("nickname", nickname.trim());
        await joinGame(gameId, playerId, nickname.trim(), state?.teamMode ? (team.trim() || "Team " + nickname.trim()) : undefined);
        router.push("/play?gameId=" + gameId);
      } catch (e) { setError(t("Failed to join. Try again.")); }
    })();
  }, [state, nickname, gameId]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) { setError(t("Enter a nickname")); return; }
    if (!gameId) { setError(t("Invalid game")); return; }
    setJoining(true);
    try {
      const playerId = sessionStorage.getItem("playerId") || nanoid();
      sessionStorage.setItem("playerId", playerId);
      sessionStorage.setItem("nickname", nickname.trim());
      await joinGame(gameId, playerId, nickname.trim(), state?.teamMode ? (team.trim() || "Team " + nickname.trim()) : undefined);
      router.push(`/play?gameId=${gameId}`);
    } catch {
      setError(t("Failed to join. Try again."));
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-kahoot-dark bg-grid-pattern flex items-center justify-center p-6">
      <Card className="w-full max-w-sm text-center">
        <h1 className="text-3xl font-black mb-2">{t("You're in!")}</h1>
        <p className="text-gray-500 mb-6">{t("Choose your nickname")}</p>
        <form onSubmit={handleJoin} className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={20}
              className="text-center text-2xl font-bold border-b-4 border-kahoot-purple py-3 focus:outline-none w-full"
            />
            <button
              type="button"
              onClick={() => setNickname(randomNickname())}
              className="text-3xl hover:rotate-12 transition-transform"
              title={t("Random nickname")}
            >🎲</button>
          </div>
          {state?.teamMode && (
            <div className="flex flex-col gap-1 text-left">
              <label className="text-sm font-semibold text-gray-700">{t("👥 Team name (players with the same name share a score)")}</label>
              <input
                type="text"
                dir="auto"
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                maxLength={20}
                placeholder={t("e.g. Red Dragons")}
                className="text-center text-lg font-bold border-b-4 border-kahoot-purple py-2 focus:outline-none w-full"
              />
            </div>
          )}
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" loading={joining} size="lg" className="w-full">{t("Join Game!")}</Button>
        </form>
      </Card>
    </div>
  );
}
