// Alle Datumswerte in der Engine sind Kalendertage als "YYYY-MM-DD" (Zeitzone Europe/Berlin).

export type ISODate = string;

const DAY_MS = 86_400_000;

function toUtcMs(date: ISODate): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUtcMs(ms: number): ISODate {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(date: ISODate, days: number): ISODate {
  return fromUtcMs(toUtcMs(date) + days * DAY_MS);
}

/** Anzahl Tage von b nach a (a - b). */
export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((toUtcMs(a) - toUtcMs(b)) / DAY_MS);
}

export function todayInBerlin(now: Date = new Date()): ISODate {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
