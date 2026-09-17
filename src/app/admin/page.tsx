"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { listAllUsers, listAllQuizzes } from "@/lib/firestore";
import Card from "@/components/ui/Card";

const ADMIN_EMAILS = ["yassow@gmail.com", "yasser.ghallab@gmail.com"];

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [fetching, setFetching] = useState(true);
  const [search, setSearch] = useState("");
  const [openUid, setOpenUid] = useState<string | null>(null);
  const [openQuiz, setOpenQuiz] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push("/login"); return; }
    if (!ADMIN_EMAILS.includes(user.email)) { router.push("/dashboard"); return; }
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
  const quizzesByHost: Record<string, any[]> = {};
  quizzes.forEach((z: any) => { (quizzesByHost[z.hostId] = quizzesByHost[z.hostId] || []).push(z); });
  const term = search.trim().toLowerCase();
  const shownUsers = users
    .slice()
    .sort((a: any, b: any) => (byHost[b.uid] || 0) - (byHost[a.uid] || 0))
    .filter((u: any) => !term || String(u.email || "").toLowerCase().indexOf(term) >= 0 || String(u.displayName || "").toLowerCase().indexOf(term) >= 0);
  const quizType = (z: any) => (z.kind === "poll" ? "Poll" : z.examMode ? "Exam" : "Quiz");
  const questionsByHost: Record<string, number> = {};
  quizzes.forEach((z: any) => { questionsByHost[z.hostId] = (questionsByHost[z.hostId] || 0) + (z.questions?.length || 0); });
  const feat = { quiz: 0, poll: 0, exam: 0, video: 0 };
  const byType: Record<string, number> = {};
  const byLang: Record<string, number> = {};
  quizzes.forEach((z: any) => {
    if (z.kind === "poll") feat.poll++; else if (z.examMode) feat.exam++; else feat.quiz++;
    const lang = z.language || "en"; byLang[lang] = (byLang[lang] || 0) + 1;
    let hasVideo = false;
    (z.questions || []).forEach((qq: any) => {
      const ty = qq.type || "multiple"; byType[ty] = (byType[ty] || 0) + 1;
      if (qq.videoUrl) hasVideo = true;
    });
    if (hasVideo) feat.video++;
  });
  const TYPE_LABELS: Record<string, string> = { multiple: "Multiple choice", truefalse: "True / False", typeanswer: "Type answer", sorting: "Sorting", poll: "Poll choice", wordcloud: "Word cloud", openended: "Open-ended", rating: "Rating", ranking: "Ranking", scale: "Scale" };

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
      <Card className="mb-6">
        <h2 className="text-xl font-bold mb-4">Feature usage</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <div><p className="text-2xl font-black text-kahoot-purple">{feat.quiz}</p><p className="text-gray-500 text-sm font-semibold">Quizzes</p></div>
          <div><p className="text-2xl font-black text-kahoot-purple">{feat.poll}</p><p className="text-gray-500 text-sm font-semibold">Polls / surveys</p></div>
          <div><p className="text-2xl font-black text-kahoot-purple">{feat.exam}</p><p className="text-gray-500 text-sm font-semibold">Exams</p></div>
          <div><p className="text-2xl font-black text-kahoot-purple">{feat.video}</p><p className="text-gray-500 text-sm font-semibold">Video quizzes</p></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <p className="font-bold text-gray-700 mb-2">Question types</p>
            <ul className="text-sm text-gray-600 space-y-1">
              {Object.keys(byType).sort((a, b) => byType[b] - byType[a]).map((k) => (
                <li key={k} className="flex justify-between"><span>{TYPE_LABELS[k] || k}</span><span className="font-semibold">{byType[k]}</span></li>
              ))}
              {Object.keys(byType).length === 0 && <li className="text-gray-400">No questions yet.</li>}
            </ul>
          </div>
          <div>
            <p className="font-bold text-gray-700 mb-2">Languages</p>
            <ul className="text-sm text-gray-600 space-y-1">
              {Object.keys(byLang).sort((a, b) => byLang[b] - byLang[a]).map((k) => (
                <li key={k} className="flex justify-between"><span>{k.toUpperCase()}</span><span className="font-semibold">{byLang[k]}</span></li>
              ))}
            </ul>
          </div>
        </div>
      </Card>
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
          <h2 className="text-xl font-bold">Quizzes per user</h2>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email or name…"
            className="w-full sm:w-72 rounded-xl border-2 border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-kahoot-purple"
          />
        </div>
        <p className="text-gray-400 text-xs mb-3">Tap a row to see that account's quizzes.</p>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b-2 border-gray-200 text-gray-500 text-sm">
              <th className="py-2">Name</th>
              <th>Email</th>
              <th>Joined</th>
              <th className="text-right">Questions</th>
              <th className="text-right">Quizzes</th>
            </tr>
          </thead>
          <tbody>
            {shownUsers.map((u: any) => {
              const count = byHost[u.uid] || 0;
              const open = openUid === u.uid;
              const list = quizzesByHost[u.uid] || [];
              return (
                <React.Fragment key={u.uid}>
                  <tr
                    onClick={() => count > 0 && setOpenUid(open ? null : u.uid)}
                    className={"border-b border-gray-100 " + (count > 0 ? "cursor-pointer hover:bg-gray-50" : "")}
                  >
                    <td className="py-2 font-semibold">
                      {count > 0 && <span className="text-gray-400 me-1">{open ? "▾" : "▸"}</span>}
                      {u.displayName || "—"}
                    </td>
                    <td className="text-gray-500">{u.email}</td>
                    <td className="text-gray-400 text-sm">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}</td>
                    <td className="text-right text-gray-600">{questionsByHost[u.uid] || 0}</td>
                    <td className="text-right font-black">{count}</td>
                  </tr>
                  {open && (
                    <tr className="bg-gray-50">
                      <td colSpan={5} className="p-0">
                        <div className="px-4 py-3">
                          {list.length === 0 ? (
                            <p className="text-gray-400 text-sm py-2">No quizzes.</p>
                          ) : (
                            <ul className="divide-y divide-gray-200">
                              {list
                                .slice()
                                .sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0))
                                .map((z: any) => (
                                  <li key={z.id} className="py-2">
                                    <div
                                      onClick={() => setOpenQuiz(openQuiz === z.id ? null : z.id)}
                                      className="flex items-center justify-between gap-3 cursor-pointer hover:bg-white rounded px-1"
                                    >
                                      <span dir="auto" className="font-semibold text-gray-800 truncate">
                                        <span className="text-gray-400 me-1">{openQuiz === z.id ? "▾" : "▸"}</span>
                                        {z.title || "(untitled)"}
                                      </span>
                                      <span className="shrink-0 text-xs text-gray-500 flex items-center gap-2">
                                        <span className="rounded-full bg-white border border-gray-200 px-2 py-0.5">{quizType(z)}</span>
                                        <span>{z.questions?.length || 0} Qs</span>
                                        <span className="text-gray-400">{z.createdAt ? new Date(z.createdAt).toLocaleDateString() : ""}</span>
                                      </span>
                                    </div>
                                    {openQuiz === z.id && (
                                      <ol className="mt-2 space-y-3 ps-1">
                                        {(z.questions || []).map((qq: any, qi: number) => {
                                          const correct = qq.multiSelect && Array.isArray(qq.correctAnswers) && qq.correctAnswers.length
                                            ? qq.correctAnswers
                                            : [qq.correctAnswer];
                                          const graded = !qq.type || qq.type === "multiple" || qq.type === "truefalse";
                                          return (
                                            <li key={qq.id || qi} className="rounded-xl bg-white border border-gray-200 p-3">
                                              <div className="flex items-start gap-2">
                                                <span className="text-gray-400 font-bold text-sm">{qi + 1}.</span>
                                                <div className="min-w-0 flex-1">
                                                  <p dir="auto" className="font-semibold text-gray-800">{qq.text || "—"}</p>
                                                  {qq.imageUrl && <img src={qq.imageUrl} alt="" className="mt-2 max-h-40 rounded-lg" />}
                                                  {qq.type === "typeanswer" ? (
                                                    <p className="mt-1 text-sm text-green-700">Answer: <span dir="auto" className="font-semibold">{qq.correctText || "—"}</span></p>
                                                  ) : qq.type === "scale" ? (
                                                    <p className="mt-1 text-sm text-gray-500">Scale {qq.scaleMin ?? 0}{qq.scaleMinLabel ? " (" + qq.scaleMinLabel + ")" : ""} to {qq.scaleMax ?? 10}{qq.scaleMaxLabel ? " (" + qq.scaleMaxLabel + ")" : ""}</p>
                                                  ) : (qq.options && qq.options.length) ? (
                                                    <ul className="mt-2 space-y-1">
                                                      {qq.options.filter((o: any) => o !== undefined && o !== null && String(o).length).map((opt: any, oi: number) => {
                                                        const isC = graded && correct.indexOf(oi) >= 0;
                                                        return (
                                                          <li key={oi} dir="auto" className={"text-sm rounded-lg px-2 py-1 " + (isC ? "bg-green-50 text-green-800 font-semibold" : "text-gray-600")}>
                                                            {isC ? "✓ " : ""}{opt}
                                                          </li>
                                                        );
                                                      })}
                                                    </ul>
                                                  ) : (
                                                    <p className="mt-1 text-sm text-gray-400">Open response</p>
                                                  )}
                                                  <p className="mt-1 text-xs text-gray-400">{(qq.points || 0) + " pts, " + (qq.timeLimit || 0) + "s" + (qq.type ? ", " + qq.type : "")}</p>
                                                </div>
                                              </div>
                                            </li>
                                          );
                                        })}
                                      </ol>
                                    )}
                                  </li>
                                ))}
                            </ul>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        {users.length > 0 && shownUsers.length === 0 && (
          <p className="text-gray-400 text-center py-4">No accounts match that search.</p>
        )}
        {users.length === 0 && (
          <p className="text-gray-400 text-center py-4">No users yet. User profiles are created on signup/login.</p>
        )}
      </Card>
    </div>
  );
}
