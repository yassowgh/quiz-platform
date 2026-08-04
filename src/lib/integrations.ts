"use client";
import { nanoid } from "@/lib/utils";
import type { Question } from "@/types";

export const AI_WORKER_URL = "https://polished-shadow-f08c.yassow.workers.dev/";
export const EMAILJS_SERVICE_ID = "service_pu433a4";
export const EMAILJS_TEMPLATE_ID = "template_l62666k";
export const EMAILJS_PUBLIC_KEY = "tSIOLMDkcK9CCwiiJ";

export const AI_ENABLED = AI_WORKER_URL.length > 0;
export const EMAIL_ENABLED = EMAILJS_PUBLIC_KEY.length > 0;

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

let emailjsPromise: Promise<any> | null = null;
function loadEmailJs(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if ((window as any).emailjs) return Promise.resolve((window as any).emailjs);
  if (!emailjsPromise) {
    emailjsPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js";
      s.onload = () => {
        const ejs = (window as any).emailjs;
        try { ejs.init({ publicKey: EMAILJS_PUBLIC_KEY }); } catch { /* ignore */ }
        resolve(ejs);
      };
      s.onerror = () => reject(new Error("Failed to load EmailJS"));
      document.head.appendChild(s);
    });
  }
  return emailjsPromise;
}

// Generic send. We include both the new {subject, message} fields AND the older
// named fields, so it works whether the EmailJS template is the new generic one
// or the original results template.
async function rawSend(fields: Record<string, string>): Promise<void> {
  if (!EMAIL_ENABLED || !fields.to_email) return;
  const ejs = await loadEmailJs();
  await ejs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, fields);
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
  const completed = new Date().toLocaleString();
  const subject = "QuizUps results: " + params.quizTitle;
  const message =
    params.playerName + ' completed your quiz "' + params.quizTitle + '".<br><br>' +
    "Score: " + params.score.toLocaleString() + " points<br>" +
    "Correct answers: " + params.correctCount + " / " + params.totalQuestions + "<br>" +
    "Completed: " + completed + "<br><br>— Sent by QuizUps";
  const base: Record<string, string> = {
    subject,
    message,
    quiz_title: params.quizTitle,
    player_name: params.playerName,
    score: params.score.toLocaleString(),
    correct_count: String(params.correctCount),
    total_questions: String(params.totalQuestions),
    completed_at: completed,
  };
  await rawSend({ ...base, to_email: params.toEmail });
  if (params.ccEmail && params.ccEmail !== params.toEmail) {
    await rawSend({ ...base, to_email: params.ccEmail });
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
    await rawSend({ ...base, to_email: t });
    sent++;
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
