import "server-only";
import { isDone, type AttemptState } from "@/lib/engine/grading";
import { rewardsForCompletion, type RewardsConfig } from "@/lib/engine/rewards";
import { completeDay, initialStreak, type StreakState } from "@/lib/engine/streak";
import { createAdminClient } from "@/lib/supabase/server";
import type { RewardsConfigRow, SessionRow, SessionSummary, StreakRow } from "@/lib/supabase/types";
import type { Viewer } from "./queries";

const toState = (r: StreakRow | null): StreakState =>
  r ? { current: r.current, longest: r.longest, jokers: r.jokers, lastCompletedDate: r.last_completed_date } : initialStreak();

/**
 * Schließt eine Session ab. Bei der Tagessession oder Fokus-Runde: Streak +1, Joker, Belohnungen.
 * Streak und Ledger schreibt nur der Service-Role-Client, erst nachdem geprüft ist,
 * dass alle geplanten Aufgaben erledigt sind (falsche wiederholt, bis gelöst oder Versuche aufgebraucht).
 */
export async function completeSession(v: Viewer, session: SessionRow): Promise<SessionSummary | null> {
  if (session.finished_at) return session.summary;

  const { data: answers } = await v.supabase
    .from("answers")
    .select("item_id, time_sec, result, solved, attempts")
    .eq("session_id", session.id);
  const done = new Set(((answers ?? []) as (AttemptState & { item_id: string })[]).filter(isDone).map((a) => a.item_id));
  if (!session.planned_item_ids.every((id) => done.has(id))) return null;

  const admin = createAdminClient();
  const duration = (answers ?? []).reduce((s: number, a: { time_sec: number }) => s + a.time_sec, 0);

  // Abschluss beanspruchen: nur der erste Aufruf kommt durch (Doppel-Tap, zwei Tabs).
  const { data: claimed } = await admin
    .from("sessions")
    .update({ finished_at: new Date().toISOString(), duration_sec: duration })
    .eq("id", session.id)
    .is("finished_at", null)
    .select("id");
  if (!claimed?.length) {
    const { data } = await admin.from("sessions").select("summary").eq("id", session.id).single();
    return (data?.summary as SessionSummary | null) ?? null;
  }

  const { data: streakRow } = await admin.from("streaks").select("*").eq("student_id", v.userId).maybeSingle<StreakRow>();
  const prev = toState(streakRow);
  let summary: SessionSummary = {
    streak: prev.current,
    streakCounted: false,
    jokerEarned: false,
    jokersUsed: 0,
    rewards: [],
  };

  // Tagessession ODER Fokus-Runde sichert den Streak-Tag. completeDay zählt pro Datum nur einmal.
  if (session.kind === "daily" || session.kind === "focus") {
    const r = completeDay(prev, session.date);
    if (r.counted) {
      await admin.from("streaks").upsert({
        student_id: v.userId,
        current: r.state.current,
        longest: r.state.longest,
        jokers: r.state.jokers,
        last_completed_date: r.state.lastCompletedDate,
      });

      const [{ data: cfg }, { data: ledger }] = await Promise.all([
        admin.from("rewards_config").select("*").eq("family_id", v.family.id).maybeSingle<RewardsConfigRow>(),
        admin.from("rewards_ledger").select("type").eq("student_id", v.userId),
      ]);
      const rewards = cfg
        ? rewardsForCompletion(
            prev,
            r.state,
            {
              weeklyStreakBonusEur: Number(cfg.weekly_streak_bonus_eur),
              milestones: cfg.milestones,
              examDayEur: Number(cfg.exam_day_eur),
            } satisfies RewardsConfig,
            new Set((ledger ?? []).map((l: { type: string }) => l.type)),
            session.date,
            v.family.exam_date,
          )
        : [];
      if (rewards.length) {
        await admin
          .from("rewards_ledger")
          .insert(rewards.map((e) => ({ student_id: v.userId, type: e.type, label: e.label, amount_eur: e.amountEur })));
      }
      summary = {
        streak: r.state.current,
        streakCounted: true,
        jokerEarned: r.jokerEarned,
        jokersUsed: r.jokersUsed,
        rewards: rewards.map((e) => ({ label: e.label, amountEur: e.amountEur })),
      };
    }
  }

  await admin.from("sessions").update({ summary }).eq("id", session.id);
  return summary;
}
