import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generatePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function nanoid(length = 12): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export function randomNickname(): string {
  const adjectives = ["Swift", "Bold", "Clever", "Lucky", "Bright", "Cool", "Quick", "Sharp"];
  const animals = ["Fox", "Wolf", "Bear", "Eagle", "Lion", "Tiger", "Hawk", "Panda"];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const animal = animals[Math.floor(Math.random() * animals.length)];
  const num = Math.floor(Math.random() * 100);
  return `${adj}${animal}${num}`;
}

/** Game ids are produced by nanoid(12) from [A-Za-z0-9]. */
export const GAME_ID_LEN = 12;
const GAME_ID_RE = /^[A-Za-z0-9]{12}$/;

export function isValidGameId(id: string | null | undefined): boolean {
  return GAME_ID_RE.test(String(id || ""));
}

/**
 * Normalise whatever ended up in the ?gameId= param or a join box.
 * Players routinely paste a whole join link (sometimes into the middle of an
 * id that was already there), which yields a value containing "." and "/".
 * Firebase rejects those characters in a path and throws, so anything that
 * reaches a ref() call must be cleaned first.
 * Returns "" when nothing id-shaped can be recovered.
 */
export function cleanGameId(raw: string | null | undefined): string {
  const s = String(raw || "").trim();
  if (!s) return "";
  if (GAME_ID_RE.test(s)) return s;
  const tagged = s.match(/gameId=([A-Za-z0-9]{12})/g);
  if (tagged && tagged.length) return tagged[tagged.length - 1].slice("gameId=".length);
  const run = s.match(/[A-Za-z0-9]{12}/);
  return run ? run[0] : "";
}

export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}