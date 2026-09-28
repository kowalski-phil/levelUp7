import { sendReminders } from "@/lib/data/reminders";
import { berlinHour, isReminderSlot, REMINDER_HOUR } from "@/lib/engine/reminder";

// Aufruf durch Vercel Cron (vercel.json). Pro Slot zwei Einträge in UTC, einer für Sommer-, einer für Winterzeit:
// Hier geht nur der durch, der in Berlin gerade die richtige Stunde trifft.
// Vercel behält pro Pfad nur einen Cron-Eintrag, deshalb hängt an jedem Pfad die UTC-Stunde: /api/reminder/first-utc14.
// Test von Hand: GET /api/reminder/first?force=1 mit "Authorization: Bearer <CRON_SECRET>".
export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: RouteContext<"/api/reminder/[slot]">) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const slot = (await ctx.params).slot.split("-")[0];
  if (!isReminderSlot(slot)) return new Response("Not found", { status: 404 });

  const force = new URL(req.url).searchParams.get("force") === "1";
  const now = new Date();
  if (!force && berlinHour(now) !== REMINDER_HOUR[slot]) {
    return Response.json({ slot, skipped: `Berlin ${berlinHour(now)} Uhr, Erinnerung erst um ${REMINDER_HOUR[slot]} Uhr` });
  }
  return Response.json(await sendReminders(slot, now, force));
}
