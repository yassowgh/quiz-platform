"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { updateProfile } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { updateUserCrm, getUserProfile } from "@/lib/firestore";
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
    </div>
  );
}
