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
  addDoc,
  orderBy,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Quiz, Question } from "@/types";
import { nanoid } from "./utils";

export async function createUserProfile(uid: string, email: string, displayName: string, consent?: { marketing?: boolean; analytics?: boolean }) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  const data: any = { uid, email, displayName, marketingConsent: consent?.marketing ?? true, analyticsConsent: consent?.analytics ?? true, consentAt: Date.now() };
  if (!snap.exists()) { data.createdAt = Date.now(); data.lifecycle = "nonpaying"; }
  await setDoc(ref, data, { merge: true });
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
    correctAnswers: [0],
    multiSelect: false,
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

export async function listAllUsers() {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map((d) => d.data());
}

export async function listAllQuizzes(): Promise<Quiz[]> {
  const snap = await getDocs(collection(db, "quizzes"));
  return snap.docs.map((d) => d.data() as Quiz);
}


export async function getGameRecord(gameId: string) {
  const snap = await getDoc(doc(db, "games", gameId));
  return snap.exists() ? snap.data() : null;
}

export async function saveAssignmentResult(result: object) {
  const id = nanoid();
  await setDoc(doc(db, "assignments", id), { ...result, id, createdAt: Date.now() });
  return id;
}

export async function listAssignmentResults(quizId: string) {
  const q = query(collection(db, "assignments"), where("quizId", "==", quizId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data()).sort((a: any, b: any) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}


export async function getHomeContent(): Promise<Record<string, string>> {
  const snap = await getDoc(doc(db, "siteContent", "home"));
  return snap.exists() ? (snap.data() as Record<string, string>) : {};
}

export async function saveHomeContent(data: Record<string, string>): Promise<void> {
  await setDoc(doc(db, "siteContent", "home"), data, { merge: true });
}


export async function hasExamAttempt(quizId: string, uid: string): Promise<boolean> {
  const snap = await getDoc(doc(db, "examAttempts", quizId + "_" + uid));
  return snap.exists();
}

export async function recordExamAttempt(quizId: string, uid: string, email: string): Promise<void> {
  await setDoc(doc(db, "examAttempts", quizId + "_" + uid), { quizId, uid, email, at: Date.now() });
}


export async function getExamPublic(quizId: string): Promise<any | null> {
  const snap = await getDoc(doc(db, "examPublic", quizId));
  return snap.exists() ? { id: quizId, ...snap.data() } : null;
}

export async function saveExamPublic(quizId: string, data: any): Promise<void> {
  await setDoc(doc(db, "examPublic", quizId), data, { merge: true });
}

export async function getAdmins(): Promise<string[]> {
  try {
    const snap = await getDoc(doc(db, "config", "admins"));
    const arr = snap.exists() ? (snap.data() as any).emails : [];
    return Array.isArray(arr) ? arr : [];
  } catch (e) { return []; }
}
export async function saveAdmins(emails: string[]): Promise<void> {
  await setDoc(doc(db, "config", "admins"), { emails }, { merge: true });
}
export async function getUserProfile(uid: string): Promise<any | null> {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}
export async function setUserDisabled(uid: string, disabled: boolean): Promise<void> {
  await updateDoc(doc(db, "users", uid), { disabled });
}
export async function deleteUserDoc(uid: string): Promise<void> {
  await deleteDoc(doc(db, "users", uid));
}


export async function updateUserCrm(uid: string, data: Record<string, any>): Promise<void> {
  await updateDoc(doc(db, "users", uid), data);
}
export async function submitFeedback(data: { ftype: string; message: string; email?: string; screenshotUrl?: string }): Promise<void> {
  await addDoc(collection(db, "feedback"), { ...data, createdAt: Date.now(), status: "new" });
}
export async function listFeedback(): Promise<any[]> {
  const snap = await getDocs(query(collection(db, "feedback"), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}
export async function updateFeedback(id: string, data: Record<string, any>): Promise<void> {
  await updateDoc(doc(db, "feedback", id), data);
}
export async function listCampaigns(): Promise<any[]> {
  const snap = await getDocs(collection(db, "campaigns"));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}
export async function saveCampaign(id: string | null, data: Record<string, any>): Promise<string> {
  if (id) { await setDoc(doc(db, "campaigns", id), { ...data, updatedAt: Date.now() }, { merge: true }); return id; }
  const ref = await addDoc(collection(db, "campaigns"), { ...data, createdAt: Date.now(), updatedAt: Date.now() });
  return ref.id;
}
export async function deleteCampaign(id: string): Promise<void> {
  await deleteDoc(doc(db, "campaigns", id));
}
export async function getFeatures(): Promise<Record<string, any>> {
  const snap = await getDoc(doc(db, "config", "features"));
  return snap.exists() ? (snap.data() as Record<string, any>) : {};
}
export async function saveFeatures(data: Record<string, any>): Promise<void> {
  await setDoc(doc(db, "config", "features"), data, { merge: true });
}
