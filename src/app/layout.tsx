import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import Navbar from "@/components/ui/Navbar";
import { LanguageProvider } from "@/contexts/LanguageContext";

export const metadata: Metadata = {
  metadataBase: new URL("https://quizups.com"),
  icons: { icon: "/favicon.ico", apple: "/apple-icon.png" },
  title: "QuizUps — Free Kahoot Alternative | Live Multiplayer Quiz Game",
  description:
    "QuizUps is a 100% free Kahoot alternative. Host live multiplayer quizzes with unlimited players — no subscription, no player caps. Multiple choice, true/false, type-answer, sorting and polls.",
  keywords: [
    "quizups",
    "free kahoot alternative",
    "kahoot alternative",
    "live quiz game",
    "multiplayer quiz",
    "classroom quiz tool",
    "free quiz maker",
    "team trivia game",
  ],
  openGraph: {
    title: "QuizUps — Free Kahoot Alternative",
    description:
      "Host live multiplayer quizzes free forever. Unlimited players, 5 question types, images, video, music and podium celebrations.",
    type: "website",
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
      </head>
      <body className="min-h-screen bg-gray-50">
        {/* Google Tag Manager (noscript) */}
        <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-TR5PLD6K" height="0" width="0" style={{ display: "none", visibility: "hidden" }} /></noscript>
        <AuthProvider>
          <LanguageProvider>
            <Navbar />
            <main>{children}</main>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}