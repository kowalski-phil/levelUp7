import { Check, ChevronLeft, Lock, Star } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { startBonus } from "@/app/(student)/session/actions";
import { skillStars } from "@/lib/data/progress";
import { loadAnswerHistory, loadCatalog, requireStudent } from "@/lib/data/queries";
import { ROTATING_SUBJECTS, unitPhase, unlockedSkillCount, weekOf, weekStart, type UnitPhase } from "@/lib/engine/calendar";
import { isVocabUnit } from "@/lib/engine/planner";
import { todayInBerlin } from "@/lib/engine/dates";

// Skill-Tree eines Fachs (PLAN.md Abschnitt 7): Gebiete als Pfad in Unterrichtsreihenfolge, Skills mit Sternen,
// aktuelles Gebiet hervorgehoben. Nur Ansicht, einzige Aktion: Bonus-Runde in einem laufenden oder abgeschlossenen Gebiet.
export default async function FachPage({ params }: PageProps<"/fach/[code]">) {
  const { code } = await params;
  const v = await requireStudent();
  const [catalog, history] = await Promise.all([loadCatalog(v.supabase), loadAnswerHistory(v.supabase, v.userId)]);
  const subject = catalog.subjects.find((s) => s.code === code);
  if (!subject) notFound();

  const today = todayInBerlin();
  const week = weekOf(today, v.family.school_year_start);
  const rotatingSubject = ROTATING_SUBJECTS.has(subject.code);
  const stars = skillStars(catalog, history);
  const itemsPerSkill = new Map<string, number>();
  for (const i of catalog.items) itemsPerSkill.set(i.skillCode, (itemsPerSkill.get(i.skillCode) ?? 0) + 1);

  const scheduleOf = (unitCode: string) => catalog.schedule.find((s) => s.unitCode === unitCode);
  const units = catalog.units
    .filter((u) => u.subjectCode === subject.code)
    .sort((a, b) => (scheduleOf(a.code)?.weekFrom ?? 99) - (scheduleOf(b.code)?.weekFrom ?? 99) || a.orderIndex - b.orderIndex)
    .map((u) => {
      const skills = catalog.skills.filter((s) => s.unitCode === u.code).sort((a, b) => a.orderIndex - b.orderIndex);
      const phase = unitPhase(catalog.schedule, u.code, week);
      const entry = scheduleOf(u.code);
      // Vokabeln laufen das ganze Jahr neben den Units, freigeschaltet ist, was abfotografiert wurde.
      const rotating = rotatingSubject || isVocabUnit(u.code);
      // Geordnete Fächer: Im laufenden Gebiet werden die Skills nacheinander freigeschaltet.
      const unlocked = rotating || phase === "past" ? skills.length : phase === "current" && entry ? unlockedSkillCount(entry, week, skills.length) : 0;
      const hasItems = skills.some((s) => (itemsPerSkill.get(s.code) ?? 0) > 0);
      return { unit: u, skills, phase, entry, unlocked, hasItems, rotating };
    })
    // Rotierende Fächer laufen parallel: Gebiete mit Aufgaben zuerst.
    .sort((a, b) => (rotatingSubject ? Number(b.hasItems) - Number(a.hasItems) : 0));

  const earned = units.flatMap((u) => u.skills).reduce((sum, s) => sum + (stars.get(s.id) ?? 0), 0);
  const max = units.reduce((sum, u) => sum + u.skills.length * 3, 0);
  const fmt = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });

  return (
    <div className="flex flex-1 flex-col gap-5 pt-1">
      <header className="flex items-center gap-2">
        <Link href="/" aria-label="Zurück" className="-ml-3 grid size-12 place-items-center text-muted-foreground">
          <ChevronLeft className="size-6" />
        </Link>
        <h1 className="flex-1 text-2xl font-bold" style={{ color: subject.color }}>
          {subject.name}
        </h1>
        <p className="flex items-center gap-1 tabular-nums">
          <Star className="size-5 fill-yellow-400 text-yellow-400" />
          {earned}/{max}
        </p>
      </header>

      <ol className="relative flex flex-col gap-4">
        <span aria-hidden className="absolute top-6 bottom-6 left-[1.1rem] w-0.5 bg-border" />
        {units.map(({ unit, skills, phase, entry, unlocked, hasItems, rotating }) => {
          const current = phase === "current" && hasItems;
          return (
            <li key={unit.code} className="relative flex gap-3">
              <PhaseDot phase={hasItems ? phase : "empty"} color={subject.color} />
              <div
                className={`flex-1 rounded-2xl bg-card p-4 ${phase === "future" || !hasItems ? "opacity-60" : ""}`}
                style={current ? { boxShadow: `0 0 0 2px ${subject.color}` } : undefined}
              >
                <p className="text-xs font-semibold tracking-wide uppercase" style={current ? { color: subject.color } : undefined}>
                  <span className={current ? "" : "text-muted-foreground"}>
                    {!hasItems
                      ? "Aufgaben folgen"
                      : rotating
                        ? "Läuft das ganze Jahr"
                        : phase === "current"
                          ? "Läuft gerade"
                          : phase === "past"
                            ? "Abgeschlossen"
                            : entry
                              ? `ab ${fmt(weekStart(v.family.school_year_start, entry.weekFrom))}`
                              : "Kommt noch"}
                  </span>
                </p>
                <h2 className="mt-1 text-lg leading-snug font-bold">{unit.title}</h2>

                <ul className="mt-3 flex flex-col gap-2">
                  {skills.map((s, i) => {
                    const open = i < unlocked;
                    const noItems = (itemsPerSkill.get(s.code) ?? 0) === 0;
                    const n = stars.get(s.id) ?? 0;
                    return (
                      <li key={s.id} className={`flex items-center gap-2 text-sm ${open && !noItems ? "" : "text-muted-foreground"}`}>
                        <span className="flex-1">{s.title}</span>
                        {noItems ? (
                          <span className="text-xs">folgt</span>
                        ) : open ? (
                          <span className="flex" aria-label={`${n} von 3 Sternen`}>
                            {[0, 1, 2].map((k) => (
                              <Star key={k} className={k < n ? "size-4 fill-yellow-400 text-yellow-400" : "size-4 text-muted-foreground/40"} />
                            ))}
                          </span>
                        ) : (
                          <Lock className="size-4" aria-label="kommt noch" />
                        )}
                      </li>
                    );
                  })}
                </ul>

                {hasItems && phase !== "future" ? (
                  <form action={startBonus} className="mt-4">
                    <input type="hidden" name="unit" value={unit.code} />
                    <button
                      className="h-12 w-full rounded-xl border-2 text-sm font-bold"
                      style={{ borderColor: subject.color, color: subject.color }}
                    >
                      Bonus-Runde in diesem Gebiet
                    </button>
                  </form>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function PhaseDot({ phase, color }: { phase: UnitPhase | "empty"; color: string }) {
  if (phase === "empty") {
    return <span className="relative z-10 mt-4 size-9 shrink-0 rounded-full border-2 border-border bg-background" />;
  }
  if (phase === "past") {
    return (
      <span className="relative z-10 mt-4 grid size-9 shrink-0 place-items-center rounded-full" style={{ backgroundColor: color }}>
        <Check className="size-5 text-background" strokeWidth={3} />
      </span>
    );
  }
  if (phase === "current") {
    return (
      <span className="relative z-10 mt-4 grid size-9 shrink-0 place-items-center rounded-full border-4 bg-background" style={{ borderColor: color }}>
        <span className="size-3 rounded-full" style={{ backgroundColor: color }} />
      </span>
    );
  }
  return (
    <span className="relative z-10 mt-4 grid size-9 shrink-0 place-items-center rounded-full border-2 border-border bg-background">
      <Lock className="size-4 text-muted-foreground" />
    </span>
  );
}
