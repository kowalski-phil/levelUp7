import { Flame } from "lucide-react";
import { LogoutButton } from "@/components/logout-button";
import { examStats, loadExams } from "@/lib/data/exams";
import { requireParent } from "@/lib/data/queries";
import { addDays, todayInBerlin } from "@/lib/engine/dates";
import { daysUntil } from "@/lib/engine/focus";
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

  const today = todayInBerlin();
  const [streakRes, ledgerRes, sessionsRes, totalsRes, snoozeRes, catalog, allExams] = await Promise.all([
    v.supabase.from("streaks").select("*").eq("student_id", studentId).maybeSingle<StreakRow>(),
    v.supabase.from("rewards_ledger").select("*").eq("student_id", studentId),
    v.supabase
      .from("sessions")
      .select("id, date, kind, correct, total, mistakes, retries, duration_sec, finished_at")
      .eq("student_id", studentId)
      .in("kind", ["daily", "focus"])
      .order("date", { ascending: false })
      .limit(14),
    // Summen seit Start über alle Runden (Tag, Fokus, Bonus).
    v.supabase.from("sessions").select("total, mistakes, duration_sec").eq("student_id", studentId),
    v.supabase.from("skill_snooze").select("skill_id, until, created_at").eq("student_id", studentId).order("created_at", { ascending: false }),
    loadCatalog(v.supabase),
    loadExams(v, studentId),
  ]);
  // Schulaufgaben: kommende und die der letzten 60 Tage, neueste zuerst.
  const exams = allExams.filter((e) => e.examDate >= addDays(today, -60)).reverse();
  const stats = await examStats(v, exams.map((e) => e.id), studentId);
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
    today,
  );
  const money = balance(
    ((ledgerRes.data ?? []) as LedgerRow[]).map((l) => ({ type: l.type, label: l.label, amountEur: Number(l.amount_eur), paidAt: l.paid_at })),
  );
  const sessions = (sessionsRes.data ?? []) as Pick<
    SessionRow,
    "id" | "date" | "kind" | "correct" | "total" | "mistakes" | "retries" | "duration_sec" | "finished_at"
  >[];
  const totals = ((totalsRes.data ?? []) as Pick<SessionRow, "total" | "mistakes" | "duration_sec">[]).reduce(
    (t, x) => ({ items: t.items + x.total, mistakes: t.mistakes + x.mistakes, minutes: t.minutes + (x.duration_sec ?? 0) / 60 }),
    { items: 0, mistakes: 0, minutes: 0 },
  );

  return (
    <div className="flex flex-col gap-6 pt-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Überblick</h1>
        <LogoutButton className="-mr-2" />
      </header>
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
      <div className="grid grid-cols-3 gap-3 rounded-2xl bg-card p-4 text-center tabular-nums">
        <div>
          <p className="text-2xl font-bold">{totals.items}</p>
          <p className="text-xs text-muted-foreground">Aufgaben gesamt</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-red-400">{totals.mistakes}</p>
          <p className="text-xs text-muted-foreground">
            Fehler{totals.items ? ` (${Math.round((totals.mistakes / totals.items) * 100)} %)` : ""}
          </p>
        </div>
        <div>
          <p className="text-2xl font-bold">{Math.round(totals.minutes)}</p>
          <p className="text-xs text-muted-foreground">Minuten</p>
        </div>
      </div>
      <section>
        <h2 className="mb-1 font-semibold">Letzte Tage</h2>
        <p className="mb-2 text-sm text-muted-foreground">
          Fehler = beim ersten Versuch falsch. Falsche Aufgaben muss Felix am Ende der Runde nochmal lösen, das sind die Wiederholungen.
        </p>
        <ul className="divide-y divide-border rounded-2xl bg-card">
          {sessions.length === 0 ? <li className="p-4 text-muted-foreground">Noch keine Sessions.</li> : null}
          {sessions.map((x) => (
            <li key={x.id} className="flex justify-between gap-3 p-4 tabular-nums">
              <span>
                {new Date(`${x.date}T12:00:00`).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" })}
                {x.kind === "focus" ? <span className="text-muted-foreground"> · Fokus</span> : null}
              </span>
              <span className="text-right">
                <span className="block">
                  {x.total} Aufgaben · <span className={x.mistakes ? "text-red-400" : undefined}>{x.mistakes} Fehler</span>
                </span>
                <span className="block text-xs text-muted-foreground">
                  {x.finished_at ? `${Math.round((x.duration_sec ?? 0) / 60)} Min` : "nicht abgeschlossen"}
                  {x.retries ? ` · ${x.retries}× wiederholt` : ""}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="mb-2 font-semibold">Schulaufgaben</h2>
        <ul className="divide-y divide-border rounded-2xl bg-card">
          {exams.length === 0 ? <li className="p-4 text-muted-foreground">Felix hat keine Schulaufgabe eingetragen.</li> : null}
          {exams.map((e) => {
            const st = stats.get(e.id);
            const d = daysUntil(e, today);
            const when = d < 0 ? "vorbei" : d === 0 ? "heute" : d === 1 ? "morgen" : `in ${d} Tagen`;
            return (
              <li key={e.id} className="p-4">
                <p>
                  <span className="font-semibold" style={{ color: e.subjectColor }}>
                    {e.subjectName}
                  </span>{" "}
                  · {e.number}. Schulaufgabe · {fmt(`${e.examDate}T12:00:00`)} ({when})
                </p>
                <p className="text-sm text-muted-foreground tabular-nums">
                  {st?.sessions
                    ? `${st.sessions} Fokus-${st.sessions === 1 ? "Runde" : "Runden"} · ${Math.round((st.correct / Math.max(st.total, 1)) * 100)} % richtig · zuletzt ${fmt(`${st.lastDate}T12:00:00`)}`
                    : "Noch keine Fokus-Runde"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Themen: {e.skillTitles.join(", ")}</p>
              </li>
            );
          })}
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
