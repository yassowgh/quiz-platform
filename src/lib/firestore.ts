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
import { breadcrumb } from "@/components/ui/ErrorReporter";

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

/**
 * Drop undefined fields before writing, and remember which ones were dropped.
 * Belt and braces alongside ignoreUndefinedProperties - and the breadcrumb
 * means an unset field shows up in the next report instead of as a crash.
 * Only plain objects and arrays are walked, so Firestore sentinels such as
 * serverTimestamp() are passed through untouched.
 */
function stripUndefined(value: any, dropped: string[], path: string): any {
  if (Array.isArray(value)) {
    // An undefined inside an array cannot be skipped the way a field can -
    // that would shift every later index - so it becomes null instead.
    return value.map((v, i) => {
      const here = path + "[" + i + "]";
      if (v === undefined) { dropped.push(here); return null; }
      return stripUndefined(v, dropped, here);
    });
  }
  if (value && typeof value === "object" && (value.constructor === Object || value.constructor === undefined)) {
    const out: any = {};
    for (const key of Object.keys(value)) {
      const child = value[key];
      const here = path ? path + "." + key : key;
      if (child === undefined) { dropped.push(here); continue; }
      out[key] = stripUndefined(child, dropped, here);
    }
    return out;
  }
  return value;
}

export async function updateQuiz(quiz: Quiz) {
  const dropped: string[] = [];
  const payload = stripUndefined({ ...quiz, updatedAt: Date.now() }, dropped, "");
  if (dropped.length) breadcrumb("quiz:dropped-undefined", dropped.slice(0, 12).join(", "));
  await setDoc(doc(db, "quizzes", quiz.id), payload);
}

export async function deleteQuiz(id: string) {
  await deleteDoc(doc(db, "quizzes", id));
}

/* ---------------------------------------------------------------------------
 * Referrals. A host shares a code; someone signing up with it creates a single
 * row keyed by their own uid. It only counts once their email is verified,
 * otherwise five throwaway inboxes would earn the reward.
 * ------------------------------------------------------------------------- */
export const REFERRALS_FOR_REWARD = 5;
export const AI_QUESTIONS_DEFAULT = 10;
export const AI_QUESTIONS_REWARD = 50;

/** The host's own code, created on first use. */
export async function ensureReferralCode(uid: string): Promise<string> {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  const existing = snap.exists() ? (snap.data() as any).referralCode : "";
  if (existing) return existing;
  const code = nanoid(7);
  await setDoc(doc(db, "referralCodes", code), { uid, createdAt: Date.now() });
  await setDoc(userRef, { referralCode: code }, { merge: true });
  return code;
}

export async function resolveReferralCode(code: string): Promise<string> {
  const clean = String(code || "").trim();
  if (!clean) return "";
  try {
    const snap = await getDoc(doc(db, "referralCodes", clean));
    return snap.exists() ? String((snap.data() as any).uid || "") : "";
  } catch {
    return "";
  }
}

/** Called once, just after someone signs up through a referral link. */
export async function recordReferral(refereeUid: string, refereeEmail: string, code: string, verified: boolean) {
  const referrerUid = await resolveReferralCode(code);
  if (!referrerUid || referrerUid === refereeUid) return;
  await setDoc(doc(db, "referrals", refereeUid), {
    refereeUid,
    refereeEmail: String(refereeEmail || "").toLowerCase(),
    referrerUid,
    code: String(code).trim(),
    verified: !!verified,
    createdAt: Date.now(),
    verifiedAt: verified ? Date.now() : null,
  });
}

/** Flip our own row once the address is confirmed. Safe to call on every load. */
export async function markReferralVerified(refereeUid: string) {
  try {
    const ref = doc(db, "referrals", refereeUid);
    const snap = await getDoc(ref);
    if (!snap.exists() || (snap.data() as any).verified) return;
    await updateDoc(ref, { verified: true, verifiedAt: Date.now() });
  } catch { /* nothing to do if there is no referral */ }
}

export async function listMyReferrals(referrerUid: string): Promise<any[]> {
  try {
    const snap = await getDocs(query(collection(db, "referrals"), where("referrerUid", "==", referrerUid)));
    return snap.docs.map((d) => d.data() as any).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } catch {
    return [];
  }
}

/** Admin view: every referral, for the console report. */
export async function listAllReferrals(): Promise<any[]> {
  try {
    const snap = await getDocs(collection(db, "referrals"));
    return snap.docs.map((d) => d.data() as any).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } catch {
    return [];
  }
}

/** How many questions this host may ask for in one AI generation. */
export async function aiQuestionAllowance(uid: string): Promise<number> {
  const rows = await listMyReferrals(uid);
  const verified = rows.filter((r) => r.verified).length;
  return verified >= REFERRALS_FOR_REWARD ? AI_QUESTIONS_REWARD : AI_QUESTIONS_DEFAULT;
}

export async function setQuizCollaborators(
  quizId: string,
  collaborators: { email: string; role: string; invitedAt: number; invitedByName?: string }[],
  collabEditors: string[],
  collabHosts: string[]
) {
  await updateDoc(doc(db, "quizzes", quizId), { collaborators, collabEditors, collabHosts, updatedAt: Date.now() } as any);
}

/** Quizzes someone else has invited this address to. Two single-field queries,
 *  merged, because Firestore cannot OR across two array fields. */
export async function listQuizzesSharedWith(email: string): Promise<Quiz[]> {
  const addr = String(email || "").trim().toLowerCase();
  if (!addr) return [];
  const run = async (field: string) => {
    try {
      const snap = await getDocs(query(collection(db, "quizzes"), where(field, "array-contains", addr)));
      return snap.docs.map((d) => d.data() as Quiz);
    } catch {
      return [] as Quiz[];
    }
  };
  const [editable, hostable] = await Promise.all([run("collabEditors"), run("collabHosts")]);
  const byId: Record<string, Quiz> = {};
  for (const q of editable.concat(hostable)) byId[q.id] = q;
  return Object.values(byId).sort((a, b) => ((b as any).updatedAt ?? 0) - ((a as any).updatedAt ?? 0));
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


export async function listAssignmentResultsByHost(hostId: string): Promise<any[]> {
  const q = query(collection(db, "assignments"), where("hostId", "==", hostId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data()).sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
}
