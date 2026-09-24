import "server-only";
import { starsFor } from "@/lib/engine/xp";
import type { Result } from "@/lib/engine/sm2";
import type { Catalog } from "./queries";

/** Sterne je Skill-ID aus der Antworthistorie (chronologisch). */
export function skillStars(catalog: Catalog, history: readonly { item_id: string; result: Result }[]): Map<string, number> {
  const bySkill = new Map<string, Result[]>();
  for (const a of history) {
    const skill = catalog.skillByItem.get(a.item_id);
    if (!skill) continue;
    const list = bySkill.get(skill.id) ?? [];
    list.push(a.result);
    bySkill.set(skill.id, list);
  }
  const out = new Map<string, number>();
  for (const [id, results] of bySkill) out.set(id, starsFor(results));
  return out;
}
