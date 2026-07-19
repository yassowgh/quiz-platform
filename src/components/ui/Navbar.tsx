"use client";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import Button from "./Button";

export default function Navbar() {
  const { user, logout } = useAuth();
  return (
    <nav className="bg-kahoot-purple text-white px-6 py-4 flex items-center justify-between shadow-lg">
      <Link href="/" className="text-2xl font-black tracking-tight hover:opacity-90">
        🎮 Kahoot Alternative
      </Link>
      <div className="flex items-center gap-3">
        {user ? (
          <>
            <Link href="/dashboard" className="hover:underline font-semibold">{user.displayName || user.email}</Link>
            <Button variant="ghost" size="sm" onClick={logout}>Sign out</Button>
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