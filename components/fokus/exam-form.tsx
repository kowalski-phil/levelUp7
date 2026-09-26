"use client";

import { AlertTriangle, Check, ChevronDown, Loader2, Minus } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { createExamAction, deleteExamAction, updateExamAction, type ExamFormResult } from "@/app/(student)/fokus/actions";
import type { ScheduleEntry } from "@/lib/engine/calendar";
import { daysUntil, overDeselectedUnits, suggestSkills } from "@/lib/engine/focus";
import { cn } from "@/lib/utils";

export interface ExamFormProps {
  mode: "create" | "edit";
  examId?: string;
  today: string;
  maxDate: string;
  schoolYearStart: string;
  schedule: ScheduleEntry[];
  subjects: { code: string; name: string; color: string }[];
  units: { code: string; title: string; subjectCode: string; orderIndex: number }[];
  skills: { code: string; title: string; unitCode: string; subjectCode: string; orderIndex: number; itemCount: number }[];
  /** Alle anderen Schulaufgaben (für "seit der letzten Schulaufgabe"). */
  otherExams: { subject: string; examDate: string }[];
  snoozedSkills: string[];
  initial?: { subject: string; examDate: string; skillCodes: string[] };
}

const sameSet = (a: ReadonlySet<string>, b: ReadonlySet<string>) => a.size === b.size && [...a].every((x) => b.has(x));

function dayText(days: number): string {
  if (days < 0) return "schon vorbei";
  if (days === 0) return "heute";
  if (days === 1) return "morgen";
  return `in ${days} Tagen`;
}

export function ExamForm(props: ExamFormProps) {
  const { mode, initial } = props;
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [date, setDate] = useState(initial?.examDate ?? "");
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initial?.skillCodes ?? []));
  const [baseline, setBaseline] = useState<Set<string>>(() => new Set(initial?.skillCodes ?? []));
  const [touched, setTouched] = useState(mode === "edit");
  // Beim Bearbeiten teilweise gewählte Lernbereiche aufklappen, damit Felix sieht, was fehlt.
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const chosen = new Set(initial?.skillCodes ?? []);
    const units = new Set(props.skills.filter((x) => chosen.has(x.code)).map((x) => x.unitCode));
    return new Set([...units].filter((u) => props.skills.some((x) => x.unitCode === u && !chosen.has(x.code))));
  });
  const [confirmedFor, setConfirmedFor] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const snoozed = useMemo(() => new Set(props.snoozedSkills), [props.snoozedSkills]);
  const units = useMemo(
    () => props.units.filter((u) => u.subjectCode === subject).sort((a, b) => a.orderIndex - b.orderIndex),
    [props.units, subject],
  );
  const unitSkills = useMemo(() => {
    const map = new Map<string, ExamFormProps["skills"]>();
    for (const u of units) {
      map.set(
        u.code,
        props.skills.filter((s) => s.unitCode === u.code).sort((a, b) => a.orderIndex - b.orderIndex),
      );
    }
    return map;
  }, [units, props.skills]);
  const unitSkillCodes = useMemo(
    () => new Map([...unitSkills].map(([u, list]) => [u, list.map((s) => s.code)])),
    [unitSkills],
  );

  /** Vorschlag aus dem Kalender. Nur Lernbereiche, zu denen es schon Aufgaben gibt. */
  const applySuggestion = (nextSubject: string, nextDate: string) => {
    const previous = props.otherExams
      .filter((e) => e.subject === nextSubject && e.examDate < nextDate)
      .map((e) => e.examDate)
      .sort()
      .at(-1);
    const subjectSkills = props.skills.filter((x) => x.subjectCode === nextSubject);
    const unitsWithItems = new Set(subjectSkills.filter((x) => x.itemCount > 0).map((x) => x.unitCode));
    const unitOf = new Map(subjectSkills.map((x) => [x.code, x.unitCode]));
    const next = new Set(
      suggestSkills({
        subject: nextSubject,
        examDate: nextDate,
        schoolYearStart: props.schoolYearStart,
        schedule: props.schedule,
        skills: subjectSkills,
        previousExamDate: previous ?? null,
        snoozedSkills: snoozed,
      }).filter((c) => unitsWithItems.has(unitOf.get(c) ?? "")),
    );
    setSelected(next);
    setBaseline(next);
    // Teilweise vorgeschlagene Lernbereiche gleich aufklappen, damit Felix sieht, was fehlt.
    setExpanded(
      new Set(
        [...unitsWithItems].filter((u) => {
          const codes = subjectSkills.filter((x) => x.unitCode === u).map((x) => x.code);
          const n = codes.filter((c) => next.has(c)).length;
          return n > 0 && n < codes.length;
        }),
      ),
    );
  };

  const chooseSubject = (code: string) => {
    if (mode === "edit" || code === subject) return;
    setSubject(code);
    setTouched(false);
    setError(null);
    if (date) applySuggestion(code, date);
    else {
      setSelected(new Set());
      setBaseline(new Set());
      setExpanded(new Set());
    }
  };

  const chooseDate = (value: string) => {
    setDate(value);
    // Solange Felix keinen Haken selbst gesetzt hat, folgt der Vorschlag dem Datum.
    if (subject && value && !touched) applySuggestion(subject, value);
  };

  const change = (next: Set<string>) => {
    setSelected(next);
    setTouched(true);
    setError(null);
  };

  const toggleSkill = (code: string) => {
    const next = new Set(selected);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    change(next);
  };

  const toggleUnit = (unitCode: string) => {
    const codes = unitSkillCodes.get(unitCode) ?? [];
    const all = codes.every((c) => selected.has(c));
    const next = new Set(selected);
    for (const c of codes) {
      if (all) next.delete(c);
      else next.add(c);
    }
    change(next);
  };

  const toggleExpanded = (unitCode: string) => {
    const next = new Set(expanded);
    if (next.has(unitCode)) next.delete(unitCode);
    else next.add(unitCode);
    setExpanded(next);
  };

  // Warnung nur für Lernbereiche, die Felix selbst verändert hat.
  const warnUnits = overDeselectedUnits(unitSkillCodes, selected).filter((u) =>
    (unitSkillCodes.get(u) ?? []).some((c) => selected.has(c) !== baseline.has(c)),
  );
  const selectionKey = [...selected].sort().join(",");
  const warningOpen = warnUnits.length > 0 && confirmedFor !== selectionKey;
  const unchanged = mode === "edit" && initial && date === initial.examDate && sameSet(selected, new Set(initial.skillCodes));
  const dateOk = !!date && date <= props.maxDate && (mode === "edit" || date >= props.today);
  const canSubmit = !!subject && dateOk && selected.size > 0 && !warningOpen && !pending && !unchanged;

  const run = (fn: () => Promise<ExamFormResult>) =>
    startTransition(async () => {
      setError(null);
      const res = await fn();
      if (res?.error) setError(res.error);
    });

  const submit = () => {
    const codes = [...selected];
    if (mode === "edit" && props.examId) run(() => updateExamAction(props.examId!, date, codes));
    else run(() => createExamAction(subject, date, codes));
  };

  const hasSuggestion = subject === "M" || subject === "B";
  const days = date ? daysUntil({ examDate: date }, props.today) : null;

  return (
    <div className="flex flex-1 flex-col gap-7 pb-2">
      <section>
        <h2 className="mb-3 font-semibold">Welches Fach?</h2>
        <div className="grid grid-cols-2 gap-3">
          {props.subjects.map((s) => {
            const active = s.code === subject;
            const locked = mode === "edit" && !active;
            return (
              <button
                key={s.code}
                type="button"
                disabled={locked}
                onClick={() => chooseSubject(s.code)}
                aria-pressed={active}
                className={cn(
                  "h-14 rounded-2xl border-2 text-lg font-bold transition-colors",
                  active ? "text-black" : "bg-card",
                  locked && "opacity-30",
                )}
                style={{ borderColor: s.color, background: active ? s.color : undefined }}
              >
                {s.name}
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <label htmlFor="exam-date" className="mb-3 block font-semibold">
          Wann ist die Schulaufgabe?
        </label>
        <input
          id="exam-date"
          type="date"
          value={date}
          min={mode === "create" ? props.today : undefined}
          max={props.maxDate}
          onChange={(e) => chooseDate(e.target.value)}
          className="h-14 w-full rounded-2xl border border-border bg-card px-4 text-lg [color-scheme:dark]"
        />
        {days !== null ? <p className="mt-2 text-sm text-muted-foreground">{dayText(days)}</p> : null}
      </section>

      {subject ? (
        <section>
          <h2 className="font-semibold">Was kommt dran?</h2>
          {!hasSuggestion && selected.size === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">Hak an, was drankommt.</p>
          ) : null}
          <ul className="mt-3 divide-y divide-border rounded-2xl bg-card">
            {units.map((u) => {
              const skills = unitSkills.get(u.code) ?? [];
              const itemCount = skills.reduce((n, s) => n + s.itemCount, 0);
              const disabled = itemCount === 0;
              const chosen = skills.filter((s) => selected.has(s.code)).length;
              const state = chosen === 0 ? "none" : chosen === skills.length ? "all" : "some";
              const open = expanded.has(u.code) && !disabled;
              return (
                <li key={u.code} className={cn(disabled && "opacity-40")}>
                  <div className="flex items-center gap-1 pr-1">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={state === "all" ? true : state === "some" ? "mixed" : false}
                      disabled={disabled}
                      onClick={() => toggleUnit(u.code)}
                      className="flex min-h-14 flex-1 items-center gap-3 py-2 pl-3 text-left"
                    >
                      <Box state={state} />
                      <span className="flex-1">
                        <span className="block font-medium leading-snug">{u.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {disabled ? "Aufgaben folgen" : `${chosen}/${skills.length} Themen · ${itemCount} Aufgaben`}
                        </span>
                      </span>
                    </button>
                    {!disabled ? (
                      <button
                        type="button"
                        onClick={() => toggleExpanded(u.code)}
                        aria-expanded={open}
                        aria-label={open ? "Themen zuklappen" : "Themen aufklappen"}
                        className="grid size-12 shrink-0 place-items-center text-muted-foreground"
                      >
                        <ChevronDown className={cn("size-5 transition-transform", open && "rotate-180")} />
                      </button>
                    ) : null}
                  </div>
                  {open ? (
                    <ul className="pb-2">
                      {skills.map((s) => (
                        <li key={s.code}>
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={selected.has(s.code)}
                            onClick={() => toggleSkill(s.code)}
                            className="flex min-h-12 w-full items-center gap-3 py-1.5 pr-3 pl-10 text-left"
                          >
                            <Box state={selected.has(s.code) ? "all" : "none"} small />
                            <span className="flex-1 text-sm leading-snug">{s.title}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>

          {warningOpen ? (
            <div className="mt-4 rounded-2xl border border-amber-500/60 bg-amber-500/10 p-4">
              <p className="flex gap-2">
                <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-400" />
                <span>
                  Du hast in{" "}
                  {warnUnits.map((code, i) => (
                    <span key={code}>
                      {i > 0 ? (i === warnUnits.length - 1 ? " und " : ", ") : null}
                      <em>{units.find((u) => u.code === code)?.title}</em>
                    </span>
                  ))}{" "}
                  über die Hälfte abgewählt. Sicher?
                </span>
              </p>
              <button
                type="button"
                onClick={() => setConfirmedFor(selectionKey)}
                className="mt-3 h-12 w-full rounded-xl border-2 border-amber-500/70 font-semibold text-amber-300"
              >
                Ja, passt so
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      {error ? <p className="rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{error}</p> : null}

      {mode === "edit" ? (
        <div className="flex flex-col items-center gap-3">
          {confirmDelete ? (
            <div className="w-full rounded-2xl border border-red-500/60 bg-red-500/10 p-4 text-center">
              <p>Wirklich löschen? Deine Fokus-Runden bleiben in der Statistik.</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="h-12 rounded-xl border border-border font-semibold"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => deleteExamAction(props.examId!))}
                  className="h-12 rounded-xl bg-red-500 font-semibold text-white"
                >
                  Ja, löschen
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} className="h-12 px-4 text-red-400">
              Schulaufgabe löschen
            </button>
          )}
        </div>
      ) : null}

      <div className="sticky bottom-0 mt-auto -mx-4 bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
        <button
          type="button"
          disabled={!canSubmit}
          onClick={submit}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-lg font-bold text-primary-foreground disabled:opacity-40"
        >
          {pending ? <Loader2 className="size-5 animate-spin" /> : null}
          {mode === "edit" ? "Speichern" : "Los"}
        </button>
      </div>
    </div>
  );
}

function Box({ state, small = false }: { state: "all" | "some" | "none"; small?: boolean }) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-md border-2",
        small ? "size-6" : "size-7",
        state === "none" ? "border-muted-foreground/50" : "border-primary bg-primary text-primary-foreground",
      )}
    >
      {state === "all" ? <Check className="size-4" strokeWidth={3} /> : null}
      {state === "some" ? <Minus className="size-4" strokeWidth={3} /> : null}
    </span>
  );
}
