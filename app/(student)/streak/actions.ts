"use server";

import { revalidatePath } from "next/cache";
import { requireStudent } from "@/lib/data/queries";
import { loadStreakState, saveStreak } from "@/lib/data/streak";
import { todayInBerlin } from "@/lib/engine/dates";
import { giveUp, removeJoker, rescue, setJoker } from "@/lib/engine/streak";
import { createAdminClient } from "@/lib/supabase/server";

// Joker und Streak schreibt nur der Server mit Service Role (RLS lässt Schüler dort nur lesen).
// Erst den Joker-Tag schreiben, dann den Vorrat: ein Doppel-Tap scheitert am Primärschlüssel und zieht nichts doppelt ab.

function refresh() {
  revalidatePath("/");
  revalidatePath("/streak");
}

/** Streak-Seite: Joker für einen Tag setzen oder zurücknehmen. */
export async function toggleJoker(formData: FormData): Promise<void> {
  const date = String(formData.get("date") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
  const v = await requireStudent();
  const admin = createAdminClient();
  const today = todayInBerlin();
  const { stored, jokerDays } = await loadStreakState(admin, v.userId);

  if (jokerDays.includes(date)) {
    const next = removeJoker(stored, jokerDays, date, today);
    if (!next) return;
    const { data, error } = await admin.from("joker_days").delete().eq("student_id", v.userId).eq("date", date).select("date");
    if (error) throw new Error(`Joker zurücknehmen: ${error.message}`);
    if (data?.length) await saveStreak(admin, v.userId, next);
  } else {
    const next = setJoker(stored, jokerDays, date, today);
    if (!next) return;
    const { error } = await admin.from("joker_days").insert({ student_id: v.userId, date });
    if (!error) await saveStreak(admin, v.userId, next);
  }
  refresh();
}

/** Verpasste Tage mit Jokern abdecken, der Streak läuft weiter. */
export async function rescueStreak(): Promise<void> {
  const v = await requireStudent();
  const admin = createAdminClient();
  const { stored, jokerDays } = await loadStreakState(admin, v.userId);
  const r = rescue(stored, jokerDays, todayInBerlin());
  if (!r) return;
  const { error } = await admin.from("joker_days").insert(r.days.map((date) => ({ student_id: v.userId, date })));
  if (!error) await saveStreak(admin, v.userId, r.state);
  refresh();
}

/** Keine Joker einsetzen: Streak auf 0, Joker bleiben im Vorrat. */
export async function giveUpStreak(): Promise<void> {
  const v = await requireStudent();
  const admin = createAdminClient();
  const { stored, jokerDays } = await loadStreakState(admin, v.userId);
  const next = giveUp(stored, jokerDays, todayInBerlin());
  if (next) await saveStreak(admin, v.userId, next);
  refresh();
}
