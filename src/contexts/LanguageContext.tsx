"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { t as translate, type Lang } from "@/lib/i18n";

interface LanguageContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
  dir: "ltr" | "rtl";
}

const LanguageContext = createContext<LanguageContextType | null>(null);

const SUPPORTED: Lang[] = ["en", "ar", "uk"];
const STORAGE_KEY = "quizzap_lang";

function isLang(v: any): v is Lang {
  return SUPPORTED.indexOf(v) >= 0;
}

/**
 * First visit: follow the browser. Someone arriving from Kyiv on a Ukrainian
 * phone should not have to hunt for the language menu. An explicit choice is
 * stored and always wins afterwards.
 */
function detectLang(): Lang {
  try {
    const list: string[] = ([] as string[])
      .concat((navigator.languages as any) || [])
      .concat([navigator.language || ""]);
    for (const raw of list) {
      const base = String(raw || "").toLowerCase().split("-")[0];
      if (isLang(base)) return base;
    }
  } catch (e) {}
  return "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    let saved: string | null = null;
    try { saved = window.localStorage.getItem(STORAGE_KEY); } catch (e) {}
    if (isLang(saved)) { setLangState(saved); return; }
    const detected = detectLang();
    if (detected !== "en") setLangState(detected);
  }, []);

  const setLang = (l: Lang) => {
    if (!isLang(l)) return;
    setLangState(l);
    try { window.localStorage.setItem(STORAGE_KEY, l); } catch (e) {}
  };

  const dir = lang === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
      document.documentElement.dir = dir;
    }
  }, [lang, dir]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: (k: string) => translate(k, lang), dir }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) return { lang: "en" as Lang, setLang: () => {}, t: (k: string) => translate(k, "en"), dir: "ltr" as const };
  return ctx;
}
