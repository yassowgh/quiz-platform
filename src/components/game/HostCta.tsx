"use client";
import Link from "next/link";
import { useLang } from "@/contexts/LanguageContext";

/**
 * Shown to players once the game is over. They have just experienced the
 * product and have no account - the warmest audience the site ever gets, and
 * until now it was shown nothing but a "Play again" link.
 */
export default function HostCta({ variant = "quiz" }: { variant?: "quiz" | "poll" }) {
  const { t } = useLang();
  return (
    <div className="mt-8 w-full max-w-sm rounded-2xl bg-white/10 border border-white/15 p-5">
      <p className="text-white font-black text-lg mb-1">
        {variant === "poll" ? t("Want to run your own poll?") : t("Want to run your own quiz?")}
      </p>
      <p className="text-white/70 text-sm mb-4">
        {t("Free forever, unlimited players, and the people playing never need an account. You can build one in a couple of minutes.")}
      </p>
      <Link href="/signup?src=podium" className="block w-full text-center bg-kahoot-yellow text-gray-900 font-black py-3 rounded-xl hover:brightness-105">
        {t("Make my own - free")}
      </Link>
    </div>
  );
}
