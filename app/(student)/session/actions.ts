"use server";

import { redirect } from "next/navigation";
import type { Answer } from "@/lib/content/types";
import { completeSession } from "@/lib/data/complete";
import { focusPlan, loadExam } from "@/lib/data/exams";
import { requireStudent } from "@/lib/data/queries";
import type { PlayerItem } from "@/components/session/types";
import { createBonusSession, loadSession, planInput, rowToContentItem, toPlayerItems, type Viewer } from "@/lib/data/sessions";
import { addDays, todayInBerlin } from "@/lib/engine/dates";
import {
  attemptSeed,
  extraAttempts,
  grade,
  instanceSeed,
  isMistake,
  isSolved,
  MAX_ATTEMPTS,
  withHint,
  type AnswerResult,
  type AttemptState,
} from "@/lib/engine/grading";
import { pickReplacement } from "@/lib/engine/planner";
import { initialSrs, review, type Result } from "@/lib/engine/sm2";
import { xpFor } from "@/lib/engine/xp";
import { createAdminClient } from "@/lib/supabase/server";
import type { ItemRow, ItemStateRow } from "@/lib/supabase/types";

/** Wie lange ein Skill nach "hatten wir noch nicht" ruht. */
const SNOOZE_DAYS = 21;

/** Zähler aus den Antworten neu berechnen statt hochzuzählen: robust bei Doppel-Taps. "not_yet" zählt nicht. */
async function recount(v: Viewer, sessionId: string) {
  const { data: all } = await v.supabase.from("answers").select("result, solved, attempts").eq("session_id", sessionId);
  const rows = (all ?? []) as AttemptState[];
  const results = rows.map((a) => a.result).filter((r): r is Result => r !== "not_yet");
  await v.supabase
    .from("sessions")
    .update({
      total: results.length,
      correct: results.filter((r) => r === "correct").length,
      mistakes: rows.filter(isMistake).length,
      retries: rows.reduce((s, a) => s + extraAttempts(a), 0),
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
  const item = rowToContentItem(row);
  const raw = grade(item, answer, instanceSeed(sessionId, row.code));
  const result = withHint(raw, hintUsed);

  const { error } = await v.supabase.from("answers").insert({
    session_id: sessionId,
    student_id: v.userId,
    item_id: itemId,
    result,
    answer,
    hint_used: hintUsed,
    solved: isSolved(item, raw),
    attempts: 1,
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
 * Wiederholung einer falsch gelösten Aufgabe in derselben Runde. SM-2 und "richtig"-Zähler bleiben beim ersten Versuch;
 * hier zählen nur Versuche, Zeit und ob sie jetzt gelöst ist. `attempt` = Anzahl bisheriger Versuche (1 beim ersten Wiederholen).
 * Schon gezählt (Doppel-Tap, erneutes Senden): gibt den gespeicherten Stand zurück.
 */
export async function retryAnswer(
  sessionId: string,
  itemId: string,
  attempt: number,
  answer: Answer,
  timeSec: number,
): Promise<{ solved: boolean }> {
  const v = await requireStudent();
  const session = await loadSession(v, sessionId);
  if (!session || session.finished_at || !session.planned_item_ids.includes(itemId)) throw new Error("Aufgabe gehört nicht zu dieser Session");

  const { data: prev } = await v.supabase
    .from("answers")
    .select("result, solved, attempts, time_sec")
    .eq("session_id", sessionId)
    .eq("item_id", itemId)
    .maybeSingle<AttemptState & { time_sec: number }>();
  if (!prev || prev.result === "not_yet") throw new Error("Aufgabe wurde noch nicht beantwortet");
  if (prev.solved || prev.attempts !== attempt || attempt >= MAX_ATTEMPTS) return { solved: prev.solved };

  const { data: row } = await v.supabase.from("items").select("*").eq("id", itemId).single<ItemRow>();
  if (!row) throw new Error("Aufgabe nicht gefunden");
  const item = rowToContentItem(row);
  const solved = isSolved(item, grade(item, answer, attemptSeed(sessionId, row.code, attempt)));

  // Schreiben über Service Role: Schüler haben kein Update-Recht auf answers. Der Filter auf attempts
  // sorgt dafür, dass ein doppelt gesendeter Versuch nur einmal zählt.
  await createAdminClient()
    .from("answers")
    .update({
      solved,
      attempts: attempt + 1,
      time_sec: prev.time_sec + Math.max(0, Math.min(Math.round(timeSec), 1800)),
    })
    .eq("session_id", sessionId)
    .eq("item_id", itemId)
    .eq("student_id", v.userId)
    .eq("attempts", attempt);

  await recount(v, sessionId);
  return { solved };
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
  // In einer Fokus-Runde kommt der Ersatz aus der Schulaufgabe; der Skill bleibt dort gewählt.
  const exclude = new Set(session.planned_item_ids);
  const exam = session.kind === "focus" && session.exam_id ? await loadExam(v, session.exam_id) : null;
  let replacementId: string | null;
  if (exam) {
    replacementId = (await focusPlan(v, exam, exclude, 1))[0] ?? null;
  } else {
    const [items] = await toPlayerItems(v, [itemId]);
    replacementId = pickReplacement(await planInput(v, today, exclude), items?.subjectCode ?? "M");
  }
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
