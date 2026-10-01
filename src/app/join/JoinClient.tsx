"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { joinGame } from "@/lib/realtimeDb";
import { useGame } from "@/hooks/useGame";
import { randomNickname, nanoid, cleanGameId } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { useLang } from "@/contexts/LanguageContext";

export default function JoinClient() {
  const router = useRouter();
  const { t } = useLang();
  const searchParams = useSearchParams();
  const gameId = cleanGameId(searchParams.get("gameId"));
  const [nickname, setNickname] = useState("");
  const [team, setTeam] = useState("");
  const { state } = useGame(gameId);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => { setNickname(randomNickname()); }, []);
  useEffect(() => { const id = setTimeout(() => setReady(true), 2500); return () => clearTimeout(id); }, []);

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

  const _q = (state as any)?._quiz;
  const pollNoName = !!(_q && _q.kind === "poll" && !_q.requireName);
  const waiting = !!gameId && !state && !ready;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-kahoot-dark bg-grid-pattern flex items-center justify-center p-6">
      <Card className="w-full max-w-sm text-center">
        {waiting ? (
        <div>
          <div className="text-4xl mb-3">⏳</div>
          <h1 className="text-2xl font-black mb-2">{t("Joining…")}</h1>
          <p className="text-gray-500">{t("One moment…")}</p>
        </div>
        ) : pollNoName ? (
        <div>
          <div className="text-5xl mb-3">📊</div>
          <h1 className="text-2xl font-black mb-2">{t("Joining…")}</h1>
          <p className="text-gray-500">{t("Taking you to the poll.")}</p>
          {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
        </div>
        ) : (
        <>
        <h1 className="text-3xl font-black mb-2">{t("You're in!")}</h1>
        <p className="text-gray-500 mb-5">{t("Pick a name others will see — tap the box to type your own.")}</p>
        <form onSubmit={handleJoin} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1 text-left">
            <label htmlFor="nickname" className="text-sm font-bold text-kahoot-purple flex items-center gap-1">✏️ {t("Your name")}</label>
            <div className="flex items-center gap-2 rounded-2xl border-2 border-kahoot-purple bg-purple-50 ps-3 pe-2 focus-within:ring-4 focus-within:ring-purple-200 transition-shadow">
              <input
                id="nickname"
                type="text"
                value={nickname}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={20}
                aria-label={t("Your name")}
                placeholder={t("Type your name")}
                className="text-center text-2xl font-bold bg-transparent py-3 focus:outline-none w-full"
              />
              <button
                type="button"
                onClick={() => setNickname(randomNickname())}
                className="shrink-0 flex items-center gap-1 text-sm font-bold text-kahoot-purple whitespace-nowrap rounded-lg px-2 py-1 hover:bg-purple-100 transition-colors"
                title={t("Random nickname")}
              >🎲 {t("Shuffle")}</button>
            </div>
            <p className="text-xs text-gray-400">{t("We picked one for you — change it to whatever you like.")}</p>
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
        </>
        )}
      </Card>
    </div>
  );
}
