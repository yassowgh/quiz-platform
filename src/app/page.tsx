"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { resolvePin } from "@/lib/firestore";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

const COMPARISON = [
  { feature: "Price", quizzap: "Free forever", kahoot: "Free tier, paid plans for most features", win: true },
  { feature: "Players per game", quizzap: "Unlimited", kahoot: "Capped on free plan", win: true },
  { feature: "Multiple choice", quizzap: true, kahoot: true, win: false },
  { feature: "True / False", quizzap: true, kahoot: true, win: false },
  { feature: "Type-the-answer", quizzap: true, kahoot: "Paid plans", win: true },
  { feature: "Sorting / ordering", quizzap: true, kahoot: "Paid plans", win: true },
  { feature: "Polls (no scoring)", quizzap: true, kahoot: "Paid plans", win: true },
  { feature: "Images in questions", quizzap: "Upload or link", kahoot: "Limited on free", win: true },
  { feature: "Video in questions", quizzap: "YouTube or MP4", kahoot: "Paid plans", win: true },
  { feature: "Bulk import (CSV)", quizzap: "Free + template", kahoot: "Paid plans", win: true },
  { feature: "QR code to join", quizzap: true, kahoot: true, win: false },
  { feature: "Music & sound effects", quizzap: true, kahoot: true, win: false },
  { feature: "Streak bonuses", quizzap: true, kahoot: true, win: false },
  { feature: "Podium celebration", quizzap: true, kahoot: true, win: false },
  { feature: "Right-to-left / Arabic", quizzap: "Automatic", kahoot: "Limited", win: true },
  { feature: "Account needed to play", quizzap: "No", kahoot: "No", win: false },
  { feature: "Ads", quizzap: "None", kahoot: "Yes on free tier", win: true },
];

function Cell({ value, highlight }: { value: boolean | string; highlight?: boolean }) {
  if (value === true) {
    return <span className={highlight ? "text-kahoot-green font-bold text-xl" : "text-white/80 text-xl"}>✓</span>;
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
            <Button variant="ghost" size="lg">Create a Quiz →</Button>
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
            <p className="text-white/70 text-sm">Multiple choice, true/false, type-the-answer, sorting, and polls — with images, video, timers and streak bonuses.</p>
          </div>
          <div className="bg-white/10 rounded-2xl p-5 text-center">
            <div className="text-4xl mb-2">📱</div>
            <h3 className="font-bold text-lg mb-1">Players join instantly</h3>
            <p className="text-white/70 text-sm">Share a PIN or scan a QR code. Any device, no app, no account, unlimited players.</p>
          </div>
          <div className="bg-white/10 rounded-2xl p-5 text-center">
            <div className="text-4xl mb-2">🏆</div>
            <h3 className="font-bold text-lg mb-1">Live scores & podium</h3>
            <p className="text-white/70 text-sm">Music, sound effects, live leaderboards, and a staged podium celebration for your top three.</p>
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="max-w-4xl mx-auto mt-16 text-white">
        <h2 className="text-3xl font-black text-center mb-2">Quizzap vs Kahoot</h2>
        <p className="text-center text-white/70 mb-8">How we compare on the things hosts actually care about.</p>

        <div className="bg-white/5 rounded-2xl overflow-hidden border border-white/10">
          <table className="w-full">
            <thead>
              <tr className="bg-white/10">
                <th className="text-left p-4 font-bold">Feature</th>
                <th className="p-4 font-black text-kahoot-yellow">⚡ Quizzap</th>
                <th className="p-4 font-semibold text-white/70">Kahoot</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row) => (
                <tr key={row.feature} className="border-t border-white/10">
                  <td className="p-4 font-semibold text-sm">{row.feature}</td>
                  <td className="p-4 text-center bg-white/5">
                    <Cell value={row.quizzap} highlight />
                  </td>
                  <td className="p-4 text-center">
                    <Cell value={row.kahoot} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-white/40 text-xs text-center mt-4">
          Comparison based on publicly advertised free-plan features. Kahoot! is a trademark of Kahoot! ASA — Quizzap is not affiliated with or endorsed by Kahoot! ASA.
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
