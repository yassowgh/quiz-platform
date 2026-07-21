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

        <details className="border-2 border-gray-200 rounded-xl p-4">
          <summary className="font-bold text-gray-700 cursor-pointer">🎨 Custom branding (optional)</summary>
          <div className="flex flex-col gap-3 mt-4">
            <p className="text-sm text-gray-500">Give this quiz your own look — shown on the host screen and on players&apos; devices.</p>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-gray-700">Background colour</label>
                <input
                  type="color"
                  value={quiz.branding?.primaryColor || "#1a1a2e"}
                  onChange={(e) => setQuiz({ ...quiz, branding: { ...quiz.branding, primaryColor: e.target.value } })}
                  className="w-20 h-10 rounded border-2 border-gray-200"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-gray-700">Accent colour</label>
                <input
                  type="color"
                  value={quiz.branding?.accentColor || "#46178f"}
                  onChange={(e) => setQuiz({ ...quiz, branding: { ...quiz.branding, accentColor: e.target.value } })}
                  className="w-20 h-10 rounded border-2 border-gray-200"
                />
              </div>
              {(quiz.branding?.primaryColor || quiz.branding?.accentColor || quiz.branding?.logoUrl) && (
                <Button variant="ghost" size="sm" onClick={() => setQuiz({ ...quiz, branding: {} })}>Reset branding</Button>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-gray-700">Logo — upload or paste a URL</label>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="file"
                  accept="image/*"
                  className="text-sm"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      const img = new Image();
                      img.onload = () => {
                        const canvas = document.createElement("canvas");
                        const scale = Math.min(1, 240 / Math.max(img.width, img.height));
                        canvas.width = Math.round(img.width * scale);
                        canvas.height = Math.round(img.height * scale);
                        const c = canvas.getContext("2d");
                        if (!c) return;
                        c.drawImage(img, 0, 0, canvas.width, canvas.height);
                        setQuiz({ ...quiz, branding: { ...quiz.branding, logoUrl: canvas.toDataURL("image/png") } });
                      };
                      img.src = String(reader.result || "");
                    };
                    reader.readAsDataURL(file);
                    e.target.value = "";
                  }}
                />
                {quiz.branding?.logoUrl && (
                  <>
                    <img src={quiz.branding.logoUrl} alt="" className="h-10 rounded bg-white p-1" />
                    <button type="button" onClick={() => setQuiz({ ...quiz, branding: { ...quiz.branding, logoUrl: "" } })} className="text-red-500 font-bold text-lg">✕</button>
                  </>
                )}
              </div>
            </div>
            <div
              className="rounded-xl p-4 text-center text-white font-bold"
              style={{ background: quiz.branding?.primaryColor || "#1a1a2e" }}
            >
              {quiz.branding?.logoUrl && <img src={quiz.branding.logoUrl} alt="" className="h-8 mx-auto mb-2" />}
              Preview — this is how your game screens will look
            </div>
          </div>
        </details>
      </div>
      <QuizEditor questions={quiz.questions} onChange={(questions) => setQuiz({ ...quiz, questions })} />
    </div>
  );
}
