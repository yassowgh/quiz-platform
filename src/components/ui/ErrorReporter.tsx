"use client";
import React, { useEffect, useState } from "react";
import { useLang } from "@/contexts/LanguageContext";

const WORKER = "https://polished-shadow-f08c.yassow.workers.dev/";
const seen: Record<string, number> = {};

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
      "\n\nDetails:\n" + String(detail || "").slice(0, 2000);
    return fetch(WORKER, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "feedback", ftype: "error report", message: message, email: email }) }).catch(() => {});
  } catch (e) { return Promise.resolve(); }
}

function throttledReport(summary: string, detail?: string) {
  try {
    if (Object.keys(seen).length > 25) return; // session cap to avoid floods
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
    function onErr(e: ErrorEvent) { throttledReport("Uncaught error", (e.error && (e.error.stack || e.error.message)) || e.message); setToast({ msg: e.message || "error" }); }
    function onRej(e: PromiseRejectionEvent) { const r: any = e.reason; throttledReport("Unhandled promise rejection", (r && (r.stack || r.message)) || String(r)); setToast({ msg: (r && r.message) || String(r) }); }
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
