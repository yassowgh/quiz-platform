"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { listQuizzesByHost, deleteQuiz } from "@/lib/firestore";
import { nanoid } from "@/lib/utils";
import { updateQuiz } from "@/lib/firestore";
import { makeBlankQuestion } from "@/lib/firestore";
import type { Quiz } from "@/types";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [fetching, setFetching] = useState(true);
  const [createError, setCreateError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    listQuizzesByHost(user.uid)
      .then((q) => { setQuizzes(q); setFetching(false); })
      .catch((err) => { console.error("Failed to load quizzes:", err); setFetching(false); });
  }, [user]);

  const createQuiz = async () => {
    if (!user) return;
    setCreateError(null);
    try {
      const newQuiz: Quiz = {
        id: nanoid(),
        hostId: user.uid,
        title: "Untitled Quiz",
        description: "",
        questions: [makeBlankQuestion()],
        isPublished: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await updateQuiz(newQuiz);
      router.push(`/quiz/edit?id=${newQuiz.id}`);
    } catch (err: any) {
      console.error("Failed to create quiz:", err);
      setCreateError(err?.message ?? "Failed to create quiz. Please try again.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this quiz?")) return;
    await deleteQuiz(id);
    setQuizzes((prev) => prev.filter((q) => q.id !== id));
  };

  if (loading || fetching) return <div className="flex items-center justify-center min-h-screen text-2xl font-bold">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-black">My Quizzes</h1>
        <Button onClick={createQuiz}>+ New Quiz</Button>
        <Link href="/reports"><Button variant="ghost">📈 Reports</Button></Link>
      </div>
      {createError && <p className="text-red-500 mb-4 font-semibold">{createError}</p>}
      {quizzes.length === 0 ? (
        <Card className="text-center py-16">
          <p className="text-gray-400 text-xl mb-4">No quizzes yet</p>
          <Button onClick={createQuiz}>Create your first quiz</Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {quizzes.map((quiz) => (
            <Card key={quiz.id} className="flex items-center gap-4">
              <div className="flex-1">
                <h2 className="text-xl font-bold">{quiz.title}</h2>
                <p className="text-gray-500">{quiz.questions.length} questions · {quiz.isPublished ? "Published" : "Draft"}</p>
              </div>
              <div className="flex gap-2">
                <Link href={`/game/lobby?quizId=${quiz.id}`}>
                  <Button size="sm">Host</Button>
                </Link>
                <Link href={`/quiz/edit?id=${quiz.id}`}>
                  <Button size="sm" variant="secondary">Edit</Button>
                </Link>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const url = window.location.origin + "/assignment?quizId=" + quiz.id;
                    navigator.clipboard?.writeText(url);
                    setCopied(quiz.id);
                    setTimeout(() => setCopied(null), 2000);
                  }}
                  title="Copy a self-paced assignment link players can do any time"
                >
                  {copied === quiz.id ? "✓ Copied!" : "📝 Assign"}
                </Button>
                <Button size="sm" variant="danger" onClick={() => handleDelete(quiz.id)}>Delete</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
