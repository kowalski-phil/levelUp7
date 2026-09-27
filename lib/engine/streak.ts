import { addDays, diffDays, type ISODate } from "./dates";

export interface StreakState {
  current: number;
  longest: number;
  jokers: number;
  lastCompletedDate: ISODate | null;
}

export const MAX_JOKERS = 2;
/** Alle 14 Streak-Tage gibt es einen Joker (Phil, 2026-09-26: 7 war zu großzügig). */
export const JOKER_EVERY = 14;

export function initialStreak(): StreakState {
  return { current: 0, longest: 0, jokers: 0, lastCompletedDate: null };
}

/**
 * Wendet verpasste Tage zwischen dem letzten abgeschlossenen Tag und heute an.
 * Pro verpasstem Tag wird ein Joker verbraucht, ohne Joker fällt der Streak auf 0.
 * Rein und idempotent: hängt nur vom gespeicherten Zustand und dem Datum ab.
 */
export function reconcile(state: StreakState, today: ISODate): { state: StreakState; jokersUsed: number } {
  if (!state.lastCompletedDate) return { state, jokersUsed: 0 };
  const missed = diffDays(today, state.lastCompletedDate) - 1;
  if (missed <= 0) return { state, jokersUsed: 0 };

  let { current, jokers } = state;
  let jokersUsed = 0;
  for (let i = 0; i < missed && current > 0; i++) {
    if (jokers > 0) {
      jokers -= 1;
      jokersUsed += 1;
    } else {
      current = 0;
    }
  }
  return { state: { ...state, current, jokers }, jokersUsed };
}

export interface CompletionResult {
  state: StreakState;
  counted: boolean;
  jokerEarned: boolean;
  jokersUsed: number;
}

/** Tagessession abgeschlossen: verpasste Tage verrechnen, dann Streak +1. */
export function completeDay(stored: StreakState, today: ISODate): CompletionResult {
  if (stored.lastCompletedDate === today) {
    return { state: stored, counted: false, jokerEarned: false, jokersUsed: 0 };
  }
  const { state, jokersUsed } = reconcile(stored, today);
  const current = state.current + 1;
  const jokerEarned = current % JOKER_EVERY === 0 && state.jokers < MAX_JOKERS;
  return {
    state: {
      current,
      longest: Math.max(state.longest, current),
      jokers: jokerEarned ? state.jokers + 1 : state.jokers,
      lastCompletedDate: today,
    },
    counted: true,
    jokerEarned,
    jokersUsed,
  };
}

/** Streak, wie er heute angezeigt wird (verpasste Tage bis gestern verrechnet). */
export function displayStreak(stored: StreakState, today: ISODate): StreakState {
  return reconcile(stored, today).state;
}

export type DayMark = "done" | "saved";

/**
 * Markierung je Kalendertag für die Streak-Anzeige: "done" = Runde geschafft, "saved" = von einem Joker gerettet.
 * Tage ohne Eintrag waren verpasst (oder liegen vor dem ersten Streak). Spielt den Verlauf mit denselben Regeln nach,
 * inklusive der verpassten Tage bis gestern.
 */
export function dayMarks(completedDates: readonly ISODate[], today: ISODate): Map<ISODate, DayMark> {
  const marks = new Map<ISODate, DayMark>();
  const dates = [...new Set(completedDates)].filter((d) => d <= today).sort();
  let state = initialStreak();
  const markSaved = (from: ISODate | null, count: number) => {
    if (!from) return;
    for (let i = 1; i <= count; i++) marks.set(addDays(from, i), "saved");
  };
  for (const d of dates) {
    const before = state.lastCompletedDate;
    const r = completeDay(state, d);
    markSaved(before, r.jokersUsed);
    marks.set(d, "done");
    state = r.state;
  }
  const { jokersUsed } = reconcile(state, today);
  markSaved(state.lastCompletedDate, jokersUsed);
  return marks;
}

export type WeekDayStatus = "done" | "saved" | "today" | "missed" | "future" | "before";

export interface WeekDay {
  date: ISODate;
  label: string;
  status: WeekDayStatus;
}

const WEEKDAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

/** Montag der Woche, in der das Datum liegt. */
export function mondayOf(date: ISODate): ISODate {
  const [y, m, d] = date.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sonntag
  return addDays(date, -((dow + 6) % 7));
}

/**
 * Die aktuelle Woche (Mo bis So) für die Streak-Anzeige.
 * "before" = vor dem ersten geschafften Tag überhaupt (weder Flamme noch Lücke anzeigen).
 */
export function weekView(marks: ReadonlyMap<ISODate, DayMark>, today: ISODate): WeekDay[] {
  const first = [...marks.keys()].sort()[0] ?? null;
  const monday = mondayOf(today);
  return WEEKDAY_LABELS.map((label, i) => {
    const date = addDays(monday, i);
    const mark = marks.get(date);
    let status: WeekDayStatus;
    if (mark) status = mark;
    else if (date === today) status = "today";
    else if (date > today) status = "future";
    else if (!first || date < first) status = "before";
    else status = "missed";
    return { date, label, status };
  });
}

/** Wie viele geschaffte Tage bis zum nächsten Joker; null, wenn der Vorrat voll ist. */
export function daysToNextJoker(state: StreakState): number | null {
  if (state.jokers >= MAX_JOKERS) return null;
  return JOKER_EVERY - (state.current % JOKER_EVERY);
}
