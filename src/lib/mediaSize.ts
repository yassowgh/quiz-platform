import { uploadImage } from "@/lib/integrations";
import type { Quiz } from "@/types";

// Firestore caps a single document at 1,048,576 bytes.
export const QUIZ_MAX_BYTES = 1048576;
// Start lifting inline media / warning before the hard limit.
export const QUIZ_SOFT_BYTES = 950000;

export function docBytes(obj: any): number {
  try { return new Blob([JSON.stringify(obj)]).size; } catch { return JSON.stringify(obj || {}).length; }
}

function dataUrlToBlob(dataUrl: string): Blob | null {
  // [\s\S] rather than . with the /s flag: the tsconfig target predates es2018.
  const m = /^data:([^;,]+)?(;base64)?,([\s\S]*)$/.exec(dataUrl);
  if (!m) return null;
  const mime = m[1] || "application/octet-stream";
  const isB64 = !!m[2];
  const data = m[3] || "";
  try {
    if (isB64) {
      const bin = atob(data);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      return new Blob([arr], { type: mime });
    }
    return new Blob([decodeURIComponent(data)], { type: mime });
  } catch { return null; }
}

// Move any inline (data:) media out to R2 storage, returning a NEW quiz (does not mutate input).
export async function liftInlineMedia(quiz: Quiz): Promise<{ quiz: Quiz; lifted: number; failed: number }> {
  let lifted = 0, failed = 0;
  const q: any = JSON.parse(JSON.stringify(quiz));
  const liftField = async (obj: any, key: string) => {
    const v = obj && obj[key];
    if (typeof v === "string" && v.indexOf("data:") === 0) {
      const blob = dataUrlToBlob(v);
      if (!blob) { failed++; return; }
      try { obj[key] = await uploadImage(blob); lifted++; } catch (e) { failed++; }
    }
  };
  if (q.branding) await liftField(q.branding, "logoUrl");
  for (const question of q.questions || []) { await liftField(question, "imageUrl"); await liftField(question, "audioUrl"); }
  for (const seg of q.videoSegments || []) { for (const question of seg.questions || []) { await liftField(question, "imageUrl"); await liftField(question, "audioUrl"); } }
  return { quiz: q as Quiz, lifted, failed };
}

export function isSizeError(err: any): boolean {
  const m = String((err && (err.message || err.code)) || "");
  return m.indexOf("exceeds the maximum allowed size") >= 0 || m.indexOf("1048576") >= 0;
}

// Human-readable list of the biggest inline items, for error messages.
export function describeLargest(quiz: any, n = 3): string {
  const items: { label: string; bytes: number }[] = [];
  const add = (label: string, v: any) => { if (typeof v === "string" && v.indexOf("data:") === 0) items.push({ label, bytes: v.length }); };
  add("logo", quiz && quiz.branding && quiz.branding.logoUrl);
  (quiz && quiz.questions || []).forEach((qq: any, i: number) => { add("Q" + (i + 1) + " image", qq.imageUrl); add("Q" + (i + 1) + " audio", qq.audioUrl); });
  items.sort((a, b) => b.bytes - a.bytes);
  if (!items.length) return "-";
  return items.slice(0, n).map((it) => it.label + " (" + Math.round(it.bytes / 1024) + " KB)").join(", ");
}
