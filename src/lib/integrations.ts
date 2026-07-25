"use client";
import { nanoid } from "@/lib/utils";
import type { Question } from "@/types";

export const AI_WORKER_URL = "https://polished-shadow-f08c.yassow.workers.dev/";
export const EMAILJS_SERVICE_ID = "service_rfgjm2s";
export const EMAILJS_TEMPLATE_ID = "template_l62666k";
export const EMAILJS_PUBLIC_KEY = "tSIOLMDkcK9CCwiiJ";

export const AI_ENABLED = AI_WORKER_URL.length > 0;
export const EMAIL_ENABLED = EMAILJS_PUBLIC_KEY.length > 0;

export async function generateQuestions(
  topic: string,
  count: number,
  language: "en" | "ar"
): Promise<Question[]> {
  const r = await fetch(AI_WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic, count, language }),
  });
  let data: any = {};
  try { data = await r.json(); } catch { /* ignore */ }
  if (!r.ok || data.error) {
    throw new Error(String(data.detail || data.error || ("AI request failed (" + r.status + ")")));
  }
  const arr = Array.isArray(data.questions) ? data.questions : [];
  return arr.map((q: any): Question => {
    const options = Array.isArray(q.options)
      ? q.options.slice(0, 6).map((o: any) => String(o).slice(0, 75))
      : ["", "", "", ""];
    while (options.length < 2) options.push("");
    const ci = Number.isInteger(q.correctIndex)
      ? Math.max(0, Math.min(q.correctIndex, options.length - 1))
      : 0;
    return {
      id: nanoid(),
      text: String(q.text || "").slice(0, 150),
      options,
      correctAnswer: ci,
      correctAnswers: [ci],
      multiSelect: false,
      type: "multiple",
      timeLimit: 20,
      points: 1000,
    };
  });
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

export async function sendAssignmentEmail(params: {
  toEmail: string;
  ccEmail?: string;
  quizTitle: string;
  playerName: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
}): Promise<void> {
  if (!EMAIL_ENABLED || !params.toEmail) return;
  const ejs = await loadEmailJs();
  const base = {
    quiz_title: params.quizTitle,
    player_name: params.playerName,
    score: params.score.toLocaleString(),
    correct_count: String(params.correctCount),
    total_questions: String(params.totalQuestions),
    completed_at: new Date().toLocaleString(),
  };
  await ejs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, { ...base, to_email: params.toEmail });
  if (params.ccEmail && params.ccEmail !== params.toEmail) {
    await ejs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, { ...base, to_email: params.ccEmail });
  }
}
