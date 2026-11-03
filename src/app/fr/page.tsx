import type { Metadata } from "next";
import LocalizedLanding from "@/components/LocalizedLanding";

export const metadata: Metadata = {
  title: { absolute: "QuizUps \u2014 Alternative gratuite \u00E0 Kahoot | Quiz multijoueurs en direct" },
  description: "Organisez gratuitement des quiz, sondages et examens en direct, avec un nombre illimit\u00E9 de joueurs \u2014 sans publicit\u00E9 et sans compte pour jouer. L'IA r\u00E9dige des questions \u00E0 partir de n'importe quel sujet, document ou vid\u00E9o. Alternative gratuite \u00E0 Kahoot et Quizizz.",
  alternates: { canonical: "/fr", languages: { en: "https://quizups.com/", ar: "https://quizups.com/ar", uk: "https://quizups.com/uk", fr: "https://quizups.com/fr", de: "https://quizups.com/de", tr: "https://quizups.com/tr", "x-default": "https://quizups.com/" } },
  openGraph: {
    title: "QuizUps \u2014 Alternative gratuite \u00E0 Kahoot | Quiz multijoueurs en direct",
    description: "Organisez gratuitement des quiz, sondages et examens en direct, avec un nombre illimit\u00E9 de joueurs \u2014 sans publicit\u00E9 et sans compte pour jouer. L'IA r\u00E9dige des questions \u00E0 partir de n'importe quel sujet, document ou vid\u00E9o. Alternative gratuite \u00E0 Kahoot et Quizizz.",
    url: "https://quizups.com/fr",
    type: "website",
    locale: "fr_FR",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
};

export default function Page() {
  return <LocalizedLanding lang="fr" />;
}
