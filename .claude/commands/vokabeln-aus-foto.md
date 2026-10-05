---
description: Fotos aus dem Vokabelteil (Englisch oder Französisch) in Vokabelaufgaben umwandeln und einspielen
argument-hint: "<englisch | französisch | französisch-band1> <195-199 | bis S. 14> [test]  oder  einspielen"
---

Wandle Fotos aus dem Vokabelteil von Paulas Büchern in Vokabelaufgaben um und spiele sie ein.

Auswahl: $ARGUMENTS

## 0. Welche Sprache, welche Seiten

Das erste Wort wählt Buch, Ordner, Datei und Skill:

| Argument | Buch | Fotos in | Datei | Skill |
|---|---|---|---|---|
| `englisch` | Green Line 3 | `assets/buecher/englisch/vokabeln/` | `content/englisch/EV.json`, Codes `EV-NNN` | `EV.1` bis `EV.4` nach Unit |
| `französisch` | Découvertes 2 | `assets/buecher/franzoesisch/vokabeln/` | `content/franzoesisch/FV.json`, Codes `FV-NNN` | `FV.1` bis `FV.7` nach Unité |
| `französisch-band1` | Découvertes 1 (Wiederholung) | `assets/buecher/franzoesisch-band1/vokabeln/` | `content/franzoesisch/FV.json`, Codes `FV-NNN` | immer `FV.0` |

Die Dateinamen enthalten die Seitenzahl im Vokabelteil (`S195.jpg`, `Unite7_S195.jpg`, `Unit1_S148.jpg`). Die Unit bzw. Unité steht oben auf der Seite und in den Zwischenüberschriften, nicht unbedingt im Dateinamen. Es liegen oft mehr Fotos da, als im Unterricht dran waren. Importiert wird **nur, was Phil angibt**:

- **Vokabelseiten** (`195`, `195-199`, `195, 197`): alle Wörter dieser Fotos.
- **Bis zu einer Buchseite** (`bis S. 14`): Am Rand steht, zu welchem Abschnitt bzw. welcher Buchseite die Wörter gehören. Importiert wird bis einschließlich dieser Stelle, auch mitten auf einem Foto.

Zusatz **`test`**: Aufgaben schreiben und prüfen, aber **nicht** einspielen. `npm run dev` im Hintergrund starten und Phil die Vorschau nennen: `http://localhost:3000/vorschau?unit=FV` (bzw. `EV`; einzelne mit `?code=FV-001,FV-002`). Kein Log-Eintrag, kein Commit.

**`einspielen`** (ohne Seiten): die Aufgaben eines Testlaufs jetzt einspielen, weiter mit Abschnitt 3, Schritt 2.

Ohne Seitenangabe: nichts importieren. Auflisten, welche Fotos daliegen und was laut `docs/vokabeln.md` schon importiert ist, und Phil fragen, wie weit der Unterricht ist. Fehlt ein Foto oder ist eine Seite nicht zuzuordnen: nachfragen, nicht raten.

## 1. Lesen

- Jedes ausgewählte Foto mit dem Read-Tool ansehen und die Vokabeltabelle abschreiben: Eintrag wie im Buch (Französisch **mit Artikel**, so wie das Buch ihn druckt: `une chose`, `le petit-déjeuner`), deutsche Bedeutung(en), Seite.
- Lautschrift, Bilder und die Beispielsätze des Buchs ignorieren. Beispielsätze nie übernehmen.
- Überspringen und am Ende melden: Unlesbares (nie raten), Eigennamen (Orte, Personen, Bauwerke wie le Louvre, la tour Eiffel), Kästen außerhalb der Vokabeltabelle („Auf einen Blick“, „Mon dico personnel“, „Tu te rappelles?“, Grammatik-Übersichten), angeschnittene Nachbarseiten.
- Wörter, die schon in der Zieldatei stehen (Vergleich über `vocabKey` aus `lib/engine/grading.ts`), überspringen.

## 2. Aufgaben schreiben

Pro Wort zwei Items mit aufeinanderfolgenden Codes, zuerst Erkennen, dann Schreiben. Codes setzen die höchste vorhandene Nummer fort, nie umnummerieren. Vorlage für das Erzeugen: siehe Git-Historie von `content/franzoesisch/FV.json` (Commit „Französisch: Vokabeln Band 1 S. 195-199“).

**Erkennen (Fremdsprache → Deutsch), `mc`, difficulty 1:**

```json
{
  "code": "FV-001", "skill_code": "FV.0", "type": "mc", "difficulty": 1,
  "stem": "Was bedeutet **une chose**?",
  "payload": { "options": ["ein Ort", "eine Sache; ein Ding", "ein Name", "eine Person"] },
  "solution": { "index": 1 },
  "hint": "J'ai une chose pour toi.",
  "explanation": "une chose = eine Sache; ein Ding. Beispiel: Il y a beaucoup de choses dans ma chambre. (In meinem Zimmer sind viele Sachen.)"
}
```

- Falsche Optionen: Bedeutungen anderer Wörter von denselben Seiten, möglichst gleiche Wortart. Nie ein Synonym oder eine zweite Bedeutung des gesuchten Worts (bisou/bise nicht gegeneinander).
- `hint`: ein eigener, sehr einfacher Satz in der Fremdsprache, in dem das Wort vorkommt.

**Schreiben (Deutsch → Fremdsprache), `vocab`, difficulty 2:**

```json
{
  "code": "FV-002", "skill_code": "FV.0", "type": "vocab", "difficulty": 2,
  "stem": "Wie heißt das auf Französisch? **eine Sache; ein Ding**",
  "payload": { "page": 195 },
  "solution": { "answers": ["une chose"] },
  "hint": "Nomen mit Artikel, beginnt mit „c“.",
  "explanation": "une chose = eine Sache; ein Ding. Beispiel: Il y a beaucoup de choses dans ma chambre. (In meinem Zimmer sind viele Sachen.)"
}
```

- `answers[0]` ist der Eintrag wie im Buch (ohne Zusätze wie „+ Nomen“, „(fam.)“). Weitere Einträge nur für Formen, die gleich gelten: männliche Form allein bei `préféré/préférée`, `un touriste` und `une touriste` bei `un touriste/une touriste`, `j'aimerais` bei `j'aimerais faire qc`, `ne plus de` und `ne ... plus de` bei `ne … plus de`.
- Die Bewertung ignoriert Groß/klein, Satzzeichen am Ende, `to`, `sb`/`sth`, `qn`/`qc` und Klammern. Teilweise richtig (kommt nochmal, Lösung wird gezeigt): ein Tippfehler ab 5 Buchstaben, Akzent vergessen oder falsch, französischer Artikel fehlt oder falsch.
- Hat dasselbe deutsche Wort mehrere Entsprechungen auf den Seiten, den `stem` eindeutig machen („ein Kuss auf die Wange (zur Begrüßung)“ für une bise, „ein Küsschen; ein Busserl (ugs.)“ für un bisou).
- Wendungen mit mehr als 5 Wörtern nur als `mc`.
- `hint`: Wortart und Anfangsbuchstabe, bei Nomen „Nomen mit Artikel“, aber **nie das Genus** (sonst ist der Artikel geschenkt).

**Für beide:** `explanation` = „Eintrag = Bedeutung. Beispiel: eigener Satz (deutsche Übersetzung).“ Danach höchstens ein Zusatz: unregelmäßige Formen, wenn das Buch sie nennt; Genus-Falle (un musée, une personne, un reportage); Verwechslungsgefahr (un texte/un texto, un tour/une tour). Beispielsätze nur mit Grundwortschatz und Zeiten, die Paula schon hatte (Französisch Band 1: Präsens, futur proche, kein passé composé).

## 3. Prüfen und einspielen

1. `npm run content:check -- FV` (bzw. `EV`), alle Fehler beheben. Danach mit `grade()` aus `lib/engine/grading.ts` prüfen, dass jede Antwort in `answers` als `correct` zählt und keine Lösung eines Worts bei einem anderen Wort als `correct` durchgeht. Bei `test` hier aufhören.
2. Wurde Code geändert (z. B. Bewertung), erst committen und pushen, damit die Live-App ihn hat. Der Seed schreibt sofort in die Live-Datenbank.
3. `npm run seed`.
4. In `docs/vokabeln.md` eine Zeile anhängen: Datum, Sprache, Vokabelseiten, bis Buchseite, Unit/Unité und Skill, Item-Codes von–bis, Anzahl Wörter, Übersprungenes.
5. Commit mit Inhalt und Log, dann pushen.

## 4. Bericht an Phil (kurz)

- Wie viele Wörter und Aufgaben, von welchen Seiten.
- Was übersprungen wurde und warum.
- Grob, nach wie vielen Tagen alle neuen Wörter einmal dran waren: Aufgaben geteilt durch `VOCAB_PER_DAY` in `lib/engine/planner.ts` (6 pro Sprache; hat die andere Sprache nichts Neues, bis zu 12). Fällige Wiederholungen gehen vor.
