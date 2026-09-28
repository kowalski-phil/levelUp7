import { Flame, RotateCcw, Shield, Trophy } from "lucide-react";
import Link from "next/link";
import { showWelcomeAgain } from "@/app/(student)/willkommen/actions";
import { AppBadge } from "@/components/app-badge";
import { BadgeOptIn } from "@/components/streak/badge-optin";
import { WeekRow } from "@/components/streak/week-row";
import { requireStudent } from "@/lib/data/queries";
import { loadStreakView } from "@/lib/data/streak";
import { daysToNextJoker, JOKER_EVERY, MAX_JOKERS } from "@/lib/engine/streak";

export default async function StreakPage() {
  const v = await requireStudent();
  const { streak, week, doneToday } = await loadStreakView(v);
  const nextJoker = daysToNextJoker(streak);

  const message = doneToday
    ? "Heute geschafft. Morgen wieder."
    : streak.current > 0
      ? "Heute noch offen. 15 Minuten halten den Streak."
      : "Heute ist Tag 1. Leg los.";

  return (
    <div className="flex flex-1 flex-col gap-6 pt-2">
      <AppBadge count={streak.current} />

      <section className="relative -mx-4 overflow-hidden rounded-b-3xl bg-gradient-to-b from-orange-600/40 via-orange-500/15 to-transparent px-4 pt-6 pb-5">
        <Flame className="absolute -top-4 -right-6 size-48 fill-orange-500/25 text-orange-500/30" aria-hidden />
        <p className="relative text-7xl leading-none font-extrabold tabular-nums">{streak.current}</p>
        <p className="relative mt-1 text-2xl font-bold">{streak.current === 1 ? "Tag in Folge" : "Tage in Folge"}</p>
        <p className="relative mt-4 rounded-2xl bg-card/90 p-4">{message}</p>
      </section>

      <section>
        <h2 className="mb-3 font-semibold">Diese Woche</h2>
        <div className="rounded-2xl bg-card p-4">
          <WeekRow week={week} size="lg" />
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
              <span className="block font-medium">Joker verfügbar</span>
              <span className="block text-sm text-muted-foreground">
                Verpasst du einen Tag, rettet ein Joker automatisch deinen Streak.{" "}
                {nextJoker === null
                  ? "Dein Vorrat ist voll."
                  : `Nächster Joker nach ${nextJoker} ${nextJoker === 1 ? "weiteren Tag" : "weiteren Tagen"}.`}{" "}
                Alle {JOKER_EVERY} Tage gibt es einen neuen.
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
