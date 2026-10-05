# LevelUp7 – Bauplan

Lern-App für Paula, 7. Klasse Gymnasium Bayern, Schuljahr 2026/27.
Zwei Fächer: Englisch (1. Fremdsprache, Green Line 3) und Französisch (2. Fremdsprache, Découvertes 2). Keine Abschlussprüfung, Schulaufgaben pro Unit.

LevelUp7 ist eine Kopie von LevelUp10 (Felix, Realschule 10), Commit `c5eaff1`. Was kopiert, gelöscht und neu gebaut wurde, steht in `docs/klon-plan.md`.
Ziel: Paula lernt jeden Tag ca. 10 Minuten Grammatik und Vokabeln, ohne etwas entscheiden zu müssen.

---

## 1. Grundsatzentscheidungen

| Thema | Entscheidung | Warum |
|---|---|---|
| Keine Live-KI in der App | Alle Aufgaben schreibt Claude Code als JSON ins Repo, ein Seed-Skript lädt sie in die Datenbank. | Kein API-Budget, keine laufenden Kosten. Wie bei Felix. |
| Die App entscheidet, nicht Paula | Paula öffnet die App und sieht "Heute starten". Kein Themenwählen, keine Einstellungen. Einzige Ausnahme: Schulaufgabe eintragen (Fokus-Modus). | Jede Entscheidung ist ein Ausstiegspunkt. |
| Eigene App statt Mehrkind-Modus | Eigenes Repo, eigene Datenbank (selbst gehostetes Supabase), eigenes Vercel-Projekt. | Felix' App läuft live und wird nicht angefasst. Null inhaltliche Überschneidung. |
| Kalender folgt den Buch-Units | Englisch Unit 1 bis 4, Französisch Unité 1 bis 7, nacheinander, gewichtet nach den Stunden aus den Klett-Stoffverteilungsplänen. Die letzten 14 Tage vor den Sommerferien nur Wiederholung. | Schulaufgaben werden pro Unit geschrieben, Grammatik hängt an der Unit. Dadurch funktioniert auch der Themenvorschlag im Fokus-Modus für beide Fächer. |
| Tägliche Dosis | 8 Aufgaben (4 Englisch, 4 Französisch) plus bis zu 12 Vokabeln (6 pro Sprache). Fertig = Streak-Tag. | Felix braucht ca. 18 Sekunden pro Aufgabe (gemessen 2026-10-03). Das Tagesziel bleibt unter 10 Minuten. |
| Belohnung | 10 € für je 30 Tage am Stück, wie bei Felix. Kein Wochenbonus, keine einmaligen Meilensteine, kein Prüfungsbonus. | Phils Wahl für beide Kinder. |
| Eltern-Login liest nur | Streak, Minuten, Trefferquote, schwächste Skills, Schulaufgaben, Belohnungskonto. | Kontrolle killt Motivation. |
| Web-App als PWA | Auf dem iPhone zum Home-Bildschirm hinzufügen, Web-Push um 16 und 20 Uhr. Icon violett, damit es sich von Felix' gelbem Icon unterscheidet. | Kein App Store. |

---

## 2. Tech-Stack

Unverändert aus LevelUp10: Next.js (App Router, TypeScript), Tailwind, shadcn/ui, Supabase (Auth, Postgres, RLS), Vitest, Vercel, Web Push (`web-push`, Vercel Cron). KaTeX ist noch eingebunden, wird für Sprachen aber nicht gebraucht.

Supabase läuft **selbst gehostet** auf Phils Hostinger-VPS (Easypanel, Dienst `supabase-lu7`, https://apps-supabase-lu7.xbaryy.easypanel.host), weil die zwei Gratis-Projekte bei Supabase belegt sind. Der App-Code ist derselbe, nur URL und Schlüssel unterscheiden sich (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = `ANON_KEY`, `SUPABASE_SECRET_KEY` = `SERVICE_ROLE_KEY`). Backups macht Supabase dort nicht selbst.

Nicht verwenden: Redux, Prisma, tRPC, eigene Backend-Server, Native-Wrapper, KI-APIs.

---

## 3. Datenmodell

Wie LevelUp10 (`supabase/migrations/0001` bis `0004`, unverändert). Dazu `0005_faecher_e_f.sql`: Die Tabelle `subjects` erlaubte nur Felix' Fachcodes D, E, M, B, jetzt E und F.

`families.exam_date` ist bei Paula der letzte Schultag vor den Sommerferien: 2027-07-30 (km.bayern.de, Sommerferien 2.8. bis 13.9.2027). Schuljahresbeginn wie bei Felix 2026-09-16.

---

## 4. Lernengine

Alle Module aus `lib/engine/` sind übernommen. Geändert sind nur Konstanten und eine Kalenderregel:

| Stelle | Felix | Paula |
|---|---|---|
| `planner.ts` `SUBJECT_ROTATION` / `EXAM_ROTATION` | M D B E / D E M B | E F / E F |
| `planner.ts` `DAILY_PER_SUBJECT` | 3 (12 Aufgaben) | 4 (8 Aufgaben) |
| `planner.ts` Vokabeln | `VOCAB_UNIT = "E3"`, 10 pro Tag | `VOCAB_UNITS = { E: "EV", F: "FV" }`, 6 pro Sprache; hat eine Sprache weniger, füllt die andere bis 12 auf |
| `calendar.ts` `ROTATING_SUBJECTS` | D, E | leer |
| `calendar.ts` `EXAM_PREP_DAYS` | 42 | 14 |
| `calendar.ts` `buildSchedule` | – | Gebiete mit `hours: 0` (die Vokabel-Gebiete EV, FV) laufen das ganze Jahr neben der Unit-Reihe |

Tagesplan, SM-2, Streak, Joker (alle 14 Tage, max. 2), XP, Fokus-Modus und Bewertung funktionieren wie in LevelUp10. Beschreibung dort in `PLAN.md` Abschnitt 4 (Git-Historie, Commit `c5eaff1`) und in `docs/fokus-modus.md`.

Geplante Erweiterung der Bewertung `vocab` (Tag 2, mit Tests):
1. Französische Abkürzungen `qn` und `qc` sind optional, wie `sb` und `sth` im Englischen.
2. Antwort stimmt bis auf Akzente → teilweise richtig, die Lösung zeigt den Akzent.
3. Artikel gehört zur französischen Vokabel. Fehlt er oder ist er falsch → teilweise richtig.

---

## 5. Aufgabentypen

| Typ | Einsatz bei Paula |
|---|---|
| `mc`, `mc_multi` | Grammatik-Entscheidungen, Leseverstehen, Erkennen von Vokabeln |
| `cloze` | Lückentext mit Auswahl, z. B. Adjektiv oder Adverb, qui oder que |
| `cloze_free` | Lückentext mit Eingabe: Verbformen, Pronomen, Adverbien |
| `order` | Satzbau, Stellung von Adverbien und Pronomen |
| `match` | Formen zuordnen (Personalpronomen → Reflexivpronomen) |
| `vocab` | Vokabel schreiben (Deutsch → Fremdsprache) |
| `self_check` | vorerst nicht, freies Schreiben ist Phase 2 |

Schema, Payloads und Prüfung: `docs/content-brief.md` und `lib/content/types.ts`.

---

## 6. Inhalte

- `content/englisch/E1.json` bis `E4.json` (Grammatik und Reading je Unit), `EV.json` (Vokabeln).
- `content/franzoesisch/F0.json` (Wiederholung Band 1), `F1.json` bis `F7.json`, `FV.json` (Vokabeln Band 2, FV.0 = Band 1).
- Skill-Struktur: `content/structure.json`, hergeleitet in `docs/lehrplan-struktur.md`.
- Erste Füllung vor Paulas erstem Login: E1 (Stand 2026-10-05: 43 Aufgaben zu Reflexivpronomen, Adverbien, one/ones und Possessivpronomen), F0 (ca. 30 Aufgaben zu den Themen, die Phil nennt) und die Grammatik der aktuellen Unité. Danach nach Unterrichtsstand.
- Nachschub per `/mehr-aufgaben`, Vokabeln per `/vokabeln-aus-foto`.

---

## 7. Screens

Unverändert aus LevelUp10: Login, Willkommen, Home (Streak-Karte, nächste Schulaufgabe, Heute starten, zwei Fach-Kacheln), Session, Fertig, Skill-Tree pro Fach, Streak-Seite, Fokus-Modus, Eltern-Überblick.

Neu (Tag 2): Akzentleiste über dem Eingabefeld bei Französisch-Aufgaben (`vocab`, `cloze_free`) mit `é è ê à ç ù â î ô û ë ï œ`, 48 px, fügt an der Cursorposition ein.

---

## 8. Ablauf

| Tag | Wer | Was |
|---|---|---|
| 0 (2026-10-05) | Claude Code | Klon mit Git-Historie, Umbenennung, Engine-Konstanten, Struktur, Doku, erste Englisch-Aufgaben E1 |
| 1 (2026-10-05, erledigt) | Phil | Supabase selbst gehostet in Easypanel, Migrationen im Studio eingespielt, Seed, Vercel-Projekt `levelup7` mit Env-Vars. Fotos der Inhaltsverzeichnisse, Unterrichtsstand. Claude Code schreibt F0 und die aktuelle Unité. |
| 2 | Claude Code | Akzentleiste, Bewertung (Akzente, Artikel, qn/qc), `/vokabeln-aus-foto` für zwei Sprachen, erste Vokabelfotos. Paula legt die App aufs iPhone. |
| 3 | Claude Code | Was Paula nervt, wird gefixt, bevor irgendetwas Neues gebaut wird. |

Was Phil liefern muss: `docs/naechste-schritte.md`.

---

## 9. Bewusst weggelassen

- Gemeinsame Eltern-Ansicht für Felix und Paula.
- Hörverstehen mit Audio, Aussprache, Sprechen.
- Freies Schreiben mit Bewertung (nur als `self_check` denkbar, frühestens wenn Paula die App nach 3 Wochen noch nutzt).
- Konjugationstrainer als eigener Modus. Konjugation läuft über `cloze`-Aufgaben in den Grammatik-Skills.

---

## 10. Risiken

| Risiko | Gegenmaßnahme |
|---|---|
| Paula macht ein paar Tage mit und hört auf | Tag-3-Regel, Belohnung, Push-Erinnerung, kein Nachholen. |
| Kalender weicht vom Unterricht ab | `schedule_order` und Stunden in `structure.json` nach Phils Unterrichtsstand, Seed neu. Spaced Repetition federt ab. |
| Unité-Zuordnung der Französisch-Grammatik stimmt nicht | Stammt aus dem Klett-Stoffverteilungsplan. Wird mit dem Foto des Inhaltsverzeichnisses abgeglichen, bevor F1 bis F7 befüllt werden. |
| Aufgaben haben Fehler | Erklärung bei jeder Aufgabe, `/pruefe-aufgaben`, Stichprobe durch Phil. |
