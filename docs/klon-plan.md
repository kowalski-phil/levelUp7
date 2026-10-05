# LevelUp7 – Klon-Plan (Paula, 7. Klasse Gymnasium Bayern, Englisch und Französisch)

Stand 2026-10-05. Ausgangspunkt ist LevelUp10 (Felix) auf Commit `c5eaff1`. Dieses Dokument beschreibt, was kopiert, was gelöscht und was neu gebaut wird. Nach dem Klonen wird es zu `docs/klon-plan.md` und `PLAN.md` wird für Paula neu geschrieben.

## 0. Was gleich bleibt (nicht anfassen)

- Stack: Next.js App Router, TypeScript, Tailwind, shadcn/ui, Supabase mit RLS, Vitest, Vercel. Keine KI in der App.
- Grundsatz: Paula trifft keine Entscheidungen. "Heute starten" und sonst nichts. Einzige Ausnahme: Schulaufgabe eintragen (Fokus-Modus).
- Engine: `lib/engine/` (Kalender, Tagesplan, SM-2, Streak, Joker, Belohnung, Fokus-Modus, Bewertung) wird unverändert übernommen. Nur Konstanten ändern sich (Abschnitt 3).
- Datenbank: alle vier Migrationen `supabase/migrations/0001` bis `0004` unverändert. Das Schema kennt weder Fächer noch Schulart.
- Eltern-Login liest nur. Belohnung: 10 € je 30 Tage am Stück (wie bei Felix).
- Push-Erinnerung 16 und 20 Uhr, Willkommens-Screen, Streak-Seite, Skill-Tree, Vorschau-Route, Seed-Skript, Setup-Wizard.

## 1. Warum eine Kopie und kein Mehrkind-Modus

- Felix' App läuft live. An ihr wird nichts riskiert.
- Null inhaltliche Überschneidung (Realschule 10 vs. Gymnasium 7, andere Fächer, andere Bücher).
- Eigenes Supabase-Projekt, eigenes Vercel-Projekt, eigenes Repo. Phil kann dieselbe E-Mail für beide Eltern-Logins nehmen, weil jedes Supabase-Projekt seine eigenen Accounts hat.
- Engine-Fixes wandern per `git cherry-pick` von LevelUp10 nach LevelUp7. Dafür behält der Klon die Git-Historie (Abschnitt 6, Schritt 1).

## 2. Fächer und Struktur (`content/structure.json`)

Anders als bei Felix folgt die Struktur **den Buch-Units**, nicht den Lernbereichen des LehrplanPLUS. Grund: In Klasse 7 werden Schulaufgaben pro Unit geschrieben, Grammatik hängt an der Unit, und der Kalender kann dann wie bei Mathe/BwR sequenziell laufen (Unit 1, dann Unit 2 …). Das macht den Kalendervorschlag im Fokus-Modus nutzbar, der bei rotierenden Fächern leer bleibt (`lib/engine/focus.ts:76`).

### Englisch (Code `E`), Klett "Green Line 3, Ausgabe Bayern ab 2017", ISBN 978-3-12-803030-2

Quelle Grammatik: Klett-Stoffverteilungsplan zum Buch (asset.klett.de, Stoffverteilungsplan_GLBY_Bd3_803030.pdf) und LehrplanPLUS E7 1.2.

| Unit | Titel im Buch | Grammatik laut Stoffverteilungsplan | App-Code |
|---|---|---|---|
| 1 | Find your place | reflexive pronouns, each other, reflexive verbs; adverbs (Bildung, Steigerung), adjective vs. adverb; one/ones; possessive pronouns | E1 |
| 2 | Let's go to Wales | present perfect progressive (for/since); conditional sentences type 2 | E2 |
| 3 | What was it like? | past perfect; conditional sentences type 3 | E3 |
| 4 | In the Desert Southwest | conditional clauses with mixed tenses; temporale und logische Bezüge; indirect speech (rezeptiv) | E4 |
| – | Vokabeln (Vokabelteil des Buchs, nur aus Fotos) | ein Skill pro Unit: EV.1 bis EV.4 | EV |

Skills in E1 bis E4: je ein Grammatik-Skill pro Thema (z. B. E1.1 Reflexivpronomen, E1.2 Adverbien, E1.3 one/possessive pronouns), plus je ein Skill "Reading und Use of English" mit kurzen eigenen Texten im Wortschatz der Unit (Themen laut Lehrplan: Jugendliche in Nordamerika, Wales, britische Geschichte, Desert Southwest, Mediennutzung).

### Französisch (Code `F`), Klett "Découvertes 2, Ausgabe Bayern ab 2017", ISBN 978-3-12-622278-5

Quelle Grammatik: LehrplanPLUS F7 1.2 (2. Fremdsprache) und Klett-Stoffverteilungsplan zu Découvertes 2 Bayern (assets.klett.de, SVP_Decouvertes_BY_2.pdf). Das Buch hat 7 Unités und 3 fakultative Plateaus. Die genaue Zuordnung Unité → Grammatik wird aus dem abfotografierten Inhaltsverzeichnis übernommen (Phil, Abschnitt 7). Laut Lehrplan kommen in Klasse 7 dran:

- passé composé mit avoir und être, imparfait, imparfait vs. passé composé
- Verben auf -ir (dormir, partir, sortir), unregelmäßige Verben (faire, voir, devoir …), reflexive Verben
- pronoms objets indirects (lui, leur) und ihre Stellung, pronoms disjoints (moi, toi …)
- Relativsätze mit qui, que, où
- article partitif, Mengenangaben mit de, Pronomen en
- comparatif und superlatif, adjectif indéfini tout
- impératif (unregelmäßig: avoir, être; mit Pronomen)
- discours indirect und interrogation indirecte im Präsens

| Gebiet | Inhalt | App-Code |
|---|---|---|
| Wiederholung Band 1 | Grammatik aus Découvertes 1 (ISBN 978-3-12-622268-6), die gerade im Unterricht wiederholt wird. Themen kommen von Paula/Phil, nicht aus dem Gedächtnis. | F0 |
| Unité 1 bis 7 | je ein Skill pro Grammatikthema plus ein Skill "Lire et comprendre" mit kurzen eigenen Texten | F1 bis F7 |
| Vokabeln | Vokabelteil Découvertes 2 (FV.1 bis FV.7) und Découvertes 1 (FV.0) | FV |

### Kalender

- Schuljahr 2026/27, Start 2026-09-16 (wie bei Felix). Ende: letzter Schultag vor den Sommerferien Bayern 2027 (Datum beim Klonen auf km.bayern.de prüfen, nicht raten).
- Kein Prüfungsmodus (keine Abschlussprüfung). `exam_date` in der Datenbank wird mit dem Schuljahresende belegt und `EXAM_PREP_DAYS` auf 14 gesetzt: die letzten zwei Wochen nur Wiederholung.
- `schedule_order` pro Gebiet, Unterrichtsstand von Phil (Abschnitt 7). Felix' Kalender hat denselben Mechanismus.

## 3. Engine: nur Konstanten und zwei kleine Erweiterungen

Datei `lib/engine/planner.ts`:

| Konstante | Felix | Paula | Grund |
|---|---|---|---|
| `SUBJECT_ROTATION` | M, D, B, E | E, F | zwei Fächer |
| `EXAM_ROTATION` | D, E, M, B | E, F | entfällt praktisch |
| `DAILY_PER_SUBJECT` | 3 (12 Aufgaben) | 4 (8 Aufgaben) | Felix braucht ca. 18 s pro Aufgabe (gemessen 2026-10-03); 8 Grammatik-Aufgaben plus Vokabeln ergeben ca. 6 bis 7 Minuten |
| `VOCAB_UNIT` | `"E3"` | wird zu `VOCAB_UNITS = { E: "EV", F: "FV" }` | zwei Vokabelspuren |
| `VOCAB_PER_DAY` | 10 | 6 pro Sprache (12 gesamt) | Zwei Sprachen, Tagesziel bleibt unter 10 Minuten |

Datei `lib/engine/calendar.ts`: `ROTATING_SUBJECTS` wird leer (beide Fächer laufen sequenziell nach Units), `EXAM_PREP_DAYS = 14`.

Datei `lib/engine/grading.ts`, Bewertung `vocab` (zwei Erweiterungen, mit Tests):

1. **Französische Abkürzungen** wie bei Englisch `sb`/`sth`: `qn` und `qc` (quelqu'un, quelque chose) sind optional. Englisch bleibt wie bisher.
2. **Akzente**: Antwort stimmt bis auf Akzente (`é`→`e`, `ç`→`c`, Vergleich nach Unicode-Zerlegung) → `partial`, nicht `wrong`. Die Aufgabe kommt in der Runde nochmal, die Lösung zeigt den Akzent. Bestehende Tippfehler-Toleranz (ein Buchstabe oder Dreher ab 5 Zeichen) bleibt.
3. **Artikel** ist Teil der Vokabel (Découvertes listet Nomen mit Artikel: "la rentrée"). Fehlt er oder ist er falsch → `partial`. Umsetzung: Lösung `"la rentrée"`, Eingabe ohne Artikel wird gegen die Lösung ohne Artikel verglichen; Treffer dort heißt `partial`.

Alle übrigen Engine-Dateien unverändert. Tests in `lib/engine/*.test.ts`, die mit Fachcodes `M`/`D`/`B` arbeiten, werden auf `E`/`F` umgestellt, sonst nichts.

## 4. UI-Änderungen

1. **Akzentleiste** für Französisch: über dem Eingabefeld bei `vocab`, `cloze` und `cloze_free` Tasten `é è ê à ç ù â î ô û ë ï œ` (48 px, scrollbar). Erscheint nur, wenn das Item zum Fach `F` gehört. Einfügen an der Cursorposition.
2. **Namen**: "Felix" → "Paula" in `app/(parent)/eltern/page.tsx`, `app/(student)/willkommen/actions.ts`, `lib/data/exams.ts`, `lib/content/types.ts`, `lib/engine/focus.ts`, `planner.ts`, `scripts/seed.ts` (Default `display_name`), `scripts/setup-supabase.sh` (Prompts), `scripts/preview-items.ts`.
3. **App-Name**: "LevelUp10" → "LevelUp7" in `package.json`, `app/layout.tsx` (title, appleWebApp), `app/manifest.ts`, `components/streak/badge-optin.tsx`, `lib/data/reminders.ts`, `CLAUDE.md`, `scripts/setup-supabase.sh`. Icons in `public/` bekommen eine andere Farbe, damit die beiden Apps auf einem Home-Bildschirm unterscheidbar sind.
4. **Fach-Kacheln und Skill-Tree** zeigen zwei Fächer statt vier (Farben in `structure.json`: Englisch grün bleibt, Französisch blau).
5. Französisch-Aufgaben: Aufgabenstellung auf Deutsch, Inhalt auf Französisch (wie bei Englisch-Aufgaben in Felix' App). Erklärungen auf Deutsch.

Kein neuer Screen. Fokus-Modus, Eltern-Ansicht, Streak, Konto bleiben identisch.

## 5. Inhalte (`content/`)

- **Komplett löschen**: `content/mathe/`, `content/deutsch/`, `content/bwr/`, `content/englisch/` (E1/E2 sind Realschule-10-Grammatik, E3 sind Go-Ahead-Vokabeln). `content/structure.json` neu nach Abschnitt 2.
- **Neue Ordner**: `content/englisch/E1.json` … `E4.json`, `EV.json`; `content/franzoesisch/F0.json` … `F7.json`, `FV.json`.
- **Aufgabentypen** für Sprachen: `mc`, `cloze`, `cloze_free`, `order` (Satzbau, Stellung von Pronomen und Adverbien), `match`, `vocab`. `numeric`, `numeric_template`, `booking` bleiben im Code, werden nicht benutzt.
- **Niveau**: Gymnasium 7, Englisch 3. Lernjahr, Französisch 2. Lernjahr. Wortschatz in Grammatik-Aufgaben: Grundwortschatz, kein Wort, das Paula noch nicht hatte. Bei Unsicherheit einfacher wählen.
- **Regeln aus LevelUp10 gelten weiter**: `explanation` Pflicht (2 bis 4 Sätze, Deutsch), Distraktoren sind typische Schülerfehler (falsche Zeitform, Akkordfehler beim participe passé mit être, Adjektiv statt Adverb, falsche Stellung des Pronomens), alle Texte selbst geschrieben, keine Buchzitate, `item.code` stabil.
- **Vokabeln nur aus Fotos** (Memory-Regel). Kein Wort aus dem Gedächtnis oder dem Inhaltsverzeichnis.
- **Erste Füllung** (vor dem ersten Login von Paula): Englisch E1 (ca. 40 Aufgaben: Reflexivpronomen, Adverbien, one/possessive pronouns) und Französisch F0 (Wiederholung, ca. 30 Aufgaben zu den Themen, die Phil nennt) plus die Grammatik der aktuellen Unité. Danach nach Unterrichtsstand.

## 6. Slash-Commands (`.claude/commands/`)

- `/vokabeln-aus-foto <englisch|französisch> <Seiten | bis S. n> [test]`: wie bisher, mit Sprache als erstem Argument. Fotos in `assets/buecher/englisch/vokabeln/` (Dateiname `Unit<n>_S<Seite>.jpg`), `assets/buecher/franzoesisch/vokabeln/` (`Unite<n>_S<Seite>.jpg`) und `assets/buecher/franzoesisch-band1/vokabeln/` (`Unite<n>_S<Seite>.jpg`, Skill FV.0). Französisch: Artikel gehört zur Lösung, Hinweis nennt das Genus nicht (sonst ist der Artikel geschenkt). Protokoll `docs/vokabeln.md` mit Spalte Sprache.
- `/mehr-aufgaben <unit_code> <anzahl>` und `/pruefe-aufgaben <unit_code>`: bei Felix noch offen, hier gleich anlegen, weil Sprach-Aufgaben häufiger nachgelegt werden.

## 7. Ablauf in Tagen

**Tag 0 (nach Plan-Freigabe, ca. 3 Stunden Claude Code, Phil liefert nur das Repo):**
1. `git init` in `LevelUp7/`, `git fetch ../LevelUp10 main`, `git reset --hard FETCH_HEAD`, dann `origin` auf Phils neues GitHub-Repo. Historie bleibt für spätere Cherry-Picks. LevelUp10 als zweites Remote `levelup10`.
2. Umbenennen (Abschnitt 4, Punkte 2 und 3), Inhalte löschen, `structure.json` neu, Engine-Konstanten (Abschnitt 3), Tests grün, `npm run build` grün.
3. `CLAUDE.md`, `PLAN.md`, `docs/lehrplan-struktur.md` (LehrplanPLUS Gymnasium 7 Englisch und Französisch 2. FS, Quellen unten), `docs/schulbuecher.md` (Gerüst, Kapitel folgen aus Fotos) neu schreiben. `docs/entscheidungen.md`, `docs/vokabeln.md`, `docs/naechste-schritte.md` leeren. `docs/fokus-modus.md` behalten (Felix → Paula).
4. Erste Englisch-Aufgaben E1 (Grammatik laut Stoffverteilungsplan Unit 1). Commit, Push.

**Tag 1 (Phil, ca. 30 Minuten, mit Wizard):** Supabase-Projekt `levelup7` anlegen, Migrationen einspielen, Paulas E-Mail und Passwort, Vercel-Projekt mit dem Repo verbinden, Env-Vars setzen, Seed. Danach Fotos (Abschnitt 8). Claude Code schreibt parallel F0 und die aktuelle Unité.

**Tag 2 (Claude Code):** Akzentleiste, Bewertungs-Erweiterungen (Akzente, Artikel, qn/qc) mit Tests, `/vokabeln-aus-foto` für zwei Sprachen, erste Vokabelfotos einspielen, Paula legt die App aufs iPhone.

**Tag 3 (Paula-Regel):** Was Paula nervt, wird gefixt, bevor irgendetwas Neues gebaut wird.

## 8. Was Phil liefern muss

| Was | Wofür | Wann |
|---|---|---|
| GitHub-Repo `levelup7` (privat) | Tag 0, Schritt 1 | heute |
| Supabase- und Vercel-Projekt (Wizard führt durch) | Tag 1 | nach Tag 0 |
| Paulas E-Mail und Passwort, Eltern-E-Mail | Seed | Tag 1 |
| Fotos: Inhaltsverzeichnisse von Green Line 3, Découvertes 2, Découvertes 1 | `docs/schulbuecher.md`, Skill-Zuordnung, `schedule_order` | Tag 1 |
| Unterrichtsstand: welche Unit/Unité läuft, welche Band-1-Themen werden wiederholt | Kalender, F0 | Tag 1 |
| Fotos der Vokabelseiten bis zum Unterrichtsstand (beide Bücher, ggf. Band 1) | `/vokabeln-aus-foto` | Tag 2 |
| Termine der nächsten Schulaufgaben (oder Paula trägt sie selbst ein) | Fokus-Modus | sobald bekannt |
| Letzter Schultag vor den Sommerferien 2027 (Claude Code prüft auf km.bayern.de) | Kalenderende | Tag 0 |

## 9. Bewusst nicht gebaut

- Gemeinsame Eltern-Ansicht für Felix und Paula (Phil: zwei Apps sind in Ordnung).
- Hörverstehen mit Audio, Aussprache, Sprechen: wie bei Felix nicht per Quiz prüfbar ohne KI.
- Freies Schreiben (E-Mail, Tagebucheintrag) mit Bewertung: nur als `self_check` denkbar, erst wenn Paula die App nach 3 Wochen noch nutzt.
- Konjugationstrainer als eigener Modus: Konjugation läuft über `cloze`-Items in den Grammatik-Skills, kein eigener Screen.

## 10. Quellen (verifiziert 2026-10-05)

- Green Line 3 Bayern: https://www.klett.de/produkt/isbn/978-3-12-803030-2 (Gymnasium, Englisch 1. FS, Klasse 7, LehrplanPLUS-zugelassen)
- Stoffverteilungsplan Green Line 3 Bayern: https://asset.klett.de/assets/1a0a821/Stoffverteilungsplan_GLBY_Bd3_803030.pdf
- Découvertes 2 Bayern: https://www.klett.de/produkt/isbn/978-3-12-622278-5 (2. Lernjahr, 7 Unités, 3 Plateaus)
- Stoffverteilungsplan Découvertes 2 Bayern: https://assets.klett.de/assets/83a1e6ec/SVP_Decouvertes_BY_2.pdf
- Découvertes 1 Bayern: https://www.klett.de/produkt/isbn/978-3-12-622268-6 (1. Lernjahr, Vorkurs plus 7 Unités)
- LehrplanPLUS Englisch Gymnasium 7 (1. FS): https://www.lehrplanplus.bayern.de/fachlehrplan/gymnasium/7/englisch/1-fremdsprache
- LehrplanPLUS Französisch Gymnasium 7 (2. FS): https://www.lehrplanplus.bayern.de/fachlehrplan/gymnasium/7/franzoesisch/2-fremdsprache
