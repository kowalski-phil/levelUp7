import "server-only";
import { todayInBerlin, type ISODate } from "@/lib/engine/dates";
import { activeExams, planFocus, type FocusExam } from "@/lib/engine/focus";
import type { ExamRow, SessionRow } from "@/lib/supabase/types";
import { loadCatalog, loadItemStates, toPlannerStates, type Catalog, type Viewer } from "./queries";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Datenbankfehler: Original ins Server-Log, Paula bekommt einen deutschen Satz. */
function fail(error: { message: string }): never {
  console.error("[exams]", error.message);
  throw new Error("Speichern hat nicht geklappt. Versuch es nochmal.");
}

/** Schulaufgabe mit Anzeige-Infos. `number` = n-te Schulaufgabe im Fach, nach Datum gezählt. */
export interface ExamInfo extends FocusExam {
  subjectName: string;
  subjectColor: string;
  skillTitles: string[];
}

function toExams(rows: readonly ExamRow[], catalog: Catalog): ExamInfo[] {
  const subjectById = new Map(catalog.subjects.map((s) => [s.id, s]));
  const skillById = new Map(catalog.skills.map((s) => [s.id, s]));
  const list = rows.flatMap((r) => {
    const subject = subjectById.get(r.subject_id);
    if (!subject) return [];
    const skills = (r.skill_ids ?? [])
      .map((id) => skillById.get(id))
      .filter((s) => s !== undefined)
      .sort((a, b) => a.unitCode.localeCompare(b.unitCode) || a.orderIndex - b.orderIndex);
    return [
      {
        id: r.id,
        subject: subject.code,
        subjectName: subject.name,
        subjectColor: subject.color,
        examDate: r.exam_date,
        number: 0,
        skillCodes: skills.map((s) => s.code),
        skillTitles: skills.map((s) => s.title),
      },
    ];
  });
  // Nummer aus der Reihenfolge ableiten: bleibt richtig, auch wenn eine Schulaufgabe gelöscht oder verschoben wird.
  const sorted = [...list].sort((a, b) => a.examDate.localeCompare(b.examDate) || a.id.localeCompare(b.id));
  const perSubject = new Map<string, number>();
  for (const e of sorted) {
    const n = (perSubject.get(e.subject) ?? 0) + 1;
    perSubject.set(e.subject, n);
    e.number = n;
  }
  return sorted;
}

/** Alle Schulaufgaben eines Schülers, nach Datum. */
export async function loadExams(v: Viewer, studentId = v.userId): Promise<ExamInfo[]> {
  const [{ data }, catalog] = await Promise.all([
    v.supabase.from("exams").select("*").eq("student_id", studentId),
    loadCatalog(v.supabase),
  ]);
  return toExams((data ?? []) as ExamRow[], catalog);
}

export async function loadExam(v: Viewer, examId: string): Promise<ExamInfo | null> {
  return (await loadExams(v)).find((e) => e.id === examId) ?? null;
}

/** Prüft Eingaben und übersetzt Skill-Codes in IDs. Wirft mit einer Meldung für Paula. */
function validate(v: Viewer, catalog: Catalog, subjectCode: string, examDate: string, skillCodes: readonly string[]) {
  if (!ISO.test(examDate)) throw new Error("Bitte ein Datum wählen.");
  if (examDate > v.family.exam_date) throw new Error("Das Datum liegt nach dem Schuljahresende.");
  const subject = catalog.subjects.find((s) => s.code === subjectCode);
  if (!subject) throw new Error("Bitte ein Fach wählen.");
  const skills = catalog.skills.filter((s) => s.subjectCode === subjectCode && skillCodes.includes(s.code));
  if (!skills.length) throw new Error("Bitte mindestens ein Thema anhaken.");
  return { subject, skillIds: skills.map((s) => s.id) };
}

/** "Das hatten wir": Zurückstellungen der gewählten Skills aufheben. */
async function clearSnoozes(v: Viewer, skillIds: string[]) {
  await v.supabase.from("skill_snooze").delete().eq("student_id", v.userId).in("skill_id", skillIds);
}

export async function createExam(v: Viewer, subjectCode: string, examDate: ISODate, skillCodes: string[]): Promise<void> {
  if (examDate < todayInBerlin()) throw new Error("Das Datum liegt in der Vergangenheit.");
  const catalog = await loadCatalog(v.supabase);
  const { subject, skillIds } = validate(v, catalog, subjectCode, examDate, skillCodes);
  const { count } = await v.supabase
    .from("exams")
    .select("id", { count: "exact", head: true })
    .eq("student_id", v.userId)
    .eq("subject_id", subject.id);
  const { error } = await v.supabase.from("exams").insert({
    student_id: v.userId,
    subject_id: subject.id,
    exam_date: examDate,
    number: (count ?? 0) + 1,
    skill_ids: skillIds,
  });
  if (error) fail(error);
  await clearSnoozes(v, skillIds);
}

/** Datum und Themen ändern. Das Fach bleibt. Ein Datum in der Vergangenheit ist erlaubt (war doch schon). */
export async function updateExam(v: Viewer, examId: string, examDate: ISODate, skillCodes: string[]): Promise<void> {
  const exam = await loadExam(v, examId);
  if (!exam) throw new Error("Schulaufgabe nicht gefunden.");
  const catalog = await loadCatalog(v.supabase);
  const { skillIds } = validate(v, catalog, exam.subject, examDate, skillCodes);
  const { error } = await v.supabase
    .from("exams")
    .update({ exam_date: examDate, skill_ids: skillIds, updated_at: new Date().toISOString() })
    .eq("id", examId)
    .eq("student_id", v.userId);
  if (error) fail(error);
  await clearSnoozes(v, skillIds);
}

export async function deleteExam(v: Viewer, examId: string): Promise<void> {
  const { error } = await v.supabase.from("exams").delete().eq("id", examId).eq("student_id", v.userId);
  if (error) fail(error);
}

/** Aufgaben-IDs aller heutigen Sessions: kommen in einer weiteren Runde nicht nochmal. */
export async function todaysItemIds(v: Viewer, today: ISODate): Promise<Set<string>> {
  const { data } = await v.supabase.from("sessions").select("planned_item_ids").eq("student_id", v.userId).eq("date", today);
  return new Set<string>((data ?? []).flatMap((s: { planned_item_ids: string[] }) => s.planned_item_ids));
}

/** Plan für eine Fokus-Runde (oder einen Ersatz darin). */
export async function focusPlan(v: Viewer, exam: FocusExam, exclude: Set<string>, count?: number): Promise<string[]> {
  const today = todayInBerlin();
  const [catalog, states, { count: done }] = await Promise.all([
    loadCatalog(v.supabase),
    loadItemStates(v.supabase, v.userId),
    v.supabase
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .eq("student_id", v.userId)
      .eq("kind", "focus")
      .eq("exam_id", exam.id),
  ]);
  return planFocus(
    { items: catalog.items, states: toPlannerStates(states), exam, today, exclude, rotation: done ?? 0 },
    count,
  );
}

/** Neue Fokus-Runde für eine aktive Schulaufgabe. */
export async function createFocusSession(v: Viewer, examId: string): Promise<SessionRow | null> {
  const today = todayInBerlin();
  const exam = await loadExam(v, examId);
  if (!exam || !activeExams([exam], today).length) return null;

  const planned = await focusPlan(v, exam, await todaysItemIds(v, today));
  if (!planned.length) return null;
  const { data, error } = await v.supabase
    .from("sessions")
    .insert({ student_id: v.userId, date: today, kind: "focus", exam_id: exam.id, planned_item_ids: planned })
    .select("*")
    .single<SessionRow>();
  if (!data) throw new Error(`Fokus-Runde konnte nicht angelegt werden: ${error?.message}`);
  return data;
}

export interface ExamStats {
  sessions: number;
  correct: number;
  total: number;
  lastDate: ISODate | null;
}

/** Abgeschlossene Fokus-Runden je Schulaufgabe. */
export async function examStats(v: Viewer, examIds: readonly string[], studentId = v.userId): Promise<Map<string, ExamStats>> {
  const out = new Map<string, ExamStats>();
  if (!examIds.length) return out;
  const { data } = await v.supabase
    .from("sessions")
    .select("exam_id, date, correct, total, finished_at")
    .eq("student_id", studentId)
    .eq("kind", "focus")
    .in("exam_id", [...examIds])
    .not("finished_at", "is", null);
  for (const r of (data ?? []) as { exam_id: string; date: string; correct: number; total: number }[]) {
    const s = out.get(r.exam_id) ?? { sessions: 0, correct: 0, total: 0, lastDate: null };
    s.sessions += 1;
    s.correct += r.correct;
    s.total += r.total;
    if (!s.lastDate || r.date > s.lastDate) s.lastDate = r.date;
    out.set(r.exam_id, s);
  }
  return out;
}
