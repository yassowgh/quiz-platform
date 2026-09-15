/**
 * Fails the build when a t("…") key used in src/ has no entry in TRANSLATIONS,
 * or when an entry is missing a non-English translation, or is duplicated.
 * 105 strings shipped untranslated before this check existed.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith(".ts") || p.endsWith(".tsx")) files.push(p);
  }
})("src");

const i18n = readFileSync("src/lib/i18n.ts", "utf8");
const entries = new Map();
const counts = new Map();
const KEY = /(?:^|\n)\s*(?:"((?:[^"\\]|\\.)*)"|([A-Za-z_][A-Za-z0-9_]*))\s*:\s*\{([^}]*)\}/g;
let m;
while ((m = KEY.exec(i18n))) {
  const body = m[3];
  if (!/\ben\s*:/.test(body)) continue;
  const key = m[1] !== undefined ? m[1] : m[2];
  entries.set(key, body);
  counts.set(key, (counts.get(key) || 0) + 1);
}

let bad = false;
for (const [k, n] of counts) if (n > 1) { bad = true; console.error("x duplicate key: " + JSON.stringify(k) + " (x" + n + ")"); }
for (const [k, body] of entries) {
  if (!/\bar\s*:\s*"/.test(body)) { bad = true; console.error("x " + JSON.stringify(k) + " missing ar"); }
  if (!/\buk\s*:\s*"/.test(body)) { bad = true; console.error("x " + JSON.stringify(k) + " missing uk"); }
}
const USE = /\bt\(\s*"((?:[^"\\]|\\.)*)"\s*\)/g;
for (const f of files) {
  if (f.endsWith("i18n.ts")) continue;
  const txt = readFileSync(f, "utf8");
  let u;
  while ((u = USE.exec(txt))) if (!entries.has(u[1])) { bad = true; console.error("x key " + JSON.stringify(u[1]) + " used in " + f + " but not in i18n.ts"); }
}
if (bad) { console.error("\ni18n check failed - add the key(s) to src/lib/i18n.ts.\n"); process.exit(1); }
console.log("i18n OK: " + entries.size + " keys present with ar/uk translations");
