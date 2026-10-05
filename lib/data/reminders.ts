import "server-only";
import webpush from "web-push";
import { todayInBerlin } from "@/lib/engine/dates";
import { reminderMessage, type ReminderSlot } from "@/lib/engine/reminder";
import { initialStreak, type StreakState } from "@/lib/engine/streak";
import { createAdminClient } from "@/lib/supabase/server";
import type { StreakRow } from "@/lib/supabase/types";

/** Kontakt für die Push-Dienste (Apple, Google). Muss eine https- oder mailto-Adresse sein. */
const VAPID_SUBJECT = "https://levelup7.vercel.app";
/** Kommt das Handy länger nicht ins Netz, verfällt die Erinnerung nach 3 Stunden. */
const TTL_SECONDS = 3 * 60 * 60;

export interface ReminderRun {
  today: string;
  slot: ReminderSlot;
  sent: number;
  alreadyLearned: number;
  alreadySent: number;
  removed: number;
  errors: number[];
}

interface SubscriptionRow {
  student_id: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/**
 * Schickt die Erinnerung an alle Geräte mit Push-Abo, außer heute wurde schon gelernt.
 * Vercel Cron kann einen Lauf doppelt auslösen: Pro Schüler und Slot wird das Sendedatum in den
 * app_metadata des Accounts vermerkt, ein zweiter Lauf am selben Tag schickt nichts (außer force).
 */
export async function sendReminders(slot: ReminderSlot, now: Date, force = false): Promise<ReminderRun> {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) throw new Error("VAPID-Schlüssel fehlen (.env.local bzw. Vercel-Env-Vars)");
  webpush.setVapidDetails(VAPID_SUBJECT, publicKey, privateKey);

  const db = createAdminClient();
  const today = todayInBerlin(now);
  const run: ReminderRun = { today, slot, sent: 0, alreadyLearned: 0, alreadySent: 0, removed: 0, errors: [] };

  const { data, error } = await db.from("push_subscriptions").select("student_id, endpoint, keys");
  if (error) throw new Error(`Push-Abos lesen: ${error.message}`);
  const byStudent = new Map<string, SubscriptionRow[]>();
  for (const s of (data ?? []) as SubscriptionRow[]) byStudent.set(s.student_id, [...(byStudent.get(s.student_id) ?? []), s]);

  for (const [studentId, subs] of byStudent) {
    const { data: userRes } = await db.auth.admin.getUserById(studentId);
    const meta = userRes.user?.app_metadata ?? {};
    const sentDates = (meta.reminders_sent ?? {}) as Partial<Record<ReminderSlot, string>>;
    if (!force && sentDates[slot] === today) {
      run.alreadySent++;
      continue;
    }

    const { data: row } = await db.from("streaks").select("*").eq("student_id", studentId).maybeSingle<StreakRow>();
    const stored: StreakState = row
      ? { current: row.current, longest: row.longest, jokers: row.jokers, lastCompletedDate: row.last_completed_date }
      : initialStreak();
    const message = reminderMessage(slot, stored, today);
    if (!message) {
      run.alreadyLearned++;
      continue;
    }

    let delivered = 0;
    for (const s of subs) {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, JSON.stringify(message), { TTL: TTL_SECONDS });
        delivered++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode ?? 0;
        // 404/410: Abo existiert nicht mehr (App gelöscht, Erlaubnis entzogen).
        if (status === 404 || status === 410) {
          await db.from("push_subscriptions").delete().eq("student_id", studentId).eq("endpoint", s.endpoint);
          run.removed++;
        } else {
          run.errors.push(status);
        }
      }
    }
    if (delivered > 0) {
      run.sent += delivered;
      await db.auth.admin.updateUserById(studentId, { app_metadata: { ...meta, reminders_sent: { ...sentDates, [slot]: today } } });
    }
  }
  return run;
}
