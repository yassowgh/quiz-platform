"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { ensureReferralCode, listMyReferrals, REFERRALS_FOR_REWARD, AI_QUESTIONS_DEFAULT, AI_QUESTIONS_REWARD } from "@/lib/firestore";
import { logHandled } from "@/components/ui/ErrorReporter";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

export default function ReferPage() {
  const router = useRouter();
  const { t } = useLang();
  const { user, loading } = useAuth();
  const [code, setCode] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [busy, setBusy] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      const back = typeof window !== "undefined" ? window.location.pathname : "/refer";
      router.push("/login?next=" + encodeURIComponent(back));
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    let live = true;
    (async () => {
      try {
        const c = await ensureReferralCode(user.uid);
        const r = await listMyReferrals(user.uid);
        if (!live) return;
        setCode(c);
        setRows(r);
      } catch (err) {
        logHandled("referral page", err);
      } finally {
        if (live) setBusy(false);
      }
    })();
    return () => { live = false; };
  }, [user]);

  const origin = typeof window !== "undefined" ? window.location.origin : "https://quizups.com";
  const link = code ? origin + "/signup?ref=" + code : "";
  const joined = rows.length;
  const verified = rows.filter((r) => r.verified).length;
  const unlocked = verified >= REFERRALS_FOR_REWARD;
  const remaining = Math.max(0, REFERRALS_FOR_REWARD - verified);

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch (err) { logHandled("copy referral link", err); }
  };

  const shareText = t("I have been using QuizUps to run live quizzes - unlimited players, free, no ads. Worth a look:") + " " + link;

  if (loading || !user) return <div className="flex items-center justify-center min-h-screen text-2xl font-bold">{t("Loading...")}</div>;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50 px-6 py-10">
      <div className="max-w-2xl mx-auto flex flex-col gap-5">
        <div>
          <Link href="/dashboard" className="text-kahoot-blue font-semibold text-sm hover:underline">&larr; {t("Back to dashboard")}</Link>
          <h1 className="text-3xl font-black text-gray-900 mt-2">{t("Know five people who would use this?")}</h1>
          <p className="text-gray-600 mt-1">
            {t("Share your link. When five of them sign up and confirm their email address, your AI question generator goes from")}{" "}
            <strong>{AI_QUESTIONS_DEFAULT}</strong> {t("questions per go to")} <strong>{AI_QUESTIONS_REWARD}</strong>
            {" "}&mdash; {t("enough to draft a whole exam in one click. Free, like everything else here.")}
          </p>
        </div>

        <Card>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">{t("Your link")}</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              id="refer-link"
              readOnly
              value={busy ? t("Loading...") : link}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 rounded-lg border-2 border-gray-200 py-2 px-3 font-mono text-sm text-gray-700 min-w-0"
            />
            <Button size="sm" onClick={copy} disabled={!link}>{copied ? t("Copied") : t("Copy")}</Button>
          </div>
          <div className="flex flex-wrap gap-3 mt-3 text-sm font-semibold">
            <a className="text-kahoot-blue hover:underline" target="_blank" rel="noopener noreferrer"
               href={"https://wa.me/?text=" + encodeURIComponent(shareText)}>{t("Share on WhatsApp")}</a>
            <a className="text-kahoot-blue hover:underline" target="_blank" rel="noopener noreferrer"
               href={"mailto:?subject=" + encodeURIComponent(t("You should try QuizUps")) + "&body=" + encodeURIComponent(shareText)}>{t("Share by email")}</a>
          </div>
        </Card>

        <Card>
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">{t("Progress")}</p>
            <p className="font-black text-gray-900">{verified} / {REFERRALS_FOR_REWARD}</p>
          </div>
          <div className="flex gap-1.5 mb-3">
            {Array.from({ length: REFERRALS_FOR_REWARD }).map((_, i) => (
              <div key={i} className={"h-2.5 flex-1 rounded-full " + (i < verified ? "bg-kahoot-blue" : "bg-gray-200")} />
            ))}
          </div>
          {unlocked ? (
            <p className="text-green-600 font-bold">{t("Unlocked - the AI will now draft up to")} {AI_QUESTIONS_REWARD} {t("questions at a time.")}</p>
          ) : (
            <p className="text-gray-600">
              {joined === 0
                ? t("Nobody has joined through your link yet.")
                : joined + " " + t("signed up so far.") + " " + verified + " " + t("confirmed their email.")}
              {" "}<strong>{remaining}</strong> {t("more confirmed sign-ups to go.")}
            </p>
          )}
          {joined > verified && (
            <p className="text-xs text-gray-400 mt-2">
              {t("Sign-ups only count once the person clicks the confirmation link in their email.")}
            </p>
          )}
        </Card>

        {rows.length > 0 && (
          <Card>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">{t("Who joined")}</p>
            {rows.map((r) => (
              <div key={r.refereeUid} className="flex items-center justify-between gap-3 py-2 border-t border-gray-50 first:border-t-0">
                <span className="text-gray-800 truncate">{r.refereeEmail || t("A new host")}</span>
                <span className={"text-xs font-bold shrink-0 " + (r.verified ? "text-green-600" : "text-amber-600")}>
                  {r.verified ? t("Confirmed") : t("Waiting on email")}
                </span>
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}
