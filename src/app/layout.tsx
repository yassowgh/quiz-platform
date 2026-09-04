import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import Navbar from "@/components/ui/Navbar";
import { LanguageProvider } from "@/contexts/LanguageContext";
import FeedbackWidget from "@/components/ui/FeedbackWidget";

export const metadata: Metadata = {
  metadataBase: new URL("https://quizups.com"),
  icons: { icon: "/favicon.ico", apple: "/apple-icon.png" },
  title: { default: "QuizUps — Free Kahoot & Quizizz Alternative | Live Multiplayer Quiz Game", template: "%s | QuizUps" },
  description:
    "Free Kahoot & Quizizz alternative. Host live multiplayer quizzes with unlimited players — AI-generated questions, interactive video, exams and flashcards.",
  keywords: [
    "quizups",
    "free kahoot alternative",
    "kahoot alternative",
    "live quiz game",
    "multiplayer quiz",
    "classroom quiz tool",
    "free quiz maker",
    "team trivia game",
    "quizizz alternative",
    "free quizizz alternative",
    "wayground alternative",
    "blooket alternative",
    "gimkit alternative",
    "AI quiz generator",
    "interactive video quiz",
    "online exam maker",
    "flashcards maker",
    "trivia game maker",
    "quiz app for teachers",
    "live quiz for classroom",
  ],
  applicationName: "QuizUps",
  authors: [{ name: "QuizUps" }],
  creator: "QuizUps",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  twitter: { card: "summary_large_image", title: "QuizUps — Free Kahoot & Quizizz Alternative", description: "Free forever live multiplayer quizzes — unlimited players, AI questions, video quizzes, exams and more.", images: ["/og-image.png"] },
  openGraph: {
    title: "QuizUps — Free Kahoot Alternative",
    description:
      "Host live multiplayer quizzes free forever. Unlimited players, 5 question types, images, video, music and podium celebrations.",
    type: "website",
    url: "https://quizups.com",
    siteName: "QuizUps",
    locale: "en_US",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "QuizUps — Free Kahoot & Quizizz Alternative" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Google Tag Manager */}
        <script dangerouslySetInnerHTML={{ __html: "(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-TR5PLD6K');" }} />
        <script
          dangerouslySetInnerHTML={{
            __html:
              "if(location.hostname==='www.quizups.com'||/quiz-platform-e46ba\\.(web\\.app|firebaseapp\\.com)$/.test(location.hostname)){location.replace('https://quizups.com'+location.pathname+location.search+location.hash);}",
          }}
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap"
          rel="stylesheet"
        />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([{ "@context": "https://schema.org", "@type": "WebSite", name: "QuizUps", url: "https://quizups.com" }, { "@context": "https://schema.org", "@type": "Organization", name: "QuizUps", alternateName: ["QuizUps", "Quiz Ups"], url: "https://quizups.com", logo: "https://quizups.com/logo-full.png", disambiguatingDescription: "QuizUps (quizups.com) is an independent free live quiz and survey platform. It is not affiliated with the former QuizUp trivia app, which shut down in 2021 - they are unrelated companies." }, { "@context": "https://schema.org", "@type": "SoftwareApplication", name: "QuizUps", applicationCategory: "EducationalApplication", operatingSystem: "Web", description: "Free live multiplayer quiz platform — a free Kahoot and Quizizz alternative with unlimited players, AI question generation, interactive video quizzes and exams.", url: "https://quizups.com", offers: { "@type": "Offer", price: "0", priceCurrency: "USD" } }, { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: [{ "@type": "Question", name: "Is QuizUps the same as QuizUp?", acceptedAnswer: { "@type": "Answer", text: "No. QuizUps (quizups.com) is an independent, free live quiz and survey platform. It is not the former QuizUp trivia app, which closed in 2021 - the two are unrelated companies." } }, { "@type": "Question", name: "Is QuizUps free?", acceptedAnswer: { "@type": "Answer", text: "Yes. QuizUps is free forever, with unlimited players and no account required to play." } }, { "@type": "Question", name: "What is QuizUps a free alternative to?", acceptedAnswer: { "@type": "Answer", text: "QuizUps is a free alternative to Kahoot, Quizizz, Blooket, Gimkit, Padlet and Mentimeter." } }] }]) }} />
      </head>
      <body className="min-h-screen bg-gray-50">
        {/* Google Tag Manager (noscript) */}
        <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-TR5PLD6K" height="0" width="0" style={{ display: "none", visibility: "hidden" }} /></noscript>
        <AuthProvider>
          <LanguageProvider>
            <Navbar />
            <main>{children}</main>
            <FeedbackWidget />
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}