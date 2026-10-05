import { ROTATING_SUBJECTS, unlockedSkillCount, weekOf, type ScheduleEntry } from "./calendar";
import { diffDays, type ISODate } from "./dates";
import type { PlannerItem, PlannerState } from "./planner";

/** Eine Schulaufgabe, wie die Engine sie braucht (docs/fokus-modus.md). */
export interface FocusExam {
  id: string;
  subject: string;
  examDate: ISODate;
  number: number;
  skillCodes: readonly string[];
}

export const FOCUS_COUNT = 12;

/** Ohne frühere Schulaufgabe im Fach deckt der Vorschlag etwa die letzten 6 Unterrichtswochen ab. */
export const SUGGEST_WINDOW_WEEKS = 6;

const byCode = (a: PlannerItem, b: PlannerItem) => (a.code < b.code ? -1 : a.code > b.code ? 1 : 0);

// ---------- Aktive Schulaufgaben ----------

/** Schulaufgaben, die heute oder später stattfinden, nächste zuerst. Der Prüfungstag selbst zählt noch. */
export function activeExams<T extends FocusExam>(exams: readonly T[], today: ISODate): T[] {
  return exams
    .filter((e) => e.examDate >= today)
    .sort((a, b) => a.examDate.localeCompare(b.examDate) || a.subject.localeCompare(b.subject) || a.id.localeCompare(b.id));
}

/** Tage bis zur Schulaufgabe: 0 = heute, 1 = morgen. */
export function daysUntil(exam: Pick<FocusExam, "examDate">, today: ISODate): number {
  return diffDays(exam.examDate, today);
}

/** Skills aller aktiven Schulaufgaben, nach Fach vereinigt (für die gefärbte Tagessession). */
export function focusSkillsBySubject(exams: readonly FocusExam[], today: ISODate): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const e of activeExams(exams, today)) {
    const set = out.get(e.subject) ?? new Set<string>();
    for (const code of e.skillCodes) set.add(code);
    out.set(e.subject, set);
  }
  return out;
}

// ---------- Themenvorschlag ----------

export interface SuggestInput {
  subject: string;
  examDate: ISODate;
  schoolYearStart: ISODate;
  schedule: readonly ScheduleEntry[];
  /** Skills des Fachs. */
  skills: readonly { code: string; unitCode: string; orderIndex: number }[];
  /** Letzte frühere Schulaufgabe im selben Fach, sonst null. */
  previousExamDate: ISODate | null;
  /** "Hatten wir noch nicht": wird nicht vorgeschlagen. */
  snoozedSkills: ReadonlySet<string>;
}

/** Erste Woche, in der der k-te Skill (0-basiert) eines Gebiets laut Kalender freigeschaltet ist. */
function unlockWeek(entry: ScheduleEntry, k: number, skillCount: number): number {
  for (let w = entry.weekFrom; w <= entry.weekTo; w++) {
    if (unlockedSkillCount(entry, w, skillCount) > k) return w;
  }
  return entry.weekTo;
}

/**
 * Vorangehakte Skill-Codes für eine neue Schulaufgabe.
 * Fenster: seit der letzten Schulaufgabe im Fach, sonst die letzten 6 Wochen bis zum Termin.
 * Ein Skill ist "dran" von seiner Freischaltung bis kurz vor der Freischaltung des nächsten (der letzte bis Gebietsende).
 * Vorgeschlagen wird, wessen Zeitraum das Fenster schneidet. Rotierende Fächer (bei Paula keine): kein Vorschlag.
 */
export function suggestSkills(input: SuggestInput): string[] {
  if (ROTATING_SUBJECTS.has(input.subject)) return [];
  const examWeek = weekOf(input.examDate, input.schoolYearStart);
  const fromWeek = Math.min(
    examWeek,
    input.previousExamDate
      ? weekOf(input.previousExamDate, input.schoolYearStart) + 1
      : Math.max(1, examWeek - SUGGEST_WINDOW_WEEKS),
  );

  const out: string[] = [];
  const entries = input.schedule
    .filter((s) => s.subject === input.subject && s.weekFrom <= examWeek && s.weekTo >= fromWeek)
    .sort((a, b) => a.weekFrom - b.weekFrom);
  for (const entry of entries) {
    const skills = input.skills.filter((s) => s.unitCode === entry.unitCode).sort((a, b) => a.orderIndex - b.orderIndex);
    const n = skills.length;
    skills.forEach((skill, k) => {
      const from = unlockWeek(entry, k, n);
      const to = k === n - 1 ? entry.weekTo : Math.max(from, unlockWeek(entry, k + 1, n) - 1);
      if (from <= examWeek && to >= fromWeek && !input.snoozedSkills.has(skill.code)) out.push(skill.code);
    });
  }
  return out;
}

// ---------- Abwahl-Warnung ----------

/** Lernbereiche, in denen mehr als die Hälfte der Skills abgewählt ist, obwohl mindestens einer gewählt ist. */
export function overDeselectedUnits(unitSkills: ReadonlyMap<string, readonly string[]>, selected: ReadonlySet<string>): string[] {
  const out: string[] = [];
  for (const [unit, skills] of unitSkills) {
    const chosen = skills.filter((s) => selected.has(s)).length;
    if (chosen > 0 && skills.length - chosen > skills.length / 2) out.push(unit);
  }
  return out;
}

// ---------- Drill-Reihenfolge ----------

/**
 * Alle übergebenen Aufgaben in Drill-Reihenfolge. Fälligkeit spielt keine Rolle.
 * Pro Skill: ungesehene (leichteste zuerst), dann schwache, dann gekonnte (jeweils am längsten überfällige zuerst).
 * Die Skills kommen reihum dran, Start-Skill versetzt um `rotation`, damit jede Runde anders beginnt.
 */
export function rankFocusItems(
  items: readonly PlannerItem[],
  stateById: ReadonlyMap<string, PlannerState>,
  rotation = 0,
): PlannerItem[] {
  const bySkill = new Map<string, PlannerItem[]>();
  for (const i of items) bySkill.set(i.skillCode, [...(bySkill.get(i.skillCode) ?? []), i]);

  const tier = (i: PlannerItem) => {
    const s = stateById.get(i.id);
    if (!s) return 0;
    return s.lastResult !== "correct" || s.lapses > 0 ? 1 : 2;
  };
  const queues = [...bySkill.values()]
    .map((list) =>
      [...list].sort((a, b) => {
        const t = tier(a) - tier(b);
        if (t) return t;
        if (tier(a) === 0) return a.difficulty - b.difficulty || byCode(a, b);
        return stateById.get(a.id)!.dueDate.localeCompare(stateById.get(b.id)!.dueDate) || byCode(a, b);
      }),
    )
    .sort((a, b) => a[0].unitCode.localeCompare(b[0].unitCode) || a[0].skillOrder - b[0].skillOrder || a[0].skillCode.localeCompare(b[0].skillCode));

  const n = queues.length;
  if (!n) return [];
  const start = ((rotation % n) + n) % n;
  const ordered = [...queues.slice(start), ...queues.slice(0, start)];

  const out: PlannerItem[] = [];
  for (let round = 0; out.length < items.length; round++) {
    for (const q of ordered) if (q[round]) out.push(q[round]);
  }
  return out;
}

export interface FocusPlanInput {
  /** Gesamter Katalog, wird hier auf die Skills der Schulaufgabe gefiltert. */
  items: readonly PlannerItem[];
  states: readonly PlannerState[];
  exam: FocusExam;
  today: ISODate;
  /** Aufgaben aus heutigen Sessions. */
  exclude?: ReadonlySet<string>;
  /** Anzahl bisheriger Fokus-Sessions dieser Schulaufgabe, versetzt den Start-Skill. */
  rotation?: number;
}

/**
 * Fokus-Runde: bis zu 12 Aufgaben nur aus den Skills der Schulaufgabe.
 * "Hatten wir noch nicht" wird ignoriert, Paula hat die Skills ausdrücklich gewählt.
 */
export function planFocus(input: FocusPlanInput, count = FOCUS_COUNT): string[] {
  const skills = new Set(input.exam.skillCodes);
  const exclude = input.exclude ?? new Set<string>();
  const pool = input.items.filter((i) => skills.has(i.skillCode) && !exclude.has(i.id));
  const stateById = new Map(input.states.map((s) => [s.itemId, s]));
  return rankFocusItems(pool, stateById, input.rotation ?? 0)
    .slice(0, count)
    .map((i) => i.id);
}
