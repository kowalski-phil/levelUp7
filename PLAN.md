# LevelUp10 – Bauplan

Lern-App für Felix, 10. Klasse Realschule Bayern, Wahlpflichtfächergruppe II.
Vier Prüfungsfächer: Deutsch, Englisch, Mathe II, BwR. Abschlussprüfung Ende Juni 2027.

Geplant mit Fable 5.1 am 2026-09-23. Gebaut wird mit Opus 5.5 in Claude Code.
Ziel: In wenigen Tagen eine nutzbare App auf Vercel, die Felix jeden Tag 15 Minuten beschäftigt, ohne dass er etwas entscheiden muss.

---

## 1. Grundsatzentscheidungen

| Thema | Entscheidung | Warum |
|---|---|---|
| Kein Anthropic-API-Key, keine Live-KI in der App | Alle Aufgaben werden von Claude Code (Opus 5.5) während des Builds als JSON-Dateien ins Repo geschrieben und per Skript in die Datenbank geladen. Die App läuft danach ohne KI-Kosten. | Phil hat eine Claude-Subscription, kein separates API-Budget. Claude Code ist ohnehin der Generator. |
| Die App entscheidet, nicht Felix | Felix öffnet die App und sieht genau eine Sache: "Heute: 12 Aufgaben, ca. 15 Min. Los." Kein Themenwählen, keine Einstellungen, keine Menü-Odyssee. | Ein skeptischer 15-Jähriger trifft keine Lernentscheidungen. Jede Entscheidung, die man ihm abverlangt, ist ein Ausstiegspunkt. |
| Schuljahres-Kalender statt Schulbuch-Sync | Die App verteilt die LehrplanPLUS-Lernbereiche automatisch auf die Zeit von jetzt bis Mai 2027, gewichtet nach den offiziellen Stundenangaben. Ab Mai: reiner Prüfungsmodus. | Der echte Unterricht folgt demselben Lehrplan. Abweichungen um ein paar Wochen sind egal, weil Spaced Repetition alles Alte ohnehin weiter wiederholt. |
| Minimal-Dosis 15 Minuten, jeden Tag alle 4 Fächer | 12 Aufgaben pro Tag, 3 pro Fach. Fertig = Streak-Tag. | Kleine Dosis, kein Fach wird tagelang vergessen. |
| Belohnung ist echtes Geld | Phil legt im Eltern-Login Beträge fest: Wochen-Streak-Bonus und Meilensteine (30/60/100 Tage, Prüfungstag). Die App führt ein Konto, Phil markiert "ausgezahlt". | Phil hat gewählt: Taschengeld-Bonus plus große Meilenstein-Belohnungen. Reine XP-Gamification reicht bei Skepsis nicht. |
| Eltern-Login sieht nur Überblick | Streak, Minuten pro Tag, Fach-Ampel, schwächste Skills, Belohnungskonto. Kein Eingriff in Inhalte. | Phils Wahl. Kontrolle killt Motivation. |
| Web-App als PWA, kein App Store | Next.js auf Vercel, auf iPhone und iPad zum Home-Bildschirm hinzufügen. Vollbild, App-Icon, Web-Push für die tägliche Erinnerung. | Kein Apple-Developer-Account, kein Review, in Stunden live. |
| Supabase für Auth und Daten | Postgres mit Row Level Security, E-Mail/Passwort-Login für beide Rollen. | Phil hat Zugang. Airtable/NocoDB haben keine saubere Auth und keine RLS. |

---

## 2. Tech-Stack (alles Opus-5.5-sicher, Mainstream, gut dokumentiert)

- **Next.js** (App Router, TypeScript) über `create-next-app`, aktuelle stabile Version
- **Tailwind CSS** plus **shadcn/ui** für Komponenten
- **Supabase**: Auth (E-Mail/Passwort), Postgres, RLS. Client über `@supabase/ssr`
- **PWA**: `manifest.webmanifest`, Apple-Meta-Tags, Service Worker nur für App-Shell-Caching (kein Offline-Lernen in Phase 1)
- **Web Push**: Vercel Cron Job plus `web-push`-Paket mit VAPID-Keys. Phase 3, nicht Tag 1.
- **Spaced Repetition**: eigene SM-2-Implementierung (ca. 40 Zeilen), keine Fremdbibliothek
- **Formeln**: KaTeX für Mathe-Darstellung
- **Deployment**: Vercel, verbunden mit GitHub-Repo, Env-Vars für Supabase
- **Tests**: Vitest für die Lernengine (Tagesplan, SM-2, Kalender). UI wird per Hand auf iPhone getestet.

Nicht verwenden: Redux, Prisma, tRPC, eigene Backend-Server, Native-Wrapper (Capacitor), KI-APIs.

---

## 3. Datenmodell (Supabase / Postgres)

```
profiles           id (= auth.users.id), role ('student'|'parent'), family_id, display_name
families           id, student_id, parent_id, school_year_start (date), exam_date (date)

subjects           id, code ('D','E','M','B'), name, color
units              id, subject_id, code ('M4'), title, hours (int), order_index
skills             id, unit_id, code ('M4.3'), title, description
items              id, code ('M4-017'), skill_id, type, payload (jsonb), difficulty (1-3), version
unit_schedule      subject_id, unit_id, week_from, week_to

item_state         student_id, item_id, ease (float), interval_days (int), due_date, reps, lapses, last_result
sessions           id, student_id, date, planned_item_ids (jsonb), started_at, finished_at, duration_sec, correct, total
answers            id, session_id, item_id, result ('correct'|'wrong'|'partial'|'skipped'), answer (jsonb), time_sec

streaks            student_id, current, longest, jokers (int), last_completed_date
rewards_config     family_id, weekly_streak_bonus_eur, milestones (jsonb: [{days:30, eur:20, label:"..."}])
rewards_ledger     id, student_id, type, amount_eur, earned_at, paid_at (null = offen)
push_subscriptions student_id, endpoint, keys (jsonb)
```

RLS-Regeln:
- Schüler liest und schreibt nur Zeilen mit eigener `student_id`.
- Elternteil liest alle Zeilen des Schülers in der eigenen `family_id`, schreibt nur `rewards_config` und `rewards_ledger.paid_at`.
- `subjects`, `units`, `skills`, `items`, `unit_schedule` sind für eingeloggte Nutzer lesbar, schreibbar nur über Service-Role (Seed-Skript).

---

## 4. Lernengine (das Herz der App)

### 4.1 Schuljahres-Kalender (automatisch, einmal beim Seed berechnet)

Zeitraum: `school_year_start` (16.09.2026) bis Prüfungsbeginn minus 6 Wochen (ca. 10.05.2027) = ca. 34 Wochen Neustoff.
Pro Fach werden die Lernbereiche in LehrplanPLUS-Reihenfolge auf diese Wochen verteilt, proportional zu ihren Stunden.

Beispiel Mathe II (96 Std. auf 34 Wochen):
M1 Trigonometrie Wochen 1-7, M2 Raumgeometrie Wochen 8-14, M3 Exponential Wochen 15-18, M4 Quadratische Funktionen Wochen 19-31, M5 Daten und Zufall Wochen 32-34.

Deutsch und Englisch haben keine echte Reihenfolge, dort rotieren die Skills wöchentlich, Erörterungs- und Grammatik-Skills laufen durchgehend mit.

Ab Mai 2027: Prüfungsmodus. Keine neuen Skills, nur noch Wiederholung, gewichtet nach Schwäche und Prüfungsnähe (Deutsch und Englisch zuerst, weil sie zuerst geprüft werden).

Der Kalender liegt in `unit_schedule` und darf von Phil per SQL angepasst werden, falls die Klasse deutlich abweicht. Felix sieht davon nichts.

### 4.2 Tagesplan (wird beim Öffnen der App erzeugt, einmal pro Tag)

12 Aufgaben, 3 pro Fach:
1. Zuerst fällige Wiederholungen (`item_state.due_date <= heute`), älteste zuerst, max. 2 pro Fach.
2. Rest mit neuen Aufgaben aus dem laut Kalender aktuellen Lernbereich, aufsteigend nach Schwierigkeit.
3. Reihenfolge in der Session: Fächer abwechseln (M, D, B, E, M, D, ...), damit es nicht monoton wird.
4. Wenn Felix an einem Tag nichts gemacht hat, wird am nächsten Tag NICHT nachgeholt. 12 bleibt 12. Der Rückstand geht in Spaced Repetition auf, nicht in Schuldgefühle.

Nach den 12 Aufgaben: "Fertig für heute" plus Streak-Flamme. Optional "Bonus-Runde" mit 6 weiteren Aufgaben, zählt als XP, nicht für Streak.

### 4.3 Spaced Repetition (SM-2, vereinfacht)

```
richtig:   reps += 1; interval = reps==1 ? 1 : reps==2 ? 3 : round(interval * ease); ease = min(2.8, ease + 0.1)
teilweise: interval = max(1, round(interval * 0.5)); ease = max(1.3, ease - 0.1)
falsch:    reps = 0; interval = 1; ease = max(1.3, ease - 0.2); lapses += 1
due_date = heute + interval;  Startwerte: ease 2.5, interval 0, reps 0
```
Item mit `lapses >= 4` gilt als Problemfall und taucht im Eltern-Dashboard unter "schwächste Skills" auf.

### 4.4 Streak und Joker

- Streak-Tag = Tagessession abgeschlossen (alle 12 beantwortet, Richtigkeit egal).
- Alle 14 Streak-Tage: 1 Joker, max. 2 im Vorrat (bis 2026-09-26 waren es 7).
- Verpasster Tag: Joker wird automatisch verbraucht, Streak bleibt. Kein Joker: Streak auf 0.
- Ferien zählen ganz normal. 15 Minuten gehen immer.

### 4.5 XP und Level (kosmetisch, aber sichtbar)

- 10 XP pro richtiger Aufgabe, 5 pro teilweise, 2 pro falsch (der Versuch zählt).
- Level = floor(sqrt(XP / 100)). Levelnamen mit Augenzwinkern ("Azubi", "Sachbearbeiter", ..., "Prüfungsboss").
- Skill-Tree pro Fach: jeder Skill hat 0-3 Sterne, berechnet aus der Trefferquote der letzten 10 Antworten.

---

## 5. Aufgabentypen (alle ohne KI auswertbar)

| Typ | Auswertung | Fächer |
|---|---|---|
| `mc` Multiple Choice, 1 richtig aus 4 | exakt | alle |
| `mc_multi` mehrere richtig | exakt | D, E, B |
| `numeric` Zahleneingabe mit Toleranz und Einheit | `abs(x - lösung) <= toleranz` | M, B |
| `numeric_template` parametrisierte Aufgabe: Zahlen werden beim Ausspielen zufällig aus Bereichen gezogen, Lösung per Formel im Payload berechnet | Formel-Auswertung im Code | M, B (unendlicher Vorrat für Rechenroutine) |
| `cloze` Lückentext, Auswahl aus Dropdown pro Lücke | exakt | D, E |
| `cloze_free` Lückentext mit Texteingabe, mehrere akzeptierte Schreibweisen | normalisierter Vergleich | E (Vokabeln), D (Rechtschreibung) |
| `order` Elemente in richtige Reihenfolge bringen | exakt | D (Erörterung: Einleitung, These, Argument, Beleg...), B (Kalkulationsschema) |
| `match` Paare zuordnen | exakt | B (Konto zu Bilanzposten), E (Wort zu Definition) |
| `booking` Buchungssatz: Soll-Konto, Haben-Konto, Betrag | exakt pro Feld | B |
| `self_check` freie Kurzantwort, danach Musterlösung, Felix bewertet sich selbst (richtig/teilweise/falsch) | Selbsteinschätzung | D (Deutungshypothese, Argument formulieren), E (Speaking-Prompt, E-Mail-Satz) |

Jedes Item hat: `code`, `skill_code`, `type`, `difficulty`, `stem` (Aufgabentext, Markdown mit KaTeX), `payload` je nach Typ, `solution`, `explanation` (2-4 Sätze Lösungsweg).
Die `explanation` ist Pflicht. Sie ist der "Tutor" ohne KI: Bei falscher Antwort wird sie sofort gezeigt.

Beispiel `numeric_template` (BwR B4, Deckungsbeitrag):
```json
{
  "code": "B4-003",
  "skill_code": "B4.2",
  "type": "numeric_template",
  "difficulty": 1,
  "stem": "Ein Produkt wird für {{preis}} Euro verkauft. Die variablen Kosten je Stück betragen {{vk}} Euro. Wie hoch ist der Deckungsbeitrag je Stück?",
  "payload": {
    "params": { "preis": { "min": 40, "max": 120, "step": 5 }, "vk": { "min": 15, "max": 35, "step": 1 } },
    "formula": "preis - vk",
    "unit": "Euro",
    "tolerance": 0.01
  },
  "explanation": "Deckungsbeitrag je Stück = Verkaufspreis minus variable Stückkosten. Er zeigt, wie viel jedes verkaufte Stück zur Deckung der Fixkosten beiträgt."
}
```

---

## 6. Inhaltserzeugung (durch Claude Code, nicht durch die App)

Struktur: `content/<fach>/<unit_code>.json`, ein Array von Items im Schema aus Abschnitt 5.
Skill-Struktur: `docs/lehrplan-struktur.md` (verifiziert gegen LehrplanPLUS).
Stil- und Niveau-Referenz: die Illustrierenden Aufgaben aus LehrplanPLUS (Servicematerialien auf jeder Lernbereichsseite) und `assets/`.

Mengenziel für den ersten Build:
- Mathe II: 5 Units × 40 Items, davon mindestens 15 `numeric_template` pro Unit
- BwR: 4 Units × 40 Items, davon mindestens 10 `booking` und 10 `numeric_template` pro Unit
- Deutsch: 4 Units × 35 Items, Schwerpunkt D3 (Erörterung/TGA-Bausteine) und D4 (Rechtschreibung, Kommaregeln, Grammatik)
- Englisch: E1 und E2 je 60 Items (Vokabeln aus den Themengebieten, Grammatik-Cloze, Reading-MC mit kurzen selbstgeschriebenen Texten, Speaking-Prompts als `self_check`)
- Summe ca. 800 Items. Mit Templates und Spaced Repetition reicht das für Monate.

Nachschub: Claude-Code-Command `/mehr-aufgaben <unit_code> <anzahl>` (Slash-Command im Repo) erzeugt weitere Items in dieselbe Datei. Das Seed-Skript ist idempotent (Upsert nach `item.code`).

Qualitätsregeln für jedes Item (stehen auch in `CLAUDE.md` des Projekts):
- Niveau Realschule 10, Sprache wie im Unterricht, keine Gymnasial-Tiefe
- Zahlen realistisch, Ergebnisse "glatt" wo im Unterricht üblich
- Deutsch/Englisch: Texte selbst geschrieben, keine urheberrechtlich geschützten Buchauszüge
- Jede Erklärung nennt den Lösungsweg, nicht nur das Ergebnis
- Distraktoren bei MC müssen typische Schülerfehler sein, keine Quatsch-Optionen

Phils Rolle: Nach dem Seed 10 zufällige Items pro Fach in der App durchklicken. Fehler direkt in der JSON fixen, Seed erneut laufen lassen.

---

## 7. Screens (Mobile first, iPhone-Breite ist der Default)

Schüler:
1. **Login** – E-Mail, Passwort, "eingeloggt bleiben". Einmal, dann nie wieder.
2. **Home** – Ein großer Button "Heute starten (12 Aufgaben, ~15 Min)". Darüber Streak-Karte mit Wochenzeile (Tippen öffnet die Streak-Seite), nächste Schulaufgabe, Belohnungskonto in Euro. Darunter vier Fach-Kacheln mit Sterne-Fortschritt. Sonst nichts.
3. **Session** – Eine Aufgabe pro Bildschirm, Fortschrittsbalken oben (1/12), Antwort, sofortiges Feedback grün/rot mit Erklärung, Button "Weiter". Keine Rückwärts-Navigation.
4. **Fertig** – Ergebnis (9/12), XP, Streak +1, ggf. "Joker verdient", ggf. "Wochenbonus: +5 Euro". Buttons "Bonus-Runde" und "Fertig".
5. **Skill-Tree** – pro Fach die Lernbereiche als Pfad (wie Duolingo), jeder Skill mit Sternen, aktueller Lernbereich hervorgehoben. Nur Ansicht, einzige Aktion: "Bonus-Runde in diesem Gebiet".
6. **Konto** – Belohnungs-Verlauf: verdient, ausgezahlt, offen.

Eltern:
1. **Dashboard** – Streak, Kalender-Heatmap der letzten 8 Wochen (Tag gemacht/nicht), Minuten pro Tag, Trefferquote pro Fach als Ampel, Top-5 schwächste Skills im Klartext ("BwR: Buchungssätze Rückstellungen, 3/10 richtig").
2. **Belohnungen** – Beträge konfigurieren, offene Auszahlungen als "bezahlt" markieren.

Onboarding-Text für Felix: Der Entwurf aus `levelup10_konzept.md` ("Hi Felix, willkommen im Finale.") wird als einmaliger Screen nach dem ersten Login gezeigt, gekürzt auf 5 Sätze. Danach nie wieder.

Design: Dunkles Theme als Default, eine Akzentfarbe pro Fach, große Touch-Ziele (min. 48 px), keine Schulbuch-Optik, keine Kinder-Optik. Referenz: Duolingo-Session-Flow, Reduktion der Streaks-App.

---

## 8. Build-Plan (Opus 5.5, Tage statt Wochen)

Vorbereitung durch Phil (10 Minuten, siehe Abschnitt 9), dann:

**Tag 1: Skelett und Engine**
1. `create-next-app`, Tailwind, shadcn, Supabase-Client, PWA-Manifest
2. SQL-Migration mit dem Datenmodell aus Abschnitt 3 inkl. RLS
3. Auth-Flow (Login, Session-Cookie, Rollen-Redirect)
4. Lernengine als reine TypeScript-Module mit Vitest-Tests: `calendar.ts`, `planner.ts`, `sm2.ts`, `streak.ts`, `rewards.ts`
5. Inhalte Mathe II und BwR generieren, Seed-Skript
6. Screens Home, Session, Fertig. Abends: erste Session auf Phils iPhone durchspielen.

**Tag 2: Inhalt und Sichtbarkeit**
1. Inhalte Deutsch und Englisch generieren und seeden
2. Skill-Tree-Screen, Konto-Screen
3. Eltern-Dashboard und Belohnungs-Konfiguration
4. Deploy auf Vercel, Supabase-Env-Vars
5. Felix bekommt Login. Onboarding-Screen.

**Tag 3: Reibung entfernen**
1. Web-Push: tägliche Erinnerung zu einer festen Uhrzeit (Phil legt sie fest, z. B. 17:30), zweite Erinnerung um 20:30 falls nicht erledigt
2. Alles, was Felix an Tag 2 genervt hat, fixen. Das ist der wichtigste Punkt des ganzen Plans.
3. Slash-Commands `/mehr-aufgaben` und `/pruefe-aufgaben` einrichten
4. Stichprobe der Inhalte durch Phil

Danach: Wöchentlich 15 Minuten Claude-Code-Session für Nachschub und Fixes.

---

## 9. Was Phil selbst tun muss (nur das, was Claude Code nicht kann)

1. Supabase-Projekt anlegen (Region Frankfurt), Project URL, Anon Key und Service Role Key bereithalten
2. GitHub-Repo anlegen (privat), mit Vercel verbinden
3. In Vercel die drei Supabase-Env-Vars eintragen
4. Zwei Accounts: Felix und Phil. Claude Code legt sie per Seed an, Phil vergibt die Passwörter.
5. Belohnungsbeträge festlegen. Vorschlag zum Start: 5 Euro pro 7-Tage-Streak, Meilensteine 30 Tage = 20 Euro, 60 Tage = 30 Euro, 100 Tage = 50 Euro, Prüfungstag mit laufendem Streak = 100 Euro. Maximalfall bei 270 Tagen ca. 390 Euro. Beträge sind Phils Sache, das Prinzip ist: wöchentlich spürbar, Meilensteine groß.
6. Felix das Icon auf den Home-Bildschirm legen lassen und die Push-Erlaubnis geben (iOS fragt nur im Home-Screen-Modus).

Opus 5.5 soll für Schritte 1-3 den `wizard`-Skill nutzen, damit Phil eine interaktive Schritt-für-Schritt-Anleitung bekommt statt einer Doku.

---

## 10. Bewusst weggelassen (Phase 2, nur wenn Felix die App nach 3 Wochen noch nutzt)

- KI-Tutor und Bewertung freier Texte (bräuchte API oder manuelle Korrektur durch Phil)
- Offline-Modus
- Hörverstehen mit Audio (Englisch Listening, Deutsch D1): technisch machbar mit Browser-TTS, aber erst wenn die Basis läuft
- Echte alte Abschlussprüfungen: nur über Lehrer-Login im mebis-Archiv vollständig, daher nicht eingeplant. Ab Mai können Prüfungs-Simulationen aus dem Pool zusammengestellt werden.
- Zweites Kind, mehrere Familien: Datenmodell lässt es zu, UI ist darauf nicht ausgelegt.

---

## 11. Risiken, ehrlich

| Risiko | Gegenmaßnahme |
|---|---|
| Felix macht 3 Tage mit und hört auf | Tag 3 des Build-Plans ist ausschließlich dafür da, seine Einwände zu fixen. Belohnung ab Woche 1 spürbar. Push-Erinnerung. Kein Nachholen, kein Schuldgefühl. |
| Aufgaben haben Fehler | Erklärung bei jeder Aufgabe zeigt den Lösungsweg, Fehler fallen sofort auf. Phil stichprobt. JSON-Fix in 1 Minute, `/pruefe-aufgaben` als zweites Auge. |
| Kalender weicht vom Unterricht ab | `unit_schedule` per SQL anpassbar. Spaced Repetition federt ab. |
| Deutsch-Erörterung lässt sich nicht per Quiz lernen | Stimmt für den Gesamttext. Die Bausteine (Argumentstruktur, Übergänge, Gliederung, Stilmittel, Zeichensetzung) sehr wohl. Das ganze Aufsatzschreiben bleibt Aufgabe der Schule. |
| iOS-Web-Push funktioniert nicht | Fallback: Phil erinnert. Ab iOS 16.4 funktioniert es zuverlässig im Home-Screen-Modus. |

---

## 12. Fokus-Modus (Nachtrag 2026-09-26)

Gezielt auf eine Schulaufgabe lernen: Felix trägt Fach, Datum und Themen ein, die App liefert Fokus-Runden nur aus diesen Themen und färbt die Tagessession. Entweder Tagessession oder Fokus-Runde sichert den Streak. Vollständiger Bauplan mit Datenmodell, Engine, Tests und Screens: `docs/fokus-modus.md`. Wird vor Phase 4 gebaut.
