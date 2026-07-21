import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import Navbar from "@/components/ui/Navbar";

export const metadata: Metadata = {
  title: "Quizzap — Free Kahoot Alternative | Live Multiplayer Quiz Game",
  description:
    "Quizzap is a 100% free Kahoot alternative. Host live multiplayer quizzes with unlimited players — no subscription, no player caps. Multiple choice, true/false, type-answer, sorting and polls.",
  keywords: [
    "quizzap",
    "free kahoot alternative",
    "kahoot alternative",
    "live quiz game",
    "multiplayer quiz",
    "classroom quiz tool",
    "free quiz maker",
    "team trivia game",
  ],
  openGraph: {
    title: "Quizzap — Free Kahoot Alternative",
    description:
      "Host live multiplayer quizzes free forever. Unlimited players, 5 question types, images, video, music and podium celebrations.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-gray-50">
        <AuthProvider>
          <Navbar />
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}