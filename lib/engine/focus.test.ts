import { describe, expect, it } from "vitest";
import { buildSchedule } from "./calendar";
import {
  activeExams,
  daysUntil,
  focusSkillsBySubject,
  overDeselectedUnits,
  planFocus,
  suggestSkills,
  type FocusExam,
  type SuggestInput,
} from "./focus";
import { planDaily, type PlanInput, type PlannerItem, type PlannerState } from "./planner";

const START = "2026-09-16";
const EXAM = "2027-06-23";
const TODAY = "2026-09-26";

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

const exam = (over: Partial<FocusExam> = {}): FocusExam => ({
  id: "x1",
  subject: "B",
  examDate: "2026-10-05",
  number: 1,
  skillCodes: ["B1.1", "B1.2", "B1.3"],
  ...over,
});

describe("aktive Schulaufgaben", () => {
  const exams = [
    exam({ id: "past", examDate: "2026-09-25" }),
    exam({ id: "later", examDate: "2026-10-12", subject: "M" }),
    exam({ id: "today", examDate: TODAY }),
    exam({ id: "soon", examDate: "2026-10-05" }),
  ];

  it("filtert vergangene raus, Prüfungstag bleibt, nächste zuerst", () => {
    expect(activeExams(exams, TODAY).map((e) => e.id)).toEqual(["today", "soon", "later"]);
  });

  it("Tage bis zur Schulaufgabe: heute 0, morgen 1", () => {
    expect(daysUntil({ examDate: TODAY }, TODAY)).toBe(0);
    expect(daysUntil({ examDate: "2026-09-27" }, TODAY)).toBe(1);
    expect(daysUntil({ examDate: "2026-10-05" }, TODAY)).toBe(9);
  });

  it("Skills je Fach vereinigt, abgelaufene fehlen", () => {
    const map = focusSkillsBySubject(
      [
        exam({ id: "b1", skillCodes: ["B1.1", "B1.2"] }),
        exam({ id: "b2", skillCodes: ["B1.2", "B2.1"], examDate: "2026-10-20" }),
        exam({ id: "m", subject: "M", skillCodes: ["M1.1"] }),
        exam({ id: "old", subject: "D", skillCodes: ["D4.1"], examDate: "2026-09-20" }),
      ],
      TODAY,
    );
    expect([...map.get("B")!].sort()).toEqual(["B1.1", "B1.2", "B2.1"]);
    expect([...map.get("M")!]).toEqual(["M1.1"]);
    expect(map.has("D")).toBe(false);
  });
});

describe("Themenvorschlag", () => {
  // Im Test läuft M1 in den Wochen 1-17, M2 in 18-34. M1-Skills werden in den Wochen 1, 5, 8, 12, 15 freigeschaltet.
  const schedule = buildSchedule(
    [
      { code: "M1", subject: "M", hours: 21, orderIndex: 1 },
      { code: "M2", subject: "M", hours: 20, orderIndex: 2 },
      { code: "D4", subject: "D", hours: 0, orderIndex: 4 },
    ],
    START,
    EXAM,
  );
  const skills = ["M1", "M2"].flatMap((unitCode) =>
    Array.from({ length: 5 }, (_, i) => ({ code: `${unitCode}.${i + 1}`, unitCode, orderIndex: i })),
  );
  const input = (over: Partial<SuggestInput>): SuggestInput => ({
    subject: "M",
    examDate: "2026-10-14", // Woche 5
    schoolYearStart: START,
    schedule,
    skills,
    previousExamDate: null,
    snoozedSkills: new Set(),
    ...over,
  });

  it("ohne frühere Schulaufgabe: alles, was bis zum Termin dran war", () => {
    expect(suggestSkills(input({}))).toEqual(["M1.1", "M1.2"]);
  });

  it("mit früherer Schulaufgabe: nur Stoff seit der letzten", () => {
    // frühere in Woche 4, Termin in Woche 12: Fenster 5-12
    expect(suggestSkills(input({ previousExamDate: "2026-10-07", examDate: "2026-12-02" }))).toEqual(["M1.2", "M1.3", "M1.4"]);
  });

  it("über die Gebietsgrenze: Rest von M1 und Anfang von M2", () => {
    // frühere in Woche 14, Termin in Woche 20
    expect(suggestSkills(input({ previousExamDate: "2026-12-16", examDate: "2027-01-27" }))).toEqual(["M1.5", "M2.1"]);
  });

  it("zurückgestellte Skills werden nicht vorgeschlagen", () => {
    expect(suggestSkills(input({ snoozedSkills: new Set(["M1.2"]) }))).toEqual(["M1.1"]);
  });

  it("Deutsch und Englisch: kein Vorschlag", () => {
    expect(suggestSkills(input({ subject: "D" }))).toEqual([]);
    expect(suggestSkills(input({ subject: "E" }))).toEqual([]);
  });
});

describe("Abwahl-Warnung", () => {
  const units = (n: number) => new Map([["U", Array.from({ length: n }, (_, i) => `U.${i + 1}`)]]);
  const pick = (k: number) => new Set(Array.from({ length: k }, (_, i) => `U.${i + 1}`));

  it("warnt, wenn mehr als die Hälfte abgewählt ist", () => {
    expect(overDeselectedUnits(units(4), pick(1))).toEqual(["U"]);
    expect(overDeselectedUnits(units(5), pick(2))).toEqual(["U"]);
  });

  it("keine Warnung bei genau der Hälfte, bei Mehrheit und bei ganz abgewähltem Lernbereich", () => {
    expect(overDeselectedUnits(units(4), pick(2))).toEqual([]);
    expect(overDeselectedUnits(units(5), pick(3))).toEqual([]);
    expect(overDeselectedUnits(units(4), pick(0))).toEqual([]);
  });
});

describe("Fokus-Runde", () => {
  const items = [...makeItems("B", "B1", 4, 10), ...makeItems("M", "M1", 5, 6)];
  const skillOf = (id: string) => items.find((i) => i.id === id)!.skillCode;
  const base = (over: Partial<Parameters<typeof planFocus>[0]> = {}) => ({
    items,
    states: [] as PlannerState[],
    exam: exam(),
    today: TODAY,
    ...over,
  });

  it("12 Aufgaben nur aus den Skills der Schulaufgabe, keine Doppelten", () => {
    const plan = planFocus(base());
    expect(plan).toHaveLength(12);
    expect(new Set(plan).size).toBe(12);
    expect(plan.every((id) => ["B1.1", "B1.2", "B1.3"].includes(skillOf(id)))).toBe(true);
  });

  it("kleiner Pool liefert weniger, leerer Pool nichts", () => {
    const small = items.filter((i) => i.skillCode !== "B1.1" || Number(i.code.slice(-3)) <= 8);
    expect(planFocus(base({ items: small, exam: exam({ skillCodes: ["B1.1"] }) }))).toHaveLength(8);
    expect(planFocus(base({ exam: exam({ skillCodes: ["B9.9"] }) }))).toEqual([]);
  });

  it("pro Skill: ungesehene vor schwachen vor gekonnten", () => {
    const ids = items.filter((i) => i.skillCode === "B1.1").map((i) => i.id);
    const states: PlannerState[] = [
      ...ids.slice(0, 7).map((id) => ({ itemId: id, dueDate: "2026-10-30", lapses: 0, lastResult: "correct" as const })),
      { itemId: ids[7], dueDate: "2026-10-01", lapses: 1, lastResult: "wrong" },
      { itemId: ids[8], dueDate: "2026-09-27", lapses: 0, lastResult: "partial" },
    ];
    const plan = planFocus(base({ states, exam: exam({ skillCodes: ["B1.1"] }) }), 10);
    expect(plan[0]).toBe(ids[9]); // ungesehen
    expect(plan.slice(1, 3)).toEqual([ids[8], ids[7]]); // schwach, früher fällig zuerst
    expect(plan.slice(3)).toEqual(ids.slice(0, 7)); // gekonnt
  });

  it("Skills reihum, Start-Skill hängt von der Rotation ab", () => {
    const plan = planFocus(base());
    const counts = new Map<string, number>();
    for (const id of plan) counts.set(skillOf(id), (counts.get(skillOf(id)) ?? 0) + 1);
    expect([...counts.values()]).toEqual([4, 4, 4]);
    expect(plan.slice(0, 3).map(skillOf)).toEqual(["B1.1", "B1.2", "B1.3"]);
    expect(planFocus(base({ rotation: 1 })).slice(0, 3).map(skillOf)).toEqual(["B1.2", "B1.3", "B1.1"]);
    expect(planFocus(base({ rotation: 4 })).slice(0, 3).map(skillOf)).toEqual(["B1.2", "B1.3", "B1.1"]);
  });

  it("ungesehene innerhalb eines Skills: leichteste zuerst", () => {
    const plan = planFocus(base({ exam: exam({ skillCodes: ["B1.1"] }) }), 10);
    const diffs = plan.map((id) => items.find((i) => i.id === id)!.difficulty);
    expect(diffs).toEqual([...diffs].sort((a, b) => a - b));
  });

  it("heutige Aufgaben werden ausgeschlossen", () => {
    const first = planFocus(base());
    const second = planFocus(base({ exclude: new Set(first) }));
    expect(second).toHaveLength(12);
    expect(second.some((id) => first.includes(id))).toBe(false);
  });

  it("zurückgestellte Skills zählen trotzdem, weil Felix sie gewählt hat", () => {
    // planFocus kennt keinen Snooze: der Aufrufer übergibt nur die Schulaufgabe.
    expect(planFocus(base({ exam: exam({ skillCodes: ["B1.4"] }) }))).toHaveLength(10);
  });
});

describe("gefärbte Tagessession", () => {
  const units = [
    { code: "M1", subject: "M", hours: 21, orderIndex: 1 },
    { code: "B1", subject: "B", hours: 10, orderIndex: 1 },
    { code: "B2", subject: "B", hours: 17, orderIndex: 2 },
    { code: "D4", subject: "D", hours: 0, orderIndex: 4 },
    { code: "E2", subject: "E", hours: 0, orderIndex: 2 },
  ];
  const schedule = buildSchedule(units, START, EXAM);
  const all = [
    ...makeItems("M", "M1", 5, 6),
    ...makeItems("B", "B1", 4, 6),
    ...makeItems("B", "B2", 3, 6),
    ...makeItems("D", "D4", 3, 6),
    ...makeItems("E", "E2", 4, 6),
  ];
  const find = (id: string) => all.find((i) => i.id === id)!;
  const base = (over: Partial<PlanInput> = {}): PlanInput => ({
    items: all,
    states: [],
    schedule,
    today: TODAY,
    schoolYearStart: START,
    examDate: EXAM,
    ...over,
  });

  it("die 3 BwR-Aufgaben kommen aus den Schulaufgaben-Skills, der Rest bleibt gleich", () => {
    const normal = planDaily(base());
    const colored = planDaily(base({ focusSkills: new Map([["B", new Set(["B2.2", "B2.3"])]]) }));
    expect(colored).toHaveLength(12);
    expect(colored.map((id) => find(id).subject).join("")).toBe("MDBEMDBEMDBE");
    const b = colored.filter((id) => find(id).subject === "B");
    expect(b.every((id) => ["B2.2", "B2.3"].includes(find(id).skillCode))).toBe(true);
    expect(colored.filter((id) => find(id).subject !== "B")).toEqual(normal.filter((id) => find(id).subject !== "B"));
  });

  it("zu kleiner Fokus-Pool wird normal aufgefüllt", () => {
    const items = all.filter((i) => i.skillCode !== "B2.3" || i.code === "B2-013");
    const plan = planDaily(base({ items, focusSkills: new Map([["B", new Set(["B2.3"])]]) }));
    const b = plan.filter((id) => find(id).subject === "B");
    expect(b).toHaveLength(3);
    expect(b[0]).toBe("B2-013");
    expect(b.slice(1).every((id) => find(id).skillCode !== "B2.3")).toBe(true);
  });
});
