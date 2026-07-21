"use client";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import Button from "./Button";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { lang, setLang, t } = useLang();
  return (
    <nav className="bg-kahoot-purple text-white px-6 py-4 flex items-center justify-between shadow-lg">
      <Link href="/" className="text-2xl font-black tracking-tight hover:opacity-90">
        ⚡ Quizzap
      </Link>
      <div className="flex items-center gap-3">
        <button onClick={() => setLang(lang === "en" ? "ar" : "en")} className="text-sm font-bold bg-white/15 hover:bg-white/25 rounded-lg px-2 py-1" title="Language">{lang === "en" ? "🌐 عربي" : "🌐 EN"}</button>
        {user ? (
          <>
            {user.email === "yassow@gmail.com" && (
              <Link href="/admin" className="hover:underline font-bold text-yellow-300">📊 {t("reports")}</Link>
            )}
            <Link href="/dashboard" className="hover:underline font-semibold">{user.displayName || user.email}</Link>
            <Button variant="ghost" size="sm" onClick={logout}>{t("signOut")}</Button>
          </>
        ) : (
          <>
            <Link href="/login" className="hover:underline font-semibold">Log in</Link>
            <Link href="/signup"><Button size="sm" variant="secondary">Sign up</Button></Link>
          </>
        )}
      </div>
    </nav>
  );
}