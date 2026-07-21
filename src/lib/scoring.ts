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
export function aggregateTeams<T extends { score: number; streak: number; joinedAt: number; team?: string; nickname: string }>(
  players: T[]
): { id: string; nickname: string; score: number; streak: number; joinedAt: number; members: number }[] {
  const map: Record<string, { id: string; nickname: string; score: number; streak: number; joinedAt: number; members: number }> = {};
  players.forEach((p) => {
    const key = p.team || "No team";
    if (!map[key]) map[key] = { id: key, nickname: key, score: 0, streak: 0, joinedAt: p.joinedAt, members: 0 };
    map[key].score += p.score;
    map[key].streak = Math.max(map[key].streak, p.streak);
    map[key].joinedAt = Math.min(map[key].joinedAt, p.joinedAt);
    map[key].members++;
  });
  return Object.values(map).sort((a, b) => b.score - a.score);
}
