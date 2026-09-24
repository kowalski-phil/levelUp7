import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { ScheduleEntry } from "@/lib/engine/calendar";
import type { PlannerItem, PlannerState } from "@/lib/engine/planner";
import type { Result } from "@/lib/engine/sm2";
import { createClient } from "@/lib/supabase/server";
import type { FamilyRow, ItemStateRow, ProfileRow } from "@/lib/supabase/types";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Supabase liefert max. 1000 Zeilen pro Abfrage; hier wird seitenweise nachgeladen. */
export async function fetchAll<T>(
  query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const out: T[] = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    const { data, error } = await query(from, from + page - 1);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < page) return out;
  }
}

export interface Viewer {
  supabase: Supabase;
  userId: string;
  profile: ProfileRow;
  family: FamilyRow;
}

export const getViewer = cache(async (): Promise<Viewer> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle<ProfileRow>();
  if (!profile?.family_id) redirect("/login?fehler=profil");
  const { data: family } = await supabase.from("families").select("*").eq("id", profile.family_id).maybeSingle<FamilyRow>();
  if (!family) redirect("/login?fehler=profil");
  return { supabase, userId, profile, family };
});

export async function requireStudent(): Promise<Viewer> {
  const v = await getViewer();
  if (v.profile.role !== "student") redirect("/eltern");
  return v;
}

export async function requireParent(): Promise<Viewer> {
  const v = await getViewer();
  if (v.profile.role !== "parent") redirect("/");
  return v;
}

// ---------- Katalog (Fächer, Gebiete, Skills, Aufgaben) ----------

export interface SubjectInfo {
  id: string;
  code: string;
  name: string;
  color: string;
}
export interface UnitInfo {
  id: string;
  code: string;
  title: string;
  orderIndex: number;
  subjectCode: string;
}
export interface SkillInfo {
  id: string;
  code: string;
  title: string;
  orderIndex: number;
  unitCode: string;
  subjectCode: string;
}

export interface Catalog {
  subjects: SubjectInfo[];
  units: UnitInfo[];
  skills: SkillInfo[];
  items: PlannerItem[];
  skillByItem: Map<string, SkillInfo>;
  schedule: ScheduleEntry[];
}

export const loadCatalog = cache(async (supabase: Supabase): Promise<Catalog> => {
  const [subjectsRes, unitsRes, skillsRes, scheduleRes, itemRows] = await Promise.all([
    supabase.from("subjects").select("id, code, name, color"),
    supabase.from("units").select("id, code, title, order_index, subject_id"),
    supabase.from("skills").select("id, code, title, order_index, unit_id"),
    supabase.from("unit_schedule").select("unit_id, subject_id, week_from, week_to"),
    fetchAll<{ id: string; code: string; difficulty: number; skill_id: string }>((from, to) =>
      supabase.from("items").select("id, code, difficulty, skill_id").eq("active", true).order("code").range(from, to),
    ),
  ]);

  const subjects: SubjectInfo[] = subjectsRes.data ?? [];
  const subjectCodeById = new Map(subjects.map((s) => [s.id, s.code]));
  const units: UnitInfo[] = (unitsRes.data ?? []).map((u) => ({
    id: u.id,
    code: u.code,
    title: u.title,
    orderIndex: u.order_index,
    subjectCode: subjectCodeById.get(u.subject_id) ?? "?",
  }));
  const unitById = new Map(units.map((u) => [u.id, u]));
  const skills: SkillInfo[] = (skillsRes.data ?? []).map((s) => {
    const unit = unitById.get(s.unit_id);
    return {
      id: s.id,
      code: s.code,
      title: s.title,
      orderIndex: s.order_index,
      unitCode: unit?.code ?? "?",
      subjectCode: unit?.subjectCode ?? "?",
    };
  });
  const skillById = new Map(skills.map((s) => [s.id, s]));

  const skillByItem = new Map<string, SkillInfo>();
  const items: PlannerItem[] = [];
  for (const row of itemRows) {
    const skill = skillById.get(row.skill_id);
    if (!skill) continue;
    skillByItem.set(row.id, skill);
    items.push({
      id: row.id,
      code: row.code,
      difficulty: row.difficulty,
      subject: skill.subjectCode,
      unitCode: skill.unitCode,
      skillCode: skill.code,
      skillOrder: skill.orderIndex,
    });
  }

  const schedule: ScheduleEntry[] = (scheduleRes.data ?? []).map((r) => ({
    subject: subjectCodeById.get(r.subject_id) ?? "?",
    unitCode: unitById.get(r.unit_id)?.code ?? "?",
    weekFrom: r.week_from,
    weekTo: r.week_to,
  }));

  return { subjects, units, skills, items, skillByItem, schedule };
});

export async function loadItemStates(supabase: Supabase, studentId: string): Promise<ItemStateRow[]> {
  return fetchAll<ItemStateRow>((from, to) =>
    supabase.from("item_state").select("*").eq("student_id", studentId).order("item_id").range(from, to),
  );
}

export function toPlannerStates(rows: readonly ItemStateRow[]): PlannerState[] {
  return rows.map((r) => ({ itemId: r.item_id, dueDate: r.due_date, lapses: r.lapses, lastResult: r.last_result }));
}

/** Alle Antworten eines Schülers in zeitlicher Reihenfolge (für Sterne und Schwächen). */
export async function loadAnswerHistory(supabase: Supabase, studentId: string) {
  return fetchAll<{ item_id: string; result: Result; created_at: string }>((from, to) =>
    supabase
      .from("answers")
      .select("item_id, result, created_at")
      .eq("student_id", studentId)
      .order("created_at")
      .range(from, to),
  );
}
