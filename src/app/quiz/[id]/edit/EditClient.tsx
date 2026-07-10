"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getQuiz, updateQuiz } from "@/lib/firestore";
import type { Quiz } from "@/types";
import QuizEditor from "@/components/quiz/QuizEditor";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";


export default function EditQuizPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading } = useAuth();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!params.id) return;
    getQuiz(params.id as string).then(setQuiz);
  }, [params.id]);

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