import type { ISODate } from "./dates";
import { displayStreak, type StreakState } from "./streak";

export type ReminderSlot = "first" | "second";

/**
 * Stunde (Berlin), in der die Erinnerung rausgeht (Phil, 2026-09-28: 16 und 20 Uhr).
 * Vercel Hobby feuert Cron Jobs irgendwann innerhalb der Stunde, deshalb nur die Stunde.
 */
export const REMINDER_HOUR: Record<ReminderSlot, number> = { first: 16, second: 20 };

export function isReminderSlot(s: string): s is ReminderSlot {
  return s === "first" || s === "second";
}

export function berlinHour(now: Date): number {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Berlin", hour: "2-digit", hourCycle: "h23" }).format(now));
}

export interface ReminderMessage {
  title: string;
  body: string;
  /** Zahl fürs App-Icon (aktueller Streak). */
  badge: number;
}

/**
 * Text der Erinnerung, oder null, wenn heute schon gelernt wurde.
 * Streak wird wie in der App angezeigt (verpasste Tage bis gestern verrechnet).
 */
export function reminderMessage(slot: ReminderSlot, stored: StreakState, today: ISODate): ReminderMessage | null {
  if (stored.lastCompletedDate === today) return null;
  const n = displayStreak(stored, today).current;
  const days = (k: number) => `${k} ${k === 1 ? "Tag" : "Tage"}`;

  if (slot === "first") {
    return {
      title: "Deine 15 Minuten für heute",
      body: n > 0 ? `Dein Streak: ${days(n)}. Mach heute den ${n + 1}. Tag draus.` : "Heute ist Tag 1. Leg los.",
      badge: n,
    };
  }
  return {
    title: "Heute noch offen",
    body: n > 0 ? `15 Minuten, dann steht dein Streak bei ${n + 1} Tagen.` : "15 Minuten reichen für Tag 1.",
    badge: n,
  };
}
