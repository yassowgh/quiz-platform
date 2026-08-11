import {
  ref,
  set,
  get,
  update,
  remove,
  onValue,
  off,
  serverTimestamp,
} from "firebase/database";
import { rtdb } from "./firebase";
import type { LiveGameState, GameStatus, PlayerAnswer } from "@/types";
import { generatePin, nanoid } from "./utils";
import { registerPin, releasePin } from "./firestore";
import { calculatePoints } from "./scoring";

export async function createLiveGame(
  quizId: string,
  hostId: string,
  quiz?: unknown,
  opts?: { teamMode?: boolean; ghosts?: Record<string, unknown>; mode?: "classic" | "goldquest" }
): Promise<{ gameId: string; pin: string }> {
  const gameId = nanoid();
  const pin = generatePin();

  const initialState: any = {
    gameId,
    pin,
    quizId,
    hostId,
    status: "lobby",
    currentQuestionIndex: -1,
    questionStartTime: 0,
    players: {},
    answers: {},
    ...(quiz ? { _quiz: JSON.parse(JSON.stringify(quiz)) } : {}),
    ...(opts?.teamMode ? { teamMode: true } : {}),
    ...(opts?.mode && opts.mode !== "classic" ? { mode: opts.mode } : {}),
    ...(opts?.ghosts && Object.keys(opts.ghosts).length ? { players: opts.ghosts } : {}),
  };

  await set(ref(rtdb, `games/${gameId}`), initialState);
  await registerPin(pin, gameId);
  return { gameId, pin };
}

export async function startQuestion(gameId: string, index: number) {
  await update(ref(rtdb, `games/${gameId}`), {
    status: "question" as GameStatus,
    currentQuestionIndex: index,
    questionStartTime: Date.now(),
  });
}

export async function revealAnswer(gameId: string) {
  await update(ref(rtdb, `games/${gameId}`), { status: "answer_reveal" as GameStatus });
}

export async function showLeaderboard(gameId: string) {
  await update(ref(rtdb, `games/${gameId}`), { status: "leaderboard" as GameStatus });
}

export async function showPodium(gameId: string) {
  await update(ref(rtdb, `games/${gameId}`), { status: "podium" as GameStatus });
}

export async function endGame(gameId: string, pin: string) {
  await update(ref(rtdb, `games/${gameId}`), { status: "ended" as GameStatus });
  await releasePin(pin);
}

export async function kickPlayer(gameId: string, playerId: string) {
  await remove(ref(rtdb, `games/${gameId}/players/${playerId}`));
}

export async function lockLobby(gameId: string) {
  await update(ref(rtdb, `games/${gameId}`), { locked: true });
}

export async function joinGame(
  gameId: string,
  playerId: string,
  nickname: string,
  team?: string
) {
  const player = {
    id: playerId,
    nickname,
    score: 0,
    correctCount: 0,
    streak: 0,
    hasAnswered: false,
    joinedAt: Date.now(),
    ...(team ? { team } : {}),
  };
  await set(ref(rtdb, `games/${gameId}/players/${playerId}`), player);
}
export async function submitAnswer(
  gameId: string,
  questionIndex: number,
  playerId: string,
  answerIndex: number,
  timeTakenMs: number,
  timeLimitSeconds: number,
  isCorrect: boolean,
  creditRatio?: number,
  mode: "score" | "poll" = "score"
) {
  const ratio = creditRatio ?? (isCorrect ? 1 : 0);
  const playerRef = ref(rtdb, `games/${gameId}/players/${playerId}`);
  const snap = await get(playerRef);
  const player = snap.exists() ? snap.val() : null;

  const basePoints = mode === "poll" ? 0 : Math.round(calculatePoints(ratio > 0, timeTakenMs, timeLimitSeconds) * ratio);
  // Kahoot-style streak bonus: +50 per consecutive correct answer (max +500)
  const streakBonus = mode === "score" && isCorrect && player ? Math.min(player.streak || 0, 10) * 50 : 0;
  const points = basePoints + streakBonus;

  const answer: PlayerAnswer = { answerIndex, timeTakenMs, pointsEarned: points, isCorrect };
  await set(ref(rtdb, `games/${gameId}/answers/${questionIndex}/${playerId}`), answer);

  if (player) {
    if (mode === "poll") {
      await update(playerRef, { hasAnswered: true });
    } else {
      const newStreak = isCorrect ? (player.streak || 0) + 1 : 0;
      await update(playerRef, {
        score: (player.score || 0) + points,
        correctCount: (player.correctCount || 0) + (isCorrect ? 1 : 0),
        streak: newStreak,
        hasAnswered: true,
      });
    }
  }
}
export function subscribeToGame(
  gameId: string,
  callback: (state: LiveGameState | null) => void
) {
  const gameRef = ref(rtdb, `games/${gameId}`);
  onValue(gameRef, (snap) => {
    callback(snap.exists() ? (snap.val() as LiveGameState) : null);
  });
  return () => off(gameRef);
}

export async function getGameState(gameId: string): Promise<LiveGameState | null> {
  const snap = await get(ref(rtdb, `games/${gameId}`));
  return snap.exists() ? (snap.val() as LiveGameState) : null;
}

export async function getGameByPin(pin: string): Promise<string | null> {
  const { resolvePin } = await import("./firestore");
  return resolvePin(pin);
}

export async function resetPlayerAnswered(gameId: string, players: Record<string, unknown>) {
  const updates: Record<string, boolean> = {};
  Object.keys(players).forEach((id) => {
    updates[`games/${gameId}/players/${id}/hasAnswered`] = false;
  });
  await update(ref(rtdb), updates);
}
export async function applyChest(
  gameId: string,
  playerId: string,
  outcome: { type: "gain" | "lose" | "steal"; amount: number; targetId?: string }
) {
  const meRef = ref(rtdb, "games/" + gameId + "/players/" + playerId);
  const meSnap = await get(meRef);
  if (!meSnap.exists()) return;
  const meGold = meSnap.val().gold || 0;
  if (outcome.type === "gain") {
    await update(meRef, { gold: meGold + outcome.amount });
  } else if (outcome.type === "lose") {
    await update(meRef, { gold: Math.max(0, meGold - outcome.amount) });
  } else if (outcome.type === "steal" && outcome.targetId) {
    const tRef = ref(rtdb, "games/" + gameId + "/players/" + outcome.targetId);
    const tSnap = await get(tRef);
    const tGold = tSnap.exists() ? (tSnap.val().gold || 0) : 0;
    const stolen = Math.min(tGold, outcome.amount);
    await update(meRef, { gold: meGold + stolen });
    if (tSnap.exists()) await update(tRef, { gold: Math.max(0, tGold - stolen) });
  }
}
