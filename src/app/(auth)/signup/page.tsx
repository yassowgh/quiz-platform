"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";

export default function SignupPage() {
  const router = useRouter();
  const { signupWithEmail, loginWithGoogle } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      await signupWithEmail(email, password, name);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally { setLoading(false); }
  };

  const handleGoogle = async () => {
    setLoading(true); setError("");
    try {
      await loginWithGoogle();
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-kahoot-dark bg-grid-pattern flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <h1 className="text-3xl font-black mb-6 text-center">Create account</h1>
        <form onSubmit={handleEmail} className="flex flex-col gap-4">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" loading={loading} className="w-full">Sign up</Button>
        </form>
        <div className="relative my-4 text-center text-gray-400">— or —</div>
        <Button variant="secondary" onClick={handleGoogle} className="w-full" disabled={loading}>
          Continue with Google
        </Button>
        <p className="mt-4 text-center text-gray-500">
          Have an account? <Link href="/login" className="text-kahoot-purple font-semibold hover:underline">Log in</Link>
        </p>
      </Card>
    </div>
  );
}