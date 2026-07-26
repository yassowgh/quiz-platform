"use client";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import Button from "./Button";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { lang, setLang, t } = useLang();
  return (
    <nav className="bg-white text-gray-800 px-6 py-3 flex items-center justify-between shadow-sm border-b border-gray-200">
      <Link href="/" className="hover:opacity-90">
        <img src="/logo.png" alt="QuizUps" className="h-9 w-auto" />
      </Link>
      <div className="flex items-center gap-3">
        <button onClick={() => setLang(lang === "en" ? "ar" : "en")} className="text-sm font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg px-2 py-1" title="Language">{lang === "en" ? "🌐 عربي" : "🌐 EN"}</button>
        {user ? (
          <>
            {user.email === "yassow@gmail.com" && (
              <Link href="/admin" className="hover:underline font-bold text-kahoot-purple">📊 {t("reports")}</Link>
            )}
            <Link href="/dashboard" className="hover:underline font-semibold text-gray-700">{user.displayName || user.email}</Link>
            <Button variant="ghost" size="sm" onClick={logout}>{t("signOut")}</Button>
          </>
        ) : (
          <>
            <Link href="/login" className="hover:underline font-semibold text-gray-700">Log in</Link>
            <Link href="/signup"><Button size="sm" variant="secondary">Sign up</Button></Link>
          </>
        )}
      </div>
    </nav>
  );
}