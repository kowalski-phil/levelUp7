import { addDays, type ISODate } from "./dates";

export type Result = "correct" | "partial" | "wrong" | "skipped";

export interface SrsState {
  ease: number;
  intervalDays: number;
  reps: number;
  lapses: number;
  dueDate: ISODate;
  lastResult: Result | null;
}

export const PROBLEM_LAPSES = 4;

export function initialSrs(today: ISODate): SrsState {
  return { ease: 2.5, intervalDays: 0, reps: 0, lapses: 0, dueDate: today, lastResult: null };
}

/** Vereinfachtes SM-2 nach PLAN.md 4.3. "skipped" zählt wie falsch. */
export function review(state: SrsState, result: Result, today: ISODate): SrsState {
  let { ease, intervalDays, reps, lapses } = state;

  if (result === "correct") {
    reps += 1;
    intervalDays = reps === 1 ? 1 : reps === 2 ? 3 : Math.round(intervalDays * ease);
    ease = Math.min(2.8, ease + 0.1);
  } else if (result === "partial") {
    intervalDays = Math.max(1, Math.round(intervalDays * 0.5));
    ease = Math.max(1.3, ease - 0.1);
  } else {
    reps = 0;
    intervalDays = 1;
    ease = Math.max(1.3, ease - 0.2);
    lapses += 1;
  }

  ease = Math.round(ease * 100) / 100;
  return { ease, intervalDays, reps, lapses, dueDate: addDays(today, intervalDays), lastResult: result };
}
