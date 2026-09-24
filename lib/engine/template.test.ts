import { describe, expect, it } from "vitest";
import { evaluate, fillTemplate, formatNumberDe, instantiate, parseNumberDe, shuffle } from "./template";

describe("evaluate", () => {
  it("Punkt vor Strich, Potenzen, Klammern, Vorzeichen", () => {
    expect(evaluate("2 + 3 * 4", {})).toBe(14);
    expect(evaluate("(2 + 3) * 4", {})).toBe(20);
    expect(evaluate("2 ^ 3 ^ 2", {})).toBe(512);
    expect(evaluate("-3 ^ 2", {})).toBe(-9);
    expect(evaluate("a * b - c / 2", { a: 3, b: 4, c: 10 })).toBe(7);
  });

  it("Funktionen mit Winkeln in Grad", () => {
    expect(evaluate("sin(30)", {})).toBeCloseTo(0.5);
    expect(evaluate("acos(0.5)", {})).toBeCloseTo(60);
    expect(evaluate("round(pi * 2 ^ 2, 2)", {})).toBe(12.57);
    expect(evaluate("log(2, 8)", {})).toBeCloseTo(3);
    expect(evaluate("sqrt(b^2 - 4*a*c)", { a: 1, b: 5, c: 6 })).toBe(1);
  });

  it("Vergleiche und Logik für Bedingungen", () => {
    expect(evaluate("a > b && b > 0", { a: 3, b: 1 })).toBe(1);
    expect(evaluate("a > b || b > 5", { a: 1, b: 2 })).toBe(0);
    expect(evaluate("0.1 + 0.2 == 0.3", {})).toBe(1);
  });

  it("wirft bei unbekannten Namen und kaputter Syntax", () => {
    expect(() => evaluate("x + 1", {})).toThrow();
    expect(() => evaluate("foo(1)", {})).toThrow();
    expect(() => evaluate("(1 + 2", {})).toThrow();
    expect(() => evaluate("1 + 2)", {})).toThrow();
  });
});

describe("instantiate", () => {
  const spec = {
    params: { preis: { min: 40, max: 120, step: 5 }, vk: { min: 15, max: 35, step: 1 } },
    formula: "preis - vk",
  };

  it("deterministisch pro Seed, Werte im Raster", () => {
    const a = instantiate(spec, "s1:B4-003");
    expect(instantiate(spec, "s1:B4-003")).toEqual(a);
    expect(a.values.preis % 5).toBe(0);
    expect(a.values.preis).toBeGreaterThanOrEqual(40);
    expect(a.values.preis).toBeLessThanOrEqual(120);
    expect(a.answer).toBe(a.values.preis - a.values.vk);
  });

  it("Dezimalschritte ohne Rundungsmüll", () => {
    for (let i = 0; i < 50; i++) {
      const { values } = instantiate({ params: { x: { min: 0.5, max: 3, step: 0.1 } }, formula: "x" }, `s${i}`);
      expect(String(values.x).length).toBeLessThanOrEqual(3);
    }
  });

  it("Bedingungen und abgeleitete Werte", () => {
    for (let i = 0; i < 50; i++) {
      const r = instantiate(
        {
          params: { x1: { min: -5, max: 5, step: 1 }, x2: { min: -5, max: 5, step: 1 } },
          derived: { p: "-(x1 + x2)", q: "x1 * x2" },
          constraints: ["x1 < x2"],
          formula: "x2",
        },
        `c${i}`,
      );
      expect(r.values.x1).toBeLessThan(r.values.x2);
      expect(r.values.q).toBe(r.values.x1 * r.values.x2);
    }
  });

  it("unerfüllbare Bedingung wirft", () => {
    expect(() => instantiate({ params: { x: { min: 1, max: 2, step: 1 } }, constraints: ["x > 5"], formula: "x" }, "z")).toThrow();
  });
});

describe("Zahlen deutsch", () => {
  it("formatiert mit Komma", () => {
    expect(formatNumberDe(3.5)).toBe("3,5");
    expect(formatNumberDe(12.566370614, 2)).toBe("12,57");
    expect(formatNumberDe(1250)).toBe("1.250");
    expect(formatNumberDe(-2.5)).toBe("−2,5");
    expect(formatNumberDe(25000)).toBe("25.000");
    expect(fillTemplate("Preis {{preis}} €, Rest {{x}}", { preis: 49.9 })).toBe("Preis 49,9 €, Rest {{x}}");
  });

  it("liest Komma, Punkt, Tausenderpunkte, Euro", () => {
    expect(parseNumberDe("3,5")).toBe(3.5);
    expect(parseNumberDe("3.5")).toBe(3.5);
    expect(parseNumberDe("1.250,50 €")).toBe(1250.5);
    expect(parseNumberDe("12.000")).toBe(12000);
    expect(parseNumberDe("-0,25")).toBe(-0.25);
    expect(parseNumberDe("−3")).toBe(-3);
    expect(parseNumberDe("0.125")).toBe(0.125);
    expect(parseNumberDe("abc")).toBeNull();
    expect(parseNumberDe("")).toBeNull();
  });
});

describe("shuffle", () => {
  it("deterministisch und vollständig", () => {
    const a = shuffle([1, 2, 3, 4, 5], "x");
    expect(shuffle([1, 2, 3, 4, 5], "x")).toEqual(a);
    expect([...a].sort()).toEqual([1, 2, 3, 4, 5]);
  });
});
