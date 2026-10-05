# Nächste Schritte

Stand 2026-10-05, nach Tag 0. Was entschieden wurde, steht in `docs/entscheidungen.md`, der Ablauf in `PLAN.md` Abschnitt 8.

## Für Phil (Tag 1)

1. ~~Supabase und Vercel~~ Erledigt 2026-10-05: Supabase selbst gehostet (Easypanel), Tabellen und Seed drin, Vercel-Projekt `levelup7` mit 6 Env-Vars.
2. ~~App-Adresse~~ https://levelup7-liard.vercel.app
3. **Fotos der Inhaltsverzeichnisse** von Découvertes 2 (zuerst), Green Line 3 und Découvertes 1. Ordner: `assets/buecher/<franzoesisch|englisch|franzoesisch-band1>/inhalt/`.
4. **Unterrichtsstand**: Welche Unit läuft in Englisch, welche Unité in Französisch, welche Band-1-Themen werden gerade wiederholt?
5. **Repo privat?** Der Klon-Plan sah ein privates Repo vor, `levelUp7` ist öffentlich (wie `levelup10`).
6. Später: Fotos der Vokabelseiten bis zum Unterrichtsstand, Termine der nächsten Schulaufgaben.

Erledigt 2026-10-05: 71 Vokabeln Band 1 (S. 195–199) eingespielt, Bewertung für Französisch, `/vokabeln-aus-foto` für beide Sprachen, Push-Knopf auf Android, Testdaten von Paula zurückgesetzt.

## Backlog für Claude Code (in dieser Reihenfolge)

1. **Tag 1:** F0 nach Phils Themen, Grammatik der aktuellen Unité, `schedule_order`/Stunden nach Unterrichtsstand, Unité-Titel aus dem Inhaltsverzeichnis.
2. **Akzentleiste** (Französisch, `vocab` und `cloze_free`). Auf Android gehen Akzente per langem Tastendruck, deshalb nicht dringend.
3. **Slash-Commands** `/mehr-aufgaben` und `/pruefe-aufgaben`.
4. **E1.4 Reading** und die Grammatik von E2 vor Ende von Unit 1.
5. ~~`VAPID_SUBJECT`~~ steht auf https://levelup7-liard.vercel.app.
6. `scripts/setup-supabase.sh` passt nicht mehr zum selbst gehosteten Supabase.

Offen zum Nachdenken: Wählt Paula im Fokus-Modus ein Vokabel-Thema (EV.1), kommen in der Fokus-Runde Vokabeln, in der Tagesrunde nicht (die Vokabelspur ignoriert Schulaufgaben). Erst klären, wenn es Paula auffällt.

Tag-3-Regel: Was Paula nervt, wird gefixt, bevor irgendetwas Neues gebaut wird.
