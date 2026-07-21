"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { listGamesByHost } from "@/lib/firestore";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export default function ReportsClient() {
  const { user, loading } = useAuth();
  const params = useSearchParams();
  const gameId = params.get("gameId") || "";
  const [games, setGames] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (loading || !user) return;
    listGamesByHost(user.uid)
      .then((gs) => {
        setGames(gs as any[]);
        const found = gameId ? (gs as any[]).find((g) => g.id === gameId) : (gs as any[])[0];
        setSelected(found || null);
      })
      .catch(() => setGames([]))
      .finally(() => setFetching(false));
  }, [user, loading, gameId]);

  const exportCsv = () => {
    if (!selected) return;
    const q = String.fromCharCode(34);
    const esc = (s) => q + String(s == null ? "" : s).split(q).join(q + q) + q;
    const rows = ["Question,Type,Accuracy %,Correct,Responses,Avg time (s)"];
    (selected.questionReport || []).forEach((r) => {
      rows.push([esc(r.text), r.type, r.accuracy, r.correctCount, r.totalResponses, (r.avgTimeMs / 1000).toFixed(1)].join(","));
    });
    rows.push("");
    rows.push("Player,Score,Correct answers");
    (selected.players || []).forEach((p) => {
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
  if (!games.length) return <div className="p-10 text-center text-gray-500 font-bold">No games played yet. Host a game to see reports here.</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-black mb-6">📈 Game Reports</h1>

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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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
                  ? Math.round(
                      selected.questionReport.reduce((s: number, q: any) => s + q.accuracy, 0) /
                        selected.questionReport.length
                    )
                  : 0}
                %
              </p>
              <p className="text-gray-500 font-semibold text-sm">Avg accuracy</p>
            </Card>
            <Card className="text-center">
              <p className="text-3xl font-black text-kahoot-purple">{selected.pin || "—"}</p>
              <p className="text-gray-500 font-semibold text-sm">Game PIN</p>
            </Card>
          </div>

          <div className="flex justify-end mb-4">
            <Button variant="ghost" size="sm" onClick={exportCsv}>⬇️ Export CSV</Button>
          </div>

          <Card className="mb-6">
            <h2 className="text-xl font-bold mb-4">Question breakdown</h2>
            {selected.questionReport?.length ? (
              <div className="flex flex-col gap-3">
                {selected.questionReport.map((q: any) => (
                  <div key={q.index} className="border-b border-gray-100 pb-3 last:border-0">
                    <div className="flex items-start gap-2">
                      <span className="w-7 h-7 bg-kahoot-purple text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {q.index + 1}
                      </span>
                      <div className="flex-1">
                        <p className="font-semibold" dir="auto">{q.text}</p>
                        <p className="text-xs text-gray-400 uppercase">{q.type}</p>
                      </div>
                      <div className="text-right">
                        <p className={"font-black text-lg " + (q.accuracy >= 70 ? "text-kahoot-green" : q.accuracy >= 40 ? "text-yellow-500" : "text-red-500")}>
                          {q.accuracy}%
                        </p>
                        <p className="text-xs text-gray-400">{q.correctCount}/{q.totalResponses} correct</p>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full mt-2 overflow-hidden">
                      <div
                        className={"h-full " + (q.accuracy >= 70 ? "bg-kahoot-green" : q.accuracy >= 40 ? "bg-yellow-400" : "bg-red-400")}
                        style={{ width: q.accuracy + "%" }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Avg answer time: {(q.avgTimeMs / 1000).toFixed(1)}s</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400">
                This game was played before detailed reports were added. Newer games will show a full breakdown.
              </p>
            )}
          </Card>

          <Card>
            <h2 className="text-xl font-bold mb-4">Final standings</h2>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b-2 border-gray-200 text-gray-500 text-sm">
                  <th className="py-2">#</th>
                  <th>Player</th>
                  <th className="text-right">Correct</th>
                  <th className="text-right">Score</th>
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
    </div>
  );
}
