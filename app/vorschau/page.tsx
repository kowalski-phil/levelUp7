import { notFound } from "next/navigation";
import { SessionPlayer } from "@/components/session/player";
import type { PlayerItem } from "@/components/session/types";
import { loadContentFiles, loadStructure } from "@/lib/content/load";
import { shuffle } from "@/lib/engine/template";

// Nur lokal (npm run dev): Aufgaben aus content/ ohne Datenbank durchklicken.
// /vorschau?unit=B1  oder  /vorschau?code=M4-012  oder  /vorschau (12 gemischte)
export default async function VorschauPage({ searchParams }: PageProps<"/vorschau">) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { unit, code, seed = "vorschau" } = await searchParams;
  const root = process.cwd();
  const structure = loadStructure(root);
  const all = loadContentFiles(root).flatMap((f) => f.items);
  const skillInfo = new Map(structure.units.flatMap((u) => u.skills.map((s) => [s.code, { title: s.title, subject: u.subject }] as const)));

  const picked = code
    ? all.filter((i) => String(code).split(",").includes(i.code))
    : unit
      ? all.filter((i) => i.code.startsWith(`${unit}-`))
      : shuffle(all, String(seed)).slice(0, 12);

  const items: PlayerItem[] = picked.map((item) => {
    const info = skillInfo.get(item.skill_code);
    const subject = structure.subjects.find((s) => s.code === info?.subject);
    return {
      id: item.code,
      item,
      subjectCode: subject?.code ?? "?",
      subjectName: subject?.name ?? "?",
      subjectColor: subject?.color ?? "#888",
      skillTitle: info?.title ?? item.skill_code,
    };
  });
  if (!items.length) return <p className="pt-10">Keine Aufgaben gefunden.</p>;
  return <SessionPlayer sessionId={String(seed)} kind="daily" items={items} answered={{}} preview />;
}
