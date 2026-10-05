import { describe, expect, it } from "vitest";
import { activeUnits, buildSchedule, isExamMode, totalWeeks, unitPhase, unlockedSkillCount, weekOf, weekStart, newContentEnd } from "./calendar";

const START = "2026-09-16";
const EXAM = "2027-05-26"; // Schuljahresende im Test

const englisch = [
  { code: "E1", subject: "E", hours: 21, orderIndex: 1 },
  { code: "E2", subject: "E", hours: 20, orderIndex: 2 },
  { code: "E3", subject: "E", hours: 10, orderIndex: 3 },
  { code: "E4", subject: "E", hours: 35, orderIndex: 4 },
  { code: "E5", subject: "E", hours: 10, orderIndex: 5 },
];

describe("calendar", () => {
  it("Neustoff bis 2 Wochen vor Schuljahresende, ca. 34 Wochen", () => {
    expect(newContentEnd(EXAM)).toBe("2027-05-12");
    expect(totalWeeks(START, newContentEnd(EXAM))).toBe(34);
  });

  it("verteilt Englisch proportional zu den Stunden, lückenlos", () => {
    const s = buildSchedule(englisch, START, EXAM);
    expect(s.map((e) => [e.unitCode, e.weekFrom, e.weekTo])).toEqual([
      ["E1", 1, 7],
      ["E2", 8, 15],
      ["E3", 16, 18],
      ["E4", 19, 30],
      ["E5", 31, 34],
    ]);
  });

  it("Unterrichtsreihenfolge schlägt Lehrplanreihenfolge", () => {
    const order: Record<string, number> = { E5: 1, E1: 2, E4: 3, E2: 4, E3: 5 };
    const s = buildSchedule(
      englisch.map((u) => ({ ...u, scheduleOrder: order[u.code] })),
      START,
      EXAM,
    );
    expect(s.map((e) => [e.unitCode, e.weekFrom, e.weekTo])).toEqual([
      ["E5", 1, 4],
      ["E1", 5, 11],
      ["E4", 12, 23],
      ["E2", 24, 30],
      ["E3", 31, 34],
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

  it("Gebiete ohne Stunden (Vokabeln) laufen das ganze Jahr neben der Reihe", () => {
    const s = buildSchedule(
      [
        { code: "E1", subject: "E", hours: 21, orderIndex: 0 },
        { code: "E2", subject: "E", hours: 20, orderIndex: 1 },
        { code: "EV", subject: "E", hours: 0, orderIndex: 2 },
      ],
      START,
      EXAM,
    );
    expect(s).toEqual([
      { subject: "E", unitCode: "EV", weekFrom: 1, weekTo: 34 },
      { subject: "E", unitCode: "E1", weekFrom: 1, weekTo: 17 },
      { subject: "E", unitCode: "E2", weekFrom: 18, weekTo: 34 },
    ]);
  });

  it("Schulwoche und aktives Gebiet", () => {
    expect(weekOf("2026-09-16", START)).toBe(1);
    expect(weekOf("2026-09-22", START)).toBe(1);
    expect(weekOf("2026-09-23", START)).toBe(2);
    const s = buildSchedule(englisch, START, EXAM);
    expect(activeUnits(s, "E", 8).map((e) => e.unitCode)).toEqual(["E2"]);
    expect(activeUnits(s, "E", 40).map((e) => e.unitCode)).toEqual(["E5"]);
  });

  it("Wiederholungsmodus ab 2 Wochen vor Schuljahresende", () => {
    expect(isExamMode("2027-05-11", EXAM)).toBe(false);
    expect(isExamMode("2027-05-12", EXAM)).toBe(true);
  });

  it("Skills werden über die Wochen des Gebiets freigeschaltet", () => {
    const e = { subject: "E", unitCode: "E1", weekFrom: 1, weekTo: 7 };
    expect(unlockedSkillCount(e, 1, 5)).toBe(1);
    expect(unlockedSkillCount(e, 3, 5)).toBe(2);
    expect(unlockedSkillCount(e, 5, 5)).toBe(3);
    expect(unlockedSkillCount(e, 7, 5)).toBe(5);
    expect(unlockedSkillCount(e, 99, 5)).toBe(5);
  });
});

describe("unitPhase und weekStart", () => {
  const schedule = [
    { subject: "E", unitCode: "E5", weekFrom: 1, weekTo: 4 },
    { subject: "E", unitCode: "E1", weekFrom: 5, weekTo: 12 },
    { subject: "E", unitCode: "E4", weekFrom: 13, weekTo: 30 },
  ];

  it("vorbei, läuft gerade, kommt noch", () => {
    expect(unitPhase(schedule, "E5", 6)).toBe("past");
    expect(unitPhase(schedule, "E1", 6)).toBe("current");
    expect(unitPhase(schedule, "E4", 6)).toBe("future");
  });

  it("nach dem Plan-Ende bleibt das letzte Gebiet aktuell", () => {
    expect(unitPhase(schedule, "E4", 40)).toBe("current");
    expect(unitPhase(schedule, "E1", 40)).toBe("past");
  });

  it("Gebiet ohne Kalendereintrag gilt als kommend", () => {
    expect(unitPhase(schedule, "E2", 6)).toBe("future");
  });

  it("erster Tag der Schulwoche (gezählt ab Schuljahresbeginn)", () => {
    expect(weekStart(START, 1)).toBe("2026-09-16");
    expect(weekStart(START, 13)).toBe("2026-12-09");
  });
});
