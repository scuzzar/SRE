# Domänenmodell

**Dieses Diagramm führt.** Der Code folgt ihm, nie umgekehrt. Eine Änderung am Modell wird zuerst
hier gemacht, abgestimmt und dann in den Code übertragen. Das Diagramm wird nie umgezeichnet, damit
es zu dem passt, was der Code gerade tut. Solange der Code noch nicht nachgezogen hat, stehen die
Lücken unter [Wo der Code noch nicht folgt](#wo-der-code-noch-nicht-folgt).

> **Stand: Freigegeben für Version 1** (23. Oktober 2026). Änderungen nur noch auf dem oben
> beschriebenen Weg: erst hier, abgestimmt, dann im Code.

![Domänenmodell der Solo RPG Engine](domain-model.png)

Die Quelle ist [`domain-model.puml`](domain-model.puml) (PlantUML). Nach jeder Änderung das Bild neu
erzeugen mit `bash .claude/skills/domain-model/scripts/render.sh docs/domain-model.puml`; das Skript
lädt PlantUML bei Bedarf selbst und braucht nur Java, kein Graphviz.

Das Diagramm zeigt den **gespeicherten Stand** und die Referenzdaten, auf die er verweist: Daten und
Beziehungen, keine Operationen. **Blau** ist der Spielstand, den die App speichert. **Grau mit
gestricheltem Rahmen** ist flüchtig: Es besteht zwischen zwei Eingaben und wird nie gespeichert. Es
kommt nur ins Diagramm, wenn sich ein Ablauf sonst nicht abbilden lässt. Im Code liegt es im Paket
`draft`; das Diagramm zeigt das nur durch die Farbe. **Grün** sind Referenzdaten: feste Tabellen, in
jeder Kampagne gleich. **Weiß** sind Werte und Wertelisten.

## Begriffe

Die Bezeichner im Code sind englisch, Oberfläche und Dokumentation deutsch. Diese Tabelle ist die
gemeinsame Sprache: Wer „Probe“ sagt, meint `Task`, und umgekehrt. Begriffe und Werte aus Classic
Traveller bleiben englisch, wie im Regelwerk: die Attributkürzel, die Namen der Fertigkeiten (Pilot,
Vacc Suit, Jack-of-all-Trades, …), Terms, Cr.

| Deutsch | Code | Was |
|---|---|---|
| Kampagne | `Campaign` | Alles, was zu einem Spiel gehört |
| Charakter | `Character` | Ein Spielercharakter mit seiner Charakterkarte |
| UPP | `Upp` | Die sechs Attributwerte |
| Attribut | `Characteristic` | STR, DEX, END, INT, EDU, SOC |
| Fertigkeit | `Skill` | Eine Fertigkeit aus der Liste, z. B. Pilot |
| Kürzel | `Skill.short` | Drei Zeichen für eine Fertigkeit, z. B. Pil für Pilot |
| Fertigkeitsstufe | `SkillLevel` | Die Stufe, die ein Charakter in einer Fertigkeit hat, z. B. Pilot-2 |
| Stufe (Hoch/Mittel/Gering) | `Odds` | Die eine Auswahl für Orakel und Proben |
| Hausregeln | `HouseRules` | Die Zahlen, nach denen Proben gerechnet werden |
| Log | `LogEntry` | Ein Eintrag im Verlauf |
| Orakelantwort | `OracleAnswer` | Ja oder Nein auf eine Frage |
| Würfelwurf (2W6) | `DiceRoll` | Ein einfacher Wurf mit zwei Würfeln |
| Inspirationskarte | `Card` | Eine gezogene Karte, solange sie offen ist |
| Kartenauswahl | `CardPick` | Was man von einer Karte in den Log übernimmt, mit der Frage |
| Ausgewählter Eintrag | `PickedItem` | Ein übernommenes Feld: welches Feld, welcher Eintrag |
| Entwurf | Paket `draft` | Was später ein Logeintrag wird, solange es noch offen ist |
| Probe | `Task` | Eine Probe, solange sie im Charakter-Screen vorbereitet wird |
| Probenergebnis | `TaskResult` | Eine gewürfelte Probe |
| Bereich der Karte, Themen-Reiter | `Section` | Zufallsereignis, Sinneseindrücke, …; Auftrag, NSC, … |
| Feld der Karte | `Slot` | Verb, Hören, Name, Auslöser, … |
| Eintrag | `Entry` | Ein möglicher Text eines Feldes, z. B. „Schulden begleichen.“ |

## Regeln, die das Bild nicht zeigt

- **Was draußen bleibt.** Was nicht gespeichert wird, gehört nicht ins Modell, außer der offenen
  Karte und der Probe in Vorbereitung. Der Controller hält, welcher Screen offen ist und ob das
  Ergebnis-Popup zu sehen ist. Reine Darstellung bleibt in der View: der gewählte Themen-Reiter, der
  Text im Fragefeld während des Tippens, Farben, die Hex-Schreibweise der UPP und das Format der
  Uhrzeit.
- **Entwürfe.** Im Paket `draft` liegen die Entwürfe eines Logeintrags: die offene Karte (`Card`,
  wird beim Bestätigen zum `CardPick`) und die Probe in Vorbereitung (`Task`, wird beim Würfeln zum
  `TaskResult`). Je Kampagne gibt es höchstens eine offene Karte und höchstens eine Probe. Pfeile
  führen nur aus `draft` heraus, nie hinein: Der gespeicherte Stand weiß nichts von seinen
  Entwürfen. Entwürfe werden nie gespeichert; beendet das Handy die App, sind sie weg.
- **Eine Kampagne.** In Version 1 gibt es genau eine Kampagne. Alles, was gespeichert wird, hängt an
  ihr.
- **Nicht in Version 1.** Szenen (der Log läuft ohne Gliederung durch; Szenen kommen mit Mythics
  Szenenstruktur), mehrere Kampagnen, die Feinjustierung des Zielwerts um ±1, eigene Fertigkeiten und
  Hausregeln, die man in der App einstellt.
- **Eine Auswahl für Orakel und Proben.** Die Kampagne hat immer genau eine gewählte Stufe (`odds`).
  Die drei Stufen sind Referenzdaten: Hoch (75 %, 6+), Mittel (50 %, 8+), Gering (25 %, 10+), in
  dieser Reihenfolge, leicht links. Die Auswahl bleibt stehen, bis man sie ändert, auch über einen
  Neustart der App hinweg. Orakel und Probe lesen sie, keiner von beiden hat eine eigene.
- **Der Log verweist, er kopiert nicht.** Ein Logeintrag hält nur fest, was allein ihm gehört: Frage,
  Zeitpunkt und Würfel, beim Orakel dazu die Chance, bei einer Probe DM und Zielwert (siehe
  *Orakel* und *Probe*). Alles andere ist ein
  Verweis: auf die Stufe, den Charakter, die Fertigkeitsstufe, die Attribute, auf Feld und Eintrag
  der Karte. Logeinträge werden nur angehängt, nie geändert oder gelöscht. Die Reihenfolge ist die
  Reihenfolge der Ereignisse; dass das Neueste unten steht, ist Sache der Anzeige.
- **Worauf der Log verweist, wird nie gelöscht.** Ein Charakter, der im Log vorkommt, bleibt in der
  Kampagne, ebenso seine Fertigkeitsstufen; Stufen, Felder und Einträge der Referenzdaten haben eine
  feste Id und bleiben in den Daten. Ändert sich etwas daran (ein Charakter heißt anders, lernt
  Pilot-3), zeigen auch alte Logeinträge den neuen Stand. Das Ergebnis einer Orakelfrage oder Probe
  ändert sich dadurch nicht, weil Chance bzw. DM und Zielwert festgehalten sind.
- **Würfe stehen im Log, nicht nur ihr Ergebnis.** Gespeichert werden die einzelnen Würfel (`dice`,
  `roll`); Summe, Ja/Nein und Erfolg (`/total`, `/yes`, `/success`) folgen daraus.
- **Orakel.** Ein Wurf von 1 bis 100; Ja, wenn er höchstens die Chance der gewählten Stufe ist. Die
  `OracleAnswer` verweist auf die Stufe und hält die Chance zum Zeitpunkt des Wurfs fest (`chance`);
  Ja oder Nein (`/yes`: `roll` ≤ `chance`) folgt allein daraus, nie aus dem heutigen Stand der Stufe.
  Die Frage ist freiwillig. „Außergewöhnlich Ja/Nein“, Chaosfaktor und Zufallsereignisse nach Mythic
  kommen erst nach Version 1.
- **Karte ziehen.** Ziehen legt eine `Card` an: für jedes Feld aller Bereiche einen seiner Einträge
  zufällig (`drawn`), die Themen-Reiter eingeschlossen, in der Reihenfolge der Bereiche und Felder.
  Eine gestellte Frage geht auf die Karte über. Der Bereich *Namen* hat drei Felder mit je eigenen
  Einträgen (eher weiblich, eher männlich, neutral bzw. Genre-Name), wie auf der GMA-Karte; so sind
  die drei Namen immer verschieden.
- **Die Karte ist offen, bis man sie bestätigt oder verwirft.** Antippen nimmt einen gezogenen
  Eintrag in die Auswahl (`picked`) auf oder wieder heraus; ausgewählt sein kann nur, was gezogen
  wurde. *Verwerfen* schließt die Karte ohne Logeintrag. *Neu ziehen* ersetzt sie durch eine neue;
  die Auswahl geht verloren, die Frage bleibt.
- **Bestätigen** geht erst, wenn mindestens ein Eintrag ausgewählt ist; ohne Auswahl bleibt nur
  Verwerfen. Es legt einen `CardPick` mit der Frage der Karte an und darin je ausgewähltem Eintrag
  ein `PickedItem`, in der Reihenfolge der Karte; danach ist die Karte zu. Das `PickedItem` verweist
  auf den gezogenen Eintrag (`Entry`); das Feld (`/in`) folgt daraus, weil jeder Eintrag zu genau
  einem Feld gehört.
- **Probe.** Es gilt: 2W6 + Fertigkeit + gewählte Attribute ≥ Zielwert.
  - Zuerst wählt man die Fertigkeit: eine Fertigkeitsstufe des Charakters (DM = Stufe) oder „ohne
    Fertigkeit“ (DM aus den Hausregeln, −3). Solange keine gewählt ist, gibt es keine Probe zu
    würfeln.
  - Erst danach lassen sich Attribute dazuwählen. Ein gewähltes Attribut gibt +1 ab `bonusFrom` (9),
    −1 bis `malusUpTo` (5), sonst ±0. Attribute mit ±0 sind nicht wählbar.
  - Der Zielwert kommt aus der gewählten Stufe. Der nötige Wurf ist Zielwert minus DM, die
    Wahrscheinlichkeit wird exakt aus den 36 Kombinationen von 2W6 gezählt: Bis 2 ist sie sicher,
    über 12 unmöglich. Auch eine unmögliche Probe darf man würfeln; sie misslingt immer und steht
    trotzdem im Log.
  - Die Probe in Vorbereitung ist eine `Task`. Sie verweist auf den Charakter, auf eine seiner
    Fertigkeitsstufen (`uses`) oder ist `unskilled`, nie beides; keins von beiden heißt: noch keine
    Fertigkeit gewählt. Wechselt man den Charakter, beginnt eine neue Probe.
  - Gewürfelt wird eine Probe als `TaskResult` in den Log übernommen. Es verweist auf Charakter,
    Fertigkeitsstufe (keine heißt „ohne Fertigkeit“), die gewählten Attribute und die Stufe, und es
    hält die zwei Würfel sowie DM (`dm`) und Zielwert (`target`) zum Zeitpunkt des Wurfs fest. Der
    Erfolg (`/success`: Würfel + `dm` ≥ `target`) folgt allein daraus, nie aus dem heutigen Stand von
    Charakter, Hausregeln oder Stufe. Die Verweise sagen, wer und womit gewürfelt hat.
  - Bei `Task` und `TaskResult` gehört die Fertigkeitsstufe (`uses`) immer dem Charakter, auf den sie
    verweisen (`for`), und der Charakter immer zur Kampagne.
- **Charakter.** Charaktere legt man in der App an und bearbeitet sie; eine Charaktererschaffung
  nach Regeln gibt es in Version 1 nicht. Die sechs UPP-Werte liegen zwischen 0 und 15. Eine
  Fertigkeit kommt bei einem Charakter höchstens einmal vor, ihre Stufe ist 0 oder mehr; Fertigkeiten
  kommen nur aus der festen Liste der Referenzdaten. Jede Fertigkeit hat ein Kürzel aus genau drei Zeichen,
  das in der Liste nur einmal vorkommt (Pil für Pilot, JoT für Jack-of-all-Trades). Es dient der
  knappen Anzeige; der Log zeigt den vollen Namen. Ausrüstung, Herkunft (`background`, z. B.
  „Ex-Scout · 4 Terms · 34 Jahre“) und Notiz sind in Version 1 freier Text, Credits eine
  ganze Zahl.
- **Löschen und Ausblenden.** Ein Charakter oder eine Fertigkeitsstufe, auf die kein Logeintrag
  verweist, wird wirklich gelöscht. Verweist der Log darauf, wird sie stattdessen ausgeblendet
  (`retired`): Sie verschwindet aus dem Charakter-Screen und lässt sich nicht mehr für Proben wählen,
  bleibt aber gespeichert, und der Log zeigt sie weiter. Ein ausgeblendeter Charakter lässt sich
  wieder einblenden.
- **Referenzdaten sind Daten.** Stufen, Hausregeln, Fertigkeiten, Bereiche, Felder und Einträge
  stehen als Dateien unter `src/data/` und werden beim Start geprüft. Man ändert sie nur dort, nicht
  in der App. Pfeile führen nur aus Spielstand
  und Entwürfen in die Referenzdaten, nie zurück. Die Einträge sind eigene Inhalte, nicht die Texte
  des GMA-Decks.

## Wo der Code noch nicht folgt

Der Code für Version 1 liegt unter `src/` (siehe [ARCHITECTURE.md](../ARCHITECTURE.md)). Er folgt dem
Diagramm mit diesen Ausnahmen:

- **`Card → Campaign : in` und `Task → Campaign : in`** sind im Code kein Feld. Der Controller hält
  höchstens eine offene Karte und höchstens eine Probe neben der einen Kampagne; damit ist die
  Multiplizität erfüllt. Kommen mehrere Kampagnen, braucht es das Feld.
- **Beispielcharaktere.** Eine neue Kampagne beginnt mit Kira Vant und Jonas Reyl aus der README
  (`src/data/examples.json`). Das Modell sagt dazu nichts; die beiden lassen sich löschen, solange
  der Log nicht auf sie verweist.
