import type { Answer, BookingLine, ContentItem } from "@/lib/content/types";
import type { Result } from "./sm2";
import { instantiate, parseNumberDe } from "./template";

/** Ergebnis einer Antwort; "not_yet" = Stoff war im Unterricht noch nicht dran (zählt nicht). */
export type AnswerResult = Result | "not_yet";

/** Mit Tipp gelöst: richtig zählt nur als teilweise, damit die Aufgabe früher wiederkommt. */
export function withHint(result: Result, hintUsed: boolean): Result {
  return hintUsed && result === "correct" ? "partial" : result;
}

/** Seed für Zufallswerte und Mischreihenfolge: gleiche Session + gleiche Aufgabe = gleiche Zahlen. */
export const instanceSeed = (sessionId: string, itemCode: string) => `${sessionId}:${itemCode}`;

/**
 * Seed pro Versuch: Beim Wiederholen in derselben Runde sind die Optionen neu gemischt und
 * die Zahlen neu gewürfelt, damit er nicht einfach die Position der richtigen Antwort merkt.
 */
export const attemptSeed = (sessionId: string, itemCode: string, attempt: number) =>
  attempt === 0 ? instanceSeed(sessionId, itemCode) : `${instanceSeed(sessionId, itemCode)}:${attempt}`;

/** Versuche pro Aufgabe und Runde. Danach geht es weiter, damit eine Aufgabe die Runde nie blockiert. */
export const MAX_ATTEMPTS = 3;

/** Gelöst = wirklich richtig (Tipp erlaubt). Selbsteinschätzung wird nicht wiederholt, die Musterlösung kennt er schon. */
export function isSolved(item: Pick<ContentItem, "type">, raw: Result): boolean {
  return item.type === "self_check" || raw === "correct";
}

export interface AttemptState {
  result: AnswerResult;
  solved: boolean;
  attempts: number;
}

/** Aufgabe ist für diese Runde erledigt: gelöst, zurückgestellt oder alle Versuche verbraucht. */
export function isDone(a: AttemptState): boolean {
  return a.result === "not_yet" || a.solved || a.attempts >= MAX_ATTEMPTS;
}

/** Fehler für die Elternansicht: beim ersten Versuch nicht gelöst oder als "Daneben" selbst eingeschätzt. */
export function isMistake(a: AttemptState): boolean {
  if (a.result === "not_yet") return false;
  return a.result === "wrong" || !a.solved || a.attempts > 1;
}

/** Zusätzliche Versuche nach dem ersten. */
export const extraAttempts = (a: AttemptState) => (a.result === "not_yet" ? 0 : Math.max(0, a.attempts - 1));

function fraction(hits: number, total: number): Result {
  if (total > 0 && hits === total) return "correct";
  if (total > 0 && hits / total >= 0.5) return "partial";
  return "wrong";
}

export function normalizeText(s: string, caseSensitive: boolean): string {
  const t = s
    .trim()
    .replace(/[’`´]/g, "'")
    .replace(/\s+/g, " ")
    .replace(/[.!?]+$/, "");
  return caseSensitive ? t : t.toLowerCase();
}

/**
 * Vergleichsform einer Vokabel: ohne Groß/klein, ohne Platzhalter sb/sth/something, ohne Klammern, ohne führendes "to".
 * "(to) apply for sb/sth" und "apply for" ergeben beide "apply for".
 */
export function vocabKey(s: string): string {
  return normalizeText(s, false)
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b(sb|sth)\b\.?('s)?/g, " ")
    // Ausgeschrieben zählt auch, aber nur nach einem anderen Wort: "someone" allein ist selbst eine Vokabel.
    .replace(/(?<=\S )(something|somebody|someone)('s)?(?=\s|$)/g, " ")
    .replace(/(^|\s)\/(?=\s|$)/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^to /, "");
}

/** Vergleichsformen mit und ohne Klammerinhalt: "(not) necessarily" gilt als "necessarily" und als "not necessarily". */
export function vocabKeys(s: string): string[] {
  const without = vocabKey(s);
  const with_ = vocabKey(s.replace(/[()]/g, ""));
  return without === with_ ? [without] : [without, with_];
}

/** Anzahl Tipp-, Lösch-, Einfüge- und Dreherfehler zwischen zwei Wörtern ("complian" statt "complain" = 1). */
export function editDistance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

/** Ein Buchstabe daneben oder ein Dreher gilt bei Wörtern ab 5 Buchstaben als Schreibfehler: teilweise richtig, kommt nochmal. */
function gradeVocab(input: string, answers: readonly string[]): Result {
  const given = vocabKey(input);
  if (!given) return "wrong";
  const keys = answers.flatMap(vocabKeys);
  if (keys.includes(given)) return "correct";
  return keys.some((k) => k.length >= 5 && editDistance(k, given) === 1) ? "partial" : "wrong";
}

function numbersMatch(input: string, expected: number, tolerance: number): boolean {
  const n = parseNumberDe(input);
  return n !== null && Math.abs(n - expected) <= tolerance + 1e-9;
}

function bookingResult(
  given: { account: string; amount: string }[],
  expected: BookingLine[],
): { accounts: boolean; amounts: boolean } {
  const g = given.filter((l) => l.account);
  if (g.length !== expected.length) return { accounts: false, amounts: false };
  const remaining = [...expected];
  let amounts = true;
  for (const line of g) {
    const i = remaining.findIndex((e) => e.account === line.account);
    if (i < 0) return { accounts: false, amounts: false };
    if (!numbersMatch(line.amount, remaining[i].amount, 0.005)) amounts = false;
    remaining.splice(i, 1);
  }
  return { accounts: true, amounts };
}

export function grade(item: ContentItem, answer: Answer, seed: string): Result {
  if (answer.type !== item.type) return "wrong";

  switch (item.type) {
    case "mc":
      return (answer as Extract<Answer, { type: "mc" }>).index === item.solution.index ? "correct" : "wrong";

    case "mc_multi": {
      const picked = new Set((answer as Extract<Answer, { type: "mc_multi" }>).indices);
      const right = new Set(item.solution.indices);
      const wrongPicks = [...picked].filter((i) => !right.has(i)).length;
      const hits = [...picked].filter((i) => right.has(i)).length;
      if (wrongPicks === 0 && hits === right.size) return "correct";
      if (wrongPicks === 0 && hits > 0) return "partial";
      return "wrong";
    }

    case "numeric":
      return numbersMatch((answer as Extract<Answer, { type: "numeric" }>).input, item.solution.value, item.payload.tolerance)
        ? "correct"
        : "wrong";

    case "numeric_template": {
      const { answer: expected } = instantiate(item.payload, seed);
      return numbersMatch((answer as Extract<Answer, { type: "numeric_template" }>).input, expected, item.payload.tolerance)
        ? "correct"
        : "wrong";
    }

    case "cloze": {
      const given = (answer as Extract<Answer, { type: "cloze" }>).answers;
      const hits = item.solution.answers.filter((a, i) => given[i] === a).length;
      return fraction(hits, item.solution.answers.length);
    }

    case "cloze_free": {
      const cs = item.payload.case_sensitive ?? false;
      const given = (answer as Extract<Answer, { type: "cloze_free" }>).answers;
      const hits = item.solution.answers.filter((variants, i) =>
        variants.some((v) => normalizeText(v, cs) === normalizeText(given[i] ?? "", cs)),
      ).length;
      return fraction(hits, item.solution.answers.length);
    }

    case "order": {
      const given = (answer as Extract<Answer, { type: "order" }>).items;
      const hits = item.payload.items.filter((x, i) => given[i] === x).length;
      return fraction(hits, item.payload.items.length);
    }

    case "match": {
      const given = new Map((answer as Extract<Answer, { type: "match" }>).pairs);
      const hits = item.payload.pairs.filter(([l, r]) => given.get(l) === r).length;
      return fraction(hits, item.payload.pairs.length);
    }

    case "booking": {
      const a = answer as Extract<Answer, { type: "booking" }>;
      const soll = bookingResult(a.soll, item.solution.soll);
      const haben = bookingResult(a.haben, item.solution.haben);
      if (soll.accounts && haben.accounts) return soll.amounts && haben.amounts ? "correct" : "partial";
      return "wrong";
    }

    case "self_check":
      return (answer as Extract<Answer, { type: "self_check" }>).rating;

    case "vocab":
      return gradeVocab((answer as Extract<Answer, { type: "vocab" }>).input, item.solution.answers);
  }
}
