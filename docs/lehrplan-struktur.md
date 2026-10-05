# LehrplanPLUS Gymnasium Bayern, Jahrgangsstufe 7: Englisch und Französisch

Verifiziert am 2026-10-05 auf lehrplanplus.bayern.de und in den Klett-Stoffverteilungsplänen. Diese Struktur ist das Rückgrat des Skill-Trees (`content/structure.json`).
Anders als bei Felix folgt die App den **Units der Schulbücher**, nicht den Lernbereichen des Lehrplans: Jede Buch-Unit ist ein Gebiet, jedes Grammatikthema der Unit ein Skill, dazu ein Skill Leseverstehen pro Unit. Die Stunden aus den Stoffverteilungsplänen steuern, wie viel Kalenderzeit ein Gebiet bekommt.

Quellen:
- LehrplanPLUS Englisch 7 (1. FS): https://www.lehrplanplus.bayern.de/fachlehrplan/gymnasium/7/englisch/1-fremdsprache
- LehrplanPLUS Französisch 7 (2. FS): https://www.lehrplanplus.bayern.de/fachlehrplan/gymnasium/7/franzoesisch/2-fremdsprache
- Stoffverteilungsplan Green Line 3 Bayern (Klett 2019): https://asset.klett.de/assets/1a0a821/Stoffverteilungsplan_GLBY_Bd3_803030.pdf
- Stoffverteilungsplan Découvertes 2 Bayern: https://assets.klett.de/assets/83a1e6ec/SVP_Decouvertes_BY_2.pdf
- Ferien Bayern: https://www.km.bayern.de/termine/ferien-und-feiertage

Der Lehrplan nennt für beide Fächer keine Stundenzahlen pro Lernbereich. Lernbereiche in beiden Fächern: 1 Kommunikative Kompetenzen (1.1 Kommunikative Fertigkeiten, 1.2 Verfügen über sprachliche Mittel: Wortschatz, Grammatik, Aussprache und Intonation), 2 Interkulturelle Kompetenzen, 3 Text- und Medienkompetenzen, 4 Methodische Kompetenzen, 5 Themengebiete.

## Schuljahr 2026/27 (km.bayern.de)

| Ferien | Zeitraum |
|---|---|
| Herbst (Allerheiligen) | 02.11. bis 06.11.2026 |
| Buß- und Bettag | 18.11.2026 unterrichtsfrei |
| Weihnachten | 24.12.2026 bis 08.01.2027 |
| Frühjahr | 08.02. bis 12.02.2027 |
| Ostern | 22.03. bis 02.04.2027 |
| Pfingsten | 18.05. bis 28.05.2027 |
| Sommer | 02.08. bis 13.09.2027 |

Letzter Schultag: Freitag, 30.07.2027 (= `exam_date`). Die App plant Neustoff bis 16.07.2027, danach 14 Tage Wiederholung. Ferien sind im Kalender nicht abgezogen, wie bei Felix.

## Englisch (Code E): Green Line 3, Ausgabe Bayern ab 2017

ISBN 978-3-12-803030-2. Der Stoffverteilungsplan rechnet mit 31 Wochen und 124 Stunden.

### Grammatik laut LehrplanPLUS E7 (1.2, wörtlich)

- *beschreiben Personen, Gegenstände, Orte und Sachverhalte genauer und setzen sie zueinander in Beziehung:* Adverbien: Bildung; Steigerung, Vergleich; Stellung im Satz · Adjektive und Adverbien: Kontrastierung; Adjektive nach Verben der Sinneswahrnehmung · Reflexivpronomen, reciprocal pronouns (each other), reflexive Verben
- *sprechen über bereits Genanntes und vermeiden Wiederholungen:* Pro-Form one(s) · Possessivpronomen
- *stellen auch komplexere zeitliche und logische Bezüge her, äußern Wünsche, geben Ratschläge und drücken reale und hypothetische Sachverhalte aus:* present perfect simple / present perfect progressive · past perfect simple · Temporalsätze: Zeitenfolge · conditional / conditional perfect · Konditionalsatz II und III; Mischformen

Themengebiete (Auszug): Lebenswelt von Jugendlichen in Nordamerika; Mediennutzung Jugendlicher; Wales und Desert South-West; 1066, Henry VIII, Elizabeth I, Kolonialisierung Nordamerikas; Sprachreflexion (Reflexivität von Verben wie to change, to complain, to imagine, to meet; erste Einblicke in indirekte Aussagesätze; Lehnwörter und Sprachwandel).

### Units in der App

| Gebiet | Unit im Buch | Seiten | Stunden (SVP, inkl. Revision, Across cultures, Focus, Text smart bis zur nächsten Unit) | Skills |
|---|---|---|---|---|
| E1 | Unit 1: Find your place | 8–25 | 31 (Std. 1–31) | E1.1 Reflexive pronouns und each other · E1.2 Adverbs of manner · E1.3 one/ones und possessive pronouns · E1.4 Reading und Use of English |
| E2 | Unit 2: Let's go to Wales | 34–49 | 34 (Std. 32–65) | E2.1 Present perfect progressive · E2.2 Conditional sentences type 2 · E2.3 Reading und Use of English |
| E3 | Unit 3: What was it like? | 62–79 | 38 (Std. 66–103) | E3.1 Past perfect · E3.2 Conditional sentences type 3 · E3.3 Reading und Use of English |
| E4 | Unit 4: In the Desert Southwest | 96–111 | 21 (Std. 104–124) | E4.1 Conditional clauses with mixed tenses · E4.2 Zeitliche und logische Bezüge · E4.3 Indirect speech (rezeptiv) · E4.4 Reading und Use of English |
| EV | Vokabelteil | – | 0 (läuft das ganze Jahr) | EV.1 bis EV.4, je Unit, nur aus Fotos |

Grammatik pro Unit laut Stoffverteilungsplan (wörtlich):
- Unit 1: Reflexivpronomen kennenlernen und verwenden sowie diese gegenüber Personalpronomen abgrenzen · *Themselves* und *each other* gegenüberstellen · Unterschiede zwischen reflexiven Verben im Deutschen und im Englischen · Adverbien der Art und Weise bilden und verwenden · Adverbien von Adjektiven unterscheiden · Attributiven und prädikativen Gebrauch von Adjektiven kennenlernen · Steigerung der Adverbien · Das Schlüsselwort „*one*" und die Funktion von Possessivpronomen kennenlernen
- Unit 2: present perfect progressive: for, since · Wiederholung der conditional sentences type 1 · Bedingungen und Folge mit Hilfe von conditional sentences type 2 ausdrücken · Mit conditional sentences type 2 Ratschläge erteilen
- Unit 3: Vorzeitigkeit ausdrücken (past perfect) · Simple past und past perfect unterscheiden · Über hypothetische Situationen sprechen (conditional sentences type 3)
- Unit 4: Bedingungen und Wünsche ausdrücken (conditional clauses with mixed tenses) · Zeitliche und logische Bezüge ausdrücken · Erstes Erschließen indirekter Aussagesätze und weiterer Verbformen (rezeptiv)

## Französisch (Code F): Découvertes 2, Ausgabe Bayern ab 2017

ISBN 978-3-12-622278-5. 7 Unités, 3 fakultative Plateaus. Der Stoffverteilungsplan rechnet mit ca. 36 Wochen zu je 4 Stunden. Er nennt **keine Titel** der Unités, die Titel in der App sind deshalb Themen-Stichworte aus dem Plan. Die genaue Zuordnung wird mit dem Foto des Inhaltsverzeichnisses abgeglichen (`docs/schulbuecher.md`).

### Grammatik laut LehrplanPLUS F7 (1.2, wörtlich)

- *beschreiben Personen, Gegenstände, Orte und Sachverhalte auf einfache Weise, geben Mengen an, setzen sie zueinander in Beziehung und vergleichen sie:* proposition relative (« qui », « que », « où ») · article partitif et expression de la quantité + « de » · « en » partitif · comparatif et superlatif de l'adjectif · adjectif indéfini « tout »
- *sprechen über bereits Genanntes und vermeiden Wiederholungen:* pronoms objets indirects + place, aussi devant infinitif · pronoms personnels disjoints
- *treten mit anderen Menschen in Beziehung, formulieren Aufforderungen, stellen Fragen und geben Äußerungen anderer in der Gegenwart wieder:* impératif irrégulier (« avoir » et « être ») · impératif avec un pronom · discours indirect et interrogation indirecte (au présent, sans « ce qui », « ce que »)
- *beschreiben Handlungen/Abläufe (auch in der Vergangenheit) und drücken zeitliche Bezüge zwischen Handlungen und Zuständen/Gewohnheiten aus:* verbes réguliers : verbes en « -ir » (« dormir », « finir ») · verbes irréguliers : « devoir », « savoir » ; « boire », « connaître », « mettre », « ouvrir », « venir », « vivre », « voir » · verbes pronominaux (présent, futur proche, impératif) · passé composé avec « avoir » (sans accord) et « être » · imparfait et passé composé (opposition : description/habitude – action)

Themengebiete (Auszug): Feste und Traditionen (la rentrée, Ostern, crêpes, galette des rois); Alltag (Familienleben, Tagesablauf, Einkauf, Hobbys, Kleidung, Schule, Wetter); Paris, Lyon, Nantes, Bretagne; Reisen in Frankreich; Gallier und Römer (Astérix); planches de BD; gesprochenes und geschriebenes Französisch.

### Unités in der App

| Gebiet | Unité (SVP) | Stunden / Wochen (SVP) | Grammatik laut SVP (wörtlich) | Skills |
|---|---|---|---|---|
| F0 | Wiederholung Band 1 (Plateau Rentrée und was im Unterricht wiederholt wird) | 2 / 1 | „Wortschatz und Grammatik des letzten Schuljahres reaktivieren" | folgen, wenn Phil die Themen nennt |
| F1 | Unité 1: Schulbeginn, Collège, Lyon | 18 / 1–5 | pronoms personnels disjoints, Relativsätze mit qui, que, où; Verben connaître, savoir, mettre | F1.1 Pronoms disjoints · F1.2 qui, que, où · F1.3 connaître, savoir, mettre · F1.4 Lire et comprendre |
| F2 | Unité 2: Traboules von Lyon, Erlebnisse, Brief | 20 + Plateau 1 (4) / 6–10 | das Passé composé mit avoir (von Verben auf -er und -dre sowie unregelmäßigen Verben); Verben voir, devoir, ouvrir | F2.1 Passé composé avoir: -er, -dre · F2.2 Passé composé avoir: unregelmäßig · F2.3 voir, devoir, ouvrir · F2.4 Lire et comprendre |
| F3 | Unité 3: Tagesablauf, Kleidung, Feste | 20 / 11–15 | verbes pronominaux (im Präsens), das Passé composé mit être; Verben auf -ir (dormir), venir | F3.1 Verbes pronominaux · F3.2 Passé composé mit être · F3.3 dormir und venir · F3.4 Lire et comprendre |
| F4 | Unité 4: Bretagne, Wetter, Klassenfahrt | 20 + Plateau 2 (4) / 16–20 | pronom objet indirect, discours indirect, interrogation indirecte, imparfait; Verb vivre | F4.1 Pronoms objets indirects · F4.2 Discours indirect, interrogation indirecte · F4.3 Imparfait · F4.4 Lire et comprendre |
| F5 | Unité 5: Sport | 20 / 21–25 | les degrés de l'adjectif et la comparaison, tout, imparfait – passé composé; Verben auf -ir (finir) | F5.1 Comparatif und superlatif · F5.2 tout · F5.3 Imparfait oder passé composé · F5.4 Verben auf -ir mit -iss- · F5.5 Lire et comprendre |
| F6 | Unité 6: Essen, Einkaufen, Nantes | 20 / 26–30 | il faut (faire) qc, l'article partitif, Mengenausdruck mit de, Pronomen en; Verb boire | F6.1 il faut · F6.2 Article partitif und Mengenangaben · F6.3 Pronomen en · F6.4 Lire et comprendre |
| F7 | Unité 7: Nantes, Stadt und Land, Musik | 20 + Plateau 3 (4) / 31–35 | Imperativ von être und avoir, Imperativ mit einem Pronomen; Zahlen bis 1 Million | F7.1 Impératif · F7.2 Impératif mit Pronomen · F7.3 Lire et comprendre |
| FV | Vokabelteil | 0 (läuft das ganze Jahr) | – | FV.0 Band 1, FV.1 bis FV.7, nur aus Fotos |

Die fakultativen Plateaus sind der jeweils vorangehenden Unité zugeschlagen, Plateau Rentrée steckt in F0.
