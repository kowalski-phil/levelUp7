import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExamForm } from "@/components/fokus/exam-form";
import { loadExam } from "@/lib/data/exams";
import { requireStudent } from "@/lib/data/queries";
import { examFormProps } from "../form-props";

export default async function SchulaufgabeAendernPage({ params }: PageProps<"/fokus/[id]">) {
  const { id } = await params;
  const v = await requireStudent();
  const exam = await loadExam(v, id);
  if (!exam) notFound();
  const props = await examFormProps(v, id);
  return (
    <div className="flex flex-1 flex-col gap-5">
      <header className="flex items-center gap-2 pt-1">
        <Link href="/" aria-label="Zurück" className="-ml-3 grid size-12 place-items-center text-muted-foreground">
          <ChevronLeft className="size-6" />
        </Link>
        <h1 className="text-2xl font-bold">
          {exam.subjectName} · {exam.number}. Schulaufgabe
        </h1>
      </header>
      <ExamForm
        mode="edit"
        examId={exam.id}
        initial={{ subject: exam.subject, examDate: exam.examDate, skillCodes: [...exam.skillCodes] }}
        {...props}
      />
    </div>
  );
}
