import { describe, expect, it } from "vitest";
import type { ContentItem } from "@/lib/content/types";
import { grade, withHint } from "./grading";
import { instantiate } from "./template";

const base = { code: "X-001", skill_code: "X.1", difficulty: 1 as const, stem: "", explanation: "" };

describe("grade", () => {
  it("mc", () => {
    const item: ContentItem = { ...base, type: "mc", payload: { options: ["a", "b", "c", "d"] }, solution: { index: 2 } };
    expect(grade(item, { type: "mc", index: 2 }, "s")).toBe("correct");
    expect(grade(item, { type: "mc", index: 0 }, "s")).toBe("wrong");
  });

  it("mc_multi: exakt richtig, teilweise ohne Fehlgriff, sonst falsch", () => {
    const item: ContentItem = { ...base, type: "mc_multi", payload: { options: ["a", "b", "c", "d"] }, solution: { indices: [0, 2] } };
    expect(grade(item, { type: "mc_multi", indices: [2, 0] }, "s")).toBe("correct");
    expect(grade(item, { type: "mc_multi", indices: [0] }, "s")).toBe("partial");
    expect(grade(item, { type: "mc_multi", indices: [0, 1] }, "s")).toBe("wrong");
  });

  it("numeric mit Toleranz und Komma", () => {
    const item: ContentItem = { ...base, type: "numeric", payload: { tolerance: 0.1, unit: "cm" }, solution: { value: 7.35 } };
    expect(grade(item, { type: "numeric", input: "7,4" }, "s")).toBe("correct");
    expect(grade(item, { type: "numeric", input: "7,5" }, "s")).toBe("wrong");
    expect(grade(item, { type: "numeric", input: "" }, "s")).toBe("wrong");
  });

  it("numeric_template rechnet mit denselben Zufallswerten", () => {
    const item: ContentItem = {
      ...base,
      type: "numeric_template",
      payload: { params: { a: { min: 1, max: 50, step: 1 }, b: { min: 1, max: 50, step: 1 } }, formula: "a * b", tolerance: 0 },
    };
    const { answer } = instantiate(item.payload, "seed-1");
    expect(grade(item, { type: "numeric_template", input: String(answer) }, "seed-1")).toBe("correct");
    expect(grade(item, { type: "numeric_template", input: String(answer + 1) }, "seed-1")).toBe("wrong");
  });

  it("cloze und cloze_free", () => {
    const cloze: ContentItem = {
      ...base,
      type: "cloze",
      payload: { text: "If I [[0]] rich, I [[1]] travel.", gaps: [{ options: ["was", "were"] }, { options: ["will", "would"] }] },
      solution: { answers: ["were", "would"] },
    };
    expect(grade(cloze, { type: "cloze", answers: ["were", "would"] }, "s")).toBe("correct");
    expect(grade(cloze, { type: "cloze", answers: ["were", "will"] }, "s")).toBe("partial");
    const free: ContentItem = {
      ...base,
      type: "cloze_free",
      payload: { text: "She [[0]] here since 2020.", case_sensitive: false },
      solution: { answers: [["has lived", "has been living"]] },
    };
    expect(grade(free, { type: "cloze_free", answers: ["  Has   been living. "] }, "s")).toBe("correct");
    expect(grade(free, { type: "cloze_free", answers: ["lived"] }, "s")).toBe("wrong");
    const de: ContentItem = { ...free, payload: { text: "[[0]]", case_sensitive: true }, solution: { answers: [["das Laufen"]] } };
    expect(grade(de, { type: "cloze_free", answers: ["das laufen"] }, "s")).toBe("wrong");
  });

  it("order und match", () => {
    const order: ContentItem = { ...base, type: "order", payload: { items: ["a", "b", "c", "d"] } };
    expect(grade(order, { type: "order", items: ["a", "b", "c", "d"] }, "s")).toBe("correct");
    expect(grade(order, { type: "order", items: ["a", "b", "d", "c"] }, "s")).toBe("partial");
    expect(grade(order, { type: "order", items: ["d", "c", "b", "a"] }, "s")).toBe("wrong");
    const match: ContentItem = { ...base, type: "match", payload: { pairs: [["1", "x"], ["2", "y"]] } };
    expect(grade(match, { type: "match", pairs: [["2", "y"], ["1", "x"]] }, "s")).toBe("correct");
    expect(grade(match, { type: "match", pairs: [["1", "y"], ["2", "x"]] }, "s")).toBe("wrong");
  });

  it("booking: Konten und Beträge, Reihenfolge der Zeilen egal", () => {
    const item: ContentItem = {
      ...base,
      type: "booking",
      payload: { accounts: ["ARA", "Versicherungen", "Bank", "PRA"] },
      solution: { soll: [{ account: "ARA", amount: 900 }], haben: [{ account: "Versicherungen", amount: 900 }] },
    };
    const ok = { soll: [{ account: "ARA", amount: "900" }], haben: [{ account: "Versicherungen", amount: "900,00" }] };
    expect(grade(item, { type: "booking", ...ok }, "s")).toBe("correct");
    expect(grade(item, { type: "booking", ...ok, haben: [{ account: "Versicherungen", amount: "1200" }] }, "s")).toBe("partial");
    expect(grade(item, { type: "booking", soll: ok.haben, haben: ok.soll }, "s")).toBe("wrong");
    const two: ContentItem = {
      ...item,
      solution: {
        soll: [{ account: "Versicherungen", amount: 100 }, { account: "ARA", amount: 50 }],
        haben: [{ account: "Bank", amount: 150 }],
      },
    };
    expect(
      grade(two, { type: "booking", soll: [{ account: "ARA", amount: "50" }, { account: "Versicherungen", amount: "100" }], haben: [{ account: "Bank", amount: "150" }] }, "s"),
    ).toBe("correct");
  });

  it("self_check übernimmt die Selbsteinschätzung", () => {
    const item: ContentItem = { ...base, type: "self_check", payload: { sample_answer: "..." } };
    expect(grade(item, { type: "self_check", text: "x", rating: "partial" }, "s")).toBe("partial");
  });

  it("falscher Antworttyp ist falsch", () => {
    const item: ContentItem = { ...base, type: "mc", payload: { options: ["a"] }, solution: { index: 0 } };
    expect(grade(item, { type: "numeric", input: "0" }, "s")).toBe("wrong");
  });
});

describe("withHint", () => {
  it("richtig mit Tipp wird teilweise, sonst unverändert", () => {
    expect(withHint("correct", true)).toBe("partial");
    expect(withHint("correct", false)).toBe("correct");
    expect(withHint("wrong", true)).toBe("wrong");
    expect(withHint("partial", true)).toBe("partial");
  });
});
