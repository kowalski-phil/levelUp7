import { CalendarClock, CalendarPlus, Check, ChevronRight, Flame, Pencil, Shield, Star } from "lucide-react";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { startFocus } from "@/app/(student)/fokus/actions";
import { startBonus } from "@/app/(student)/session/actions";
import { AppBadge } from "@/components/app-badge";
import { LogoutButton } from "@/components/logout-button";
import { BadgeOptIn } from "@/components/streak/badge-optin";
import { WeekRow } from "@/components/streak/week-row";
import { examStats, loadExams, type ExamInfo, type ExamStats } from "@/lib/data/exams";
import { skillStars } from "@/lib/data/progress";
import { loadAnswerHistory, loadCatalog, requireStudent } from "@/lib/data/queries";
import { findDailySession } from "@/lib/data/sessions";
import { loadStreakView } from "@/lib/data/streak";
import { activeUnits, weekOf } from "@/lib/engine/calendar";
import { todayInBerlin } from "@/lib/engine/dates";
import { activeExams, daysUntil, FOCUS_COUNT } from "@/lib/engine/focus";
import { SUBJECT_ROTATION } from "@/lib/engine/planner";
import { balance } from "@/lib/engine/rewards";
import { formatNumberDe } from "@/lib/engine/template";
import { WELCOME_SEEN_COOKIE, welcomeDue } from "@/lib/engine/welcome";
import { levelFor } from "@/lib/engine/xp";
import type { LedgerRow } from "@/lib/supabase/types";

export default async function HomePage() {
  const v = await requireStudent();
  const today = todayInBerlin();
  if (welcomeDue(v.profile.onboarded_at, (await cookies()).get(WELCOME_SEEN_COOKIE)?.value, today)) redirect("/willkommen");

  const [catalog, history, streakView, ledgerRes, xpRes, daily, allExams] = await Promise.all([
    loadCatalog(v.supabase),
    loadAnswerHistory(v.supabase, v.userId),
    loadStreakView(v, today),
    v.supabase.from("rewards_ledger").select("amount_eur, paid_at").eq("student_id", v.userId),
    v.supabase.from("sessions").select("xp").eq("student_id", v.userId),
    findDailySession(v, today),
    loadExams(v),
  ]);
  const exams = activeExams(allExams, today);
  const stats = await examStats(v, exams.map((e) => e.id));
  const poolSize = (e: ExamInfo) => {
    const skills = new Set(e.skillCodes);
    return catalog.items.filter((i) => skills.has(i.skillCode)).length;
  };

  const { streak } = streakView;
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
  const dailyDone = !!daily?.finished_at;
  // Streak-Tag gesichert: Tagessession ODER Fokus-Runde abgeschlossen.
  const doneToday = dailyDone || streakView.doneToday;
  const inProgress = !!daily && !daily.finished_at && daily.total > 0;
  const [nextExam, ...otherExams] = exams;
  const noContent = catalog.items.length === 0;

  return (
    <div className="flex flex-1 flex-col gap-6">
      <AppBadge count={streak.current} />
      <header className="flex items-center justify-between pt-2">
        <p className="text-sm text-muted-foreground">
          Level {level.level} · {level.name}
          <br />
          {xp} XP
        </p>
        <div className="text-right">
          <p className="text-2xl font-bold text-green-400 tabular-nums">{formatNumberDe(money.open, 2)} €</p>
          <p className="text-xs text-muted-foreground">offen</p>
        </div>
      </header>

      <Link
        href="/streak"
        className="-mt-2 flex flex-col gap-3 rounded-3xl bg-gradient-to-br from-orange-500/25 to-card p-4 active:scale-[0.99]"
        aria-label={`Streak: ${streak.current} Tage, ${streak.jokers} Joker`}
      >
        <div className="flex items-center gap-3">
          <Flame
            className={streak.current > 0 ? "size-12 fill-orange-400 text-orange-500" : "size-12 text-muted-foreground"}
          />
          <div className="flex-1">
            <p className="text-4xl leading-none font-extrabold tabular-nums">{streak.current}</p>
            <p className="text-sm text-muted-foreground">{streak.current === 1 ? "Tag in Folge" : "Tage in Folge"}</p>
          </div>
          <div className="flex flex-col items-center">
            <span className="flex gap-0.5">
              {Array.from({ length: 2 }, (_, i) => (
                <Shield
                  key={i}
                  className={i < streak.jokers ? "size-6 fill-sky-400/30 text-sky-400" : "size-6 text-muted-foreground/30"}
                />
              ))}
            </span>
            <span className="text-xs text-muted-foreground">Joker</span>
          </div>
          <ChevronRight className="size-5 text-muted-foreground" />
        </div>
        <WeekRow week={streakView.week} />
      </Link>

      {nextExam ? (
        <Link
          href={`/fokus/${nextExam.id}`}
          className="-mt-2 flex min-h-12 items-center gap-3 rounded-2xl bg-card px-4 py-2"
          style={{ borderLeft: `4px solid ${nextExam.subjectColor}` }}
        >
          <CalendarClock className="size-5 shrink-0 text-muted-foreground" />
          <span className="flex-1 text-sm">
            <span className="text-muted-foreground">Nächste Schulaufgabe: </span>
            <span className="font-semibold" style={{ color: nextExam.subjectColor }}>
              {nextExam.subjectName}
            </span>{" "}
            · {new Date(`${nextExam.examDate}T12:00:00`).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" })} ·{" "}
            <span className="font-semibold">{whenText(nextExam, today)}</span>
          </span>
        </Link>
      ) : null}

      {noContent ? (
        <div className="rounded-3xl bg-card p-6 text-center text-muted-foreground">Noch keine Aufgaben geladen.</div>
      ) : doneToday ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-4 rounded-3xl border-2 border-green-500/60 bg-green-500/10 p-6">
            <Check className="size-10 shrink-0 text-green-400" />
            <div>
              <p className="text-xl font-bold">Heute erledigt</p>
              <p className="text-muted-foreground">
                {dailyDone && daily ? `${daily.correct}/${daily.total} richtig. ` : null}Streak gesichert. Mehr geht immer.
              </p>
            </div>
          </div>
          {nextExam ? <FocusButton exam={nextExam} today={today} pool={poolSize(nextExam)} variant="secondary" /> : null}
          {!dailyDone ? (
            <Link href="/session" className="grid h-14 w-full place-items-center rounded-2xl border-2 border-border text-lg font-bold">
              {inProgress ? "Normale Runde weitermachen" : "Normale Runde"}
            </Link>
          ) : null}
          <form action={startBonus}>
            <button className="h-14 w-full rounded-2xl border-2 border-primary text-lg font-bold text-primary">
              Bonus-Runde (6 Aufgaben)
            </button>
          </form>
        </div>
      ) : nextExam ? (
        <div className="flex flex-col gap-3">
          <FocusButton exam={nextExam} today={today} pool={poolSize(nextExam)} stats={stats.get(nextExam.id)} variant="primary" />
          <Link href="/session" className="grid min-h-14 w-full place-items-center rounded-2xl border-2 border-border px-4 text-lg font-bold">
            {inProgress ? `Normale Runde weitermachen (${daily.total} erledigt)` : `Normale Runde (${planned} Aufgaben)`}
          </Link>
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

      <BadgeOptIn count={streak.current} variant="home" />

      {!noContent && otherExams.length > 0 ? (
        <section className="flex flex-col gap-2">
          {otherExams.map((e) => (
            <ExamRow key={e.id} exam={e} today={today} pool={poolSize(e)} />
          ))}
        </section>
      ) : null}

      <section className="grid grid-cols-2 gap-3">
        {tiles.map(({ subject, earned, max, hasItems, unitTitle }) => (
          <Link
            key={subject.code}
            href={`/fach/${subject.code}`}
            className="rounded-2xl bg-card p-4 active:scale-[0.98]"
            style={{ borderTop: `4px solid ${subject.color}` }}
          >
            <p className="flex items-center justify-between font-bold">
              {subject.name}
              <ChevronRight className="size-4 text-muted-foreground" />
            </p>
            <p className="mt-0.5 line-clamp-2 min-h-8 text-xs text-muted-foreground">
              {hasItems ? (unitTitle ?? "Alle Bereiche") : "Aufgaben folgen"}
            </p>
            <p className="mt-2 flex items-center gap-1 text-sm tabular-nums">
              <Star className="size-4 fill-yellow-400 text-yellow-400" />
              {earned}/{max}
            </p>
          </Link>
        ))}
      </section>

      <Link href="/fokus/neu" className="flex h-12 items-center justify-center gap-2 text-muted-foreground">
        <CalendarPlus className="size-5" />
        Schulaufgabe eintragen
      </Link>

      <LogoutButton className="-mt-4" />
    </div>
  );
}

function whenText(exam: ExamInfo, today: string): string {
  const d = daysUntil(exam, today);
  if (d <= 0) return "heute";
  if (d === 1) return "morgen";
  return `in ${d} Tagen`;
}

/** Fokus-Block der nächsten Schulaufgabe: groß vor dem Streak-Tag, als Zweitoption danach. */
function FocusButton({
  exam,
  today,
  pool,
  stats,
  variant,
}: {
  exam: ExamInfo;
  today: string;
  pool: number;
  stats?: ExamStats;
  variant: "primary" | "secondary";
}) {
  const count = Math.min(pool, FOCUS_COUNT);
  const head = `${exam.subjectName} · ${exam.number}. Schulaufgabe · ${whenText(exam, today)}`;

  if (variant === "secondary") {
    return (
      <div className="flex items-stretch overflow-hidden rounded-2xl border-2" style={{ borderColor: exam.subjectColor }}>
        <form action={startFocus} className="flex-1">
          <input type="hidden" name="exam" value={exam.id} />
          <button
            disabled={pool === 0}
            className="flex min-h-14 w-full flex-col items-center justify-center py-2 pl-12 font-bold disabled:opacity-40"
          >
            <span className="text-lg">{pool === 0 ? "Noch keine Aufgaben zu diesen Themen" : "Noch eine Fokus-Runde"}</span>
            <span className="text-xs font-normal text-muted-foreground">{head}</span>
          </button>
        </form>
        <Link
          href={`/fokus/${exam.id}`}
          aria-label="Themen ändern"
          className="grid w-12 shrink-0 place-items-center text-muted-foreground"
        >
          <Pencil className="size-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-card p-4" style={{ borderTop: `4px solid ${exam.subjectColor}` }}>
      <p className="text-sm font-semibold" style={{ color: exam.subjectColor }}>
        {head}
      </p>
      <form action={startFocus} className="mt-3">
        <input type="hidden" name="exam" value={exam.id} />
        <button
          disabled={pool === 0}
          className="flex min-h-24 w-full flex-col items-center justify-center rounded-2xl bg-primary p-4 text-center text-primary-foreground shadow-lg active:scale-[0.99] disabled:opacity-40"
        >
          <span className="text-2xl font-extrabold">{pool === 0 ? "Noch keine Aufgaben zu diesen Themen" : "Fokus starten"}</span>
          {pool > 0 ? (
            <span className="mt-1 line-clamp-1 text-sm opacity-80">
              {count} Aufgaben · {exam.skillTitles.join(", ")}
            </span>
          ) : null}
        </button>
      </form>
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground tabular-nums">
          {stats?.sessions
            ? `${stats.sessions} Fokus-${stats.sessions === 1 ? "Runde" : "Runden"} · ${Math.round((stats.correct / Math.max(stats.total, 1)) * 100)} % richtig`
            : null}
        </p>
        <Link href={`/fokus/${exam.id}`} className="-mr-2 flex h-12 items-center gap-0.5 px-2 text-sm text-muted-foreground">
          Themen ändern
          <ChevronRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}

/** Weitere Schulaufgabe als schmale Zeile: Tippen startet eine Fokus-Runde, Stift ändert die Themen. */
function ExamRow({ exam, today, pool }: { exam: ExamInfo; today: string; pool: number }) {
  const date = new Date(`${exam.examDate}T12:00:00`).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
  return (
    <div className="flex items-stretch overflow-hidden rounded-2xl bg-card" style={{ borderLeft: `4px solid ${exam.subjectColor}` }}>
      <form action={startFocus} className="flex-1">
        <input type="hidden" name="exam" value={exam.id} />
        <button disabled={pool === 0} className="flex min-h-14 w-full items-center gap-2 px-4 text-left disabled:opacity-40">
          <span className="flex-1">
            <span className="block font-semibold">
              {exam.subjectName} · {date}
            </span>
            <span className="text-xs text-muted-foreground">
              {exam.number}. Schulaufgabe · {whenText(exam, today)}
            </span>
          </span>
          <span className="text-sm font-semibold text-primary">{pool === 0 ? "Keine Aufgaben" : "Fokus starten"}</span>
          {pool > 0 ? <ChevronRight className="size-4 text-primary" /> : null}
        </button>
      </form>
      <Link
        href={`/fokus/${exam.id}`}
        aria-label="Themen ändern"
        className="grid w-12 shrink-0 place-items-center border-l border-border text-muted-foreground"
      >
        <Pencil className="size-4" />
      </Link>
    </div>
  );
}
