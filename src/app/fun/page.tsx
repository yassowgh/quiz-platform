import { Suspense } from "react";
import type { Metadata } from "next";
import FunClient from "./FunClient";

export const metadata: Metadata = {
  title: "Just for Fun — instant trivia with friends",
  description:
    "Pick any topic, get a game code, and play live trivia with your friends in about a minute. Free, no account needed, English, Arabic or Ukrainian.",
  alternates: { canonical: "/fun" },
  openGraph: {
    title: "Just for Fun — instant trivia with friends | QuizUps",
    description: "Any topic, a code to share, and you are playing. Free and no account needed.",
    url: "https://quizups.com/fun",
    type: "website",
  },
};

export default function FunPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-gray-500 font-bold">Loading...</div>}>
      <FunClient />
    </Suspense>
  );
}
