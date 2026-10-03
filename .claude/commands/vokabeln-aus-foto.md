---
description: Fotos aus dem Vokabelteil des Englischbuchs in Vokabelaufgaben umwandeln und einspielen
argument-hint: "<148-149 | bis S. 14> [test]  oder  einspielen"
---

Wandle Fotos aus dem Vokabelteil von Felix' Englischbuch (Cornelsen „Go Ahead 10“, siehe `docs/schulbuecher.md`) in Aufgaben für `content/englisch/E3.json` um und spiele sie ein.

Auswahl: $ARGUMENTS

## 0. Welche Seiten

Die Fotos liegen in `assets/buecher/englisch/vokabeln/` und heißen `Unit<Nummer>_S<Seite>.jpg`, z. B. `Unit1_S148.jpg`: Unit des Buchs und Seitenzahl im Vokabelteil. Die Unit aus dem Dateinamen bestimmt den `skill_code`. Andere Dateien im Ordner ignorieren. Es liegen oft mehr Seiten da, als im Unterricht schon dran waren. Importiert wird **nur, was Phil angibt**:

- **Vokabelseiten** (`148`, `148-149`, `148, 150`): alle Wörter dieser Fotos.
- **Bis zu einer Buchseite** (`bis S. 14`): Im Vokabelteil steht links neben den Wörtern, zu welcher Buchseite sie gehören (`pp. 10/11`, `p. 12`, `p. 13` …). Importiert werden alle Wörter bis einschließlich dieser Buchseite, auch wenn die Grenze mitten auf einem Foto liegt. Dafür die Fotos in Seitenreihenfolge lesen, bis eine höhere Buchseite beginnt.

Zusatz **`test`** (z. B. `148-149 test`): Aufgaben schreiben und prüfen, aber **nicht** einspielen. Die Live-Datenbank, Felix' Tagesrunde und sein Streak bleiben unberührt. Stattdessen `npm run dev` im Hintergrund starten und Phil die Vorschau nennen: `http://localhost:3000/vorschau?unit=E3` (alle neuen Vokabeln, ohne Login, ohne Speichern; einzelne mit `?code=E3-001,E3-002`). Kein Log-Eintrag, kein Commit.

**`einspielen`** (ohne Seiten): die Aufgaben, die ein Testlauf in `E3.json` geschrieben hat, jetzt einspielen. Direkt weiter mit Abschnitt 3, Schritt 2. Die Wörter für Log und Bericht sind die Items in `E3.json`, die noch in keiner Zeile von `docs/vokabeln.md` stehen.

Ohne Angabe: nichts importieren. Stattdessen kurz auflisten, welche Fotos (Vokabelseite, Unit, Buchseiten-Bereich laut Randmarken) daliegen und was laut `docs/vokabeln.md` schon importiert ist, und Phil fragen, wie weit der Unterricht ist.

Fehlt ein angegebenes Foto oder lässt sich ein Dateiname keiner Seite zuordnen: nachfragen, nicht raten.

## 1. Lesen

- Jedes ausgewählte Foto mit dem Read-Tool ansehen. Die Vokabeltabelle abschreiben: englischer Eintrag, deutsche Bedeutung(en), Vokabelseite, Buchseite (Randmarke), Unit-Überschrift.
- Lautschrift, Bilder und die Beispielsätze des Buchs ignorieren. Beispielsätze des Buchs nie übernehmen.
- Was nicht sicher lesbar ist (unscharf, abgeschnitten, verdeckt), wird übersprungen und am Ende gemeldet. Nie raten. Angeschnittene Nachbarseiten am Bildrand gehören nicht dazu.
- Eigennamen (Orte, Personen) überspringen.
- Wörter, die schon in `E3.json` stehen (Vergleich über `vocabKey` aus `lib/engine/grading.ts`), überspringen. Deshalb schadet es nicht, wenn eine schon teilweise importierte Seite nochmal ausgewählt wird.

## 2. Aufgaben schreiben

Pro Wort zwei Items mit aufeinanderfolgenden Codes, zuerst Erkennen, dann Schreiben. Codes setzen die höchste vorhandene `E3-NNN` fort, nie umnummerieren.
`skill_code` nach Unit: Unit 1 (und English connects) `E3.1`, Unit 2 `E3.2`, Unit 3 `E3.3`, Unit 4 `E3.4`.

**Erkennen (Englisch → Deutsch), `mc`, difficulty 1:**

```json
{
  "code": "E3-001", "skill_code": "E3.1", "type": "mc", "difficulty": 1,
  "stem": "Was bedeutet **to complain about sth**?",
  "payload": { "options": ["sich über etw. beschweren", "etw. vergleichen", "etw. erklären", "sich um etw. bewerben"] },
  "solution": { "index": 0 },
  "hint": "The soup was cold, so she complained about it to the waiter.",
  "explanation": "to complain about sth = sich über etw. beschweren. Beispiel: Many guests complained about the noise at night."
}
```

- Falsche Optionen: Bedeutungen anderer Wörter von derselben Seite, möglichst gleiche Wortart. Nie ein Synonym oder eine zweite Bedeutung des gesuchten Worts.
- `hint`: ein eigener, einfacher englischer Satz, in dem das Wort vorkommt.

**Schreiben (Deutsch → Englisch), `vocab`, difficulty 2:**

```json
{
  "code": "E3-002", "skill_code": "E3.1", "type": "vocab", "difficulty": 2,
  "stem": "Wie heißt das auf Englisch? **sich über etw. beschweren**",
  "payload": { "page": 148 },
  "solution": { "answers": ["to complain about sth"] },
  "hint": "Beginnt mit „c“, zwei Wörter (ohne to).",
  "explanation": "to complain about sth = sich über etw. beschweren. Beispiel: Many guests complained about the noise at night."
}
```

- `answers[0]` ist der Eintrag wie im Buch. Weitere Einträge nur für Schreibvarianten, die das Buch selbst nennt (BE/AE, Kurzform).
- Die Bewertung ignoriert Groß/klein, ein führendes `to`, `sb`/`sth`/`something`/`someone` nach einem Wort und alles in Klammern. Ein Buchstabe daneben oder ein Dreher (ab 5 Buchstaben) zählt als teilweise richtig.
- Hat dasselbe deutsche Wort auf den Seiten mehrere englische Entsprechungen, den `stem` eindeutig machen (z. B. „Umwelt (Natur)“), nicht alle als richtig zählen.
- Wendungen mit mehr als 5 Wörtern nur als `mc` abfragen, ohne `vocab`-Item.
- `hint`: Anfangsbuchstabe und Anzahl der Wörter ohne `to`.

**Für beide:** `explanation` hat 2 Sätze: Gleichung „englisch = deutsch“ und ein eigener Beispielsatz zum Thema der Unit. Bei unregelmäßigen Verben die Formen nennen, wenn das Buch sie angibt. Einfacher Grundwortschatz in Beispielsätzen.

## 3. Prüfen und einspielen

1. `npm run content:check`, alle Fehler beheben. Bei `test` hier aufhören und die Vorschau nennen (siehe Abschnitt 0).
2. Bevor zum ersten Mal Vokabeln eingespielt werden: prüfen, dass der Code für den Typ `vocab` live ist (`git fetch` und `git log origin/main --oneline -- lib/engine/planner.ts` enthält den Vokabel-Commit). Sonst Phil bitten, erst zu pushen. Der Seed schreibt direkt in die Live-Datenbank, und die alte App kann `vocab` nicht anzeigen.
3. `npm run seed`.
4. In `docs/vokabeln.md` eine Zeile anhängen: Datum, Vokabelseiten, Buchseiten bis einschließlich, Unit, Item-Codes von–bis, Anzahl Wörter, übersprungene Wörter.
5. Commit mit Inhalt und Log. Nicht pushen, ohne Phil zu fragen.

## 4. Bericht an Phil (kurz)

- Wie viele Wörter, wie viele Aufgaben, von welchen Vokabelseiten, bis zu welcher Buchseite.
- Welche Einträge übersprungen wurden und warum (unlesbar, Eigenname, schon vorhanden).
- Grob, nach wie vielen Tagen alle neuen Wörter einmal dran waren: Aufgaben geteilt durch `VOCAB_PER_DAY` in `lib/engine/planner.ts`, fällige Wiederholungen gehen vor.
