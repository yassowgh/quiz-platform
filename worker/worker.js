// ============================================================
// QuizUps Worker (v20) — AI (topic/document/video/URL) + Exam grading + R2 media (upload/serve)
// Free. Keeps your Gemini key AND exam answer keys secret (server-side).
//
// v4 adds two exam endpoints (POST JSON):
//   { mode: "seal",  items: [...] }              -> { sealed: "<encrypted blob>" }
//   { mode: "grade", sealed: "...", answers:[] } -> { correctCount, total, score }
// The answer key is AES-GCM encrypted with ENC_KEY, so the "sealed" blob is
// safe to store publicly — only this Worker can read the answers.
//
// SETUP: paste this whole file into your Worker, then Deploy.
// Settings -> Variables and Secrets (add the NEW one, keep the others):
//   GEMINI_KEY      = your Gemini API key            (type: Secret)
//   ALLOWED_ORIGIN  = https://quizups.com
//   ENC_KEY         = any long random string, 32+ chars   (type: Secret)
//   RESEND_KEY      = your Resend API key             (type: Secret)
//   MAIL_FROM       = QuizUps <noreply@quizups.com>   (optional)
//   ALERT_EMAIL     = your email for failure/feedback alerts
//   HUBSPOT_TOKEN   = HubSpot Private App token        (type: Secret)
//   OPENROUTER_KEY  = OpenRouter API key (free models: DeepSeek/Llama)  (type: Secret)
//   WORKER_BASE     = https://polished-shadow-f08c.yassow.workers.dev  (for email tracking links)
// (Optional) MODEL  = force a single model, e.g. gemini-3.6-flash
// ============================================================

const FALLBACK_MODELS = [
  "gemini-flash-latest",   // alias: always newest Flash (future-proof)
  "gemini-3.6-flash",      // current stable (free tier)
  "gemini-3.7-flash",      // newest
];

export default {
  async fetch(request, env) {
    const allowed = env.ALLOWED_ORIGIN || "https://quizups.com";
    const origin = request.headers.get("Origin") || "";
    const cors = {
      "Access-Control-Allow-Origin": allowed,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    const _u = new URL(request.url);
    if (request.method === "GET" && _u.pathname === "/unsub") return handleUnsub(request, env);
    if (request.method === "GET" && _u.pathname === "/track") return handleTrack(request, env);
    if (request.method === "GET" && _u.pathname.startsWith("/media/")) return handleMedia(request, env);
    if (request.method === "POST" && _u.pathname === "/upload") {
      if (origin && origin !== allowed) return json({ error: "Forbidden origin" }, 403, cors);
      return handleUpload(request, env, cors);
    }
    if (request.method !== "POST") return json({ error: "POST only" }, 405, cors);
    if (origin && origin !== allowed) return json({ error: "Forbidden origin" }, 403, cors);

    let body;
    try { body = await request.json(); }
    catch { return json({ error: "Bad JSON" }, 400, cors); }

    if ((body.mode === "email" || body.mode === "hubspot") && origin !== allowed) return json({ error: "Forbidden" }, 403, cors);

    // ---- Exam endpoints ----
    if (body.mode === "seal") return handleSeal(body, env, cors);
    if (body.mode === "grade") return handleGrade(body, env, cors);
    if (body.mode === "videoq") return handleVideoQ(body, env, cors);
    if (body.mode === "urlq") return handleUrlQ(body, env, cors);
    if (body.mode === "email") return handleEmail(body, env, cors);
    if (body.mode === "logs") return handleLogs(body, env, cors);
    if (body.mode === "hubspot") return handleHubspot(body, env, cors);
    if (body.mode === "feedback") return handleFeedback(body, env, cors);
    if (body.mode === "stats") return handleStats(body, env, cors);

    // ---- Default: AI question generation ----
    return handleGenerate(body, env, cors);
  },
};

// ========== Exam: encryption helpers (AES-GCM) ==========
async function getKey(env) {
  const secret = env.ENC_KEY || "quizups-fallback-key-change-me";
  const raw = new TextEncoder().encode(secret);
  const hash = await crypto.subtle.digest("SHA-256", raw);
  return crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}
function b64encode(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
function b64decode(str) {
  const bin = atob(str);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
async function encryptJSON(obj, env) {
  const key = await getKey(env);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(JSON.stringify(obj));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data));
  const packed = new Uint8Array(iv.length + ct.length);
  packed.set(iv, 0); packed.set(ct, iv.length);
  return b64encode(packed);
}
async function decryptJSON(sealed, env) {
  const key = await getKey(env);
  const packed = b64decode(sealed);
  const iv = packed.slice(0, 12);
  const ct = packed.slice(12);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return JSON.parse(new TextDecoder().decode(pt));
}

async function handleSeal(body, env, cors) {
  const items = Array.isArray(body.items) ? body.items : [];
  if (!items.length) return json({ error: "No items to seal" }, 400, cors);
  try {
    const sealed = await encryptJSON({ items }, env);
    return json({ sealed }, 200, cors);
  } catch (e) {
    return json({ error: "Seal failed", detail: String(e).slice(0, 120) }, 500, cors);
  }
}

function norm(s) { return String(s == null ? "" : s).trim().toLowerCase(); }
function setEqual(a, b) {
  const A = (a || []).map(norm).filter(Boolean).sort();
  const B = (b || []).map(norm).filter(Boolean).sort();
  if (A.length !== B.length || A.length === 0) return false;
  return A.every((x, i) => x === B[i]);
}

async function handleGrade(body, env, cors) {
  let payload;
  try { payload = await decryptJSON(body.sealed, env); }
  catch { return json({ error: "Invalid sealed data" }, 400, cors); }
  const items = payload.items || [];
  const answers = Array.isArray(body.answers) ? body.answers : [];
  const byId = {};
  for (const a of answers) byId[a.id] = a;

  let correctCount = 0, total = 0, score = 0;
  const perQuestion = [];
  for (const it of items) {
    if (it.type === "poll") continue; // polls are not graded
    total++;
    const a = byId[it.id] || {};
    let ok = false;
    if (it.type === "typeanswer") {
      ok = norm(a.text) !== "" && norm(a.text) === norm((it.correct || [])[0]);
    } else {
      const picked = a.picked || (a.text ? [a.text] : []);
      ok = setEqual(picked, it.correct);
    }
    if (ok) { correctCount++; score += Number(it.points || 0); }
    perQuestion.push(ok);
  }
  return json({ correctCount, total, score, perQuestion }, 200, cors);
}

// ========== AI generation (unchanged from v3) ==========
async function handleGenerate(body, env, cors) {
  const topic = String(body.topic || "").slice(0, 200);
  const source = String(body.source || "").slice(0, 14000);
  const count = Math.min(Math.max(parseInt(body.count) || 5, 1), 20);
  const language = body.language === "ar" ? "Arabic" : "English";
  if (!topic && !source) return json({ error: "Missing topic or source" }, 400, cors);

  const avoid = Array.isArray(body.avoid)
    ? body.avoid.filter((x) => typeof x === "string" && x.trim()).slice(0, 60)
    : [];

  let prompt;
  if (source) {
    prompt =
      `Based ONLY on the following study material, create ${count} multiple-choice quiz questions in ${language}. ` +
      `Use only facts found in the material. Each question has exactly 4 options and one correct answer. ` +
      `Keep each question under 120 characters and each option under 75 characters. ` +
      `correctIndex is the 0-based index of the correct option.` +
      (topic ? ` Focus especially on: "${topic}".` : "") +
      `\n\nMATERIAL:\n"""${source}"""`;
  } else {
    prompt =
      `Create ${count} multiple-choice quiz questions about "${topic}" in ${language}. ` +
      `Each question has exactly 4 options and one correct answer. ` +
      `Keep each question under 120 characters and each option under 75 characters. ` +
      `correctIndex is the 0-based index of the correct option.`;
  }

  if (avoid.length) {
    prompt +=
      ` Do NOT repeat, rephrase, or create questions similar in meaning to any of these ` +
      `already-used questions: ` +
      avoid.map((q) => `"${String(q).slice(0, 160)}"`).join("; ") +
      `. Every question you return must be clearly different from those and from each other.`;
  }

  const schema = {
    type: "OBJECT",
    properties: {
      questions: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            text: { type: "STRING" },
            options: { type: "ARRAY", items: { type: "STRING" } },
            correctIndex: { type: "INTEGER" },
          },
          required: ["text", "options", "correctIndex"],
        },
      },
    },
    required: ["questions"],
  };

  const models = env.MODEL ? [env.MODEL] : FALLBACK_MODELS;
  let lastDetail = "";

  for (const model of models) {
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_KEY}`;
    const gRes = await tfetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: schema,
          temperature: 0.9,
        },
      }),
    });

    if (!gRes) { lastDetail = "No response (timeout) from " + model; continue; }
    if (gRes.ok) {
      const data = await gRes.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      try {
        const parsed = JSON.parse(text);
        parsed._model = model;
        await logEvent(env, { type: "generate", ok: true, provider: model, topic: topic });
        return json(parsed, 200, cors);
      } catch {
        lastDetail = "Parse error from " + model;
        continue;
      }
    }

    lastDetail = (await gRes.text()).slice(0, 200);
    if (gRes.status !== 404 && gRes.status !== 429 && gRes.status !== 500 && gRes.status !== 503) {
      return json({ error: "Gemini error", model, detail: lastDetail }, 502, cors);
    }
    await new Promise((r) => setTimeout(r, 150)); // brief backoff, then try next model
  }

  // Gemini exhausted -> try Groq (free, non-Google) if configured
  const alt = await tryGroq(prompt, env, cors);
  if (alt) { await logEvent(env, { type: "generate", ok: true, provider: "groq", topic: topic }); return alt; }
  const alt2 = await tryOpenRouter(prompt, env, cors);
  if (alt2) { await logEvent(env, { type: "generate", ok: true, provider: "openrouter", topic: topic }); return alt2; }
  // Everything failed -> optional email alert (rate-limited) + friendly message
  await logEvent(env, { type: "generate", ok: false, topic: topic, detail: String(lastDetail || "").slice(0, 200) });
  await maybeAlert(env, "question generation", lastDetail);
  return json({ error: "The AI is busy right now. Please click Generate again in a few seconds.", detail: lastDetail }, 502, cors);
}


// ========== Video quiz: Gemini analyzes a YouTube video ==========
function fmtT(s) {
  s = Math.max(0, Math.floor(s || 0));
  const m = Math.floor(s / 60), r = s % 60;
  return m + ":" + String(r).padStart(2, "0");
}
async function handleVideoQ(body, env, cors) {
  const url = String(body.url || "");
  const from = Number(body.from || 0), to = Number(body.to || 0);
  const count = Math.min(Math.max(parseInt(body.count) || 5, 1), 10);
  if (!url) return json({ error: "Missing video url" }, 400, cors);
  const vid = ytVideoId(url);
  let source = "";
  if (vid) {
    let events = [];
    const wantLang = body.language === "ar" ? "ar" : "en";
    try { events = await fetchSupadataTranscript(vid, wantLang, env); } catch (e) {}
    if (!events || !events.length) {
      try { events = await fetchYouTubeTranscript(vid, wantLang); } catch (e) {}
    }
    if (events && events.length) source = sliceTranscript(events, from, to);
  } else if (env.GROQ_KEY) {
    try { source = await groqTranscribe(url, env); } catch (e) {}
  }
  if (!source || source.trim().length < 40) {
    const msg = vid
      ? "This YouTube video has no usable captions, so it cannot be read automatically. Please pick a video that has captions/subtitles, or add the questions manually."
      : "We could not transcribe this video. Make sure the file link is public and reasonably short, or add the questions manually.";
    return json({ error: msg, detail: "no_transcript" }, 422, cors);
  }
  return handleGenerate(Object.assign({}, body, { source: source, topic: "", count: count }), env, cors);
}

function ytVideoId(url) {
  const m = String(url || "").match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([\w-]{6,})/);
  return m ? m[1] : "";
}

function extractArrayAfter(str, key) {
  const k = str.indexOf(key);
  if (k < 0) return null;
  const start = str.indexOf("[", k);
  if (start < 0) return null;
  const BSLASH = 92, DQ = 34, LB = 91, RB = 93;
  let depth = 0, inStr = false, esc = false;
  for (let j = start; j < str.length; j++) {
    const cc = str.charCodeAt(j);
    if (inStr) { if (esc) esc = false; else if (cc === BSLASH) esc = true; else if (cc === DQ) inStr = false; }
    else { if (cc === DQ) inStr = true; else if (cc === LB) depth++; else if (cc === RB) { depth--; if (depth === 0) return str.slice(start, j + 1); } }
  }
  return null;
}

async function fetchSupadataTranscript(vid, lang, env) {
  if (!env.SUPADATA_KEY) return [];
  const base = "https://api.supadata.ai/v1/youtube/transcript?videoId=" + encodeURIComponent(vid);
  const opts = { headers: { "x-api-key": env.SUPADATA_KEY } };
  let r = await tfetch(base + "&lang=" + encodeURIComponent(lang), opts, 20000);
  if (!r || !r.ok) r = await tfetch(base, opts, 20000);
  if (!r || !r.ok) return [];
  let d;
  try { d = await r.json(); } catch (e) { return []; }
  const arr = (d && Array.isArray(d.content)) ? d.content : [];
  return arr.map((c) => ({
    start: Number(c.offset || 0) / 1000,
    text: String(c.text || "").replace(/\s+/g, " ").trim(),
  })).filter((e) => e.text);
}

async function fetchYouTubeTranscript(vid, lang) {
  const page = await tfetch("https://www.youtube.com/watch?v=" + vid + "&hl=en&bpctr=9999999999", { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36", "Accept-Language": "en-US,en;q=0.9", "Cookie": "CONSENT=YES+cb" } }, 15000);
  if (!page || !page.ok) return [];
  const html = await page.text();
  const arrStr = extractArrayAfter(html, '"captionTracks":');
  if (!arrStr) return [];
  let tracks;
  try { tracks = JSON.parse(arrStr); } catch (e) { return []; }
  if (!tracks || !tracks.length) return [];
  const byLang = (l, asr) => tracks.find((t) => t.languageCode === l && (asr ? true : t.kind !== "asr"));
  const pick = byLang(lang, false) || byLang(lang, true) || byLang("en", false) || byLang("en", true) || tracks[0];
  if (!pick || !pick.baseUrl) return [];
  const capRes = await tfetch(pick.baseUrl + "&fmt=json3", {}, 15000);
  if (!capRes || !capRes.ok) return [];
  let cap;
  try { cap = await capRes.json(); } catch (e) { return []; }
  const events = (cap.events || []).filter((e) => e.segs).map((e) => ({
    start: (e.tStartMs || 0) / 1000,
    text: e.segs.map((s) => s.utf8 || "").join("").replace(/\s+/g, " ").trim(),
  })).filter((e) => e.text);
  return events;
}

function sliceTranscript(events, from, to) {
  let sel = events;
  if (to > from) sel = events.filter((e) => e.start >= Math.max(0, from - 5) && e.start <= to + 2);
  if (!sel.length) sel = events;
  return sel.map((e) => e.text).join(" ").replace(/\s+/g, " ").trim().slice(0, 14000);
}

async function groqTranscribe(url, env) {
  const media = await tfetch(url, {}, 20000);
  if (!media || !media.ok) return "";
  const buf = await media.arrayBuffer();
  if (buf.byteLength > 24 * 1024 * 1024) return "";
  const fd = new FormData();
  fd.append("file", new Blob([buf]), "audio.mp4");
  fd.append("model", env.GROQ_STT_MODEL || "whisper-large-v3-turbo");
  fd.append("response_format", "text");
  const r = await tfetch("https://api.groq.com/openai/v1/audio/transcriptions", { method: "POST", headers: { Authorization: "Bearer " + env.GROQ_KEY }, body: fd }, 25000);
  if (!r || !r.ok) return "";
  return (await r.text()).slice(0, 14000);
}


// ========== Questions from a website URL (server fetches the page) ==========
async function handleUrlQ(body, env, cors) {
  const url = String(body.url || "");
  if (!/^https?:\/\//i.test(url)) return json({ error: "Enter a valid http(s) URL." }, 400, cors);
  let text = "";
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; QuizUpsBot/1.0)" } });
    const html = await res.text();
    text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&[a-z#0-9]+;/gi, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 14000);
  } catch (e) {
    return json({ error: "Could not fetch that URL." }, 502, cors);
  }
  if (text.length < 50) return json({ error: "No readable text found at that URL." }, 422, cors);
  return handleGenerate({ ...body, source: text, topic: body.topic || "" }, env, cors);
}


// ========== R2 media: upload + serve ==========
async function handleUpload(request, env, cors) {
  if (!env.MEDIA) return json({ error: "R2 not configured on this Worker (add an R2 binding named MEDIA)." }, 501, cors);
  const ct = (request.headers.get("Content-Type") || "application/octet-stream").split(";")[0];
  const buf = await request.arrayBuffer();
  if (buf.byteLength > 20 * 1024 * 1024) return json({ error: "File too large (max 20 MB)." }, 413, cors);
  const ext = (ct.split("/")[1] || "bin").replace(/[^a-z0-9]/gi, "").slice(0, 5) || "bin";
  const key = "u/" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10) + "." + ext;
  await env.MEDIA.put(key, buf, { httpMetadata: { contentType: ct } });
  const base = env.MEDIA_BASE || new URL(request.url).origin;
  return json({ url: base.replace(/\/$/, "") + "/media/" + key }, 200, cors);
}
async function handleMedia(request, env) {
  if (!env.MEDIA) return new Response("Not configured", { status: 501 });
  const key = new URL(request.url).pathname.replace(/^\/media\//, "");
  if (!key) return new Response("Bad request", { status: 400 });
  const obj = await env.MEDIA.get(key);
  if (!obj) return new Response("Not found", { status: 404 });
  const h = new Headers();
  obj.writeHttpMetadata(h);
  h.set("etag", obj.httpEtag);
  h.set("Cache-Control", "public, max-age=31536000, immutable");
  h.set("Access-Control-Allow-Origin", "*");
  h.set("Accept-Ranges", "bytes");
  return new Response(obj.body, { headers: h });
}

// ========== Groq fallback (OpenAI-compatible, free) ==========
// Enable by adding a Worker secret GROQ_KEY (from console.groq.com).
// Optional: GROQ_MODEL to force a model.
async function tryGroq(prompt, env, cors) {
  if (!env.GROQ_KEY) return null;
  const models = env.GROQ_MODEL ? [env.GROQ_MODEL] : ["openai/gpt-oss-20b", "openai/gpt-oss-120b", "llama-3.3-70b-versatile"];
  const sys = "You generate quiz questions. Respond ONLY with a valid JSON object where questions is an array; each element has text (string), options (an array of exactly 4 strings), and correctIndex (0-based integer of the correct option). No prose, no markdown.";
  for (const model of models) {
    try {
      const r = await tfetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + env.GROQ_KEY },
        body: JSON.stringify({
          model,
          messages: [{ role: "system", content: sys }, { role: "user", content: prompt }],
          response_format: { type: "json_object" },
          temperature: 0.9,
        }),
      });
      if (!r) { continue; }
      if (!r.ok) { await new Promise((x) => setTimeout(x, 200)); continue; }
      const data = await r.json();
      const text = (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "{}";
      const parsed = JSON.parse(text);
      if (parsed && Array.isArray(parsed.questions) && parsed.questions.length) {
        parsed._model = "groq:" + model;
        return json(parsed, 200, cors);
      }
    } catch (e) { /* try next model */ }
  }
  return null;
}

async function tryOpenRouter(prompt, env, cors) {
  if (!env.OPENROUTER_KEY) return null;
  const models = env.OPENROUTER_MODEL ? [env.OPENROUTER_MODEL] : [
    "deepseek/deepseek-chat-v3-0324:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "google/gemini-2.0-flash-exp:free",
  ];
  const sys = "You generate quiz questions. Respond ONLY with a valid JSON object where questions is an array; each element has text (string), options (an array of exactly 4 strings), and correctIndex (0-based integer of the correct option). No prose, no markdown.";
  for (const model of models) {
    try {
      const r = await tfetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + env.OPENROUTER_KEY, "HTTP-Referer": "https://quizups.com", "X-Title": "QuizUps" },
        body: JSON.stringify({
          model: model,
          messages: [{ role: "system", content: sys }, { role: "user", content: prompt }],
          response_format: { type: "json_object" },
          temperature: 0.9,
        }),
      }, 14000);
      if (!r) continue;
      if (!r.ok) { await new Promise(function (x) { setTimeout(x, 200); }); continue; }
      const data = await r.json();
      const text = (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "{}";
      const parsed = JSON.parse(text);
      if (parsed && Array.isArray(parsed.questions) && parsed.questions.length) {
        parsed._model = "openrouter:" + model;
        return json(parsed, 200, cors);
      }
    } catch (e) { /* try next model */ }
  }
  return null;
}

// ========== Email alert on total AI failure (rate-limited to 1/hour) ==========
// Reuses EmailJS. Add Worker vars: ALERT_EMAIL, EMAILJS_SERVICE, EMAILJS_TEMPLATE,
// EMAILJS_PUBLIC, and secret EMAILJS_PRIVATE. Uses R2 (MEDIA) to rate-limit.
async function maybeAlert(env, what, detail) {
  try {
    if (!env.RESEND_KEY || !env.ALERT_EMAIL) return;
    const now = Date.now();
    if (env.MEDIA) {
      const o = await env.MEDIA.get("alerts/last-ai-alert.txt");
      const last = o ? (parseInt(await o.text()) || 0) : 0;
      if (now - last < 3600000) return; // already alerted within the last hour
      await env.MEDIA.put("alerts/last-ai-alert.txt", String(now));
    }
    const message = "QuizUps AI alert: " + what + " failed across all providers (Gemini + Groq).\n\nDetail: " + String(detail || "").slice(0, 300) + "\nTime: " + new Date().toISOString() + "\n\nCheck the Cloudflare Worker and model names.";
    await sendEmail(env, env.ALERT_EMAIL, "QuizUps AI alert", "<pre>" + message + "</pre>");
  } catch (e) { /* never break generation because of an alert */ }
}

// Fetch with a hard timeout so a hanging provider can't stall the whole Worker (avoids Cloudflare 524).
async function tfetch(url, opts, ms) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms || 12000);
  try { return await fetch(url, Object.assign({}, opts, { signal: ctrl.signal })); }
  catch (e) { return null; }
  finally { clearTimeout(id); }
}

// ========== Email via Resend (white-label, sends as noreply@quizups.com) ==========
async function sendEmail(env, to, subject, html, from) {
  if (!env.RESEND_KEY) return { ok: false, reason: "RESEND_KEY not set" };
  try {
    const r = await tfetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + env.RESEND_KEY },
      body: JSON.stringify({
        from: from || env.MAIL_FROM || "QuizUps <noreply@quizups.com>",
        to: Array.isArray(to) ? to : [to],
        subject: subject,
        html: html,
      }),
    }, 12000);
    if (!r) return { ok: false, reason: "timeout" };
    const t = await r.text();
    return { ok: r.ok, status: r.status, detail: t.slice(0, 200) };
  } catch (e) { return { ok: false, error: String(e).slice(0, 150) }; }
}

async function handleEmail(body, env, cors) {
  const to = body.to;
  const subject = String(body.subject || "QuizUps").slice(0, 200);
  let html = String(body.html || body.message || "");
  if (!to || !html) return json({ ok: false, error: "Missing to/html" }, 400, cors);
  const base = env.WORKER_BASE || "https://polished-shadow-f08c.yassow.workers.dev";
  const recip = Array.isArray(to) ? to[0] : String(to);
  if (body.campaignId && await isUnsubscribed(env, recip)) {
    await logEvent(env, { type: "email", ok: true, provider: "skipped", to: recip, subject: subject, detail: "unsubscribed" });
    return json({ ok: true, skipped: true, provider: "skipped" }, 200, cors);
  }
  if (body.campaignId) html = injectTracking(html, base, body.campaignId, recip);
  const provider = body.provider || "resend";
  let res, used = "resend";
  if (provider === "hubspot" && env.HUBSPOT_TOKEN && body.hubspotEmailId) {
    res = await hubspotSingleSend(env, recip, body.hubspotEmailId);
    if (res.ok) { used = "hubspot"; }
    else { res = await sendEmail(env, to, subject, html, body.from); used = "resend"; }
  } else {
    res = await sendEmail(env, to, subject, html, body.from);
    used = "resend";
  }
  await logEvent(env, { type: "email", ok: !!res.ok, provider: used, to: recip, subject: subject, detail: res.detail || res.reason || res.error || "" });
  return json(Object.assign({}, res, { provider: used }), res.ok ? 200 : 502, cors);
}

// HubSpot transactional single-send (requires Marketing Hub transactional add-on + a template emailId)
async function hubspotSingleSend(env, to, emailId) {
  try {
    const r = await tfetch("https://api.hubapi.com/marketing/v3/transactional/single-email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + env.HUBSPOT_TOKEN },
      body: JSON.stringify({ emailId: Number(emailId), message: { to: to } }),
    }, 12000);
    if (!r) return { ok: false, reason: "timeout" };
    return { ok: r.ok, status: r.status, detail: (await r.text()).slice(0, 200) };
  } catch (e) { return { ok: false, error: String(e).slice(0, 150) }; }
}

// Inject open pixel + rewrite links through /track for open/click analytics (provider-independent)
function injectTracking(html, base, cid, to) {
  if (!cid) return html;
  const e = encodeURIComponent(to || "");
  const c = encodeURIComponent(cid);
  let out = html.replace(/href="(https?:\/\/[^"]+)"/g, function (m, url) {
    return 'href="' + base + '/track?c=' + c + '&e=' + e + '&t=c&u=' + encodeURIComponent(url) + '"';
  });
  out += '<hr style="border:none;border-top:1px solid #eee;margin:24px 0"><p style="font-size:12px;color:#999;text-align:center">You received this because you signed up for QuizUps. <a href="' + base + '/unsub?e=' + e + '" style="color:#999">Unsubscribe</a></p>';
  out += '<img src="' + base + '/track?c=' + c + '&e=' + e + '&t=o" width="1" height="1" style="display:none" alt="">';
  return out;
}

async function handleTrack(request, env) {
  const u = new URL(request.url);
  const cid = u.searchParams.get("c") || "unknown";
  const e = u.searchParams.get("e") || "";
  const t = u.searchParams.get("t") || "o";
  const dest = u.searchParams.get("u");
  try {
    if (env.MEDIA) {
      const key = "track/" + cid + "/" + Date.now() + "-" + Math.random().toString(36).slice(2, 7) + ".json";
      await env.MEDIA.put(key, JSON.stringify({ c: cid, e: e, t: t, ts: Date.now() }), { httpMetadata: { contentType: "application/json" } });
    }
  } catch (err) {}
  if (t === "c" && dest) return new Response(null, { status: 302, headers: { Location: decodeURIComponent(dest) } });
  const gif = Uint8Array.from(atob("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"), function (ch) { return ch.charCodeAt(0); });
  return new Response(gif, { headers: { "Content-Type": "image/gif", "Cache-Control": "no-store" } });
}

async function handleStats(body, env, cors) {
  const cid = String(body.campaignId || "");
  if (!cid || !env.MEDIA) return json({ opens: 0, clicks: 0, uniqueOpens: 0, uniqueClicks: 0 }, 200, cors);
  const listed = await env.MEDIA.list({ prefix: "track/" + cid + "/", limit: 1000 });
  let opens = 0, clicks = 0; const oSet = {}, cSet = {};
  for (const o of (listed.objects || [])) {
    const g = await env.MEDIA.get(o.key);
    if (!g) continue;
    try { const r = JSON.parse(await g.text()); if (r.t === "o") { opens++; oSet[r.e] = 1; } else if (r.t === "c") { clicks++; cSet[r.e] = 1; } } catch (err) {}
  }
  return json({ opens: opens, clicks: clicks, uniqueOpens: Object.keys(oSet).length, uniqueClicks: Object.keys(cSet).length }, 200, cors);
}

// ========== Event log stored in R2 (successes + failures) ==========
async function logEvent(env, ev) {
  try {
    if (!env.MEDIA) return;
    const ts = Date.now();
    const rec = Object.assign({ ts: ts, at: new Date(ts).toISOString() }, ev);
    const key = "logs/" + (10000000000000 - ts) + "-" + Math.random().toString(36).slice(2, 7) + ".json";
    await env.MEDIA.put(key, JSON.stringify(rec), { httpMetadata: { contentType: "application/json" } });
  } catch (e) {}
}

async function handleLogs(body, env, cors) {
  if (!env.MEDIA) return json({ logs: [], reason: "R2 not configured" }, 200, cors);
  const limit = Math.min(Math.max(parseInt(body.limit) || 50, 1), 200);
  const listed = await env.MEDIA.list({ prefix: "logs/", limit: limit });
  const logs = [];
  for (const o of (listed.objects || [])) {
    const g = await env.MEDIA.get(o.key);
    if (g) { try { logs.push(JSON.parse(await g.text())); } catch (e) {} }
  }
  return json({ logs: logs, count: logs.length }, 200, cors);
}

// ========== HubSpot CRM sync (contact upsert via Private App token) ==========
async function handleHubspot(body, env, cors) {
  if (!env.HUBSPOT_TOKEN) return json({ ok: false, error: "HUBSPOT_TOKEN not set" }, 200, cors);
  const email = String(body.email || "").trim().toLowerCase();
  if (!email) return json({ ok: false, error: "email required" }, 400, cors);
  const props = Object.assign({ email: email }, body.props || {});
  const H = { "Content-Type": "application/json", "Authorization": "Bearer " + env.HUBSPOT_TOKEN };
  let r = await tfetch("https://api.hubapi.com/crm/v3/objects/contacts/" + encodeURIComponent(email) + "?idProperty=email", { method: "PATCH", headers: H, body: JSON.stringify({ properties: props }) }, 12000);
  if (r && r.status === 404) {
    r = await tfetch("https://api.hubapi.com/crm/v3/objects/contacts", { method: "POST", headers: H, body: JSON.stringify({ properties: props }) }, 12000);
  }
  const ok = !!(r && r.ok);
  const detail = r ? (await r.text()).slice(0, 200) : "timeout";
  await logEvent(env, { type: "hubspot", ok: ok, to: email, detail: detail });
  return json({ ok: ok, detail: detail }, ok ? 200 : 502, cors);
}

// ========== Feedback (complaint / recommendation / etc.) -> alert admin only ==========
async function handleFeedback(body, env, cors) {
  const ftype = String(body.ftype || "feedback").slice(0, 40);
  const message = String(body.message || "").slice(0, 4000);
  const from = String(body.email || "anonymous").slice(0, 120);
  if (!message) return json({ ok: false, error: "empty" }, 400, cors);
  const safe = message.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const html = "<h3>New QuizUps " + ftype + "</h3><p><b>From:</b> " + from + "</p><p>" + safe + "</p><p style='color:#888'>" + new Date().toISOString() + "</p>";
  let res = { ok: false };
  if (env.RESEND_KEY && env.ALERT_EMAIL) res = await sendEmail(env, env.ALERT_EMAIL, "QuizUps " + ftype + " from " + from, html);
  await logEvent(env, { type: "feedback", ok: true, topic: ftype, detail: from });
  return json({ ok: true, emailed: !!res.ok }, 200, cors);
}

async function isUnsubscribed(env, email) {
  try {
    if (!env.MEDIA) return false;
    const o = await env.MEDIA.get("unsub/" + encodeURIComponent(String(email).toLowerCase()));
    return !!o;
  } catch (e) { return false; }
}

async function handleUnsub(request, env) {
  const u = new URL(request.url);
  const email = (u.searchParams.get("e") || "").toLowerCase();
  const page = function (msg) {
    return new Response("<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'><title>Unsubscribe — QuizUps</title><div style=\"font-family:system-ui,sans-serif;max-width:480px;margin:80px auto;text-align:center;padding:24px\"><h1 style=\"font-size:22px\">QuizUps</h1><p style=\"color:#444;font-size:16px\">" + msg + "</p></div>", { headers: { "Content-Type": "text/html" } });
  };
  if (!email) return page("Invalid unsubscribe link.");
  try {
    if (env.MEDIA) await env.MEDIA.put("unsub/" + encodeURIComponent(email), JSON.stringify({ email: email, ts: Date.now() }), { httpMetadata: { contentType: "application/json" } });
    await logEvent(env, { type: "unsubscribe", ok: true, to: email });
  } catch (e) {}
  return page("You've been unsubscribed. You won't receive any more marketing emails from us. Sorry to see you go!");
}

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}