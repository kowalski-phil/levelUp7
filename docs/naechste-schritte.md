# Nächste Schritte

Stand 2026-09-28. Was zuletzt gebaut und entschieden wurde, steht in `docs/entscheidungen.md`.
Die App ist live: https://levelup10-zeta.vercel.app

## Für Phil

1. Heute Abend mit Felix: App auf seinem iPhone zum Home-Bildschirm hinzufügen und einloggen.
2. Optional: schönere Adresse in Vercel (Projekt → Settings → Domains), bevor Felix die App auf den Home-Bildschirm legt.
3. Optional: GitHub-Repo auf privat stellen (laut PLAN.md so gedacht, ist aktuell öffentlich).

## Backlog für Claude Code (in dieser Reihenfolge)

1. ~~**Logout.**~~ Erledigt 2026-09-28: "Abmelden" unten auf Home (Felix) und oben im Eltern-Überblick, mit Rückfrage.
2. **Deutsch und Englisch.** Erste Runde am 2026-09-28 eingespielt:
   - Deutsch D4: 40 Aufgaben, je 20 zu Kommasetzung (D4.4) und Groß-/Kleinschreibung inkl. das/dass (D4.3).
   - Englisch E2: 60 Aufgaben: 30 Zeiten (E2.2, LF1), 15 Passiv (E2.4), 15 Modalverben (E2.3). Die zuerst geschriebenen 30 Vokabelaufgaben sind wieder raus, Vokabeln gehören nicht in die App.
   - Offen: D4.1/D4.2 (Satzglieder, Konjunktiv, Aktiv/Passiv), D2 und D3 (Textverständnis, Erörterung), E1 (Reading, Writing, Speaking) und E2.3 und E2.4 vertiefen (past modals, conditionals, reported speech) und E2.5 (Relative clauses). Reihenfolge nach Unterrichtsstand, Felix fragen.
3. **Push-Erinnerung** (PLAN.md Tag 3): tägliche Erinnerung zu fester Uhrzeit, zweite abends falls nicht erledigt. Bringt auch die Streak-Zahl aufs App-Icon.
4. **Slash-Commands** `/mehr-aufgaben` und `/pruefe-aufgaben` in `.claude/commands/`.
5. **Rest von PLAN.md Tag 2:**
   - Skill-Tree-Screen (was Felix schon kann)
   - Konto-Screen (Belohnungen: verdient, ausgezahlt, offen)
   - Eltern-Login: Belohnungsbeträge einstellen, Auszahlungen als "bezahlt" markieren
   - Onboarding-Screen für Felix' ersten Start

Tag-3-Regel: Was Felix nervt, wird gefixt, bevor irgendetwas Neues gebaut wird.
