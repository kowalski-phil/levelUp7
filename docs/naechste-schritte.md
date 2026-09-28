# Nächste Schritte

Stand 2026-09-28. Was zuletzt gebaut und entschieden wurde, steht in `docs/entscheidungen.md`.
Die App ist live: https://levelup10-zeta.vercel.app

## Für Phil

1. Heute Abend mit Felix: App auf seinem iPhone zum Home-Bildschirm hinzufügen und einloggen.
2. Optional: schönere Adresse in Vercel (Projekt → Settings → Domains), bevor Felix die App auf den Home-Bildschirm legt.
3. Optional: GitHub-Repo auf privat stellen (laut PLAN.md so gedacht, ist aktuell öffentlich).

## Backlog für Claude Code (in dieser Reihenfolge)

1. **Logout.** Felix und Phil können sich bisher nicht abmelden. Muss auf jeden Fall rein.
2. **Deutsch und Englisch.** Noch keine einzige Aufgabe. Reihenfolge nach `docs/schulbuecher.md`:
   - Deutsch D4 zuerst: Kommasetzung, Groß- und Kleinschreibung (Buch Kapitel 11.2).
   - Englisch E2 zuerst: Zeiten (Language File LF1) und Wortschatz Unit 1.
3. **Push-Erinnerung** (PLAN.md Tag 3): tägliche Erinnerung zu fester Uhrzeit, zweite abends falls nicht erledigt. Bringt auch die Streak-Zahl aufs App-Icon.
4. **Slash-Commands** `/mehr-aufgaben` und `/pruefe-aufgaben` in `.claude/commands/`.
5. **Rest von PLAN.md Tag 2:**
   - Skill-Tree-Screen (was Felix schon kann)
   - Konto-Screen (Belohnungen: verdient, ausgezahlt, offen)
   - Eltern-Login: Belohnungsbeträge einstellen, Auszahlungen als "bezahlt" markieren
   - Onboarding-Screen für Felix' ersten Start

Tag-3-Regel: Was Felix nervt, wird gefixt, bevor irgendetwas Neues gebaut wird.
