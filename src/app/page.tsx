"use client";
import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { resolvePin } from "@/lib/firestore";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

type Row = {
  feature: string;
  quizzap: boolean | string;
  kahoot: boolean | string;
  kahootPaid?: boolean;
};

const SECTIONS: { title: string; rows: Row[] }[] = [
  {
    title: "Pricing & limits",
    rows: [
      { feature: "Price for full feature set", quizzap: "Free forever", kahoot: "Paid subscription", kahootPaid: true },
      { feature: "Players per game", quizzap: "Unlimited", kahoot: "Capped on free plan", kahootPaid: true },
      { feature: "Ads", quizzap: "None", kahoot: "Yes on free tier" },
      { feature: "Account needed to play", quizzap: "No", kahoot: "No" },
    ],
  },
  {
    title: "Question types",
    rows: [
      { feature: "Multiple choice", quizzap: true, kahoot: true },
      { feature: "True / False", quizzap: true, kahoot: true },
      { feature: "Type-the-answer", quizzap: true, kahoot: "Paid plan", kahootPaid: true },
      { feature: "Sorting / ordering", quizzap: true, kahoot: "Paid plan", kahootPaid: true },
      { feature: "Polls (no scoring)", quizzap: true, kahoot: "Paid plan", kahootPaid: true },
      { feature: "Multi-select answers", quizzap: "Free, partial credit", kahoot: "Paid plan", kahootPaid: true },
      { feature: "5–6 answer options", quizzap: true, kahoot: "Paid plan", kahootPaid: true },
    ],
  },
  {
    title: "Media in questions",
    rows: [
      { feature: "Images", quizzap: "Upload or link", kahoot: "Limited on free", kahootPaid: true },
      { feature: "Video", quizzap: "YouTube or MP4", kahoot: "Paid plan", kahootPaid: true },
      { feature: "Audio clips", quizzap: "Upload or link", kahoot: "Paid plan", kahootPaid: true },
      { feature: "Time limit up to 4 minutes", quizzap: true, kahoot: true },
    ],
  },
  {
    title: "Hosting & game modes",
    rows: [
      { feature: "Live hosted games", quizzap: true, kahoot: true },
      { feature: "Team mode (pooled scores)", quizzap: true, kahoot: true },
      { feature: "Ghost mode (race past scores)", quizzap: true, kahoot: true },
      { feature: "Self-paced assignments", quizzap: true, kahoot: true },
      { feature: "QR code to join", quizzap: true, kahoot: true },
      { feature: "Music & sound effects", quizzap: true, kahoot: true },
      { feature: "Streak bonuses", quizzap: true, kahoot: true },
      { feature: "Podium celebration", quizzap: true, kahoot: true },
    ],
  },
  {
    title: "Authoring & admin",
    rows: [
      { feature: "Bulk import (CSV) + template", quizzap: true, kahoot: "Paid plan", kahootPaid: true },
      { feature: "Detailed post-game reports", quizzap: "Free + CSV export", kahoot: "Full reports paid", kahootPaid: true },
      { feature: "Custom branding (colours + logo)", quizzap: true, kahoot: "Paid plan", kahootPaid: true },
      { feature: "Arabic / right-to-left interface", quizzap: "Full RTL + translated UI", kahoot: "Partial" },
    ],
  },
];

const PAID_COUNT = SECTIONS.reduce((n, s) => n + s.rows.filter((r) => r.kahootPaid).length, 0);

function Cell({ value, highlight, paid }: { value: boolean | string; highlight?: boolean; paid?: boolean }) {
  if (value === true) {
    return <span className={highlight ? "text-kahoot-green font-bold text-xl" : "text-white/80 text-xl"}>✓</span>;
  }
  if (paid) {
    return (
      <span className="inline-flex items-center gap-1 text-amber-300 font-semibold text-xs bg-amber-400/10 border border-amber-400/30 rounded-full px-2 py-1">
        💰 {value}
      </span>
    );
  }
  return (
    <span className={highlight ? "text-white font-semibold text-sm" : "text-white/60 text-sm"}>{value}</span>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 6) { setError("Enter a 6-digit game PIN"); return; }
    setLoading(true);
    setError("");
    try {
      const gameId = await resolvePin(pin.trim());
      if (!gameId) { setError("Game not found. Check your PIN."); return; }
      router.push("/join?gameId=" + gameId);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-kahoot-dark bg-grid-pattern px-6 py-12">
      {/* Hero + join */}
      <div className="max-w-md mx-auto text-center">
        <h1 className="text-6xl font-black text-white mb-2">⚡ Quizzap</h1>
        <p className="text-white/70 text-xl mb-1">Live multiplayer quizzes</p>
        <p className="text-kahoot-yellow font-bold mb-8">The free Kahoot alternative</p>

        <form onSubmit={handleJoin}>
          <div className="flex flex-col gap-3">
            <Input
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              className="text-center text-3xl font-black tracking-widest"
            />
            {error && <p className="text-red-400 font-semibold text-sm">{error}</p>}
            <Button type="submit" size="lg" loading={loading} className="w-full">
              Enter
            </Button>
          </div>
        </form>

        <div className="mt-8">
          <p className="text-white/60 mb-3">Want to host a quiz?</p>
          <a href="/dashboard">
            <Button variant="secondary" size="lg">Create a Quiz →</Button>
          </a>
        </div>
      </div>

      {/* Why Quizzap */}
      <section className="max-w-4xl mx-auto mt-20 text-white">
        <h2 className="text-3xl font-black text-center mb-2">Everything you need — nothing locked away</h2>
        <p className="text-center text-white/70 mb-8 text-lg">
          Quizzap gives you the features other quiz platforms charge for. No subscriptions, no player limits, no ads.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white/10 rounded-2xl p-5 text-center">
            <div className="text-4xl mb-2">🎯</div>
            <h3 className="font-bold text-lg mb-1">5 question types</h3>
            <p className="text-white/70 text-sm">Multiple choice, true/false, type-the-answer, sorting and polls — with multi-select, up to 6 options, images, video and audio.</p>
          </div>
          <div className="bg-white/10 rounded-2xl p-5 text-center">
            <div className="text-4xl mb-2">📱</div>
            <h3 className="font-bold text-lg mb-1">Play live or self-paced</h3>
            <p className="text-white/70 text-sm">Host live with a PIN or QR code, pool scores in team mode, or send a self-paced assignment link. Unlimited players.</p>
          </div>
          <div className="bg-white/10 rounded-2xl p-5 text-center">
            <div className="text-4xl mb-2">🏆</div>
            <h3 className="font-bold text-lg mb-1">Reports & branding</h3>
            <p className="text-white/70 text-sm">Per-question accuracy reports with CSV export, your own colours and logo, and a full Arabic / RTL interface.</p>
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="max-w-4xl mx-auto mt-16 text-white">
        <h2 className="text-3xl font-black text-center mb-2">Quizzap vs Kahoot</h2>
        <p className="text-center text-white/70 mb-8">
          How we compare on the things hosts actually care about. Items marked 💰 require a paid Kahoot plan.
        </p>

        <div className="bg-white/5 rounded-2xl overflow-hidden border border-white/10">
          <table className="w-full">
            <thead>
              <tr className="bg-white/10">
                <th className="text-left p-4 font-bold">Feature</th>
                <th className="p-4 font-black text-kahoot-yellow whitespace-nowrap">⚡ Quizzap</th>
                <th className="p-4 font-semibold text-white/70">Kahoot</th>
              </tr>
            </thead>
            <tbody>
              {SECTIONS.map((section) => (
                <Fragment key={section.title}>
                  <tr className="bg-white/[0.07]">
                    <td colSpan={3} className="px-4 py-2 text-xs font-black uppercase tracking-wider text-white/50">
                      {section.title}
                    </td>
                  </tr>
                  {section.rows.map((row) => (
                    <tr key={row.feature} className="border-t border-white/10">
                      <td className="p-4 font-semibold text-sm">{row.feature}</td>
                      <td className="p-4 text-center bg-white/5">
                        <Cell value={row.quizzap} highlight />
                      </td>
                      <td className="p-4 text-center">
                        <Cell value={row.kahoot} paid={row.kahootPaid} />
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 bg-amber-400/10 border border-amber-400/30 rounded-2xl p-5 text-center">
          <p className="text-amber-300 font-bold text-lg mb-1">
            💰 {PAID_COUNT} features that cost money on Kahoot are free on Quizzap
          </p>
          <p className="text-white/60 text-sm">
            Everything marked 💰 above sits behind a paid Kahoot subscription or is capped on their free plan. On Quizzap it is included at no cost.
          </p>
        </div>

        <p className="text-white/40 text-xs text-center mt-4">
          Comparison based on Kahoot&apos;s publicly documented plan features as of July 2026; their plans and limits may change. Kahoot! is a trademark of Kahoot! ASA — Quizzap is not affiliated with or endorsed by Kahoot! ASA.
        </p>

        <div className="text-center mt-10 pb-8">
          <p className="text-kahoot-yellow font-bold text-2xl mb-4">✨ Totally free — start hosting in under a minute</p>
          <a href="/signup">
            <Button size="lg">Get started free →</Button>
          </a>
        </div>
      </section>
    </div>
  );
}
