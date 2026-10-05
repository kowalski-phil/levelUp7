# Fokus-Modus: gezielt auf eine Schulaufgabe lernen

Geplant mit Fable 5.1 am 2026-09-26, gebaut wird mit Opus 5.5. Entscheidungen hat Phil getroffen, sie stehen in Abschnitt 1 und werden nicht neu diskutiert.
Dieses Dokument ist vollständig: Datenmodell, Engine, Screens, Texte, Tests, Reihenfolge. Bei Widerspruch zu `PLAN.md` gilt dieses Dokument für den Fokus-Modus.

> **LevelUp7 (Paula), Stand 2026-10-05:** Übernommen aus LevelUp10, nur die Namen sind angepasst. Die Beispiele (BwR, Mathe, Lernbereiche B1, M1) stammen aus Felix' App. Bei Paula gilt sinngemäß: Englisch und Französisch laufen beide Unit für Unit (`ROTATING_SUBJECTS` ist leer), deshalb bekommen **beide** Fächer einen Themenvorschlag aus dem Kalender. Die Tagesrunde hat 8 Aufgaben (4 pro Fach) plus Vokabeln, in ihr kommen die 4 Aufgaben des Schulaufgaben-Fachs aus den Schulaufgaben-Themen. Die Fokus-Runde bleibt bei 12 Aufgaben (`FOCUS_COUNT`).

## 0. Worum es geht (Beispiel)

Heute ist der 26.09. Paula weiß, dass sie am 05.10. BwR schreibt. Sie tippt auf dem Home-Screen auf "Schulaufgabe eintragen", wählt BwR, den 05.10., und sieht die Lernbereiche von BwR als Liste. B1 ist schon angehakt, weil der Kalender sagt, dass B1 seit Schuljahresbeginn dran ist. Sie klappt B1 auf und hakt "Rückstellungen" ab, weil das im Unterricht noch nicht kam. Tippt "Los".

Ab jetzt steht auf dem Home-Screen ganz oben: "BwR-Schulaufgabe in 9 Tagen. Fokus starten (12 Aufgaben)". Diese 12 Aufgaben kommen nur aus den angehakten B1-Skills. Schafft sie die Fokus-Runde, ist der Streak-Tag gesichert, genau wie bei der normalen Tagessession. Die Tagessession gibt es weiterhin, sie ist jetzt der zweite Button. In der Tagessession kommen die 3 BwR-Aufgaben ebenfalls aus den Schulaufgaben-Themen, die 9 anderen laufen normal weiter.

Am 06.10. ist die Schulaufgabe vorbei, der Block verschwindet von selbst. Phil sieht im Eltern-Dashboard: "BwR, 05.10., 6 Fokus-Runden, 71 % richtig".

## 1. Entscheidungen (Phil, 2026-09-26)

| Frage | Entscheidung |
|---|---|
| Streak | Entweder-oder: Tagessession ODER Fokus-Session abgeschlossen = Streak-Tag. Zweite Session am selben Tag zählt nicht doppelt. |
| Themenauswahl | Lernbereiche als Liste, jeder aufklappbar auf seine Skills. Haken am Lernbereich = alle Skills. Einzelne Skills abwählbar. Wer in einem angehakten Lernbereich mehr als die Hälfte der Skills abwählt, bekommt einen Hinweis und muss bestätigen. |
| Tagessession | Färbt sich: die 3 Aufgaben des Prüfungsfachs kommen aus den Schulaufgaben-Themen. Die anderen 9 bleiben normal. |
| Wer legt an | Paula in der App. Phil sieht es im Eltern-Dashboard, kann nichts ändern. Eltern-Login bleibt lesend. |
| Umfang | 12 Aufgaben pro Fokus-Session, ca. 15 Minuten. Mehrere Fokus-Sessions pro Tag erlaubt. |
| Parallel | Mehrere Schulaufgaben gleichzeitig. Die nächste steht oben. |
| Vorschlag | Beim Anlegen sind die Lernbereiche vorangehakt, die laut Kalender bis zum Termin dran waren (Regel in 3.3). |
| Belohnung | Kein Geld. XP und Streak wie bei der Tagessession. |

Bewusste Ausnahme von "Paula trifft keine Entscheidungen": Das Eintragen der Schulaufgabe (Fach, Datum, Themen) ist die eine Stelle, an der Paula Eingaben macht. Grund: Nur sie weiß, wann sie schreibt und was dran war. Alles danach entscheidet die App.

## 2. Datenmodell

Neue Migration `supabase/migrations/0003_fokus.sql`. Muster und Hilfsfunktionen (`is_parent_of`) wie in `0001_init.sql`.

```sql
-- Schulaufgaben, die Paula eingetragen hat.
create table public.exams (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  exam_date date not null,
  number int not null,                 -- n-te Schulaufgabe in diesem Fach, beim Anlegen berechnet
  skill_ids jsonb not null,            -- Array von skills.id (uuid als String), mindestens 1
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index exams_student_date_idx on public.exams (student_id, exam_date);

alter table public.exams enable row level security;
create policy exams_read on public.exams for select to authenticated
  using (student_id = auth.uid() or public.is_parent_of(student_id));
create policy exams_insert on public.exams for insert to authenticated
  with check (student_id = auth.uid());
create policy exams_update on public.exams for update to authenticated
  using (student_id = auth.uid()) with check (student_id = auth.uid());
create policy exams_delete on public.exams for delete to authenticated
  using (student_id = auth.uid());

-- Fokus-Sessions: dritte Session-Art, verweist auf die Schulaufgabe.
alter table public.sessions drop constraint if exists sessions_kind_check;
alter table public.sessions add constraint sessions_kind_check
  check (kind in ('daily', 'bonus', 'focus'));
alter table public.sessions add column if not exists exam_id uuid references public.exams (id) on delete set null;
create index sessions_exam_idx on public.sessions (exam_id) where exam_id is not null;
```

Keine Archiv-Spalte: Eine Schulaufgabe ist "aktiv", solange `exam_date >= heute` (Berlin-Datum). Danach ist sie Vergangenheit und wird nur noch im Eltern-Dashboard gezeigt. Kein Cron, kein Aufräumen.

`lib/supabase/types.ts` ergänzen:

```ts
export interface ExamRow {
  id: string;
  student_id: string;
  subject_id: string;
  exam_date: string;
  number: number;
  skill_ids: string[];
  created_at: string;
  updated_at: string;
}
// SessionRow: kind: "daily" | "bonus" | "focus"; exam_id: string | null;
```

## 3. Engine: `lib/engine/focus.ts` (rein, mit `focus.test.ts` daneben)

Alle Funktionen ohne Supabase, ohne Datum aus der Uhr. Datum kommt als `ISODate` rein.

### 3.1 Typen

```ts
export interface FocusExam {
  id: string;
  subject: string;          // 'M' | 'D' | 'B' | 'E'
  examDate: ISODate;
  number: number;
  skillCodes: readonly string[];   // z. B. ['B1.1', 'B1.2', 'B1.3']
}

export const FOCUS_COUNT = 12;
```

### 3.2 Aktive Schulaufgaben

```ts
/** Schulaufgaben, die heute oder später stattfinden, nächste zuerst. Der Prüfungstag selbst zählt noch (morgens lernen). */
export function activeExams(exams: readonly FocusExam[], today: ISODate): FocusExam[]

/** Tage bis zur Schulaufgabe: 0 = heute, 1 = morgen. */
export function daysUntil(exam: FocusExam, today: ISODate): number

/** Skills aller aktiven Schulaufgaben, nach Fach vereinigt (für die gefärbte Tagessession). */
export function focusSkillsBySubject(exams: readonly FocusExam[], today: ISODate): Map<string, Set<string>>
```

### 3.3 Themenvorschlag beim Anlegen

```ts
export interface SuggestInput {
  subject: string;
  examDate: ISODate;
  schoolYearStart: ISODate;
  schedule: readonly ScheduleEntry[];              // aus calendar.ts
  skills: readonly { code: string; unitCode: string; orderIndex: number }[];  // Skills des Fachs
  previousExamDate: ISODate | null;                // letzte frühere Schulaufgabe im selben Fach, sonst null
  snoozedSkills: ReadonlySet<string>;              // "hatten wir noch nicht", werden nicht vorgeschlagen
}

/** Vorangehakte Skill-Codes. Leer bei Deutsch und Englisch (ROTATING_SUBJECTS), dort weiß der Kalender nichts. */
export function suggestSkills(input: SuggestInput): string[]
```

Regel für geordnete Fächer (M, B):
1. `examWeek = weekOf(examDate, schoolYearStart)`.
2. Fenster: `fromWeek = previousExamDate ? weekOf(previousExamDate) + 1 : max(1, examWeek - 6)`. Eine Schulaufgabe deckt den Stoff seit der letzten Schulaufgabe ab, sonst etwa die letzten 6 Unterrichtswochen.
3. Alle Gebiete, deren `[weekFrom, weekTo]` das Fenster `[fromWeek, examWeek]` schneidet.
4. Davon die Skills, die bis `examWeek` freigeschaltet sind (`unlockedSkillCount(entry, examWeek, skillCount)` aus `calendar.ts`; bei Gebieten, die vor `examWeek` enden, alle Skills).
5. Minus `snoozedSkills`.

Für D und E: leeres Array. Die UI zeigt dann "Hak an, was drankommt."

### 3.4 Abwahl-Warnung

```ts
/** Lernbereiche, in denen mehr als die Hälfte der Skills abgewählt ist, obwohl mindestens einer gewählt ist. */
export function overDeselectedUnits(
  unitSkills: ReadonlyMap<string, readonly string[]>,   // unitCode -> alle Skill-Codes
  selected: ReadonlySet<string>,
): string[]
```

Beispiel: B1 hat 4 Skills, 1 gewählt = 3 von 4 abgewählt = über die Hälfte = Warnung. 2 von 4 gewählt = genau die Hälfte = keine Warnung. 0 gewählt = Lernbereich gar nicht gewählt = keine Warnung.

### 3.5 Fokus-Plan (die Drill-Logik)

```ts
export interface FocusPlanInput {
  items: readonly PlannerItem[];        // gesamter Katalog, wird hier gefiltert
  states: readonly PlannerState[];
  exam: FocusExam;
  today: ISODate;
  exclude?: ReadonlySet<string>;        // Aufgaben aus heutigen Sessions
  rotation?: number;                    // Anzahl bisheriger Fokus-Sessions dieser Schulaufgabe, versetzt den Start-Skill
}

/** 12 Aufgaben nur aus den Skills der Schulaufgabe. Weniger, wenn der Pool kleiner ist. Leer, wenn nichts da ist. */
export function planFocus(input: FocusPlanInput, count = FOCUS_COUNT): string[]
```

Ranking, anders als der Tagesplan: Fälligkeit (SM-2 `dueDate`) spielt keine Rolle mehr, es wird gedrillt. Aber SM-2 wird beim Antworten ganz normal fortgeschrieben (`submitAnswer` bleibt unverändert).

1. Kandidaten: `items` mit `skillCode` in `exam.skillCodes`, ohne `exclude`. Snooze ("hatten wir noch nicht") wird hier ignoriert, Paula hat den Skill ausdrücklich gewählt.
2. Pro Skill eine Warteschlange, sortiert:
   - zuerst ungesehene (kein `state`), nach `difficulty` aufsteigend, dann `code`
   - dann schwache: `lastResult` in `wrong`/`partial` oder `lapses > 0`, nach `dueDate` aufsteigend (überfällig zuerst), dann `code`
   - dann gekonnte (`lastResult === 'correct'`), nach `dueDate` aufsteigend, dann `code`
3. Round-Robin über die Skills in `skillOrder`-Reihenfolge, Start bei Index `rotation % skillAnzahl`. Leere Warteschlangen überspringen. Bis `count` erreicht oder alles leer.

Warum Round-Robin: Alle Themen der Schulaufgabe kommen in jeder Runde vor, auch wenn ein Skill 30 und ein anderer 6 Aufgaben hat. `numeric_template`-Aufgaben liefern bei Wiederholung neue Zahlen (`instanceSeed(sessionId, code)`), Wiederholung ist also echtes Üben.

### 3.6 Gefärbte Tagessession: Änderung in `planner.ts`

`PlanInput` bekommt ein optionales Feld:

```ts
/** Skills aktiver Schulaufgaben je Fach. Das Fach nimmt seine Aufgaben zuerst aus diesen Skills. */
focusSkills?: ReadonlyMap<string, ReadonlySet<string>>;
```

In `rankSubject(subject, input)`: Wenn `input.focusSkills?.get(subject)` existiert und nicht leer ist:

```ts
const focus = input.focusSkills.get(subject)!;
const focusItems = items.filter((i) => focus.has(i.skillCode));
const focusRanked = rankFocusItems(focusItems, stateById, rotation = 0);  // dieselbe Warteschlangen-Logik wie 3.5, als exportierte Hilfsfunktion in focus.ts
const rest = normales Ranking wie bisher, aber ohne die focusItems;
return [...focusRanked, ...rest];
```

Damit füllt das Prüfungsfach seine 3 Plätze aus den Schulaufgaben-Themen, und `pickReplacement` sowie `planBonus` profitieren automatisch. Prüfungsmodus (`isExamMode`) bleibt unberührt: dort gilt weiter `rankExam`, Fokus-Skills werden davor eingeschoben, gleiche Logik.

Umsetzung ohne Zirkelbezug: `focus.ts` importiert Typen aus `planner.ts`, `planner.ts` importiert `rankFocusItems` aus `focus.ts`. Das ist bei reinen Typ-Importen unproblematisch. Falls TypeScript meckert, `rankFocusItems` in eine dritte Datei `lib/engine/drill.ts` legen, die beide importieren.

### 3.7 Streak: Änderung in `lib/data/complete.ts`

Eine Zeile: `if (session.kind === "daily")` wird zu `if (session.kind === "daily" || session.kind === "focus")`.

`completeDay` in `streak.ts` ist bereits idempotent pro Datum (`lastCompletedDate === today` liefert `counted: false`). Zweite Session am Tag zählt also nicht doppelt, `rewardsForCompletion` wird auch nicht doppelt ausgelöst. Kein weiterer Eingriff. Bonus-Runden bleiben ohne Streak.

### 3.8 Testfälle für `focus.test.ts` (Pflicht, vor der UI)

Testdaten wie in `planner.test.ts` (`makeItems`, `buildSchedule`).

- `activeExams`: filtert vergangene raus, Prüfungstag selbst bleibt drin, Sortierung nach Datum.
- `daysUntil`: heute = 0, morgen = 1.
- `focusSkillsBySubject`: zwei BwR-Schulaufgaben werden vereinigt, Mathe separat, abgelaufene fehlen.
- `suggestSkills` M ohne frühere Schulaufgabe, Termin in Woche 5: alle bis Woche 5 freigeschalteten M1-Skills, keine M2-Skills.
- `suggestSkills` M mit früherer Schulaufgabe in Woche 4, Termin in Woche 12: Fenster 5-12, M1-Rest und freigeschaltete M2-Skills.
- `suggestSkills` D: leer.
- `suggestSkills` lässt zurückgestellte Skills weg.
- `overDeselectedUnits`: 1 von 4 = Warnung, 2 von 4 = keine, 0 von 4 = keine, 3 von 5 = keine, 2 von 5 = Warnung.
- `planFocus`: nur Aufgaben aus den Schulaufgaben-Skills, 12 Stück, keine Doppelten.
- `planFocus`: kleiner Pool (8 Aufgaben) liefert 8, leerer Pool liefert `[]`.
- `planFocus`: ungesehene vor schwachen vor gekonnten, innerhalb eines Skills.
- `planFocus`: Round-Robin: bei 3 Skills mit je 10 Aufgaben kommt jeder Skill 4-mal vor, Start-Skill hängt von `rotation` ab.
- `planFocus`: `exclude` wird beachtet.
- `planDaily` mit `focusSkills` für B: die 3 B-Aufgaben stammen aus den Fokus-Skills, M/D/E unverändert, Rotation `MDBEMDBEMDBE` bleibt.
- `planDaily` mit `focusSkills`, deren Skills weniger als 3 Aufgaben haben: Rest wird normal aufgefüllt.

## 4. Datenzugriff: `lib/data/exams.ts` (server-only)

```ts
export async function loadExams(v: Viewer, studentId = v.userId): Promise<FocusExam[]>
  // liest exams, mappt skill_ids (uuid) auf Skill-Codes über loadCatalog, subject_id auf Fach-Code

export async function createExam(v: Viewer, subjectCode: string, examDate: ISODate, skillCodes: string[]): Promise<ExamRow>
  // number = Anzahl bisheriger exams des Schülers in diesem Fach + 1
  // löscht skill_snooze-Zeilen für die gewählten Skills (Paula sagt: das hatten wir)

export async function updateExam(v: Viewer, examId: string, examDate: ISODate, skillCodes: string[]): Promise<void>
export async function deleteExam(v: Viewer, examId: string): Promise<void>

export async function createFocusSession(v: Viewer, examId: string): Promise<SessionRow>
  // exclude = planned_item_ids aller heutigen Sessions (wie createBonusSession)
  // rotation = Anzahl bisheriger Sessions mit kind='focus' und diesem exam_id
  // insert sessions { kind: 'focus', exam_id, planned_item_ids }

export interface ExamStats { sessions: number; correct: number; total: number; lastDate: ISODate | null }
export async function examStats(v: Viewer, examIds: string[], studentId: string): Promise<Map<string, ExamStats>>
  // aus sessions where kind='focus' and exam_id in (...): Anzahl abgeschlossener, Summe correct/total
```

`planInput()` in `lib/data/sessions.ts` lädt zusätzlich `loadExams` und setzt `focusSkills: focusSkillsBySubject(exams, today)`. Damit färbt sich die Tagessession, ohne dass `getOrCreateDailySession` angefasst wird.

`markNotYet` in `session/actions.ts`: Wenn die Session `kind === 'focus'` ist, kommt der Ersatz aus `planFocus` mit `exclude = planned_item_ids` statt aus `pickReplacement`. Der Skill wird trotzdem 21 Tage zurückgestellt (für die Tagessession), aber NICHT aus der Schulaufgabe entfernt.

## 5. Screens (Mobile first, 390 px, Touch-Ziele 48 px)

### 5.1 Home (`app/(student)/page.tsx`)

Reihenfolge von oben: Header (Streak, Joker, Euro) wie bisher, Level-Zeile wie bisher, dann:

**Ohne aktive Schulaufgabe:** wie bisher ("Heute starten" oder "Heute erledigt" + Bonus). Darunter neu, klein und unaufdringlich unter den Fach-Kacheln, ein Text-Link: "Schulaufgabe eintragen" mit `CalendarPlus`-Icon, führt zu `/fokus/neu`.

**Mit aktiver Schulaufgabe (nächste zuerst):**

```
┌─────────────────────────────────────────┐
│ BwR · 2. Schulaufgabe · in 9 Tagen       │   Zeile 1: Fach in Fachfarbe, klein
│                                          │
│ Fokus starten                            │   groß, primärer Button (form action startFocus)
│ 12 Aufgaben · Rückstellungen, ARA/PRA ...│   Skill-Titel, line-clamp-1
│                                          │
│ 4 Fokus-Runden · 68 % richtig            │   Statistik, klein; fehlt bei 0 Runden
└─────────────────────────────────────────┘
        Themen ändern  ›                        Text-Link zu /fokus/[id]

[ Normale Runde (12 Aufgaben) ]                 sekundärer Button (Rahmen), Link /session
```

Weitere aktive Schulaufgaben darunter als schmale Zeilen: "Mathe · 12.10. · Fokus starten" (Zeile ist der Button, 56 px hoch, Fachfarbe links).

Zustand "heute schon ein Streak-Tag" (Tagessession ODER eine Fokus-Session abgeschlossen): grüne "Heute erledigt"-Box wie bisher, Text "Streak gesichert. Mehr geht immer." Darunter die noch offenen Optionen als sekundäre Buttons: "Noch eine Fokus-Runde" (immer, solange Schulaufgabe aktiv), "Normale Runde" (nur wenn Tagessession noch nicht fertig), "Bonus-Runde (6 Aufgaben)" (wie bisher).

Am Prüfungstag selbst (`daysUntil === 0`): Zeile 1 lautet "BwR · 2. Schulaufgabe · heute". Alles andere gleich.

Wenn der Pool leer ist (kein Item zu den Skills, `planFocus` liefert `[]`): Button deaktiviert mit Text "Noch keine Aufgaben zu diesen Themen".

### 5.2 Schulaufgabe anlegen (`app/(student)/fokus/neu/page.tsx`, Client-Komponente `components/fokus/exam-form.tsx`)

Ein Screen, drei Blöcke untereinander, kein Wizard. Server liefert Katalog, Vorschlag je Fach und Datum wird client-seitig aus einer vorab berechneten Tabelle geholt: Der Server berechnet `suggestSkills` nicht für jedes mögliche Datum, sondern die Client-Komponente bekommt `schedule`, `skills`, `schoolYearStart`, `previousExamDateBySubject`, `snoozedSkills` und ruft `suggestSkills` selbst auf (reine Funktion, läuft im Browser). Der Vorschlag wird neu berechnet, wenn Fach oder Datum sich ändern, aber nur solange Paula noch keinen Haken selbst verändert hat (Flag `touched`).

**Block 1: Fach.** Vier Kacheln nebeneinander in 2×2, Fachfarbe als Rahmen, gewählt = gefüllt. Fächer ohne Aufgaben (aktuell D, E) sind wählbar, aber ihre Lernbereiche zeigen "Aufgaben folgen" und sind nicht anhakbar.

**Block 2: Datum.** `<input type="date">` nativ (iOS-Picker), `min` = heute, `max` = `family.exam_date`. Label "Wann ist die Schulaufgabe?". Darunter live: "in 9 Tagen".

**Block 3: Themen.** Überschrift "Was kommt dran?". Liste der Lernbereiche des Fachs in `orderIndex`-Reihenfolge. Jede Zeile: Checkbox (48 px), Titel, rechts Anzahl Aufgaben ("38 Aufgaben") und Chevron zum Aufklappen. Aufgeklappt: Skills als eingerückte Checkbox-Zeilen. Zustände der Lernbereich-Checkbox: alle Skills = voll, einige = Minus-Symbol, keine = leer. Tipp auf die Lernbereich-Checkbox: alle an bzw. alle aus.
Bei D und E ohne Vorschlag steht über der Liste: "Hak an, was drankommt."

**Warnung:** Wenn `overDeselectedUnits` nicht leer ist, erscheint unter der Liste eine gelbe Box: "Du hast in *Periodenrichtige Erfolgsermittlung* über die Hälfte abgewählt. Sicher?" mit Button "Ja, passt so" (48 px). Erst nach Bestätigung ist "Los" aktiv. Ändert Paula danach wieder Haken, wird die Bestätigung zurückgesetzt.

**Button "Los"** (primär, unten, `sticky bottom`): deaktiviert, solange kein Fach, kein Datum oder kein Skill gewählt ist oder eine unbestätigte Warnung offen ist. Server Action `createExamAction` in `app/(student)/fokus/actions.ts`, danach `redirect("/")`.

Kein `alert`, kein `confirm`, alles inline.

### 5.3 Schulaufgabe ändern (`app/(student)/fokus/[id]/page.tsx`)

Dasselbe Formular, vorbefüllt, Fach nicht änderbar (Kachel fixiert). Buttons: "Speichern" (primär) und darunter Text-Link "Schulaufgabe löschen" in Rot, der eine Inline-Bestätigung aufklappt ("Wirklich löschen? Deine Fokus-Runden bleiben in der Statistik." mit "Ja, löschen"). Beides Server Actions `updateExamAction`, `deleteExamAction`, danach `redirect("/")`.

Datum in die Vergangenheit verschieben ist erlaubt (Schulaufgabe war doch schon), dann verschwindet sie sofort vom Home.

### 5.4 Session-Player

Unverändert. Nur der Kopf zeigt bei `kind === 'focus'` statt "1/12" den Zusatz "Fokus BwR · 1/12" in Fachfarbe. Datei `components/session/player.tsx`, Prop `label?: string`.

### 5.5 Fertig-Screen (`app/(student)/fertig/[id]/page.tsx`)

Überschrift je Art: daily "Fertig für heute", bonus "Bonus-Runde geschafft", focus "Fokus-Runde geschafft". Streak-Kachel und Belohnungen wie bisher (Summary kommt aus `completeSession`). Unten bei focus zusätzlich Button "Noch eine Fokus-Runde" (Server Action `startFocus` mit `exam_id` der Session) über dem "Fertig"-Button; "Bonus-Runde" bleibt.

### 5.6 Eltern-Dashboard (`app/(parent)/eltern/page.tsx`)

Neuer Abschnitt "Schulaufgaben" zwischen "Letzte Tage" und "Hatten wir noch nicht". Zeigt aktive und die der letzten 60 Tage, neueste zuerst:

```
BwR · 2. Schulaufgabe · 05.10. (in 9 Tagen)
6 Fokus-Runden · 71 % richtig · zuletzt 03.10.
Themen: Aufwand/Ertrag, Abgrenzung, ARA/PRA
```

Nur lesen. Ist nichts eingetragen: "Paula hat keine Schulaufgabe eingetragen."

## 6. Texte (Du-Form, direkt)

| Stelle | Text |
|---|---|
| Home, Link | Schulaufgabe eintragen |
| Home, Kachel Zeile 1 | {Fach} · {n}. Schulaufgabe · in {d} Tagen / morgen / heute |
| Home, Button | Fokus starten |
| Home, Unterzeile | 12 Aufgaben · {Skill-Titel, kommagetrennt} |
| Home, Statistik | {n} Fokus-Runden · {p} % richtig |
| Home, zweiter Button | Normale Runde (12 Aufgaben) |
| Home, erledigt | Heute erledigt. Streak gesichert. Mehr geht immer. |
| Home, erledigt Buttons | Noch eine Fokus-Runde / Normale Runde / Bonus-Runde (6 Aufgaben) |
| Home, leerer Pool | Noch keine Aufgaben zu diesen Themen |
| Formular, Titel | Schulaufgabe eintragen |
| Formular, Fach | Welches Fach? |
| Formular, Datum | Wann ist die Schulaufgabe? |
| Formular, Themen | Was kommt dran? |
| Formular, D/E-Hinweis | Hak an, was drankommt. |
| Formular, Warnung | Du hast in *{Lernbereich}* über die Hälfte abgewählt. Sicher? |
| Formular, Warnung Button | Ja, passt so |
| Formular, Absenden | Los |
| Ändern, Absenden | Speichern |
| Ändern, Löschen | Schulaufgabe löschen / Wirklich löschen? Deine Fokus-Runden bleiben in der Statistik. / Ja, löschen |
| Fertig | Fokus-Runde geschafft |
| Player-Kopf | Fokus {Fach} · {i}/{n} |
| Eltern, leer | Paula hat keine Schulaufgabe eingetragen. |

## 7. Randfälle, entschieden

- **Zwei Schulaufgaben im selben Fach aktiv** (z. B. verschoben und neu angelegt): beide erscheinen, Tagessession nimmt die Vereinigung der Skills. Kein Verbot, keine Warnung.
- **Skill in Schulaufgabe gewählt, aber zurückgestellt ("hatten wir noch nicht")**: beim Anlegen wird der Snooze gelöscht.
- **"Hatten wir noch nicht" innerhalb einer Fokus-Runde**: Ersatz aus dem Fokus-Pool, Skill bleibt in der Schulaufgabe, Snooze wie gehabt für die Tagessession.
- **Pool kleiner als 12**: Runde hat weniger Aufgaben, Streak zählt trotzdem (alle geplanten beantwortet). Pool 0: Button deaktiviert.
- **Fokus-Runde abgeschlossen, dann Tagessession**: Tagessession-Fertig-Screen zeigt Streak ohne "+1" (`streakCounted: false`), XP normal.
- **Prüfungsmodus ab Mai** (`isExamMode`): Schulaufgaben können weiter eingetragen werden, Fokus funktioniert gleich. Die Fach-Rotation der Tagessession bleibt `EXAM_ROTATION`.
- **Datum nach `family.exam_date`**: vom Formular verhindert (`max`), Server Action prüft trotzdem und lehnt ab.
- **Doppel-Tap auf "Fokus starten"**: zwei Fokus-Sessions entstehen. Akzeptiert, wie bei Bonus-Runden; beide sind spielbar.
- **Eltern**: keine Schreibrechte auf `exams`, RLS erzwingt es.

## 8. Reihenfolge für Opus 5.5

1. Migration `0003_fokus.sql`, `types.ts` erweitern. Phil spielt die Migration im Supabase-SQL-Editor ein (kurze Anleitung am Ende ausgeben, kein Wizard nötig).
2. `lib/engine/focus.ts` mit allen Funktionen aus Abschnitt 3 und `focus.test.ts` mit allen Fällen aus 3.8. `npm test` grün.
3. `planner.ts`: `focusSkills` in `PlanInput`, Einbau in `rankSubject`. Bestehende Planner-Tests bleiben grün, neue Fälle dazu.
4. `lib/data/exams.ts`, `planInput()` erweitern, `complete.ts` (eine Zeile), `markNotYet` für Fokus-Sessions.
5. `app/(student)/fokus/actions.ts` (`createExamAction`, `updateExamAction`, `deleteExamAction`, `startFocus`).
6. Formular `components/fokus/exam-form.tsx`, Seiten `/fokus/neu` und `/fokus/[id]`.
7. Home-Screen umbauen (5.1), Fertig-Screen (5.5), Player-Kopf (5.4).
8. Eltern-Abschnitt (5.6).
9. `npm run build` ohne Fehler, `npm test` grün. Dann per Vorschau bei 390 px: anlegen, Warnung auslösen, Fokus-Runde spielen, Fertig-Screen, Home mit "Heute erledigt", Themen ändern, löschen.
10. Eintrag in `docs/entscheidungen.md` (falls vorhanden, sonst anlegen): "2026-09-26 Fokus-Modus, siehe docs/fokus-modus.md".

Nicht bauen: Noteneingabe, Geld für Schulaufgaben, Push-Erinnerung "morgen Schulaufgabe", Themenvorschlag für Deutsch/Englisch, Import von Schulaufgaben-Terminen. Das ist Phase 2, falls überhaupt.
