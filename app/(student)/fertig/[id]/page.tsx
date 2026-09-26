import { Flame, Shield, Sparkles } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { startFocus } from "@/app/(student)/fokus/actions";
import { startBonus } from "@/app/(student)/session/actions";
import { completeSession } from "@/lib/data/complete";
import { loadExam } from "@/lib/data/exams";
import { requireStudent } from "@/lib/data/queries";
import { loadSession } from "@/lib/data/sessions";
import { todayInBerlin } from "@/lib/engine/dates";
import { activeExams } from "@/lib/engine/focus";
import { formatNumberDe } from "@/lib/engine/template";

export default async function FertigPage({ params }: PageProps<"/fertig/[id]">) {
  const { id } = await params;
  const v = await requireStudent();
  const session = await loadSession(v, id);
  if (!session) notFound();
  const summary = session.summary ?? (await completeSession(v, session));
  if (!summary) redirect(`/session/${id}`);

  const headline = { daily: "Fertig für heute", bonus: "Bonus-Runde geschafft", focus: "Fokus-Runde geschafft" }[session.kind];
  // "Noch eine Fokus-Runde" nur, solange die Schulaufgabe noch bevorsteht.
  const exam = session.kind === "focus" && session.exam_id ? await loadExam(v, session.exam_id) : null;
  const focusAgain = exam && activeExams([exam], todayInBerlin()).length ? exam : null;
  const minutes = Math.max(1, Math.round((session.duration_sec ?? 0) / 60));

  return (
    <div className="flex flex-1 flex-col gap-6 pt-6">
      <div className="text-center">
        <p className="text-sm tracking-wide text-muted-foreground uppercase">{headline}</p>
        <p className="mt-2 text-6xl font-extrabold tabular-nums">
          {session.correct}
          <span className="text-muted-foreground">/{session.total}</span>
        </p>
        <p className="mt-1 text-muted-foreground">richtig · {minutes} Min</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-card p-4 text-center">
          <Sparkles className="mx-auto size-6 text-primary" />
          <p className="mt-1 text-2xl font-bold">+{session.xp} XP</p>
        </div>
        <div className="rounded-2xl bg-card p-4 text-center">
          <Flame className="mx-auto size-6 text-orange-400" />
          <p className="mt-1 text-2xl font-bold">
            {summary.streak} {summary.streak === 1 ? "Tag" : "Tage"}
          </p>
          {summary.streakCounted ? <p className="text-xs text-muted-foreground">Streak +1</p> : null}
        </div>
      </div>

      {summary.jokersUsed > 0 ? (
        <p className="rounded-2xl bg-card p-4 text-center text-sm">
          {summary.jokersUsed === 1 ? "Ein Joker hat" : `${summary.jokersUsed} Joker haben`} deinen Streak gerettet.
        </p>
      ) : null}

      {summary.jokerEarned ? (
        <div className="flex items-center gap-3 rounded-2xl border-2 border-sky-500/60 bg-sky-500/10 p-4">
          <Shield className="size-7 shrink-0 text-sky-400" />
          <p>
            <strong>Joker verdient.</strong> Verpasst du mal einen Tag, rettet er deinen Streak.
          </p>
        </div>
      ) : null}

      {summary.rewards.map((r) => (
        <div key={r.label} className="rounded-2xl border-2 border-green-500/60 bg-green-500/10 p-4 text-center">
          <p className="text-3xl font-extrabold text-green-400">+{formatNumberDe(r.amountEur, 2)} €</p>
          <p className="mt-1">{r.label}</p>
        </div>
      ))}

      <div className="mt-auto flex flex-col gap-3">
        {focusAgain ? (
          <form action={startFocus}>
            <input type="hidden" name="exam" value={focusAgain.id} />
            <button
              className="h-14 w-full rounded-2xl border-2 text-lg font-bold"
              style={{ borderColor: focusAgain.subjectColor }}
            >
              Noch eine Fokus-Runde
            </button>
          </form>
        ) : null}
        <form action={startBonus}>
          <button className="h-14 w-full rounded-2xl border-2 border-primary text-lg font-bold text-primary">
            {session.kind === "bonus" ? "Noch eine Bonus-Runde" : "Bonus-Runde (6 Aufgaben)"}
          </button>
        </form>
        <Link href="/" className="grid h-14 w-full place-items-center rounded-2xl bg-primary text-lg font-bold text-primary-foreground">
          Fertig
        </Link>
      </div>
    </div>
  );
}
