import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Quiz, Question } from "@/types";
import { nanoid } from "./utils";

export async function createUserProfile(uid: string, email: string, displayName: string) {
  await setDoc(doc(db, "users", uid), { uid, email, displayName, createdAt: Date.now() }, { merge: true });
}

export async function getQuiz(id: string): Promise<Quiz | null> {
  const snap = await getDoc(doc(db, "quizzes", id));
  return snap.exists() ? (snap.data() as Quiz) : null;
}

export async function updateQuiz(quiz: Quiz) {
  await setDoc(doc(db, "quizzes", quiz.id), { ...quiz, updatedAt: Date.now() });
}

export async function deleteQuiz(id: string) {
  await deleteDoc(doc(db, "quizzes", id));
}

export async function listQuizzesByHost(hostId: string): Promise<Quiz[]> {
  const q = query(collection(db, "quizzes"), where("hostId", "==", hostId));
  const snap = await getDocs(q);
  const quizzes = snap.docs.map((d) => d.data() as Quiz);
  return quizzes.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
}

export function makeBlankQuestion(): Question {
  return {
    id: nanoid(),
    text: "",
    options: ["", "", "", ""],
    correctAnswer: 0,
    timeLimit: 20,
    points: 1000,
  };
}

export async function registerPin(pin: string, gameId: string) {
  await setDoc(doc(db, "pins", pin), { gameId, createdAt: Date.now() });
}

export async function resolvePin(pin: string): Promise<string | null> {
  const snap = await getDoc(doc(db, "pins", pin));
  return snap.exists() ? (snap.data().gameId as string) : null;
}

export async function releasePin(pin: string) {
  await deleteDoc(doc(db, "pins", pin));
}

export async function saveGameRecord(record: object) {
  const id = nanoid();
  await setDoc(doc(db, "games", id), { ...record, id, createdAt: Date.now() });
}

export async function listGamesByHost(hostId: string) {
  const q = query(collection(db, "games"), where("hostId", "==", hostId));
  const snap = await getDocs(q);
  const games = snap.docs.map((d) => d.data());
  return games.sort((a: any, b: any) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}