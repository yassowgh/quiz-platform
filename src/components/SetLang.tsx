"use client";
import { useEffect } from "react";

// Landing pages render localized content on the server. On the client we also
// persist the chosen language so that navigating into the app continues in it,
// and we update <html lang/dir> for JS-aware crawlers.
export default function SetLang({ lang }: { lang: string }) {
  useEffect(() => {
    try { window.localStorage.setItem("quizzap_lang", lang); } catch (e) {}
    try {
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    } catch (e) {}
  }, [lang]);
  return null;
}
