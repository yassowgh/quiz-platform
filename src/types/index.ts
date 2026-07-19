export type GameStatus =
  | "lobby"
  | "question"
  | "answer_reveal"
  | "leaderboard"
  | "podium"
  | "ended";

export interface Question {
  id: string;
  text: string;
  imageUrl?: string;
  options: string[];
  correctAnswer: number;
  correctText?: string;
  type?: "multiple" | "truefalse" | "typeanswer";
  timeLimit: number; // seconds
  points: number;
}

export interface Quiz {
  id: string;
  hostId: string;
  title: string;
  description: string;
  coverImage?: string;
  questions: Question[];
  isPublished: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface GamePlayer {
  id: string;
  nickname: string;
  score: number;
  correctCount: number;
  streak: number;
  hasAnswered: boolean;
  uid?: string;
  joinedAt: number;
}

export interface PlayerAnswer {
  answerIndex: number;
  timeTakenMs: number;
  pointsEarned: number;
  isCorrect: boolean;
}

export interface LiveGameState {
  gameId: string;
  pin: string;
  quizId: string;
  hostId: string;
  status: GameStatus;
  currentQuestionIndex: number;
  questionStartTime: number;
  players: Record<string, GamePlayer>;
  answers: Record<string, Record<string, PlayerAnswer>>;
}

export const ANSWER_COLORS = [
  { bg: "bg-kahoot-red", text: "text-white", shape: "▲", hex: "#e21b3c" },
  { bg: "bg-kahoot-blue", text: "text-white", shape: "◆", hex: "#1368ce" },
  { bg: "bg-kahoot-yellow", text: "text-black", shape: "●", hex: "#d89e00" },
  { bg: "bg-kahoot-green", text: "text-white", shape: "■", hex: "#26890c" },
];