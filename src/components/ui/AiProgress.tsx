"use client";
import { useState, useEffect } from "react";
import { useLang } from "@/contexts/LanguageContext";

const MSGS = ["Contacting the AI…", "Crafting your questions…", "Checking facts & options…", "Removing duplicates…", "Almost there…"];

export default function AiProgress({ eta = 18 }: { eta?: number }) {
  const { t } = useLang();
  const [pct, setPct] = useState(5);
  const [msg, setMsg] = useState(0);
  useEffect(() => {
    const t0 = Date.now();
    const iv = setInterval(() => {
      const el = (Date.now() - t0) / 1000;
      setPct(Math.min(95, Math.round((1 - Math.exp(-el / (eta * 0.6))) * 100)));
      setMsg(el > 3 ? Math.min(MSGS.length - 1, Math.floor(el / (eta / MSGS.length))) : 0);
    }, 300);
    return () => clearInterval(iv);
  }, [eta]);
  const remain = Math.max(1, eta - Math.round((pct / 100) * eta));
  return (
    <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3">
      <div className="flex items-center justify-between text-sm font-semibold text-indigo-700 mb-1">
        <span>{t(MSGS[msg])}</span>
        <span className="text-indigo-400 text-xs">~{remain}{t("s left")}</span>
      </div>
      <div className="h-2 rounded-full bg-indigo-100 overflow-hidden"><div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: pct + "%" }} /></div>
      <div className="text-xs text-indigo-400 mt-1">{t("Trying Gemini → Groq → OpenRouter for reliability.")}</div>
    </div>
  );
}
