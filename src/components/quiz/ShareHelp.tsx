"use client";
import { useEffect, useState } from "react";
import { useLang } from "@/contexts/LanguageContext";

/**
 * "Share" and "Assign" sit next to each other and people picked the wrong one.
 * Hovering Share explains the difference on a desktop; on a phone there is no
 * hover, so the same text is one tap away behind the question mark.
 */
export function ShareHelpCard({ onClose }: { onClose?: () => void }) {
  const { t } = useLang();
  return (
    <div className="text-start">
      <p className="font-black text-gray-900 mb-2">{t("Two ways to share")}</p>
      <p className="font-bold text-gray-800 text-sm">👥 {t("Share — invite a colleague")}</p>
      <p className="text-xs text-gray-600 mb-2">{t("They can open it, edit the questions and host it themselves. Best for a co-teacher or a teammate.")}</p>
      <p className="font-bold text-gray-800 text-sm">📝 {t("Assign — send it to participants")}</p>
      <p className="text-xs text-gray-600">{t("They get a link and answer at their own pace. They cannot see or change your questions.")}</p>
      {onClose && (
        <div className="flex justify-end mt-3">
          <button onClick={onClose} className="text-xs font-bold px-3 py-2 rounded-lg bg-gray-100 text-gray-700">{t("Got it")}</button>
        </div>
      )}
    </div>
  );
}

/**
 * Wraps the Share button. Desktop: shows the card on hover/focus.
 * Touch: shows a separate "?" button that opens the card as a sheet.
 */
export default function ShareHelp({ children }: { children: React.ReactNode }) {
  const { t } = useLang();
  const [hover, setHover] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [touch, setTouch] = useState(false);

  useEffect(() => {
    try { setTouch(window.matchMedia("(hover: none)").matches); } catch (e) {}
  }, []);

  return (
    <>
      <div
        className="relative inline-flex items-center gap-1"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onFocus={() => setHover(true)}
        onBlur={() => setHover(false)}
      >
        {children}
        {touch && (
          <button
            type="button"
            onClick={() => setSheet(true)}
            aria-label={t("What's the difference?")}
            className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs font-black leading-none shrink-0"
          >
            ?
          </button>
        )}
        {hover && !touch && (
          <div role="tooltip" className="absolute bottom-full mb-2 end-0 z-40 w-72 max-w-[calc(100vw-2rem)] bg-white rounded-xl border border-gray-200 shadow-2xl p-3">
            <ShareHelpCard />
          </div>
        )}
      </div>

      {sheet && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setSheet(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl p-5 w-full sm:max-w-sm" onClick={(e) => e.stopPropagation()}>
            <ShareHelpCard onClose={() => setSheet(false)} />
          </div>
        </div>
      )}
    </>
  );
}
