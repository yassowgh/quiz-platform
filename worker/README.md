# The QuizUps Cloudflare Worker

Backend for quizups.com: AI question generation, exam sealing and grading,
transactional email, R2 media upload and serving, error logging, CRM proxying.

Until now this file existed **only inside Cloudflare** - no history, no backup,
no way to review a change before it went live. It lives here now so that it can
be diffed and rolled back like everything else.

## Where it runs

| | |
|---|---|
| Worker | `polished-shadow-f08c` |
| URL | https://polished-shadow-f08c.yassow.workers.dev/ |
| Account | `2cdc8ee626e0062dae4bb8a6242ad16f` |
| Format | ES module, `main_module: "worker.js"` |
| Compatibility date | `2026-07-25` |
| Origin gate | requests must come from `ALLOWED_ORIGIN` (quizups.com) |

## This file is NOT deployed automatically

Nothing in CI pushes it. Editing it here changes nothing until you deploy it
by hand. **Cloudflare is the source of truth for what is actually running** -
if someone edits the Worker in the dashboard, this copy goes stale.

## Deploying

Cloudflare dashboard - Workers & Pages - `polished-shadow-f08c` - Edit code -
paste this file - Deploy. Bindings and secrets are attached to the Worker, not
to the code, so they survive a deploy from the editor.

Before you deploy, check the script parses. In a browser console:

```js
new Function(source.replace(/export\s+default\s+/, "const x = "))
```

A Worker that fails to parse takes the whole backend down - AI generation, exam
grading, email and media all stop. Keep the previous version to paste back.

## Bindings (16 - all must survive a deploy)

Plain text: `ALERT_EMAIL`, `ALLOWED_ORIGIN`, `EMAILJS_PUBLIC`, `EMAILJS_SERVICE`,
`EMAILJS_TEMPLATE`, `MAIL_FROM`, `WORKER_BASE`

Secrets: `EMAILJS_PRIVATE`, `ENC_KEY`, `GEMINI_KEY`, `GROQ_KEY`, `HUBSPOT_TOKEN`,
`OPENROUTER_KEY`, `RESEND_KEY`, `SUPADATA_KEY`

R2: `MEDIA` (bucket `quizups-media`)

Deploying via the API rather than the dashboard? Send every binding as
`{"type":"inherit","name":"X"}` so secrets are preserved without knowing them.

The code also reads five optional overrides that are **not** currently set, and
falls back to defaults when they are absent: `MODEL`, `GROQ_MODEL`,
`GROQ_STT_MODEL`, `OPENROUTER_MODEL`, `MEDIA_BASE`.

## Modes (POST JSON with `mode`)

`generate` (default) · `videoq` · `urlq` · `seal` · `grade` · `email` ·
`hubspot` · `feedback` · `stats` · `logs` · `errors`

Plus routes: `POST /upload` (R2), `GET /media/*`, `/track`, `/unsub`.

## Storage layout in R2

| Prefix | What |
|---|---|
| `logs/` | One JSON object per event, keyed by reverse timestamp so a list returns newest first. Nothing is deleted. |
| `errstats/` | One object per error fingerprint: running count, affected accounts, timestamps of the last hour. |
| `alerts/` | Throttle markers so an alert email cannot fire more than once an hour. |
| (media) | Uploaded images and logos served back through `/media/*`. |
