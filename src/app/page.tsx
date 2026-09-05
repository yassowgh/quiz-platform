"use client";
import { Fragment, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { resolvePin, getHomeContent, saveHomeContent } from "@/lib/firestore";
import Button from "@/components/ui/Button";
import { useLang } from "@/contexts/LanguageContext";
import Input from "@/components/ui/Input";

type Row = {
  feature: string;
  quizups: boolean | string;
  kahoot: boolean | string;
  kahootPaid?: boolean;
};

const SECTIONS: { title: string; rows: Row[] }[] = [
  {
    title: "Pricing & limits",
    rows: [
      { feature: "Price for full feature set", quizups: "Free forever", kahoot: "Paid subscription", kahootPaid: true },
      { feature: "Players per game", quizups: "Unlimited", kahoot: "Capped on free plan", kahootPaid: true },
      { feature: "Ads", quizups: "None", kahoot: "Yes on free tier" },
      { feature: "Account needed to play", quizups: "No", kahoot: "No" },
    ],
  },
  {
    title: "Question types",
    rows: [
      { feature: "Multiple choice", quizups: true, kahoot: true },
      { feature: "True / False", quizups: true, kahoot: true },
      { feature: "Type-the-answer", quizups: true, kahoot: "Paid plan", kahootPaid: true },
      { feature: "Sorting / ordering", quizups: true, kahoot: "Paid plan", kahootPaid: true },
      { feature: "Polls (no scoring)", quizups: true, kahoot: "Paid plan", kahootPaid: true },
      { feature: "Multi-select answers", quizups: "Free, partial credit", kahoot: "Paid plan", kahootPaid: true },
      { feature: "5–6 answer options", quizups: true, kahoot: "Paid plan", kahootPaid: true },
    ],
  },
  {
    title: "Media in questions",
    rows: [
      { feature: "Images", quizups: "Upload or link", kahoot: "Limited on free", kahootPaid: true },
      { feature: "Video", quizups: "YouTube or MP4", kahoot: "Paid plan", kahootPaid: true },
      { feature: "Audio clips", quizups: "Upload or link", kahoot: "Paid plan", kahootPaid: true },
      { feature: "Time limit up to 4 minutes", quizups: true, kahoot: true },
    ],
  },
  {
    title: "Hosting & game modes",
    rows: [
      { feature: "Live hosted games", quizups: true, kahoot: true },
      { feature: "Team mode (pooled scores)", quizups: true, kahoot: true },
      { feature: "Ghost mode (race past scores)", quizups: true, kahoot: true },
      { feature: "Self-paced assignments", quizups: true, kahoot: true },
      { feature: "QR code to join", quizups: true, kahoot: true },
      { feature: "Music & sound effects", quizups: true, kahoot: true },
      { feature: "Streak bonuses", quizups: true, kahoot: true },
      { feature: "Podium celebration", quizups: true, kahoot: true },
    ],
  },
  {
    title: "Authoring & admin",
    rows: [
      { feature: "Bulk import (CSV) + template", quizups: true, kahoot: "Paid plan", kahootPaid: true },
      { feature: "Detailed post-game reports", quizups: "Free + CSV export", kahoot: "Full reports paid", kahootPaid: true },
      { feature: "Custom branding (colours + logo)", quizups: true, kahoot: "Paid plan", kahootPaid: true },
      { feature: "Arabic / right-to-left interface", quizups: "Full RTL + translated UI", kahoot: "Partial" },
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
  const { lang } = useLang();
  const isAr = lang === "ar";
  const { user } = useAuth();
  const isAdmin = !!user?.email && ["yassow@gmail.com", "yasser.ghallab@gmail.com"].includes(user.email);
  const [home, setHome] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  useEffect(() => { getHomeContent().then(setHome).catch(() => {}); }, []);
  const line1 = home.heroLine1 ?? "Live multiplayer quizzes";
  const line2 = home.heroLine2 ?? "The free Kahoot alternative";
  const startEdit = () => { setDraft({ heroLine1: line1, heroLine2: line2 }); setEditing(true); };
  const saveEdit = async () => { await saveHomeContent(draft); setHome({ ...home, ...draft }); setEditing(false); };

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
        <img src="/logo-full.png" alt="QuizUps" className="w-60 mx-auto mb-3" />
        <h1 className="sr-only">QuizUps — Free Kahoot & Quizizz Alternative | Live Multiplayer Quiz Game</h1>
        <p className="text-white/70 text-xl mb-1">{line1}</p>
        <p className="text-kahoot-yellow font-bold mb-8">{line2}</p>
        {isAdmin && !editing && (
          <button onClick={startEdit} className="text-white/50 hover:text-white text-xs underline mb-4">✏️ Edit page text</button>
        )}
        {isAdmin && editing && (
          <div className="bg-white/10 rounded-2xl p-4 mb-6 text-left flex flex-col gap-2">
            <label className="text-white/80 text-sm font-semibold">Line 1</label>
            <input value={draft.heroLine1 || ""} onChange={(e) => setDraft({ ...draft, heroLine1: e.target.value })} className="px-3 py-2 rounded-lg text-gray-900" />
            <label className="text-white/80 text-sm font-semibold">Line 2</label>
            <input value={draft.heroLine2 || ""} onChange={(e) => setDraft({ ...draft, heroLine2: e.target.value })} className="px-3 py-2 rounded-lg text-gray-900" />
            <div className="flex gap-2 mt-2">
              <button onClick={saveEdit} className="bg-kahoot-blue text-white font-bold px-4 py-2 rounded-lg">Save</button>
              <button onClick={() => setEditing(false)} className="bg-white/20 text-white px-4 py-2 rounded-lg">Cancel</button>
            </div>
          </div>
        )}

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

      {/* What's new (latest features) */}
      <div className="max-w-5xl mx-auto mt-16" dir={isAr ? "rtl" : "ltr"}>
        <h2 className="text-3xl font-black text-center mb-2 text-white">{isAr ? "✨ الجديد في QuizUps" : "✨ What's new in QuizUps"}</h2>
        <p className="text-center text-white/80 mb-8">{isAr ? "أحدث الإضافات — كلها مجانية." : "The latest additions — all free."}</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(isAr ? [
            ["📊", "استطلاعات وتصويت مباشر", "سحابة كلمات، مقاييس، ترتيب، وجدران إجابات مفتوحة — بأسلوب Mentimeter، ومباشرة عبر رمز QR."],
            ["🪙", "Gold Quest — رحلة الذهب", "سباق كنوز بأسلوب Blooket، حيث تربح الإجابات الصحيحة الذهب وتسرقه من الآخرين."],
            ["⚔️", "Battle Royale — المعركة", "آخر لاعب صامد يفوز — والإجابة الخاطئة تُقصيك من اللعبة."],
            ["🎵", "أصوات ومنصة تتويج", "موسيقى مع كل سؤال، ومؤثرات صوتية للإجابات، ومنصة احتفال للفائزين."],
            ["🛟", "ذكاء اصطناعي دائم", "توليد الأسئلة يعمل بموثوقية عبر Gemini ثم Groq ثم OpenRouter."],
            ["💬", "ملاحظاتك من داخل المنصة", "شاركنا رأيك من زر الملاحظات المتاح في أي صفحة."],
          ] : [
            ["📊", "Live polls & surveys", "Word clouds, scales, ranking and open-ended walls — Mentimeter-style, live with a QR code."],
            ["🪙", "Gold Quest", "A Blooket-style treasure race where answers earn (and steal) gold."],
            ["⚔️", "Battle Royale", "Last player standing — wrong answers eliminate you."],
            ["🎵", "Sounds & podium", "Music per question, answer sound effects and a celebration podium."],
            ["🛟", "Always-on AI", "Questions generate reliably via Gemini → Groq → OpenRouter fallbacks."],
            ["💬", "Feedback built in", "Tell us what you think from the widget on any page."],
          ]).map(([icon, title, desc]) => (
            <div key={title} className="bg-white/10 rounded-2xl p-5 text-center">
              <div className="text-4xl mb-2">{icon}</div>
              <h3 className="font-bold text-lg mb-1 text-white">{title}</h3>
              <p className="text-white/75 text-sm">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {Array.isArray((home as any).blocks) && (home as any).blocks.length > 0 && (
        <div className="max-w-3xl mx-auto mt-16 space-y-4">
          {(home as any).blocks.map((b: any, idx: number) => (
            <div key={b.id || idx} className="bg-white/10 rounded-2xl p-6 text-white/90 [&_h2]:text-2xl [&_h2]:font-black [&_h2]:mb-2 [&_a]:text-kahoot-yellow [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5" dangerouslySetInnerHTML={{ __html: b.html || "" }} />
          ))}
        </div>
      )}

      {/* Why QuizUps */}
      <section className="max-w-4xl mx-auto mt-20 text-white">
        <h2 className="text-3xl font-black text-center mb-2">Everything you need — nothing locked away</h2>
        <p className="text-center text-white/70 mb-8 text-lg">
          QuizUps gives you the features other quiz platforms charge for. No subscriptions, no player limits, no ads.
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
        <h2 className="text-3xl font-black text-center mb-2">QuizUps vs Kahoot</h2>
        <p className="text-center text-white/70 mb-8">
          How we compare on the things hosts actually care about. Items marked 💰 require a paid Kahoot plan.
        </p>

        <div className="bg-white/5 rounded-2xl overflow-hidden border border-white/10">
          <table className="w-full">
            <thead>
              <tr className="bg-white/10">
                <th className="text-left p-4 font-bold">Feature</th>
                <th className="p-4 font-black text-kahoot-yellow whitespace-nowrap">⚡ QuizUps</th>
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
                        <Cell value={row.quizups} highlight />
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
            💰 {PAID_COUNT} features that cost money on Kahoot are free on QuizUps
          </p>
          <p className="text-white/60 text-sm">
            Everything marked 💰 above sits behind a paid Kahoot subscription or is capped on their free plan. On QuizUps it is included at no cost.
          </p>
        </div>

        <p className="text-white/40 text-xs text-center mt-4">
          Comparison based on Kahoot&apos;s publicly documented plan features as of July 2026; their plans and limits may change. Kahoot! is a trademark of Kahoot! ASA — QuizUps is not affiliated with or endorsed by Kahoot! ASA.
        </p>

        <div className="text-center mt-10 pb-8">
          <p className="text-kahoot-yellow font-bold text-2xl mb-4">✨ Totally free — start hosting in under a minute</p>
          <a href="/signup">
            <Button size="lg">Get started free →</Button>
          </a>
        </div>
              <div className="text-center mt-8 pb-10 border-t border-white/10 pt-6">
          <p className="text-white/50 text-sm mb-3">Compare QuizUps with other quiz apps:</p>
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-kahoot-yellow font-semibold text-sm">
            <a href="/vs/kahoot" className="hover:underline">vs Kahoot</a>
            <a href="/vs/quizizz" className="hover:underline">vs Quizizz</a>
            <a href="/vs/blooket" className="hover:underline">vs Blooket</a>
            <a href="/vs/gimkit" className="hover:underline">vs Gimkit</a>
          </div>
        </div>
      </section>
    </div>
  );
}
