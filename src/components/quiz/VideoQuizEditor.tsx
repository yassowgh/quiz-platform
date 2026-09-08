"use client";
import { useState, useEffect, useRef } from "react";
import type { Quiz, VideoSegment } from "@/types";
import { generateVideoQuestions } from "@/lib/integrations";
import Button from "@/components/ui/Button";

function parseTime(s: string): number {
  if (/^\d+:\d{1,2}$/.test(s)) { const p = s.split(":").map(Number); return p[0] * 60 + p[1]; }
  return Number(s) || 0;
}
function fmt(n: number): string { const m = Math.floor(n / 60), r = Math.floor(n % 60); return m + ":" + String(r).padStart(2, "0"); }
function ytId(url: string): string { const m = (url || "").match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([\w-]{6,})/); return m ? m[1] : ""; }

function VideoPlayer({ url, type, onMark, seek }: { url: string; type: string; onMark: (t: number) => void; seek: { t: number; n: number } | null }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const ytRef = useRef<any>(null);
  const holderRef = useRef<HTMLDivElement | null>(null);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [muted, setMuted] = useState(false);
  const isYt = type !== "url";
  const vid = ytId(url);

  useEffect(() => {
    if (!isYt || !vid) return;
    let cancelled = false;
    const build = () => {
      if (cancelled || !holderRef.current) return;
      try {
        ytRef.current = new (window as any).YT.Player(holderRef.current, {
          videoId: vid,
          playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
          events: {
            onStateChange: (e: any) => setPlaying(e.data === 1),
            onReady: (e: any) => { try { setDur(e.target.getDuration() || 0); } catch (er) {} },
          },
        });
      } catch (er) {}
    };
    if ((window as any).YT && (window as any).YT.Player) build();
    else {
      if (!document.getElementById("yt-iframe-api")) {
        const s = document.createElement("script"); s.id = "yt-iframe-api"; s.src = "https://www.youtube.com/iframe_api"; document.body.appendChild(s);
      }
      const prev = (window as any).onYouTubeIframeAPIReady;
      (window as any).onYouTubeIframeAPIReady = () => { if (prev) prev(); build(); };
    }
    const iv = setInterval(() => { try { const p = ytRef.current; if (p && p.getCurrentTime) { setCur(p.getCurrentTime() || 0); if (p.getDuration) setDur(p.getDuration() || 0); } } catch (er) {} }, 500);
    return () => { cancelled = true; clearInterval(iv); try { if (ytRef.current && ytRef.current.destroy) ytRef.current.destroy(); } catch (er) {} ytRef.current = null; };
  }, [isYt, vid]);

  const onTime = () => { const v = videoRef.current; if (v) { setCur(v.currentTime); setDur(v.duration || 0); } };

  useEffect(() => {
    if (!seek) return;
    if (isYt) { try { if (ytRef.current && ytRef.current.seekTo) ytRef.current.seekTo(seek.t, true); } catch (er) {} }
    else if (videoRef.current) { videoRef.current.currentTime = seek.t; }
  }, [seek ? seek.n : 0]);

  const play = () => { if (isYt) { try { ytRef.current.playVideo(); } catch (er) {} } else videoRef.current && videoRef.current.play(); };
  const pause = () => { if (isYt) { try { ytRef.current.pauseVideo(); } catch (er) {} } else videoRef.current && videoRef.current.pause(); };
  const setSpeed = (r: number) => { setRate(r); if (isYt) { try { ytRef.current.setPlaybackRate(r); } catch (er) {} } else if (videoRef.current) videoRef.current.playbackRate = r; };
  const toggleMute = () => { const m = !muted; setMuted(m); if (isYt) { try { if (m) ytRef.current.mute(); else ytRef.current.unMute(); } catch (er) {} } else if (videoRef.current) videoRef.current.muted = m; };
  const scrub = (t: number) => { setCur(t); if (isYt) { try { ytRef.current.seekTo(t, true); } catch (er) {} } else if (videoRef.current) videoRef.current.currentTime = t; };

  if (!url) return null;
  return (
    <div className="rounded-xl overflow-hidden border-2 border-gray-200 bg-black">
      <div className="aspect-video bg-black">
        {isYt ? (
          vid ? <div ref={holderRef} className="w-full h-full" /> : <div className="flex items-center justify-center h-full text-white/60 text-sm">Enter a valid YouTube link above</div>
        ) : (
          <video ref={videoRef} src={url} className="w-full h-full" onTimeUpdate={onTime} onLoadedMetadata={onTime} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} playsInline />
        )}
      </div>
      <div className="bg-gray-900 text-white p-2 flex flex-col gap-2">
        <input type="range" min={0} max={Math.max(dur, 1)} step={0.1} value={Math.min(cur, dur || cur)} onChange={(e) => scrub(Number(e.target.value))} className="w-full accent-kahoot-purple" />
        <div className="flex items-center gap-2 flex-wrap text-sm">
          <button type="button" onClick={playing ? pause : play} className="px-3 py-1 rounded-lg bg-white/15 hover:bg-white/25 font-bold">{playing ? "⏸" : "▶"}</button>
          <button type="button" onClick={toggleMute} className="px-3 py-1 rounded-lg bg-white/15 hover:bg-white/25">{muted ? "🔇" : "🔊"}</button>
          <span className="tabular-nums text-white/70">{fmt(cur)} / {fmt(dur)}</span>
          <span className="ml-auto flex items-center gap-1">
            {[1, 1.5, 2, 3].map((r) => (
              <button key={r} type="button" onClick={() => setSpeed(r)} className={"px-2 py-1 rounded-lg text-xs font-bold " + (rate === r ? "bg-kahoot-purple" : "bg-white/15 hover:bg-white/25")}>{r}×</button>
            ))}
          </span>
          <button type="button" onClick={() => onMark(cur)} className="px-3 py-1 rounded-lg bg-kahoot-green font-bold w-full sm:w-auto">📍 Mark pause at {fmt(cur)}</button>
        </div>
      </div>
    </div>
  );
}

export default function VideoQuizEditor({ quiz, onChange, admin }: { quiz: Quiz; onChange: (q: Quiz) => void; admin?: boolean }) {
  const [busy, setBusy] = useState<number | null>(null);
  const [err, setErr] = useState("");
  const [count, setCount] = useState(5);
  const [seek, setSeek] = useState<{ t: number; n: number } | null>(null);
  const segs: VideoSegment[] = (quiz.videoSegments || []) as VideoSegment[];
  const setSegs = (s: VideoSegment[]) => onChange({ ...quiz, videoSegments: s.slice().sort((a, b) => a.time - b.time) });

  if (!admin) {
    return (
      <div className="border-2 border-gray-200 rounded-xl p-4 opacity-60 select-none">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🎬</span>
          <span>
            <span className="font-bold text-gray-700">Interactive video quiz</span>
            <span className="block text-sm text-gray-500">🚧 In testing — we're upgrading how videos are processed. This feature will be back on soon.</span>
          </span>
        </div>
      </div>
    );
  }

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
          {quiz.videoUrl && (
            <div className="flex flex-col gap-1">
              <VideoPlayer url={quiz.videoUrl} type={quiz.videoType || "youtube"} onMark={(t) => setSegs([...segs, { time: Math.round(t), questions: [] }])} seek={seek} />
              <p className="text-xs text-gray-500">Play the video, then tap “📍 Mark pause” to drop a question point at the current time. Use ▶ Jump on any pause point to preview it.</p>
            </div>
          )}
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
                <input defaultValue={fmt(seg.time)} key={fmt(seg.time)} onBlur={(e) => { const c = segs.slice(); c[i] = { ...c[i], time: parseTime(e.target.value) }; setSegs(c); }} placeholder="mm:ss" className="w-20 px-2 py-1 border-2 border-gray-200 rounded-lg text-sm" />
                <button type="button" onClick={() => setSeek({ t: seg.time, n: Date.now() })} className="text-kahoot-purple font-bold text-sm px-2 py-1 rounded-lg hover:bg-kahoot-purple/10">▶ Jump</button>
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
