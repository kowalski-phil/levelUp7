import { diffDays, type ISODate } from "./dates";

export interface StreakState {
  current: number;
  longest: number;
  jokers: number;
  lastCompletedDate: ISODate | null;
}

export const MAX_JOKERS = 2;
export const JOKER_EVERY = 7;

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
