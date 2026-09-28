# LevelUp10 – Projektanweisungen für Claude Code

Lern-App für Felix (10. Klasse Realschule Bayern, Zweig II: Deutsch, Englisch, Mathe II, BwR).
Der vollständige Bauplan steht in `PLAN.md`. Die Skill-Struktur steht in `docs/lehrplan-struktur.md`. Beide zuerst lesen.
Der Fokus-Modus (gezielt auf eine Schulaufgabe lernen) steht komplett in `docs/fokus-modus.md`.
Felix' Schulbücher, ihre Kapitel und der aktuelle Unterrichtsstand stehen in `docs/schulbuecher.md`. Vor dem Schreiben neuer Aufgaben lesen.

## Nicht verhandelbar

- Keine KI-API in der App. Aufgaben werden von Claude Code als JSON in `content/` geschrieben, nicht zur Laufzeit erzeugt.
- Felix trifft keine Entscheidungen. Kein Themenwählen, keine Einstellungen. Die App zeigt "Heute starten" und sonst nichts. Einzige Ausnahme: das Eintragen einer Schulaufgabe (Fach, Datum, Themen) im Fokus-Modus, siehe `docs/fokus-modus.md`.
- Mobile first. Jede Ansicht zuerst bei 390 px Breite prüfen. Touch-Ziele mindestens 48 px.
- Sprache in der UI: Deutsch, Du-Form, direkt, nicht kindlich, nicht schulbuchartig. Englisch-Aufgaben auf Englisch.
- Eltern-Login liest nur. Einzige Schreibrechte: Belohnungsbeträge und "ausgezahlt"-Markierung.

## Stack

Next.js App Router mit TypeScript, Tailwind, shadcn/ui, Supabase (`@supabase/ssr`, RLS), KaTeX, Vitest, Vercel.
Keine zusätzlichen State-Bibliotheken, kein ORM, keine Native-Wrapper.

## Struktur

```
app/                  Routen: (auth)/login, (student)/..., (parent)/...
lib/engine/           calendar.ts, planner.ts, sm2.ts, streak.ts, rewards.ts (reine Funktionen, Vitest-Tests daneben)
lib/supabase/         client.ts, server.ts, types.ts
content/              <fach>/<unit_code>.json (Aufgaben, Schema in PLAN.md Abschnitt 5)
scripts/seed.ts       Idempotenter Seed: Upsert nach item.code, legt Kalender und Accounts an
supabase/migrations/  SQL inkl. RLS
docs/                 Lehrplanstruktur, Entscheidungen
.claude/commands/     Slash-Commands für Nachschub und Prüfung
```

## Regeln für Aufgaben in `content/`

- Niveau Realschule 10, Zweig II. Keine Gymnasial-Tiefe, keine Grundschul-Trivialität.
- `explanation` ist Pflicht und erklärt den Lösungsweg in 2-4 Sätzen.
- MC-Distraktoren sind typische Schülerfehler (Vorzeichenfehler, vertauschte Konten, falsche Zeitform), keine Unsinns-Optionen.
- Deutsch/Englisch: alle Texte selbst geschrieben. Keine Zitate aus Schulbüchern oder Romanen.
- Keine Vokabelaufgaben. Felix lernt Vokabeln aus dem Vokabelteil des Buchs oder E-Books, die App kennt seine Liste nicht. Englisch-Aufgaben prüfen Grammatik, Leseverstehen und Schreiben mit einfachem Grundwortschatz.
- Mathe/BwR: Zahlen realistisch, Ergebnisse dort glatt, wo es im Unterricht üblich ist. Bei `numeric_template` Bereiche so wählen, dass keine unsinnigen Werte entstehen (keine negativen Längen, keine Beträge mit 7 Nachkommastellen).
- BwR-Kontenrahmen: der an bayerischen Realschulen übliche Schulkontenrahmen. Bei Unsicherheit über eine Kontonummer nur den Kontonamen verwenden.
- `item.code` ist stabil und eindeutig: `<unit_code>-<laufende Nummer>`, z. B. `M4-017`. Nie umnummerieren.

## Slash-Commands (in `.claude/commands/` anlegen)

- `/mehr-aufgaben <unit_code> <anzahl>`: liest die bestehende JSON, erzeugt neue Items ohne Dopplung, hängt an, führt Seed aus.
- `/pruefe-aufgaben <unit_code>`: liest die JSON, rechnet jede Lösung nach, meldet Zweifelsfälle.

## Arbeitsweise

- Engine-Module zuerst mit Tests, dann UI.
- Nach jedem Screen: `npm run build` muss durchlaufen, keine TypeScript-Fehler.
- Manuelle Schritte für Phil (Supabase-Projekt, Vercel-Env-Vars) über den `wizard`-Skill bereitstellen.
- Keine Features aus `PLAN.md` Abschnitt 10 bauen, auch wenn sie naheliegen.
- Tag-3-Regel: Was Felix nervt, wird gefixt, bevor irgendetwas Neues gebaut wird.
