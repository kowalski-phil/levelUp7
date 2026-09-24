# Aufgaben schreiben: Vorgaben für content/<fach>/<unit_code>.json

Gilt für die Erstbefüllung und für `/mehr-aufgaben`. Regeln aus `CLAUDE.md` ("Regeln für Aufgaben") gelten zusätzlich.

## Datei

- Pfad: `content/mathe/M1.json`, `content/bwr/B3.json`, `content/deutsch/D4.json`, `content/englisch/E2.json`
- Inhalt: ein JSON-Array von Items. Schema als TypeScript in `lib/content/types.ts`.
- `code`: `<unit_code>-<dreistellige Nummer>`, fortlaufend ab `001`. Bestehende Codes nie ändern.
- `skill_code`: nur Skills aus `content/structure.json` für diese Unit. Items gleichmäßig über alle Skills verteilen.
- `difficulty`: 1 = Grundaufgabe (ein Schritt), 2 = Standard (zwei bis drei Schritte), 3 = Prüfungsniveau. Pro Unit etwa 40 % / 40 % / 20 %.

## Prüfen

- `npm run content:check -- <unit_code>` muss mit 0 Fehlern enden.
- `npm run content:preview -- <unit_code>` zeigt alle Items mit gezogenen Zahlen und Ergebnis. Jedes Template einmal durchsehen: Sind die Zahlen realistisch? Stimmt das Ergebnis?
- Jede Lösung nachrechnen (z. B. mit `node -e`), nicht aus dem Kopf.

## Darstellung

- `stem` ist Markdown. Formeln in `$...$` (KaTeX). In JSON Backslashes doppeln: `"$\\sin \\alpha$"`.
- Deutsche Zahlschreibweise im Text: `3,5 cm`, `12.500 €`. In KaTeX Dezimalkomma als `{,}` schreiben: `$3{,}5$`.
- Platzhalter `{{name}}` bei `numeric_template` NIE innerhalb von `$...$`, sondern im normalen Text: `Die Seite a ist {{a}} cm lang.`
- Keine Abbildungen möglich. Geometrie komplett in Worten beschreiben (Dreieck ABC mit a = ..., β = ...).
- Rundungsvorgabe in den Aufgabentext schreiben ("Runde auf zwei Stellen nach dem Komma."), wenn das Ergebnis nicht glatt ist.
- Keine Anrede "Felix". Du-Form in Arbeitsanweisungen ("Berechne ...").

## Typen und Payload

| type | payload | solution |
|---|---|---|
| `mc` | `{ "options": [4 Strings] }` | `{ "index": 0-3 }` |
| `mc_multi` | `{ "options": [4-6 Strings] }` | `{ "indices": [..] }` (mind. 2 richtig) |
| `numeric` | `{ "unit": "cm", "tolerance": 0.01 }` | `{ "value": 7.35 }` |
| `numeric_template` | `{ "params": {"a": {"min","max","step"}}, "derived": {"x": "Formel"}, "constraints": ["a > b"], "formula": "Formel", "unit": "cm", "tolerance": 0.01 }` | weglassen |
| `cloze` | `{ "text": "Satz mit [[0]] und [[1]]", "gaps": [{"options": [..]}, ..] }` | `{ "answers": ["richtige Option je Lücke"] }` |
| `cloze_free` | `{ "text": "...[[0]]...", "case_sensitive": false }` | `{ "answers": [["Variante1", "Variante2"]] }` |
| `order` | `{ "items": [in RICHTIGER Reihenfolge] }` (App mischt) | weglassen |
| `match` | `{ "pairs": [["links", "rechts"], ..] }` (3-5 Paare, App mischt rechts) | weglassen |
| `booking` | `{ "accounts": [6-8 Konten zur Auswahl] }` | `{ "soll": [{"account","amount"}], "haben": [..] }` |
| `self_check` | `{ "sample_answer": "...", "criteria": [..] }` | weglassen |

Jedes Item hat zusätzlich `"hint": "..."` auf oberster Ebene (neben `explanation`), außer `self_check`.

### numeric_template

- Formeln: `+ - * / ^`, Klammern, `sqrt, abs, sin, cos, tan, asin, acos, atan` (Winkel in GRAD), `log10, ln, log(basis, x), exp, round(x, stellen), floor, ceil, min, max`, Konstanten `pi`, `e`.
- `derived` werden der Reihe nach berechnet und dürfen im Stem stehen. Trick für glatte Ergebnisse: das Ergebnis als Parameter ziehen und die Angaben daraus ableiten (z. B. Nullstellen ziehen, p und q ableiten).
- `constraints` verhindern Unsinn (Dreiecksungleichung, positive Ergebnisse, Winkelsumme < 180).
- `tolerance`: glatte Ergebnisse 0 oder 0.01. Gerundete Ergebnisse so, dass Zwischenrunden auf 2 Stellen noch akzeptiert wird (typisch 0.05 bis 0.5 % des Ergebnisses), nie mehr als 5 %.
- `explanation` bei Templates beschreibt den Rechenweg allgemein (Formel, Schritte), ohne konkrete Zahlen, weil sie jedes Mal anders sind.

### Tipp (`hint`)

Pflicht bei allen Typen außer `self_check`. Ein Satz, höchstens zwei. Ein Denkanstoß, den Felix VOR der Antwort aufrufen kann:
- nennt den Ansatz, die passende Formel oder die Frage, die man sich stellen sollte ("Welche Seite liegt dem gesuchten Winkel gegenüber?", "Ist das Geld schon geflossen oder nur der Aufwand entstanden?")
- verrät NIE das Ergebnis, keine Zwischenergebnisse, bei MC keine Option ausschließen oder nennen
- bei `numeric_template` keine konkreten Zahlen (sie ändern sich)
- Englisch-Aufgaben: Tipp auf Englisch, einfach formuliert
Eine richtige Antwort nach Tipp zählt als "teilweise" und kommt über Spaced Repetition früher wieder.

### Erklärung

2-4 Sätze. Nennt den Lösungsweg (Formel, Ansatz, Regel), nicht nur das Ergebnis. Bei MC zusätzlich kurz, warum der typische Fehler falsch ist.

### Distraktoren

Typische Schülerfehler: Vorzeichen, Grad/Bogenmaß, sin/cos vertauscht, Radius/Durchmesser verwechselt, Faktor ½ vergessen, Soll/Haben vertauscht, falsches Konto derselben Art, Prozent vom falschen Grundwert (im Hundert vs. vom Hundert), falsche Zeitform. Keine offensichtlich absurden Optionen.

## BwR-Konten

Kontenbezeichnung in `accounts` und `solution` immer exakt in dieser Schreibweise ("Nummer Name"). Andere Konten nur mit Namen ohne Nummer, wenn die Nummer nicht sicher ist.

```
2400 Forderungen aus Lieferungen und Leistungen
2600 Vorsteuer
2800 Bank
2880 Kasse
2900 Aktive Rechnungsabgrenzung
3000 Eigenkapital
3900 Sonstige Rückstellungen
4250 Langfristige Bankverbindlichkeiten
4400 Verbindlichkeiten aus Lieferungen und Leistungen
4800 Umsatzsteuer
4900 Passive Rechnungsabgrenzung
5000 Umsatzerlöse für eigene Erzeugnisse
5400 Nebenerlöse
5490 Periodenfremde Erträge
5710 Zinserträge
6000 Aufwendungen für Rohstoffe
6160 Fremdinstandhaltung
6200 Löhne
6300 Gehälter
6520 Abschreibungen auf Sachanlagen
6700 Mieten, Pachten
6770 Rechts- und Beratungskosten
6800 Büromaterial
6870 Werbung
6900 Versicherungsbeiträge
6990 Periodenfremde Aufwendungen
7020 Grundsteuer
7030 Kraftfahrzeugsteuer
7510 Zinsaufwendungen
8010 Schlussbilanzkonto
8020 Gewinn- und Verlustkonto
```

- Umsatzsteuer 19 %. Beträge in Euro, meist glatt (z. B. 1.200 €, 3.600 €).
- Geschäftsjahr = Kalenderjahr, Abschlussstichtag 31.12.
- `accounts` enthält die richtigen Konten plus typische Verwechslungen (ARA statt PRA, Aufwand statt Ertrag, Bank statt Verbindlichkeiten).
- Stem nennt Datum und Geschäftsfall und endet mit "Bilde den Buchungssatz zum 31.12." o. ä.
