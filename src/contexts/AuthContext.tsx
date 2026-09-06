"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User,
  updateProfile,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { createUserProfile, getUserProfile } from "@/lib/firestore";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signupWithEmail: (email: string, password: string, name: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        try {
          const prof = await getUserProfile(u.uid);
          if (prof && prof.disabled === true) {
            await signOut(auth);
            setUser(null);
            setLoading(false);
            return;
          }
        } catch (e) {}
      }
      setUser(u); try { if (typeof window !== "undefined") (window as any).__userEmail = u.email || undefined; } catch (e) {};
      setLoading(false);
    });
    return unsub;
  }, []);

  const loginWithEmail = async (email: string, password: string) => {
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    await createUserProfile(user.uid, user.email!, user.displayName || "User", { marketing: true, analytics: true });
  };

  const signupWithEmail = async (email: string, password: string, name: string) => {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(user, { displayName: name });
    await createUserProfile(user.uid, email, name, { marketing: true, analytics: true });
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const { user } = await signInWithPopup(auth, provider);
    await createUserProfile(user.uid, user.email!, user.displayName || "User");
  };

  const logout = async () => {
    await signOut(auth);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithEmail, signupWithEmail, loginWithGoogle, logout, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}