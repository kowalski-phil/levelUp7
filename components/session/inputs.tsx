"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useMemo, useState } from "react";
import { InlineMath } from "@/components/math-text";
import type {
  Answer,
  BookingItem,
  ClozeFreeItem,
  ClozeItem,
  ContentItem,
  MatchItem,
  McItem,
  McMultiItem,
  OrderItem,
} from "@/lib/content/types";
import { shuffle } from "@/lib/engine/template";
import { cn } from "@/lib/utils";

export interface InputProps<T extends ContentItem> {
  item: T;
  seed: string;
  disabled: boolean;
  onChange: (answer: Answer | null) => void;
  onSubmit?: () => void;
}

const optionClass = (selected: boolean, disabled: boolean) =>
  cn(
    "w-full min-h-12 rounded-xl border-2 px-4 py-3 text-left text-base transition-colors",
    selected ? "border-primary bg-primary/10" : "border-border bg-card",
    !disabled && !selected && "active:bg-muted",
    disabled && "opacity-80",
  );

export function McInput({ item, seed, disabled, onChange }: InputProps<McItem>) {
  const order = useMemo(() => shuffle(item.payload.options.map((_, i) => i), `${seed}:opts`), [item, seed]);
  const [picked, setPicked] = useState<number | null>(null);
  return (
    <div className="flex flex-col gap-2">
      {order.map((i) => (
        <button
          key={i}
          type="button"
          disabled={disabled}
          className={optionClass(picked === i, disabled)}
          onClick={() => {
            setPicked(i);
            onChange({ type: "mc", index: i });
          }}
        >
          <InlineMath text={item.payload.options[i]} />
        </button>
      ))}
    </div>
  );
}

export function McMultiInput({ item, seed, disabled, onChange }: InputProps<McMultiItem>) {
  const order = useMemo(() => shuffle(item.payload.options.map((_, i) => i), `${seed}:opts`), [item, seed]);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">Mehrere Antworten sind richtig.</p>
      {order.map((i) => (
        <button
          key={i}
          type="button"
          disabled={disabled}
          className={optionClass(picked.has(i), disabled)}
          onClick={() => {
            const next = new Set(picked);
            if (next.has(i)) next.delete(i);
            else next.add(i);
            setPicked(next);
            onChange(next.size ? { type: "mc_multi", indices: [...next] } : null);
          }}
        >
          <span className="mr-2 inline-block w-5 text-center">{picked.has(i) ? "☑" : "☐"}</span>
          <InlineMath text={item.payload.options[i]} />
        </button>
      ))}
    </div>
  );
}

export function NumericInput({
  unit,
  type,
  disabled,
  onChange,
  onSubmit,
}: {
  unit?: string;
  type: "numeric" | "numeric_template";
  disabled: boolean;
  onChange: (a: Answer | null) => void;
  onSubmit?: () => void;
}) {
  const [value, setValue] = useState("");
  const update = (v: string) => {
    setValue(v);
    onChange(v.trim() ? { type, input: v } : null);
  };
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={disabled}
        aria-label="Vorzeichen wechseln"
        className="h-14 w-12 shrink-0 rounded-xl border-2 border-border bg-card text-xl"
        onClick={() => update(value.startsWith("-") ? value.slice(1) : `-${value}`)}
      >
        ±
      </button>
      <input
        inputMode="decimal"
        autoComplete="off"
        enterKeyHint="done"
        disabled={disabled}
        value={value}
        placeholder="Ergebnis"
        onChange={(e) => update(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && value.trim()) onSubmit?.();
        }}
        className="h-14 min-w-0 flex-1 rounded-xl border-2 border-border bg-card px-4 text-xl tabular-nums outline-none focus:border-primary"
      />
      {unit ? <span className="shrink-0 text-lg text-muted-foreground">{unit}</span> : null}
    </div>
  );
}

function splitGaps(text: string): (string | number)[] {
  return text.split(/\[\[(\d+)\]\]/).map((part, i) => (i % 2 === 1 ? Number(part) : part));
}

export function ClozeInput({ item, disabled, onChange }: InputProps<ClozeItem>) {
  const [values, setValues] = useState<string[]>(() => item.payload.gaps.map(() => ""));
  return (
    <div className="rounded-xl border border-border bg-card p-4 text-lg leading-[2.6rem]">
      {splitGaps(item.payload.text).map((part, i) =>
        typeof part === "number" ? (
          <select
            key={i}
            disabled={disabled}
            value={values[part]}
            onChange={(e) => {
              const next = [...values];
              next[part] = e.target.value;
              setValues(next);
              onChange(next.every(Boolean) ? { type: "cloze", answers: next } : null);
            }}
            className="mx-1 h-11 rounded-lg border-2 border-primary/60 bg-background px-2 text-base"
          >
            <option value="">…</option>
            {item.payload.gaps[part].options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        ) : (
          <InlineMath key={i} text={part} />
        ),
      )}
    </div>
  );
}

export function ClozeFreeInput({ item, disabled, onChange }: InputProps<ClozeFreeItem>) {
  const n = item.solution.answers.length;
  const [values, setValues] = useState<string[]>(() => Array.from({ length: n }, () => ""));
  return (
    <div className="rounded-xl border border-border bg-card p-4 text-lg leading-[2.6rem]">
      {splitGaps(item.payload.text).map((part, i) =>
        typeof part === "number" ? (
          <input
            key={i}
            disabled={disabled}
            value={values[part]}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            onChange={(e) => {
              const next = [...values];
              next[part] = e.target.value;
              setValues(next);
              onChange(next.every((v) => v.trim()) ? { type: "cloze_free", answers: next } : null);
            }}
            className="mx-1 h-11 w-36 rounded-lg border-2 border-primary/60 bg-background px-2 text-base outline-none focus:border-primary"
          />
        ) : (
          <InlineMath key={i} text={part} />
        ),
      )}
    </div>
  );
}

export function OrderInput({ item, seed, disabled, onChange }: InputProps<OrderItem>) {
  const [list, setList] = useState<string[]>(() => {
    const s = shuffle(item.payload.items, `${seed}:order`);
    // Nie schon in richtiger Reihenfolge starten.
    return s.every((x, i) => x === item.payload.items[i]) ? [...s.slice(1), s[0]] : s;
  });
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    setList(next);
    onChange({ type: "order", items: next });
  };
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">Bring die Teile mit den Pfeilen in die richtige Reihenfolge.</p>
      {list.map((x, i) => (
        <div key={x} className="flex items-center gap-2 rounded-xl border-2 border-border bg-card py-1 pr-1 pl-3">
          <span className="w-5 shrink-0 text-sm text-muted-foreground tabular-nums">{i + 1}.</span>
          <span className="flex-1 py-2 text-base">
            <InlineMath text={x} />
          </span>
          <button
            type="button"
            aria-label="nach oben"
            disabled={disabled || i === 0}
            onClick={() => move(i, -1)}
            className="grid size-12 shrink-0 place-items-center rounded-lg bg-muted disabled:opacity-30"
          >
            <ArrowUp className="size-5" />
          </button>
          <button
            type="button"
            aria-label="nach unten"
            disabled={disabled || i === list.length - 1}
            onClick={() => move(i, 1)}
            className="grid size-12 shrink-0 place-items-center rounded-lg bg-muted disabled:opacity-30"
          >
            <ArrowDown className="size-5" />
          </button>
        </div>
      ))}
    </div>
  );
}

const PAIR_COLORS = ["#60a5fa", "#4ade80", "#f472b6", "#c084fc", "#2dd4bf", "#f87171"];

export function MatchInput({ item, seed, disabled, onChange }: InputProps<MatchItem>) {
  const lefts = item.payload.pairs.map((p) => p[0]);
  const rights = useMemo(() => shuffle(item.payload.pairs.map((p) => p[1]), `${seed}:match`), [item, seed]);
  const [active, setActive] = useState<string | null>(null);
  const [pairs, setPairs] = useState<Map<string, string>>(new Map());

  const assign = (right: string) => {
    if (!active) return;
    const next = new Map([...pairs].filter(([, r]) => r !== right));
    next.set(active, right);
    setPairs(next);
    const nextLeft = lefts.find((l) => !next.has(l)) ?? null;
    setActive(nextLeft);
    onChange(next.size === lefts.length ? { type: "match", pairs: [...next] } : null);
  };
  const colorOf = (left: string) => PAIR_COLORS[lefts.indexOf(left) % PAIR_COLORS.length];
  const leftOfRight = (right: string) => [...pairs].find(([, r]) => r === right)?.[0];

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">Tippe links, dann rechts, um ein Paar zu bilden.</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-2">
          {lefts.map((l) => (
            <button
              key={l}
              type="button"
              disabled={disabled}
              onClick={() => setActive(l)}
              style={pairs.has(l) ? { borderColor: colorOf(l) } : undefined}
              className={cn(
                "min-h-14 rounded-xl border-2 bg-card px-3 py-2 text-left text-sm",
                active === l ? "border-primary bg-primary/10" : "border-border",
              )}
            >
              <InlineMath text={l} />
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          {rights.map((r) => {
            const owner = leftOfRight(r);
            return (
              <button
                key={r}
                type="button"
                disabled={disabled || !active}
                onClick={() => assign(r)}
                style={owner ? { borderColor: colorOf(owner) } : undefined}
                className="min-h-14 rounded-xl border-2 border-border bg-card px-3 py-2 text-left text-sm disabled:opacity-100"
              >
                <InlineMath text={r} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

type Line = { account: string; amount: string };

export function BookingInput({ item, disabled, onChange }: InputProps<BookingItem>) {
  const [soll, setSoll] = useState<Line[]>(() => item.solution.soll.map(() => ({ account: "", amount: "" })));
  const [haben, setHaben] = useState<Line[]>(() => item.solution.haben.map(() => ({ account: "", amount: "" })));

  const emit = (s: Line[], h: Line[]) => {
    const complete = [...s, ...h].every((l) => l.account && l.amount.trim());
    onChange(complete ? { type: "booking", soll: s, haben: h } : null);
  };

  const renderLines = (lines: Line[], set: (l: Line[]) => void, other: Line[], side: "soll" | "haben") =>
    lines.map((line, i) => (
      <div key={i} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-2">
        <select
          disabled={disabled}
          value={line.account}
          onChange={(e) => {
            const next = lines.map((l, j) => (j === i ? { ...l, account: e.target.value } : l));
            set(next);
            if (side === "soll") emit(next, other);
            else emit(other, next);
          }}
          className="h-12 w-full rounded-lg border-2 border-border bg-background px-2 text-base"
        >
          <option value="">Konto wählen …</option>
          {item.payload.accounts.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <input
            inputMode="decimal"
            autoComplete="off"
            placeholder="Betrag"
            disabled={disabled}
            value={line.amount}
            onChange={(e) => {
              const next = lines.map((l, j) => (j === i ? { ...l, amount: e.target.value } : l));
              set(next);
              if (side === "soll") emit(next, other);
              else emit(other, next);
            }}
            className="h-12 min-w-0 flex-1 rounded-lg border-2 border-border bg-background px-3 text-lg tabular-nums outline-none focus:border-primary"
          />
          <span className="text-muted-foreground">€</span>
        </div>
      </div>
    ));

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Soll</p>
      {renderLines(soll, setSoll, haben, "soll")}
      <p className="py-1 text-center font-semibold">an</p>
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Haben</p>
      {renderLines(haben, setHaben, soll, "haben")}
    </div>
  );
}
