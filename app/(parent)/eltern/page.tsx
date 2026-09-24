import { Flame } from "lucide-react";
import { requireParent } from "@/lib/data/queries";
import { todayInBerlin } from "@/lib/engine/dates";
import { balance } from "@/lib/engine/rewards";
import { displayStreak, initialStreak } from "@/lib/engine/streak";
import { formatNumberDe } from "@/lib/engine/template";
import { loadCatalog } from "@/lib/data/queries";
import type { LedgerRow, SessionRow, StreakRow } from "@/lib/supabase/types";

// Vorläufige Elternansicht (Tag 1). Das volle Dashboard mit Heatmap, Ampel und Belohnungs-Konfiguration kommt an Tag 2.
export default async function ElternPage() {
  const v = await requireParent();
  const studentId = v.family.student_id;
  if (!studentId) return <p className="pt-10 text-muted-foreground">Noch kein Schüler-Konto verknüpft.</p>;

  const [streakRes, ledgerRes, sessionsRes, snoozeRes, catalog] = await Promise.all([
    v.supabase.from("streaks").select("*").eq("student_id", studentId).maybeSingle<StreakRow>(),
    v.supabase.from("rewards_ledger").select("*").eq("student_id", studentId),
    v.supabase
      .from("sessions")
      .select("date, kind, correct, total, duration_sec, finished_at")
      .eq("student_id", studentId)
      .eq("kind", "daily")
      .order("date", { ascending: false })
      .limit(14),
    v.supabase.from("skill_snooze").select("skill_id, until, created_at").eq("student_id", studentId).order("created_at", { ascending: false }),
    loadCatalog(v.supabase),
  ]);
  const skillById = new Map(catalog.skills.map((sk) => [sk.id, sk]));
  const subjectName = new Map(catalog.subjects.map((x) => [x.code, x.name]));
  const snoozes = ((snoozeRes.data ?? []) as { skill_id: string; until: string; created_at: string }[]).flatMap((r) => {
    const sk = skillById.get(r.skill_id);
    return sk ? [{ ...r, title: `${subjectName.get(sk.subjectCode) ?? sk.subjectCode}: ${sk.title}` }] : [];
  });
  const fmt = (d: string) => new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
  const s = streakRes.data;
  const streak = displayStreak(
    s ? { current: s.current, longest: s.longest, jokers: s.jokers, lastCompletedDate: s.last_completed_date } : initialStreak(),
    todayInBerlin(),
  );
  const money = balance(
    ((ledgerRes.data ?? []) as LedgerRow[]).map((l) => ({ type: l.type, label: l.label, amountEur: Number(l.amount_eur), paidAt: l.paid_at })),
  );
  const sessions = (sessionsRes.data ?? []) as Pick<SessionRow, "date" | "correct" | "total" | "duration_sec" | "finished_at">[];

  return (
    <div className="flex flex-col gap-6 pt-4">
      <h1 className="text-2xl font-bold">Überblick</h1>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-card p-4">
          <p className="text-sm text-muted-foreground">Streak</p>
          <p className="flex items-center gap-1 text-3xl font-bold">
            <Flame className="size-7 text-orange-400" />
            {streak.current}
          </p>
          <p className="text-xs text-muted-foreground">Rekord {streak.longest} · Joker {streak.jokers}</p>
        </div>
        <div className="rounded-2xl bg-card p-4">
          <p className="text-sm text-muted-foreground">Belohnung offen</p>
          <p className="text-3xl font-bold text-green-400">{formatNumberDe(money.open, 2)} €</p>
          <p className="text-xs text-muted-foreground">verdient {formatNumberDe(money.earned, 2)} €</p>
        </div>
      </div>
      <section>
        <h2 className="mb-2 font-semibold">Letzte Tage</h2>
        <ul className="divide-y divide-border rounded-2xl bg-card">
          {sessions.length === 0 ? <li className="p-4 text-muted-foreground">Noch keine Sessions.</li> : null}
          {sessions.map((x) => (
            <li key={x.date} className="flex justify-between p-4 tabular-nums">
              <span>{new Date(`${x.date}T12:00:00`).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" })}</span>
              <span className="text-muted-foreground">
                {x.finished_at ? `${x.correct}/${x.total} · ${Math.round((x.duration_sec ?? 0) / 60)} Min` : `angefangen (${x.total})`}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="mb-1 font-semibold">&bdquo;Hatten wir noch nicht&ldquo;</h2>
        <p className="mb-2 text-sm text-muted-foreground">Themen, die Felix als noch nicht im Unterricht markiert hat. Sie ruhen 3 Wochen.</p>
        <ul className="divide-y divide-border rounded-2xl bg-card">
          {snoozes.length === 0 ? <li className="p-4 text-muted-foreground">Nichts markiert.</li> : null}
          {snoozes.map((x) => (
            <li key={x.skill_id} className="p-4">
              <p>{x.title}</p>
              <p className="text-xs text-muted-foreground">
                markiert am {fmt(x.created_at)} · ruht bis {fmt(`${x.until}T12:00:00`)}
              </p>
            </li>
          ))}
        </ul>
      </section>
      <p className="text-sm text-muted-foreground">Dashboard mit Fach-Ampel, schwächsten Skills und Belohnungs-Einstellungen folgt.</p>
    </div>
  );
}
