import "server-only";
import type { ContentItem } from "@/lib/content/types";
import { todayInBerlin } from "@/lib/engine/dates";
import { planBonus, planDaily, type PlanInput } from "@/lib/engine/planner";
import type { PlayerItem } from "@/components/session/types";
import type { ItemRow, SessionRow } from "@/lib/supabase/types";
import { loadCatalog, loadItemStates, toPlannerStates, type Viewer } from "./queries";

export function rowToContentItem(row: ItemRow, skillCode = ""): ContentItem {
  return {
    code: row.code,
    skill_code: skillCode,
    type: row.type,
    difficulty: row.difficulty as 1 | 2 | 3,
    stem: row.stem,
    payload: row.payload,
    solution: row.solution,
    explanation: row.explanation,
    hint: row.hint ?? undefined,
  } as ContentItem;
}

/** Skill-Codes, die gerade als "hatten wir noch nicht" zurückgestellt sind. */
export async function loadSnoozedSkills(v: Viewer, today: string): Promise<Set<string>> {
  const [{ data }, catalog] = await Promise.all([
    v.supabase.from("skill_snooze").select("skill_id").eq("student_id", v.userId).gt("until", today),
    loadCatalog(v.supabase),
  ]);
  const codeById = new Map(catalog.skills.map((s) => [s.id, s.code]));
  return new Set((data ?? []).map((r: { skill_id: string }) => codeById.get(r.skill_id)).filter((c): c is string => !!c));
}

export async function planInput(v: Viewer, today: string, exclude?: Set<string>): Promise<PlanInput> {
  const [catalog, states, snoozedSkills] = await Promise.all([
    loadCatalog(v.supabase),
    loadItemStates(v.supabase, v.userId),
    loadSnoozedSkills(v, today),
  ]);
  return {
    items: catalog.items,
    states: toPlannerStates(states),
    schedule: catalog.schedule,
    today,
    schoolYearStart: v.family.school_year_start,
    examDate: v.family.exam_date,
    exclude,
    snoozedSkills,
  };
}

export async function findDailySession(v: Viewer, today = todayInBerlin()): Promise<SessionRow | null> {
  const { data } = await v.supabase
    .from("sessions")
    .select("*")
    .eq("student_id", v.userId)
    .eq("date", today)
    .eq("kind", "daily")
    .maybeSingle<SessionRow>();
  return data;
}

/** Tagesplan wird einmal pro Tag erzeugt und danach nicht mehr verändert. */
export async function getOrCreateDailySession(v: Viewer): Promise<SessionRow> {
  const today = todayInBerlin();
  const existing = await findDailySession(v, today);
  if (existing) return existing;

  const planned = planDaily(await planInput(v, today));
  const { data, error } = await v.supabase
    .from("sessions")
    .insert({ student_id: v.userId, date: today, kind: "daily", planned_item_ids: planned })
    .select("*")
    .single<SessionRow>();
  if (data) return data;

  // Gleichzeitig in zweitem Tab angelegt: den vorhandenen nehmen.
  const again = await findDailySession(v, today);
  if (again) return again;
  throw new Error(`Session konnte nicht angelegt werden: ${error?.message}`);
}

export async function createBonusSession(v: Viewer, onlyUnit?: string): Promise<SessionRow> {
  const today = todayInBerlin();
  const { data: todays } = await v.supabase
    .from("sessions")
    .select("planned_item_ids")
    .eq("student_id", v.userId)
    .eq("date", today);
  const exclude = new Set<string>((todays ?? []).flatMap((s: { planned_item_ids: string[] }) => s.planned_item_ids));
  const planned = planBonus(await planInput(v, today, exclude), onlyUnit);

  const { data, error } = await v.supabase
    .from("sessions")
    .insert({ student_id: v.userId, date: today, kind: "bonus", planned_item_ids: planned })
    .select("*")
    .single<SessionRow>();
  if (!data) throw new Error(`Bonus-Runde konnte nicht angelegt werden: ${error?.message}`);
  return data;
}

export async function loadSession(v: Viewer, id: string): Promise<SessionRow | null> {
  const { data } = await v.supabase.from("sessions").select("*").eq("id", id).eq("student_id", v.userId).maybeSingle<SessionRow>();
  return data;
}

/** Aufgaben einer Session in der Form, die die Session-UI braucht. */
export type { Viewer };

export async function toPlayerItems(v: Viewer, itemIds: readonly string[]): Promise<PlayerItem[]> {
  const [catalog, itemsRes] = await Promise.all([loadCatalog(v.supabase), v.supabase.from("items").select("*").in("id", [...itemIds])]);
  const rows = new Map(((itemsRes.data ?? []) as ItemRow[]).map((r) => [r.id, r]));
  const subjects = new Map(catalog.subjects.map((s) => [s.code, s]));
  return itemIds.flatMap((itemId) => {
    const row = rows.get(itemId);
    const skill = catalog.skillByItem.get(itemId);
    if (!row || !skill) return [];
    const subject = subjects.get(skill.subjectCode);
    return [
      {
        id: itemId,
        item: rowToContentItem(row, skill.code),
        subjectCode: skill.subjectCode,
        subjectName: subject?.name ?? skill.subjectCode,
        subjectColor: subject?.color ?? "#888",
        skillTitle: skill.title,
      },
    ];
  });
}
