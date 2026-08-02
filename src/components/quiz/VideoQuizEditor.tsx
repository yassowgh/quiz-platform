"use client";
import { useState } from "react";
import type { Quiz, VideoSegment } from "@/types";
import { generateVideoQuestions } from "@/lib/integrations";
import Button from "@/components/ui/Button";

function parseTime(s: string): number {
  if (/^\d+:\d{1,2}$/.test(s)) { const p = s.split(":").map(Number); return p[0] * 60 + p[1]; }
  return Number(s) || 0;
}
function fmt(n: number): string { const m = Math.floor(n / 60), r = Math.floor(n % 60); return m + ":" + String(r).padStart(2, "0"); }

export default function VideoQuizEditor({ quiz, onChange }: { quiz: Quiz; onChange: (q: Quiz) => void }) {
  const [busy, setBusy] = useState<number | null>(null);
  const [err, setErr] = useState("");
  const [count, setCount] = useState(5);
  const segs: VideoSegment[] = (quiz.videoSegments || []) as VideoSegment[];
  const setSegs = (s: VideoSegment[]) => onChange({ ...quiz, videoSegments: s.slice().sort((a, b) => a.time - b.time) });

  const gen = async (idx: number) => {
    if (!quiz.videoUrl) { setErr("Add the video link first."); return; }
    setErr(""); setBusy(idx);
    try {
      const prev = idx > 0 ? segs[idx - 1].time : 0;
      const qs = await generateVideoQuestions(quiz.videoUrl, prev, segs[idx].time, Math.min(count, 10), quiz.language || "en");
      if (!qs.length) throw new Error("No questions came back for this part.");
      const copy = segs.slice(); copy[idx] = { ...copy[idx], questions: qs }; onChange({ ...quiz, videoSegments: copy });
    } catch (e: any) { setErr(e?.message || "Could not generate from the video."); } finally { setBusy(null); }
  };

  return (
    <div className="border-2 border-gray-200 rounded-xl p-4 flex flex-col gap-3">
      <label className="flex items-start gap-3 cursor-pointer">
        <input type="checkbox" checked={!!quiz.videoMode} onChange={(e) => onChange({ ...quiz, videoMode: e.target.checked })} className="mt-1 w-5 h-5" />
        <span>
          <span className="font-bold text-gray-700">🎬 Interactive video quiz</span>
          <span className="block text-sm text-gray-500">Play a video that pauses at your chosen points to ask questions. Questions can be auto-generated from the video.</span>
        </span>
      </label>
      {quiz.videoMode && (
        <div className="flex flex-col gap-3 pl-2">
          <div className="flex gap-2 flex-wrap items-end">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-gray-700">Source</label>
              <select value={quiz.videoType || "youtube"} onChange={(e) => onChange({ ...quiz, videoType: e.target.value as any })} className="px-3 py-2 border-2 border-gray-200 rounded-xl">
                <option value="youtube">YouTube link</option>
                <option value="url">Direct video URL (self-hosted)</option>
              </select>
            </div>
            <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
              <label className="text-sm font-semibold text-gray-700">Video link</label>
              <input value={quiz.videoUrl || ""} onChange={(e) => onChange({ ...quiz, videoUrl: e.target.value })} placeholder="https://youtube.com/watch?v=..." className="px-3 py-2 border-2 border-gray-200 rounded-xl" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <input type="checkbox" checked={!!quiz.videoBlockUntilCorrect} onChange={(e) => onChange({ ...quiz, videoBlockUntilCorrect: e.target.checked })} className="w-4 h-4" />
            Block until answered correctly (student must get each answer right to continue)
          </label>
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-gray-700">Auto-generate</label>
            <select value={count} onChange={(e) => setCount(Number(e.target.value))} className="px-2 py-1 border-2 border-gray-200 rounded-lg text-sm">
              {[3, 5, 8, 10].map((n) => (<option key={n} value={n}>{n} per pause</option>))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700">Pause points</label>
            {segs.map((seg, i) => (
              <div key={i} className="flex items-center gap-2 flex-wrap bg-gray-50 rounded-lg p-2">
                <span className="text-sm text-gray-500">Pause at</span>
                <input defaultValue={fmt(seg.time)} onBlur={(e) => { const c = segs.slice(); c[i] = { ...c[i], time: parseTime(e.target.value) }; setSegs(c); }} placeholder="mm:ss" className="w-20 px-2 py-1 border-2 border-gray-200 rounded-lg text-sm" />
                <Button size="sm" variant="secondary" loading={busy === i} onClick={() => gen(i)}>✨ Generate</Button>
                <span className="text-sm text-gray-600">{(seg.questions || []).length} questions</span>
                <button type="button" onClick={() => setSegs(segs.filter((_, j) => j !== i))} className="text-red-500 font-bold ml-auto">Remove</button>
              </div>
            ))}
            <Button size="sm" variant="ghost" onClick={() => onChange({ ...quiz, videoSegments: [...segs, { time: (segs.length + 1) * 60, questions: [] }] })}>+ Add pause point</Button>
          </div>
          {err && <p className="text-red-500 text-sm">{err}</p>}
        </div>
      )}
    </div>
  );
}
