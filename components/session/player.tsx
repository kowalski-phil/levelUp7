"use client";

import { Check, Lightbulb, Loader2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { finishSession, markNotYet, retryAnswer, submitAnswer } from "@/app/(student)/session/actions";
import { MathText } from "@/components/math-text";
import type { Answer, ContentItem } from "@/lib/content/types";
import { attemptSeed, grade, isDone, isSolved, MAX_ATTEMPTS, withHint, type AttemptState } from "@/lib/engine/grading";
import type { Result } from "@/lib/engine/sm2";
import { fillTemplate, instantiate } from "@/lib/engine/template";
import { cn } from "@/lib/utils";
import {
  BookingInput,
  ClozeFreeInput,
  ClozeInput,
  MatchInput,
  McInput,
  McMultiInput,
  NumericInput,
  OrderInput,
  VocabInput,
} from "./inputs";
import { SolutionView } from "./solution";
import type { PlayerItem, PlayerProps } from "./types";

const FEEDBACK: Record<Exclude<Result, "skipped">, { title: string; className: string }> = {
  correct: { title: "Richtig!", className: "border-green-500/60 bg-green-500/10" },
  partial: { title: "Teilweise richtig", className: "border-amber-500/60 bg-amber-500/10" },
  wrong: { title: "Nicht ganz", className: "border-red-500/60 bg-red-500/10" },
};

/** Ein Schritt der Runde: Aufgabe plus Versuch (0 = erster Versuch, ab 1 Wiederholung am Ende der Runde). */
interface Step {
  pi: PlayerItem;
  attempt: number;
}

/** Nach dem Neuladen: alle Aufgaben, dahinter die noch offenen Wiederholungen. */
function initialSteps(items: PlayerItem[], answered: Record<string, AttemptState>): Step[] {
  const retries = items.flatMap((pi) => {
    const a = answered[pi.id];
    return a && !isDone(a) ? [{ pi, attempt: a.attempts }] : [];
  });
  return [...items.map((pi) => ({ pi, attempt: 0 })), ...retries];
}

export function SessionPlayer({ sessionId, kind, items: initialItems, answered, preview = false, label, labelColor }: PlayerProps) {
  const [steps, setSteps] = useState<Step[]>(() => initialSteps(initialItems, answered));
  const [skipped, setSkipped] = useState<Set<string>>(
    () => new Set(Object.entries(answered).filter(([, a]) => a.result === "not_yet").map(([id]) => id)),
  );
  const [index, setIndex] = useState(() => {
    const open = steps.findIndex((st) => st.attempt > 0 || !answered[st.pi.id]);
    return open < 0 ? steps.length - 1 : open;
  });
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [result, setResult] = useState<Result | null>(() => {
    const a = steps[index].attempt === 0 ? answered[steps[index].pi.id] : undefined;
    return a && a.result !== "not_yet" ? a.result : null;
  });
  /** Falsch gelöst, kommt am Ende der Runde nochmal. */
  const [requeued, setRequeued] = useState(false);
  const [hintShown, setHintShown] = useState(false);
  const [confirmNotYet, setConfirmNotYet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finishing, startFinish] = useTransition();
  const startedAt = useRef(0);

  // Zeitmessung pro Aufgabe startet, sobald sie angezeigt wird.
  useEffect(() => {
    startedAt.current = Date.now();
  }, [index]);

  const step = steps[index];
  const current = step.pi;
  const isRetry = step.attempt > 0;
  const seed = attemptSeed(sessionId, current.item.code, step.attempt);
  const isLast = index === steps.length - 1;

  const stem = useMemo(() => {
    if (current.item.type !== "numeric_template") return current.item.stem;
    return fillTemplate(current.item.stem, instantiate(current.item.payload, seed).values);
  }, [current, seed]);

  const advance = (list: Step[]) => {
    if (index >= list.length - 1) {
      if (preview) window.location.reload();
      else startFinish(() => finishSession(sessionId));
      return;
    }
    setIndex(index + 1);
    setAnswer(null);
    setResult(null);
    setRequeued(false);
    setHintShown(false);
    setConfirmNotYet(false);
    window.scrollTo({ top: 0 });
  };

  /** Erster Versuch zählt für Statistik und Wiederholplan, jede Wiederholung nur als Versuch. */
  const save = async (a: Answer) => {
    const secs = (Date.now() - startedAt.current) / 1000;
    if (isRetry) {
      await retryAnswer(sessionId, current.id, step.attempt, a, secs);
      return;
    }
    const { result: server } = await submitAnswer(sessionId, current.id, a, secs, hintShown);
    if (server !== "not_yet") setResult(server);
  };

  const submit = async (a: Answer | null = answer) => {
    if (!a || result || saving) return;
    const raw = grade(current.item, a, seed);
    // Beim Wiederholen ist der Tipp kein Abzug: dort zählt nur, ob es jetzt sitzt.
    setResult(isRetry ? raw : withHint(raw, hintShown));
    if (!isSolved(current.item, raw) && step.attempt + 1 < MAX_ATTEMPTS) {
      setRequeued(true);
      setSteps([...steps, { pi: current, attempt: step.attempt + 1 }]);
    }
    setSaving(true);
    setError(null);
    try {
      if (!preview) await save(a);
    } catch {
      setError("Speichern hat nicht geklappt. Prüf die Verbindung und tipp nochmal auf Weiter.");
    } finally {
      setSaving(false);
    }
  };

  const next = async () => {
    if (error && answer) {
      // Erneut speichern, bevor es weitergeht.
      setSaving(true);
      try {
        await save(answer);
        setError(null);
      } catch {
        setSaving(false);
        return;
      }
      setSaving(false);
    }
    advance(steps);
  };

  const notYet = async () => {
    setSaving(true);
    setError(null);
    try {
      const replacement = preview ? null : (await markNotYet(sessionId, current.id)).replacement;
      const list = replacement ? [...steps, { pi: replacement, attempt: 0 }] : steps;
      setSteps(list);
      setSkipped(new Set([...skipped, current.id]));
      advance(list);
    } catch {
      setError("Hat nicht geklappt. Prüf die Verbindung und versuch es nochmal.");
    } finally {
      setSaving(false);
    }
  };

  const locked = result !== null;
  // Fortschritt ohne übersprungene Aufgaben ("hatten wir noch nicht"). Wiederholungen verlängern die Runde sichtbar.
  const total = steps.filter((st) => !skipped.has(st.pi.id)).length;
  const position = steps.slice(0, index).filter((st) => !skipped.has(st.pi.id)).length;
  const progress = position + (locked ? 1 : 0);
  // Mit Tipp richtig gelöst: zählt als "teilweise", wird aber als Erfolg angezeigt.
  const solvedWithHint =
    !isRetry && hintShown && result === "partial" && answer !== null && grade(current.item, answer, seed) === "correct";
  // Letzter Versuch daneben: weiter, die Aufgabe kommt über den Wiederholplan in den nächsten Tagen wieder.
  const givenUp = isRetry && locked && !requeued && result !== "correct";
  const showSolution = result === "wrong" || (result === "partial" && !solvedWithHint);

  return (
    <div className="flex flex-1 flex-col gap-5">
      <header className="flex items-center gap-3">
        <Link href="/" aria-label="Zur Startseite" className="grid size-12 shrink-0 place-items-center rounded-full text-muted-foreground">
          <X className="size-6" />
        </Link>
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(progress / Math.max(total, 1)) * 100}%` }} />
        </div>
        <span className="min-w-12 shrink-0 text-right text-sm text-muted-foreground tabular-nums">
          {label ? (
            <span className="font-semibold" style={{ color: labelColor }}>
              {label} ·{" "}
            </span>
          ) : null}
          {Math.min(position + 1, total)}/{total}
        </span>
      </header>

      <div className="flex items-center gap-2 text-sm">
        <span className="rounded-full px-2.5 py-0.5 font-semibold text-black" style={{ background: current.subjectColor }}>
          {current.subjectName}
        </span>
        <span className="truncate text-muted-foreground">{current.skillTitle}</span>
        {isRetry ? (
          <span className="ml-auto shrink-0 text-xs font-semibold text-amber-400">Nochmal</span>
        ) : kind === "bonus" ? (
          <span className="ml-auto text-xs text-primary">Bonus</span>
        ) : null}
      </div>

      <MathText text={stem} className="text-lg leading-relaxed" />

      {current.item.hint && !locked ? (
        hintShown ? (
          <div className="flex gap-3 rounded-xl border border-sky-500/50 bg-sky-500/10 p-3">
            <Lightbulb className="mt-0.5 size-5 shrink-0 text-sky-400" />
            <div className="text-base">
              <MathText text={current.item.hint} />
              {isRetry ? null : (
                <p className="mt-1 text-xs text-muted-foreground">Mit Tipp zählt eine richtige Antwort als teilweise richtig.</p>
              )}
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setHintShown(true)}
            className="flex h-12 items-center gap-2 self-start rounded-xl border border-border px-4 text-sky-400"
          >
            <Lightbulb className="size-5" /> Tipp
          </button>
        )
      ) : null}

      <div key={`${current.id}:${step.attempt}`}>
        <ItemInput
          item={current.item}
          seed={seed}
          disabled={locked}
          onChange={setAnswer}
          onSubmit={() => submit()}
          onSelfRate={(a) => {
            setAnswer(a);
            submit(a);
          }}
        />
      </div>

      {locked && result && result !== "skipped" ? (
        <div className={cn("rounded-xl border-2 p-4", FEEDBACK[solvedWithHint ? "correct" : result].className)}>
          <p className="mb-2 flex items-center gap-2 text-lg font-bold">
            {result === "correct" ? <Check className="size-5" /> : null}
            {solvedWithHint
              ? "Richtig, mit Tipp"
              : result === "partial" && current.item.type === "vocab"
                ? "Fast, nur ein Tippfehler"
                : FEEDBACK[result].title}
          </p>
          {showSolution && current.item.type !== "self_check" ? (
            <div className="mb-3">
              <p className="mb-1 text-sm text-muted-foreground">Richtig ist:</p>
              <SolutionView item={current.item} seed={seed} />
            </div>
          ) : null}
          <MathText text={current.item.explanation} className="text-base text-foreground/90" />
          {requeued ? (
            <p className="mt-3 border-t border-border pt-3 text-sm font-semibold">
              Lies dir die Erklärung durch. Die Aufgabe kommt am Ende der Runde nochmal, neu gemischt.
            </p>
          ) : givenUp ? (
            <p className="mt-3 border-t border-border pt-3 text-sm text-muted-foreground">
              Für heute lassen wir sie. Sie kommt in den nächsten Tagen wieder.
            </p>
          ) : null}
        </div>
      ) : null}

      {!locked && !isRetry && current.item.type !== "vocab" ? (
        confirmNotYet ? (
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-sm">Dann kommt dieses Thema erst in 3 Wochen wieder. Die Aufgabe zählt nicht, du bekommst eine andere.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setConfirmNotYet(false)} className="h-12 rounded-xl border border-border">
                Abbrechen
              </button>
              <button type="button" disabled={saving} onClick={notYet} className="h-12 rounded-xl bg-muted font-semibold">
                Ja, noch nicht
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmNotYet(true)}
            className="h-12 self-center px-4 text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Hatten wir im Unterricht noch nicht
          </button>
        )
      ) : null}

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <div className="sticky bottom-0 mt-auto bg-background pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {!locked ? (
          current.item.type === "self_check" ? null : (
            <button
              type="button"
              disabled={!answer}
              onClick={() => submit()}
              className="h-14 w-full rounded-2xl bg-primary text-lg font-bold text-primary-foreground disabled:opacity-40"
            >
              Prüfen
            </button>
          )
        ) : (
          <button
            type="button"
            disabled={saving || finishing}
            onClick={next}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-lg font-bold text-primary-foreground disabled:opacity-60"
          >
            {saving || finishing ? <Loader2 className="size-5 animate-spin" /> : null}
            {isLast ? "Abschließen" : "Weiter"}
          </button>
        )}
      </div>
    </div>
  );
}

function ItemInput({
  item,
  seed,
  disabled,
  onChange,
  onSubmit,
  onSelfRate,
}: {
  item: ContentItem;
  seed: string;
  disabled: boolean;
  onChange: (a: Answer | null) => void;
  onSubmit: () => void;
  onSelfRate: (a: Answer) => void;
}) {
  switch (item.type) {
    case "mc":
      return <McInput item={item} seed={seed} disabled={disabled} onChange={onChange} />;
    case "mc_multi":
      return <McMultiInput item={item} seed={seed} disabled={disabled} onChange={onChange} />;
    case "numeric":
    case "numeric_template":
      return <NumericInput type={item.type} unit={item.payload.unit} disabled={disabled} onChange={onChange} onSubmit={onSubmit} />;
    case "cloze":
      return <ClozeInput item={item} seed={seed} disabled={disabled} onChange={onChange} />;
    case "cloze_free":
      return <ClozeFreeInput item={item} seed={seed} disabled={disabled} onChange={onChange} />;
    case "order":
      return <OrderInput item={item} seed={seed} disabled={disabled} onChange={onChange} />;
    case "match":
      return <MatchInput item={item} seed={seed} disabled={disabled} onChange={onChange} />;
    case "booking":
      return <BookingInput item={item} seed={seed} disabled={disabled} onChange={onChange} />;
    case "self_check":
      return <SelfCheck item={item} disabled={disabled} onRate={onSelfRate} />;
    case "vocab":
      return <VocabInput disabled={disabled} onChange={onChange} onSubmit={onSubmit} />;
  }
}

function SelfCheck({
  item,
  disabled,
  onRate,
}: {
  item: Extract<ContentItem, { type: "self_check" }>;
  disabled: boolean;
  onRate: (a: Answer) => void;
}) {
  const [text, setText] = useState("");
  const [revealed, setRevealed] = useState(false);
  const rate = (rating: "correct" | "partial" | "wrong") => onRate({ type: "self_check", text, rating });

  return (
    <div className="flex flex-col gap-3">
      <textarea
        value={text}
        disabled={revealed}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        placeholder="Deine Antwort (Stichpunkte reichen)"
        className="w-full rounded-xl border-2 border-border bg-card p-3 text-base outline-none focus:border-primary"
      />
      {!revealed ? (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="h-14 w-full rounded-2xl border-2 border-primary text-lg font-bold text-primary"
        >
          Musterlösung zeigen
        </button>
      ) : (
        <>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="mb-1 text-sm text-muted-foreground">Musterlösung</p>
            <MathText text={item.payload.sample_answer} />
            {item.payload.criteria?.length ? (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {item.payload.criteria.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            ) : null}
          </div>
          {!disabled ? (
            <>
              <p className="text-sm text-muted-foreground">Wie gut war deine Antwort?</p>
              <div className="grid grid-cols-3 gap-2">
                <button type="button" onClick={() => rate("correct")} className="h-14 rounded-xl bg-green-600 font-bold text-white">
                  Passt
                </button>
                <button type="button" onClick={() => rate("partial")} className="h-14 rounded-xl bg-amber-600 font-bold text-white">
                  Teilweise
                </button>
                <button type="button" onClick={() => rate("wrong")} className="h-14 rounded-xl bg-red-600 font-bold text-white">
                  Daneben
                </button>
              </div>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
