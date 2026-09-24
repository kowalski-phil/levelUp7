import type { Result } from "./sm2";

export function xpFor(result: Result): number {
  if (result === "correct") return 10;
  if (result === "partial") return 5;
  if (result === "wrong") return 2;
  return 0;
}

const LEVEL_NAMES = [
  "Azubi",
  "Azubi im 2. Jahr",
  "Sachbearbeiter",
  "Senior-Sachbearbeiter",
  "Teamleiter",
  "Abteilungsleiter",
  "Prokurist",
  "Geschäftsführer",
  "Vorstand",
  "Aufsichtsrat",
];

export function levelFor(xp: number): { level: number; name: string; xpToNext: number } {
  const level = Math.floor(Math.sqrt(Math.max(0, xp) / 100));
  const name = LEVEL_NAMES[level] ?? "Prüfungsboss";
  const nextAt = (level + 1) ** 2 * 100;
  return { level, name, xpToNext: nextAt - xp };
}

/** 0-3 Sterne aus den letzten 10 Antworten eines Skills (neueste zuerst oder beliebig). */
export function starsFor(results: readonly Result[]): number {
  const last = results.slice(-10);
  if (last.length < 3) return 0;
  const score = last.reduce((s, r) => s + (r === "correct" ? 1 : r === "partial" ? 0.5 : 0), 0) / last.length;
  if (score >= 0.9) return 3;
  if (score >= 0.7) return 2;
  if (score >= 0.4) return 1;
  return 0;
}
