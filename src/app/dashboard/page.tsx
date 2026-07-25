"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { listQuizzesByHost, deleteQuiz } from "@/lib/firestore";
import { nanoid } from "@/lib/utils";
import { updateQuiz } from "@/lib/firestore";
import { sendAssignmentInvite } from "@/lib/integrations";
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
  const [assignQuiz, setAssignQuiz] = useState<any>(null);
  const [assignEmails, setAssignEmails] = useState("");
  const [assignStatus, setAssignStatus] = useState<"" | "sending" | "sent" | "err">("");

  const assignLink = assignQuiz ? (typeof window !== "undefined" ? window.location.origin : "") + "/assignment?quizId=" + assignQuiz.id : "";

  const emailAssignment = async () => {
    const list = assignEmails.split(/[,;\s]+/).map((e) => e.trim()).filter(Boolean);
    if (!list.length || !assignQuiz) return;
    setAssignStatus("sending");
    try {
      await sendAssignmentInvite({ toEmails: list, quizTitle: assignQuiz.title, link: assignLink });
      setAssignStatus("sent");
    } catch {
      setAssignStatus("err");
    }
  };

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
        creatorEmail: user.email || "",
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
        <Link href="/reports"><Button variant="secondary">📈 All Reports</Button></Link>
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
                <Link href={`/reports?quizId=${quiz.id}`}>
                  <Button size="sm" variant="secondary">📊 Analytics</Button>
                </Link>
                <Link href={`/quiz/edit?id=${quiz.id}`}>
                  <Button size="sm" variant="secondary">Edit</Button>
                </Link>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => { setAssignQuiz(quiz); setAssignEmails(""); setAssignStatus(""); }}
                  title="Share a self-paced assignment link — copy it or email it"
                >
                  📝 Assign
                </Button>
                <Button size="sm" variant="danger" onClick={() => handleDelete(quiz.id)}>Delete</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {assignQuiz && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setAssignQuiz(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-black mb-1">📝 Assign “{assignQuiz.title}”</h3>
            <p className="text-sm text-gray-500 mb-4">Players open the link and complete the quiz at their own pace. Results come back to you.</p>

            <label className="text-sm font-semibold text-gray-700">Assignment link</label>
            <div className="flex gap-2 mb-4 mt-1">
              <input readOnly value={assignLink} className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-xl text-sm text-gray-600" onFocus={(e) => e.target.select()} />
              <Button size="sm" variant="secondary" onClick={() => { navigator.clipboard?.writeText(assignLink); setCopied(assignQuiz.id); setTimeout(() => setCopied(null), 2000); }}>
                {copied === assignQuiz.id ? "✓" : "Copy"}
              </Button>
            </div>

            <label className="text-sm font-semibold text-gray-700">Or email it to players</label>
            <textarea
              value={assignEmails}
              onChange={(e) => { setAssignEmails(e.target.value); setAssignStatus(""); }}
              placeholder="Enter one or more emails, separated by commas"
              rows={2}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm mt-1"
            />
            {assignStatus === "sent" && <p className="text-kahoot-green text-sm font-semibold mt-1">✓ Invitations sent!</p>}
            {assignStatus === "err" && <p className="text-red-500 text-sm mt-1">Could not send. Check the addresses and try again.</p>}

            <div className="flex gap-2 justify-end mt-4">
              <Button variant="ghost" size="sm" onClick={() => setAssignQuiz(null)}>Close</Button>
              <Button size="sm" onClick={emailAssignment} loading={assignStatus === "sending"} disabled={!assignEmails.trim()}>Send invites</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
