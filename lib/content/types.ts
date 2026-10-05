// Schema der Aufgaben in content/<fach>/<unit_code>.json (PLAN.md Abschnitt 5).
// Lückentexte markieren Lücken mit [[0]], [[1]], ... im Feld payload.text.

import type { TemplateSpec } from "@/lib/engine/template";

export type SubjectCode = "E" | "F";

interface Base {
  code: string;
  skill_code: string;
  difficulty: 1 | 2 | 3;
  /** Aufgabentext, Markdown mit KaTeX ($...$). Bei numeric_template mit {{param}}. */
  stem: string;
  explanation: string;
  /** Denkanstoß vor der Antwort (alle Typen außer self_check). */
  hint?: string;
}

export interface McItem extends Base {
  type: "mc";
  payload: { options: string[] };
  solution: { index: number };
}

export interface McMultiItem extends Base {
  type: "mc_multi";
  payload: { options: string[] };
  solution: { indices: number[] };
}

export interface NumericItem extends Base {
  type: "numeric";
  payload: { unit?: string; tolerance: number };
  solution: { value: number };
}

export interface NumericTemplateItem extends Base {
  type: "numeric_template";
  payload: TemplateSpec & { unit?: string; tolerance: number };
  solution?: null;
}

export interface ClozeItem extends Base {
  type: "cloze";
  payload: { text: string; gaps: { options: string[] }[] };
  solution: { answers: string[] };
}

export interface ClozeFreeItem extends Base {
  type: "cloze_free";
  payload: { text: string; case_sensitive?: boolean };
  /** Pro Lücke die akzeptierten Schreibweisen. */
  solution: { answers: string[][] };
}

export interface OrderItem extends Base {
  type: "order";
  /** items in der RICHTIGEN Reihenfolge; die App mischt sie beim Anzeigen. */
  payload: { items: string[] };
  solution?: null;
}

export interface MatchItem extends Base {
  type: "match";
  /** Richtige Paare [links, rechts]; die App mischt die rechte Seite. */
  payload: { pairs: [string, string][] };
  solution?: null;
}

export interface BookingLine {
  account: string;
  amount: number;
}

export interface BookingItem extends Base {
  type: "booking";
  /** Kontenauswahl für die Dropdowns (richtige Konten plus typische Verwechslungen). */
  payload: { accounts: string[] };
  solution: { soll: BookingLine[]; haben: BookingLine[] };
}

export interface SelfCheckItem extends Base {
  type: "self_check";
  payload: { sample_answer: string; criteria?: string[] };
  solution?: null;
}

/** Vokabel aus einer abfotografierten Buchseite: stem fragt nach dem deutschen Wort, Paula tippt das englische oder französische. */
export interface VocabItem extends Base {
  type: "vocab";
  /** Seite im Vokabelteil des Buchs, nur zur Nachverfolgung. */
  payload: { page?: number };
  /** Akzeptierte Schreibweisen, die erste wird als Lösung gezeigt. "to", "sb", "sth" und (...) sind optional. */
  solution: { answers: string[] };
}

export type ContentItem =
  | McItem
  | McMultiItem
  | NumericItem
  | NumericTemplateItem
  | ClozeItem
  | ClozeFreeItem
  | OrderItem
  | MatchItem
  | BookingItem
  | SelfCheckItem
  | VocabItem;

export type ItemType = ContentItem["type"];

export const ITEM_TYPES: ItemType[] = [
  "mc",
  "mc_multi",
  "numeric",
  "numeric_template",
  "cloze",
  "cloze_free",
  "order",
  "match",
  "booking",
  "self_check",
  "vocab",
];

/** Antwortformen, wie die Session-UI sie an die Auswertung übergibt. */
export type Answer =
  | { type: "mc"; index: number }
  | { type: "mc_multi"; indices: number[] }
  | { type: "numeric"; input: string }
  | { type: "numeric_template"; input: string }
  | { type: "cloze"; answers: string[] }
  | { type: "cloze_free"; answers: string[] }
  | { type: "order"; items: string[] }
  | { type: "match"; pairs: [string, string][] }
  | { type: "booking"; soll: { account: string; amount: string }[]; haben: { account: string; amount: string }[] }
  | { type: "self_check"; text: string; rating: "correct" | "partial" | "wrong" }
  | { type: "vocab"; input: string };
