// Strukturprüfung der Aufgaben. Fehler blockieren den Seed, Warnungen sind Hinweise für die Durchsicht.
import { instantiate } from "@/lib/engine/template";
import type { ContentFile, Structure } from "./load";
import { ITEM_TYPES, type ContentItem } from "./types";

export interface Issue {
  code: string;
  level: "error" | "warn";
  msg: string;
}

const GAP = /\[\[(\d+)\]\]/g;
const LENGTH_UNITS = /^(mm|cm|dm|m|km|mm²|cm²|dm²|m²|km²|mm³|cm³|dm³|m³|l|ml|Liter|°)$/;

function gapCount(text: string): number {
  const idx = [...text.matchAll(GAP)].map((m) => Number(m[1]));
  return idx.length;
}

function sentences(s: string): number {
  return s.split(/(?<=[.!?])\s+(?=[A-ZÄÖÜ0-9$])/).filter((x) => x.trim()).length;
}

function checkItem(item: ContentItem, unitCode: string, skills: Set<string>, push: (level: Issue["level"], msg: string) => void) {
  if (!new RegExp(`^${unitCode}-\\d{3}$`).test(item.code ?? "")) push("error", `code muss ${unitCode}-NNN sein`);
  if (!skills.has(item.skill_code)) push("error", `skill_code ${item.skill_code} gehört nicht zu ${unitCode}`);
  if (!ITEM_TYPES.includes(item.type)) push("error", `unbekannter type ${item.type}`);
  if (![1, 2, 3].includes(item.difficulty)) push("error", "difficulty muss 1, 2 oder 3 sein");
  if (!item.stem?.trim()) push("error", "stem fehlt");
  if (!item.explanation?.trim()) push("error", "explanation fehlt");
  if (item.type !== "self_check" && !item.hint?.trim()) push("error", "hint fehlt");
  else {
    const n = sentences(item.explanation);
    if (n < 2 || n > 5) push("warn", `explanation hat ${n} Sätze (Soll 2-4)`);
  }
  if (!item.payload) {
    push("error", "payload fehlt");
    return;
  }

  switch (item.type) {
    case "mc": {
      const o = item.payload.options ?? [];
      if (o.length !== 4) push("error", "mc braucht genau 4 Optionen");
      if (new Set(o).size !== o.length) push("error", "doppelte Optionen");
      if (!(item.solution?.index >= 0 && item.solution.index < o.length)) push("error", "solution.index ungültig");
      break;
    }
    case "mc_multi": {
      const o = item.payload.options ?? [];
      const idx = item.solution?.indices ?? [];
      if (o.length < 4) push("error", "mc_multi braucht mindestens 4 Optionen");
      if (new Set(o).size !== o.length) push("error", "doppelte Optionen");
      if (idx.length < 2) push("warn", "mc_multi mit nur einer richtigen Option");
      if (idx.some((i) => !(i >= 0 && i < o.length)) || new Set(idx).size !== idx.length) push("error", "solution.indices ungültig");
      break;
    }
    case "numeric":
      if (typeof item.solution?.value !== "number") push("error", "solution.value fehlt");
      if (!(item.payload.tolerance >= 0)) push("error", "tolerance fehlt");
      break;
    case "numeric_template": {
      const p = item.payload;
      if (!(p.tolerance >= 0)) push("error", "tolerance fehlt");
      for (const [name, r] of Object.entries(p.params ?? {})) {
        if (!(r.step > 0) || !(r.max >= r.min)) push("error", `Parameter ${name}: min/max/step ungültig`);
      }
      const names = new Set([...Object.keys(p.params ?? {}), ...Object.keys(p.derived ?? {})]);
      for (const m of item.stem.matchAll(/\{\{\s*([A-Za-z_][A-Za-z_0-9]*)\s*\}\}/g)) {
        if (!names.has(m[1])) push("error", `Platzhalter {{${m[1]}}} ohne Parameter`);
      }
      const answers: number[] = [];
      try {
        for (let i = 0; i < 300; i++) {
          const inst = instantiate(p, `check-${i}`);
          answers.push(inst.answer);
          for (const [k, v] of Object.entries(inst.values)) {
            if (!Number.isFinite(v)) throw new Error(`${k} ist nicht endlich`);
          }
        }
      } catch (e) {
        push("error", `Template: ${(e as Error).message}`);
        break;
      }
      if (p.unit && LENGTH_UNITS.test(p.unit) && answers.some((a) => a <= 0)) push("error", "Ergebnis ≤ 0 bei Längen-/Flächen-/Volumeneinheit");
      if (p.tolerance === 0 && answers.some((a) => Math.abs(a - Math.round(a * 100) / 100) > 1e-9)) {
        push("error", "tolerance 0, aber Ergebnis hat mehr als 2 Nachkommastellen");
      }
      if (p.tolerance > 0 && answers.some((a) => Math.abs(a) > 0 && p.tolerance / Math.abs(a) > 0.05)) {
        push("warn", "tolerance ist größer als 5 % des Ergebnisses");
      }
      break;
    }
    case "cloze": {
      const n = gapCount(item.payload.text ?? "");
      const gaps = item.payload.gaps ?? [];
      if (n === 0) push("error", "cloze ohne [[0]]-Lücken");
      if (n !== gaps.length || n !== (item.solution?.answers ?? []).length) push("error", "Anzahl Lücken, gaps und answers passt nicht");
      gaps.forEach((g, i) => {
        if (!g.options?.includes(item.solution?.answers?.[i])) push("error", `Lücke ${i}: Lösung nicht in options`);
        if (new Set(g.options).size !== g.options?.length) push("error", `Lücke ${i}: doppelte Optionen`);
      });
      break;
    }
    case "cloze_free": {
      const n = gapCount(item.payload.text ?? "");
      if (n === 0) push("error", "cloze_free ohne [[0]]-Lücken");
      if (n !== (item.solution?.answers ?? []).length) push("error", "Anzahl Lücken und answers passt nicht");
      if ((item.solution?.answers ?? []).some((v) => !Array.isArray(v) || !v.length)) push("error", "answers muss je Lücke ein nicht leeres Array sein");
      break;
    }
    case "order": {
      const it = item.payload.items ?? [];
      if (it.length < 3) push("error", "order braucht mindestens 3 Elemente");
      if (new Set(it).size !== it.length) push("error", "doppelte Elemente");
      break;
    }
    case "match": {
      const pairs = item.payload.pairs ?? [];
      if (pairs.length < 3) push("error", "match braucht mindestens 3 Paare");
      if (new Set(pairs.map((p) => p[0])).size !== pairs.length || new Set(pairs.map((p) => p[1])).size !== pairs.length) {
        push("error", "linke und rechte Seite müssen eindeutig sein");
      }
      break;
    }
    case "booking": {
      const acc = new Set(item.payload.accounts ?? []);
      const { soll = [], haben = [] } = item.solution ?? {};
      if (!soll.length || !haben.length) push("error", "booking braucht Soll und Haben");
      for (const l of [...soll, ...haben]) {
        if (!acc.has(l.account)) push("error", `Konto "${l.account}" fehlt in payload.accounts`);
        if (!(l.amount > 0)) push("error", `Betrag bei "${l.account}" muss > 0 sein`);
      }
      const sum = (ls: { amount: number }[]) => Math.round(ls.reduce((s, l) => s + l.amount, 0) * 100);
      if (sum(soll) !== sum(haben)) push("error", "Summe Soll ≠ Summe Haben");
      if (acc.size < 4) push("warn", "weniger als 4 Konten zur Auswahl");
      break;
    }
    case "self_check":
      if (!item.payload.sample_answer?.trim()) push("error", "sample_answer fehlt");
      break;
  }
}

export function validateContent(structure: Structure, files: readonly ContentFile[]): Issue[] {
  const issues: Issue[] = [];
  const seen = new Set<string>();
  for (const file of files) {
    const unit = structure.units.find((u) => u.code === file.unitCode);
    if (!unit) {
      issues.push({ code: file.unitCode, level: "error", msg: `Datei ${file.path}: Unit nicht in structure.json` });
      continue;
    }
    if (!Array.isArray(file.items)) {
      issues.push({ code: file.unitCode, level: "error", msg: "Datei ist kein Array" });
      continue;
    }
    const skills = new Set(unit.skills.map((s) => s.code));
    const stems = new Map<string, string>();
    for (const item of file.items) {
      const push = (level: Issue["level"], msg: string) => issues.push({ code: item.code ?? "?", level, msg });
      if (seen.has(item.code)) push("error", "code doppelt");
      seen.add(item.code);
      const key = `${item.type}|${item.stem}|${JSON.stringify(item.payload)}`;
      if (stems.has(key)) push("error", `inhaltlich identisch mit ${stems.get(key)}`);
      stems.set(key, item.code);
      checkItem(item, file.unitCode, skills, push);
    }
  }
  return issues;
}

