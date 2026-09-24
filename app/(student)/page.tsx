import { Check, Flame, Shield, Star } from "lucide-react";
import Link from "next/link";
import { startBonus } from "@/app/(student)/session/actions";
import { skillStars } from "@/lib/data/progress";
import { loadAnswerHistory, loadCatalog, requireStudent } from "@/lib/data/queries";
import { findDailySession } from "@/lib/data/sessions";
import { activeUnits, weekOf } from "@/lib/engine/calendar";
import { todayInBerlin } from "@/lib/engine/dates";
import { SUBJECT_ROTATION } from "@/lib/engine/planner";
import { balance } from "@/lib/engine/rewards";
import { displayStreak, initialStreak } from "@/lib/engine/streak";
import { formatNumberDe } from "@/lib/engine/template";
import { levelFor } from "@/lib/engine/xp";
import type { LedgerRow, StreakRow } from "@/lib/supabase/types";

export default async function HomePage() {
  const v = await requireStudent();
  const today = todayInBerlin();

  const [catalog, history, streakRes, ledgerRes, xpRes, daily] = await Promise.all([
    loadCatalog(v.supabase),
    loadAnswerHistory(v.supabase, v.userId),
    v.supabase.from("streaks").select("*").eq("student_id", v.userId).maybeSingle<StreakRow>(),
    v.supabase.from("rewards_ledger").select("amount_eur, paid_at").eq("student_id", v.userId),
    v.supabase.from("sessions").select("xp").eq("student_id", v.userId),
    findDailySession(v, today),
  ]);

  const s = streakRes.data;
  const streak = displayStreak(
    s ? { current: s.current, longest: s.longest, jokers: s.jokers, lastCompletedDate: s.last_completed_date } : initialStreak(),
    today,
  );
  const money = balance(
    ((ledgerRes.data ?? []) as Pick<LedgerRow, "amount_eur" | "paid_at">[]).map((l) => ({
      type: "",
      label: "",
      amountEur: Number(l.amount_eur),
      paidAt: l.paid_at,
    })),
  );
  const xp = ((xpRes.data ?? []) as { xp: number }[]).reduce((sum, r) => sum + r.xp, 0);
  const level = levelFor(xp);

  const stars = skillStars(catalog, history);
  const week = weekOf(today, v.family.school_year_start);
  const tiles = SUBJECT_ROTATION.map((code) => catalog.subjects.find((x) => x.code === code))
    .filter((x) => x !== undefined)
    .map((subject) => {
      const skills = catalog.skills.filter((sk) => sk.subjectCode === subject.code);
      const earned = skills.reduce((sum, sk) => sum + (stars.get(sk.id) ?? 0), 0);
      const hasItems = catalog.items.some((i) => i.subject === subject.code);
      const current = activeUnits(catalog.schedule, subject.code, week);
      const unitTitle =
        current.length === 1 ? catalog.units.find((u) => u.code === current[0].unitCode)?.title : undefined;
      return { subject, earned, max: skills.length * 3, hasItems, unitTitle };
    });

  const planned = daily?.planned_item_ids.length ?? 12;
  const doneToday = !!daily?.finished_at;
  const inProgress = daily && !daily.finished_at && daily.total > 0;
  const noContent = catalog.items.length === 0;

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <Flame className={streak.current > 0 ? "size-8 text-orange-400" : "size-8 text-muted-foreground"} />
          <span className="text-3xl font-extrabold tabular-nums">{streak.current}</span>
          <span className="flex gap-0.5 pl-1" aria-label={`${streak.jokers} Joker`}>
            {Array.from({ length: 2 }, (_, i) => (
              <Shield key={i} className={i < streak.jokers ? "size-5 text-sky-400" : "size-5 text-muted-foreground/30"} />
            ))}
          </span>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-green-400 tabular-nums">{formatNumberDe(money.open, 2)} €</p>
          <p className="text-xs text-muted-foreground">offen</p>
        </div>
      </header>

      <p className="text-sm text-muted-foreground">
        Level {level.level} · {level.name} · {xp} XP
      </p>

      {noContent ? (
        <div className="rounded-3xl bg-card p-6 text-center text-muted-foreground">Noch keine Aufgaben geladen.</div>
      ) : doneToday ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-4 rounded-3xl border-2 border-green-500/60 bg-green-500/10 p-6">
            <Check className="size-10 shrink-0 text-green-400" />
            <div>
              <p className="text-xl font-bold">Heute erledigt</p>
              <p className="text-muted-foreground">
                {daily.correct}/{daily.total} richtig. Morgen geht&apos;s weiter.
              </p>
            </div>
          </div>
          <form action={startBonus}>
            <button className="h-14 w-full rounded-2xl border-2 border-primary text-lg font-bold text-primary">
              Bonus-Runde (6 Aufgaben)
            </button>
          </form>
        </div>
      ) : (
        <Link
          href="/session"
          className="flex min-h-36 flex-col items-center justify-center rounded-3xl bg-primary p-6 text-center text-primary-foreground shadow-lg active:scale-[0.99]"
        >
          <span className="text-3xl font-extrabold">{inProgress ? "Weitermachen" : "Heute starten"}</span>
          <span className="mt-1 text-base opacity-80">
            {inProgress ? `${daily.total} erledigt` : `${planned} Aufgaben · ca. 15 Min`}
          </span>
        </Link>
      )}

      <section className="grid grid-cols-2 gap-3">
        {tiles.map(({ subject, earned, max, hasItems, unitTitle }) => (
          <div key={subject.code} className="rounded-2xl bg-card p-4" style={{ borderTop: `4px solid ${subject.color}` }}>
            <p className="font-bold">{subject.name}</p>
            <p className="mt-0.5 line-clamp-2 min-h-8 text-xs text-muted-foreground">
              {hasItems ? (unitTitle ?? "Alle Bereiche") : "Aufgaben folgen"}
            </p>
            <p className="mt-2 flex items-center gap-1 text-sm tabular-nums">
              <Star className="size-4 fill-yellow-400 text-yellow-400" />
              {earned}/{max}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}
