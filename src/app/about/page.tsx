import type { Metadata } from "next";
import Link from "next/link";
import Button from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "About QuizUps",
  description:
    "QuizUps is an independent, free live quiz and poll platform. No subscription, no player caps, no ads. Here is what it is, who it is for, and why it is free.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About QuizUps",
    description: "An independent, free live quiz and poll platform - no subscription, no player caps, no ads.",
    url: "https://quizups.com/about",
    type: "article",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
};

export default function AboutPage() {
  return (
    <div className="min-h-[calc(100vh-64px)] bg-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <p className="text-kahoot-blue font-bold mb-2">About</p>
        <h1 className="text-4xl font-black text-gray-900 mb-4">What QuizUps is</h1>
        <p className="text-lg text-gray-600 mb-8">
          QuizUps is a free platform for running live quizzes, polls and exams. A host builds a set of
          questions and starts a game; everyone else joins from their phone with a PIN or a QR code and
          answers in real time. It runs in a browser, on any device, with no app to install.
        </p>

        <h2 className="text-2xl font-black text-gray-900 mb-2">Who it is for</h2>
        <p className="text-gray-600 mb-6">
          Teachers running a review session before an exam. Trainers checking whether a room full of new
          hires actually absorbed the morning. Conference hosts putting a live poll on the big screen.
          Anyone who wants a pub quiz without a spreadsheet. The same tool covers a graded exam and a
          silly icebreaker - what changes is which mode you pick.
        </p>

        <h2 className="text-2xl font-black text-gray-900 mb-2">Why it is free</h2>
        <p className="text-gray-600 mb-6">
          Most quiz platforms put the useful parts behind a subscription: more than a handful of players,
          the interesting question types, reports, your own logo. QuizUps has no paid tier to protect, so
          none of that is locked. There are no ads either - a quiz interrupted by an advert is a worse quiz.
        </p>

        <h2 className="text-2xl font-black text-gray-900 mb-2">Two languages, properly</h2>
        <p className="text-gray-600 mb-6">
          The whole interface runs in English and Arabic, with genuine right-to-left layout rather than
          mirrored English. Questions, answers, the join screen and the results all follow.
        </p>

        <h2 className="text-2xl font-black text-gray-900 mb-2">Not the old QuizUp</h2>
        <p className="text-gray-600 mb-8">
          QuizUps (quizups.com) is sometimes confused with QuizUp, the mobile trivia app that shut down in
          2021. They are unrelated - different people, different product, different company. QuizUps is an
          independent project with no connection to it.
        </p>

        <div className="flex flex-wrap gap-3 mb-10">
          <Link href="/signup"><Button size="lg">Start free - no card needed</Button></Link>
          <Link href="/features"><Button size="lg" variant="secondary">See every feature</Button></Link>
        </div>

        <p className="text-sm text-gray-400 mb-2">Read more:</p>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href="/features" className="text-kahoot-blue font-semibold hover:underline">Features</Link>
          <Link href="/pricing" className="text-kahoot-blue font-semibold hover:underline">Pricing</Link>
          <Link href="/vs/kahoot" className="text-kahoot-blue font-semibold hover:underline">QuizUps vs Kahoot</Link>
        </div>
      </div>
    </div>
  );
}
