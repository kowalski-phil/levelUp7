import { Flame, RotateCcw, Shield, Trophy } from "lucide-react";
import Link from "next/link";
import { showWelcomeAgain } from "@/app/(student)/willkommen/actions";
import { AppBadge } from "@/components/app-badge";
import { BadgeOptIn } from "@/components/streak/badge-optin";
import { RescueCard } from "@/components/streak/rescue-card";
import { WeekRow } from "@/components/streak/week-row";
import { requireStudent } from "@/lib/data/queries";
import { loadStreakView } from "@/lib/data/streak";
import { todayInBerlin } from "@/lib/engine/dates";
import { daysToNextJoker, JOKER_EVERY, MAX_JOKERS, plannableDays, weekdayLabel } from "@/lib/engine/streak";
import { cn } from "@/lib/utils";
import { toggleJoker } from "./actions";

export default async function StreakPage() {
  const v = await requireStudent();
  const today = todayInBerlin();
  const { streak, week, doneToday, jokerDays, jokerToday, held, rescue } = await loadStreakView(v, today);
  const nextJoker = daysToNextJoker(streak, held);

  const message = doneToday
    ? "Heute geschafft. Morgen wieder."
    : jokerToday
      ? "Heute ist dein Joker-Tag. Dein Streak ist sicher."
      : streak.current > 0
      ? "Heute noch offen. 10 Minuten halten den Streak."
      : "Heute ist Tag 1. Leg los.";

  return (
    <div className="flex flex-1 flex-col gap-6 pt-2">
      <AppBadge count={streak.current} />

      <section className="relative -mx-4 overflow-hidden rounded-b-3xl bg-gradient-to-b from-orange-600/40 via-orange-500/15 to-transparent px-4 pt-6 pb-5">
        <Flame className="absolute -top-4 -right-6 size-48 fill-orange-500/25 text-orange-500/30" aria-hidden />
        <p className="relative text-7xl leading-none font-extrabold tabular-nums">{streak.current}</p>
        <p className="relative mt-1 text-2xl font-bold">{streak.current === 1 ? "Tag in Folge" : "Tage in Folge"}</p>
        {rescue ? null : <p className="relative mt-4 rounded-2xl bg-card/90 p-4">{message}</p>}
      </section>

      {rescue ? <RescueCard days={rescue} streak={streak.current} today={today} /> : null}

      <section>
        <h2 className="mb-3 font-semibold">Diese Woche</h2>
        <div className="rounded-2xl bg-card p-4">
          <WeekRow week={week} size="lg" />
        </div>
      </section>

      <section>
        <h2 className="mb-1 font-semibold">Joker setzen</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Keine Zeit an einem Tag? Tipp ihn an, der Joker hält deinen Streak. Lernst du doch, bekommst du ihn zurück.
        </p>
        <div className="grid grid-cols-4 gap-2">
          {plannableDays(today).map((date) => {
            const set = jokerDays.includes(date);
            const disabled = !set && (streak.jokers === 0 || (date === today && doneToday));
            return (
              <form key={date} action={toggleJoker}>
                <input type="hidden" name="date" value={date} />
                <button
                  disabled={disabled}
                  aria-pressed={set}
                  className={cn(
                    "flex h-16 w-full flex-col items-center justify-center rounded-2xl border-2 text-sm disabled:opacity-40",
                    set ? "border-sky-500 bg-sky-500/15" : "border-border bg-card",
                  )}
                >
                  <span className={cn("font-semibold", date === today && "text-orange-400")}>
                    {date === today ? "Heute" : weekdayLabel(date)}
                  </span>
                  {set ? (
                    <Shield className="size-5 fill-sky-400/30 text-sky-400" />
                  ) : (
                    <span className="text-xs text-muted-foreground tabular-nums">{date.slice(8)}.{date.slice(5, 7)}.</span>
                  )}
                </button>
              </form>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-semibold">Zusammenfassung</h2>
        <ul className="divide-y divide-border rounded-2xl bg-card">
          <li className="flex items-center gap-3 p-4">
            <Trophy className="size-6 text-yellow-400" />
            <span className="flex-1 font-medium">Längster Streak</span>
            <span className="text-lg font-bold tabular-nums">{streak.longest}</span>
          </li>
          <li className="flex items-start gap-3 p-4">
            <Shield className="mt-0.5 size-6 fill-sky-400/30 text-sky-400" />
            <span className="flex-1">
              <span className="block font-medium">Joker im Vorrat</span>
              <span className="block text-sm text-muted-foreground">
                Alle {JOKER_EVERY} Tage gibt es einen neuen, höchstens {MAX_JOKERS}.{" "}
                {nextJoker === null
                  ? "Dein Vorrat ist voll."
                  : `Nächster nach ${nextJoker} ${nextJoker === 1 ? "weiteren Tag" : "weiteren Tagen"}.`}{" "}
                Vergisst du einen Tag, fragt dich die App danach, ob du einen Joker einsetzen willst.
              </span>
            </span>
            <span className="text-lg font-bold tabular-nums">
              {streak.jokers}/{MAX_JOKERS}
            </span>
          </li>
        </ul>
      </section>

      <BadgeOptIn count={streak.current} />

      {v.profile.onboarded_at ? (
        <form action={showWelcomeAgain}>
          <button className="flex h-12 w-full items-center justify-center gap-2 text-sm text-muted-foreground">
            <RotateCcw className="size-4" />
            Willkommens-Screen wieder anzeigen
          </button>
        </form>
      ) : null}

      <div className="mt-auto">
        <Link href="/" className="grid h-14 w-full place-items-center rounded-2xl bg-primary text-lg font-bold text-primary-foreground">
          {doneToday ? "Zurück" : "Ich bleib dran"}
        </Link>
      </div>
    </div>
  );
}
