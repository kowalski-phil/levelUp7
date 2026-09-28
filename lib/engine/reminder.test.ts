import { describe, expect, it } from "vitest";
import { berlinHour, isReminderSlot, reminderMessage } from "./reminder";
import type { StreakState } from "./streak";

const st = (current: number, last: string | null, jokers = 0): StreakState => ({ current, longest: current, jokers, lastCompletedDate: last });

describe("reminder", () => {
  it("keine Erinnerung, wenn heute schon gelernt", () => {
    expect(reminderMessage("first", st(5, "2026-10-01"), "2026-10-01")).toBeNull();
    expect(reminderMessage("second", st(5, "2026-10-01"), "2026-10-01")).toBeNull();
  });

  it("erste Erinnerung mit laufendem Streak", () => {
    expect(reminderMessage("first", st(5, "2026-09-30"), "2026-10-01")).toEqual({
      title: "Deine 15 Minuten für heute",
      body: "Dein Streak: 5 Tage. Mach heute den 6. Tag draus.",
      badge: 5,
    });
  });

  it("zweite Erinnerung nennt den Streak nach dem Lernen, Einzahl bei 1", () => {
    expect(reminderMessage("second", st(5, "2026-09-30"), "2026-10-01")?.body).toBe("15 Minuten, dann steht dein Streak bei 6 Tagen.");
    expect(reminderMessage("second", st(1, "2026-09-30"), "2026-10-01")?.body).toBe("15 Minuten, dann steht dein Streak bei 2 Tagen.");
    expect(reminderMessage("first", st(1, "2026-09-30"), "2026-10-01")?.body).toBe("Dein Streak: 1 Tag. Mach heute den 2. Tag draus.");
  });

  it("ohne Streak: Tag 1", () => {
    expect(reminderMessage("first", st(0, null), "2026-10-01")?.body).toBe("Heute ist Tag 1. Leg los.");
    expect(reminderMessage("second", st(0, null), "2026-10-01")?.body).toBe("15 Minuten reichen für Tag 1.");
  });

  it("verpasster Tag ohne Joker: Streak wie in der App auf 0", () => {
    const m = reminderMessage("first", st(8, "2026-09-28"), "2026-10-01");
    expect(m?.badge).toBe(0);
    expect(m?.body).toBe("Heute ist Tag 1. Leg los.");
  });

  it("verpasster Tag mit Joker: Streak bleibt", () => {
    expect(reminderMessage("second", st(8, "2026-09-29", 1), "2026-10-01")?.badge).toBe(8);
  });

  it("Berliner Stunde über Sommer- und Winterzeit", () => {
    expect(berlinHour(new Date("2026-10-01T14:30:00Z"))).toBe(16); // Sommerzeit, UTC+2
    expect(berlinHour(new Date("2026-11-02T15:10:00Z"))).toBe(16); // Winterzeit, UTC+1
    expect(berlinHour(new Date("2026-11-02T14:59:00Z"))).toBe(15);
    expect(berlinHour(new Date("2026-10-01T22:05:00Z"))).toBe(0);
  });

  it("nur first und second sind gültige Slots", () => {
    expect(isReminderSlot("first")).toBe(true);
    expect(isReminderSlot("second")).toBe(true);
    expect(isReminderSlot("third")).toBe(false);
  });
});
