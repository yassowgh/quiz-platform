import type { Metadata } from "next";
import LocalizedLanding from "@/components/LocalizedLanding";

export const metadata: Metadata = {
  title: { absolute: "QuizUps \u2014 \u00DCcretsiz Kahoot Alternatifi | Canl\u0131 \u00C7ok Oyunculu Test Oyunu" },
  description: "S\u0131n\u0131rs\u0131z oyuncuyla \u00FCcretsiz canl\u0131 testler, anketler ve s\u0131navlar d\u00FCzenleyin \u2014 reklams\u0131z ve oynamak i\u00E7in hesap gerekmeden. Yapay zek\u00E2 herhangi bir konudan, belgeden veya videodan sorular yazar. \u00DCcretsiz Kahoot ve Quizizz alternatifi.",
  alternates: { canonical: "/tr", languages: { en: "https://quizups.com/", ar: "https://quizups.com/ar", uk: "https://quizups.com/uk", fr: "https://quizups.com/fr", de: "https://quizups.com/de", tr: "https://quizups.com/tr", "x-default": "https://quizups.com/" } },
  openGraph: {
    title: "QuizUps \u2014 \u00DCcretsiz Kahoot Alternatifi | Canl\u0131 \u00C7ok Oyunculu Test Oyunu",
    description: "S\u0131n\u0131rs\u0131z oyuncuyla \u00FCcretsiz canl\u0131 testler, anketler ve s\u0131navlar d\u00FCzenleyin \u2014 reklams\u0131z ve oynamak i\u00E7in hesap gerekmeden. Yapay zek\u00E2 herhangi bir konudan, belgeden veya videodan sorular yazar. \u00DCcretsiz Kahoot ve Quizizz alternatifi.",
    url: "https://quizups.com/tr",
    type: "website",
    locale: "tr_TR",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
};

export default function Page() {
  return <LocalizedLanding lang="tr" />;
}
