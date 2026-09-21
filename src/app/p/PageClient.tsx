"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getPageBySlug } from "@/lib/firestore";
import { useLang } from "@/contexts/LanguageContext";
import { logHandled } from "@/components/ui/ErrorReporter";

export default function PageClient() {
  const params = useSearchParams();
  const slug = params.get("slug") || "";
  const { t } = useLang();
  const [page, setPage] = useState<any | undefined>(undefined);
  useEffect(() => {
    if (!slug) { setPage(null); return; }
    getPageBySlug(slug)
      .then((p) => setPage(p && p.published ? p : null))
      .catch((e) => { logHandled("custom page load", e); setPage(null); });
  }, [slug]);
  if (page === undefined) return <div className="p-10 text-center text-gray-500 font-bold">{t("Loading…")}</div>;
  if (!page) return (
    <div className="max-w-2xl mx-auto p-10 text-center">
      <p className="text-gray-500 font-semibold mb-4">{t("This page could not be found.")}</p>
      <Link href="/" className="text-kahoot-purple underline">{t("Go home")}</Link>
    </div>
  );
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-3xl font-black mb-4" dir="auto">{page.title}</h1>
      <div className="leading-relaxed whitespace-pre-wrap" dir="auto" dangerouslySetInnerHTML={{ __html: page.body || "" }} />
    </div>
  );
}
