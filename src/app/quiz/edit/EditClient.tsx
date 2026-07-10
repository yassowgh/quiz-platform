"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getQuiz, updateQuiz } from "@/lib/firestore";
import type { Quiz } from "@/types";
import QuizEditor from "@/components/quiz/QuizEditor";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function EditQuizPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    const id = searchParams.get("id");
    if (!id) return;
    setLoadError(null);
    getQuiz(id)
      .then((q) => {
        if (!q) setLoadError("Quiz not found.");
        else setQuiz(q);
      })
      .catch((err) => {
        console.error("Failed to load quiz:", err);
        setLoadError("Failed to load quiz. Check connection and try again.");
      });
  }, [searchParams]);

  const save = async (publish?: boolean) => {
    if (!quiz) return;
    setSaving(true);
    await updateQuiz({
      ...quiz,
      isPublished: publish !== undefined ? publish : quiz.isPublished,
      updatedAt: Date.now(),
    });
    setSaving(false);
    router.push("/dashboard");
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen text-2xl font-bold">Loading...</div>;
  if (loadError) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <p className="text-red-500 text-xl font-semibold">{loadError}</p>
      <button onClick={() => router.push("/dashboard")} className="px-4 py-2 bg-blue-600 text-white rounded font-semibold">Back to Dashboard</button>
    </div>
  );
  if (!quiz) return <div className="flex items-center justify-center min-h-screen text-2xl font-bold">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-black">Edit Quiz</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => save(false)} loading={saving}>Save Draft</Button>
          <Button onClick={() => save(true)} loading={saving}>Publish</Button>
        </div>
      </div>
      <div className="flex flex-col gap-4 mb-8">
        <Input label="Title" value={quiz.title} onChange={(e) => setQuiz({ ...quiz, title: e.target.value })} />
        <Input label="Description" value={quiz.description} onChange={(e) => setQuiz({ ...quiz, description: e.target.value })} />
      </div>
      <QuizEditor questions={quiz.questions} onChange={(questions) => setQuiz({ ...quiz, questions })} />
    </div>
  );
}
