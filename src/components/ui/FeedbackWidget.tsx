"use client";
import { useState } from "react";
import { submitFeedback } from "@/lib/firestore";
import { uploadImage } from "@/lib/integrations";

const WORKER = "https://polished-shadow-f08c.yassow.workers.dev/";

export default function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [ftype, setFtype] = useState("recommendation");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  async function send() {
    if (!message.trim()) { setErr("Please write a message."); return; }
    if (!validEmail(email.trim())) { setErr("Please enter a valid email so we can follow up."); return; }
    setBusy(true); setErr("");
    let screenshotUrl = "";
    try {
      if (file) { try { screenshotUrl = await uploadImage(file); } catch (e) {} }
      await submitFeedback({ ftype, message: message.trim(), email: email.trim(), screenshotUrl });
      const msg = message.trim() + (screenshotUrl ? ("\n\nScreenshot: " + screenshotUrl) : "");
      fetch(WORKER, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "feedback", ftype, message: msg, email: email.trim() }) }).catch(() => {});
      setSent(true); setMessage(""); setFile(null);
    } catch (e) { setErr("Something went wrong. Please try again."); }
    setBusy(false);
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {open && (
        <div className="mb-2 w-80 rounded-2xl bg-white shadow-2xl border border-gray-200 p-4 text-gray-800">
          {sent ? (
            <div className="text-center py-4">
              <div className="text-3xl mb-2">🙏</div>
              <p className="font-semibold">Thank you!</p>
              <p className="text-sm text-gray-500">We read every message and use it to improve QuizUps. You&apos;ll often see your ideas in our next update.</p>
              <button className="mt-3 text-sm text-indigo-600" onClick={() => { setSent(false); setOpen(false); }}>Close</button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold">Send feedback</span>
                <button onClick={() => setOpen(false)} className="text-gray-400 text-xl leading-none">×</button>
              </div>
              <p className="text-xs text-gray-500 mb-3">We take every comment seriously — we ship updates and improvements regularly based on what you tell us.</p>
              <select value={ftype} onChange={(e) => setFtype(e.target.value)} className="w-full mb-2 rounded-lg border border-gray-300 p-2 text-sm">
                <option value="recommendation">💡 Recommendation</option>
                <option value="complaint">⚠️ Complaint</option>
                <option value="question">❓ Question</option>
                <option value="other">💬 Other</option>
              </select>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Tell us what's on your mind…" rows={4} className="w-full mb-2 rounded-lg border border-gray-300 p-2 text-sm" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email (required)" required className="w-full mb-2 rounded-lg border border-gray-300 p-2 text-sm" />
              <label className="block mb-2">
                <span className="text-gray-500 text-xs">Attach a screenshot (optional)</span>
                <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)} className="mt-1 block w-full text-xs text-gray-500 file:mr-2 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-indigo-600 file:font-semibold" />
              </label>
              {file && <p className="text-xs text-gray-400 mb-2 truncate">📎 {file.name}</p>}
              {err && <p className="text-xs text-red-500 mb-2">{err}</p>}
              <button onClick={send} disabled={busy} className="w-full rounded-lg bg-indigo-600 text-white py-2 text-sm font-semibold disabled:opacity-50">{busy ? "Sending…" : "Send"}</button>
            </>
          )}
        </div>
      )}
      <button onClick={() => setOpen((o) => !o)} className="rounded-full bg-indigo-600 text-white shadow-lg px-4 py-3 text-sm font-semibold hover:bg-indigo-700">💬 Feedback</button>
    </div>
  );
}
