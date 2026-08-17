import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Button from "@/components/ui/Button";

type Row = { feature: string; quizups: string; them: string };
type Comp = { name: string; blurb: string; intro: string; rows: Row[]; verdict: string };

const QUIZUPS: Record<string, string> = {
  price: "Free forever — no subscription",
  players: "Unlimited players, free",
  ai: "Free (from a topic, document, website or video)",
  video: "Yes — interactive video quizzes, free",
  exam: "Yes — exam mode with server-side grading, free",
  types: "MC, true/false, type-answer, sorting, poll",
  assign: "Yes — self-paced assignments, free",
  reports: "Yes — reports + CSV, free",
  flashcards: "Yes — free study mode",
  branding: "Yes — custom colours & logo",
  ads: "None",
};

const FEATURES: { key: string; label: string }[] = [
  { key: "price", label: "Price for full features" },
  { key: "players", label: "Players per game" },
  { key: "ai", label: "AI question generation" },
  { key: "video", label: "Interactive video quizzes" },
  { key: "exam", label: "Exams / secure grading" },
  { key: "types", label: "Question types" },
  { key: "assign", label: "Self-paced assignments" },
  { key: "reports", label: "Reports & CSV export" },
  { key: "flashcards", label: "Flashcards / study mode" },
  { key: "branding", label: "Custom branding" },
  { key: "ads", label: "Ads" },
];

const THEM: Record<string, Record<string, string>> = {
  kahoot: {
    price: "Paid subscription for full features",
    players: "Capped on the free plan",
    ai: "Paid / limited on free",
    video: "Paid plans",
    exam: "Limited",
    types: "Fewer on free plan",
    assign: "Yes",
    reports: "Full reports on paid",
    flashcards: "Limited",
    branding: "Paid",
    ads: "Upsells",
  },
  quizizz: {
    price: "Free tier + paid plans",
    players: "Limits on free plan",
    ai: "Yes (varies by plan)",
    video: "Yes (interactive video)",
    exam: "Yes",
    types: "Many",
    assign: "Yes",
    reports: "Yes (some paid)",
    flashcards: "Yes",
    branding: "Paid",
    ads: "Some",
  },
  blooket: {
    price: "Free tier + Blooket Plus (paid)",
    players: "Limits on free plan",
    ai: "Limited",
    video: "No",
    exam: "No",
    types: "Limited",
    assign: "Yes (homework)",
    reports: "Basic (more on paid)",
    flashcards: "Study sets",
    branding: "Limited",
    ads: "Some",
  },
  gimkit: {
    price: "Limited free, then paid (per-seat)",
    players: "Limits on free plan",
    ai: "Limited",
    video: "No",
    exam: "No",
    types: "Limited",
    assign: "Yes (KitCollab / homework)",
    reports: "Yes",
    flashcards: "Flashcards mode",
    branding: "Limited",
    ads: "None",
  },
};

const DATA: Record<string, Comp> = {
  kahoot: {
    name: "Kahoot",
    blurb: "the classic live quiz game",
    intro:
      "Kahoot popularised the live quiz game, but the features teachers and teams actually want — more players, richer question types, reports and branding — sit behind paid plans. QuizUps gives you all of it free, with unlimited players.",
    rows: [],
    verdict:
      "If you love the Kahoot format but not the paywall or player caps, QuizUps is a free, feature-complete alternative.",
  },
  quizizz: {
    name: "Quizizz (Wayground)",
    blurb: "gamified quizzes & lessons",
    intro:
      "Quizizz (now Wayground) is a polished, gamified platform — but the best pieces are spread across paid tiers. QuizUps matches the core experience (live games, self-paced assignments, AI generation, interactive video) and keeps it free.",
    rows: [],
    verdict:
      "For a free Quizizz/Wayground alternative with unlimited players and AI + video quizzes included, QuizUps is a strong fit.",
  },
  blooket: {
    name: "Blooket",
    blurb: "game-show style review",
    intro:
      "Blooket is fun for game-show style review, but it's light on question types, has no exam/video features, and gates extras behind Blooket Plus. QuizUps offers a broader toolkit — live games, exams, video quizzes and AI — free.",
    rows: [],
    verdict:
      "If you want Blooket's fun plus real quiz/exam features without a paywall, QuizUps is a free alternative worth trying.",
  },
  gimkit: {
    name: "Gimkit",
    blurb: "money-earning quiz game",
    intro:
      "Gimkit's earn-and-upgrade gameplay is engaging, but free use is limited and full access is paid per seat. QuizUps is free forever with unlimited players, AI generation, exams and interactive video quizzes.",
    rows: [],
    verdict:
      "For a free Gimkit alternative that removes the game caps and adds AI + exam features, give QuizUps a try.",
  },
};

const SLUGS = Object.keys(DATA);

export function generateStaticParams() {
  return SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: any }): Promise<Metadata> {
  const { slug } = await params;
  const c = DATA[slug];
  if (!c) return {};
  const title = "QuizUps vs " + c.name + " — Free Alternative";
  const description =
    "A free " + c.name + " alternative — 100% free with unlimited players, AI questions, interactive video and exams. See how QuizUps compares, feature by feature.";
  return {
    title,
    description,
    alternates: { canonical: "/vs/" + slug },
    openGraph: { title, description, url: "https://quizups.com/vs/" + slug, type: "article", images: [{ url: "/og-image.png", width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description, images: ["/og-image.png"] },
  };
}

export default async function VsPage({ params }: { params: any }) {
  const { slug } = await params;
  const c = DATA[slug];
  if (!c) notFound();
  return (
    <div className="min-h-[calc(100vh-64px)] bg-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <p className="text-kahoot-blue font-bold mb-2">Free {c.name} alternative</p>
        <h1 className="text-4xl font-black text-gray-900 mb-4">QuizUps vs {c.name}</h1>
        <p className="text-lg text-gray-600 mb-8">{c.intro}</p>

        <div className="overflow-x-auto rounded-2xl border-2 border-gray-100 mb-8">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="p-3 font-bold text-gray-700">Feature</th>
                <th className="p-3 font-bold text-kahoot-blue">QuizUps</th>
                <th className="p-3 font-bold text-gray-700">{c.name}</th>
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((f) => (
                <tr key={f.key} className="border-t border-gray-100">
                  <td className="p-3 font-semibold text-gray-700">{f.label}</td>
                  <td className="p-3 text-gray-900">{QUIZUPS[f.key]}</td>
                  <td className="p-3 text-gray-500">{(THEM[slug] || {})[f.key] || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="text-2xl font-black text-gray-900 mb-2">The verdict</h2>
        <p className="text-gray-600 mb-8">{c.verdict}</p>

        <div className="flex flex-wrap gap-3 mb-10">
          <Link href="/signup"><Button size="lg">Start free — no card needed</Button></Link>
          <Link href="/"><Button size="lg" variant="secondary">See all features</Button></Link>
        </div>

        <p className="text-sm text-gray-400 mb-2">Compare with others:</p>
        <div className="flex flex-wrap gap-3 text-sm">
          {SLUGS.filter((s) => s !== slug).map((s) => (
            <Link key={s} href={"/vs/" + s} className="text-kahoot-blue font-semibold hover:underline">QuizUps vs {DATA[s].name}</Link>
          ))}
        </div>

        <p className="text-xs text-gray-400 mt-10">
          Comparison is for general guidance; {c.name}&apos;s features and pricing may change — check their website for the latest.
        </p>
      </div>
    </div>
  );
}
