"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { resolvePin } from "@/lib/firestore";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

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
      router.push(`/join?gameId=${gameId}&pin=${pin}`);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-kahoot-dark bg-grid-pattern flex flex-col items-center justify-center p-6">
      <div className="text-center mb-10">
        <h1 className="text-6xl font-black text-white mb-3">Kahoot Alternative</h1>
        <p className="text-white/70 text-xl">Real-time multiplayer quizzes</p>
      </div>

      <form onSubmit={handleJoin} className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-md">
        <h2 className="text-2xl font-black text-center mb-6 text-gray-900">Enter Game PIN</h2>
        <div className="flex flex-col gap-4">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            placeholder="123456"
            className="text-center text-4xl font-black tracking-widest border-b-4 border-kahoot-purple py-4 focus:outline-none w-full"
          />
          {error && <p className="text-red-500 text-center font-semibold">{error}</p>}
          <Button type="submit" size="lg" loading={loading} className="w-full">
            Enter
          </Button>
        </div>
      </form>

      <div className="mt-10 text-center">
        <p className="text-white/60 mb-3">Want to host a quiz?</p>
        <a href="/dashboard">
          <Button variant="ghost" size="lg">Create a Quiz →</Button>
        </a>
      </div>

      <section className="w-full max-w-4xl mx-auto mt-16 text-white pb-16">
        <h2 className="text-3xl font-black text-center mb-2">The free Kahoot alternative</h2>
        <p className="text-center text-white/70 mb-8 text-lg">
          Host live multiplayer quizzes with your class, team, or friends — 100% free, forever. No subscriptions, no player limits, no catch.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white/10 rounded-2xl p-5 text-center">
            <div className="text-4xl mb-2">🎯</div>
            <h3 className="font-bold text-lg mb-1">Create quizzes in minutes</h3>
            <p className="text-white/70 text-sm">Multiple choice, true/false, and type-answer questions — with images, timers, points, and streak bonuses.</p>
          </div>
          <div className="bg-white/10 rounded-2xl p-5 text-center">
            <div className="text-4xl mb-2">📱</div>
            <h3 className="font-bold text-lg mb-1">Players join instantly</h3>
            <p className="text-white/70 text-sm">Share a PIN or QR code. Players join from any device — no app and no account needed.</p>
          </div>
          <div className="bg-white/10 rounded-2xl p-5 text-center">
            <div className="text-4xl mb-2">🏆</div>
            <h3 className="font-bold text-lg mb-1">Live scores & podium</h3>
            <p className="text-white/70 text-sm">Music, sound effects, live leaderboards, and a celebration podium for your winners.</p>
          </div>
        </div>
        <p className="text-center text-kahoot-yellow font-bold text-xl mt-8">✨ Totally free — sign up and start hosting today!</p>
      </section>
    </div>
  );
}