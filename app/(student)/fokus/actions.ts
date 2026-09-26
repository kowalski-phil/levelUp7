"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createExam, createFocusSession, deleteExam, updateExam } from "@/lib/data/exams";
import { requireStudent } from "@/lib/data/queries";

export interface ExamFormResult {
  error?: string;
}

const message = (e: unknown) => (e instanceof Error ? e.message : "Hat nicht geklappt. Versuch es nochmal.");

export async function createExamAction(subject: string, examDate: string, skillCodes: string[]): Promise<ExamFormResult> {
  const v = await requireStudent();
  try {
    await createExam(v, subject, examDate, skillCodes);
  } catch (e) {
    return { error: message(e) };
  }
  revalidatePath("/");
  redirect("/");
}

export async function updateExamAction(examId: string, examDate: string, skillCodes: string[]): Promise<ExamFormResult> {
  const v = await requireStudent();
  try {
    await updateExam(v, examId, examDate, skillCodes);
  } catch (e) {
    return { error: message(e) };
  }
  revalidatePath("/");
  redirect("/");
}

export async function deleteExamAction(examId: string): Promise<ExamFormResult> {
  const v = await requireStudent();
  try {
    await deleteExam(v, examId);
  } catch (e) {
    return { error: message(e) };
  }
  revalidatePath("/");
  redirect("/");
}

/** "Fokus starten": neue Fokus-Runde für die Schulaufgabe aus dem Formular. */
export async function startFocus(formData: FormData): Promise<void> {
  const v = await requireStudent();
  const examId = formData.get("exam");
  const session = typeof examId === "string" && examId ? await createFocusSession(v, examId) : null;
  redirect(session ? `/session/${session.id}` : "/");
}
