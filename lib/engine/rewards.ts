import type { ISODate } from "./dates";
import type { StreakState } from "./streak";

export interface Milestone {
  days: number;
  eur: number;
  label: string;
}

export interface RewardsConfig {
  weeklyStreakBonusEur: number;
  milestones: Milestone[];
  examDayEur: number;
}

export interface LedgerEntry {
  type: string;
  amountEur: number;
  label: string;
  paidAt?: string | null;
}

export const DEFAULT_REWARDS: RewardsConfig = {
  weeklyStreakBonusEur: 5,
  milestones: [
    { days: 30, eur: 20, label: "30 Tage am Stück" },
    { days: 60, eur: 30, label: "60 Tage am Stück" },
    { days: 100, eur: 50, label: "100 Tage am Stück" },
  ],
  examDayEur: 100,
};

export const milestoneType = (days: number) => `milestone_${days}`;
export const EXAM_DAY_TYPE = "exam_day";
export const WEEKLY_TYPE = "weekly";

/**
 * Belohnungen, die durch einen abgeschlossenen Tag fällig werden.
 * earnedTypes: bereits im Ledger vorhandene Typen (Meilensteine und Prüfungstag gibt es nur einmal).
 */
export function rewardsForCompletion(
  prev: StreakState,
  next: StreakState,
  config: RewardsConfig,
  earnedTypes: ReadonlySet<string>,
  today: ISODate,
  examDate: ISODate,
): LedgerEntry[] {
  const out: LedgerEntry[] = [];
  if (next.lastCompletedDate === prev.lastCompletedDate) return out;

  if (next.current > 0 && next.current % 7 === 0 && config.weeklyStreakBonusEur > 0) {
    out.push({ type: WEEKLY_TYPE, amountEur: config.weeklyStreakBonusEur, label: `Wochenbonus (${next.current} Tage)` });
  }
  for (const m of config.milestones) {
    const type = milestoneType(m.days);
    if (next.current >= m.days && m.eur > 0 && !earnedTypes.has(type)) {
      out.push({ type, amountEur: m.eur, label: m.label });
    }
  }
  if (today >= examDate && next.current > 0 && config.examDayEur > 0 && !earnedTypes.has(EXAM_DAY_TYPE)) {
    out.push({ type: EXAM_DAY_TYPE, amountEur: config.examDayEur, label: "Prüfung erreicht, Streak läuft" });
  }
  return out;
}

export function balance(ledger: readonly LedgerEntry[]): { earned: number; paid: number; open: number } {
  let earned = 0;
  let paid = 0;
  for (const e of ledger) {
    earned += e.amountEur;
    if (e.paidAt) paid += e.amountEur;
  }
  const round = (n: number) => Math.round(n * 100) / 100;
  return { earned: round(earned), paid: round(paid), open: round(earned - paid) };
}
