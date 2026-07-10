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
  hostId: string
): Promise<{ gameId: string; pin: string }> {
  const gameId = nanoid();
  const pin = generatePin();

  const initialState: LiveGameState = {
    gameId,
    pin,
    quizId,
    hostId,
    status: "lobby",
    currentQuestionIndex: -1,
    questionStartTime: 0,
    players: {},
    answers: {},
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
  uid?: string
) {
  await set(ref(rtdb, `games/${gameId}/players/${playerId}`), {
    id: playerId,
    nickname,
    score: 0,
    correctCount: 0,
    streak: 0,
    hasAnswered: false,
    joinedAt: Date.now(),
    ...(uid ? { uid } : {}),
  });
}

export async function submitAnswer(
  gameId: string,
  questionIndex: number,
  playerId: string,
  answerIndex: number,
  timeTakenMs: number,
  timeLimitSeconds: number,
  isCorrect: boolean
) {
  const points = calculatePoints(isCorrect, timeTakenMs, timeLimitSeconds);
  const answer: PlayerAnswer = { answerIndex, timeTakenMs, pointsEarned: points, isCorrect };
  await set(ref(rtdb, `games/${gameId}/answers/${questionIndex}/${playerId}`), answer);

  const playerRef = ref(rtdb, `games/${gameId}/players/${playerId}`);
  const snap = await get(playerRef);
  if (snap.exists()) {
    const player = snap.val();
    const newStreak = isCorrect ? (player.streak || 0) + 1 : 0;
    await update(playerRef, {
      score: (player.score || 0) + points,
      correctCount: (player.correctCount || 0) + (isCorrect ? 1 : 0),
      streak: newStreak,
      hasAnswered: true,
    });
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