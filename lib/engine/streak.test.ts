import { describe, expect, it } from "vitest";
import { addDays } from "./dates";
import {
  completeDay,
  dayMarks,
  daysToNextJoker,
  displayStreak,
  giveUp,
  heldJokers,
  initialStreak,
  mondayOf,
  pendingRescue,
  plannableDays,
  removeJoker,
  rescue,
  setJoker,
  weekdayLabel,
  weekView,
  type StreakState,
} from "./streak";

const D0 = "2026-10-01";
const day = (n: number) => addDays(D0, n);

function runDays(days: number, start = D0, from: StreakState = initialStreak()) {
  let s = from;
  for (let i = 0; i < days; i++) s = completeDay(s, [], addDays(start, i)).state;
  return s;
}

describe("streak", () => {
  it("Start mit 2 Jokern", () => {
    expect(initialStreak()).toMatchObject({ current: 0, jokers: 2 });
  });

  it("zählt aufeinanderfolgende Tage", () => {
    expect(runDays(5)).toMatchObject({ current: 5, longest: 5, jokers: 2 });
  });

  it("zweimal am selben Tag zählt einmal", () => {
    const s = completeDay(initialStreak(), [], D0).state;
    const r = completeDay(s, [], D0);
    expect(r.counted).toBe(false);
    expect(r.state.current).toBe(1);
  });

  it("alle 14 Tage ein Joker, maximal 3", () => {
    expect(runDays(13).jokers).toBe(2);
    expect(runDays(14).jokers).toBe(3);
    expect(runDays(28).jokers).toBe(3);
    expect(completeDay(runDays(13), [], day(13)).jokerEarned).toBe(true);
    expect(completeDay(runDays(27), [], day(27)).jokerEarned).toBe(false);
  });

  it("gesetzte Joker zählen zum Maximum", () => {
    const s = { ...runDays(13), jokers: 1 };
    // 1 im Vorrat + 2 für später gesetzt = 3: am 14. Tag kein neuer
    expect(completeDay(s, [day(15), day(16)], day(13)).jokerEarned).toBe(false);
    expect(completeDay(s, [day(15)], day(13)).jokerEarned).toBe(true);
  });

  it("verpasster Tag ohne Entscheidung: der nächste geschaffte Tag beginnt neu", () => {
    const r = completeDay(runDays(5), [], day(6));
    expect(r.state).toMatchObject({ current: 1, longest: 5, jokers: 2 });
  });
});

describe("Joker vorab setzen", () => {
  it("setzen kostet einen Joker, der Tag hält den Streak", () => {
    const s = runDays(5); // letzter Tag D0+4
    const planned = setJoker(s, [], day(5), day(5));
    expect(planned?.jokers).toBe(1);
    expect(completeDay(planned!, [day(5)], day(6)).state).toMatchObject({ current: 6, jokers: 1 });
  });

  it("Wochenende mit zwei Jokern", () => {
    const s = runDays(5); // Mo bis Fr
    const sat = setJoker(s, [], day(5), day(4))!;
    const sun = setJoker(sat, [day(5)], day(6), day(4))!;
    expect(sun.jokers).toBe(0);
    expect(displayStreak(sun, [day(5), day(6)], day(7)).current).toBe(5);
    expect(completeDay(sun, [day(5), day(6)], day(7)).state.current).toBe(6);
  });

  it("geht nur für heute bis heute + 6, nicht doppelt, nicht ohne Joker", () => {
    const s = runDays(3);
    expect(plannableDays(day(2))).toHaveLength(7);
    expect(setJoker(s, [], day(1), day(2))).toBeNull(); // Vergangenheit
    expect(setJoker(s, [], day(9), day(2))).toBeNull(); // zu weit weg
    expect(setJoker(s, [], day(8), day(2))).not.toBeNull();
    expect(setJoker(s, [day(4)], day(4), day(2))).toBeNull();
    expect(setJoker({ ...s, jokers: 0 }, [], day(4), day(2))).toBeNull();
  });

  it("heute schon gelernt: kein Joker für heute", () => {
    const s = runDays(3); // letzter Tag D0+2
    expect(setJoker(s, [], day(2), day(2))).toBeNull();
    expect(setJoker(s, [], day(3), day(2))).not.toBeNull();
  });

  it("zurücknehmen bis zum Tag selbst, danach nicht mehr", () => {
    const s = { ...runDays(3), jokers: 1 };
    expect(removeJoker(s, [day(4)], day(4), day(3))?.jokers).toBe(2);
    expect(removeJoker(s, [day(4)], day(4), day(4))?.jokers).toBe(2);
    expect(removeJoker(s, [day(4)], day(4), day(5))).toBeNull();
    expect(removeJoker(s, [], day(4), day(3))).toBeNull();
  });

  it("am Joker-Tag doch gelernt: Joker kommt zurück", () => {
    const s = setJoker(runDays(3), [], day(3), day(3))!;
    const r = completeDay(s, [day(3)], day(3));
    expect(r.jokerRefunded).toBe(true);
    expect(r.state).toMatchObject({ current: 4, jokers: 2 });
  });

  it("gesetzte Joker zählen als gehalten", () => {
    const s = { ...runDays(3), jokers: 1 };
    expect(heldJokers(s, [day(1), day(3), day(4)], day(3))).toBe(3);
  });
});

describe("Joker nachträglich", () => {
  it("gestern verpasst: Rettung möglich, Streak steht bis zur Entscheidung", () => {
    const s = runDays(11); // letzter Tag D0+10
    expect(pendingRescue(s, [], day(12))).toEqual([day(11)]);
    expect(displayStreak(s, [], day(12)).current).toBe(11);
  });

  it("Joker einsetzen: Tage werden Joker-Tage, Streak läuft weiter", () => {
    const s = runDays(11);
    const r = rescue(s, [], day(13))!; // D0+11 und D0+12 verpasst
    expect(r.days).toEqual([day(11), day(12)]);
    expect(r.state.jokers).toBe(0);
    expect(pendingRescue(r.state, r.days, day(13))).toBeNull();
    expect(completeDay(r.state, r.days, day(13)).state.current).toBe(12);
  });

  it("nicht genug Joker: Streak ist weg, keine Frage", () => {
    const s = runDays(11);
    expect(pendingRescue(s, [], day(14))).toBeNull(); // 3 Tage verpasst, 2 Joker
    expect(rescue(s, [], day(14))).toBeNull();
    expect(displayStreak(s, [], day(14)).current).toBe(0);
  });

  it("vorab gesetzte Joker verringern die Rettungskosten", () => {
    const s = { ...runDays(11), jokers: 1 };
    // Fr verpasst, Sa Joker gesetzt, heute So
    expect(pendingRescue(s, [day(12)], day(13))).toEqual([day(11)]);
  });

  it("Nein, neu anfangen: Streak 0, Joker bleiben, keine Frage mehr", () => {
    const s = runDays(11);
    const g = giveUp(s, [], day(12))!;
    expect(g).toMatchObject({ current: 0, longest: 11, jokers: 2 });
    expect(pendingRescue(g, [], day(12))).toBeNull();
    expect(completeDay(g, [], day(12)).state.current).toBe(1);
    expect(giveUp(s, [], day(11))).toBeNull(); // nichts verpasst
  });

  it("ohne laufenden Streak gibt es nichts zu retten", () => {
    expect(pendingRescue(initialStreak(), [], D0)).toBeNull();
  });
});

describe("Tagesmarkierungen für die Wochenansicht", () => {
  it("geschaffte Tage sind done, Joker-Tage joker, Lücken leer", () => {
    const m = dayMarks([D0, day(1), day(4)], [day(2), day(6)], day(4));
    expect(m.get(D0)).toBe("done");
    expect(m.get(day(2))).toBe("joker");
    expect(m.get(day(3))).toBeUndefined();
    expect(m.get(day(6))).toBe("joker"); // gesetzt für später
  });

  it("geschafft schlägt Joker", () => {
    expect(dayMarks([D0], [D0], D0).get(D0)).toBe("done");
  });
});

describe("Wochenansicht", () => {
  it("Montag der Woche und Wochentag", () => {
    expect(mondayOf("2026-09-26")).toBe("2026-09-21"); // Samstag
    expect(mondayOf("2026-09-21")).toBe("2026-09-21"); // Montag
    expect(mondayOf("2026-09-27")).toBe("2026-09-21"); // Sonntag
    expect(weekdayLabel("2026-10-17")).toBe("Sa");
    expect(weekdayLabel("2026-10-19")).toBe("Mo");
  });

  it("Mo bis So mit Status", () => {
    // Samstag 26.09.: Mi geschafft, Do Joker, Fr verpasst, Sa offen, So Zukunft, Mo/Di vor dem ersten Tag
    const marks = new Map<string, "done" | "joker">([
      ["2026-09-23", "done"],
      ["2026-09-24", "joker"],
    ]);
    const w = weekView(marks, "2026-09-26");
    expect(w.map((d) => d.label).join(" ")).toBe("Mo Di Mi Do Fr Sa So");
    expect(w.map((d) => d.status)).toEqual(["before", "before", "done", "joker", "missed", "today", "future"]);
  });

  it("heute geschafft zeigt die Flamme, Joker für Sonntag das Schild", () => {
    const w = weekView(
      new Map<string, "done" | "joker">([
        ["2026-09-26", "done"],
        ["2026-09-27", "joker"],
      ]),
      "2026-09-26",
    );
    expect(w[5].status).toBe("done");
    expect(w[6].status).toBe("joker");
  });

  it("Tage bis zum nächsten Joker", () => {
    expect(daysToNextJoker({ current: 1, longest: 1, jokers: 0, lastCompletedDate: null })).toBe(13);
    expect(daysToNextJoker({ current: 14, longest: 14, jokers: 2, lastCompletedDate: null })).toBe(14);
    expect(daysToNextJoker({ current: 30, longest: 30, jokers: 3, lastCompletedDate: null })).toBeNull();
    expect(daysToNextJoker({ current: 30, longest: 30, jokers: 1, lastCompletedDate: null }, 3)).toBeNull();
  });
});
