"use client";
import React, { useEffect, useState } from "react";
import { useLang } from "@/contexts/LanguageContext";

const WORKER = "https://polished-shadow-f08c.yassow.workers.dev/";
const QUEUE_KEY = "quizups:errorQueue";
const seen: Record<string, number> = {};

/* ---------------------------------------------------------------------------
 * Breadcrumbs. A rejection often arrives with no useful message; what we
 * actually need is what the player was doing in the seconds before it.
 * Every report carries the last 30 steps.
 * ------------------------------------------------------------------------- */
type Crumb = { at: number; label: string; detail?: string };
const crumbs: Crumb[] = [];

export function breadcrumb(label: string, detail?: any) {
  try {
    crumbs.push({ at: Date.now(), label: String(label).slice(0, 60), detail: detail === undefined ? undefined : String(detail).slice(0, 140) });
    if (crumbs.length > 30) crumbs.shift();
  } catch (e) { /* never let logging break the app */ }
}

function crumbTrail(): string {
  try {
    if (!crumbs.length) return "(no breadcrumbs recorded)";
    const now = Date.now();
    return crumbs
      .map((c) => "  -" + (Math.round((now - c.at) / 100) / 10) + "s  " + c.label + (c.detail ? "  ::  " + c.detail : ""))
      .join("\n");
  } catch (e) {
    return "(breadcrumbs unavailable)";
  }
}

/* ---------------------------------------------------------------------------
 * Durable queue. A report that fails to reach the Worker used to vanish -
 * which is exactly what happens during the network trouble that caused the
 * error in the first place. Failed reports are parked in localStorage and
 * flushed on the next page load, so no log is ever silently lost.
 * ------------------------------------------------------------------------- */
type Queued = { at: number; body: any };

function readQueue(): Queued[] {
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) { return []; }
}

function writeQueue(items: Queued[]) {
  try { window.localStorage.setItem(QUEUE_KEY, JSON.stringify(items.slice(-40))); } catch (e) {}
}

function enqueue(body: any) {
  try { writeQueue(readQueue().concat([{ at: Date.now(), body: body }])); } catch (e) {}
}

function post(body: any): Promise<boolean> {
  return fetch(WORKER, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    .then((r) => !!(r && r.ok))
    .catch(() => false);
}

/** Send, and park it for the next page load if the send fails. */
function postDurable(body: any): Promise<boolean> {
  return post(body).then((ok) => { if (!ok) enqueue(body); return ok; });
}

/** Flush anything parked by an earlier session. Called once on mount. */
export async function flushQueuedReports() {
  const items = readQueue();
  if (!items.length) return;
  writeQueue([]);
  const failed: Queued[] = [];
  for (const item of items) {
    const ok = await post(item.body);
    if (!ok) failed.push(item);
  }
  if (failed.length) writeQueue(failed);
}

/**
 * For an error we catch and carry on from. It used to be a bare `catch {}`,
 * which is how a broken answer submission stayed invisible for weeks.
 */
export function logHandled(where: string, err?: any) {
  try { console.warn("[QuizUps] handled error in " + where, err); } catch (e) {}
  breadcrumb("error:" + where, describeReason(err).split("\n")[0]);
  throttledReport("Handled error - " + where, describeReason(err));
}

/**
 * Errors thrown by the visitor's browser extensions (wallets, ad blockers,
 * password managers) surface on our pages but are not our bugs. Drop them
 * so they don't flood the inbox.
 */
function isExtensionNoise(text: string): boolean {
  const s = String(text || "");
  return (
    s.indexOf("chrome-extension://") >= 0 ||
    s.indexOf("moz-extension://") >= 0 ||
    s.indexOf("safari-web-extension://") >= 0 ||
    s.indexOf("safari-extension://") >= 0 ||
    s.indexOf("MetaMask") >= 0 ||
    s.indexOf("ethereum") >= 0 ||
    s.indexOf("solana") >= 0 ||
    // Headless agents and scrapers running Deno, not a browser our users have.
    // Third-party analytics (Microsoft Clarity) throwing inside its own script.
    s.indexOf("clarity.ms") >= 0 ||
    s.indexOf("clarity.js") >= 0 ||
    s.indexOf("ext:core/") >= 0 ||
    s.indexOf("deno:") >= 0
  );
}

function envelope(summary: string, detail?: string, note?: string, replyTo?: string): string {
  const email = (typeof window !== "undefined" && (window as any).__userEmail) || replyTo || "anonymous";
  return (
    "Summary: " + summary +
    "\nURL: " + (typeof location !== "undefined" ? location.href : "") +
    "\nTime: " + new Date().toISOString() +
    "\nUser: " + email +
    (replyTo ? "\nReply to: " + replyTo : "") +
    "\nLang: " + (typeof document !== "undefined" ? document.documentElement.lang : "") +
    "\nScreen: " + (typeof window !== "undefined" ? window.innerWidth + "x" + window.innerHeight : "") +
    "\nOnline: " + (typeof navigator !== "undefined" ? String(navigator.onLine) : "") +
    "\nUA: " + (typeof navigator !== "undefined" ? navigator.userAgent : "") +
    (note ? "\n\nWhat the user was doing:\n" + note : "") +
    "\n\nRecent steps:\n" + crumbTrail() +
    "\n\nDetails:\n" + String(detail || "").slice(0, 2000)
  );
}

export function reportProblem(summary: string, detail?: string, note?: string, replyTo?: string) {
  try {
    const email = (typeof window !== "undefined" && (window as any).__userEmail) || replyTo || "anonymous";
    return postDurable({ mode: "feedback", ftype: "error report", message: envelope(summary, detail, note, replyTo), email: email });
  } catch (e) { return Promise.resolve(false); }
}

/** A correction or comment the user typed of their own accord. */
export function reportExperience(ftype: string, note: string, replyTo?: string) {
  try {
    const email = (typeof window !== "undefined" && (window as any).__userEmail) || replyTo || "anonymous";
    return postDurable({ mode: "feedback", ftype: ftype, message: envelope(ftype, "", note, replyTo), email: email });
  } catch (e) { return Promise.resolve(false); }
}

/**
 * Some rejections arrive with a stack but no message, which produced reports we
 * could not act on. Pull out whatever identifying detail the reason carries.
 */
function describeReason(r: any): string {
  try {
    if (r === null || r === undefined) return String(r);
    if (typeof r === "string") return r;
    const bits: string[] = [];
    if (r.name) bits.push("name=" + r.name);
    if (r.code) bits.push("code=" + r.code);
    if (r.message) bits.push("message=" + r.message);
    if (!bits.length) {
      if (r.constructor && r.constructor.name) bits.push("type=" + r.constructor.name);
      try { bits.push("raw=" + JSON.stringify(r).slice(0, 300)); } catch (e) { bits.push("raw=" + String(r)); }
    }
    return bits.join(" | ") + (r.stack ? "\n" + r.stack : "");
  } catch (e) {
    return String(r);
  }
}

/**
 * Rejections the browser raises that are not our bugs and that the user can do
 * nothing about: storage that is unavailable, a dropped request, and WebKit's
 * IndexedDB chatter on iOS Safari. Kept as a list so adding one is a one-line
 * change rather than an edit to the handler.
 */
const BENIGN_REJECTIONS = [
  "insufficient permissions",
  "Indexed Database",
  "IndexedDB",
  "Load failed",
  "NetworkError",
  "object store",        // iOS Safari
  "looking up record",   // iOS Safari
  "INTERNAL ASSERTION FAILED",       // Firebase Auth popup/redirect resolver
  "Pending promise was never set",   // Firebase Auth popup/redirect resolver
  "client is offline",               // transient Firestore connectivity
  "enqueueAndForget",                // Firestore internal async-queue panic
  "disconnected from all chains",    // crypto wallet extension (EIP-1193)
];

function isBenignRejection(message: any): boolean {
  const s = String(message || "");
  if (!s) return false;
  for (const p of BENIGN_REJECTIONS) if (s.indexOf(p) >= 0) return true;
  return false;
}

/**
 * iOS Safari rejects in-flight Firebase promises when a page is torn down on
 * navigation (e.g. a player leaving a game mid-round). Those surface here as
 * unhandled rejections with a library-internal stack and are not our bugs, so
 * ignore any rejection that lands within a moment of a route change.
 */
function recentlyNavigated(): boolean {
  try {
    for (let i = crumbs.length - 1; i >= 0; i--) {
      if (crumbs[i].label === "route") return (Date.now() - crumbs[i].at) < 1500;
    }
  } catch (e) {}
  return false;
}

let sdkNoiseSeen = false;

/** Noise from third-party SDKs that we cannot fix from here. */
function isSdkNoise(text: string): boolean {
  const s = String(text || "");
  return (
    // Firebase Auth fires this from its popup/redirect resolver on some mobile
    // browsers even when nothing is wrong. It floods and is not actionable.
    s.indexOf("INTERNAL ASSERTION FAILED") >= 0 ||
    s.indexOf("Pending promise was never set") >= 0
  );
}

function throttledReport(summary: string, detail?: string) {
  try {
    if (Object.keys(seen).length > 60) return; // session cap to avoid floods
    if (isExtensionNoise(detail || "") || isExtensionNoise(summary)) return;
    if (isBenignRejection(detail || "") || isBenignRejection(summary)) return;
    if (isSdkNoise(detail || "")) {
      // Still worth seeing once: if Google sign-in is genuinely broken on a
      // browser, this is the only signal. Just never let it flood.
      if (sdkNoiseSeen) return;
      sdkNoiseSeen = true;
    }
    const key = (summary + "|" + (detail || "")).slice(0, 140);
    const now = Date.now();
    if (seen[key] && now - seen[key] < 60000) return;
    seen[key] = now;
    reportProblem(summary, detail);
  } catch (e) {}
}

/* ---------------------------------------------------------------------------
 * The shared "tell us what happened" form. Every error surface uses this one,
 * so the wording is translated once and the layout works on a phone.
 * ------------------------------------------------------------------------- */
export function ReportForm({ summary, detail, onDone }: { summary: string; detail?: string; onDone?: () => void }) {
  const { t } = useLang();
  const [note, setNote] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const send = async () => {
    setBusy(true);
    await reportProblem(summary, detail, note.trim(), email.trim() || undefined);
    setBusy(false);
    setSent(true);
    setTimeout(() => { if (onDone) onDone(); }, 1800);
  };

  if (sent) return <p className="text-sm font-bold text-green-600 py-2">{t("Thanks — that really helps.")}</p>;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-gray-500">{t("Tell us what happened. It helps us fix it faster, and we read every one.")}</p>
      <textarea
        dir="auto"
        rows={3}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={t("What were you doing when this happened?")}
        className="w-full rounded-xl border-2 border-gray-200 p-2 text-sm focus:outline-none focus:border-indigo-500"
      />
      <input
        type="email"
        dir="auto"
        inputMode="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t("Your email (optional, so we can reply)")}
        className="w-full rounded-xl border-2 border-gray-200 p-2 text-sm focus:outline-none focus:border-indigo-500"
      />
      <div className="flex flex-wrap gap-2 justify-end">
        {onDone && <button onClick={onDone} className="text-xs font-bold px-3 py-2 rounded-lg bg-gray-100 text-gray-600">{t("Dismiss")}</button>}
        <button onClick={send} disabled={busy} className="text-xs font-bold px-3 py-2 rounded-lg bg-indigo-600 text-white disabled:opacity-60">
          {busy ? t("Sending…") : t("Send report")}
        </button>
      </div>
    </div>
  );
}

export function ErrorFallback({ error, onReload }: { error?: any; onReload?: () => void }) {
  const { t } = useLang();
  const detail = (error && (error.stack || error.message)) || String(error);
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow text-center">
        <div className="text-4xl mb-2">🙏</div>
        <h2 className="text-lg sm:text-xl font-black text-gray-800 mb-1">{t("Oops — something went wrong on our side.")}</h2>
        <p className="text-sm text-gray-500 mb-4">{t("We're really sorry for the inconvenience. You can report this and our team will look into it.")}</p>
        <div className="text-left">
          <ReportForm summary="React render error" detail={detail} />
        </div>
        <button onClick={() => (onReload ? onReload() : location.reload())} className="mt-4 w-full sm:w-auto px-4 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm">
          {t("Reload")}
        </button>
      </div>
    </div>
  );
}

export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: any) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
  componentDidCatch(error: any, info: any) {
    try {
      const sig = String((error && (error.name + " " + error.message)) || error || "");
      if (sig.indexOf("ChunkLoadError") >= 0 || sig.indexOf("Loading chunk") >= 0 || sig.indexOf("Loading CSS chunk") >= 0) {
        // A lazy chunk failed to load - almost always a stale deploy or a flaky
        // network. Reload once (guarded) to pull the current chunks rather than
        // show a crash screen. Not reported: transient, not a bug.
        try {
          const k = "quizups:chunkReload";
          if (!sessionStorage.getItem(k)) { sessionStorage.setItem(k, String(Date.now())); location.reload(); return; }
        } catch (e) { location.reload(); return; }
      }
      reportProblem("React render crash", ((error && error.stack) || String(error)) + "\n\nComponentStack:" + (info && info.componentStack));
    } catch (e) {}
  }
  render() { if (this.state.hasError) return <ErrorFallback error={this.state.error} onReload={() => this.setState({ hasError: false, error: null })} />; return this.props.children as any; }
}

export function GlobalErrorListener() {
  const { t } = useLang();
  // `detail` is the raw technical text for the report. It is never shown to
  // the user: what they see is a translated sentence in their own language.
  const [toast, setToast] = useState<null | { detail: string }>(null);

  useEffect(() => { flushQueuedReports(); }, []);

  useEffect(() => {
    function onErr(e: ErrorEvent) {
      if (!e.error || !e.error.stack || e.message === "Script error." || !e.message) return;
      if (e.filename && e.filename.indexOf("/_next/") < 0) return;
      if ((e.error.stack || "").indexOf("global code") >= 0) return;
      if (isExtensionNoise(e.error.stack || "") || isExtensionNoise(e.message || "")) return;
      const detail = (e.error.stack || e.error.message || e.message) + "\npage=" + (typeof location !== "undefined" ? location.href : "");
      if (isBenignRejection(detail)) return;
      throttledReport("Uncaught error", detail);
      setToast({ detail: detail });
    }
    function onRej(e: PromiseRejectionEvent) {
      const r: any = e.reason;
      if (!r || !(r.stack || r.message)) return;
      if (isBenignRejection(r.message)) return;
      if (isExtensionNoise(r.stack || "") || isExtensionNoise(r.message || "")) return;
      if (recentlyNavigated()) return;
      const detail = describeReason(r) + "\npage=" + (typeof location !== "undefined" ? location.href : "");
      throttledReport("Unhandled promise rejection", detail);
      if (isSdkNoise(detail)) return;
      setToast({ detail: detail });
    }
    window.addEventListener("error", onErr);
    window.addEventListener("unhandledrejection", onRej);
    return () => { window.removeEventListener("error", onErr); window.removeEventListener("unhandledrejection", onRej); };
  }, []);

  if (!toast) return null;
  return (
    <div className="fixed inset-x-3 bottom-3 sm:inset-x-auto sm:left-4 sm:bottom-4 z-[60] sm:max-w-xs bg-white rounded-2xl border border-gray-200 shadow-2xl p-4 text-sm">
      <div className="font-bold text-gray-800 mb-1">⚠️ {t("Something went wrong")}</div>
      <p className="text-gray-500 mb-2">{t("Something went wrong on this page. Our team has already been notified.")}</p>
      <ReportForm summary="User-submitted report" detail={toast.detail} onDone={() => setToast(null)} />
    </div>
  );
}
