import { describe, expect, it } from "vitest";
import type { Structure } from "./load";
import { sentences, validateContent } from "./validate";

const structure: Structure = {
  subjects: [{ code: "B", name: "BwR", color: "#000" }],
  units: [{ code: "B4", subject: "B", title: "T", hours: 1, skills: [{ code: "B4.2", title: "", description: "" }] }],
};

const good = {
  code: "B4-003",
  skill_code: "B4.2",
  type: "numeric_template",
  difficulty: 1,
  stem: "Preis {{preis}} Euro, variable Kosten {{vk}} Euro. Deckungsbeitrag je Stück?",
  payload: {
    params: { preis: { min: 40, max: 120, step: 5 }, vk: { min: 15, max: 35, step: 1 } },
    formula: "preis - vk",
    unit: "Euro",
    tolerance: 0.01,
  },
  explanation: "Deckungsbeitrag je Stück = Verkaufspreis minus variable Stückkosten. Er deckt die Fixkosten.",
  hint: "Was bleibt vom Preis übrig, wenn die variablen Kosten bezahlt sind?",
};

const run = (items: unknown[]) =>
  validateContent(structure, [{ path: "x", unitCode: "B4", items: items as never }]).filter((i) => i.level === "error");

describe("validateContent", () => {
  it("akzeptiert das Beispiel aus dem Plan", () => {
    expect(run([good])).toEqual([]);
  });

  it("findet falschen Code, fremden Skill, fehlende Erklärung, unbekannte Platzhalter", () => {
    const errors = run([{ ...good, code: "B3-001", skill_code: "B1.1", explanation: "", stem: "{{x}}" }]);
    expect(errors.map((e) => e.msg)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("code muss"),
        expect.stringContaining("skill_code"),
        "explanation fehlt",
        expect.stringContaining("{{x}}"),
      ]),
    );
  });

  it("findet unausgeglichene Buchungssätze und doppelte Codes", () => {
    const booking = {
      ...good,
      type: "booking",
      payload: { accounts: ["A", "B", "C", "D"] },
      solution: { soll: [{ account: "A", amount: 100 }], haben: [{ account: "B", amount: 90 }] },
    };
    const errors = run([booking, { ...good, code: "B4-003", stem: "anders" }]);
    expect(errors.map((e) => e.msg)).toEqual(expect.arrayContaining(["Summe Soll ≠ Summe Haben", "code doppelt"]));
  });

  it("zählt Sätze auch mit Anführungszeichen und Kursivschrift", () => {
    expect(sentences('Use "for" with a period. "Since" needs a point in time.')).toBe(2);
    expect(sentences('It means "werden." It never means "bekommen".')).toBe(2);
    expect(sentences("Das Komma steht davor. *dass* leitet einen Nebensatz ein.")).toBe(2);
    expect(sentences("Beträge wie 3.600 € sind glatt. Das passt.")).toBe(2);
  });
});
