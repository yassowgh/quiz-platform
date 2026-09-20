"use client";
import Link from "next/link";
import { useLang } from "@/contexts/LanguageContext";
import Button from "@/components/ui/Button";

export default function FamilyClient() {
  const { t } = useLang();
  return (
    <div className="min-h-[calc(100vh-64px)] bg-kahoot-dark text-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <p className="text-white/60 font-semibold mb-2">{t("🎉 Just for fun")}</p>
        <h1 className="text-3xl sm:text-5xl font-black mb-3">{t("Trivia night for the whole family")}</h1>
        <p className="text-white/70 text-lg mb-6">{t("Free, instant trivia games everyone can play together — on any phone, in your language.")}</p>
        <Link href="/fun"><Button size="lg">{t("Start a free game")}</Button></Link>
        <p className="text-white/50 text-sm mt-2">{t("No sign-up needed to play.")}</p>

        <h2 className="text-2xl font-black mt-12 mb-2">{t("What is trivia gaming?")}</h2>
        <p className="text-white/80 leading-relaxed">{t("Trivia gaming turns any topic into a quick, friendly quiz everyone answers on their own phone. One screen shows the question, everyone taps their answer, and points go to whoever is fastest and right. It is the party-game version of a quiz.")}</p>

        <h2 className="text-2xl font-black mt-10 mb-3">{t("Why families love it")}</h2>
        <ul className="space-y-2 text-white/80">
          <li>✅ {t("Everyone can join — no app to install and no account for players.")}</li>
          <li>✅ {t("Any age, any topic — from cartoons to capital cities.")}</li>
          <li>✅ {t("Play in English, Arabic or Ukrainian.")}</li>
          <li>✅ {t("It is completely free.")}</li>
          <li>✅ {t("Kind by design — questions are general-knowledge trivia, safe for all ages.")}</li>
        </ul>

        <h2 className="text-2xl font-black mt-10 mb-3">{t("How to start in a minute")}</h2>
        <ol className="space-y-2 text-white/80 list-decimal ps-5">
          <li>{t("Pick a topic — or tap a ready-made one like Animals or Movies & TV.")}</li>
          <li>{t("Get a game PIN and share it, or let everyone scan the QR code.")}</li>
          <li>{t("Everyone joins on their phone and you play together.")}</li>
        </ol>

        <div className="mt-12">
          <Link href="/fun"><Button size="lg">{t("Start a free game")}</Button></Link>
        </div>
      </div>
    </div>
  );
}
