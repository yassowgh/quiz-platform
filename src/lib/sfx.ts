// Lightweight Web Audio sound effects — no external assets needed.
// Uses ONE shared AudioContext. iOS Safari caps the number of AudioContexts,
// so creating a new one per play would silently stop working after a few plays.

let _ctx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!AC) return null;
  if (!_ctx) {
    try { _ctx = new AC(); } catch { return null; }
  }
  if (_ctx && _ctx.state === "suspended") _ctx.resume().catch(() => {});
  return _ctx;
}

// --- Mute / enable state (persisted across pages) ---
let _enabled = true;
if (typeof window !== "undefined") {
  try { _enabled = localStorage.getItem("qz_sfx_off") !== "1"; } catch {}
}
export function isSfxEnabled(): boolean { return _enabled; }
export function setSfxEnabled(on: boolean): void {
  _enabled = on;
  try { localStorage.setItem("qz_sfx_off", on ? "0" : "1"); } catch {}
  if (on) getCtx(); // warm up inside the click that re-enabled it
}
export function toggleSfx(): boolean { setSfxEnabled(!_enabled); return _enabled; }

function tone(ac: AudioContext, freq: number, start: number, dur: number, type: OscillatorType = "sine", vol = 0.3) {
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.connect(g);
  g.connect(ac.destination);
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(vol, ac.currentTime + start);
  g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + start + dur);
  o.start(ac.currentTime + start);
  o.stop(ac.currentTime + start + dur);
}

/** Happy rising arpeggio for correct answers */
export function playSuccess() {
  if (!_enabled) return;
  const ac = getCtx(); if (!ac) return;
  [523, 659, 784, 1047].forEach((fq, i) => tone(ac, fq, i * 0.12, 0.3, "triangle", 0.35));
}

/** Sad descending "wah wah" for wrong answers */
export function playFail() {
  if (!_enabled) return;
  const ac = getCtx(); if (!ac) return;
  [392, 370, 349, 294].forEach((fq, i) => tone(ac, fq, i * 0.25, 0.4, "sawtooth", 0.22));
}

/** Celebration fanfare — big version for 1st place */
export function playFanfare(big = false) {
  if (!_enabled) return;
  const ac = getCtx(); if (!ac) return;
  const seq = big
    ? [523, 523, 523, 659, 784, 784, 659, 784, 1047, 1319]
    : [523, 659, 784, 1047];
  seq.forEach((fq, i) => tone(ac, fq, i * 0.15, 0.35, "square", big ? 0.3 : 0.18));
  if (big) [262, 330, 392].forEach((fq) => tone(ac, fq, seq.length * 0.15, 1.2, "triangle", 0.25));
}
