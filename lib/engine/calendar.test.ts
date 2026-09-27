import { describe, expect, it } from "vitest";
import { activeUnits, buildSchedule, isExamMode, totalWeeks, unlockedSkillCount, weekOf, newContentEnd } from "./calendar";

const START = "2026-09-16";
const EXAM = "2027-06-23";

const mathe = [
  { code: "M1", subject: "M", hours: 21, orderIndex: 1 },
  { code: "M2", subject: "M", hours: 20, orderIndex: 2 },
  { code: "M3", subject: "M", hours: 10, orderIndex: 3 },
  { code: "M4", subject: "M", hours: 35, orderIndex: 4 },
  { code: "M5", subject: "M", hours: 10, orderIndex: 5 },
];

describe("calendar", () => {
  it("Neustoff bis 6 Wochen vor der Prüfung, ca. 34 Wochen", () => {
    expect(newContentEnd(EXAM)).toBe("2027-05-12");
    expect(totalWeeks(START, newContentEnd(EXAM))).toBe(34);
  });

  it("verteilt Mathe proportional zu den Stunden, lückenlos", () => {
    const s = buildSchedule(mathe, START, EXAM);
    expect(s.map((e) => [e.unitCode, e.weekFrom, e.weekTo])).toEqual([
      ["M1", 1, 7],
      ["M2", 8, 15],
      ["M3", 16, 18],
      ["M4", 19, 30],
      ["M5", 31, 34],
    ]);
  });

  it("Unterrichtsreihenfolge schlägt Lehrplanreihenfolge", () => {
    const order: Record<string, number> = { M5: 1, M1: 2, M4: 3, M2: 4, M3: 5 };
    const s = buildSchedule(
      mathe.map((u) => ({ ...u, scheduleOrder: order[u.code] })),
      START,
      EXAM,
    );
    expect(s.map((e) => [e.unitCode, e.weekFrom, e.weekTo])).toEqual([
      ["M5", 1, 4],
      ["M1", 5, 11],
      ["M4", 12, 23],
      ["M2", 24, 30],
      ["M3", 31, 34],
    ]);
  });

  it("jeder Lernbereich bekommt mindestens eine Woche", () => {
    const units = [
      { code: "X1", subject: "X", hours: 100, orderIndex: 1 },
      { code: "X2", subject: "X", hours: 1, orderIndex: 2 },
      { code: "X3", subject: "X", hours: 1, orderIndex: 3 },
    ];
    const s = buildSchedule(units, START, EXAM);
    expect(s.map((e) => e.weekTo - e.weekFrom + 1).every((n) => n >= 1)).toBe(true);
    expect(s.at(-1)!.weekTo).toBe(34);
  });

  it("Deutsch und Englisch laufen das ganze Jahr", () => {
    const s = buildSchedule(
      [
        { code: "D3", subject: "D", hours: 0, orderIndex: 3 },
        { code: "D4", subject: "D", hours: 0, orderIndex: 4 },
      ],
      START,
      EXAM,
    );
    expect(s).toEqual([
      { subject: "D", unitCode: "D3", weekFrom: 1, weekTo: 34 },
      { subject: "D", unitCode: "D4", weekFrom: 1, weekTo: 34 },
    ]);
  });

  it("Schulwoche und aktives Gebiet", () => {
    expect(weekOf("2026-09-16", START)).toBe(1);
    expect(weekOf("2026-09-22", START)).toBe(1);
    expect(weekOf("2026-09-23", START)).toBe(2);
    const s = buildSchedule(mathe, START, EXAM);
    expect(activeUnits(s, "M", 8).map((e) => e.unitCode)).toEqual(["M2"]);
    expect(activeUnits(s, "M", 40).map((e) => e.unitCode)).toEqual(["M5"]);
  });

  it("Prüfungsmodus ab 6 Wochen vor der Prüfung", () => {
    expect(isExamMode("2027-05-11", EXAM)).toBe(false);
    expect(isExamMode("2027-05-12", EXAM)).toBe(true);
  });

  it("Skills werden über die Wochen des Gebiets freigeschaltet", () => {
    const e = { subject: "M", unitCode: "M1", weekFrom: 1, weekTo: 7 };
    expect(unlockedSkillCount(e, 1, 5)).toBe(1);
    expect(unlockedSkillCount(e, 3, 5)).toBe(2);
    expect(unlockedSkillCount(e, 5, 5)).toBe(3);
    expect(unlockedSkillCount(e, 7, 5)).toBe(5);
    expect(unlockedSkillCount(e, 99, 5)).toBe(5);
  });
});
