"use client";
import { useLang } from "@/contexts/LanguageContext";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { updateQuiz } from "@/lib/firestore";
import { makeBlankQuestion } from "@/lib/firestore";
import { nanoid } from "@/lib/utils";
import type { Quiz } from "@/types";
import QuizEditor from "@/components/quiz/QuizEditor";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function CreateQuizPage() {
  const { t } = useLang();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [quiz, setQuiz] = useState<Quiz>({
    id: nanoid(),
    hostId: "",
    title: "",
    description: "",
    questions: [makeBlankQuestion()],
    isPublished: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (user) setQuiz((q) => ({ ...q, hostId: user.uid }));
  }, [user, loading, router]);

  const save = async (publish = false) => {
    setSaving(true);
    await updateQuiz({ ...quiz, isPublished: publish, updatedAt: Date.now() });
    router.push("/dashboard");
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-black">{t("New Quiz")}</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => save(false)} loading={saving}>{t("Save Draft")}</Button>
          <Button onClick={() => save(true)} loading={saving}>{t("Publish")}</Button>
        </div>
      </div>
      <div className="flex flex-col gap-4 mb-8">
        <Input label={t("Title")} value={quiz.title} onChange={(e) => setQuiz({ ...quiz, title: e.target.value })} placeholder={t("My Awesome Quiz")} />
        <Input label={t("Description")} value={quiz.description} onChange={(e) => setQuiz({ ...quiz, description: e.target.value })} placeholder={t("What's this quiz about?")} />
      </div>
      <QuizEditor questions={quiz.questions} onChange={(questions) => setQuiz({ ...quiz, questions })} />
    </div>
  );
}