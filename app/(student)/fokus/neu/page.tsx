import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { ExamForm } from "@/components/fokus/exam-form";
import { requireStudent } from "@/lib/data/queries";
import { examFormProps } from "../form-props";

export default async function NeueSchulaufgabePage() {
  const v = await requireStudent();
  const props = await examFormProps(v);
  return (
    <div className="flex flex-1 flex-col gap-5">
      <header className="flex items-center gap-2 pt-1">
        <Link href="/" aria-label="Zurück" className="-ml-3 grid size-12 place-items-center text-muted-foreground">
          <ChevronLeft className="size-6" />
        </Link>
        <h1 className="text-2xl font-bold">Schulaufgabe eintragen</h1>
      </header>
      <ExamForm mode="create" {...props} />
    </div>
  );
}
