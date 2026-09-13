"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { generateQuestions } from "@/lib/integrations";
import { logHandled } from "@/components/ui/ErrorReporter";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

export const TRY_DRAFT_KEY = "quizups:tryDraft";

/**
 * Build a quiz before signing up. Hosting used to require an account before
 * anyone had seen the product do anything, which is the worst possible moment
 * to ask. The draft lives in this browser until they choose to keep it.
 */
export default function TryPage() {
  const router = useRouter();
  const { t, lang } = useLang() as any;
  const { user } = useAuth();
  const [topic, setTopic] = useState("");
  const [questions, setQuestions] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const build = async () => {
    const subject = topic.trim();
    if (!subject) { setError(t("Type a topic first - anything at all.")); return; }
    setBusy(true); setError(""); setQuestions([]);
    try {
      const qs = await generateQuestions(subject, 5, lang === "ar" ? "ar" : "en", [], "");
      if (!qs.length) { setError(t("The AI came back empty. Try describing the topic differently.")); return; }
      setQuestions(qs);
    } catch (err: any) {
      logHandled("try page generate", err);
      setError(t("We could not build that one. Try again, or word the topic differently."));
    } finally {
      setBusy(false);
    }
  };

  const keep = () => {
    try {
      localStorage.setItem(TRY_DRAFT_KEY, JSON.stringify({ title: topic.trim(), questions, createdAt: Date.now() }));
    } catch (err) {
      logHandled("try page save draft", err);
    }
    router.push(user ? "/dashboard" : "/signup?next=" + encodeURIComponent("/dashboard"));
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50 px-6 py-10">
      <div className="max-w-2xl mx-auto flex flex-col gap-5">
        <div>
          <h1 className="text-3xl font-black text-gray-900">{t("Build a quiz right now")}</h1>
          <p className="text-gray-600 mt-1">
            {t("No account, no card, nothing to install. Type a topic and see what you get - keep it if you like it.")}
          </p>
        </div>

        <Card>
          <label htmlFor="try-topic" className="text-xs font-bold text-gray-400 uppercase tracking-wide">{t("What is it about?")}</label>
          <div className="flex flex-col sm:flex-row gap-2 mt-2">
            <input
              id="try-topic"
              value={topic}
              dir="auto"
              onChange={(e) => { setTopic(e.target.value); setError(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") build(); }}
              placeholder={t("The water cycle, for year 5")}
              className="flex-1 rounded-lg border-2 border-gray-200 py-2 px-3 font-semibold min-w-0 focus:outline-none focus:border-kahoot-purple"
            />
            <Button onClick={build} loading={busy} disabled={!topic.trim()}>{t("Write my questions")}</Button>
          </div>
          {error && <p className="text-red-500 text-sm mt-2 font-semibold">{error}</p>}
          {busy && <p className="text-gray-400 text-sm mt-2">{t("Writing five questions - this takes a few seconds.")}</p>}
        </Card>

        {questions.length > 0 && (
          <>
            <Card>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">{t("Your questions")}</p>
              {questions.map((q, i) => (
                <div key={q.id || i} className="py-3 border-t border-gray-100 first:border-t-0">
                  <p className="font-bold text-gray-900" dir="auto">{i + 1}. {q.text}</p>
                  <div className="grid sm:grid-cols-2 gap-1 mt-2">
                    {(q.options || []).map((o: string, oi: number) => (
                      <p key={oi} dir="auto" className={"text-sm px-2 py-1 rounded " + (oi === q.correctAnswer ? "bg-green-50 text-green-800 font-semibold" : "text-gray-600")}>
                        {o}{oi === q.correctAnswer ? " \u2713" : ""}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </Card>

            <Card className="text-center">
              <p className="font-black text-lg text-gray-900 mb-1">{t("Like it? Keep it.")}</p>
              <p className="text-gray-500 text-sm mb-4">
                {t("Create a free account and this quiz lands in your dashboard, ready to edit and host. Unlimited players, no ads, no card.")}
              </p>
              <Button size="lg" onClick={keep}>{user ? t("Save to my dashboard") : t("Save it - create my free account")}</Button>
              <p className="text-xs text-gray-400 mt-3">{t("Until you save it, this draft only exists in this browser.")}</p>
            </Card>
          </>
        )}

        <p className="text-sm text-gray-400 text-center">
          <Link href="/" className="hover:underline">{t("Back to QuizUps")}</Link>
        </p>
      </div>
    </div>
  );
}
