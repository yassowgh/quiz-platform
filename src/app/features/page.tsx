import type { Metadata } from "next";
import Link from "next/link";
import Button from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Features",
  description:
    "Every QuizUps feature, free: unlimited players, ten question types, AI question generation from a topic, document, website or video, exam mode with server-side grading, self-paced assignments, reports and CSV export.",
  alternates: { canonical: "/features" },
  openGraph: {
    title: "QuizUps Features",
    description: "Unlimited players, ten question types, AI question generation, exam mode, assignments, reports - all free.",
    url: "https://quizups.com/features",
    type: "article",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
};

type Group = { title: string; blurb: string; items: { name: string; detail: string }[] };

const GROUPS: Group[] = [
  {
    title: "Running a live game",
    blurb: "The host shares a six-digit PIN or a QR code. Players join from any browser - no account, no app.",
    items: [
      { name: "Unlimited players", detail: "No cap on how many people can join a game, on any plan, because there is only one plan." },
      { name: "Five game modes", detail: "Classic, Gold Quest, Battle Royale, Team mode and Ghost mode - the same questions, played very differently." },
      { name: "Team scoring", detail: "Players who enter the same team name share a score, so a room can compete in groups." },
      { name: "Live reactions", detail: "Players can react during a question, and the host screen shows it." },
      { name: "Podium and leaderboard", detail: "Between-question leaderboards and an end-of-game podium." },
    ],
  },
  {
    title: "Question types",
    blurb: "Ten types, all free. Mix scored questions and unscored polls in the same set.",
    items: [
      { name: "Multiple choice and true/false", detail: "Up to six options, with multi-select and partial credit." },
      { name: "Type-the-answer", detail: "Players type a response; close matches are accepted." },
      { name: "Sorting and ranking", detail: "Put items in the right order, or rank a list by preference." },
      { name: "Polls, word clouds and open responses", detail: "Unscored questions for gathering opinion - answers build a live word cloud or response wall." },
      { name: "Rating and scale", detail: "Star ratings and configurable numeric scales with your own end labels, showing a live average and distribution." },
    ],
  },
  {
    title: "Building a quiz",
    blurb: "Write questions yourself, or have them drafted for you and then edit.",
    items: [
      { name: "AI question generation", detail: "Generate questions from a topic, an uploaded document, a web page or a video - then edit anything you disagree with." },
      { name: "Interactive video quizzes", detail: "Drop a video in and pause it at chosen moments to ask about what just happened." },
      { name: "Images, audio and maths", detail: "Attach media to a question, and write formulas that render properly." },
      { name: "Custom branding", detail: "Your own logo and colours on the host screen, the player screen and the results." },
    ],
  },
  {
    title: "Beyond the live game",
    blurb: "Not everything needs everyone in the room at the same time.",
    items: [
      { name: "Self-paced assignments", detail: "Share a link; players complete it whenever they want and results collect in one place." },
      { name: "Exam mode", detail: "One attempt per person, with answers graded on the server so the correct answers never reach the browser." },
      { name: "Flashcards and study mode", detail: "Turn any question set into flashcards for revision." },
      { name: "Reports and CSV export", detail: "Per-player and per-question breakdowns after every game, exportable." },
    ],
  },
  {
    title: "Practical things",
    blurb: "The parts nobody advertises but everybody needs.",
    items: [
      { name: "English and Arabic", detail: "Full bilingual interface with real right-to-left layout, not mirrored English." },
      { name: "No account to play", detail: "Only the host signs in. Players just need the PIN." },
      { name: "No ads", detail: "None, anywhere, on any screen." },
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-[calc(100vh-64px)] bg-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <p className="text-kahoot-blue font-bold mb-2">Features</p>
        <h1 className="text-4xl font-black text-gray-900 mb-4">Everything QuizUps does</h1>
        <p className="text-lg text-gray-600 mb-10">
          All of it is free. There is no paid tier holding back the good parts, no player cap to grow out
          of, and nothing here that becomes a subscription later.
        </p>

        {GROUPS.map((g) => (
          <div key={g.title} className="mb-10">
            <h2 className="text-2xl font-black text-gray-900 mb-1">{g.title}</h2>
            <p className="text-gray-500 mb-4">{g.blurb}</p>
            <div className="rounded-2xl border-2 border-gray-100 overflow-hidden">
              {g.items.map((it, i) => (
                <div key={it.name} className={i > 0 ? "border-t border-gray-100 p-4" : "p-4"}>
                  <p className="font-bold text-gray-900">{it.name}</p>
                  <p className="text-sm text-gray-600">{it.detail}</p>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="flex flex-wrap gap-3 mb-10">
          <Link href="/signup"><Button size="lg">Start free - no card needed</Button></Link>
          <Link href="/pricing"><Button size="lg" variant="secondary">What it costs</Button></Link>
        </div>

        <p className="text-sm text-gray-400 mb-2">Read more:</p>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href="/about" className="text-kahoot-blue font-semibold hover:underline">About QuizUps</Link>
          <Link href="/pricing" className="text-kahoot-blue font-semibold hover:underline">Pricing</Link>
          <Link href="/vs/kahoot" className="text-kahoot-blue font-semibold hover:underline">QuizUps vs Kahoot</Link>
        </div>
      </div>
    </div>
  );
}
