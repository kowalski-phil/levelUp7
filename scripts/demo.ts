// Demo-Konten für Videos, Vorführungen und Tests: eigener Schüler + eigener Elternteil in einer eigenen Familie.
// Das echte Konto (SEED_*), seine Familie und Daten werden nie beschrieben: Das Skript bricht ab, sobald eine
// Demo-ID mit dem echten Schüler- oder Eltern-Konto übereinstimmt.
// Gleiche Datei in LevelUp10 und LevelUp7, deshalb keine app-eigenen Werte (Schuljahr kommt aus der echten Familie).
//
//   npm run demo                 Demo-Konten anlegen (idempotent)
//   npm run demo -- reset        Lernstand des Demo-Schülers löschen (für eine neue Aufnahme)
//   npm run demo -- verpasst 2   Demo-Streak auf 6, die letzten 2 Tage verpasst (zeigt "Joker einsetzen?")
//   npm run demo -- check        Nur lesen: Kennzahlen des echten Schülers ausgeben (Vorher/Nachher-Vergleich)
import { randomBytes } from "node:crypto";
import { appendFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const DEMO_STUDENT_EMAIL = "demo.schueler@example.com";
const DEMO_PARENT_EMAIL = "demo.eltern@example.com";
const DEMO_STUDENT_NAME = "Max";
const DEMO_PARENT_NAME = "Demo-Eltern";

/** Tabellen mit Lernstand pro Schüler. sessions zuletzt (answers hängen per Cascade daran, exams per set null). */
const STUDENT_TABLES = ["answers", "item_state", "skill_snooze", "rewards_ledger", "push_subscriptions", "sessions", "exams", "joker_days", "streaks"];

function env(name: string): string {
  const v = process.env[name]?.trim() ?? "";
  if (!v) {
    console.error(`Fehlt in .env.local: ${name}`);
    process.exit(1);
  }
  return v;
}

const db = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SECRET_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function findUser(email: string) {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`listUsers: ${error.message}`);
    const hit = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (hit) return hit;
    if (data.users.length < 200) return null;
  }
  return null;
}

/** IDs der echten Konten (aus SEED_*). Alles, was das Demo-Skript schreibt, muss davon verschieden sein. */
async function realIds(): Promise<Set<string>> {
  const ids = new Set<string>();
  for (const email of [env("SEED_STUDENT_EMAIL"), env("SEED_PARENT_EMAIL")]) {
    if ([DEMO_STUDENT_EMAIL, DEMO_PARENT_EMAIL].includes(email.toLowerCase())) throw new Error("Demo-E-Mail = echte E-Mail, Abbruch.");
    const u = await findUser(email);
    if (u) ids.add(u.id);
  }
  return ids;
}

function guard(id: string, real: Set<string>) {
  if (real.has(id)) throw new Error(`Sicherheitssperre: ${id} ist ein echtes Konto. Abbruch, nichts geschrieben.`);
}

type Family = { id: string; school_year_start: string; exam_date: string };

async function realFamily(): Promise<Family> {
  const student = await findUser(env("SEED_STUDENT_EMAIL"));
  if (!student) throw new Error("Echter Schüler nicht gefunden (erst npm run seed).");
  const { data } = await db.from("families").select("id, school_year_start, exam_date").eq("student_id", student.id).maybeSingle();
  if (!data) throw new Error("Familie des echten Schülers nicht gefunden (erst npm run seed).");
  return data as Family;
}

async function ensureDemoUser(email: string, real: Set<string>): Promise<{ id: string; password: string | null }> {
  const existing = await findUser(email);
  if (existing) {
    guard(existing.id, real);
    return { id: existing.id, password: null };
  }
  const password = randomBytes(9).toString("base64url");
  const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw new Error(`Account anlegen (${email}): ${error?.message}`);
  guard(data.user.id, real);
  return { id: data.user.id, password };
}

async function create() {
  const real = await realIds();
  const realFam = await realFamily();
  const student = await ensureDemoUser(DEMO_STUDENT_EMAIL, real);
  const parent = await ensureDemoUser(DEMO_PARENT_EMAIL, real);

  const { data: found } = await db.from("families").select("id").eq("student_id", student.id).maybeSingle();
  let familyId = (found as { id: string } | null)?.id;
  if (!familyId) {
    const { data, error } = await db
      .from("families")
      .insert({ student_id: student.id, parent_id: parent.id, school_year_start: realFam.school_year_start, exam_date: realFam.exam_date })
      .select("id")
      .single();
    if (error) throw new Error(`Familie anlegen: ${error.message}`);
    familyId = (data as { id: string }).id;
  }
  if (familyId === realFam.id) throw new Error("Sicherheitssperre: Demo-Familie = echte Familie. Abbruch.");

  const profiles = [
    { id: student.id, role: "student", family_id: familyId, display_name: DEMO_STUDENT_NAME },
    { id: parent.id, role: "parent", family_id: familyId, display_name: DEMO_PARENT_NAME },
  ];
  let r = await db.from("profiles").upsert(profiles);
  if (r.error) throw new Error(`profiles: ${r.error.message}`);
  r = await db.from("streaks").upsert({ student_id: student.id }, { onConflict: "student_id", ignoreDuplicates: true });
  if (r.error) throw new Error(`streaks: ${r.error.message}`);
  r = await db.from("rewards_config").upsert({ family_id: familyId }, { onConflict: "family_id", ignoreDuplicates: true });
  if (r.error) throw new Error(`rewards_config: ${r.error.message}`);

  if (student.password || parent.password) {
    const lines = ["", "# Demo-Konten (npm run demo), nur für Videos/Vorführungen"];
    if (student.password) lines.push(`DEMO_STUDENT_EMAIL=${DEMO_STUDENT_EMAIL}`, `DEMO_STUDENT_PASSWORD=${student.password}`);
    if (parent.password) lines.push(`DEMO_PARENT_EMAIL=${DEMO_PARENT_EMAIL}`, `DEMO_PARENT_PASSWORD=${parent.password}`);
    appendFileSync(".env.local", lines.join("\n") + "\n");
    console.log("Neue Passwörter stehen in .env.local (DEMO_*).");
  }
  console.log(`Demo angelegt: Schüler ${DEMO_STUDENT_EMAIL}, Eltern ${DEMO_PARENT_EMAIL}, Familie ${familyId}.`);
}

async function reset() {
  const real = await realIds();
  const student = await findUser(DEMO_STUDENT_EMAIL);
  if (!student) throw new Error("Kein Demo-Schüler vorhanden (erst npm run demo).");
  guard(student.id, real);
  for (const table of STUDENT_TABLES) {
    const { error } = await db.from(table).delete().eq("student_id", student.id);
    if (error) throw new Error(`${table} leeren: ${error.message}`);
  }
  await db.from("streaks").insert({ student_id: student.id });
  await db.from("profiles").update({ onboarded_at: null }).eq("id", student.id);
  console.log("Demo-Schüler zurückgesetzt (Lernstand, Streak, Belohnungen, Schulaufgaben).");
}

async function check() {
  const student = await findUser(env("SEED_STUDENT_EMAIL"));
  if (!student) throw new Error("Echter Schüler nicht gefunden.");
  const out: Record<string, unknown> = {};
  const { data: streak } = await db.from("streaks").select("current, longest, jokers, last_completed_date").eq("student_id", student.id).maybeSingle();
  out.streak = streak;
  for (const table of ["sessions", "answers", "item_state", "rewards_ledger", "skill_snooze", "exams", "push_subscriptions"]) {
    const { count } = await db.from(table).select("*", { count: "exact", head: true }).eq("student_id", student.id);
    out[table] = count;
  }
  const { data: ledger } = await db.from("rewards_ledger").select("amount_eur, paid_at").eq("student_id", student.id);
  out.ledger_sum_eur = ((ledger ?? []) as { amount_eur: number }[]).reduce((s, l) => s + Number(l.amount_eur), 0);
  const { data: last } = await db.from("sessions").select("date, kind, finished_at").eq("student_id", student.id).order("started_at", { ascending: false }).limit(1);
  out.last_session = last?.[0] ?? null;
  console.log(JSON.stringify(out, null, 2));
}

/** Heute in Berlin plus `delta` Tage als YYYY-MM-DD. */
function berlinDay(delta: number): string {
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
  const d = new Date(`${today}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/** Streak 6, die letzten n Tage verpasst, 2 Joker im Vorrat: Die Startseite fragt "Joker einsetzen?". */
async function verpasst() {
  const n = Number(process.argv[3] ?? "2");
  if (!Number.isInteger(n) || n < 1 || n > 2) throw new Error("Anzahl verpasster Tage: 1 oder 2 (mehr als 2 Joker gibt es zu Beginn nicht).");
  const real = await realIds();
  const student = await findUser(DEMO_STUDENT_EMAIL);
  if (!student) throw new Error("Kein Demo-Schüler vorhanden (erst npm run demo).");
  guard(student.id, real);
  let r = await db.from("joker_days").delete().eq("student_id", student.id);
  if (r.error) throw new Error(`joker_days leeren: ${r.error.message}`);
  r = await db.from("streaks").upsert({ student_id: student.id, current: 6, longest: 6, jokers: 2, last_completed_date: berlinDay(-(n + 1)) });
  if (r.error) throw new Error(`streaks: ${r.error.message}`);
  console.log(`Demo-Streak 6, zuletzt gelernt ${berlinDay(-(n + 1))}, ${n} Tag(e) verpasst, 2 Joker.`);
}

const cmd = process.argv[2] ?? "create";
const run = cmd === "reset" ? reset : cmd === "check" ? check : cmd === "verpasst" ? verpasst : create;
run().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
