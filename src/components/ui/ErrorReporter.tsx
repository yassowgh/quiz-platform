"use client";
import React, { useEffect, useState } from "react";
import { useLang } from "@/contexts/LanguageContext";

const WORKER = "https://polished-shadow-f08c.yassow.workers.dev/";
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
    s.indexOf("solana") >= 0
  );
}

export function reportProblem(summary: string, detail?: string, note?: string) {
  try {
    const email = (typeof window !== "undefined" && (window as any).__userEmail) || "anonymous";
    const message =
      "Summary: " + summary +
      "\nURL: " + (typeof location !== "undefined" ? location.href : "") +
      "\nTime: " + new Date().toISOString() +
      "\nUser: " + email +
      "\nLang: " + (typeof document !== "undefined" ? document.documentElement.lang : "") +
      "\nUA: " + (typeof navigator !== "undefined" ? navigator.userAgent : "") +
      (note ? "\nUser note: " + note : "") +
      "\n\nRecent steps:\n" + crumbTrail() +
      "\n\nDetails:\n" + String(detail || "").slice(0, 2000);
    return fetch(WORKER, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "feedback", ftype: "error report", message: message, email: email }) }).catch(() => {});
  } catch (e) { return Promise.resolve(); }
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
    if (Object.keys(seen).length > 25) return; // session cap to avoid floods
    if (isExtensionNoise(detail || "") || isExtensionNoise(summary)) return;
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

export function ErrorFallback({ error, onReload }: { error?: any; onReload?: () => void }) {
  const { t } = useLang();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  async function send() { setBusy(true); await reportProblem("React render error", (error && (error.stack || error.message)) || String(error)); setSent(true); setBusy(false); }
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 p-6 text-center shadow">
        <div className="text-4xl mb-2">🙏</div>
        <h2 className="text-xl font-black text-gray-800 mb-1">{t("Oops — something went wrong on our side.")}</h2>
        <p className="text-sm text-gray-500 mb-4">{t("We're really sorry for the inconvenience. You can report this and our team will look into it.")}</p>
        <div className="flex gap-2 justify-center">
          <button onClick={() => (onReload ? onReload() : location.reload())} className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm">{t("Reload")}</button>
          {sent ? <span className="px-4 py-2 text-sm text-green-600 font-semibold">{t("Thanks — your report was sent.")}</span>
            : <button onClick={send} disabled={busy} className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-sm">{busy ? t("Sending…") : t("Report a problem")}</button>}
        </div>
      </div>
    </div>
  );
}

export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: any) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
  componentDidCatch(error: any, info: any) { try { reportProblem("React render crash", ((error && error.stack) || String(error)) + "\n\nComponentStack:" + (info && info.componentStack)); } catch (e) {} }
  render() { if (this.state.hasError) return <ErrorFallback error={this.state.error} onReload={() => this.setState({ hasError: false, error: null })} />; return this.props.children as any; }
}

export function GlobalErrorListener() {
  const { t } = useLang();
  const [toast, setToast] = useState<null | { msg: string }>(null);
  useEffect(() => {
    function onErr(e: ErrorEvent) { if (!e.error || !e.error.stack || e.message === "Script error." || !e.message) return; if (e.filename && e.filename.indexOf("/_next/") < 0) return; if ((e.error.stack || "").indexOf("global code") >= 0) return; if (isExtensionNoise(e.error.stack || "") || isExtensionNoise(e.message || "")) return; throttledReport("Uncaught error", e.error.stack || e.error.message); setToast({ msg: e.message }); }
    function onRej(e: PromiseRejectionEvent) { const r: any = e.reason; if (!r || !(r.stack || r.message)) return; if (r.message && (r.message.indexOf("insufficient permissions") >= 0 || r.message.indexOf("Indexed Database") >= 0 || r.message.indexOf("IndexedDB") >= 0 || r.message.indexOf("Load failed") >= 0 || r.message.indexOf("NetworkError") >= 0)) return; if (isExtensionNoise(r.stack || "") || isExtensionNoise(r.message || "")) return; throttledReport("Unhandled promise rejection", describeReason(r) + "\npage=" + (typeof location !== "undefined" ? location.href : "")); setToast({ msg: r.message || r.name || "Something went wrong" }); }
    window.addEventListener("error", onErr);
    window.addEventListener("unhandledrejection", onRej);
    return () => { window.removeEventListener("error", onErr); window.removeEventListener("unhandledrejection", onRej); };
  }, []);
  if (!toast) return null;
  return (
    <div className="fixed bottom-4 left-4 z-[60] max-w-xs bg-white rounded-2xl border border-gray-200 shadow-2xl p-4 text-sm">
      <div className="font-bold text-gray-800 mb-1">⚠️ {t("Something went wrong")}</div>
      <p className="text-gray-500 mb-2">{t("Sorry about that — our team has been automatically notified.")}</p>
      <div className="flex gap-2 justify-end">
        <button onClick={() => { const note = typeof window !== "undefined" ? window.prompt(t("Add any details (optional):")) : ""; reportProblem("User-submitted report", toast.msg, note || ""); setToast(null); }} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600">{t("Report a problem")}</button>
        <button onClick={() => setToast(null)} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600">{t("Dismiss")}</button>
      </div>
    </div>
  );
}
