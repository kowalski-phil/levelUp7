import { notFound, redirect } from "next/navigation";
import { SessionPlayer } from "@/components/session/player";
import { loadExam } from "@/lib/data/exams";
import { requireStudent } from "@/lib/data/queries";
import { loadSession, toPlayerItems } from "@/lib/data/sessions";
import type { AnswerResult } from "@/lib/engine/grading";

export default async function SessionPage({ params }: PageProps<"/session/[id]">) {
  const { id } = await params;
  const v = await requireStudent();
  const session = await loadSession(v, id);
  if (!session) notFound();
  if (session.finished_at) redirect(`/fertig/${id}`);

  const [items, answersRes, exam] = await Promise.all([
    toPlayerItems(v, session.planned_item_ids),
    v.supabase.from("answers").select("item_id, result").eq("session_id", id),
    session.kind === "focus" && session.exam_id ? loadExam(v, session.exam_id) : null,
  ]);
  if (!items.length) redirect("/");

  const answered: Record<string, AnswerResult> = {};
  for (const a of (answersRes.data ?? []) as { item_id: string; result: AnswerResult }[]) answered[a.item_id] = a.result;

  return (
    <SessionPlayer
      sessionId={id}
      kind={session.kind}
      items={items}
      answered={answered}
      label={session.kind === "focus" ? `Fokus ${exam?.subjectName ?? ""}`.trim() : undefined}
      labelColor={exam?.subjectColor}
    />
  );
}
