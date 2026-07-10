export function calculatePoints(
  isCorrect: boolean,
  timeTakenMs: number,
  timeLimitSeconds: number,
  maxPoints = 1000
): number {
  if (!isCorrect) return 0;
  const fraction = Math.max(0, 1 - timeTakenMs / (timeLimitSeconds * 1000));
  return Math.round(maxPoints * (0.5 + 0.5 * fraction));
}

export function rankPlayers<T extends { score: number; streak: number; joinedAt: number }>(
  players: T[]
): T[] {
  return [...players].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.streak !== a.streak) return b.streak - a.streak;
    return a.joinedAt - b.joinedAt;
  });
}