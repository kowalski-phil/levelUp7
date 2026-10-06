# Nächste Schritte

Stand 2026-10-06.

> **Erste Frage an Phil zu Beginn jeder Sitzung, solange offen:** Wie weit ist Paula im Unterricht? Gesucht ist je eine Buchseite für Green Line 3 und für Découvertes 2, z. B. „Englisch bis S. 14, Französisch bis S. 20“. Paula erklärt es Phil, wenn sie aus der Schule kommt. Danach Vokabeln importieren: `/vokabeln-aus-foto englisch bis S. n` (Fotos S. 183–193 liegen da) und `/vokabeln-aus-foto französisch bis S. n` (Fotos S. 182–187 liegen da). Dann diesen Hinweis löschen.

Was entschieden wurde, steht in `docs/entscheidungen.md`, der Ablauf in `PLAN.md` Abschnitt 8.

## Für Phil (Tag 1)

1. ~~Supabase und Vercel~~ Erledigt 2026-10-05: Supabase selbst gehostet (Easypanel), Tabellen und Seed drin, Vercel-Projekt `levelup7` mit 6 Env-Vars.
2. ~~App-Adresse~~ https://levelup7-liard.vercel.app
3. ~~Fotos der Inhaltsverzeichnisse~~ Erledigt 2026-10-06, eingetragen in `docs/schulbuecher.md`.
4. **Unterrichtsstand** (offen, Paula fragen): bis zu welcher Seite in Green Line 3 und in Découvertes 2? Band 1 wird nur über Vokabeln wiederholt.
5. **Repo privat?** Der Klon-Plan sah ein privates Repo vor, `levelUp7` ist öffentlich (wie `levelup10`).
6. ~~Fotos der Vokabelseiten~~ liegen da (Englisch S. 183–193, Französisch S. 182–187). Offen: Termine der nächsten Schulaufgaben.

Erledigt 2026-10-05: 71 Vokabeln Band 1 (S. 195–199) eingespielt, Bewertung für Französisch, `/vokabeln-aus-foto` für beide Sprachen, Push-Knopf auf Android, Testdaten von Paula zurückgesetzt.

## Backlog für Claude Code (in dieser Reihenfolge)

1. **Sobald der Unterrichtsstand da ist:** Vokabeln EV und FV bis zur genannten Seite importieren, Grammatik der aktuellen Unité, `schedule_order`/Stunden nach Unterrichtsstand. (Erledigt: Unité-Titel aus dem Inhaltsverzeichnis. Entfällt: F0-Grammatik, Band 1 nur Vokabeln.)
2. **Akzentleiste** (Französisch, `vocab` und `cloze_free`). Auf Android gehen Akzente per langem Tastendruck, deshalb nicht dringend.
3. **Slash-Commands** `/mehr-aufgaben` und `/pruefe-aufgaben`.
4. **E1.4 Reading** und die Grammatik von E2 vor Ende von Unit 1.
5. ~~`VAPID_SUBJECT`~~ steht auf https://levelup7-liard.vercel.app.
6. `scripts/setup-supabase.sh` passt nicht mehr zum selbst gehosteten Supabase.

Offen zum Nachdenken: Wählt Paula im Fokus-Modus ein Vokabel-Thema (EV.1), kommen in der Fokus-Runde Vokabeln, in der Tagesrunde nicht (die Vokabelspur ignoriert Schulaufgaben). Erst klären, wenn es Paula auffällt.

Tag-3-Regel: Was Paula nervt, wird gefixt, bevor irgendetwas Neues gebaut wird.
