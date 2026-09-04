"use client";
import { useState } from "react";
import { submitFeedback } from "@/lib/firestore";

const WORKER = "https://polished-shadow-f08c.yassow.workers.dev/";

export default function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [ftype, setFtype] = useState("recommendation");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!message.trim()) return;
    setBusy(true);
    try {
      await submitFeedback({ ftype, message: message.trim(), email: email.trim() });
      fetch(WORKER, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "feedback", ftype, message: message.trim(), email: email.trim() || "anonymous" }) }).catch(() => {});
      setSent(true); setMessage("");
    } catch (e) {}
    setBusy(false);
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {open && (
        <div className="mb-2 w-72 rounded-2xl bg-white shadow-2xl border border-gray-200 p-4 text-gray-800">
          {sent ? (
            <div className="text-center py-4">
              <div className="text-3xl mb-2">🙏</div>
              <p className="font-semibold">Thank you!</p>
              <p className="text-sm text-gray-500">Your feedback was sent.</p>
              <button className="mt-3 text-sm text-indigo-600" onClick={() => { setSent(false); setOpen(false); }}>Close</button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold">Send feedback</span>
                <button onClick={() => setOpen(false)} className="text-gray-400 text-xl leading-none">×</button>
              </div>
              <select value={ftype} onChange={(e) => setFtype(e.target.value)} className="w-full mb-2 rounded-lg border border-gray-300 p-2 text-sm">
                <option value="recommendation">💡 Recommendation</option>
                <option value="complaint">⚠️ Complaint</option>
                <option value="question">❓ Question</option>
                <option value="other">💬 Other</option>
              </select>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Tell us what's on your mind…" rows={4} className="w-full mb-2 rounded-lg border border-gray-300 p-2 text-sm" />
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email (optional)" className="w-full mb-2 rounded-lg border border-gray-300 p-2 text-sm" />
              <button onClick={send} disabled={busy || !message.trim()} className="w-full rounded-lg bg-indigo-600 text-white py-2 text-sm font-semibold disabled:opacity-50">{busy ? "Sending…" : "Send"}</button>
            </>
          )}
        </div>
      )}
      <button onClick={() => setOpen((o) => !o)} className="rounded-full bg-indigo-600 text-white shadow-lg px-4 py-3 text-sm font-semibold hover:bg-indigo-700">💬 Feedback</button>
    </div>
  );
}
