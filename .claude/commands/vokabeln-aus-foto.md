---
description: Fotos aus dem Vokabelteil des Englischbuchs in Vokabelaufgaben umwandeln und einspielen
argument-hint: "[foto-pfade …]  (leer = alle neuen Fotos in assets/buecher/englisch/vokabeln/)"
---

Wandle Fotos aus dem Vokabelteil von Felix' Englischbuch (Cornelsen „Go Ahead 10“, siehe `docs/schulbuecher.md`) in Aufgaben für `content/englisch/E3.json` um und spiele sie ein.

Fotos: $ARGUMENTS
Ohne Angabe: alle Bilder in `assets/buecher/englisch/vokabeln/`, die in `docs/vokabeln.md` noch nicht als verarbeitet stehen.

## 1. Lesen

- Jedes Foto mit dem Read-Tool ansehen. Die Vokabeltabelle abschreiben: englischer Eintrag, deutsche Bedeutung(en), Seitenzahl, Unit-Überschrift.
- Lautschrift, Bilder und die Beispielsätze des Buchs ignorieren. Beispielsätze des Buchs nie übernehmen.
- Was nicht sicher lesbar ist (unscharf, abgeschnitten, verdeckt), wird übersprungen und am Ende gemeldet. Nie raten.
- Eigennamen (Orte, Personen) überspringen.
- Wörter, die schon in `E3.json` stehen (Vergleich über `vocabKey` aus `lib/engine/grading.ts`), überspringen.

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
  "payload": { "page": 152 },
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

1. `npm run content:check`, alle Fehler beheben.
2. Bevor zum ersten Mal Vokabeln eingespielt werden: prüfen, dass der Code für den Typ `vocab` live ist (`git fetch` und `git log origin/main --oneline -- lib/engine/planner.ts` enthält den Vokabel-Commit). Sonst Phil bitten, erst zu pushen. Der Seed schreibt direkt in die Live-Datenbank, und die alte App kann `vocab` nicht anzeigen.
3. `npm run seed`.
4. In `docs/vokabeln.md` eine Zeile anhängen: Datum, Fotodatei(en), Seiten, Unit, Item-Codes von–bis, Anzahl Wörter, übersprungene Wörter.
5. Commit mit Inhalt und Log. Nicht pushen, ohne Phil zu fragen.

## 4. Bericht an Phil (kurz)

- Wie viele Wörter, wie viele Aufgaben, von welchen Seiten.
- Welche Einträge übersprungen wurden und warum (unlesbar, Eigenname, schon vorhanden).
- Grob, nach wie vielen Tagen alle neuen Wörter einmal dran waren: Aufgaben geteilt durch `VOCAB_PER_DAY` in `lib/engine/planner.ts`, fällige Wiederholungen gehen vor.
