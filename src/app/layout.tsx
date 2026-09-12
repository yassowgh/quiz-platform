import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import Navbar from "@/components/ui/Navbar";
import { LanguageProvider } from "@/contexts/LanguageContext";
import FeedbackWidget from "@/components/ui/FeedbackWidget";
import ErrorBoundary, { GlobalErrorListener } from "@/components/ui/ErrorReporter";
import RouteTracker from "@/components/ui/RouteTracker";

export const metadata: Metadata = {
  metadataBase: new URL("https://quizups.com"),
  icons: { icon: "/favicon.ico", apple: "/apple-icon.png" },
  title: { default: "QuizUps — Free Kahoot & Quizizz Alternative | Live Multiplayer Quiz Game", template: "%s | QuizUps" },
  description:
    "Host live quizzes, polls and exams free — unlimited players, no account needed to play, no ads. AI writes questions from any topic, document or video. A free Kahoot and Quizizz alternative in English and Arabic.",
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
        <script dangerouslySetInnerHTML={{ __html: "(function(){if(typeof Node==='function'&&Node.prototype){var r=Node.prototype.removeChild;Node.prototype.removeChild=function(c){if(c&&c.parentNode!==this){return c;}return r.apply(this,arguments);};var i=Node.prototype.insertBefore;Node.prototype.insertBefore=function(n,ref){if(ref&&ref.parentNode!==this){return n;}return i.apply(this,arguments);};}})();" }} />
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
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([{ "@context": "https://schema.org", "@type": "WebSite", name: "QuizUps", alternateName: ["QuizUps.com", "QuizUps live quiz platform"], url: "https://quizups.com", inLanguage: ["en", "ar"], description: "Free live multiplayer quizzes, polls and exams. Unlimited players, AI question generation and interactive video quizzes - no subscription, no player caps and no ads." }, { "@context": "https://schema.org", "@type": "Organization", name: "QuizUps", alternateName: ["QuizUps", "Quiz Ups"], url: "https://quizups.com", logo: "https://quizups.com/logo-full.png", disambiguatingDescription: "QuizUps (quizups.com) is an independent free live quiz and survey platform. It is not affiliated with the former QuizUp trivia app, which shut down in 2021 - they are unrelated companies." }, { "@context": "https://schema.org", "@type": "SoftwareApplication", name: "QuizUps", applicationCategory: "EducationalApplication", operatingSystem: "Web", description: "Free live multiplayer quiz platform — a free Kahoot and Quizizz alternative with unlimited players, AI question generation, interactive video quizzes and exams.", url: "https://quizups.com", offers: { "@type": "Offer", price: "0", priceCurrency: "USD" } }, { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: [{ "@type": "Question", name: "Is QuizUps the same as QuizUp?", acceptedAnswer: { "@type": "Answer", text: "No. QuizUps (quizups.com) is an independent, free live quiz and survey platform. It is not the former QuizUp trivia app, which closed in 2021 - the two are unrelated companies." } }, { "@type": "Question", name: "Is QuizUps free?", acceptedAnswer: { "@type": "Answer", text: "Yes. QuizUps is free forever, with unlimited players and no account required to play." } }, { "@type": "Question", name: "What is QuizUps a free alternative to?", acceptedAnswer: { "@type": "Answer", text: "QuizUps is a free alternative to Kahoot, Quizizz, Blooket, Gimkit, Padlet and Mentimeter." } }] }]) }} />
      </head>
      <body className="min-h-screen bg-gray-50">
        {/* Google Tag Manager (noscript) */}
        <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-TR5PLD6K" height="0" width="0" style={{ display: "none", visibility: "hidden" }} /></noscript>
        <AuthProvider>
          <LanguageProvider>
            <Navbar />
            <ErrorBoundary><main>{children}</main></ErrorBoundary>
            <FeedbackWidget />
            <GlobalErrorListener />
            <RouteTracker />
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}