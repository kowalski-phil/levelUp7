# LevelUp7 – Projektanweisungen für Claude Code

Lern-App für Paula (7. Klasse Gymnasium Bayern, Englisch 1. Fremdsprache, Französisch 2. Fremdsprache).
Geklont aus LevelUp10 (Felix), siehe `docs/klon-plan.md`. Der Bauplan steht in `PLAN.md`, die Skill-Struktur in `docs/lehrplan-struktur.md`. Beide zuerst lesen.
Der Fokus-Modus (gezielt auf eine Schulaufgabe lernen) steht in `docs/fokus-modus.md`.
Paulas Schulbücher, ihre Units und der Unterrichtsstand stehen in `docs/schulbuecher.md`. Vor dem Schreiben neuer Aufgaben lesen.

## Nicht verhandelbar

- Keine KI-API in der App. Aufgaben werden von Claude Code als JSON in `content/` geschrieben, nicht zur Laufzeit erzeugt.
- Paula trifft keine Entscheidungen. Kein Themenwählen, keine Einstellungen. Die App zeigt "Heute starten" und sonst nichts. Einzige Ausnahme: das Eintragen einer Schulaufgabe (Fach, Datum, Themen) im Fokus-Modus.
- Mobile first. Jede Ansicht zuerst bei 390 px Breite prüfen. Touch-Ziele mindestens 48 px.
- Sprache in der UI: Deutsch, Du-Form, direkt, nicht kindlich, nicht schulbuchartig.
- Eltern-Login liest nur. Einzige Schreibrechte: Belohnungsbeträge und "ausgezahlt"-Markierung.
- Engine-Fixes aus LevelUp10 kommen per `git cherry-pick` (Remote `levelup10`). Engine-Dateien deshalb nur ändern, wenn es für Paula nötig ist, und die Abweichung in `docs/entscheidungen.md` festhalten.

## Stack

Next.js App Router mit TypeScript, Tailwind, shadcn/ui, Supabase (`@supabase/ssr`, RLS), Vitest, Vercel.
Supabase ist selbst gehostet (Easypanel auf Phils VPS), nicht supabase.com. Neue Migrationen im Studio unter „SQL Editor“ ausführen. In Easypanel nie `POSTGRES_PASSWORD` ändern.
Keine zusätzlichen State-Bibliotheken, kein ORM, keine Native-Wrapper.

## Struktur

```
app/                  Routen: (auth)/login, (student)/..., (parent)/...
lib/engine/           calendar.ts, planner.ts, sm2.ts, streak.ts, rewards.ts, focus.ts, grading.ts (reine Funktionen, Vitest-Tests daneben)
lib/supabase/         client.ts, server.ts, types.ts
content/              englisch/<unit_code>.json, franzoesisch/<unit_code>.json, structure.json
scripts/seed.ts       Idempotenter Seed: Upsert nach item.code, legt Kalender und Accounts an
supabase/migrations/  SQL inkl. RLS (0001 bis 0004 identisch mit LevelUp10, ab 0005 nur LevelUp7)
docs/                 Lehrplanstruktur, Schulbücher, Entscheidungen
.claude/commands/     Slash-Commands für Nachschub und Prüfung
```

## Regeln für Aufgaben in `content/`

- Niveau Gymnasium 7: Englisch im 3. Lernjahr (Green Line 3), Französisch im 2. Lernjahr (Découvertes 2). Wortschatz in Grammatik-Aufgaben: Grundwortschatz, kein Wort, das Paula noch nicht hatte. Bei Unsicherheit einfacher wählen.
- Arbeitsanweisung (`stem`) bei Englisch kurz auf Englisch wie im Buch ("Fill in …", "Choose …"), bei Französisch auf Deutsch. Der Inhalt ist in der Fremdsprache.
- `explanation` ist Pflicht, auf Deutsch, 2-4 Sätze, nennt die Regel und warum der typische Fehler falsch ist.
- `hint` auf Deutsch, ein Satz, verrät die Lösung nicht.
- MC-Distraktoren sind typische Schülerfehler (falsche Zeitform, Adjektiv statt Adverb, Apostroph bei Possessivpronomen, fehlende Angleichung des participe passé bei être, falsche Stellung des Pronomens), keine Unsinns-Optionen. Keine Option, die man mit gutem Grund auch für richtig halten kann.
- Alle Texte selbst geschrieben. Keine Zitate aus Schulbüchern.
- Vokabeln nur aus abfotografierten Seiten des Vokabelteils (Englisch `EV`, Französisch `FV`). Nie Vokabeln aus dem Inhaltsverzeichnis oder aus dem Gedächtnis erfinden. Französische Nomen mit Artikel.
- Aufgabentypen für Sprachen: `mc`, `mc_multi`, `cloze`, `cloze_free`, `order`, `match`, `vocab`. `numeric`, `numeric_template` und `booking` bleiben im Code, werden nicht benutzt.
- Bei `order` müssen alle Bausteine verschieden sein und es darf nur eine richtige Reihenfolge geben.
- `item.code` ist stabil und eindeutig: `<unit_code>-<laufende Nummer>`, z. B. `E1-017`. Nie umnummerieren.
- Prüfen mit `npm run content:check -- <unit_code>` (0 Fehler) und `npm run content:preview -- <unit_code>`.

## Slash-Commands (in `.claude/commands/`)

- `/vokabeln-aus-foto <englisch|französisch> <Seiten | bis S. n> [test]`: wird an Tag 2 für zwei Sprachen umgebaut, die jetzige Fassung ist noch Felix' Version.
- `/mehr-aufgaben <unit_code> <anzahl>` und `/pruefe-aufgaben <unit_code>`: noch anzulegen.

## Arbeitsweise

- Engine-Module zuerst mit Tests, dann UI.
- Nach jedem Screen: `npm run build` muss durchlaufen, keine TypeScript-Fehler.
- Manuelle Schritte für Phil (Supabase-Projekt, Vercel-Env-Vars) über den `wizard`-Skill bereitstellen.
- Keine Features aus `PLAN.md` Abschnitt 9 bauen, auch wenn sie naheliegen.
- Tag-3-Regel: Was Paula nervt, wird gefixt, bevor irgendetwas Neues gebaut wird.
