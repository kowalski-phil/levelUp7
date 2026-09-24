"use server";

import { redirect } from "next/navigation";
import type { Answer } from "@/lib/content/types";
import { completeSession } from "@/lib/data/complete";
import { requireStudent } from "@/lib/data/queries";
import type { PlayerItem } from "@/components/session/types";
import { createBonusSession, loadSession, planInput, rowToContentItem, toPlayerItems, type Viewer } from "@/lib/data/sessions";
import { addDays, todayInBerlin } from "@/lib/engine/dates";
import { grade, instanceSeed, withHint, type AnswerResult } from "@/lib/engine/grading";
import { pickReplacement } from "@/lib/engine/planner";
import { initialSrs, review, type Result } from "@/lib/engine/sm2";
import { xpFor } from "@/lib/engine/xp";
import type { ItemRow, ItemStateRow } from "@/lib/supabase/types";

/** Wie lange ein Skill nach "hatten wir noch nicht" ruht. */
const SNOOZE_DAYS = 21;

/** Zähler aus den Antworten neu berechnen statt hochzuzählen: robust bei Doppel-Taps. "not_yet" zählt nicht. */
async function recount(v: Viewer, sessionId: string) {
  const { data: all } = await v.supabase.from("answers").select("result").eq("session_id", sessionId);
  const results = (all ?? []).map((a: { result: AnswerResult }) => a.result).filter((r): r is Result => r !== "not_yet");
  await v.supabase
    .from("sessions")
    .update({
      total: results.length,
      correct: results.filter((r) => r === "correct").length,
      xp: results.reduce((s, r) => s + xpFor(r), 0),
    })
    .eq("id", sessionId);
}

export async function submitAnswer(
  sessionId: string,
  itemId: string,
  answer: Answer,
  timeSec: number,
  hintUsed = false,
): Promise<{ result: AnswerResult }> {
  const v = await requireStudent();
  const session = await loadSession(v, sessionId);
  if (!session || session.finished_at || !session.planned_item_ids.includes(itemId)) throw new Error("Aufgabe gehört nicht zu dieser Session");

  const { data: existing } = await v.supabase
    .from("answers")
    .select("result")
    .eq("session_id", sessionId)
    .eq("item_id", itemId)
    .maybeSingle<{ result: AnswerResult }>();
  if (existing) return { result: existing.result };

  const { data: row } = await v.supabase.from("items").select("*").eq("id", itemId).single<ItemRow>();
  if (!row) throw new Error("Aufgabe nicht gefunden");
  const result = withHint(grade(rowToContentItem(row), answer, instanceSeed(sessionId, row.code)), hintUsed);

  const { error } = await v.supabase.from("answers").insert({
    session_id: sessionId,
    student_id: v.userId,
    item_id: itemId,
    result,
    answer,
    hint_used: hintUsed,
    time_sec: Math.max(0, Math.min(Math.round(timeSec), 1800)),
  });
  if (error) {
    // Doppelt abgeschickt: die erste Antwort zählt.
    if (error.code === "23505") return { result };
    throw new Error(error.message);
  }

  const today = todayInBerlin();
  const { data: st } = await v.supabase
    .from("item_state")
    .select("*")
    .eq("student_id", v.userId)
    .eq("item_id", itemId)
    .maybeSingle<ItemStateRow>();
  const prev = st
    ? { ease: st.ease, intervalDays: st.interval_days, reps: st.reps, lapses: st.lapses, dueDate: st.due_date, lastResult: st.last_result }
    : initialSrs(today);
  const next = review(prev, result, today);
  await v.supabase.from("item_state").upsert({
    student_id: v.userId,
    item_id: itemId,
    ease: next.ease,
    interval_days: next.intervalDays,
    due_date: next.dueDate,
    reps: next.reps,
    lapses: next.lapses,
    last_result: next.lastResult,
  });

  await recount(v, sessionId);

  return { result };
}

/**
 * "Hatten wir noch nicht": Aufgabe zählt nicht, der Skill ruht 21 Tage (keine neuen Aufgaben daraus),
 * die Session bekommt eine Ersatzaufgabe, damit es bei 12 bleibt.
 */
export async function markNotYet(sessionId: string, itemId: string): Promise<{ replacement: PlayerItem | null }> {
  const v = await requireStudent();
  const session = await loadSession(v, sessionId);
  if (!session || session.finished_at || !session.planned_item_ids.includes(itemId)) throw new Error("Aufgabe gehört nicht zu dieser Session");

  const { data: row } = await v.supabase.from("items").select("id, skill_id").eq("id", itemId).single<{ id: string; skill_id: string }>();
  if (!row) throw new Error("Aufgabe nicht gefunden");

  const { error } = await v.supabase.from("answers").insert({
    session_id: sessionId,
    student_id: v.userId,
    item_id: itemId,
    result: "not_yet",
    answer: { type: "not_yet" },
    time_sec: 0,
  });
  if (error && error.code !== "23505") throw new Error(error.message);
  if (error) return { replacement: null }; // schon markiert

  const today = todayInBerlin();
  await v.supabase
    .from("skill_snooze")
    .upsert({ student_id: v.userId, skill_id: row.skill_id, until: addDays(today, SNOOZE_DAYS), created_at: new Date().toISOString() });

  // Ersatz planen (Skill ist jetzt zurückgestellt, Session-Aufgaben ausgeschlossen).
  const [items] = await toPlayerItems(v, [itemId]);
  const input = await planInput(v, today, new Set(session.planned_item_ids));
  const replacementId = pickReplacement(input, items?.subjectCode ?? "M");
  if (!replacementId) return { replacement: null };

  await v.supabase
    .from("sessions")
    .update({ planned_item_ids: [...session.planned_item_ids, replacementId] })
    .eq("id", sessionId);
  const [replacement] = await toPlayerItems(v, [replacementId]);
  return { replacement: replacement ?? null };
}

export async function finishSession(sessionId: string): Promise<void> {
  const v = await requireStudent();
  const session = await loadSession(v, sessionId);
  if (!session) throw new Error("Session nicht gefunden");
  await completeSession(v, session);
  redirect(`/fertig/${sessionId}`);
}

export async function startBonus(formData: FormData): Promise<void> {
  const v = await requireStudent();
  const unit = formData.get("unit");
  const session = await createBonusSession(v, typeof unit === "string" && unit ? unit : undefined);
  redirect(session.planned_item_ids.length ? `/session/${session.id}` : "/");
}
