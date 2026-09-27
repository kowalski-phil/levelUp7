# Entscheidungen

Kurzprotokoll, was wann entschieden wurde. Details stehen in den verlinkten Dokumenten.

- **2026-09-26 Fokus-Modus.** Felix trägt Schulaufgaben ein und bekommt Fokus-Runden nur aus deren Themen. Tagessession oder Fokus-Runde sichert den Streak. Siehe `docs/fokus-modus.md`.
- **2026-09-26 Fokus-Modus, Umsetzungsdetails.** Die Abwahl-Warnung erscheint nur für Lernbereiche, die Felix selbst verändert hat, damit ein teilweiser Kalendervorschlag keine Warnung auslöst. Die Nummer der Schulaufgabe ("2. Schulaufgabe") wird aus der Datumsreihenfolge im Fach berechnet und stimmt dadurch auch nach Löschen oder Verschieben. Ein Skill ist im Vorschlag "dran" von seiner Freischaltung bis kurz vor der Freischaltung des nächsten Skills. Im Eltern-Dashboard zeigt "Letzte Tage" auch Fokus-Runden, damit ein Fokus-Tag nicht wie ein verpasster Tag aussieht.
- **2026-09-26 Schulbücher und Unterrichtsstand.** Inhaltsverzeichnisse abfotografiert, Zuordnung in `docs/schulbuecher.md`. Mathe beginnt mit Daten und Zufall, der Kalender läuft deshalb M5, M1, M4, M2, M3 (Buchreihenfolge nach dem vorgezogenen Kapitel).
- **2026-09-26 BwR-Begriffe.** Einnahme/Ausgabe statt Einzahlung/Auszahlung, wie im LehrplanPLUS und im Buch Conto 10 II. Aufgaben mit Darlehen, Tilgung und Zahlung einer Vorjahresrechnung wurden durch eindeutige Barfälle ersetzt, weil sie je nach Definition von "Einnahme" kippen.
- **2026-09-26 Joker.** Ein Joker alle 14 Streak-Tage statt alle 7, weiterhin max. 2 im Vorrat, automatisch verbraucht.
- **2026-09-26 Streak-Anzeige.** Streak-Karte mit Wochenzeile auf Home, eigene Streak-Seite (Tage in Folge, Woche, längster Streak, Joker x/2). Die Streak-Zahl steht zusätzlich aufs App-Icon (Badging API, iOS ab 16.4, nur als Home-Bildschirm-App und erst nach der Benachrichtigungs-Erlaubnis). Widgets gibt es für Web-Apps auf dem iPhone nicht.
- **2026-09-26 Nächste Schulaufgabe.** Steht immer auf Home unter der Streak-Karte, sobald eine eingetragen ist.
