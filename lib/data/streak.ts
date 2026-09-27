import "server-only";
import { todayInBerlin, type ISODate } from "@/lib/engine/dates";
import { dayMarks, displayStreak, initialStreak, weekView, type StreakState, type WeekDay } from "@/lib/engine/streak";
import type { StreakRow } from "@/lib/supabase/types";
import { fetchAll, type Viewer } from "./queries";

export interface StreakView {
  streak: StreakState;
  week: WeekDay[];
  /** Heute schon eine Tagessession oder Fokus-Runde geschafft. */
  doneToday: boolean;
}

/** Streak wie heute angezeigt, plus die aktuelle Woche mit Flammen und Jokern. */
export async function loadStreakView(v: Viewer, today: ISODate = todayInBerlin(), studentId = v.userId): Promise<StreakView> {
  const [row, sessions] = await Promise.all([
    v.supabase.from("streaks").select("*").eq("student_id", studentId).maybeSingle<StreakRow>(),
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
  const s = row.data;
  const stored: StreakState = s
    ? { current: s.current, longest: s.longest, jokers: s.jokers, lastCompletedDate: s.last_completed_date }
    : initialStreak();
  return {
    streak: displayStreak(stored, today),
    week: weekView(dayMarks(sessions.map((r) => r.date), today), today),
    doneToday: stored.lastCompletedDate === today,
  };
}
