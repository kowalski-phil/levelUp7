import { describe, expect, it } from "vitest";
import { buildSchedule } from "./calendar";
import { pickReplacement, planBonus, planDaily, type PlanInput, type PlannerItem, type PlannerState } from "./planner";

const START = "2026-09-16";
const EXAM = "2027-06-23";

function makeItems(subject: string, unitCode: string, skills: number, perSkill: number): PlannerItem[] {
  const out: PlannerItem[] = [];
  let n = 1;
  for (let s = 0; s < skills; s++) {
    for (let k = 0; k < perSkill; k++) {
      const code = `${unitCode}-${String(n++).padStart(3, "0")}`;
      out.push({ id: code, code, subject, unitCode, skillCode: `${unitCode}.${s + 1}`, skillOrder: s, difficulty: (k % 3) + 1 });
    }
  }
  return out;
}

const units = [
  { code: "M1", subject: "M", hours: 21, orderIndex: 1 },
  { code: "M2", subject: "M", hours: 20, orderIndex: 2 },
  { code: "B1", subject: "B", hours: 10, orderIndex: 1 },
  { code: "B2", subject: "B", hours: 17, orderIndex: 2 },
  { code: "D3", subject: "D", hours: 0, orderIndex: 3 },
  { code: "D4", subject: "D", hours: 0, orderIndex: 4 },
  { code: "E2", subject: "E", hours: 0, orderIndex: 2 },
];
const schedule = buildSchedule(units, START, EXAM);
const allItems = [
  ...makeItems("M", "M1", 5, 6),
  ...makeItems("M", "M2", 5, 6),
  ...makeItems("B", "B1", 4, 6),
  ...makeItems("B", "B2", 3, 6),
  ...makeItems("D", "D3", 3, 6),
  ...makeItems("D", "D4", 3, 6),
  ...makeItems("E", "E2", 4, 6),
];

const base = (over: Partial<PlanInput> = {}): PlanInput => ({
  items: allItems,
  states: [],
  schedule,
  today: "2026-09-24",
  schoolYearStart: START,
  examDate: EXAM,
  ...over,
});
const subj = (id: string) => allItems.find((i) => i.id === id)!.subject;

describe("planDaily", () => {
  it("12 Aufgaben, 3 pro Fach, Fächer abwechselnd M D B E", () => {
    const plan = planDaily(base());
    expect(plan).toHaveLength(12);
    expect(plan.map(subj).join("")).toBe("MDBEMDBEMDBE");
    expect(new Set(plan).size).toBe(12);
  });

  it("neue Aufgaben nur aus dem aktuellen Gebiet und freigeschalteten Skills, leichteste zuerst", () => {
    const plan = planDaily(base());
    const m = plan.filter((id) => subj(id) === "M").map((id) => allItems.find((i) => i.id === id)!);
    expect(m.every((i) => i.unitCode === "M1")).toBe(true);
    // Woche 2 von 7 bei 5 Skills: Skills 0 und 1 frei
    expect(m.every((i) => i.skillOrder <= 1)).toBe(true);
    expect(m.map((i) => i.difficulty)).toEqual([1, 1, 2]);
  });

  it("fällige Wiederholungen zuerst, höchstens 2 pro Fach, älteste zuerst", () => {
    const states: PlannerState[] = ["M1-010", "M1-011", "M1-012"].map((id, i) => ({
      itemId: id,
      dueDate: `2026-09-2${i}`,
      lapses: 0,
      lastResult: "wrong",
    }));
    const plan = planDaily(base({ states }));
    const m = plan.filter((id) => subj(id) === "M");
    expect(m.slice(0, 2)).toEqual(["M1-010", "M1-011"]);
    expect(m[2]).not.toBe("M1-012");
  });

  it("ohne Rückstau: nach Pause bleiben es 12", () => {
    const states: PlannerState[] = allItems.slice(0, 60).map((i) => ({ itemId: i.id, dueDate: "2026-09-01", lapses: 1, lastResult: "wrong" }));
    expect(planDaily(base({ states }))).toHaveLength(12);
  });

  it("fehlt ein Fach, füllen die anderen auf 12 auf", () => {
    const items = allItems.filter((i) => i.subject === "M" || i.subject === "B");
    const plan = planDaily(base({ items }));
    expect(plan).toHaveLength(12);
    expect(plan.filter((id) => subj(id) === "M")).toHaveLength(6);
  });

  it("Deutsch rotiert den Skill-Schwerpunkt wöchentlich", () => {
    const skillOf = (id: string) => allItems.find((i) => i.id === id)!.skillOrder;
    const w2 = planDaily(base({ today: "2026-09-24" })).filter((id) => subj(id) === "D").map(skillOf);
    const w3 = planDaily(base({ today: "2026-10-01" })).filter((id) => subj(id) === "D").map(skillOf);
    expect(w2).not.toEqual(w3);
  });

  it("Prüfungsmodus: D und E zuerst, Schwächen vor Starkem", () => {
    const states: PlannerState[] = [
      { itemId: "M1-001", dueDate: "2027-06-01", lapses: 0, lastResult: "correct" },
      { itemId: "M1-002", dueDate: "2027-05-20", lapses: 5, lastResult: "wrong" },
    ];
    const plan = planDaily(base({ today: "2027-05-20", states }));
    expect(plan.map(subj).slice(0, 4).join("")).toBe("DEMB");
    expect(plan.filter((id) => subj(id) === "M")[0]).toBe("M1-002");
  });

  it("gleicher Input, gleicher Plan", () => {
    expect(planDaily(base())).toEqual(planDaily(base()));
  });
});

describe("planBonus", () => {
  it("6 Aufgaben ohne die heutigen", () => {
    const today = planDaily(base());
    const bonus = planBonus(base({ exclude: new Set(today) }));
    expect(bonus).toHaveLength(6);
    expect(bonus.some((id) => today.includes(id))).toBe(false);
  });

  it("auf ein Gebiet beschränkbar", () => {
    const bonus = planBonus(base(), "B2");
    expect(bonus).toHaveLength(6);
    expect(bonus.every((id) => id.startsWith("B2"))).toBe(true);
  });
});

describe("hatten wir noch nicht", () => {
  it("zurückgestellte Skills liefern keine neuen Aufgaben", () => {
    const plan = planDaily(base({ snoozedSkills: new Set(["M1.1"]) }));
    const m = plan.filter((id) => subj(id) === "M").map((id) => allItems.find((i) => i.id === id)!);
    expect(m).toHaveLength(3);
    expect(m.some((i) => i.skillCode === "M1.1")).toBe(false);
  });

  it("fällige Wiederholungen aus dem Skill kommen trotzdem", () => {
    const states: PlannerState[] = [{ itemId: "M1-001", dueDate: "2026-09-20", lapses: 0, lastResult: "correct" }];
    const plan = planDaily(base({ states, snoozedSkills: new Set(["M1.1"]) }));
    expect(plan).toContain("M1-001");
  });

  it("Ersatz aus demselben Fach, nicht aus der Session, nicht aus dem Skill", () => {
    const today = planDaily(base());
    const r = pickReplacement(base({ exclude: new Set(today), snoozedSkills: new Set(["M1.1"]) }), "M");
    expect(r).not.toBeNull();
    const item = allItems.find((i) => i.id === r)!;
    expect(item.subject).toBe("M");
    expect(item.skillCode).not.toBe("M1.1");
    expect(today).not.toContain(r);
  });
});
