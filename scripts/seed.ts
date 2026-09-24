// Idempotenter Seed: Inhalte (Upsert nach code), Kalender, Accounts, Familie, Startwerte.
// Aufruf: npm run seed   (liest .env.local)
import { createClient } from "@supabase/supabase-js";
import { loadContentFiles, loadStructure } from "../lib/content/load";
import { validateContent } from "../lib/content/validate";
import { buildSchedule } from "../lib/engine/calendar";
import { DEFAULT_REWARDS } from "../lib/engine/rewards";

const SCHOOL_YEAR_START = "2026-09-16";
const EXAM_DATE = "2027-06-23"; // erste Prüfung (Deutsch)

function env(name: string, required = true): string {
  const v = process.env[name]?.trim() ?? "";
  if (required && !v) {
    console.error(`Fehlt in .env.local: ${name}`);
    process.exit(1);
  }
  return v;
}

const url = env("NEXT_PUBLIC_SUPABASE_URL");
const serviceKey = env("SUPABASE_SECRET_KEY");
const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

function must<T>(res: { data: T; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data;
}

async function seedContent() {
  const root = process.cwd();
  const structure = loadStructure(root);
  const files = loadContentFiles(root);
  const issues = validateContent(structure, files).filter((i) => i.level === "error");
  if (issues.length) {
    for (const i of issues) console.error(`FEHLER ${i.code}: ${i.msg}`);
    throw new Error("Inhalte haben Fehler, Seed abgebrochen (npm run content:check).");
  }

  const subjects = must(
    await db.from("subjects").upsert(structure.subjects, { onConflict: "code" }).select("id, code"),
    "subjects",
  ) as { id: string; code: string }[];
  const subjectId = new Map(subjects.map((s) => [s.code, s.id]));

  const orderBySubject = new Map<string, number>();
  const unitRows = structure.units.map((u) => {
    const idx = orderBySubject.get(u.subject) ?? 0;
    orderBySubject.set(u.subject, idx + 1);
    return { code: u.code, subject_id: subjectId.get(u.subject)!, title: u.title, hours: u.hours, order_index: idx };
  });
  const units = must(await db.from("units").upsert(unitRows, { onConflict: "code" }).select("id, code"), "units") as {
    id: string;
    code: string;
  }[];
  const unitId = new Map(units.map((u) => [u.code, u.id]));

  const skillRows = structure.units.flatMap((u) =>
    u.skills.map((s, i) => ({ code: s.code, unit_id: unitId.get(u.code)!, title: s.title, description: s.description, order_index: i })),
  );
  const skills = must(await db.from("skills").upsert(skillRows, { onConflict: "code" }).select("id, code"), "skills") as {
    id: string;
    code: string;
  }[];
  const skillId = new Map(skills.map((s) => [s.code, s.id]));

  const itemRows = files.flatMap((f) =>
    f.items.map((it) => ({
      code: it.code,
      skill_id: skillId.get(it.skill_code)!,
      type: it.type,
      difficulty: it.difficulty,
      stem: it.stem,
      payload: it.payload,
      solution: it.solution ?? null,
      explanation: it.explanation,
      hint: it.hint?.trim() || null,
      active: true,
    })),
  );
  for (let i = 0; i < itemRows.length; i += 200) {
    must(await db.from("items").upsert(itemRows.slice(i, i + 200), { onConflict: "code" }), "items");
  }

  // Items, die aus den JSON-Dateien verschwunden sind, deaktivieren statt löschen (Antworten bleiben erhalten).
  const codes = new Set(itemRows.map((r) => r.code));
  const existing: string[] = [];
  for (let from = 0; ; from += 1000) {
    const page = must(await db.from("items").select("code").eq("active", true).order("code").range(from, from + 999), "items lesen") as {
      code: string;
    }[];
    existing.push(...page.map((r) => r.code));
    if (page.length < 1000) break;
  }
  const stale = existing.filter((c) => !codes.has(c));
  if (stale.length) must(await db.from("items").update({ active: false }).in("code", stale), "items deaktivieren");

  const schedule = buildSchedule(
    structure.units.map((u) => ({ code: u.code, subject: u.subject, hours: u.hours, orderIndex: unitRows.find((r) => r.code === u.code)!.order_index })),
    SCHOOL_YEAR_START,
    EXAM_DATE,
  );
  must(
    await db.from("unit_schedule").upsert(
      schedule.map((e) => ({ unit_id: unitId.get(e.unitCode)!, subject_id: subjectId.get(e.subject)!, week_from: e.weekFrom, week_to: e.weekTo })),
      { onConflict: "unit_id" },
    ),
    "unit_schedule",
  );

  console.log(`Inhalte: ${subjects.length} Fächer, ${units.length} Gebiete, ${skills.length} Skills, ${itemRows.length} Aufgaben (${stale.length} deaktiviert).`);
}

async function findUserByEmail(email: string) {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`listUsers: ${error.message}`);
    const hit = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (hit) return hit;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function ensureUser(email: string, password: string): Promise<string> {
  const existing = await findUserByEmail(email);
  if (existing) {
    if (password) {
      const { error } = await db.auth.admin.updateUserById(existing.id, { password });
      if (error) throw new Error(`Passwort setzen (${email}): ${error.message}`);
    }
    return existing.id;
  }
  if (!password) throw new Error(`Neuer Account ${email} braucht ein Passwort in .env.local`);
  const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw new Error(`Account anlegen (${email}): ${error?.message}`);
  return data.user.id;
}

async function seedAccounts() {
  const studentEmail = env("SEED_STUDENT_EMAIL");
  const parentEmail = env("SEED_PARENT_EMAIL");
  const studentId = await ensureUser(studentEmail, env("SEED_STUDENT_PASSWORD", false));
  const parentId = await ensureUser(parentEmail, env("SEED_PARENT_PASSWORD", false));

  const found = must(await db.from("families").select("id").eq("student_id", studentId).maybeSingle(), "families") as { id: string } | null;
  let familyId = found?.id;
  if (!familyId) {
    const created = must(
      await db
        .from("families")
        .insert({ student_id: studentId, parent_id: parentId, school_year_start: SCHOOL_YEAR_START, exam_date: EXAM_DATE })
        .select("id")
        .single(),
      "Familie anlegen",
    ) as { id: string };
    familyId = created.id;
  } else {
    must(await db.from("families").update({ parent_id: parentId }).eq("id", familyId), "Familie aktualisieren");
  }

  must(
    await db.from("profiles").upsert([
      { id: studentId, role: "student", family_id: familyId, display_name: env("SEED_STUDENT_NAME", false) || "Felix" },
      { id: parentId, role: "parent", family_id: familyId, display_name: env("SEED_PARENT_NAME", false) || "Phil" },
    ]),
    "profiles",
  );
  must(await db.from("streaks").upsert({ student_id: studentId }, { onConflict: "student_id", ignoreDuplicates: true }), "streaks");
  must(
    await db.from("rewards_config").upsert(
      {
        family_id: familyId,
        weekly_streak_bonus_eur: DEFAULT_REWARDS.weeklyStreakBonusEur,
        milestones: DEFAULT_REWARDS.milestones,
        exam_day_eur: DEFAULT_REWARDS.examDayEur,
      },
      { onConflict: "family_id", ignoreDuplicates: true },
    ),
    "rewards_config",
  );
  console.log(`Accounts: Schüler ${studentEmail}, Eltern ${parentEmail}, Familie ${familyId}.`);
}

async function main() {
  await seedContent();
  await seedAccounts();
  console.log("Seed fertig.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
