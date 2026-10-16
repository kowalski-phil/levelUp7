import { addDays, type ISODate } from "./dates";

export interface StreakState {
  current: number;
  longest: number;
  /** Joker im Vorrat (noch nicht gesetzt). */
  jokers: number;
  lastCompletedDate: ISODate | null;
}

/** Joker setzt Felix selbst (Phil, 2026-10-16): Start mit 2, alle 14 Streak-Tage einer dazu, höchstens 3. */
export const START_JOKERS = 2;
export const MAX_JOKERS = 3;
/** Alle 14 Streak-Tage gibt es einen Joker (Phil, 2026-09-26: 7 war zu großzügig). */
export const JOKER_EVERY = 14;
/** Joker lassen sich für heute und die nächsten 6 Tage setzen. */
export const JOKER_PLAN_DAYS = 7;

export function initialStreak(): StreakState {
  return { current: 0, longest: 0, jokers: START_JOKERS, lastCompletedDate: null };
}

/**
 * Tage seit dem letzten geschafften Tag bis gestern, an denen weder gelernt noch ein Joker gesetzt wurde.
 * Leer, wenn kein Streak läuft (dann gibt es nichts zu retten).
 */
export function missedDays(state: StreakState, jokerDays: readonly ISODate[], today: ISODate): ISODate[] {
  if (!state.lastCompletedDate || state.current === 0) return [];
  const covered = new Set(jokerDays);
  const out: ISODate[] = [];
  for (let d = addDays(state.lastCompletedDate, 1); d < today; d = addDays(d, 1)) if (!covered.has(d)) out.push(d);
  return out;
}

/**
 * Verpasste Tage, die Felix nachträglich mit Jokern retten kann (ein Joker pro Tag), sonst null.
 * Reichen die Joker nicht, ist der Streak weg und es gibt nichts zu entscheiden.
 */
export function pendingRescue(state: StreakState, jokerDays: readonly ISODate[], today: ISODate): ISODate[] | null {
  const days = missedDays(state, jokerDays, today);
  return days.length > 0 && days.length <= state.jokers ? days : null;
}

/** Streak, wie er heute angezeigt wird. Solange eine Rettung möglich ist, bleibt er stehen. */
export function displayStreak(state: StreakState, jokerDays: readonly ISODate[], today: ISODate): StreakState {
  const missed = missedDays(state, jokerDays, today).length;
  return missed > 0 && missed > state.jokers ? { ...state, current: 0 } : state;
}

/** "Joker einsetzen": je verpasstem Tag ein Joker, der Streak läuft weiter. null, wenn nichts zu retten ist. */
export function rescue(
  state: StreakState,
  jokerDays: readonly ISODate[],
  today: ISODate,
): { state: StreakState; days: ISODate[] } | null {
  const days = pendingRescue(state, jokerDays, today);
  return days ? { state: { ...state, jokers: state.jokers - days.length }, days } : null;
}

/** "Nein, neu anfangen": Streak auf 0, die Joker bleiben im Vorrat. */
export function giveUp(state: StreakState, jokerDays: readonly ISODate[], today: ISODate): StreakState | null {
  return pendingRescue(state, jokerDays, today) ? { ...state, current: 0 } : null;
}

/** Tage, für die Felix vorab einen Joker setzen kann: heute und die nächsten 6. */
export function plannableDays(today: ISODate): ISODate[] {
  return Array.from({ length: JOKER_PLAN_DAYS }, (_, i) => addDays(today, i));
}

/** Joker für einen Tag setzen. null, wenn das nicht geht (kein Joker, Tag außerhalb, heute schon gelernt). */
export function setJoker(state: StreakState, jokerDays: readonly ISODate[], date: ISODate, today: ISODate): StreakState | null {
  if (!plannableDays(today).includes(date) || jokerDays.includes(date) || state.jokers <= 0) return null;
  if (date === today && state.lastCompletedDate === today) return null;
  return { ...state, jokers: state.jokers - 1 };
}

/** Gesetzten Joker zurücknehmen, solange der Tag nicht vorbei ist. */
export function removeJoker(state: StreakState, jokerDays: readonly ISODate[], date: ISODate, today: ISODate): StreakState | null {
  if (date < today || !jokerDays.includes(date)) return null;
  return { ...state, jokers: Math.min(MAX_JOKERS, state.jokers + 1) };
}

/** Joker im Vorrat plus die für heute und später gesetzten. Gegen diese Zahl gilt das Maximum. */
export function heldJokers(state: StreakState, jokerDays: readonly ISODate[], today: ISODate): number {
  return state.jokers + jokerDays.filter((d) => d >= today).length;
}

export interface CompletionResult {
  state: StreakState;
  counted: boolean;
  jokerEarned: boolean;
  /** Für heute war ein Joker gesetzt, Felix hat trotzdem gelernt: Joker zurück in den Vorrat. */
  jokerRefunded: boolean;
}

/**
 * Tagessession abgeschlossen: Streak +1. Hat Felix verpasste Tage nicht gerettet, beginnt der Streak neu.
 * Ein für heute gesetzter Joker geht zurück in den Vorrat (das Löschen des Joker-Tags macht die Datenschicht).
 */
export function completeDay(stored: StreakState, jokerDays: readonly ISODate[], today: ISODate): CompletionResult {
  if (stored.lastCompletedDate === today) {
    return { state: stored, counted: false, jokerEarned: false, jokerRefunded: false };
  }
  const base = missedDays(stored, jokerDays, today).length > 0 ? 0 : stored.current;
  const current = base + 1;
  const jokerRefunded = jokerDays.includes(today);
  const jokers = stored.jokers + (jokerRefunded ? 1 : 0);
  const planned = jokerDays.filter((d) => d > today).length;
  const jokerEarned = current % JOKER_EVERY === 0 && jokers + planned < MAX_JOKERS;
  return {
    state: {
      current,
      longest: Math.max(stored.longest, current),
      jokers: jokerEarned ? jokers + 1 : jokers,
      lastCompletedDate: today,
    },
    counted: true,
    jokerEarned,
    jokerRefunded,
  };
}

export type DayMark = "done" | "joker";

/** Markierung je Kalendertag: "done" = Runde geschafft, "joker" = Joker gesetzt (auch für kommende Tage). */
export function dayMarks(completedDates: readonly ISODate[], jokerDays: readonly ISODate[], today: ISODate): Map<ISODate, DayMark> {
  const marks = new Map<ISODate, DayMark>();
  for (const d of jokerDays) marks.set(d, "joker");
  for (const d of completedDates) if (d <= today) marks.set(d, "done");
  return marks;
}

export type WeekDayStatus = "done" | "joker" | "today" | "missed" | "future" | "before";

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

/** Kurzname des Wochentags ("Mo" bis "So"). */
export function weekdayLabel(date: ISODate): string {
  const [y, m, d] = date.split("-").map(Number);
  return WEEKDAY_LABELS[(new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7];
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

/** Wie viele geschaffte Tage bis zum nächsten Joker; null, wenn der Vorrat (inkl. gesetzter) voll ist. */
export function daysToNextJoker(state: StreakState, held = state.jokers): number | null {
  if (held >= MAX_JOKERS) return null;
  return JOKER_EVERY - (state.current % JOKER_EVERY);
}
