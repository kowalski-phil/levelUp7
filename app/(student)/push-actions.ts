"use server";

import { requireStudent } from "@/lib/data/queries";

export interface PushSubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/** Speichert das Push-Abo dieses Geräts. Schon vorhandene Abos (gleicher Endpoint) bleiben unverändert. */
export async function savePushSubscription(sub: PushSubscriptionInput): Promise<void> {
  const v = await requireStudent();
  if (!sub?.endpoint?.startsWith("https://") || !sub.keys?.p256dh || !sub.keys?.auth) return;
  const { error } = await v.supabase
    .from("push_subscriptions")
    .insert({ student_id: v.userId, endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } });
  // 23505: Abo existiert schon.
  if (error && error.code !== "23505") throw new Error(`Push-Abo speichern: ${error.message}`);
}
