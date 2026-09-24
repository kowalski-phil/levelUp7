import { describe, expect, it } from "vitest";
import { addDays } from "./dates";
import { completeDay, displayStreak, initialStreak, type StreakState } from "./streak";

const D0 = "2026-10-01";

function runDays(days: number, start = D0, from: StreakState = initialStreak()) {
  let s = from;
  for (let i = 0; i < days; i++) s = completeDay(s, addDays(start, i)).state;
  return s;
}

describe("streak", () => {
  it("zählt aufeinanderfolgende Tage", () => {
    expect(runDays(5)).toMatchObject({ current: 5, longest: 5, jokers: 0 });
  });

  it("zweimal am selben Tag zählt einmal", () => {
    const s = completeDay(initialStreak(), D0).state;
    const r = completeDay(s, D0);
    expect(r.counted).toBe(false);
    expect(r.state.current).toBe(1);
  });

  it("alle 7 Tage ein Joker, maximal 2", () => {
    expect(runDays(7).jokers).toBe(1);
    expect(runDays(14).jokers).toBe(2);
    expect(runDays(21).jokers).toBe(2);
    expect(completeDay(runDays(6), addDays(D0, 6)).jokerEarned).toBe(true);
  });

  it("verpasster Tag verbraucht Joker, Streak bleibt", () => {
    const s = runDays(7); // letzter Tag D0+6, 1 Joker
    const r = completeDay(s, addDays(D0, 8)); // D0+7 verpasst
    expect(r.jokersUsed).toBe(1);
    expect(r.state).toMatchObject({ current: 8, jokers: 0 });
  });

  it("ohne Joker fällt der Streak auf 0, der neue Tag zählt als 1", () => {
    const s = runDays(5);
    const r = completeDay(s, addDays(D0, 6));
    expect(r.state).toMatchObject({ current: 1, longest: 5 });
  });

  it("zwei verpasste Tage, ein Joker: Streak bricht", () => {
    const s = runDays(7);
    expect(completeDay(s, addDays(D0, 9)).state).toMatchObject({ current: 1, jokers: 0 });
  });

  it("Anzeige verrechnet verpasste Tage, ohne den Zustand zu speichern", () => {
    const s = runDays(7);
    expect(displayStreak(s, addDays(D0, 7))).toMatchObject({ current: 7, jokers: 1 }); // heute noch offen
    expect(displayStreak(s, addDays(D0, 8))).toMatchObject({ current: 7, jokers: 0 });
    expect(displayStreak(s, addDays(D0, 9)).current).toBe(0);
    expect(s.jokers).toBe(1);
  });
});
