import type { Metadata } from "next";
import Link from "next/link";
import Button from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "QuizUps is free forever. Unlimited players, every question type, AI question generation, exams and reports - no subscription, no card, no player cap, no ads.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "QuizUps Pricing - Free Forever",
    description: "No subscription, no card, no player cap, no ads. Every feature is included.",
    url: "https://quizups.com/pricing",
    type: "article",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
};

const INCLUDED = [
  "Unlimited players in every game",
  "All ten question types, including polls, word clouds, ratings and scales",
  "AI question generation from a topic, document, web page or video",
  "Interactive video quizzes",
  "Exam mode with server-side grading and one attempt per person",
  "Self-paced assignments",
  "Reports and CSV export",
  "Flashcards and study mode",
  "Custom logo and colours",
  "English and Arabic, with right-to-left layout",
];

const QUESTIONS: { q: string; a: string }[] = [
  { q: "Is there a paid plan?", a: "No. There is one plan and it is free. Nothing on the feature list is reserved for a tier that does not exist." },
  { q: "Is there a limit on players?", a: "No. Other platforms cap free games at a few dozen players. QuizUps does not cap them at all." },
  { q: "Do I need a card to sign up?", a: "No. Hosting needs an account - an email address or a Google sign-in - and nothing else. Players need neither." },
  { q: "Are there ads?", a: "None. Not on the host screen, not on the player screen, not in the results." },
  { q: "Will it start charging later?", a: "There is no plan to. If that ever changed, quizzes you have already built would remain yours to export." },
];

export default function PricingPage() {
  return (
    <div className="min-h-[calc(100vh-64px)] bg-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <p className="text-kahoot-blue font-bold mb-2">Pricing</p>
        <h1 className="text-4xl font-black text-gray-900 mb-4">Free forever, and that is the whole page</h1>
        <p className="text-lg text-gray-600 mb-8">
          QuizUps has one plan. It costs nothing, it includes everything, and it does not cap how many
          people can join your game. There is no trial to run out and no card to enter.
        </p>

        <div className="rounded-2xl border-2 border-gray-100 p-6 mb-10">
          <p className="text-5xl font-black text-gray-900 mb-1">Free</p>
          <p className="text-gray-500 mb-6">per host, per month, forever</p>
          <ul className="flex flex-col gap-2 mb-6">
            {INCLUDED.map((item) => (
              <li key={item} className="flex gap-3 text-gray-700">
                <span className="text-kahoot-blue font-black">&#10003;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <Link href="/signup"><Button size="lg">Create a free account</Button></Link>
        </div>

        <h2 className="text-2xl font-black text-gray-900 mb-4">The obvious questions</h2>
        <div className="rounded-2xl border-2 border-gray-100 overflow-hidden mb-10">
          {QUESTIONS.map((item, i) => (
            <div key={item.q} className={i > 0 ? "border-t border-gray-100 p-4" : "p-4"}>
              <p className="font-bold text-gray-900">{item.q}</p>
              <p className="text-sm text-gray-600">{item.a}</p>
            </div>
          ))}
        </div>

        <p className="text-sm text-gray-400 mb-2">Read more:</p>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href="/features" className="text-kahoot-blue font-semibold hover:underline">Features</Link>
          <Link href="/about" className="text-kahoot-blue font-semibold hover:underline">About QuizUps</Link>
          <Link href="/vs/kahoot" className="text-kahoot-blue font-semibold hover:underline">QuizUps vs Kahoot</Link>
        </div>
      </div>
    </div>
  );
}
