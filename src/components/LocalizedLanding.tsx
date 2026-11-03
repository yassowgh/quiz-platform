import Link from "next/link";
import { t, type Lang } from "@/lib/i18n";
import SetLang from "@/components/SetLang";

const OTHER: { code: Lang; label: string; href: string }[] = [
  { code: "en", label: "English", href: "/" },
  { code: "ar", label: "\u0627\u0644\u0639\u0631\u0628\u064A\u0629", href: "/ar" },
  { code: "tr", label: "T\u00FCrk\u00E7e", href: "/tr" },
  { code: "uk", label: "\u0423\u043A\u0440\u0430\u0457\u043D\u0441\u044C\u043A\u0430", href: "/uk" },
  { code: "fr", label: "Fran\u00E7ais", href: "/fr" },
  { code: "de", label: "Deutsch", href: "/de" },
];

function Card({ title, body }: { title: string; body: string }) {
  return (
    <div className="bg-gray-50 rounded-2xl p-5 text-left border border-gray-100">
      <h3 className="font-black text-lg mb-1 text-gray-900">{title}</h3>
      <p className="text-gray-600 text-sm leading-relaxed">{body}</p>
    </div>
  );
}

export default function LocalizedLanding({ lang }: { lang: Lang }) {
  const dir = lang === "ar" ? "rtl" : "ltr";
  return (
    <div dir={dir} className="bg-kahoot-dark text-white">
      <SetLang lang={lang} />

      <section className="max-w-4xl mx-auto px-4 py-14 text-center">
        <img src="/logo-full.png" alt="QuizUps" className="h-16 sm:h-20 mx-auto mb-6 object-contain" />
        <h1 className="text-3xl sm:text-5xl font-black mb-3">{t("tagline", lang)}</h1>
        <p className="text-xl sm:text-2xl text-yellow-400 font-bold mb-8">{t("freeAlternative", lang)}</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/join" className="bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl px-6 py-3">{t("Join Game!", lang)}</Link>
          <Link href="/signup" className="bg-white hover:bg-gray-100 text-gray-900 font-black rounded-2xl px-6 py-3">{t("createQuiz", lang)}</Link>
        </div>
      </section>

      <section className="bg-white text-gray-900 py-14">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-black mb-2">{t("Everything you need \u2014 nothing locked away", lang)}</h2>
          <p className="text-gray-600 max-w-2xl mx-auto mb-10">{t("QuizUps gives you the features other quiz platforms charge for. No subscriptions, no player limits, no ads.", lang)}</p>
          <div className="grid sm:grid-cols-3 gap-5">
            <Card title={t("5 question types", lang)} body={t("Multiple choice, true/false, type-the-answer, sorting and polls \u2014 with multi-select, up to 6 options, images, video and audio.", lang)} />
            <Card title={t("Play live or self-paced", lang)} body={t("Host live with a PIN or QR code, pool scores in team mode, or send a self-paced assignment link. Unlimited players.", lang)} />
            <Card title={t("Reports & branding", lang)} body={t("Per-question accuracy reports with CSV export, your own colours and logo, and a full Arabic / RTL interface.", lang)} />
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-14">
        <h2 className="text-2xl sm:text-3xl font-black mb-1 text-center">{t("\u2728 What's new in QuizUps", lang)}</h2>
        <p className="text-white/60 text-center mb-10">{t("The latest additions \u2014 all free.", lang)}</p>
        <div className="grid sm:grid-cols-2 gap-5">
          <div className="bg-white/5 rounded-2xl p-5"><h3 className="font-black mb-1">{t("Live polls & surveys", lang)}</h3><p className="text-white/70 text-sm">{t("Word clouds, scales, ranking and open-ended walls \u2014 Mentimeter-style, live with a QR code.", lang)}</p></div>
          <div className="bg-white/5 rounded-2xl p-5"><h3 className="font-black mb-1">{t("Gold Quest", lang)}</h3><p className="text-white/70 text-sm">{t("A Blooket-style treasure race where answers earn (and steal) gold.", lang)}</p></div>
          <div className="bg-white/5 rounded-2xl p-5"><h3 className="font-black mb-1">{t("Battle Royale", lang)}</h3><p className="text-white/70 text-sm">{t("Last player standing \u2014 wrong answers eliminate you.", lang)}</p></div>
          <div className="bg-white/5 rounded-2xl p-5"><h3 className="font-black mb-1">{t("Always-on AI", lang)}</h3><p className="text-white/70 text-sm">{t("Questions generate reliably via Gemini \u2192 Groq \u2192 OpenRouter fallbacks.", lang)}</p></div>
        </div>
      </section>

      <section className="bg-yellow-400 text-gray-900 py-12 text-center px-4">
        <p className="text-lg sm:text-2xl font-black max-w-3xl mx-auto mb-4">{t("features that cost money on Kahoot are free on QuizUps", lang)}</p>
        <Link href="/vs/kahoot" className="inline-block underline font-bold">{t("QuizUps vs Kahoot", lang)}</Link>
        <p className="mt-6 font-black text-lg">{t("\u2728 Totally free \u2014 start hosting in under a minute", lang)}</p>
        <div className="mt-4"><Link href="/signup" className="inline-block bg-gray-900 text-white font-black rounded-2xl px-6 py-3">{t("createQuiz", lang)}</Link></div>
      </section>

      <section className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h2 className="text-xl sm:text-2xl font-black mb-2">{t("Trivia night for the whole family", lang)}</h2>
        <p className="text-white/70 mb-4">{t("Free, instant trivia games everyone can play together \u2014 on any phone, in your language.", lang)}</p>
        <p className="text-white/70">{t("Play in English, Arabic or Ukrainian.", lang)}</p>
      </section>

      <footer className="border-t border-white/10 py-10 text-center px-4">
        <nav className="flex flex-wrap gap-x-4 gap-y-2 justify-center text-sm text-white/70 mb-4">
          {OTHER.map((o) => (
            <Link key={o.code} href={o.href} className={"hover:text-white " + (o.code === lang ? "text-white font-bold underline" : "")}>{o.label}</Link>
          ))}
        </nav>
        <nav className="flex flex-wrap gap-x-4 gap-y-2 justify-center text-sm text-white/60">
          <Link href="/features" className="hover:text-white">Features</Link>
          <Link href="/pricing" className="hover:text-white">Pricing</Link>
          <Link href="/family" className="hover:text-white">Family</Link>
          <Link href="/trivia" className="hover:text-white">Trivia</Link>
          <Link href="/vs/kahoot" className="hover:text-white">vs Kahoot</Link>
        </nav>
      </footer>
    </div>
  );
}
