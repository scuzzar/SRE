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

Das Diagramm zeigt nur den **gespeicherten Stand** und die Referenzdaten, auf die er verweist: Daten
und Beziehungen, keine Operationen. Was nur kurz während der Bedienung besteht (eine offene Karte,
eine Probe in Vorbereitung), ist Zustand der View und steht nicht im Diagramm. **Blau** ist der
Spielstand, den die App speichert. **Grün** sind Referenzdaten: feste Tabellen, in jeder Kampagne
gleich. **Weiß** sind Werte und Wertelisten.

## Begriffe

Die Bezeichner im Code sind englisch, Oberfläche und Dokumentation deutsch. Diese Tabelle ist die
gemeinsame Sprache: Wer „Probenergebnis“ sagt, meint `TaskResult`, und umgekehrt.

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
| Kartenauswahl | `CardPick` | Was man von einer Karte in den Log übernimmt, mit der Frage |
| Ausgewählter Eintrag | `PickedItem` | Ein übernommenes Feld: welches Feld, welcher Eintrag |
| Probenergebnis | `TaskResult` | Eine gewürfelte Probe |
| Bereich der Karte, Themen-Reiter | `Section` | Zufallsereignis, Sinneseindrücke, …; Auftrag, NSC, … |
| Feld der Karte | `Slot` | Verb, Hören, Name, Auslöser, … |
| Eintrag | `Entry` | Ein möglicher Text eines Feldes, z. B. „Schulden begleichen.“ |

## Regeln, die das Bild nicht zeigt

- **Was draußen bleibt.** Alles, was nur die Anzeige betrifft, gehört nicht ins Modell: welcher
  Screen offen ist, welcher Themen-Reiter gewählt ist, der Text im Fragefeld vor dem Absenden, ob das
  Ergebnis-Popup gerade zu sehen ist, Farben, die Hex-Schreibweise der UPP und das Format der Uhrzeit.
  Das ist Zustand der View. Dazu gehören auch die **offene Inspirationskarte** (welcher Eintrag je
  Feld gezogen wurde und was gerade angetippt ist) und die **Probe in Vorbereitung** (Charakter,
  gewählte Fertigkeit, gewählte Attribute). Beides ist kein Teil des Modells; die Regeln dafür
  schon.
- **Eine Kampagne.** In Version 1 gibt es genau eine Kampagne. Alles, was gespeichert wird, hängt an
  ihr.
- **Eine Auswahl für Orakel und Proben.** Die Kampagne hat immer genau eine gewählte Stufe (`odds`).
  Die drei Stufen sind Referenzdaten: Hoch (75 %, 6+), Mittel (50 %, 8+), Gering (25 %, 10+), in
  dieser Reihenfolge, leicht links. Die Auswahl bleibt stehen, bis man sie ändert, auch über einen
  Neustart der App hinweg. Orakel und Probe lesen sie, keiner von beiden hat eine eigene.
- **Der Log verweist, er kopiert nicht.** Ein Logeintrag hält nur fest, was allein ihm gehört: Frage,
  Zeitpunkt und Würfel, bei einer Probe dazu DM und Zielwert (siehe *Probe*). Alles andere ist ein
  Verweis: auf die Stufe, den Charakter, die Fertigkeitsstufe, die Attribute, auf Feld und Eintrag
  der Karte. Logeinträge werden nur angehängt, nie geändert oder gelöscht. Die Reihenfolge ist die
  Reihenfolge der Ereignisse; dass das Neueste unten steht, ist Sache der Anzeige.
- **Worauf der Log verweist, wird nie gelöscht.** Ein Charakter, der im Log vorkommt, bleibt in der
  Kampagne, ebenso seine Fertigkeitsstufen; Stufen, Felder und Einträge der Referenzdaten haben eine
  feste Id und bleiben in den Daten. Ändert sich etwas daran (ein Charakter heißt anders, lernt
  Pilot-3), zeigen auch alte Logeinträge den neuen Stand. Das Ergebnis einer Probe ändert sich
  dadurch nicht, weil DM und Zielwert festgehalten sind.
- **Würfe stehen im Log, nicht nur ihr Ergebnis.** Gespeichert werden die einzelnen Würfel (`dice`,
  `roll`); Summe, Ja/Nein und Erfolg (`/total`, `/yes`, `/success`) folgen daraus.
- **Orakel.** Ein Wurf von 1 bis 100; Ja, wenn er höchstens die Chance der gewählten Stufe ist. Die
  Frage ist freiwillig. „Außergewöhnlich Ja/Nein“, Chaosfaktor und Zufallsereignisse nach Mythic
  kommen erst nach Version 1.
- **Karte ziehen.** Ziehen heißt: für jedes Feld aller Bereiche einen seiner Einträge zufällig
  wählen, die Themen-Reiter eingeschlossen. Das Ziehen ist eine Regel des Modells, das Ergebnis aber
  kein Objekt darin: Die View hält die offene Karte, bis man sie bestätigt, verwirft oder neu zieht.
  Verwerfen und neu ziehen hinterlassen nichts im Modell.
- **Bestätigen** legt einen `CardPick` mit der Frage an und darin je ausgewähltem Feld ein
  `PickedItem`, in der Reihenfolge der Karte. Das `PickedItem` verweist auf das Feld (`Slot`) und auf
  den gezogenen Eintrag (`Entry`); der Eintrag gehört immer zu diesem Feld.
- **Probe.** Es gilt: 2W6 + Fertigkeit + gewählte Attribute ≥ Zielwert.
  - Zuerst wählt man die Fertigkeit: eine Fertigkeitsstufe des Charakters (DM = Stufe) oder „ohne
    Fertigkeit“ (DM aus den Hausregeln, −3). Solange keine gewählt ist, gibt es keine Probe zu
    würfeln.
  - Erst danach lassen sich Attribute dazuwählen. Ein gewähltes Attribut gibt +1 ab `bonusFrom` (9),
    −1 bis `malusUpTo` (5), sonst ±0. Attribute mit ±0 sind nicht wählbar.
  - Der Zielwert kommt aus der gewählten Stufe. Der nötige Wurf ist Zielwert minus DM, die
    Wahrscheinlichkeit wird exakt aus den 36 Kombinationen von 2W6 gezählt: Bis 2 ist sie sicher,
    über 12 unmöglich.
  - Wechselt man den Charakter, beginnt eine neue Probe.
  - Gewürfelt wird eine Probe als `TaskResult` in den Log übernommen. Es verweist auf Charakter,
    Fertigkeitsstufe (keine heißt „ohne Fertigkeit“), die gewählten Attribute und die Stufe, und es
    hält die zwei Würfel sowie DM (`dm`) und Zielwert (`target`) zum Zeitpunkt des Wurfs fest. Der
    Erfolg (`/success`: Würfel + `dm` ≥ `target`) folgt allein daraus, nie aus dem heutigen Stand von
    Charakter, Hausregeln oder Stufe. Die Verweise sagen, wer und womit gewürfelt hat.
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
8. **Namen:** Die GMA-Karte zeigt drei verschiedene Namen. Ohne gemeinsame Liste hat jedes der drei
   Namensfelder eigene Einträge. Sollen es drei Felder mit je eigener Liste sein (z. B. eher
   weiblich, eher männlich, neutral, wie beim GMA), oder ein Feld, aus dem drei verschiedene Einträge
   gezogen werden?
9. **Doppelter Verweis:** Da jeder Eintrag zu genau einem Feld gehört, folgt das Feld eines
   `PickedItem` schon aus seinem Eintrag. Den Pfeil `in` behalten (wie vorgeschlagen) oder als
   abgeleitet (`/in`) kennzeichnen?
10. **Hausregeln einstellbar:** Sind `HouseRules` in Version 1 nur Daten im Code, oder kann man sie in
   der App ändern (z. B. „ohne Fertigkeit −3“ abschalten)? Im zweiten Fall wären sie Spielstand
   (blau), nicht Referenzdaten.

## Wo der Code noch nicht folgt

Es gibt noch keinen Code.
