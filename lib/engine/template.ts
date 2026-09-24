// Parametrisierte Aufgaben (numeric_template): Zufallswerte ziehen, Formeln sicher auswerten, Stem füllen.
// Kein eval(): kleiner Parser für + - * / ^, Klammern, Vergleiche und Mathe-Funktionen (Winkel in Grad).

export interface ParamRange {
  min: number;
  max: number;
  step: number;
}

export interface TemplateSpec {
  params: Record<string, ParamRange>;
  /** Abgeleitete Werte, in Reihenfolge berechnet, im Stem und in der Formel nutzbar. */
  derived?: Record<string, string>;
  /** Bedingungen, die gelten müssen (z. B. "a > b"); sonst wird neu gezogen. */
  constraints?: string[];
  formula: string;
}

export type Values = Record<string, number>;

// ---------- Zufall ----------

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Mulberry32: deterministischer Zufall aus einem Seed. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(arr: readonly T[], seed: string): T[] {
  const r = rng(hashString(seed));
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function decimalsOf(n: number): number {
  const s = String(n);
  const i = s.indexOf(".");
  return i < 0 ? 0 : s.length - i - 1;
}

function draw(range: ParamRange, r: () => number): number {
  const steps = Math.floor((range.max - range.min) / range.step + 1e-9);
  const k = Math.floor(r() * (steps + 1));
  const dec = Math.max(decimalsOf(range.min), decimalsOf(range.step));
  return Number((range.min + k * range.step).toFixed(dec));
}

// ---------- Ausdrücke ----------

type Token = { t: "num"; v: number } | { t: "id"; v: string } | { t: "op"; v: string };

function tokenize(src: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) {
      i++;
    } else if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      out.push({ t: "num", v: parseFloat(src.slice(i, j)) });
      i = j;
    } else if (/[A-Za-z_]/.test(c)) {
      let j = i;
      while (j < src.length && /[A-Za-z_0-9]/.test(src[j])) j++;
      out.push({ t: "id", v: src.slice(i, j) });
      i = j;
    } else {
      const two = src.slice(i, i + 2);
      if ([">=", "<=", "==", "!=", "&&", "||"].includes(two)) {
        out.push({ t: "op", v: two });
        i += 2;
      } else if ("+-*/^(),<>".includes(c)) {
        out.push({ t: "op", v: c });
        i++;
      } else {
        throw new Error(`Unerwartetes Zeichen "${c}" in "${src}"`);
      }
    }
  }
  return out;
}

const RAD = Math.PI / 180;
const FUNCS: Record<string, (...a: number[]) => number> = {
  sqrt: Math.sqrt,
  abs: Math.abs,
  sin: (x) => Math.sin(x * RAD),
  cos: (x) => Math.cos(x * RAD),
  tan: (x) => Math.tan(x * RAD),
  asin: (x) => Math.asin(x) / RAD,
  acos: (x) => Math.acos(x) / RAD,
  atan: (x) => Math.atan(x) / RAD,
  log10: Math.log10,
  ln: Math.log,
  log: (b, x) => Math.log(x) / Math.log(b),
  exp: Math.exp,
  round: (x, d = 0) => Math.round(x * 10 ** d) / 10 ** d,
  floor: Math.floor,
  ceil: Math.ceil,
  min: Math.min,
  max: Math.max,
};
const CONSTS: Record<string, number> = { pi: Math.PI, e: Math.E };

export function evaluate(src: string, vars: Values): number {
  const toks = tokenize(src);
  let p = 0;
  const peek = () => toks[p];
  const isOp = (v: string) => peek()?.t === "op" && peek().v === v;
  const expect = (v: string) => {
    if (!isOp(v)) throw new Error(`"${v}" erwartet in "${src}"`);
    p++;
  };

  // Präzedenz: || < && < Vergleich < +- < */ < unär < ^
  function or(): number {
    let l = and();
    while (isOp("||")) {
      p++;
      const r = and();
      l = l || r ? 1 : 0;
    }
    return l;
  }
  function and(): number {
    let l = cmp();
    while (isOp("&&")) {
      p++;
      const r = cmp();
      l = l && r ? 1 : 0;
    }
    return l;
  }
  function cmp(): number {
    const l = add();
    const t = peek();
    if (t?.t === "op" && ["<", ">", "<=", ">=", "==", "!="].includes(t.v)) {
      p++;
      const r = add();
      const eps = 1e-9;
      switch (t.v) {
        case "<": return l < r - eps ? 1 : 0;
        case ">": return l > r + eps ? 1 : 0;
        case "<=": return l <= r + eps ? 1 : 0;
        case ">=": return l >= r - eps ? 1 : 0;
        case "==": return Math.abs(l - r) <= eps ? 1 : 0;
        default: return Math.abs(l - r) > eps ? 1 : 0;
      }
    }
    return l;
  }
  function add(): number {
    let l = mul();
    while (isOp("+") || isOp("-")) {
      const op = toks[p++].v;
      const r = mul();
      l = op === "+" ? l + r : l - r;
    }
    return l;
  }
  function mul(): number {
    let l = unary();
    while (isOp("*") || isOp("/")) {
      const op = toks[p++].v;
      const r = unary();
      l = op === "*" ? l * r : l / r;
    }
    return l;
  }
  function unary(): number {
    if (isOp("-")) {
      p++;
      return -unary();
    }
    if (isOp("+")) {
      p++;
      return unary();
    }
    return pow();
  }
  function pow(): number {
    const base = atom();
    if (isOp("^")) {
      p++;
      return base ** unary();
    }
    return base;
  }
  function atom(): number {
    const t = toks[p++];
    if (!t) throw new Error(`Unerwartetes Ende in "${src}"`);
    if (t.t === "num") return t.v;
    if (t.t === "op" && t.v === "(") {
      const v = or();
      expect(")");
      return v;
    }
    if (t.t === "id") {
      if (isOp("(")) {
        const fn = FUNCS[t.v];
        if (!fn) throw new Error(`Unbekannte Funktion "${t.v}" in "${src}"`);
        p++;
        const args: number[] = [];
        if (!isOp(")")) {
          args.push(or());
          while (isOp(",")) {
            p++;
            args.push(or());
          }
        }
        expect(")");
        return fn(...args);
      }
      if (t.v in vars) return vars[t.v];
      if (t.v in CONSTS) return CONSTS[t.v];
      throw new Error(`Unbekannte Variable "${t.v}" in "${src}"`);
    }
    throw new Error(`Unerwartetes Token "${t.v}" in "${src}"`);
  }

  const v = or();
  if (p !== toks.length) throw new Error(`Überzählige Zeichen in "${src}"`);
  return v;
}

// ---------- Instanz ----------

export interface TemplateInstance {
  values: Values;
  answer: number;
}

/** Zieht Parameter deterministisch aus dem Seed, bis alle Bedingungen erfüllt sind. */
export function instantiate(spec: TemplateSpec, seed: string): TemplateInstance {
  const r = rng(hashString(seed));
  for (let attempt = 0; attempt < 500; attempt++) {
    const values: Values = {};
    for (const [name, range] of Object.entries(spec.params)) values[name] = draw(range, r);
    for (const [name, f] of Object.entries(spec.derived ?? {})) values[name] = evaluate(f, values);
    if ((spec.constraints ?? []).every((c) => evaluate(c, values) === 1)) {
      const answer = evaluate(spec.formula, values);
      if (Number.isFinite(answer)) return { values, answer };
    }
  }
  throw new Error(`Keine gültigen Parameter gefunden (Seed ${seed})`);
}

/** Deutsche Zahldarstellung: Komma, Tausenderpunkt, echtes Minuszeichen, keine überflüssigen Nullen. */
export function formatNumberDe(n: number, maxDecimals = 4): string {
  const rounded = Number(n.toFixed(maxDecimals));
  const s = Math.abs(rounded).toLocaleString("de-DE", { maximumFractionDigits: maxDecimals, useGrouping: true });
  return rounded < 0 ? `−${s}` : s;
}

/** Ersetzt {{name}} im Text durch den Wert in deutscher Schreibweise. */
export function fillTemplate(text: string, values: Values): string {
  return text.replace(/\{\{\s*([A-Za-z_][A-Za-z_0-9]*)\s*\}\}/g, (m, name: string) =>
    name in values ? formatNumberDe(values[name]) : m,
  );
}

/** Liest Zahleneingaben mit Komma oder Punkt ("3,5", "1.250,5", "1 250"). */
export function parseNumberDe(input: string): number | null {
  let s = input.trim().replace(/\s|€|%/g, "").replace(/[−–]/g, "-");
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^[-+]?[1-9]\d{0,2}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  if (!/^[-+]?\d*\.?\d+$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
