import { InlineMath } from "@/components/math-text";
import type { ContentItem } from "@/lib/content/types";
import { formatNumberDe, instantiate } from "@/lib/engine/template";

const eur = (n: number) => `${formatNumberDe(n, 2)} €`;

/** Anzeige-Stellen aus der Toleranz: 0,01 → 2 Stellen, 0,1 → 1 Stelle, 0 → exakt. */
const shown = (n: number, tolerance: number) =>
  formatNumberDe(n, tolerance > 0 ? Math.max(0, Math.min(4, Math.ceil(-Math.log10(tolerance) - 1e-9))) : 4);

function fillGaps(text: string, answers: string[]): string {
  return text.replace(/\[\[(\d+)\]\]/g, (_, i: string) => `**${answers[Number(i)] ?? "…"}**`);
}

/** Zeigt die richtige Lösung nach einer falschen oder teilweise richtigen Antwort. */
export function SolutionView({ item, seed }: { item: ContentItem; seed: string }) {
  switch (item.type) {
    case "mc":
      return <InlineMath text={item.payload.options[item.solution.index]} />;
    case "mc_multi":
      return (
        <ul className="list-disc space-y-1 pl-5">
          {item.solution.indices.map((i) => (
            <li key={i}>
              <InlineMath text={item.payload.options[i]} />
            </li>
          ))}
        </ul>
      );
    case "numeric":
      return (
        <span className="tabular-nums">
          {shown(item.solution.value, item.payload.tolerance)} {item.payload.unit}
        </span>
      );
    case "numeric_template":
      return (
        <span className="tabular-nums">
          {shown(instantiate(item.payload, seed).answer, item.payload.tolerance)} {item.payload.unit}
        </span>
      );
    case "cloze":
      return <InlineMath text={fillGaps(item.payload.text, item.solution.answers)} />;
    case "cloze_free":
      return <InlineMath text={fillGaps(item.payload.text, item.solution.answers.map((v) => v[0]))} />;
    case "order":
      return (
        <ol className="list-decimal space-y-1 pl-5">
          {item.payload.items.map((x) => (
            <li key={x}>
              <InlineMath text={x} />
            </li>
          ))}
        </ol>
      );
    case "match":
      return (
        <ul className="space-y-1">
          {item.payload.pairs.map(([l, r]) => (
            <li key={l}>
              <InlineMath text={l} /> → <InlineMath text={r} />
            </li>
          ))}
        </ul>
      );
    case "booking":
      return (
        <div className="space-y-1 tabular-nums">
          {item.solution.soll.map((l) => (
            <div key={`s${l.account}`}>
              {l.account} <span className="text-muted-foreground">{eur(l.amount)}</span>
            </div>
          ))}
          <div className="font-semibold">an</div>
          {item.solution.haben.map((l) => (
            <div key={`h${l.account}`}>
              {l.account} <span className="text-muted-foreground">{eur(l.amount)}</span>
            </div>
          ))}
        </div>
      );
    case "self_check":
      return null;
    case "vocab":
      return (
        <span>
          <span className="text-lg font-semibold">{item.solution.answers[0]}</span>
          {item.solution.answers.length > 1 ? (
            <span className="text-muted-foreground"> · auch: {item.solution.answers.slice(1).join(", ")}</span>
          ) : null}
        </span>
      );
  }
}
