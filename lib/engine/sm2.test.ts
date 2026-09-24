import { describe, expect, it } from "vitest";
import { initialSrs, review } from "./sm2";

const T = "2026-10-01";

describe("sm2", () => {
  it("richtig: 1, 3, dann Intervall mal Ease", () => {
    let s = review(initialSrs(T), "correct", T);
    expect(s).toMatchObject({ reps: 1, intervalDays: 1, ease: 2.6, dueDate: "2026-10-02" });
    s = review(s, "correct", T);
    expect(s).toMatchObject({ reps: 2, intervalDays: 3, ease: 2.7 });
    s = review(s, "correct", T);
    expect(s).toMatchObject({ reps: 3, intervalDays: 8, ease: 2.8, dueDate: "2026-10-09" });
    s = review(s, "correct", T);
    expect(s).toMatchObject({ intervalDays: 22, ease: 2.8 });
  });

  it("falsch: zurück auf 1 Tag, Lapse zählt, Ease sinkt bis 1.3", () => {
    let s = { ...initialSrs(T), reps: 4, intervalDays: 20, ease: 1.4 };
    s = review(s, "wrong", T);
    expect(s).toMatchObject({ reps: 0, intervalDays: 1, ease: 1.3, lapses: 1, lastResult: "wrong" });
  });

  it("teilweise: Intervall halbiert, mindestens 1", () => {
    const s = review({ ...initialSrs(T), intervalDays: 9 }, "partial", T);
    expect(s).toMatchObject({ intervalDays: 5, ease: 2.4 });
    expect(review(initialSrs(T), "partial", T).intervalDays).toBe(1);
  });

  it("übersprungen zählt wie falsch", () => {
    expect(review(initialSrs(T), "skipped", T).lapses).toBe(1);
  });
});
