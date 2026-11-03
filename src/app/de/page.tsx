import type { Metadata } from "next";
import LocalizedLanding from "@/components/LocalizedLanding";

export const metadata: Metadata = {
  title: { absolute: "QuizUps \u2014 Kostenlose Kahoot-Alternative | Live-Multiplayer-Quiz" },
  description: "Veranstalte kostenlos Live-Quiz, Umfragen und Pr\u00FCfungen mit unbegrenzt vielen Teilnehmern \u2014 ohne Werbung und ohne Konto zum Mitspielen. Die KI schreibt Fragen zu jedem Thema, Dokument oder Video. Kostenlose Alternative zu Kahoot und Quizizz.",
  alternates: { canonical: "/de", languages: { en: "https://quizups.com/", ar: "https://quizups.com/ar", uk: "https://quizups.com/uk", fr: "https://quizups.com/fr", de: "https://quizups.com/de", tr: "https://quizups.com/tr", "x-default": "https://quizups.com/" } },
  openGraph: {
    title: "QuizUps \u2014 Kostenlose Kahoot-Alternative | Live-Multiplayer-Quiz",
    description: "Veranstalte kostenlos Live-Quiz, Umfragen und Pr\u00FCfungen mit unbegrenzt vielen Teilnehmern \u2014 ohne Werbung und ohne Konto zum Mitspielen. Die KI schreibt Fragen zu jedem Thema, Dokument oder Video. Kostenlose Alternative zu Kahoot und Quizizz.",
    url: "https://quizups.com/de",
    type: "website",
    locale: "de_DE",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
};

export default function Page() {
  return <LocalizedLanding lang="de" />;
}
