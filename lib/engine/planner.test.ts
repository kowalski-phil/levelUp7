import { describe, expect, it } from "vitest";
import { buildSchedule } from "./calendar";
import {
  pickReplacement,
  planBonus,
  planDaily,
  VOCAB_PER_DAY,
  type PlanInput,
  type PlannerItem,
  type PlannerState,
} from "./planner";

const START = "2026-09-16";
const EXAM = "2027-05-26"; // Schuljahresende im Test: Neustoff bis 2027-05-12, 34 Wochen

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
  { code: "E1", subject: "E", hours: 21, orderIndex: 1 },
  { code: "E2", subject: "E", hours: 20, orderIndex: 2 },
  { code: "F1", subject: "F", hours: 10, orderIndex: 1 },
  { code: "F2", subject: "F", hours: 17, orderIndex: 2 },
];
const schedule = buildSchedule(units, START, EXAM);
const allItems = [
  ...makeItems("E", "E1", 5, 6),
  ...makeItems("E", "E2", 5, 6),
  ...makeItems("F", "F1", 4, 6),
  ...makeItems("F", "F2", 3, 6),
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
  it("8 Aufgaben, 4 pro Fach, Fächer abwechselnd E F", () => {
    const plan = planDaily(base());
    expect(plan).toHaveLength(8);
    expect(plan.map(subj).join("")).toBe("EFEFEFEF");
    expect(new Set(plan).size).toBe(8);
  });

  it("neue Aufgaben nur aus dem aktuellen Gebiet und freigeschalteten Skills, leichteste zuerst", () => {
    const plan = planDaily(base());
    const e = plan.filter((id) => subj(id) === "E").map((id) => allItems.find((i) => i.id === id)!);
    expect(e.every((i) => i.unitCode === "E1")).toBe(true);
    // Woche 2 von 17 bei 5 Skills: nur Skill 0 frei
    expect(e.every((i) => i.skillOrder === 0)).toBe(true);
    expect(e.map((i) => i.difficulty)).toEqual([1, 1, 2, 2]);
  });

  it("fällige Wiederholungen zuerst, höchstens 2 pro Fach, älteste zuerst", () => {
    const states: PlannerState[] = ["E1-010", "E1-011", "E1-012"].map((id, i) => ({
      itemId: id,
      dueDate: `2026-09-2${i}`,
      lapses: 0,
      lastResult: "wrong",
    }));
    const plan = planDaily(base({ states }));
    const e = plan.filter((id) => subj(id) === "E");
    expect(e.slice(0, 2)).toEqual(["E1-010", "E1-011"]);
    expect(e[2]).not.toBe("E1-012");
  });

  it("ohne Rückstau: nach Pause bleiben es 8", () => {
    const states: PlannerState[] = allItems.slice(0, 60).map((i) => ({ itemId: i.id, dueDate: "2026-09-01", lapses: 1, lastResult: "wrong" }));
    expect(planDaily(base({ states }))).toHaveLength(8);
  });

  it("fehlt ein Fach, füllt das andere auf 8 auf", () => {
    const items = allItems.filter((i) => i.subject === "E");
    const plan = planDaily(base({ items }));
    expect(plan).toHaveLength(8);
    expect(plan.every((id) => subj(id) === "E")).toBe(true);
  });

  it("Wiederholungswochen vor Schuljahresende: Schwächen vor Starkem", () => {
    const states: PlannerState[] = [
      { itemId: "E1-001", dueDate: "2027-06-01", lapses: 0, lastResult: "correct" },
      { itemId: "E1-002", dueDate: "2027-05-20", lapses: 5, lastResult: "wrong" },
    ];
    const plan = planDaily(base({ today: "2027-05-20", states }));
    expect(plan.map(subj).join("")).toBe("EFEFEFEF");
    expect(plan.filter((id) => subj(id) === "E")[0]).toBe("E1-002");
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
    const bonus = planBonus(base(), "F2");
    expect(bonus).toHaveLength(6);
    expect(bonus.every((id) => id.startsWith("F2"))).toBe(true);
  });
});

describe("hatten wir noch nicht", () => {
  it("zurückgestellte Skills liefern keine neuen Aufgaben", () => {
    const plan = planDaily(base({ snoozedSkills: new Set(["E1.1"]) }));
    const e = plan.filter((id) => subj(id) === "E").map((id) => allItems.find((i) => i.id === id)!);
    expect(e).toHaveLength(4);
    expect(e.some((i) => i.skillCode === "E1.1")).toBe(false);
  });

  it("fällige Wiederholungen aus dem Skill kommen trotzdem", () => {
    const states: PlannerState[] = [{ itemId: "E1-001", dueDate: "2026-09-20", lapses: 0, lastResult: "correct" }];
    const plan = planDaily(base({ states, snoozedSkills: new Set(["E1.1"]) }));
    expect(plan).toContain("E1-001");
  });

  it("Ersatz aus demselben Fach, nicht aus der Session, nicht aus dem Skill", () => {
    const today = planDaily(base());
    const r = pickReplacement(base({ exclude: new Set(today), snoozedSkills: new Set(["E1.1"]) }), "E");
    expect(r).not.toBeNull();
    const item = allItems.find((i) => i.id === r)!;
    expect(item.subject).toBe("E");
    expect(item.skillCode).not.toBe("E1.1");
    expect(today).not.toContain(r);
  });
});

describe("Vokabeln", () => {
  // EV und FV: je 2 Buch-Units, je 6 Wörter × (Erkennen difficulty 1, Schreiben difficulty 2).
  function makeVocab(subject: string, unitCode: string): PlannerItem[] {
    const out: PlannerItem[] = [];
    for (let u = 0; u < 2; u++) {
      for (let k = 0; k < 12; k++) {
        const code = `${unitCode}-${String(u * 12 + k + 1).padStart(3, "0")}`;
        out.push({ id: code, code, subject, unitCode, skillCode: `${unitCode}.${u + 1}`, skillOrder: u, difficulty: k % 2 === 0 ? 1 : 2 });
      }
    }
    return out;
  }
  const vocab = [...makeVocab("E", "EV"), ...makeVocab("F", "FV")];
  const withVocab = (over: Partial<PlanInput> = {}) => base({ items: [...allItems, ...vocab], ...over });
  const isVocabId = (id: string) => id.startsWith("EV-") || id.startsWith("FV-");
  const find = (id: string) => vocab.find((i) => i.id === id)!;

  it("8 Fach-Aufgaben bleiben, dazu die Vokabeln beider Sprachen verteilt statt als Block", () => {
    const plan = planDaily(withVocab());
    const main = plan.filter((id) => !isVocabId(id));
    expect(main).toEqual(planDaily(base()));
    const v = plan.filter(isVocabId);
    expect(v).toHaveLength(2 * VOCAB_PER_DAY);
    expect(v.filter((id) => id.startsWith("EV-"))).toHaveLength(VOCAB_PER_DAY);
    expect(v.slice(0, 4).map((id) => id.slice(0, 2)).join(" ")).toBe("EV FV EV FV");
    expect(isVocabId(plan[0])).toBe(false);
    expect(plan.slice(0, 6).some(isVocabId)).toBe(true);
  });

  it("hat eine Sprache keine Vokabeln, füllt die andere bis 12 auf", () => {
    const plan = planDaily(base({ items: [...allItems, ...vocab.filter((i) => i.unitCode === "EV")] }));
    expect(plan.filter(isVocabId)).toHaveLength(2 * VOCAB_PER_DAY);
  });

  it("neue Wörter: erste Buch-Unit zuerst, darin erst Erkennen, dann Schreiben", () => {
    const v = planDaily(withVocab()).filter((id) => id.startsWith("EV-"));
    expect(v.every((id) => find(id).skillOrder === 0)).toBe(true);
    expect(v.every((id) => find(id).difficulty === 1)).toBe(true);
  });

  it("fällige Vokabeln vor neuen, nicht fällige bleiben weg", () => {
    const states: PlannerState[] = [
      { itemId: "FV-020", dueDate: "2026-09-22", lapses: 1, lastResult: "wrong" },
      { itemId: "FV-001", dueDate: "2026-09-30", lapses: 0, lastResult: "correct" },
    ];
    const v = planDaily(withVocab({ states })).filter((id) => id.startsWith("FV-"));
    expect(v[0]).toBe("FV-020");
    expect(v).not.toContain("FV-001");
  });

  it("Fach-Plätze und Ersatz nehmen nie Vokabeln, auch nicht bei Schulaufgabe mit Vokabel-Thema", () => {
    const focusSkills = new Map([["E", new Set(["EV.1", "E1.1"])]]);
    const plan = planDaily(withVocab({ focusSkills }));
    expect(plan.filter((id) => !isVocabId(id) && subj(id) === "E")).toHaveLength(4);
    const r = pickReplacement(withVocab({ exclude: new Set(plan) }), "F");
    expect(isVocabId(r!)).toBe(false);
  });

  it("ohne Vokabeln im Katalog ändert sich nichts", () => {
    expect(planDaily(base())).toHaveLength(8);
  });

  it("Bonus-Runde im Vokabel-Gebiet", () => {
    const today = planDaily(withVocab());
    const bonus = planBonus(withVocab({ exclude: new Set(today) }), "FV");
    expect(bonus).toHaveLength(6);
    expect(bonus.every((id) => id.startsWith("FV-"))).toBe(true);
    expect(bonus.some((id) => today.includes(id))).toBe(false);
  });
});
