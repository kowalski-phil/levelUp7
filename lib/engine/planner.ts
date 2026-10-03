import {
  activeUnits,
  isExamMode,
  ROTATING_SUBJECTS,
  unlockedSkillCount,
  weekOf,
  type ScheduleEntry,
} from "./calendar";
import { diffDays, type ISODate } from "./dates";
import { rankFocusItems } from "./focus";
import type { Result } from "./sm2";

export interface PlannerItem {
  id: string;
  subject: string;
  unitCode: string;
  skillCode: string;
  /** Position des Skills innerhalb seines Gebiets (0-basiert). */
  skillOrder: number;
  difficulty: number;
  code: string;
}

export interface PlannerState {
  itemId: string;
  dueDate: ISODate;
  lapses: number;
  lastResult: Result | null;
}

export interface PlanInput {
  items: readonly PlannerItem[];
  states: readonly PlannerState[];
  schedule: readonly ScheduleEntry[];
  today: ISODate;
  schoolYearStart: ISODate;
  examDate: ISODate;
  /** Item-IDs, die heute schon dran waren (für die Bonus-Runde). */
  exclude?: ReadonlySet<string>;
  /** Skill-Codes, die Felix als "hatten wir noch nicht" markiert hat: keine neuen Aufgaben daraus. */
  snoozedSkills?: ReadonlySet<string>;
  /** Skills aktiver Schulaufgaben je Fach. Das Fach nimmt seine Aufgaben zuerst aus diesen Skills. */
  focusSkills?: ReadonlyMap<string, ReadonlySet<string>>;
}

/** Reihenfolge in der Session: Fächer abwechseln. Im Prüfungsmodus Deutsch und Englisch zuerst. */
export const SUBJECT_ROTATION = ["M", "D", "B", "E"];
export const EXAM_ROTATION = ["D", "E", "M", "B"];

export const DAILY_PER_SUBJECT = 3;
export const MAX_DUE_PER_SUBJECT = 2;
export const BONUS_COUNT = 6;

/** Vokabeln aus abfotografierten Buchseiten: eigene Spur neben den 12 Aufgaben (docs/entscheidungen.md, 2026-10-03). */
export const VOCAB_UNIT = "E3";
export const VOCAB_PER_DAY = 10;

const isVocab = (i: PlannerItem) => i.unitCode === VOCAB_UNIT;

const byCode = (a: PlannerItem, b: PlannerItem) => (a.code < b.code ? -1 : a.code > b.code ? 1 : 0);

/**
 * Alle Aufgaben eines Fachs in Prioritätsreihenfolge:
 * max. 2 fällige Wiederholungen, neue Aufgaben aus dem aktuellen Gebiet, restliche fällige,
 * ungesehene aus früheren Gebieten, gesehene nach Fälligkeit, zuletzt ungesehene aus späteren Gebieten.
 */
function rankSubject(subject: string, all: PlanInput): PlannerItem[] {
  // Vokabeln laufen in ihrer eigenen Spur (rankVocab), nie in den Fach-Plätzen.
  const input = { ...all, items: all.items.filter((i) => !isVocab(i)) };
  const focus = input.focusSkills?.get(subject);
  if (!focus?.size) return rankSubjectBase(subject, input);

  // Aktive Schulaufgabe im Fach: erst deren Skills im Drill-Modus, danach alles andere wie gewohnt.
  const exclude = input.exclude ?? new Set<string>();
  const focusItems = input.items.filter((i) => i.subject === subject && focus.has(i.skillCode) && !exclude.has(i.id));
  const stateById = new Map(input.states.map((s) => [s.itemId, s]));
  const rest = rankSubjectBase(subject, { ...input, items: input.items.filter((i) => !focus.has(i.skillCode)) });
  return [...rankFocusItems(focusItems, stateById), ...rest];
}

function rankSubjectBase(subject: string, input: PlanInput): PlannerItem[] {
  const { schedule, today, schoolYearStart } = input;
  const exclude = input.exclude ?? new Set<string>();
  const stateById = new Map(input.states.map((s) => [s.itemId, s]));
  const items = input.items.filter((i) => i.subject === subject && !exclude.has(i.id));
  if (!items.length) return [];

  if (isExamMode(today, input.examDate)) return rankExam(items, stateById, today);

  const week = weekOf(today, schoolYearStart);
  const active = activeUnits(schedule, subject, week);
  const activeCodes = new Set(active.map((a) => a.unitCode));
  const rotating = ROTATING_SUBJECTS.has(subject);

  const due = items
    .filter((i) => stateById.get(i.id)?.dueDate !== undefined && stateById.get(i.id)!.dueDate <= today)
    .sort((a, b) => stateById.get(a.id)!.dueDate.localeCompare(stateById.get(b.id)!.dueDate) || byCode(a, b));

  const snoozed = input.snoozedSkills ?? new Set<string>();
  const unseen = items.filter((i) => !stateById.has(i.id) && !snoozed.has(i.skillCode));

  // Skills pro Gebiet, um Freischaltung (geordnet) bzw. Wochenrotation (D/E) zu berechnen.
  const skillsPerUnit = new Map<string, number>();
  for (const i of items) skillsPerUnit.set(i.unitCode, Math.max(skillsPerUnit.get(i.unitCode) ?? 0, i.skillOrder + 1));

  const isUnlocked = (i: PlannerItem) => {
    if (rotating) return true;
    const entry = active.find((a) => a.unitCode === i.unitCode)!;
    return i.skillOrder < unlockedSkillCount(entry, week, skillsPerUnit.get(i.unitCode) ?? 1);
  };
  const rotKey = (i: PlannerItem) => {
    const n = skillsPerUnit.get(i.unitCode) ?? 1;
    return (i.skillOrder - (week % n) + n) % n;
  };

  const fresh = unseen
    .filter((i) => activeCodes.has(i.unitCode) && isUnlocked(i))
    .sort((a, b) =>
      rotating
        ? rotKey(a) - rotKey(b) || a.difficulty - b.difficulty || byCode(a, b)
        : a.difficulty - b.difficulty || a.skillOrder - b.skillOrder || byCode(a, b),
    );

  const unitWeekTo = new Map(schedule.filter((s) => s.subject === subject).map((s) => [s.unitCode, s.weekTo]));
  const isEarlier = (i: PlannerItem) => (unitWeekTo.get(i.unitCode) ?? Infinity) < week;
  const freshSet = new Set(fresh.map((i) => i.id));
  const earlier = unseen
    .filter((i) => !freshSet.has(i.id) && isEarlier(i))
    .sort((a, b) => a.difficulty - b.difficulty || byCode(a, b));
  const seenLater = items
    .filter((i) => stateById.has(i.id) && stateById.get(i.id)!.dueDate > today)
    .sort((a, b) => stateById.get(a.id)!.dueDate.localeCompare(stateById.get(b.id)!.dueDate) || byCode(a, b));

  const ranked = [
    ...due.slice(0, MAX_DUE_PER_SUBJECT),
    ...fresh,
    ...due.slice(MAX_DUE_PER_SUBJECT),
    ...earlier,
    ...seenLater,
  ];
  const taken = new Set(ranked.map((i) => i.id));
  const rest = items.filter((i) => !taken.has(i.id) && !snoozed.has(i.skillCode)).sort((a, b) => a.difficulty - b.difficulty || byCode(a, b));
  return [...ranked, ...rest];
}

/** Prüfungsmodus: nur Wiederholung, Schwächen und Überfälliges zuerst. Ungesehenes kommt danach. */
function rankExam(items: PlannerItem[], stateById: Map<string, PlannerState>, today: ISODate): PlannerItem[] {
  const score = (i: PlannerItem) => {
    const s = stateById.get(i.id);
    if (!s) return 1;
    const overdue = Math.max(0, diffDays(today, s.dueDate));
    const weak = s.lastResult === "wrong" ? 3 : s.lastResult === "partial" ? 1.5 : 0;
    return 2 + s.lapses * 2 + weak + Math.min(overdue, 14) * 0.2 - (s.dueDate > today ? 2 : 0);
  };
  return [...items].sort((a, b) => score(b) - score(a) || byCode(a, b));
}

/** Nimmt pro Fach `perSubject`, füllt fehlende Plätze reihum auf und mischt die Fächer in der Rotation. */
function assemble(ranked: Map<string, PlannerItem[]>, rotation: string[], perSubject: number, total: number): string[] {
  const picked = new Map<string, PlannerItem[]>(rotation.map((s) => [s, (ranked.get(s) ?? []).slice(0, perSubject)]));
  let count = [...picked.values()].reduce((n, l) => n + l.length, 0);

  let progress = true;
  while (count < total && progress) {
    progress = false;
    for (const s of rotation) {
      if (count >= total) break;
      const list = ranked.get(s) ?? [];
      const mine = picked.get(s)!;
      if (mine.length < list.length) {
        mine.push(list[mine.length]);
        count++;
        progress = true;
      }
    }
  }

  const out: string[] = [];
  for (let round = 0; out.length < count; round++) {
    for (const s of rotation) {
      const it = picked.get(s)![round];
      if (it) out.push(it.id);
    }
  }
  return out;
}

/**
 * Vokabeln in Lernreihenfolge: fällige Wiederholungen (älteste zuerst), dann neue Wörter
 * (pro Buch-Unit erst Erkennen, dann Schreiben, jeweils in Listenreihenfolge), dann gesehene nach Fälligkeit.
 * `onlyDueAndNew` lässt die noch nicht fälligen weg (Tagesplan).
 */
function rankVocab(input: PlanInput, onlyDueAndNew: boolean): PlannerItem[] {
  const exclude = input.exclude ?? new Set<string>();
  const stateById = new Map(input.states.map((s) => [s.itemId, s]));
  const items = input.items.filter((i) => isVocab(i) && !exclude.has(i.id));
  const due = (i: PlannerItem) => stateById.get(i.id)!.dueDate;

  const seen = items.filter((i) => stateById.has(i.id)).sort((a, b) => due(a).localeCompare(due(b)) || byCode(a, b));
  const fresh = items
    .filter((i) => !stateById.has(i.id))
    .sort((a, b) => a.skillOrder - b.skillOrder || a.difficulty - b.difficulty || byCode(a, b));
  const dueNow = seen.filter((i) => due(i) <= input.today);
  const later = seen.filter((i) => due(i) > input.today);
  return [...dueNow, ...fresh, ...(onlyDueAndNew ? [] : later)];
}

/** Verteilt `extra` gleichmäßig zwischen `main`, damit die Vokabeln nicht als Block am Ende kommen. */
function interleave(main: string[], extra: string[]): string[] {
  if (!main.length) return extra;
  const out: string[] = [];
  let placed = 0;
  main.forEach((id, i) => {
    out.push(id);
    const target = Math.round(((i + 1) * extra.length) / main.length);
    while (placed < target) out.push(extra[placed++]);
  });
  return out;
}

/** Tagesplan: 12 Aufgaben, 3 pro Fach, dazu bis zu 10 Vokabeln. Fehlt ein Fach (noch kein Inhalt), übernehmen die anderen. */
export function planDaily(input: PlanInput): string[] {
  const rotation = isExamMode(input.today, input.examDate) ? EXAM_ROTATION : SUBJECT_ROTATION;
  const ranked = new Map(rotation.map((s) => [s, rankSubject(s, input)]));
  const main = assemble(ranked, rotation, DAILY_PER_SUBJECT, DAILY_PER_SUBJECT * rotation.length);
  const vocab = rankVocab(input, true).slice(0, VOCAB_PER_DAY).map((i) => i.id);
  return interleave(main, vocab);
}

/** Bonus-Runde: 6 weitere Aufgaben nach denselben Prioritäten, ohne die heutigen. Optional auf ein Gebiet beschränkt. */
export function planBonus(input: PlanInput, onlyUnit?: string): string[] {
  if (onlyUnit === VOCAB_UNIT) return rankVocab(input, false).slice(0, BONUS_COUNT).map((i) => i.id);
  const rotation = isExamMode(input.today, input.examDate) ? EXAM_ROTATION : SUBJECT_ROTATION;
  const items = onlyUnit ? input.items.filter((i) => i.unitCode === onlyUnit) : input.items;
  const ranked = new Map(rotation.map((s) => [s, rankSubject(s, { ...input, items })]));
  return assemble(ranked, rotation, Math.ceil(BONUS_COUNT / rotation.length), BONUS_COUNT).slice(0, BONUS_COUNT);
}

/**
 * Ersatz für eine Aufgabe, die als "hatten wir noch nicht" übersprungen wurde:
 * die nächstbeste aus demselben Fach, sonst aus einem anderen. `input.exclude` enthält die Session-Aufgaben.
 */
export function pickReplacement(input: PlanInput, subject: string): string | null {
  const rotation = isExamMode(input.today, input.examDate) ? EXAM_ROTATION : SUBJECT_ROTATION;
  for (const s of [subject, ...rotation.filter((x) => x !== subject)]) {
    const first = rankSubject(s, input)[0];
    if (first) return first.id;
  }
  return null;
}
