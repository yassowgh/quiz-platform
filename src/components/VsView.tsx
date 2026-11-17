"use client";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { useLang } from "@/contexts/LanguageContext";
import { getVs, VS_SLUGS, VS_NAMES, FEATURE_KEYS } from "@/lib/vsContent";

export default function VsView({ slug }: { slug: string }) {
  const { lang, dir } = useLang();
  const { name, features, quizups, ui, comp } = getVs(slug, lang);
  const fmt = (s: string, n: string = name) => (s || "").replace(/\{name\}/g, n);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-white" dir={dir}>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <p className="text-kahoot-blue font-bold mb-2">{fmt(ui.freeAlt)}</p>
        <h1 className="text-4xl font-black text-gray-900 mb-4">{fmt(ui.vs)}</h1>
        <p className="text-lg text-gray-600 mb-8">{comp.intro}</p>

        <div className="overflow-x-auto rounded-2xl border-2 border-gray-100 mb-8">
          <table className="w-full text-start text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="p-3 font-bold text-gray-700">{ui.feature}</th>
                <th className="p-3 font-bold text-kahoot-blue">{ui.quizups}</th>
                <th className="p-3 font-bold text-gray-700">{name}</th>
              </tr>
            </thead>
            <tbody>
              {FEATURE_KEYS.map((k) => (
                <tr key={k} className="border-t border-gray-100">
                  <td className="p-3 font-semibold text-gray-700">{features[k]}</td>
                  <td className="p-3 text-gray-900">{quizups[k]}</td>
                  <td className="p-3 text-gray-500">{comp.them[k] || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="text-2xl font-black text-gray-900 mb-2">{ui.verdict}</h2>
        <p className="text-gray-600 mb-8">{comp.verdict}</p>

        <div className="flex flex-wrap gap-3 mb-10">
          <Link href="/signup"><Button size="lg">{fmt(ui.ctaStart)}</Button></Link>
          <Link href="/"><Button size="lg" variant="secondary">{ui.ctaFeatures}</Button></Link>
        </div>

        <p className="text-sm text-gray-400 mb-2">{ui.compare}</p>
        <div className="flex flex-wrap gap-3 text-sm">
          {VS_SLUGS.filter((s) => s !== slug).map((s) => (
            <Link key={s} href={"/vs/" + s} className="text-kahoot-blue font-semibold hover:underline">
              {fmt(ui.vs, VS_NAMES[s])}
            </Link>
          ))}
        </div>

        <p className="text-xs text-gray-400 mt-10">{fmt(ui.disclaimer)}</p>
      </div>
    </div>
  );
}
