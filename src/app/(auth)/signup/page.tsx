"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { recordReferral } from "@/lib/firestore";
import { friendlyAuthError, isEmailInUse } from "@/lib/authErrors";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";
import { useLang } from "@/contexts/LanguageContext";

export default function SignupPage() {
  const router = useRouter();
  // A referral code travels on the link and has to survive the Google popup.
  const [refCode] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      const fromUrl = new URLSearchParams(window.location.search).get("ref") || "";
      if (fromUrl) { try { sessionStorage.setItem("refCode", fromUrl); } catch (e) {} return fromUrl; }
      return sessionStorage.getItem("refCode") || "";
    } catch (e) {
      return "";
    }
  });

  // Keep the invite destination across signing up.
  // Read once, on the first client render. useSearchParams() would need a
  // Suspense boundary that a static export cannot prerender without.
  const [nextPath] = useState(() => {
    if (typeof window === "undefined") return "/dashboard";
    try {
      const n = new URLSearchParams(window.location.search).get("next") || "";
      return n.startsWith("/") && !n.startsWith("//") ? n : "/dashboard";
    } catch (e) {
      return "/dashboard";
    }
  });
  const { t } = useLang();
  const { user, signupWithEmail, loginWithGoogle, resetPassword } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [emailInUse, setEmailInUse] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agree, setAgree] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [consentError, setConsentError] = useState(false);
  useEffect(() => { if (user) router.replace("/dashboard"); }, [user, router]);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agree) { setConsentError(true); setError(t("Please accept the marketing & analytics consent below to sign up.")); return; }
    setLoading(true); setError(""); setNotice(""); setEmailInUse(false);
    try {
      await signupWithEmail(email, password, name);
      if (refCode) {
        try {
          const u = (await import("@/lib/firebase")).auth.currentUser;
          if (u) await recordReferral(u.uid, u.email || email, refCode, !!u.emailVerified);
          try { sessionStorage.removeItem("refCode"); } catch (e) {}
        } catch (e) { /* the account exists either way */ }
      }
      router.push(nextPath);
    } catch (err: unknown) {
      setError(friendlyAuthError(err));
      if (isEmailInUse(err)) setEmailInUse(true);
    } finally { setLoading(false); }
  };

  const handleGoogle = async () => {
        setLoading(true); setError(""); setNotice("");
    try {
      await loginWithGoogle();
      if (refCode) {
        try {
          const u = (await import("@/lib/firebase")).auth.currentUser;
          if (u) await recordReferral(u.uid, u.email || "", refCode, !!u.emailVerified);
          try { sessionStorage.removeItem("refCode"); } catch (e) {}
        } catch (e) { /* the account exists either way */ }
      }
      router.push(nextPath);
    } catch (err: unknown) {
      setError(friendlyAuthError(err));
    } finally { setLoading(false); }
  };

  const handleReset = async () => {
    setError(""); setNotice("");
    if (!email.trim()) { setError("Enter your email above first, then click reset."); return; }
    try {
      await resetPassword(email.trim());
      setNotice("Password reset email sent to " + email.trim() + ". Check your inbox (and spam folder).");
    } catch (err: unknown) {
      setError(friendlyAuthError(err));
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-kahoot-dark bg-grid-pattern flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <h1 className="text-3xl font-black mb-6 text-center">{t("Create account")}</h1>
        <form onSubmit={handleEmail} className="flex flex-col gap-4">
          <Input label={t("Name")} value={name} onChange={(e) => setName(e.target.value)} required />
          <Input label={t("Email")} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <div className="relative">
            <Input label={t("Password")} type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
            <button type="button" tabIndex={-1} onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-9 text-lg leading-none">{showPw ? "🙈" : "👁️"}</button>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          {notice && <p className="text-kahoot-green text-sm font-semibold">{notice}</p>}
          {emailInUse && (
            <div className="flex flex-wrap gap-3 text-sm">
              <Link href="/login" className="text-kahoot-purple font-bold hover:underline">{t("Log in instead →")}</Link>
              <button type="button" onClick={handleReset} className="text-kahoot-purple font-bold hover:underline">{t("Reset password")}</button>
            </div>
          )}
          <label className={"flex items-start gap-2 text-xs " + (consentError ? "text-red-400 font-semibold" : "text-gray-300")}>
            <input type="checkbox" checked={agree} onChange={(e) => { setAgree(e.target.checked); if (e.target.checked) setConsentError(false); }} required className={"mt-0.5 " + (consentError ? "ring-2 ring-red-400 rounded" : "")} />
            <span>{t("I agree to receive marketing emails from QuizUps and accept analytics tracking.")} <span className={consentError ? "text-red-400" : "text-gray-400"}>{t("(Required)")}</span></span>
          </label>
          {consentError && <p className="text-red-400 text-xs -mt-1">{t("Please tick this box to continue.")}</p>}
          <Button type="submit" loading={loading} className="w-full">{t("Sign up")}</Button>
        </form>
        <div className="relative my-4 text-center text-gray-400">{t("— or —")}</div>
        <Button variant="secondary" onClick={handleGoogle} className="w-full" disabled={loading}>
          {t("Continue with Google")}
        </Button>
        <p className="mt-4 text-center text-gray-500">
          {t("Have an account?")} <Link href="/login" className="text-kahoot-purple font-bold hover:underline">{t("Log in")}</Link>
        </p>
      </Card>
    </div>
  );
}
