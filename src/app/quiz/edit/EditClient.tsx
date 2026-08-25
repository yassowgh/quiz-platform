"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getQuiz, updateQuiz, saveExamPublic } from "@/lib/firestore";
import { sealExam } from "@/lib/integrations";
import VideoQuizEditor from "@/components/quiz/VideoQuizEditor";
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
    if (publish && !quiz.title.trim()) { alert("Please give your quiz a title before publishing."); return; }
    let questions = quiz.questions;
    if (publish) {
      questions = quiz.questions.filter(
        (qq) => qq.type === "typeanswer" || qq.type === "wordcloud" || qq.type === "openended" || qq.type === "rating" || (qq.options || []).some((o) => o && o.trim())
      );
      if (!questions.length) {
        alert("Add at least one answerable question (with options, or a type-answer) before publishing.");
        return;
      }
    }
    setSaving(true);
    await updateQuiz({
      ...quiz,
      questions,
      creatorEmail: quiz.creatorEmail || user?.email || "",
      isPublished: publish !== undefined ? publish : quiz.isPublished,
      updatedAt: Date.now(),
    });
    if (quiz.examMode && (publish !== undefined ? publish : quiz.isPublished)) {
      const items = questions.map((qq: any) => ({
        id: qq.id,
        type: qq.type || "multiple",
        points: qq.points || 0,
        correct:
          qq.type === "typeanswer"
            ? [String(qq.correctText || "")]
            : qq.multiSelect && qq.correctAnswers?.length
            ? qq.correctAnswers.map((i: number) => qq.options?.[i])
            : [qq.options?.[Number(qq.correctAnswer ?? 0)]],
      }));
      const sealed = await sealExam(items);
      const strip = (qq: any) => { const s: any = { ...qq }; delete s.correctAnswer; delete s.correctAnswers; delete s.correctText; return s; };
      await saveExamPublic(quiz.id, {
        hostId: quiz.hostId,
        title: quiz.title,
        description: quiz.description || "",
        questions: sealed ? questions.map(strip) : questions,
        examMode: true,
        examSeal: sealed || null,
        branding: quiz.branding || null,
        language: quiz.language || "en",
        allowAssignment: true,
        creatorEmail: quiz.creatorEmail || user?.email || "",
        updatedAt: Date.now(),
      });
    }
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
        <h1 className="text-3xl font-black">{quiz.kind === "poll" ? "Edit Poll" : "Edit Quiz"}</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => save(false)} loading={saving}>Save Draft</Button>
          <Button onClick={() => save(true)} loading={saving}>Publish</Button>
        </div>
      </div>
      <div className="flex flex-col gap-4 mb-8">
        <Input label="Title" value={quiz.title} onChange={(e) => setQuiz({ ...quiz, title: e.target.value })} placeholder="Name your quiz…" />
        <Input label="Description" value={quiz.description} onChange={(e) => setQuiz({ ...quiz, description: e.target.value })} />
        {quiz.kind === "poll" && (
          <p className="text-sm bg-kahoot-purple/10 text-kahoot-purple rounded-xl p-3 font-semibold">📊 This is a poll / survey. Scroll down and use each question&apos;s type menu to add a Poll, ☁️ Word cloud, ⭐ Rating, or 💬 Open-ended slide — then Host it like a normal game.</p>
        )}
        {quiz.kind === "poll" && (
          <div className="flex flex-col gap-2 mb-2">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Poll settings</p>
            <label className="flex items-start gap-3 border-2 border-gray-200 rounded-xl p-3 cursor-pointer"><input type="checkbox" checked={!!quiz.pollWaitLobby} onChange={(ev) => setQuiz({ ...quiz, pollWaitLobby: ev.target.checked })} className="mt-1 w-5 h-5" /><span><span className="font-bold text-gray-800 block">⏳ Wait for attendees before starting</span><span className="text-gray-500 text-sm">Off = go live instantly. On = show a join screen (QR) first, then you press Start.</span></span></label>
            <label className="flex items-start gap-3 border-2 border-gray-200 rounded-xl p-3 cursor-pointer"><input type="checkbox" checked={!!quiz.requireName} onChange={(ev) => setQuiz({ ...quiz, requireName: ev.target.checked })} className="mt-1 w-5 h-5" /><span><span className="font-bold text-gray-800 block">🙋 Ask participants for a name</span><span className="text-gray-500 text-sm">Off = anonymous (auto nickname, no prompt).</span></span></label>
            <label className="flex items-start gap-3 border-2 border-gray-200 rounded-xl p-3 cursor-pointer"><input type="checkbox" checked={!!quiz.pollTimer} onChange={(ev) => setQuiz({ ...quiz, pollTimer: ev.target.checked })} className="mt-1 w-5 h-5" /><span><span className="font-bold text-gray-800 block">⏱️ Use a countdown timer</span><span className="text-gray-500 text-sm">Off = open time (you advance each slide with a Next button).</span></span></label>
          </div>
        )}

        {quiz.kind !== "poll" && (<>
        <label className="flex items-start gap-3 border-2 border-gray-200 rounded-xl p-4 cursor-pointer">
          <input type="checkbox" checked={!!quiz.examMode} onChange={(ev) => setQuiz({ ...quiz, examMode: ev.target.checked })} className="mt-1 w-5 h-5" />
          <span>
            <span className="font-bold text-gray-700">📝 Exam mode</span>
            <span className="block text-sm text-gray-500">Randomises question &amp; answer order per student, requires sign-in, allows only one attempt, and (once the exam worker is set up) grades on the server so answers stay hidden.</span>
          </span>
        </label>
        <VideoQuizEditor quiz={quiz} onChange={setQuiz} />
        <label className="flex items-start gap-3 border-2 border-gray-200 rounded-xl p-4 cursor-pointer">
          <input type="checkbox" checked={!!quiz.adaptive} onChange={(ev) => setQuiz({ ...quiz, adaptive: ev.target.checked })} className="mt-1 w-5 h-5" />
          <span>
            <span className="font-bold text-gray-700">📊 Adaptive difficulty</span>
            <span className="block text-sm text-gray-500">In assignments, questions are ordered easy → hard using each question’s Difficulty (set under a question’s Advanced options).</span>
          </span>
        </label>
        </>)}
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
            <div className="select-none">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Live preview</p>
              <div
                className="rounded-xl p-5 text-center pointer-events-none border border-black/10"
                style={{ background: quiz.branding?.primaryColor || "#1a1a2e" }}
              >
                {quiz.branding?.logoUrl && <img src={quiz.branding.logoUrl} alt="" className="h-10 mx-auto mb-3" />}
                <p className="text-white font-black text-lg mb-3">Sample question goes here?</p>
                <div className="grid grid-cols-2 gap-2">
                  {["bg-kahoot-red", "bg-kahoot-blue", "bg-kahoot-yellow", "bg-kahoot-green"].map((bg, i) => (
                    <div
                      key={i}
                      className={bg + " rounded-lg py-2 text-white text-sm font-bold"}
                      style={i === 0 && quiz.branding?.accentColor ? { background: quiz.branding.accentColor } : undefined}
                    >
                      Answer {i + 1}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </details>
      </div>
      <QuizEditor questions={quiz.questions} kind={quiz.kind} onChange={(questions) => setQuiz({ ...quiz, questions })} />
      <div className="flex gap-2 justify-end mt-8 pt-6 border-t border-gray-200">
        <Button variant="secondary" onClick={() => save(false)} loading={saving}>Save Draft</Button>
        <Button onClick={() => save(true)} loading={saving}>Publish</Button>
      </div>
    </div>
  );
}
