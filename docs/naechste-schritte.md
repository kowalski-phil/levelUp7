# Nächste Schritte

Stand 2026-09-27. Was zuletzt gebaut wurde, steht in `docs/entscheidungen.md`.

## Für Phil

1. Die App lokal ansehen: `http://localhost:3010` (Dev-Server mit `npm run dev`, falls er nicht mehr läuft).
   - Als Felix: Home mit Streak-Karte und Wochenzeile, Streak-Seite (Tippen auf die Streak-Karte), nächste Schulaufgabe, neue Fächerfarben, Fokus-Runde.
   - Als Elternteil: Abschnitt "Schulaufgaben" und "Letzte Tage" mit Fokus-Runden.
2. Felix fragen, ob die BwR-Begriffe Einnahme/Ausgabe zu seinem Heft passen (umgestellt am 2026-09-26).
3. Felix fragen, welches Mathe-Kapitel nach Daten und Zufall kommt. Angenommen ist Trigonometrie (Buchreihenfolge).
4. Wenn alles passt: Okay für den Deploy geben. Vorher werden die Testdaten in Felix' Konto gelöscht (Schulaufgabe BwR, Fokus-Runde, Streak 1).

## Für Claude Code (nach Phils Okay)

1. Testdaten in Felix' Konto löschen.
2. Deploy auf Vercel (PLAN.md Abschnitt 8, Tag 2): GitHub-Repo, Vercel-Projekt, Env-Vars. Schritte für Phil über den `wizard`-Skill.
3. Phase 4: Inhalte Deutsch und Englisch schreiben. Reihenfolge nach `docs/schulbuecher.md`:
   - Deutsch D4 zuerst: Kommasetzung, Groß- und Kleinschreibung (Buch Kapitel 11.2).
   - Englisch E2 zuerst: Zeiten (Language File LF1) und Wortschatz Unit 1.
4. Danach Tag 3 aus PLAN.md: Web-Push-Erinnerung. Die Erlaubnis dafür bringt auch die Streak-Zahl aufs App-Icon.
