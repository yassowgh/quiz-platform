"use client";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import Button from "./Button";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { lang, setLang, t } = useLang();
  return (
    <nav className="bg-white text-gray-800 px-3 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-y-2 shadow-sm border-b border-gray-200">
      <Link href="/" className="hover:opacity-90 shrink-0">
        <img src="/logo.png" alt="QuizUps" className="h-8 sm:h-9 w-auto" />
      </Link>
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <select
          aria-label={t("Language")}
          value={lang}
          onChange={(e) => setLang(e.target.value as any)}
          className="text-sm font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg px-2 py-1 border-0 cursor-pointer shrink-0"
        >
          <option value="en">🌐 EN</option>
          <option value="ar">🌐 عربي</option>
          <option value="uk">🌐 УКР</option>
        </select>
        {user ? (
          <>
            {["yassow@gmail.com", "yasser.ghallab@gmail.com"].includes(user.email) && (
              <Link href="/admin" className="hover:underline font-bold text-kahoot-purple shrink-0">📊 <span className="hidden sm:inline">{t("reports")}</span></Link>
            )}
            <Link href="/dashboard" className="hover:underline font-semibold text-gray-700 shrink-0">{t("Dashboard")}</Link>
            <Link href="/account" className="hover:underline font-semibold text-gray-900 truncate max-w-[7rem] sm:max-w-[14rem]">{user.displayName || user.email}</Link>
            <Button variant="ghost" size="sm" onClick={logout}>{t("signOut")}</Button>
          </>
        ) : (
          <>
            <Link href="/login" className="hover:underline font-semibold text-gray-700 shrink-0">{t("Log in")}</Link>
            <Link href="/signup" className="shrink-0"><Button size="sm" variant="secondary">{t("Sign up")}</Button></Link>
          </>
        )}
      </div>
    </nav>
  );
}