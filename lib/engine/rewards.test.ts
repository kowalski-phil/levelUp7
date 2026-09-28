import { describe, expect, it } from "vitest";
import { balance, DEFAULT_REWARDS, milestoneType, repeatType, rewardsForCompletion } from "./rewards";
import type { StreakState } from "./streak";

const EXAM = "2027-06-23";
const st = (current: number, last: string): StreakState => ({ current, longest: current, jokers: 0, lastCompletedDate: last });

describe("rewards", () => {
  it("Wochenbonus bei jedem 7. Tag", () => {
    const r = rewardsForCompletion(st(6, "2026-10-06"), st(7, "2026-10-07"), DEFAULT_REWARDS, new Set(), "2026-10-07", EXAM);
    expect(r).toEqual([{ type: "weekly", amountEur: 5, label: "Wochenbonus (7 Tage)" }]);
    expect(rewardsForCompletion(st(7, "a"), st(8, "b"), DEFAULT_REWARDS, new Set(), "2026-10-08", EXAM)).toEqual([]);
  });

  it("Meilenstein nur einmal", () => {
    const r = rewardsForCompletion(st(29, "a"), st(30, "b"), DEFAULT_REWARDS, new Set(), "2026-11-01", EXAM);
    expect(r.map((e) => e.type)).toEqual([milestoneType(30)]);
    const again = rewardsForCompletion(st(29, "a"), st(30, "b"), DEFAULT_REWARDS, new Set([milestoneType(30)]), "2027-01-01", EXAM);
    expect(again).toEqual([]);
  });

  it("Tag 28: Wochenbonus, Tag 35: Wochenbonus", () => {
    const r = rewardsForCompletion(st(34, "a"), st(35, "b"), DEFAULT_REWARDS, new Set([milestoneType(30)]), "2026-12-01", EXAM);
    expect(r.map((e) => e.type)).toEqual(["weekly"]);
  });

  it("wiederkehrender Meilenstein: bei jedem Vielfachen, auch nach Streak-Abbruch", () => {
    const cfg = { weeklyStreakBonusEur: 0, milestones: [{ days: 30, eur: 10, label: "30 Tage am Stück", repeat: true }], examDayEur: 0 };
    const earned = new Set([repeatType(30)]);
    expect(rewardsForCompletion(st(29, "a"), st(30, "b"), cfg, new Set(), "2026-11-01", EXAM)).toEqual([
      { type: "streak_every_30", amountEur: 10, label: "30 Tage am Stück" },
    ]);
    expect(rewardsForCompletion(st(59, "a"), st(60, "b"), cfg, earned, "2026-12-01", EXAM)).toEqual([
      { type: "streak_every_30", amountEur: 10, label: "60 Tage am Stück" },
    ]);
    expect(rewardsForCompletion(st(30, "a"), st(31, "b"), cfg, earned, "2026-11-02", EXAM)).toEqual([]);
    expect(rewardsForCompletion(st(7, "a"), st(8, "b"), cfg, earned, "2026-11-02", EXAM)).toEqual([]);
    expect(rewardsForCompletion(st(0, "a"), st(1, "b"), cfg, earned, EXAM, EXAM)).toEqual([]);
  });

  it("Prüfungstag mit laufendem Streak", () => {
    const r = rewardsForCompletion(st(3, "a"), st(4, "b"), DEFAULT_REWARDS, new Set(), EXAM, EXAM);
    expect(r.map((e) => e.type)).toEqual(["exam_day"]);
  });

  it("kein Eintrag, wenn der Tag nicht gezählt wurde", () => {
    const s = st(7, "2026-10-07");
    expect(rewardsForCompletion(s, s, DEFAULT_REWARDS, new Set(), "2026-10-07", EXAM)).toEqual([]);
  });

  it("Kontostand", () => {
    const b = balance([
      { type: "weekly", amountEur: 5, label: "", paidAt: "2026-10-10" },
      { type: "weekly", amountEur: 5, label: "", paidAt: null },
      { type: "milestone_30", amountEur: 20, label: "" },
    ]);
    expect(b).toEqual({ earned: 30, paid: 5, open: 25 });
  });
});
