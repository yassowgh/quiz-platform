/**
 * Just for Fun: a trivia round with friends in one screen.
 *
 * The host picks a topic, a length and a language, gets a PIN and a link, and
 * plays. Nothing is saved to Firestore - the questions ride on the game node
 * itself as `_quiz`, which the player and host screens already read - so there
 * is no quiz document, no dashboard entry and no account needed.
 *
 * Two things still require an identity: Firestore's `pins` collection and the
 * end-of-game record both demand `request.auth != null`. Rather than opening
 * those rules to the public internet (a world-writable PIN table would let
 * anyone hijack a join code), a fun host is signed in anonymously.
 *
 * REQUIRES: Anonymous sign-in enabled in Firebase Console → Authentication →
 * Sign-in method. Without it `ensureHost()` throws auth/operation-not-allowed
 * and the UI says so rather than failing silently.
 */
import { signInAnonymously } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { nanoid } from "@/lib/utils";
import type { Question, Quiz } from "@/types";

export const FUN_MIN_QUESTIONS = 5;
export const FUN_MAX_QUESTIONS = 10;

/** Languages the Worker's generator understands. */
export type FunLang = "en" | "ar" | "uk";
export const FUN_LANGS: FunLang[] = ["en", "ar", "uk"];

/* ---------------------------------------------------------------------------
 * Throttle. The generator costs money per call and this page is public and
 * unauthenticated, so cap how often one browser can start a round. This is a
 * speed bump, not a security control - it only stops casual over-use.
 * ------------------------------------------------------------------------- */
const RATE_KEY = "quizups:funStarts";
export const FUN_MAX_PER_WINDOW = 3;
export const FUN_WINDOW_MS = 60 * 60 * 1000; // one hour

function readStarts(): number[] {
  try {
    const raw = window.localStorage.getItem(RATE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return [];
    const cutoff = Date.now() - FUN_WINDOW_MS;
    return arr.filter((n: any) => typeof n === "number" && n > cutoff);
  } catch (e) {
    return [];
  }
}

export function funStartsLeft(): number {
  return Math.max(0, FUN_MAX_PER_WINDOW - readStarts().length);
}

/** Minutes until the next slot frees up. 0 when one is available now. */
export function funCooldownMinutes(): number {
  const starts = readStarts();
  if (starts.length < FUN_MAX_PER_WINDOW) return 0;
  const oldest = Math.min.apply(null, starts);
  return Math.max(1, Math.ceil((oldest + FUN_WINDOW_MS - Date.now()) / 60000));
}

export function recordFunStart() {
  try {
    const starts = readStarts();
    starts.push(Date.now());
    window.localStorage.setItem(RATE_KEY, JSON.stringify(starts));
  } catch (e) {}
}

/* ------------------------------------------------------------------------- */

/**
 * The signed-in user if there is one, otherwise an anonymous identity.
 * Anonymous accounts are cheap, disposable and satisfy the security rules
 * without loosening them.
 */
export async function ensureHost(): Promise<string> {
  if (auth.currentUser) return auth.currentUser.uid;
  const cred = await signInAnonymously(auth);
  return cred.user.uid;
}

/** True when the failure is Firebase telling us anonymous sign-in is switched off. */
export function isAnonDisabled(err: any): boolean {
  const s = String((err && (err.code || err.message)) || "");
  return s.indexOf("operation-not-allowed") >= 0 || s.indexOf("admin-restricted") >= 0;
}

/** Wrap generated questions in a quiz shaped like any other, but never stored. */
export function buildFunQuiz(topic: string, questions: Question[], language: FunLang, hostId: string): Quiz {
  return {
    id: "fun-" + nanoid(),
    hostId: hostId,
    creatorEmail: "",
    title: topic,
    description: "",
    questions: questions,
    isPublished: true,
    language: language,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  } as Quiz;
}

/**
 * Park the quiz where the dashboard's existing claim-on-signup logic will find
 * it, so "save this round" after the game costs the host nothing but a signup.
 * Same key /try uses - the claiming code is already written and tested.
 */
export const FUN_DRAFT_KEY = "quizups:tryDraft";

export function keepFunQuiz(quiz: Quiz) {
  try {
    window.localStorage.setItem(
      FUN_DRAFT_KEY,
      JSON.stringify({ title: quiz.title, questions: quiz.questions, createdAt: Date.now() })
    );
  } catch (e) {}
}
