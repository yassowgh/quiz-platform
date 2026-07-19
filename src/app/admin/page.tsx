"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { listAllUsers, listAllQuizzes } from "@/lib/firestore";
import Card from "@/components/ui/Card";

const ADMIN_EMAIL = "yassow@gmail.com";

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push("/login"); return; }
    if (user.email !== ADMIN_EMAIL) { router.push("/dashboard"); return; }
    Promise.all([listAllUsers(), listAllQuizzes()])
      .then(([u, q]) => { setUsers(u); setQuizzes(q); })
      .catch((e) => setError("Failed to load reports: " + String(e?.message || e)))
      .finally(() => setFetching(false));
  }, [user, loading, router]);

  if (loading || fetching) {
    return <div className="p-10 text-center text-xl font-bold text-gray-500">Loading reports...</div>;
  }
  if (error) {
    return <div className="p-10 text-center text-red-500 font-semibold">{error}</div>;
  }

  const byHost: Record<string, number> = {};
  quizzes.forEach((q: any) => { byHost[q.hostId] = (byHost[q.hostId] || 0) + 1; });
  const totalQuestions = quizzes.reduce((sum: number, q: any) => sum + (q.questions?.length || 0), 0);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-black mb-6">📊 Admin Reports</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="text-center">
          <p className="text-4xl font-black text-kahoot-purple">{users.length}</p>
          <p className="text-gray-500 font-semibold">Users</p>
        </Card>
        <Card className="text-center">
          <p className="text-4xl font-black text-kahoot-purple">{quizzes.length}</p>
          <p className="text-gray-500 font-semibold">Quizzes</p>
        </Card>
        <Card className="text-center">
          <p className="text-4xl font-black text-kahoot-purple">{totalQuestions}</p>
          <p className="text-gray-500 font-semibold">Questions</p>
        </Card>
        <Card className="text-center">
          <p className="text-4xl font-black text-kahoot-purple">{users.length ? (quizzes.length / users.length).toFixed(1) : "0"}</p>
          <p className="text-gray-500 font-semibold">Quizzes / User</p>
        </Card>
      </div>
      <Card>
        <h2 className="text-xl font-bold mb-4">Quizzes per user</h2>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b-2 border-gray-200 text-gray-500 text-sm">
              <th className="py-2">Name</th>
              <th>Email</th>
              <th>Joined</th>
              <th className="text-right">Quizzes</th>
            </tr>
          </thead>
          <tbody>
            {users
              .slice()
              .sort((a: any, b: any) => (byHost[b.uid] || 0) - (byHost[a.uid] || 0))
              .map((u: any) => (
                <tr key={u.uid} className="border-b border-gray-100">
                  <td className="py-2 font-semibold">{u.displayName || "—"}</td>
                  <td className="text-gray-500">{u.email}</td>
                  <td className="text-gray-400 text-sm">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}</td>
                  <td className="text-right font-black">{byHost[u.uid] || 0}</td>
                </tr>
              ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <p className="text-gray-400 text-center py-4">No users yet. User profiles are created on signup/login.</p>
        )}
      </Card>
    </div>
  );
}
