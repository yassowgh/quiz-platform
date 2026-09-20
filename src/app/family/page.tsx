import type { Metadata } from "next";
import FamilyClient from "./FamilyClient";

export const metadata: Metadata = {
  title: "Family trivia games — free, instant, any topic | QuizUps",
  description:
    "Free family trivia games everyone can play together on any phone. Any topic, no account for players, in English, Arabic or Ukrainian.",
  alternates: { canonical: "/family" },
  openGraph: {
    title: "Family trivia games | QuizUps",
    description: "Free, instant trivia the whole family can play together.",
    url: "https://quizups.com/family",
    type: "website",
  },
};

export default function FamilyPage() {
  return <FamilyClient />;
}
