import { describe, expect, it } from "vitest";
import { addDays } from "./dates";
import { completeDay, dayMarks, daysToNextJoker, displayStreak, initialStreak, mondayOf, weekView, type StreakState } from "./streak";

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

  it("alle 14 Tage ein Joker, maximal 2", () => {
    expect(runDays(13).jokers).toBe(0);
    expect(runDays(14).jokers).toBe(1);
    expect(runDays(28).jokers).toBe(2);
    expect(runDays(42).jokers).toBe(2);
    expect(completeDay(runDays(13), addDays(D0, 13)).jokerEarned).toBe(true);
    expect(completeDay(runDays(6), addDays(D0, 6)).jokerEarned).toBe(false);
  });

  it("verpasster Tag verbraucht Joker, Streak bleibt", () => {
    const s = runDays(14); // letzter Tag D0+13, 1 Joker
    const r = completeDay(s, addDays(D0, 15)); // D0+14 verpasst
    expect(r.jokersUsed).toBe(1);
    expect(r.state).toMatchObject({ current: 15, jokers: 0 });
  });

  it("ohne Joker fällt der Streak auf 0, der neue Tag zählt als 1", () => {
    const s = runDays(5);
    const r = completeDay(s, addDays(D0, 6));
    expect(r.state).toMatchObject({ current: 1, longest: 5 });
  });

  it("zwei verpasste Tage, ein Joker: Streak bricht", () => {
    const s = runDays(14);
    expect(completeDay(s, addDays(D0, 16)).state).toMatchObject({ current: 1, jokers: 0 });
  });

  it("Anzeige verrechnet verpasste Tage, ohne den Zustand zu speichern", () => {
    const s = runDays(14);
    expect(displayStreak(s, addDays(D0, 14))).toMatchObject({ current: 14, jokers: 1 }); // heute noch offen
    expect(displayStreak(s, addDays(D0, 15))).toMatchObject({ current: 14, jokers: 0 });
    expect(displayStreak(s, addDays(D0, 16)).current).toBe(0);
    expect(s.jokers).toBe(1);
  });
});

describe("Tagesmarkierungen für die Wochenansicht", () => {
  const days = (n: number, start = D0) => Array.from({ length: n }, (_, i) => addDays(start, i));

  it("geschaffte Tage sind done, Lücken ohne Joker bleiben leer", () => {
    const m = dayMarks([D0, addDays(D0, 1), addDays(D0, 3)], addDays(D0, 3));
    expect(m.get(D0)).toBe("done");
    expect(m.get(addDays(D0, 2))).toBeUndefined();
    expect(m.get(addDays(D0, 3))).toBe("done");
  });

  it("ein Joker rettet den verpassten Tag", () => {
    const done = [...days(14), addDays(D0, 15)]; // D0+14 verpasst, 1 Joker vorhanden
    const m = dayMarks(done, addDays(D0, 15));
    expect(m.get(addDays(D0, 14))).toBe("saved");
    expect(m.get(addDays(D0, 15))).toBe("done");
  });

  it("gestern verpasst, heute noch offen: Joker wird schon angezeigt", () => {
    const m = dayMarks(days(14), addDays(D0, 15));
    expect(m.get(addDays(D0, 14))).toBe("saved");
    expect(m.has(addDays(D0, 15))).toBe(false);
  });

  it("stimmt mit dem gespeicherten Zustand überein", () => {
    const done = [...days(14), ...days(5, addDays(D0, 15))];
    const state = done.reduce((s, d) => completeDay(s, d).state, initialStreak());
    const m = dayMarks(done, addDays(D0, 19));
    const values = [...m.values()];
    // Gerettete Tage halten den Streak, zählen aber nicht mit: 19 geschafft, 1 gerettet, Streak 19.
    expect(values.filter((v) => v === "done")).toHaveLength(19);
    expect(values.filter((v) => v === "saved")).toHaveLength(1);
    expect(state.current).toBe(19);
  });
});

describe("Wochenansicht", () => {
  it("Montag der Woche", () => {
    expect(mondayOf("2026-09-26")).toBe("2026-09-21"); // Samstag
    expect(mondayOf("2026-09-21")).toBe("2026-09-21"); // Montag
    expect(mondayOf("2026-09-27")).toBe("2026-09-21"); // Sonntag
  });

  it("Mo bis So mit Status", () => {
    // Samstag 26.09.: Mi geschafft, Do gerettet, Fr verpasst, Sa offen, So Zukunft, Mo/Di vor dem ersten Tag
    const marks = new Map<string, "done" | "saved">([
      ["2026-09-23", "done"],
      ["2026-09-24", "saved"],
    ]);
    const w = weekView(marks, "2026-09-26");
    expect(w.map((d) => d.label).join(" ")).toBe("Mo Di Mi Do Fr Sa So");
    expect(w.map((d) => d.status)).toEqual(["before", "before", "done", "saved", "missed", "today", "future"]);
  });

  it("heute geschafft zeigt die Flamme", () => {
    const w = weekView(new Map([["2026-09-26", "done"]]), "2026-09-26");
    expect(w[5].status).toBe("done");
  });

  it("Tage bis zum nächsten Joker", () => {
    expect(daysToNextJoker({ current: 1, longest: 1, jokers: 0, lastCompletedDate: null })).toBe(13);
    expect(daysToNextJoker({ current: 14, longest: 14, jokers: 1, lastCompletedDate: null })).toBe(14);
    expect(daysToNextJoker({ current: 30, longest: 30, jokers: 2, lastCompletedDate: null })).toBeNull();
  });
});
