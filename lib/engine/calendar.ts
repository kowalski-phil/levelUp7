import { addDays, diffDays, type ISODate } from "./dates";

export interface UnitInput {
  code: string;
  subject: string;
  hours: number;
  orderIndex: number;
  /** Reihenfolge im Unterricht, falls sie vom Lehrplan abweicht (z. B. Mathe: Daten und Zufall zuerst). */
  scheduleOrder?: number;
}

export interface ScheduleEntry {
  subject: string;
  unitCode: string;
  weekFrom: number;
  weekTo: number;
}

/** Deutsch und Englisch haben keine feste Reihenfolge: alle Gebiete laufen das ganze Jahr, Skills rotieren wöchentlich. */
export const ROTATING_SUBJECTS: ReadonlySet<string> = new Set(["D", "E"]);

/** Neustoff endet 6 Wochen vor der ersten Prüfung, danach Prüfungsmodus. */
export const EXAM_PREP_DAYS = 42;

export function newContentEnd(examDate: ISODate): ISODate {
  return addDays(examDate, -EXAM_PREP_DAYS);
}

export function totalWeeks(start: ISODate, end: ISODate): number {
  return Math.max(1, Math.ceil(diffDays(end, start) / 7));
}

/** Schulwoche (1-basiert) eines Datums relativ zum Schuljahresbeginn. */
export function weekOf(date: ISODate, start: ISODate): number {
  return Math.max(1, Math.floor(diffDays(date, start) / 7) + 1);
}

export function isExamMode(date: ISODate, examDate: ISODate): boolean {
  return date >= newContentEnd(examDate);
}

/**
 * Verteilt die Lernbereiche jedes Fachs in Lehrplan-Reihenfolge proportional zu ihren Stunden auf die Wochen.
 * Grenzen über kumuliertes Runden, jeder Lernbereich bekommt mindestens eine Woche.
 */
export function buildSchedule(units: readonly UnitInput[], start: ISODate, examDate: ISODate): ScheduleEntry[] {
  const weeks = totalWeeks(start, newContentEnd(examDate));
  const bySubject = new Map<string, UnitInput[]>();
  for (const u of units) bySubject.set(u.subject, [...(bySubject.get(u.subject) ?? []), u]);

  const out: ScheduleEntry[] = [];
  for (const [subject, list] of bySubject) {
    const sorted = [...list].sort((a, b) => (a.scheduleOrder ?? a.orderIndex) - (b.scheduleOrder ?? b.orderIndex));
    if (ROTATING_SUBJECTS.has(subject)) {
      for (const u of sorted) out.push({ subject, unitCode: u.code, weekFrom: 1, weekTo: weeks });
      continue;
    }
    const totalHours = sorted.reduce((s, u) => s + u.hours, 0);
    let cum = 0;
    let prevEnd = 0;
    sorted.forEach((u, i) => {
      cum += u.hours;
      const remaining = sorted.length - 1 - i;
      let end = i === sorted.length - 1 ? weeks : Math.round((cum / totalHours) * weeks);
      end = Math.min(Math.max(end, prevEnd + 1), weeks - remaining);
      out.push({ subject, unitCode: u.code, weekFrom: prevEnd + 1, weekTo: end });
      prevEnd = end;
    });
  }
  return out;
}

/** Gebiete eines Fachs, die in dieser Woche laufen. Nach dem Plan-Ende bleibt das letzte Gebiet aktiv. */
export function activeUnits(schedule: readonly ScheduleEntry[], subject: string, week: number): ScheduleEntry[] {
  const own = schedule.filter((s) => s.subject === subject);
  const active = own.filter((s) => s.weekFrom <= week && week <= s.weekTo);
  if (active.length || !own.length) return active;
  const last = Math.max(...own.map((s) => s.weekTo));
  return own.filter((s) => s.weekTo === last);
}

/**
 * In geordneten Fächern werden die Skills eines Gebiets nacheinander freigeschaltet,
 * gleichmäßig über die Wochen des Gebiets verteilt.
 */
export function unlockedSkillCount(entry: ScheduleEntry, week: number, skillCount: number): number {
  const span = entry.weekTo - entry.weekFrom + 1;
  const elapsed = Math.min(Math.max(week - entry.weekFrom, 0), span - 1);
  return Math.min(skillCount, Math.floor((elapsed * skillCount) / span) + 1);
}
