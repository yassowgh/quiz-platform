"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { listGamesByHost, listAssignmentResults } from "@/lib/firestore";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export default function ReportsClient() {
  const { user, loading } = useAuth();
  const params = useSearchParams();
  const quizId = params.get("quizId") || "";
  const [games, setGames] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (loading || !user) return;
    setFetching(true);
    Promise.all([
      listGamesByHost(user.uid),
      quizId ? listAssignmentResults(quizId) : Promise.resolve([]),
    ])
      .then(([gs, asg]) => {
        let list = gs as any[];
        if (quizId) list = list.filter((g) => g.quizId === quizId);
        setGames(list);
        setAssignments(asg as any[]);
        setSelected(list[0] || null);
      })
      .catch(() => { setGames([]); setAssignments([]); })
      .finally(() => setFetching(false));
  }, [user, loading, quizId]);

  // Overall stats across the shown games (per-quiz or all)
  const overall = useMemo(() => {
    const played = games.length;
    let players = 0, acc = 0, accN = 0;
    games.forEach((g) => {
      players += g.players?.length || 0;
      (g.questionReport || []).forEach((q: any) => { acc += q.accuracy; accN++; });
    });
    return { played, players, avgAccuracy: accN ? Math.round(acc / accN) : 0 };
  }, [games]);

  const exportCsv = () => {
    if (!selected) return;
    const q = String.fromCharCode(34);
    const esc = (s: any) => q + String(s == null ? "" : s).split(q).join(q + q) + q;
    const rows = ["Question,Type,Accuracy %,Correct,Responses,Avg time (s)"];
    (selected.questionReport || []).forEach((r: any) => {
      rows.push([esc(r.text), r.type, r.accuracy, r.correctCount, r.totalResponses, (r.avgTimeMs / 1000).toFixed(1)].join(","));
    });
    rows.push("");
    rows.push("Player,Score,Correct answers");
    (selected.players || []).forEach((p: any) => {
      rows.push([esc(p.nickname), p.score || 0, p.correctCount == null ? "" : p.correctCount].join(","));
    });
    const blob = new Blob([rows.join(String.fromCharCode(10))], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "quizzap-report.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (loading || fetching) return <div className="p-10 text-center text-gray-500 font-bold">Loading report...</div>;
  if (!user) return <div className="p-10 text-center text-gray-500 font-bold">Please log in to view reports.</div>;

  const hasData = games.length > 0 || assignments.length > 0;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <h1 className="text-3xl font-black">📈 {quizId ? "Quiz Analytics" : "All Reports"}</h1>
        <div className="flex gap-2">
          <Link href="/dashboard"><Button variant="secondary" size="sm">← Dashboard</Button></Link>
          <Link href="/"><Button variant="ghost" size="sm">🏠 Home</Button></Link>
        </div>
      </div>

      {!hasData && (
        <Card className="text-center py-12">
          <p className="text-gray-400 text-lg mb-2">No data yet for this view.</p>
          <p className="text-gray-400 text-sm">Host a live game or share an assignment link to start collecting analytics. Reports stay here even if you later delete the quiz.</p>
        </Card>
      )}

      {games.length > 0 && (
        <>
          {/* Overall summary */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card className="text-center">
              <p className="text-3xl font-black text-kahoot-purple">{overall.played}</p>
              <p className="text-gray-500 font-semibold text-sm">Games played</p>
            </Card>
            <Card className="text-center">
              <p className="text-3xl font-black text-kahoot-purple">{overall.players}</p>
              <p className="text-gray-500 font-semibold text-sm">Total players</p>
            </Card>
            <Card className="text-center">
              <p className="text-3xl font-black text-kahoot-purple">{overall.avgAccuracy}%</p>
              <p className="text-gray-500 font-semibold text-sm">Avg accuracy</p>
            </Card>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {games.slice(0, 12).map((g) => (
              <button
                key={g.id}
                onClick={() => setSelected(g)}
                className={
                  "px-3 py-2 rounded-xl text-sm font-semibold border-2 " +
                  (selected?.id === g.id ? "bg-kahoot-purple text-white border-kahoot-purple" : "border-gray-200 text-gray-600")
                }
              >
                {g.quizTitle || "Quiz"} · {g.createdAt ? new Date(g.createdAt).toLocaleDateString() : ""}
              </button>
            ))}
          </div>

          {selected && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <Card className="text-center">
                  <p className="text-3xl font-black text-kahoot-purple">{selected.players?.length || 0}</p>
                  <p className="text-gray-500 font-semibold text-sm">Players</p>
                </Card>
                <Card className="text-center">
                  <p className="text-3xl font-black text-kahoot-purple">{selected.totalQuestions || 0}</p>
                  <p className="text-gray-500 font-semibold text-sm">Questions</p>
                </Card>
                <Card className="text-center">
                  <p className="text-3xl font-black text-kahoot-purple">
                    {selected.questionReport?.length
                      ? Math.round(selected.questionReport.reduce((s: number, q: any) => s + q.accuracy, 0) / selected.questionReport.length)
                      : 0}%
                  </p>
                  <p className="text-gray-500 font-semibold text-sm">Avg accuracy</p>
                </Card>
                <Card className="text-center">
                  <p className="text-3xl font-black text-kahoot-purple">{selected.pin || "—"}</p>
                  <p className="text-gray-500 font-semibold text-sm">Game PIN</p>
                </Card>
              </div>

              <div className="flex justify-end mb-4">
                <Button variant="secondary" size="sm" onClick={exportCsv}>⬇️ Export CSV</Button>
              </div>

              <Card className="mb-6">
                <h2 className="text-xl font-bold mb-4">Question breakdown</h2>
                {selected.questionReport?.length ? (
                  <div className="flex flex-col gap-3">
                    {selected.questionReport.map((qr: any) => (
                      <div key={qr.index} className="border-b border-gray-100 pb-3 last:border-0">
                        <div className="flex items-start gap-2">
                          <span className="w-7 h-7 bg-kahoot-purple text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">{qr.index + 1}</span>
                          <div className="flex-1">
                            <p className="font-semibold" dir="auto">{qr.text}</p>
                            <p className="text-xs text-gray-400 uppercase">{qr.type}</p>
                          </div>
                          <div className="text-right">
                            <p className={"font-black text-lg " + (qr.accuracy >= 70 ? "text-kahoot-green" : qr.accuracy >= 40 ? "text-yellow-500" : "text-red-500")}>{qr.accuracy}%</p>
                            <p className="text-xs text-gray-400">{qr.correctCount}/{qr.totalResponses} correct</p>
                          </div>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full mt-2 overflow-hidden">
                          <div className={"h-full " + (qr.accuracy >= 70 ? "bg-kahoot-green" : qr.accuracy >= 40 ? "bg-yellow-400" : "bg-red-400")} style={{ width: qr.accuracy + "%" }} />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Avg answer time: {(qr.avgTimeMs / 1000).toFixed(1)}s</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400">This game was played before detailed reports were added. Newer games show a full breakdown.</p>
                )}
              </Card>

              <Card className="mb-6">
                <h2 className="text-xl font-bold mb-4">Final standings</h2>
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b-2 border-gray-200 text-gray-500 text-sm">
                      <th className="py-2">#</th><th>Player</th><th className="text-right">Correct</th><th className="text-right">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selected.players || []).map((p: any, i: number) => (
                      <tr key={p.id || i} className="border-b border-gray-100">
                        <td className="py-2 font-black">{i + 1}</td>
                        <td className="font-semibold" dir="auto">{p.nickname}</td>
                        <td className="text-right text-gray-500">{p.correctCount ?? "—"}</td>
                        <td className="text-right font-black">{(p.score || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </>
          )}
        </>
      )}

      {/* Assignment completions (self-paced) */}
      {quizId && (
        <Card>
          <h2 className="text-xl font-bold mb-4">📝 Assignment completions ({assignments.length})</h2>
          {assignments.length ? (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b-2 border-gray-200 text-gray-500 text-sm">
                  <th className="py-2">Name</th><th>When</th><th className="text-right">Correct</th><th className="text-right">Score</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a: any) => (
                  <tr key={a.id} className="border-b border-gray-100">
                    <td className="py-2 font-semibold" dir="auto">{a.nickname}</td>
                    <td className="text-gray-400 text-sm">{a.createdAt ? new Date(a.createdAt).toLocaleString() : "—"}</td>
                    <td className="text-right text-gray-500">{a.correctCount}/{a.totalQuestions}</td>
                    <td className="text-right font-black">{(a.score || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-400">No one has completed the self-paced assignment yet. Share the Assign link from your dashboard.</p>
          )}
        </Card>
      )}
    </div>
  );
}
