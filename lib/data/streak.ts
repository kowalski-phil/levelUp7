import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { todayInBerlin, type ISODate } from "@/lib/engine/dates";
import {
  dayMarks,
  displayStreak,
  heldJokers,
  initialStreak,
  pendingRescue,
  weekView,
  type StreakState,
  type WeekDay,
} from "@/lib/engine/streak";
import type { StreakRow } from "@/lib/supabase/types";
import { fetchAll, type Viewer } from "./queries";

type Db = Pick<SupabaseClient, "from">;

export const toStreakState = (r: StreakRow | null): StreakState =>
  r ? { current: r.current, longest: r.longest, jokers: r.jokers, lastCompletedDate: r.last_completed_date } : initialStreak();

/** Gespeicherter Streak plus alle Joker-Tage (vergangene und gesetzte). */
export async function loadStreakState(db: Db, studentId: string): Promise<{ stored: StreakState; jokerDays: ISODate[] }> {
  const [row, jokers] = await Promise.all([
    db.from("streaks").select("*").eq("student_id", studentId).maybeSingle<StreakRow>(),
    db.from("joker_days").select("date").eq("student_id", studentId).order("date"),
  ]);
  if (row.error) throw new Error(`Streak lesen: ${row.error.message}`);
  if (jokers.error) throw new Error(`Joker lesen: ${jokers.error.message}`);
  return { stored: toStreakState(row.data), jokerDays: ((jokers.data ?? []) as { date: string }[]).map((j) => j.date) };
}

/** Streak-Zeile schreiben (nur mit dem Service-Role-Client). Die Zeile entsteht beim ersten Schreiben. */
export async function saveStreak(db: Db, studentId: string, s: StreakState): Promise<void> {
  const { error } = await db.from("streaks").upsert({
    student_id: studentId,
    current: s.current,
    longest: s.longest,
    jokers: s.jokers,
    last_completed_date: s.lastCompletedDate,
  });
  if (error) throw new Error(`Streak speichern: ${error.message}`);
}

export interface StreakView {
  streak: StreakState;
  week: WeekDay[];
  jokerDays: ISODate[];
  /** Joker im Vorrat plus die ab heute gesetzten (dagegen gilt das Maximum). */
  held: number;
  /** Verpasste Tage, die Felix jetzt mit Jokern retten kann, sonst null. */
  rescue: ISODate[] | null;
  /** Heute schon eine Tagessession oder Fokus-Runde geschafft. */
  doneToday: boolean;
  /** Für heute ist ein Joker gesetzt. */
  jokerToday: boolean;
}

/** Streak wie heute angezeigt, plus die aktuelle Woche mit Flammen und Jokern. */
export async function loadStreakView(v: Viewer, today: ISODate = todayInBerlin(), studentId = v.userId): Promise<StreakView> {
  const [{ stored, jokerDays }, sessions] = await Promise.all([
    loadStreakState(v.supabase, studentId),
    fetchAll<{ date: string }>((from, to) =>
      v.supabase
        .from("sessions")
        .select("date")
        .eq("student_id", studentId)
        .in("kind", ["daily", "focus"])
        .not("finished_at", "is", null)
        .order("date")
        .range(from, to),
    ),
  ]);
  const doneToday = stored.lastCompletedDate === today;
  return {
    streak: displayStreak(stored, jokerDays, today),
    week: weekView(dayMarks(sessions.map((r) => r.date), jokerDays, today), today),
    jokerDays,
    held: heldJokers(stored, jokerDays, today),
    rescue: doneToday ? null : pendingRescue(stored, jokerDays, today),
    doneToday,
    jokerToday: jokerDays.includes(today),
  };
}
