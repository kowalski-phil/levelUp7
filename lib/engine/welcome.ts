import type { ISODate } from "./dates";

/** Cookie mit dem Berlin-Datum, an dem der Willkommens-Screen zuletzt weggeklickt wurde. */
export const WELCOME_SEEN_COOKIE = "willkommen_gesehen";

/**
 * Willkommens-Screen beim ersten Öffnen jedes Tages, bis "Nicht mehr anzeigen" gesetzt ist (onboardedAt).
 * seenOn: Datum aus dem Cookie (pro Gerät).
 */
export function welcomeDue(onboardedAt: string | null, seenOn: string | undefined, today: ISODate): boolean {
  return !onboardedAt && seenOn !== today;
}
