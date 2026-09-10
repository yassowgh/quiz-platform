"use client";
import { nanoid } from "@/lib/utils";
import type { Question } from "@/types";

export const AI_WORKER_URL = "https://polished-shadow-f08c.yassow.workers.dev/";
// Legacy EmailJS identifiers. No longer used to send anything - all mail now
// goes through the Worker (Resend). Kept only so nothing importing them breaks.
export const EMAILJS_SERVICE_ID = "service_pu433a4";
export const EMAILJS_TEMPLATE_ID = "template_l62666k";
export const EMAILJS_PUBLIC_KEY = "tSIOLMDkcK9CCwiiJ";

export const AI_ENABLED = AI_WORKER_URL.length > 0;
export const EMAIL_ENABLED = AI_WORKER_URL.length > 0;

export async function generateQuestions(
  topic: string,
  count: number,
  language: "en" | "ar",
  avoid: string[] = [],
  source: string = ""
): Promise<Question[]> {
  const r = await fetch(AI_WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic, count, language, avoid, source }),
  });
  let data: any = {};
  try { data = await r.json(); } catch { /* ignore */ }
  if (!r.ok || data.error) {
    throw new Error(String(data.detail || data.error || ("AI request failed (" + r.status + ")")));
  }
  const arr = Array.isArray(data.questions) ? data.questions : [];
  const norm = (t: string) =>
    String(t || "").toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g, " ").trim();
  const seen = new Set((avoid || []).map(norm).filter(Boolean));
  const out: Question[] = [];
  for (const q of arr) {
    const text = String(q.text || "").slice(0, 150);
    const key = norm(text);
    if (!key || seen.has(key)) continue; // skip blanks and duplicates
    seen.add(key);
    const options = Array.isArray(q.options)
      ? q.options.slice(0, 6).map((o: any) => String(o).slice(0, 75))
      : ["", "", "", ""];
    while (options.length < 2) options.push("");
    const ci = Number.isInteger(q.correctIndex)
      ? Math.max(0, Math.min(q.correctIndex, options.length - 1))
      : 0;
    out.push({
      id: nanoid(),
      text,
      options,
      correctAnswer: ci,
      correctAnswers: [ci],
      multiSelect: false,
      type: "multiple",
      timeLimit: 20,
      points: 1000,
    });
  }
  return out;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Basic shape check for an address a player typed in. */
export function isValidEmail(v: string | null | undefined): boolean {
  const s = String(v || "").trim();
  return s.length > 0 && s.length <= 254 && EMAIL_RE.test(s);
}

// All outbound mail goes through the Worker (Resend), so it is sent from our
// own domain, is not capped by a third-party free tier, and - unlike the old
// browser-side EmailJS path - cannot be blocked by the visitor's ad blocker.
async function workerSend(to: string, subject: string, html: string): Promise<void> {
  const r = await fetch(AI_WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "email", to: to, subject: subject, html: html, email: to }),
  });
  if (!r.ok) {
    let detail = "";
    try { detail = (await r.text()).slice(0, 300); } catch { /* ignore */ }
    throw new Error("email send failed (HTTP " + r.status + ") " + detail);
  }
}

export async function sendAssignmentEmail(params: {
  toEmail: string;
  ccEmail?: string;
  quizTitle: string;
  playerName: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
}): Promise<void> {
  if (!params.toEmail) return;
  if (!isValidEmail(params.toEmail)) throw new Error("invalid recipient address");
  const completed = new Date().toLocaleString();
  const subject = "QuizUps results: " + params.quizTitle;
  const message =
    params.playerName + ' completed your quiz "' + params.quizTitle + '".<br><br>' +
    "Score: " + params.score.toLocaleString() + " points<br>" +
    "Correct answers: " + params.correctCount + " / " + params.totalQuestions + "<br>" +
    "Completed: " + completed + "<br><br>- Sent by QuizUps";
  await workerSend(params.toEmail.trim(), subject, message);
  const cc = String(params.ccEmail || "").trim();
  if (cc && cc !== params.toEmail.trim() && isValidEmail(cc)) {
    await workerSend(cc, subject, message);
  }
}

export async function sendAssignmentInvite(params: {
  toEmails: string[];
  quizTitle: string;
  link: string;
}): Promise<number> {
  const subject = "You're invited: " + params.quizTitle + " (QuizUps quiz)";
  const message =
    'You have been invited to take the quiz "' + params.quizTitle + '" on QuizUps.<br><br>' +
    '👉 Start here: <a href="' + params.link + '">' + params.link + "</a><br><br>" +
    "You can complete it any time, at your own pace.";
  const base: Record<string, string> = {
    subject,
    message,
    quiz_title: params.quizTitle,
    player_name: "A quiz host",
    score: "",
    correct_count: "",
    total_questions: "",
    completed_at: "",
  };
  let sent = 0;
  for (const to of params.toEmails) {
    const t = to.trim();
    if (!t) continue;
    try {
      const r = await fetch(AI_WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "email", to: t, subject: subject, html: message }),
      });
      if (r.ok) sent++;
    } catch (e) {}
  }
  return sent;
}


export async function sealExam(items: any[]): Promise<string | null> {
  try {
    const r = await fetch(AI_WORKER_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "seal", items }) });
    if (!r.ok) return null;
    const j = await r.json();
    return j.sealed || null;
  } catch { return null; }
}

export async function gradeExam(sealed: string, answers: any[]): Promise<{ correctCount: number; total: number; score: number }> {
  const r = await fetch(AI_WORKER_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "grade", sealed, answers }) });
  if (!r.ok) throw new Error("grade failed");
  return await r.json();
}


export async function generateVideoQuestions(
  url: string,
  from: number,
  to: number,
  count: number,
  language: "en" | "ar" = "en"
): Promise<Question[]> {
  const r = await fetch(AI_WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "videoq", url, from, to, count, language }),
  });
  let data: any = {};
  try { data = await r.json(); } catch {}
  if (!r.ok || data.error) throw new Error(String(data.detail || data.error || "Video analysis failed"));
  const arr = Array.isArray(data.questions) ? data.questions : [];
  const out: Question[] = [];
  for (const q of arr) {
    const text = String(q.text || "").slice(0, 150);
    if (!text) continue;
    const options = Array.isArray(q.options) ? q.options.slice(0, 6).map((o: any) => String(o).slice(0, 75)) : ["", "", "", ""];
    while (options.length < 2) options.push("");
    const ci = Number.isInteger(q.correctIndex) ? Math.max(0, Math.min(q.correctIndex, options.length - 1)) : 0;
    out.push({ id: nanoid(), text, options, correctAnswer: ci, correctAnswers: [ci], multiSelect: false, type: "multiple", timeLimit: 20, points: 1000 });
  }
  return out;
}


export async function generateFromUrl(
  url: string,
  count: number,
  language: "en" | "ar",
  avoid: string[] = []
): Promise<Question[]> {
  const r = await fetch(AI_WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "urlq", url, count, language, avoid }),
  });
  let data: any = {};
  try { data = await r.json(); } catch {}
  if (!r.ok || data.error) throw new Error(String(data.detail || data.error || "URL analysis failed"));
  const arr = Array.isArray(data.questions) ? data.questions : [];
  const out: Question[] = [];
  for (const q of arr) {
    const text = String(q.text || "").slice(0, 150);
    if (!text) continue;
    const options = Array.isArray(q.options) ? q.options.slice(0, 6).map((o: any) => String(o).slice(0, 75)) : ["", "", "", ""];
    while (options.length < 2) options.push("");
    const ci = Number.isInteger(q.correctIndex) ? Math.max(0, Math.min(q.correctIndex, options.length - 1)) : 0;
    out.push({ id: nanoid(), text, options, correctAnswer: ci, correctAnswers: [ci], multiSelect: false, type: "multiple", timeLimit: 20, points: 1000 });
  }
  return out;
}


export async function uploadImage(blob: Blob): Promise<string> {
  const r = await fetch(AI_WORKER_URL.replace(/\/$/, "") + "/upload", {
    method: "POST",
    headers: { "Content-Type": blob.type || "image/jpeg" },
    body: blob,
  });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok || !j.url) throw new Error(j.error || "upload failed");
  return j.url as string;
}
