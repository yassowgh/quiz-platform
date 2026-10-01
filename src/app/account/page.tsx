"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { updateProfile, deleteUser } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { updateUserCrm, getUserProfile, listQuizzesByHost, deleteQuiz, deleteUserDoc, logAccountDeletion } from "@/lib/firestore";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function AccountPage() {
  const { user, loading } = useAuth();
  const { t } = useLang();
  const router = useRouter();
  const [name, setName] = useState("");
  const [profile, setProfile] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [delStep, setDelStep] = useState(0);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { if (!loading && !user) router.push("/login"); }, [user, loading, router]);
  useEffect(() => {
    if (!user) return;
    setName(user.displayName || "");
    getUserProfile(user.uid).then((p) => setProfile(p || {})).catch(() => {});
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true); setMsg("");
    try {
      if (auth.currentUser) await updateProfile(auth.currentUser, { displayName: name.trim() });
      await updateUserCrm(user.uid, { displayName: name.trim() });
      setMsg(t("Saved! Your name updates across the app after your next refresh."));
    } catch (e: any) { setMsg(t("Could not save: ") + (e && e.message ? e.message : e)); }
    setSaving(false);
  };

  const performDelete = async () => {
    if (!user || !auth.currentUser) return;
    setDeleting(true); setMsg("");
    try {
      const quizzes = await listQuizzesByHost(user.uid).catch(() => [] as any[]);
      await logAccountDeletion({ uid: user.uid, email: user.email || "", displayName: user.displayName || "", quizzesDeleted: quizzes.length, memberSince: profile && profile.createdAt ? profile.createdAt : null });
      for (const q of quizzes) { try { await deleteQuiz((q as any).id); } catch (e) {} }
      try { await deleteUserDoc(user.uid); } catch (e) {}
      await deleteUser(auth.currentUser);
      router.push("/");
    } catch (e: any) {
      if (e && e.code === "auth/requires-recent-login") {
        setMsg(t("For your security, please sign out and sign in again, then delete your account."));
      } else {
        setMsg(t("Could not delete your account. Please try again.") + " " + (e && e.message ? e.message : ""));
      }
      setDeleting(false); setDelStep(0); setConfirmText("");
    }
  };

  if (loading || !user) return <div className="flex items-center justify-center min-h-[60vh] text-xl font-bold text-gray-400">{t("Loading…")}</div>;

  return (
    <div className="max-w-lg mx-auto p-6">
      <h1 className="text-3xl font-black mb-1">{t("My Account")}</h1>
      <p className="text-gray-400 mb-6">{t("View and update your account details.")}</p>
      {msg && <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-semibold">{msg}</div>}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col gap-4">
        <Input label={t("Display name")} value={name} onChange={(e) => setName(e.target.value)} placeholder={t("Your name")} />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-gray-700">{t("Email")}</label>
          <input value={user.email || ""} readOnly className="px-3 py-2 rounded-xl border border-gray-100 bg-gray-50 text-gray-500" />
          <span className="text-xs text-gray-400">{t("Email and password are managed by your sign-in provider and cannot be changed here.")}</span>
        </div>
        <div className="text-sm text-gray-500">
          {t("Member since")}: <span className="font-semibold text-gray-700">{profile && profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "—"}</span>
        </div>
        <div className="flex gap-2">
          <Button onClick={save} loading={saving}>{t("Save changes")}</Button>
          <Button variant="secondary" onClick={() => router.push("/dashboard")}>{t("Back to dashboard")}</Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border-2 border-red-200 p-5 mt-6">
        <h2 className="text-lg font-black text-red-700 mb-1">{t("Delete account")}</h2>
        <p className="text-sm text-gray-500 mb-4">{t("Permanently delete your account, your quizzes, and your data. This cannot be undone.")}</p>
        <Button variant="danger" onClick={() => { setDelStep(1); setConfirmText(""); }}>{t("Delete my account")}</Button>
      </div>

      {delStep > 0 && (
        <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            {delStep === 1 && (
              <>
                <h3 className="text-xl font-black text-red-700 mb-2">{t("Delete your account?")}</h3>
                <p className="text-sm text-gray-600 mb-5">{t("This permanently deletes your account and all of your quizzes, polls, and reports. This cannot be undone.")}</p>
                <div className="flex gap-2 justify-end">
                  <Button variant="secondary" onClick={() => setDelStep(0)}>{t("Cancel")}</Button>
                  <Button variant="danger" onClick={() => setDelStep(2)}>{t("Continue")}</Button>
                </div>
              </>
            )}
            {delStep === 2 && (
              <>
                <h3 className="text-xl font-black text-red-700 mb-2">{t("Are you absolutely sure?")}</h3>
                <p className="text-sm text-gray-600 mb-5">{t("There is no way to recover your account once it is deleted. All your content will be gone forever.")}</p>
                <div className="flex gap-2 justify-end">
                  <Button variant="secondary" onClick={() => setDelStep(0)}>{t("Cancel")}</Button>
                  <Button variant="danger" onClick={() => setDelStep(3)}>{t("Continue")}</Button>
                </div>
              </>
            )}
            {delStep === 3 && (
              <>
                <h3 className="text-xl font-black text-red-700 mb-2">{t("Final confirmation")}</h3>
                <p className="text-sm text-gray-600 mb-3">{t("Type DELETE below to permanently delete your account.")}</p>
                <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="DELETE" className="w-full mb-4 px-3 py-2 rounded-xl border-2 border-red-200 focus:outline-none focus:border-red-500" />
                <div className="flex gap-2 justify-end">
                  <Button variant="secondary" onClick={() => { setDelStep(0); setConfirmText(""); }}>{t("Cancel")}</Button>
                  <Button variant="danger" loading={deleting} disabled={confirmText.trim().toUpperCase() !== "DELETE"} onClick={performDelete}>{t("Delete account permanently")}</Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
