import katex from "katex";
import { Fragment, type ReactNode } from "react";

// Kleiner Renderer für Aufgabentexte: $$...$$ und $...$ (KaTeX), **fett**, *kursiv*, Absätze, Zeilenumbrüche, "- " Listen.

function renderMath(tex: string, display: boolean, key: number): ReactNode {
  const html = katex.renderToString(tex, { displayMode: display, throwOnError: false, strict: false });
  return display ? (
    <div key={key} dangerouslySetInnerHTML={{ __html: html }} />
  ) : (
    <span key={key} dangerouslySetInnerHTML={{ __html: html }} />
  );
}

function renderEmphasis(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(m[1] !== undefined ? <strong key={`${keyBase}b${k++}`}>{m[1]}</strong> : <em key={`${keyBase}i${k++}`}>{m[2]}</em>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function renderInline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(...renderLines(text.slice(last, m.index), `t${k}`));
    out.push(m[1] !== undefined ? renderMath(m[1], true, k) : renderMath(m[2], false, k));
    k++;
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(...renderLines(text.slice(last), `t${k}`));
  return out;
}

function renderLines(text: string, keyBase: string): ReactNode[] {
  return text.split("\n").flatMap((line, i) => [
    ...(i > 0 ? [<br key={`${keyBase}br${i}`} />] : []),
    <Fragment key={`${keyBase}l${i}`}>{renderEmphasis(line, `${keyBase}l${i}`)}</Fragment>,
  ]);
}

/** Mehrzeiliger Text mit Absätzen und Listen. */
export function MathText({ text, className }: { text: string; className?: string }) {
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <div className={className}>
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        if (lines.every((l) => /^\s*[-•]\s+/.test(l))) {
          return (
            <ul key={i} className="my-2 list-disc space-y-1 pl-5">
              {lines.map((l, j) => (
                <li key={j}>{renderInline(l.replace(/^\s*[-•]\s+/, ""))}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="my-2 first:mt-0 last:mb-0">
            {renderInline(block)}
          </p>
        );
      })}
    </div>
  );
}

/** Einzeilig, z. B. in Antwortoptionen. */
export function InlineMath({ text }: { text: string }) {
  return <>{renderInline(text)}</>;
}
