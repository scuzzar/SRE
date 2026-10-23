# Domänenmodell

**Dieses Diagramm führt.** Der Code folgt ihm, nie umgekehrt. Eine Änderung am Modell wird zuerst
hier gemacht, abgestimmt und dann in den Code übertragen. Das Diagramm wird nie umgezeichnet, damit
es zu dem passt, was der Code gerade tut. Solange der Code noch nicht nachgezogen hat, stehen die
Lücken unter [Wo der Code noch nicht folgt](#wo-der-code-noch-nicht-folgt).

> **Stand: Entwurf, noch nicht abgestimmt.** Die offenen Fragen stehen unter
> [Offene Fragen zum Entwurf](#offene-fragen-zum-entwurf). Erst wenn sie geklärt sind, gilt das
> Modell, und erst dann beginnt der Code.

![Domänenmodell der Solo RPG Engine](domain-model.png)

Die Quelle ist [`domain-model.puml`](domain-model.puml) (PlantUML). Nach jeder Änderung das Bild neu
erzeugen mit `java -jar plantuml.jar -tpng docs/domain-model.puml`; Graphviz ist nicht nötig.

Das Diagramm zeigt nur Daten und Beziehungen, keine Operationen. **Blau** ist der Spielstand, den
die App speichert. **Grau mit gestricheltem Rahmen** gibt es nur, solange etwas offen ist (eine
gezogene Karte, eine vorbereitete Probe); das wird nie gespeichert. **Grün** sind Referenzdaten:
feste Tabellen, in jeder Kampagne gleich. **Weiß** sind Werte und Wertelisten.

## Begriffe

Die Bezeichner im Code sind englisch, Oberfläche und Dokumentation deutsch. Diese Tabelle ist die
gemeinsame Sprache: Wer „Probe“ sagt, meint `Task`, und umgekehrt.

| Deutsch | Code | Was |
|---|---|---|
| Kampagne | `Campaign` | Alles, was zu einem Spiel gehört |
| Charakter | `Character` | Ein Spielercharakter mit seiner Charakterkarte |
| UPP | `Upp` | Die sechs Attributwerte |
| Attribut | `Characteristic` | STR, GES (`DEX`), AUS (`END`), INT, BIL (`EDU`), SOZ (`SOC`) |
| Fertigkeit | `Skill` | Eine Fertigkeit aus der Liste, z. B. Pilot |
| Fertigkeitsstufe | `SkillLevel` | Die Stufe, die ein Charakter in einer Fertigkeit hat, z. B. Pilot-2 |
| Stufe (Hoch/Mittel/Gering) | `Odds` | Die eine Auswahl für Orakel und Proben |
| Hausregeln | `HouseRules` | Die einstellbaren Zahlen für Proben |
| Log | `LogEntry` | Ein Eintrag im Verlauf |
| Orakelantwort | `OracleAnswer` | Ja oder Nein auf eine Frage |
| Würfelwurf (2W6) | `DiceRoll` | Ein einfacher Wurf mit zwei Würfeln |
| Kartenauswahl | `CardPick`, `PickedItem` | Was man von einer Karte in den Log übernimmt |
| Probenergebnis | `TaskResult`, `Modifier` | Eine gewürfelte Probe mit ihren DMs |
| Inspirationskarte | `Card`, `CardField` | Eine gezogene Karte, solange sie offen ist |
| Probe | `Task` | Eine Probe, solange sie im Charakter-Screen vorbereitet wird |
| Bereich der Karte, Themen-Reiter | `Section` | Zufallsereignis, Sinneseindrücke, …; Auftrag, NSC, … |
| Feld der Karte | `Slot` | Verb, Hören, Name, Auslöser, … |
| Liste | `WordList` | Die Einträge, aus denen ein Feld gezogen wird |

## Regeln, die das Bild nicht zeigt

- **Was draußen bleibt.** Alles, was nur die Anzeige betrifft, gehört nicht ins Modell: welcher
  Screen offen ist, welcher Themen-Reiter gewählt ist, der Text im Fragefeld vor dem Absenden, ob das
  Ergebnis-Popup gerade zu sehen ist, Farben, die Hex-Schreibweise der UPP und das Format der Uhrzeit.
  Das ist Zustand der View.
- **Eine Kampagne.** In Version 1 gibt es genau eine Kampagne. Alles, was gespeichert wird, hängt an
  ihr.
- **Eine Auswahl für Orakel und Proben.** Die Kampagne hat immer genau eine gewählte Stufe (`odds`).
  Die drei Stufen sind Referenzdaten: Hoch (75 %, 6+), Mittel (50 %, 8+), Gering (25 %, 10+), in
  dieser Reihenfolge, leicht links. Die Auswahl bleibt stehen, bis man sie ändert, auch über einen
  Neustart der App hinweg. Orakel und Probe lesen sie, keiner von beiden hat eine eigene.
- **Der Log hält Kopien, keine Verweise.** Ein Logeintrag hält fest, was in dem Moment galt: den
  Namen der Stufe und ihre Chance, den Namen des Charakters, die DMs mit ihren Bezeichnungen, den Text
  der Karteneinträge. Ändert sich später ein Charakter, eine Liste oder eine Hausregel, bleibt der
  Log, wie er war. Einträge werden nur angehängt, nie geändert oder gelöscht. Die Reihenfolge ist die
  Reihenfolge der Ereignisse; dass das Neueste unten steht, ist Sache der Anzeige.
- **Würfe stehen im Log, nicht nur ihr Ergebnis.** Gespeichert werden die einzelnen Würfel (`dice`,
  `roll`); Summe, Ja/Nein und Erfolg (`/total`, `/yes`, `/success`) folgen daraus.
- **Orakel.** Ein Wurf von 1 bis 100; Ja, wenn er höchstens die Chance der gewählten Stufe ist. Die
  Frage ist freiwillig. „Außergewöhnlich Ja/Nein“, Chaosfaktor und Zufallsereignisse nach Mythic
  kommen erst nach Version 1.
- **Karte ziehen.** Eine Karte zieht für jedes Feld aller Bereiche einen Eintrag aus dessen Liste,
  die Themen-Reiter eingeschlossen. Die drei Namensfelder ziehen aus derselben Liste und sind immer
  verschieden. Eine gestellte Frage geht beim Ziehen auf die Karte über.
- **Die Karte ist offen, bis man sie bestätigt oder verwirft.** Es gibt höchstens eine offene Karte.
  Man wählt beliebig viele Felder aus, über Bereiche und Reiter hinweg. *Bestätigen* übernimmt nur
  die ausgewählten Felder in den Log, als Kopie von Bezeichnung und Text, in der Reihenfolge der
  Karte; danach ist die Karte zu. *Verwerfen* schließt sie ohne Logeintrag. *Neu ziehen* ersetzt sie
  durch eine neue; die Auswahl geht verloren, die Frage bleibt. Eine offene Karte wird nicht
  gespeichert.
- **Probe.** Es gilt: 2W6 + Fertigkeit + gewählte Attribute ≥ Zielwert.
  - Zuerst wählt man die Fertigkeit: eine Fertigkeitsstufe des Charakters (DM = Stufe) oder „ohne
    Fertigkeit“ (DM aus den Hausregeln, −3). Solange keine gewählt ist, gibt es keine Probe zu
    würfeln.
  - Erst danach lassen sich Attribute dazuwählen. Ein gewähltes Attribut gibt +1 ab `bonusFrom` (9),
    −1 bis `malusUpTo` (5), sonst ±0. Attribute mit ±0 sind nicht wählbar.
  - Der Zielwert kommt aus der gewählten Stufe. Der nötige Wurf ist Zielwert minus DM, die
    Wahrscheinlichkeit wird exakt aus den 36 Kombinationen von 2W6 gezählt: Bis 2 ist sie sicher,
    über 12 unmöglich.
  - Wechselt man den Charakter, beginnt eine neue Probe. Eine vorbereitete Probe wird nicht
    gespeichert.
  - Gewürfelt wird eine Probe als `TaskResult` in den Log übernommen: Name des Charakters, Zielwert,
    die zwei Würfel und je DM eine Zeile mit Bezeichnung (z. B. „Pilot-2“, „GES A“, „ohne
    Fertigkeit“).
- **Charakter.** Die sechs UPP-Werte liegen zwischen 0 und 15. Eine Fertigkeit kommt bei einem
  Charakter höchstens einmal vor, ihre Stufe ist 0 oder mehr. Ausrüstung, Herkunft (`background`,
  z. B. „Ex-Scout · 4 Dienstzeiten · 34 Jahre“) und Notiz sind in Version 1 freier Text, Credits eine
  ganze Zahl.
- **Referenzdaten sind Daten.** Stufen, Hausregeln, Fertigkeiten, Bereiche, Felder und Listen stehen
  als Dateien unter `src/data/` und werden beim Start geprüft. Pfeile führen nur aus dem Spielstand in
  die Referenzdaten, nie zurück. Die Listen sind eigene Inhalte, nicht die Texte des GMA-Decks.

## Offene Fragen zum Entwurf

1. **Sprache im Code:** Englische Bezeichner im Code, deutsche Begriffe in Oberfläche und Doku, mit
   der Tabelle oben als Brücke. Einverstanden, oder lieber deutsche Bezeichner?
2. **Szenen:** Der UI-Entwurf zeigt „Log · Szene 4“. Gehören Szenen schon in Version 1, also eine
   `Scene`, die Logeinträge gruppiert? Oder erst mit Mythics Szenenstruktur?
3. **Mehrere Kampagnen:** Reicht in Version 1 eine?
4. **Feinjustierung ±1** (Rule 68A, z. B. 11+): schon in Version 1 oder später?
5. **Karte ohne Auswahl bestätigen:** Soll das nichts in den Log schreiben, nur die Frage, oder gar
   nicht möglich sein?
6. **Unmögliche Probe** (nötiger Wurf über 12): Darf man trotzdem würfeln, damit es im Log steht?
7. **Charaktere pflegen:** Legt man in Version 1 Charaktere von Hand an und bearbeitet sie, oder
   reichen zunächst fest eingetragene?
8. **Hausregeln einstellbar:** Sind `HouseRules` in Version 1 nur Daten im Code, oder kann man sie in
   der App ändern (z. B. „ohne Fertigkeit −3“ abschalten)? Im zweiten Fall wären sie Spielstand
   (blau), nicht Referenzdaten.

## Wo der Code noch nicht folgt

Es gibt noch keinen Code.
