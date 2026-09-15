"use client";
import { useEffect, useState } from "react";
import { useLang } from "@/contexts/LanguageContext";
import { reportExperience } from "@/components/ui/ErrorReporter";

/**
 * Languages we did not have reviewed by a native speaker. When someone picks
 * one, say so plainly and invite them to correct us - a wrong word costs us
 * nothing to fix and a lot to leave in place.
 */
const UNREVIEWED: Record<string, boolean> = { uk: true };
const DISMISS_KEY = "quizups:langNoticeSeen";

export default function LangNotice() {
  const { lang, t } = useLang();
  const [dismissed, setDismissed] = useState(true); // assume seen until we read storage
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!UNREVIEWED[lang]) { setDismissed(true); return; }
    let seen = "";
    try { seen = window.localStorage.getItem(DISMISS_KEY) || ""; } catch (e) {}
    setDismissed(seen.split(",").indexOf(lang) >= 0);
    setOpen(false);
    setSent(false);
  }, [lang]);

  const close = () => {
    setDismissed(true);
    try {
      const seen = (window.localStorage.getItem(DISMISS_KEY) || "").split(",").filter(Boolean);
      if (seen.indexOf(lang) < 0) seen.push(lang);
      window.localStorage.setItem(DISMISS_KEY, seen.join(","));
    } catch (e) {}
  };

  const send = async () => {
    setBusy(true);
    await reportExperience("translation correction (" + lang + ")", note.trim(), email.trim() || undefined);
    setBusy(false);
    setSent(true);
    setTimeout(close, 2000);
  };

  if (!UNREVIEWED[lang] || dismissed) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
      <div className="max-w-3xl mx-auto flex flex-col gap-2">
        <div className="flex items-start gap-3">
          <span className="text-lg leading-6 shrink-0" aria-hidden="true">🇺🇦</span>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-amber-900 text-sm">{t("Our Ukrainian is a work in progress")}</p>
            <p className="text-xs sm:text-sm text-amber-800 mt-0.5">
              {t("We are not native speakers. These translations were made with care, but some of them will be wrong. If you spot something that reads badly, please tell us and we will fix it.")}
            </p>
          </div>
          <button onClick={close} aria-label={t("Not now")} className="shrink-0 text-amber-500 hover:text-amber-700 font-black text-lg leading-none px-1">×</button>
        </div>

        {sent ? (
          <p className="text-sm font-bold text-green-700 ps-8">{t("Thank you — we will fix it.")}</p>
        ) : open ? (
          <div className="flex flex-col gap-2 ps-0 sm:ps-8">
            <textarea
              dir="auto"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("Which word or sentence is wrong, and what should it say?")}
              className="w-full rounded-xl border-2 border-amber-200 bg-white p-2 text-sm focus:outline-none focus:border-amber-500"
            />
            <input
              type="email"
              dir="auto"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("Your email (optional, so we can reply)")}
              className="w-full rounded-xl border-2 border-amber-200 bg-white p-2 text-sm focus:outline-none focus:border-amber-500"
            />
            <div className="flex flex-wrap gap-2 justify-end">
              <button onClick={close} className="text-xs font-bold px-3 py-2 rounded-lg bg-amber-100 text-amber-800">{t("Not now")}</button>
              <button onClick={send} disabled={busy || !note.trim()} className="text-xs font-bold px-3 py-2 rounded-lg bg-amber-600 text-white disabled:opacity-50">
                {busy ? t("Sending…") : t("Send")}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 ps-0 sm:ps-8">
            <button onClick={() => setOpen(true)} className="text-xs font-bold px-3 py-2 rounded-lg bg-amber-600 text-white">{t("Suggest a correction")}</button>
            <button onClick={close} className="text-xs font-bold px-3 py-2 rounded-lg bg-amber-100 text-amber-800">{t("Not now")}</button>
          </div>
        )}
      </div>
    </div>
  );
}
