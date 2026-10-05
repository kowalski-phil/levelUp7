# Aufgaben schreiben: Vorgaben für content/<fach>/<unit_code>.json

Gilt für die Erstbefüllung und für `/mehr-aufgaben`. Regeln aus `CLAUDE.md` ("Regeln für Aufgaben") gelten zusätzlich.

## Datei

- Pfad: `content/englisch/E1.json`, `content/franzoesisch/F2.json`
- Inhalt: ein JSON-Array von Items. Schema als TypeScript in `lib/content/types.ts`.
- `code`: `<unit_code>-<dreistellige Nummer>`, fortlaufend ab `001`. Bestehende Codes nie ändern.
- `skill_code`: nur Skills aus `content/structure.json` für diese Unit. Items gleichmäßig über die Skills verteilen.
- `difficulty`: 1 = eine Form erkennen oder bilden, 2 = Regel anwenden und abgrenzen (Adjektiv oder Adverb, each other oder themselves), 3 = Schulaufgaben-Niveau (mehrere Regeln, Fehler finden, Satzbau). Pro Unit etwa 40 % / 40 % / 20 %.

## Prüfen

- `npm run content:check -- <unit_code>` muss mit 0 Fehlern und möglichst 0 Hinweisen enden.
- `npm run content:preview -- <unit_code>` zeigt alle Items mit Lösung. Jedes Item einmal lesen: Gibt es genau eine richtige Antwort? Ist kein Distraktor mit gutem Grund auch richtig?

## Sprache und Niveau

- Gymnasium 7, Englisch 3. Lernjahr, Französisch 2. Lernjahr. Nur Wortschatz, den Paula sicher hatte (Band 1 und 2 der Bücher bis zum Unterrichtsstand). Bei Unsicherheit einfacher wählen.
- Englisch: Arbeitsanweisung kurz auf Englisch ("Fill in the adverb.", "Choose the correct word."), Satzinhalt auf Englisch, Übersetzungsvorlage auf Deutsch in Klammern.
- Französisch: Arbeitsanweisung auf Deutsch ("Setze das passé composé ein."), Satzinhalt auf Französisch. Akzente immer korrekt, Leerzeichen vor `! ? ; :` wie im Französischen üblich nur, wenn das Buch es auch so macht (im Zweifel ohne).
- `explanation` und `hint` auf Deutsch. Grammatik-Begriffe wie im Buch (reflexive pronoun, passé composé).
- Themen der Sätze aus dem Themengebiet der Unit (`docs/lehrplan-struktur.md`), Texte selbst geschrieben.
- Keine Anrede "Paula".

## Typen und Payload

| type | payload | solution |
|---|---|---|
| `mc` | `{ "options": [4 Strings] }` | `{ "index": 0-3 }` (die App mischt die Optionen) |
| `mc_multi` | `{ "options": [4-6 Strings] }` | `{ "indices": [..] }` (mind. 2 richtig) |
| `cloze` | `{ "text": "Satz mit [[0]] und [[1]]", "gaps": [{"options": [..]}, ..] }` | `{ "answers": ["richtige Option je Lücke"] }` (Optionen werden nicht gemischt: richtige nicht immer an erste Stelle) |
| `cloze_free` | `{ "text": "...[[0]]...", "case_sensitive": false }` | `{ "answers": [["Variante1", "Variante2"]] }` |
| `order` | `{ "items": [in RICHTIGER Reihenfolge] }` (App mischt) | weglassen |
| `match` | `{ "pairs": [["links", "rechts"], ..] }` (3-5 Paare, App mischt rechts) | weglassen |
| `vocab` | `{ "page": 148 }` | `{ "answers": ["Hauptlösung", "Variante"] }` |

Jedes Item hat zusätzlich `"hint": "..."` auf oberster Ebene (neben `explanation`).

### cloze_free

- Alle Schreibweisen aufnehmen, die eine Lehrkraft gelten lässt (Kurzformen `'s`, `one another` neben `each other`). Formen, die im Alltag vorkommen, aber in der Schulaufgabe als falsch zählen, nicht aufnehmen und in der Erklärung nennen.
- In Klammern hinter der Lücke steht die Grundform, wenn eine Form gebildet werden soll: `Our team played very [[0]] (good).` oder in der Arbeitsanweisung.

### order

- Bausteine eindeutig: kein Wort doppelt, nur eine richtige Reihenfolge. Großbuchstabe am Satzanfang und Satzzeichen am letzten Baustein helfen.

### Tipp (`hint`)

Ein Satz, höchstens zwei. Ein Denkanstoß vor der Antwort: die Frage, die man sich stellen sollte ("Beschreibt das Wort eine Person oder eine Tätigkeit?"). Verrät nie die Lösung und schließt bei MC keine Option aus.
Eine richtige Antwort nach Tipp zählt als "teilweise" und kommt über Spaced Repetition früher wieder.

### Erklärung

2-4 Sätze. Nennt die Regel und warum der typische Fehler falsch ist, nicht nur das Ergebnis.

### Distraktoren

Typische Schülerfehler: Germanismen (I can't remember me, a friend of me), Adjektiv statt Adverb, Apostroph bei Possessivpronomen (her's), falsche Zeitform zum Signalwort, fehlende Angleichung des participe passé bei être, avoir statt être, falsche Stellung von Pronomen, qui statt que, Teilungsartikel nach Verneinung. Keine offensichtlich absurden Optionen und keine, die in einem anderen Kontext auch richtig wäre.
