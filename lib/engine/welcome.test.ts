import { describe, expect, it } from "vitest";
import { welcomeDue } from "./welcome";

describe("welcomeDue", () => {
  it("zeigt den Screen, solange nicht abgeschaltet und heute noch nicht gesehen", () => {
    expect(welcomeDue(null, undefined, "2026-09-28")).toBe(true);
    expect(welcomeDue(null, "2026-09-27", "2026-09-28")).toBe(true);
  });

  it("heute schon weggeklickt: nicht noch einmal", () => {
    expect(welcomeDue(null, "2026-09-28", "2026-09-28")).toBe(false);
  });

  it("mit 'Nicht mehr anzeigen' nie", () => {
    expect(welcomeDue("2026-09-28T18:00:00Z", undefined, "2026-10-05")).toBe(false);
  });
});
