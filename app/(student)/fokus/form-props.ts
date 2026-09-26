import "server-only";
import type { ExamFormProps } from "@/components/fokus/exam-form";
import { loadExams } from "@/lib/data/exams";
import { loadCatalog, type Viewer } from "@/lib/data/queries";
import { loadSnoozedSkills } from "@/lib/data/sessions";
import { todayInBerlin } from "@/lib/engine/dates";
import { SUBJECT_ROTATION } from "@/lib/engine/planner";

/** Alles, was das Schulaufgaben-Formular braucht. Der Vorschlag wird im Browser berechnet (reine Funktion). */
export async function examFormProps(v: Viewer, editId?: string): Promise<Omit<ExamFormProps, "mode" | "examId" | "initial">> {
  const today = todayInBerlin();
  const [catalog, exams, snoozed] = await Promise.all([loadCatalog(v.supabase), loadExams(v), loadSnoozedSkills(v, today)]);
  const itemCount = new Map<string, number>();
  for (const i of catalog.items) itemCount.set(i.skillCode, (itemCount.get(i.skillCode) ?? 0) + 1);

  return {
    today,
    maxDate: v.family.exam_date,
    schoolYearStart: v.family.school_year_start,
    schedule: catalog.schedule,
    subjects: SUBJECT_ROTATION.flatMap((code) => {
      const s = catalog.subjects.find((x) => x.code === code);
      return s ? [{ code: s.code, name: s.name, color: s.color }] : [];
    }),
    units: catalog.units.map((u) => ({ code: u.code, title: u.title, subjectCode: u.subjectCode, orderIndex: u.orderIndex })),
    skills: catalog.skills.map((s) => ({
      code: s.code,
      title: s.title,
      unitCode: s.unitCode,
      subjectCode: s.subjectCode,
      orderIndex: s.orderIndex,
      itemCount: itemCount.get(s.code) ?? 0,
    })),
    otherExams: exams.filter((e) => e.id !== editId).map((e) => ({ subject: e.subject, examDate: e.examDate })),
    snoozedSkills: [...snoozed],
  };
}
