# Domänenmodell

**Dieses Diagramm führt.** Der Code folgt ihm, nie umgekehrt. Eine Änderung am Modell wird zuerst
hier gemacht, abgestimmt und dann in den Code übertragen. Das Diagramm wird nie umgezeichnet, damit
es zu dem passt, was der Code gerade tut. Solange der Code noch nicht nachgezogen hat, stehen die
Lücken unter [Wo der Code noch nicht folgt](#wo-der-code-noch-nicht-folgt).

> **Stand: Freigegeben für Version 1** (23. Oktober 2026). Änderungen nur noch auf dem oben
> beschriebenen Weg: erst hier, abgestimmt, dann im Code. Seitdem freigegeben: `Entry.retired`
> (24. Oktober 2026, siehe *Einträge austauschen*); ausgeblendete Felder und Bereiche (ebenso);
> Spalten und Paare (24. Oktober 2026, siehe *Karte ziehen*, *Paare aus Mythic*).
> Am 25. Oktober 2026 freigegeben: mehrere Kampagnen mit Namen, Export und Import als Datei,
> Logeinträge löschen (siehe *Mehrere Kampagnen*, *Kampagnendatei*, *Der Log verweist, er kopiert
> nicht*), dafür ändert sich das Bild nicht: `Campaign` war schon die oberste Ebene und hat schon
> einen Namen. Neu im Bild: `Character.dead` (siehe *Tot*).
>
> Ebenfalls am 25. Oktober 2026 freigegeben: Jack-of-all-Trades zählt in Proben als Stufe 0 und
> ersetzt „ohne Fertigkeit“ (siehe *Probe*); das Bild ändert sich dadurch nicht. Am 27. Oktober 2026
> ergänzt: Jack-of-all-Trades zeigt keine Stufe, und ein zweites JoT in der Erschaffung gibt einen
> weiteren Fertigkeitswurf (siehe *Zugewinne*); auch das ändert das Bild nicht.
>
> Ebenfalls am 25. Oktober 2026 freigegeben: Charaktererschaffung nach den Regeln von Classic
> Traveller, mit Lebenslauf am Charakter (siehe *Charaktererschaffung*), und Gegenstände mit Besitz
> (siehe *Gegenstände*).
> Neu im Bild: `Generation`, `Career`, `CareerRoll`, `Character.career`, Gegenstände
> (`Item`, `Possession`, siehe *Gegenstände*) und die Laufbahnen als Referenzdaten (`Service`,
> `Throw`, `Rank`, `Table`, `Gain`, `Cascade`, `Aging`).
>
> Am 27. Oktober 2026 freigegeben: Namen auf der Karte als Paar aus Vor- und Nachname (siehe
> *Namen*); das Bild ändert sich dadurch nicht.
>
> Am 31. Oktober 2026 freigegeben: der Subsektor mit Weltenerschaffung (siehe *Subsektor* und
> *Weltenerschaffung*).
>
> Am 1. November 2026 freigegeben: Ein Hexfeld speichert die Werte seiner Welt, nicht ihre Würfe.
>
> Ebenfalls am 1. November 2026 freigegeben: Heimatwelt und Welten der Terms (siehe *Heimatwelt
> und Welten der Terms*); Durchlaufen lassen (siehe *Durchlaufen*), auf ausdrücklichen Wunsch des
> Owners, das Bild ändert sich dadurch nicht. Neu im Bild: `Character.homeworld`, `Career.homeworld`,
> `Career.worlds` und die Schritte `homeworld` und `world`. Neu im Bild: `Uwp`, die Felder `empty`, `navalBase`, `scoutBase`, `gasGiant` am
> `Hex`; `WorldRoll` ist flüchtig. Neu im Bild: `Hex`, `WorldRoll`, `Campaign.hexes`,
> `WorldStep`, `WorldRollKind` und als Referenzdaten `SystemContents`, `UwpDigit`, `TradeCode`.
>
> Am 2. November 2026 freigegeben: der Charakter oben im Orakel-Screen (siehe
> *Charakter oben*). Proben würfelt man dort statt im Charakter-Screen; der Charakter-Screen dient
> nur noch der Verwaltung. Neu im Bild: `Campaign.focus`; `Task.for` ist jetzt abgeleitet
> (`/for`). Der UI-Entwurf dazu liegt unter [`ui-entwurf/charakter-leiste/`](ui-entwurf/charakter-leiste/).
>
> Am 2. November 2026 freigegeben: die Temperatur als zusätzlicher Wurf der
> Weltenerschaffung nach Mongoose Traveller 2e, nach der Atmosphäre und vor der Hydrographie, die
> bei heißen Welten einen Malus bekommt (siehe *Weltenerschaffung*, Schritt 4 und 5). Neu im Bild:
> `Hex.temperature`, `WorldRollKind.temperature`, `UwpDigit.temperatureDm` und als Referenzdaten
> `Temperature` mit `hydroDm`.
>
> Ebenfalls am 2. November 2026 freigegeben: die **Oberfläche** einer Welt nach dem
> *World Builder's Handbook* (DGP), als Vorarbeit für eine spätere Oberflächenkarte (siehe
> *Weltenerschaffung*, Schritt 6, und *Oberfläche*). Neu im Bild: `Surface` am `Hex`, der Schritt
> `surface` und als Referenzdaten `SurfaceRow` mit `SurfaceTable` und `DiceExpr`.
> Nach einer Probe mit 20.000 Welten ergänzt (ebenfalls 2. November 2026 freigegeben): höchstens
> 6 große Kontinente, und die Weltkarte nennt „nur Archipele“ bzw. „nur Seen“ ohne die große
> Zahl (siehe *Oberfläche*). Das Bild ändert sich dadurch nicht.
>
> Am 3. November 2026 freigegeben: Deutungen und Notizen im Log (siehe *Deutungen und Notizen*).
> Neu im Bild: `Note` mit `text` und dem Verweis `interprets`. Der UI-Entwurf dazu liegt unter
> [`ui-entwurf/deutung/`](ui-entwurf/deutung/).
>
> **Zurzeit** hat die Karte nur die Felder mit Einträgen aus Mythic und die Namen, alle als Paar: Aktion und
> Beschreibung des Zufallsereignisses, Hören und Riechen, die drei Namen sowie die Themen-Tafeln NSC, NSC-Aktionen,
> Welt (mit Schiff), Wesen und Handlung mit Mythics Elements-Tabellen. Alle übrigen Felder und Bereiche sind ausgeblendet, bis es
> Einträge für sie gibt.

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
| Kampagne | `Campaign` | Alles, was zu einem Spiel gehört; die oberste Ebene |
| Offene Kampagne | (Zustand des Controllers) | Die Kampagne, in der man gerade spielt |
| Kampagnendatei | `CampaignFile` | Eine Kampagne als JSON-Datei, zum Sichern und Weitergeben |
| Charakter | `Character` | Ein Spielercharakter mit seiner Charakterkarte |
| Charakter oben | `Campaign.focus` | Der Charakter, der oben im Orakel-Screen steht; für ihn würfelt man Proben |
| Tot | `Character.dead` | Der Charakter ist in der Geschichte gestorben; er bleibt in der Kampagne |
| UPP | `Upp` | Die sechs Attributwerte |
| Attribut | `Characteristic` | STR, DEX, END, INT, EDU, SOC |
| Fertigkeit | `Skill` | Eine Fertigkeit aus der Liste, z. B. Pilot |
| Kürzel | `Skill.short` | Drei Zeichen für eine Fertigkeit, z. B. Pil für Pilot |
| Fertigkeitsstufe | `SkillLevel` | Die Stufe, die ein Charakter in einer Fertigkeit hat, z. B. Pilot-2 |
| Gegenstand | `Item` | Etwas aus der festen Liste, das man besitzen kann, mit TL, Gewicht und Preis aus den Charts |
| Art des Gegenstands | `ItemKind` | weapon, ammunition, armor, equipment, vehicle, ship, passage, membership |
| TL | `Item.tl` | Tech Level, ab dem es den Gegenstand gibt |
| Besitz | `Possession` | Ein Gegenstand, den ein Charakter hat, mit Anzahl, z. B. 2 × Low Passage |
| Stufe (Hoch/Mittel/Gering) | `Odds` | Die eine Auswahl für Orakel und Proben |
| Hausregeln | `HouseRules` | Die Zahlen, nach denen Proben gerechnet werden |
| Log | `LogEntry` | Ein Eintrag im Verlauf |
| Orakelantwort | `OracleAnswer` | Ja oder Nein auf eine Frage |
| Notiz | `Note` ohne `interprets` | Freier Text im Log, z. B. „Wir landen auf Regina.“ |
| Deutung | `Note` mit `interprets` | Was man aus einem Ergebnis macht, z. B. „Die Tür ist offen, aber jemand war schon hier.“ |
| Ergebnis | `OracleAnswer`, `DiceRoll`, `CardPick`, `TaskResult` | Ein Logeintrag, den das Orakel, die Würfel oder die Karte liefert; nur ihn kann man deuten |
| Schreibzeile | (Fragefeld) | Das eine Textfeld über den Knöpfen; was der Text wird, entscheidet der Knopf |
| Würfelwurf (2W6) | `DiceRoll` | Ein einfacher Wurf mit zwei Würfeln |
| Inspirationskarte | `Card` | Eine gezogene Karte, solange sie offen ist |
| Kartenauswahl | `CardPick` | Was man von einer Karte in den Log übernimmt, mit der Frage |
| Ausgewählter Eintrag | `PickedItem` | Ein übernommenes Feld: welches Feld, welcher Eintrag |
| Entwurf | Paket `draft` | Was später ein Logeintrag wird, solange es noch offen ist |
| Probe | `Task` | Eine Probe, solange sie für den Charakter oben vorbereitet wird |
| Probenergebnis | `TaskResult` | Eine gewürfelte Probe |
| Bereich der Karte, Themen-Tafel | `Section` | Zufallsereignis, Sinneseindrücke, …; NSC, Welt, … |
| Feld der Karte | `Slot` | Aktion, Hören, Aussehen, Name, Auslöser, … |
| Spalte | `Column` | Eine Liste von Einträgen in einem Feld; ein Feld hat eine oder zwei |
| Paar | (zwei Einträge im `drawn` eines Feldes) | Was ein Feld mit zwei Spalten zieht: aus jeder Spalte einen Eintrag, z. B. „verraten · Technologie“ |
| Eintrag | `Entry` | Ein möglicher Text eines Feldes, z. B. „Schulden begleichen.“ |
| Charaktererschaffung | `Generation` | Ein Charakter, der gerade nach den Regeln entsteht; wird beim Abschluss zum `Character` |
| Schritt | `GenerationStep` | Was in der Erschaffung als Nächstes dran ist, z. B. Überleben würfeln |
| Lebenslauf | `Career` | Alle Würfe und Entscheidungen einer Erschaffung, der Reihe nach |
| Wurf der Laufbahn | `CareerRoll` | Ein Wurf in der Erschaffung, mit der Entscheidung, die zu ihm gehört |
| Laufbahn, Dienstzweig | `Service` | Navy, Marines, Army, Scouts, Merchants, Other |
| Musterung | `CareerRoll` mit `enlistment` | Der Wurf, um in die gewählte Laufbahn zu kommen |
| Einberufung | `CareerRoll` mit `draft` | 1W6, wenn die Musterung scheitert; bestimmt die Laufbahn |
| Term | (`Career./terms`) | Vier Jahre Dienst |
| Heimatwelt | `Character.homeworld`, `Career.homeworld` | Die Welt, von der ein Charakter stammt |
| Welt eines Terms | `Career.worlds` | Die Welt, auf der ein Charakter einen Term gedient hat |
| Offizierspatent | `CareerRoll` mit `commission` | Der Wurf auf den ersten Rang |
| Beförderung | `CareerRoll` mit `promotion` | Der Wurf auf den nächsten Rang |
| Weiterverpflichtung | `CareerRoll` mit `reenlist` | Der Wurf am Ende jedes Terms; 12 heißt: bleiben müssen |
| Abmusterung | `CareerRoll` mit `cash` oder `benefit` | Die Würfe auf Geld oder Sachwerte am Ende der Laufbahn |
| Wurf mit Zielwert | `Throw` | Ein 2W6-Wurf einer Laufbahn, z. B. Survival 5+, mit seinen DMs |
| Rang | `Rank` | Ein Rang einer Laufbahn, z. B. Lt Cmdr (Rang 3 der Navy) |
| Tabelle | `Table` | Eine Fertigkeitstabelle, die Sachwerte- oder die Geldtabelle einer Laufbahn |
| Zugewinn | `Gain` | Eine Zeile einer Tabelle oder was ein Rang bringt: Fertigkeit, Attribut, Gegenstand, Waffe oder Geld |
| Kaskade | `Cascade` | Ein Sammelbegriff, aus dem man eine Fertigkeit wählt: Blade Combat, Gun Combat, Vehicle |
| Altern | `Aging` | Eine Zeile der Aging Table: ab welchem Term welches Attribut wie viel verlieren kann |
| Subsektor | (`Campaign.hexes`) | Die Karte der Kampagne: 8 × 10 Hexfelder wie auf TAS Form 6; in der App der Reiter „Sektor“ |
| Hexfeld | `Hex` | Ein erzeugtes Feld des Subsektors, benannt nach Spalte und Zeile, z. B. 0304 |
| Nicht erzeugt | (kein `Hex`) | Ein Feld, für das noch nicht gewürfelt wurde; nur hier beginnt eine Weltenerschaffung |
| Leer | `Hex.empty` | Ein erzeugtes Feld ohne Welt: Das Vorkommen hat keine ergeben |
| Welt | `Hex` mit Welt | Ein Hexfeld mit Welt (Planet): Name, UWP, Basen, Gasriese, Handelscodes |
| Weltenerschaffung | `Hex` mit `/step` vor `done` | Eine Welt, die gerade Wurf für Wurf entsteht |
| Wurf der Weltenerschaffung | `WorldRoll` | Ein Wurf aus der World Generation Checklist, z. B. Atmosphäre 2W6 − 7 + Größe; flüchtig, gespeichert wird nur sein Ergebnis |
| UWP | `Uwp` | Universal World Profile, z. B. A788899-C: Raumhafen, Größe, Atmosphäre, Hydrographie, Bevölkerung, Regierung, Gesetz, TL |
| Ziffer des UWP | `UwpDigit` | Eine Ziffer einer Stelle des UWP mit ihrem Text und ihrem DM auf den TL, z. B. Atmosphäre 8, Dense |
| Systeminhalt | `SystemContents` | Eine Zeile der System Contents Table: Raumhafen, Marinebasis, Scoutbasis, Gasriese |
| Handelscode | `TradeCode` | Ag, Na, In, Ni, Ri, Po, Wa, De, Va, As, Ic, mit Bedingungen an das UWP |
| Temperatur | `Hex.temperature`, `Temperature` | Wie warm eine Welt im Mittel ist: Gefroren, Kalt, Gemäßigt, Heiß oder Kochend, nach Mongoose Traveller 2e (S. 251); nicht Teil des UWP |
| Temperatur-DM | `UwpDigit.temperatureDm` | Der DM einer Atmosphäre auf den Temperaturwurf, z. B. −2 bei Atmosphäre 2 oder 3 |
| Wasser-DM | `Temperature.hydroDm` | Der DM einer Temperatur auf die Hydrographie: −2 bei Heiß, −6 bei Kochend, nicht bei Atmosphäre D |
| Oberfläche | `Surface` | Was eine spätere Oberflächenkarte braucht, nach dem *World Builder's Handbook*: Wasseranteil, Platten, Land- und Wassermassen, Leben; ohne Karte |
| Oberflächenkarte | (noch nicht im Modell) | Die Karte der Oberfläche einer Welt aus 20 Dreiecken mit Hexen; kommt später, siehe [Konzept](konzept-oberflaechenkarte.md). Nicht zu verwechseln mit der *Weltkarte* (der Karte mit UWP und Klartext) |
| Wasseranteil | `Surface.water` | Wie viel Prozent der Oberfläche Wasser ist, 0 bis 100 |
| Tektonische Platten | `Surface.plates` | Wie viele große Platten die Kruste hat; an ihren Grenzen entstehen später Gebirge |
| Große und kleine Kontinente | `Surface.majorContinents`, `Surface.minorContinents` | Landmassen mit mindestens bzw. unter 15 % der Landfläche |
| Große Inseln, Archipele | `Surface.majorIslands`, `Surface.archipelagos` | Inseln von etwa einem Hex Land bzw. Inselgruppen von etwa einem halben |
| Große und kleine Ozeane | `Surface.majorOceans`, `Surface.minorOceans` | Wassermassen mit mindestens bzw. unter 15 % der Wasserfläche |
| Kleine Meere, verstreute Seen | `Surface.smallSeas`, `Surface.scatteredLakes` | Gewässer von etwa einem Hex bzw. einem halben |
| Einheimisches Leben | `Surface.life` | Ob auf der Welt eigenes Leben entstanden ist; ohne Leben ist das Land später Wüste |
| Kontinente- und Ozeane-Tabelle | `SurfaceRow`, `SurfaceTable` | Die beiden Tabellen des *World Builder's Handbook* (S. 70), aus denen die Land- bzw. Wassermassen kommen |
| Würfelausdruck | `DiceExpr` | Wie viele W6 plus welcher DM, z. B. 2W6 + 1 oder 3W6 − 3 |

## Regeln, die das Bild nicht zeigt

- **Was draußen bleibt.** Was nicht gespeichert wird, gehört nicht ins Modell, außer der offenen
  Karte und der Probe in Vorbereitung. Der Controller hält, welcher Screen offen ist, ob das
  Ergebnis-Popup zu sehen ist und welche Weltkarte offen ist. Ob die Leiste mit dem Charakter oben
  eingeklappt ist, merkt sich das Gerät über einen Neustart hinweg, wie die offene Kampagne; zum
  Spielstand gehört das nicht. Reine Darstellung bleibt in der View: wie Felder und Tafeln angeordnet sind, ob das Menü offen ist, der
  Text im Fragefeld während des Tippens, Farben, die Hex-Schreibweise der UPP und das Format der
  Uhrzeit.
- **Entwürfe.** Im Paket `draft` liegen die Entwürfe eines Logeintrags: die offene Karte (`Card`,
  wird beim Bestätigen zum `CardPick`) und die Probe in Vorbereitung (`Task`, wird beim Würfeln zum
  `TaskResult`). Je Kampagne gibt es höchstens eine offene Karte und höchstens eine Probe. Pfeile
  führen nur aus `draft` heraus, nie hinein: Der gespeicherte Stand weiß nichts von seinen
  Entwürfen. Entwürfe werden nie gespeichert; beendet das Handy die App, sind sie weg. Ebenso flüchtig ist der Wurf
  der Weltenerschaffung (`WorldRoll`, siehe dort): Gespeichert wird nur, was er ins Hexfeld einträgt.
- **Mehrere Kampagnen.** Die Kampagne ist die oberste Ebene: Alles, was gespeichert wird, hängt an
  genau einer Kampagne, und Kampagnen wissen nichts voneinander. Es gibt immer mindestens eine;
  die letzte lässt sich nicht löschen. Jede hat einen Namen, der nicht leer ist und sich ändern
  lässt; zwei Kampagnen dürfen gleich heißen. Gespielt wird immer in genau einer, der **offenen
  Kampagne**. Welche das ist, merkt sich das Gerät über einen Neustart hinweg; zum Spielstand gehört
  das nicht. Wechselt man die Kampagne, sind offene Karte und Probe in Vorbereitung weg. Eine neue
  Kampagne beginnt leer: ohne Charaktere (also ohne Charakter oben), ohne Log, ohne Hexfelder, mit der Stufe Mittel. Eine Kampagne löschen
  löscht alles, was an ihr hängt, endgültig.
- **Kampagnendatei.** Eine Kampagne lässt sich als Datei exportieren und wieder importieren. Die
  Datei enthält alles, was an der Kampagne hängt (Name, Stufe, Charakter oben, Charaktere mit ausgeblendeten, Log,
  Hexfelder), aber keine Entwürfe und keine Referenzdaten: Verweise bleiben Ids. Beim Import wird die Datei
  gegen die Regeln dieses Modells geprüft, auch jeder Verweis in die Referenzdaten und auf die
  eigenen Charaktere; ist etwas falsch, wird nichts importiert. Ein Import legt immer eine neue
  Kampagne an, auch wenn es dieselbe schon gibt, und überschreibt nie eine bestehende.
- **Nicht in Version 1.** Szenen (der Log läuft ohne Gliederung durch; Szenen kommen mit Mythics
  Szenenstruktur), die Feinjustierung des Zielwerts um ±1, eigene Fertigkeiten und
  Hausregeln, die man in der App einstellt.
- **Eine Auswahl für Orakel und Proben.** Die Kampagne hat immer genau eine gewählte Stufe (`odds`).
  Die drei Stufen sind Referenzdaten: Hoch (75 %, 6+), Mittel (50 %, 8+), Gering (25 %, 10+), in
  dieser Reihenfolge, leicht links. Die Auswahl bleibt stehen, bis man sie ändert, auch über einen
  Neustart der App hinweg. Orakel und Probe lesen sie, keiner von beiden hat eine eigene.
- **Der Log verweist, er kopiert nicht.** Ein Logeintrag hält nur fest, was allein ihm gehört: Frage,
  Text einer Notiz oder Deutung, Zeitpunkt und Würfel, beim Orakel dazu die Chance, bei einer Probe DM und Zielwert (siehe
  *Orakel* und *Probe*). Alles andere ist ein
  Verweis: auf die Stufe, den Charakter, die Fertigkeitsstufe, die Attribute, auf Feld und Eintrag
  der Karte. Logeinträge werden angehängt und nie geändert. Ein einzelner Eintrag lässt sich löschen,
  dann ist er endgültig weg; die übrigen behalten ihre Reihenfolge. Die Reihenfolge ist die
  Reihenfolge der Ereignisse; dass das Neueste unten steht, ist Sache der Anzeige.
- **Worauf der Log verweist, wird nie gelöscht.** Ein Charakter, der im Log vorkommt, bleibt in der
  Kampagne, solange ein Eintrag auf ihn verweist, ebenso seine Fertigkeitsstufen; Stufen, Felder und Einträge der Referenzdaten haben eine
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
- **Deutungen und Notizen.** Was in der Schreibzeile steht, wird je nach Knopf eine Frage (Ja/Nein,
  Karte ziehen), eine Deutung oder eine Notiz; einen Modus gibt es nicht. Beide sind ein `Note` mit
  Text, der nicht leer ist (Leerraum am Rand fällt weg).
  - Eine **Deutung** verweist auf genau ein Ergebnis (`interprets`): eine Orakelantwort, einen Wurf,
    eine Kartenauswahl oder eine Probe, nie auf eine Notiz oder Deutung, und immer auf einen
    früheren Eintrag. Vorgeschlagen ist das neueste Ergebnis; Antippen eines anderen Ergebnisses im
    Log macht es zum Ziel. Ein Ergebnis kann mehrere Deutungen haben.
  - Eine **Notiz** verweist auf nichts; sie steht für sich im Log.
  - Wie jeder Logeintrag wird ein `Note` angehängt und nie geändert. Wer sich verschrieben hat,
    löscht ihn und schreibt neu.
  - Der Log zeigt eine Deutung direkt unter ihrem Ergebnis, im selben Kasten, auch wenn sie später
    geschrieben wurde; ihre eigene Zeit behält sie. Das ist Sache der Anzeige: Die Reihenfolge im Log
    bleibt die der Ereignisse.
  - **Ein Ergebnis löschen löscht seine Deutungen mit.** Die Rückfrage sagt das („Eintrag mit
    1 Deutung endgültig löschen?“). Eine Deutung allein lässt sich löschen, ihr Ergebnis bleibt. Das
    ist die einzige Stelle, an der ein Logeintrag auf einen anderen verweist; die Regel *Worauf der
    Log verweist, wird nie gelöscht* gilt für Charaktere und Referenzdaten, nicht für den Log selbst.
  - Die **Kampagnendatei** enthält Deutungen und Notizen; beim Import muss jede Deutung auf ein
    früheres Ergebnis derselben Datei verweisen, sonst wird nichts importiert.
  - In der Erschaffung (Leiste mit Fragefeld) gibt es vorerst nur Fragen; Deutungen und Notizen
    schreibt man im Orakel-Screen.
- **Karte ziehen.** Ziehen legt eine `Card` an: für jedes Feld aller Bereiche aus jeder seiner
  Spalten einen nicht ausgeblendeten Eintrag zufällig (`drawn`), die Themen-Tafeln eingeschlossen,
  in der Reihenfolge der Bereiche, Felder und Spalten. Ein Feld mit zwei Spalten zieht so ein
  **Paar**. Ausgeblendete Felder übergeht es (siehe *Einträge austauschen*).
  Eine gestellte Frage geht auf die Karte über. Der Bereich *Namen* hat drei Felder (eher weiblich,
  eher männlich, neutral bzw. Genre-Name), wie auf der GMA-Karte; jedes zieht ein Paar aus Vor- und
  Nachname (siehe *Namen*).
- **Die Karte ist offen, bis man sie bestätigt oder verwirft.** Antippen nimmt ein gezogenes Feld
  in die Auswahl (`picked`) auf oder wieder heraus, mit allem, was es gezogen hat: Ein Paar nimmt
  man immer ganz, nie einen Begriff allein. Ausgewählt sein kann nur ein Feld, das gezogen wurde. *Verwerfen* schließt die Karte ohne Logeintrag. *Neu ziehen* ersetzt sie durch eine neue;
  die Auswahl geht verloren, die Frage bleibt.
- **Bestätigen** geht erst, wenn mindestens ein Feld ausgewählt ist; ohne Auswahl bleibt nur
  Verwerfen. Es legt einen `CardPick` mit der Frage der Karte an und darin je ausgewähltem Feld
  ein `PickedItem`, in der Reihenfolge der Karte; danach ist die Karte zu. Das `PickedItem` verweist
  auf die gezogenen Einträge des Feldes, beim Paar auf beide in der Reihenfolge der Spalten; das
  Feld (`/in`) folgt daraus, weil jeder Eintrag zu genau einer Spalte und jede Spalte zu genau
  einem Feld gehört. Ältere `PickedItem`s mit nur einem Eintrag bleiben gültig.
- **Probe.** Es gilt: 2W6 + Fertigkeit + gewählte Attribute ≥ Zielwert.
  - Zuerst wählt man die Fertigkeit: eine Fertigkeitsstufe des Charakters (DM = Stufe) oder „ohne
    Fertigkeit“ (DM aus den Hausregeln, −3). Solange keine gewählt ist, gibt es keine Probe zu
    würfeln.
  - **Jack-of-all-Trades** zählt in jeder Probe als Stufe 0: DM ±0, egal welche Stufe der Charakter
    darin hat. Wer es hat (nicht ausgeblendet), nimmt es für alles, wofür ihm die Fertigkeit fehlt;
    „ohne Fertigkeit“ gibt es für ihn nicht. Weil seine Stufe nichts ändert, zeigt die App sie
    nicht: auf der Karte „JoT“, in der Probe „Jack-of-all-Trades ±0“.
  - Erst danach lassen sich Attribute dazuwählen. Ein gewähltes Attribut gibt +1 ab `bonusFrom` (9),
    −1 bis `malusUpTo` (5), sonst ±0. Attribute mit ±0 sind nicht wählbar.
  - Der Zielwert kommt aus der gewählten Stufe. Der nötige Wurf ist Zielwert minus DM, die
    Wahrscheinlichkeit wird exakt aus den 36 Kombinationen von 2W6 gezählt: Bis 2 ist sie sicher,
    über 12 unmöglich. Auch eine unmögliche Probe darf man würfeln; sie misslingt immer und steht
    trotzdem im Log.
  - Die Probe in Vorbereitung ist eine `Task`. Sie gilt immer dem Charakter oben (`/for`, siehe
    *Charakter oben*) und verweist auf eine seiner Fertigkeitsstufen (`uses`) oder ist `unskilled`,
    nie beides; keins von beiden heißt: noch keine Fertigkeit gewählt. Wechselt der Charakter oben,
    endet die Probe; für den neuen beginnt keine, bis man eine Fertigkeit wählt.
  - Gewürfelt wird eine Probe als `TaskResult` in den Log übernommen. Es verweist auf Charakter,
    Fertigkeitsstufe (keine heißt „ohne Fertigkeit“), die gewählten Attribute und die Stufe, und es
    hält die zwei Würfel sowie DM (`dm`) und Zielwert (`target`) zum Zeitpunkt des Wurfs fest. Der
    Erfolg (`/success`: Würfel + `dm` ≥ `target`) folgt allein daraus, nie aus dem heutigen Stand von
    Charakter, Hausregeln oder Stufe. Die Verweise sagen, wer und womit gewürfelt hat.
  - Bei `Task` und `TaskResult` gehört die Fertigkeitsstufe (`uses`) immer dem Charakter, auf den sie
    verweisen (`for`), und der Charakter immer zur Kampagne.
- **Charakter oben.** Oben im Orakel-Screen steht ein Charakter der Kampagne, der **Charakter oben**
  (`focus`); für ihn würfelt man Proben, ohne den Screen zu wechseln. Wischen zeigt den nächsten
  bzw. vorigen. Infrage kommen nur Lebende, die nicht ausgeblendet sind, in der Reihenfolge der
  Charaktere der Kampagne.
  - Die Kampagne speichert ihn, er übersteht also einen Neustart und steht in der Kampagnendatei.
    Er verweist immer auf einen Charakter derselben Kampagne, der lebt und nicht ausgeblendet ist.
    Keinen gibt es nur, wenn es keinen solchen Charakter gibt; dann bietet der Orakel-Screen oben an,
    einen anzulegen oder nach Regeln zu erschaffen.
  - Stirbt der Charakter oben, wird er ausgeblendet oder gelöscht, rückt der nächste Lebende nach,
    hinter dem letzten der vorige. Ein neuer Charakter, von Hand angelegt oder aus der Erschaffung
    übernommen, wird zum Charakter oben. Wird ein Toter wieder lebendig oder ein Ausgeblendeter
    wieder eingeblendet, bleibt der Charakter oben, wie er ist; nur wenn es keinen gab, wird es
    dieser.
  - Kampagnen und Kampagnendateien von vor dieser Regel haben keinen Charakter oben; sie bekommen
    den ersten Lebenden, der nicht ausgeblendet ist.
  - Der Charakter-Screen bleibt für die Verwaltung: anlegen, nach Regeln erschaffen, bearbeiten,
    Details mit Lebenslauf, Verstorbene. Proben würfelt man dort nicht mehr.
- **Charakter.** Charaktere legt man in der App an und bearbeitet sie, von Hand oder über die
  Charaktererschaffung (siehe dort). Die sechs UPP-Werte liegen zwischen 0 und 15. Eine
  Fertigkeit kommt bei einem Charakter höchstens einmal vor, ihre Stufe ist 0 oder mehr; Fertigkeiten
  kommen nur aus der festen Liste der Referenzdaten. Jede Fertigkeit hat ein Kürzel aus genau drei Zeichen,
  das in der Liste nur einmal vorkommt (Pil für Pilot, JoT für Jack-of-all-Trades). Es dient der
  knappen Anzeige; der Log zeigt den vollen Namen. Ausrüstung, Herkunft (`background`, z. B.
  „Ex-Scout · 4 Terms · 34 Jahre“) und Notiz sind in Version 1 freier Text, Credits eine
  ganze Zahl.
- **Gegenstände.** Was ein Charakter besitzt, steht als Besitz (`possessions`) an ihm: je Gegenstand
  aus der festen Liste höchstens ein Eintrag, mit einer Anzahl von 1 oder mehr (3 × Low Passage,
  2 × Free Trader für zwei abbezahlte Raten). Ein Gegenstand mit `once` hat immer die Anzahl 1. Im
  Editor lässt sich Besitz hinzufügen, zählen und entfernen wie Fertigkeiten; entfernt wird er
  wirklich, weil der Log nicht auf ihn verweist.
  - **Die Liste** kommt aus den Charts der Starter Edition: *Personal Equipment and Vehicles* (S. 23:
    Ausrüstung, Kommunikatoren, Geräte, Sichthilfen, Werkzeug, Unterkünfte, Fahrzeuge, Small Craft,
    Waffen mit Munition und Energiezellen, Rüstungen), dazu die Passagen (Ship Revenues, S. 9: High
    Cr 10.000, Middle Cr 8.000, Low Cr 1.000), die Schiffe aus der Abmusterung (Standard Ship
    Designs, S. 11: Scout MCr 29,43, Free Trader MCr 37,08) und die Travellers' Aid Society. Jede
    Klinge und Schusswaffe nutzt genau ihre Fertigkeit (`uses`).
  - **TL, Gewicht und Preis** (`tl`, `weight`, `price`) stehen, wie in den Charts angegeben. Das
    Gewicht ist immer in kg (S. 4 nennt Gramm, S. 23 bei Fahrzeugen Tonnen = 1000 kg), der Preis
    immer in Cr (KCr und MCr umgerechnet). Steht im Chart ein offensichtlicher Druckfehler (Grav Belt
    „10 tons“), gilt trotzdem das Chart; die Daten vermerken es. Was die Charts nicht angeben, fehlt (Club und die
    Travellers' Aid Society haben keinen Preis, Passagen und Mitgliedschaft kein Gewicht). Bei Schiffen und Small Craft sind „tons“
    Verdrängung, kein Gewicht; sie haben deshalb keins. Gibt es einen Gegenstand in mehreren TL
    (Vacc Suit TL 8 bis 13), ist jede Zeile ein eigener Gegenstand mit eigener Id. Keine Gegenstände sind
    Accessories („10 % of price“) und Recharge (eine Leistung).
  - **Später**, mit Kampf und Handel: Kampfwerte der Waffen und Rüstungen (S. 4: Länge, nötige
    Stärke, DMs, Reichweite), Kaufen und Verkaufen, Gesamtgewicht. Schiffe sind vorerst nur ein
    Gegenstand; Schiffskarten kommen später. Alles, was nicht in der Liste steht, bleibt freier Text
    in der Ausrüstung (`equipment`).
- **Löschen und Ausblenden.** Ein Charakter oder eine Fertigkeitsstufe, auf die kein Logeintrag
  verweist, wird wirklich gelöscht. Verweist der Log darauf, wird sie stattdessen ausgeblendet
  (`retired`): Sie verschwindet aus dem Charakter-Screen und aus der Leiste oben und lässt sich nicht mehr für Proben wählen,
  bleibt aber gespeichert, und der Log zeigt sie weiter. Ein ausgeblendeter Charakter lässt sich
  wieder einblenden. Sind die Logeinträge gelöscht, die auf ihn verwiesen, lässt er sich auch
  löschen.
- **Tot.** Im Editor lässt sich ein Charakter als tot markieren (`dead`) und, falls das ein Irrtum
  war, wieder zurück. Ein toter Charakter bleibt in der Kampagne und im Charakter-Screen, aber
  getrennt von den Lebenden unter „Verstorben“, nur mit Namen und Herkunft. Für Proben ist er nicht
  wählbar und steht nicht in der Leiste oben; war er der Charakter oben, rückt ein anderer nach
  (siehe *Charakter oben*), und eine vorbereitete Probe endet. Tot und ausgeblendet sind
  unabhängig: Auch einen toten Charakter kann man löschen bzw. ausblenden, nach denselben Regeln.
  Der Log zeigt ihn weiter wie bisher; alte Proben ändern sich dadurch nicht, weil DM und Zielwert
  festgehalten sind. Die Kampagnendatei enthält auch die Toten.
- **Charaktererschaffung.** Neben dem Anlegen von Hand lässt sich ein Charakter nach den Regeln von
  Classic Traveller erschaffen (Starter Edition, *Charts and Tables* S. 2–3). Jeder Wert wird einzeln
  gewürfelt, jede Entscheidung trifft der Spieler, außer er lässt die Erschaffung durchlaufen (siehe
  *Durchlaufen*). Je Kampagne gibt es höchstens eine Erschaffung
  (`generation`); sie wird gespeichert und übersteht einen Neustart. Wechselt man die Kampagne, bleibt
  sie in ihrer Kampagne liegen.
  - **Lebenslauf statt Zwischenstand.** Eine Erschaffung hält nur ihren Lebenslauf (`Career`): die
    Würfe der Reihe nach, jeder mit der Entscheidung, die zu ihm gehört. Alles andere folgt daraus:
    UPP, Fertigkeiten, Laufbahn (`/in`), Terms, Rang, Alter (18 + 4 je Term), ob eingezogen, ob tot,
    Pension, Geld, Gegenstände und welcher Schritt dran ist (`/step`). Würfe werden nur angehängt;
    nur die Wahl aus einer Kaskade kommt nach dem Wurf noch zu ihm hinzu (Schritt `cascade`).
  - **Was ein Wurf festhält.** Jeder `CareerRoll` hält seine Art (`kind`), die Würfel (`dice`, einer
    oder zwei) und den DM fest, bei Würfen mit Zielwert auch den Zielwert (`target`); Erfolg
    (`/success`: Würfel + `dm` ≥ `target`) folgt allein daraus. Was er sonst braucht, je Art:

    | Art | Würfel | Verweist auf | Entscheidung |
    |---|---|---|---|
    | `characteristic` | 2 | das Attribut (`of`) | – |
    | `enlistment` | 2 | die gewählte Laufbahn (`for`) | welche Laufbahn, vor dem Wurf |
    | `draft` | 1 | die Laufbahn, in die man kommt (`for`) | – |
    | `survival`, `commission`, `promotion` | 2 | – | – |
    | `skill` | 1 | die Tabelle (`on`), die Zeile (`gained`), bei einer Kaskade die Fertigkeit (`chosen`) | welche Tabelle vor dem Wurf, welche Fertigkeit danach |
    | `aging`, `crisis` | 2 | das Attribut (`of`), beim Altern die Zeile der Aging Table (`against`) | – |
    | `reenlist` | 2 | – | ob man bleiben will (`wants`), vor dem Wurf |
    | `cash`, `benefit` | 1 | die Zeile (`gained`), bei einer Waffe die Fertigkeit (`chosen`) | Geld oder Sachwerte, vor dem Wurf; welche Waffe danach |

    Die Zeile wird festgehalten, nicht aus dem Würfel neu gesucht; so ändert eine spätere Korrektur
    der Tabellen keinen alten Lebenslauf.
  - **Ablauf** (die Schritte in `GenerationStep`):
    1. *Attribute*: STR, DEX, END, INT, EDU, SOC, in dieser Reihenfolge je 2W6.
    1a. *Heimatwelt* (`homeworld`): eine fertige Welt des Subsektors, siehe *Heimatwelt und Welten
       der Terms*.
    2. *Laufbahn*: Man wählt eine der sechs Laufbahnen und würfelt die Musterung (2W6 + DMs ≥
       Zielwert). Scheitert sie, folgt die *Einberufung*: 1W6 bestimmt die Laufbahn (`draft`). Wer
       eingezogen wurde, darf im ersten Term kein Offizierspatent versuchen. Was eine Laufbahn bei
       der Musterung mitgibt (Marines Cutlass-1, Army Rifle-1, Scouts Pilot-1), kommt sofort dazu.
    3. *Term*, jedes Mal in dieser Reihenfolge: zuerst die Welt des Terms (`world`), dann Überleben (`survival`); misslingt es, ist der
       Charakter tot und die Erschaffung zu Ende (`dead`) wie im Regelwerk. Ohne Rang und in einer Laufbahn mit Rängen:
       Offizierspatent, das gibt Rang 1. Mit Rang unter dem höchsten der Laufbahn (Merchants haben 5):
       Beförderung, einmal je Term, auch im Term des Patents. Dann die Fertigkeiten: im ersten Term 2, danach 1, bei den Scouts immer 2
       (`skillsPerTerm`); +1 für Patent, +1 für Beförderung. Für jede wählt man eine Tabelle; die
       vierte (`minEdu` 8) nur mit EDU 8+, gemessen vor dem Wurf. Ein Rang bringt, was in ihm steht
       (`grants`, z. B. Navy Captain +1 SOC).
    4. *Altern* ab dem Ende des 4. Terms: je Attribut der Aging Table ein Wurf nach der Zeile mit dem
       größten `fromTerm`, der den Term nicht übersteigt (INT erst ab dem 12. Term);
       unter dem Zielwert sinkt das Attribut um `loss`. Fällt ein Attribut dadurch unter 1, folgt eine
       *Krise* (Schritt und Wurf `crisis`, 2W6, 8+): gelingt sie, steht das Attribut auf 1, sonst ist
       der Charakter tot. Die Krise stammt aus dem Vorbild, nicht aus den Charts.
    5. *Weiterverpflichtung*: Man sagt, ob man bleiben will (`wants`), dann wird immer gewürfelt. Eine
       12 heißt bleiben, egal was man wollte. Sonst bleibt, wer will und den Zielwert schafft, außer
       nach dem 7. Term: dann nur mit 12 (aus dem Vorbild). Wer bleibt, beginnt den nächsten Term (3.), alle anderen
       mustern ab.
    6. *Abmusterung*: so viele Würfe wie Terms, dazu +1 bei Rang 1–2, +2 bei Rang 3–4, +3 bei Rang
       5–6. Je Wurf wählt man Geld oder Sachwerte; Geld höchstens dreimal. DM +1 auf Geld mit
       Gambling, DM +1 auf Sachwerte ab Rang 5. Ein Gegenstand mit `once` (Travellers' Aid Society,
       Scout Ship) kommt nur einmal; ein zweites Mal bringt nichts. Eine Waffe (Blade, Gun) ist eine
       Kaskade mit `weapon`: Man wählt eine Fertigkeit daraus und bekommt den Gegenstand, der sie
       nutzt (`uses`), statt der Fertigkeit. Wählt man eine Waffe, die man schon aus der Abmusterung
       hat, steigt stattdessen die Fertigkeit darin um 1. Nach mindestens 5 Terms gibt es eine Pension (Cr 4000
       bei 5 Terms, je Term mehr Cr 2000).
    7. *Name*: Zum Schluss gibt man den Namen ein und schließt ab.
  - **Zugewinne.** Eine Zeile (`Gain`) bringt genau eins: eine Fertigkeit +1 (`skill`), eine Wahl aus
    einer Kaskade (`choose`, mit `weapon` die Waffe statt der Fertigkeit), ein Attribut ± `change`
    (`changes`), einen Gegenstand (`item`) oder Geld (`credits`); eine leere Zeile (Scouts und Other, 7 auf der Sachwertetabelle) bringt nichts.
    Attribute bleiben zwischen 0 und 15. Eine Kaskade bietet Fertigkeiten an (`options`); die Wahl
    gehört zum Wurf (`chosen`). Vehicle bietet die einzelnen Fahrzeuge an, Aircraft und Watercraft
    sind darin schon aufgefächert.
  - **Ein zweites Jack-of-all-Trades** bringt nichts, gibt aber einen weiteren Fertigkeitswurf: Der
    Wurf zählt nicht zu den Fertigkeiten des Terms, man wählt wieder eine Tabelle. So hat ein
    Charakter aus der Erschaffung JoT höchstens einmal. Lebensläufe von vor dieser Regel, in denen ein
    zweites JoT die Stufe erhöht hat, bleiben gültig: Passen ihre Würfe nur zur alten Regel, gilt für
    sie die alte.
  - **Abschließen** legt einen Charakter an (`on finish`): Name, UPP und Fertigkeiten wie zuletzt,
    Credits aus dem Geld, Besitz aus den Gegenständen (gleiche zusammengezählt), Herkunft aus Laufbahn, Rang, Terms und
    Alter („Ex-Navy · Commander · 5 Terms · 38 Jahre“), die Pension in der Notiz. Der Lebenslauf zieht
    mit um (`Character.career`) und bleibt danach unverändert; den Charakter bearbeitet man wie jeden
    anderen. Von Hand angelegte Charaktere haben keinen Lebenslauf. Danach ist die Erschaffung zu.
  - **Laufbahnen** sind die sechs aus dem Regelwerk: Navy, Marines, Army, Scouts, Merchants, Other.
    Weitere (etwa aus *Citizens of the Imperium*) wären nur Daten.
  - **Fertigkeiten aus den Tabellen**, die es vorher nicht gab, kommen in die Liste: Brawling,
    Forgery und die einzelnen Fahrzeuge der Kaskade Vehicle (Grav, Tracked und Wheeled Vehicle,
    Prop-driven und Jet-driven Fixed Wing, Helicopter, Large und Small Watercraft, Hovercraft,
    Submersible). Vehicle bleibt in der Liste für Charaktere von Hand; die Tabellen geben es nie.
  - **Durchlaufen.** Statt Schritt für Schritt lässt sich die Erschaffung auch durchlaufen lassen:
    Die App würfelt jeden Schritt und trifft jede Entscheidung selbst, zufällig, bis zum Namen oder
    zum Tod. Gespeichert wird genau dasselbe wie beim Schritt für Schritt, Wurf für Wurf mit seiner
    Entscheidung. Die Entscheidungen: als Heimatwelt eine zufällige fertige Welt des Subsektors (gibt
    es keine, hält der Lauf dort an), als Welt eines Terms die vorige („wie zuletzt“), die Laufbahn
    zufällig, gewichtet nach der Chance der Musterung, Fertigkeitstabelle und Wahl aus einer Kaskade
    zufällig unter dem, was geht, bleiben wollen und Geld oder Sachwerte je zur Hälfte (Geld nur,
    solange es geht). Den Namen gibt immer der Spieler ein. Eine Weltenerschaffung lässt sich ebenso
    durchlaufen lassen, bis zum Namen; im Subsektor gehört das Vorkommen dazu.
  - **Verwerfen** geht jederzeit und löscht die Erschaffung ohne Spur. Ein Toter lässt sich nur
    verwerfen, nicht übernehmen.
  - Die Erschaffung steht nicht im Log; ihr Lebenslauf ist ihr Verlauf.
  - Die Kampagnendatei enthält die offene Erschaffung und die Lebensläufe; beim Import wird jeder
    Lebenslauf von vorn nachgespielt und gegen diese Regeln geprüft.
- **Heimatwelt und Welten der Terms.** Ein Charakter kann eine Heimatwelt haben (`homeworld`): eine
  fertige Welt des Subsektors seiner Kampagne. In der Charaktererschaffung kommt sie nach den
  Attributen und vor der Laufbahn, und jeder Term findet auf einer Welt statt (`Career.worlds`, je
  Term eine, in der Reihenfolge der Terms; dieselbe Welt darf mehrmals vorkommen). Beides ist eine
  Entscheidung, kein Wurf: Man wählt eine fertige Welt, oder man erschafft sie gleich: Man wählt ein
  nicht erzeugtes Feld, die Weltenerschaffung läuft dort wie im Subsektor, mit dem Vorkommen (bleibt
  das Feld leer, wählt man ein anderes), und ist die Welt fertig (mit Namen), ist sie gewählt.
  Solange sie entsteht, wartet die Charaktererschaffung im selben Schritt. Für einen Term gibt es
  dazu „wie zuletzt“: die Welt des vorigen Terms, im ersten Term die Heimatwelt. Die Wahl hat in Version 1 keine Folgen für die Würfe. Abschließen übernimmt die
  Heimatwelt an den Charakter; die Welten der Terms bleiben im Lebenslauf. Von Hand angelegte
  Charaktere wählen ihre Heimatwelt im Editor, oder keine. Verwiesen wird auf ein Hexfeld über seine
  Spalte und Zeile (0304). Weil der Lebenslauf und der Charakter auf
  Welten verweisen, gilt wie beim Log: Eine Welt, auf die verwiesen wird, wird nie gelöscht (fertige
  Welten lassen sich ohnehin nicht löschen). Lebensläufe von vor dieser Regel, ohne Heimatwelt und
  ohne Welten, bleiben gültig. Während der Erschaffung lassen sich Orakel und Inspirationskarte
  befragen; ihre Antworten stehen wie sonst im Log.
- **Referenzdaten sind Daten.** Stufen, Hausregeln, Fertigkeiten, Gegenstände, Laufbahnen, die Tabellen der Weltenerschaffung, Bereiche, Felder und Einträge
  stehen als Dateien unter `src/data/` und werden beim Start geprüft. Man ändert sie nur dort, nicht
  in der App. Pfeile führen nur aus Spielstand
  und Entwürfen in die Referenzdaten, nie zurück. Die Einträge sind eigene Inhalte oder stammen aus
  Mythic GME 2e (Lizenz CC BY-NC, ins Deutsche übersetzt), nie aus den Texten des GMA-Decks.
- **Paare aus Mythic.** Mythic zieht aus seinen Bedeutungstabellen immer zwei Begriffe, die man
  zusammen deutet. Jede Mythic-Tabelle ist deshalb ein Feld mit zwei Spalten:
  - *Actions* und *Descriptions* haben selbst zwei Spalten. Im Zufallsereignis werden sie zu den
    Feldern *Aktion* (Verb · Substantiv) und *Beschreibung* (Adverb · Adjektiv).
  - Eine *Elements*-Tabelle hat eine Spalte, aus der Mythic zweimal zieht. Ihr Feld hat zwei
    Spalten mit demselben Inhalt, jede mit eigenen Einträgen, sodass jeder Eintrag zu genau einer
    Spalte gehört. Die beiden Begriffe können gleich ausfallen.

  In den Daten steht jede Tabelle nur einmal (`src/data/mythic-tables.json`); die Spalten entstehen
  beim Laden.
- **Namen.** Jedes der drei Namensfelder hat zwei Spalten: Vornamen, für jedes Feld eigene, und
  Nachnamen. Die Nachnamen kommen aus einer gemeinsamen Liste; jedes Feld hat sie als eigene Spalte
  mit eigenen Einträgen, sodass jeder Eintrag zu genau einer Spalte gehört, wie bei den
  Elements-Tabellen. So sind die drei Vornamen immer verschieden, die Nachnamen können gleich
  ausfallen. Die Namen sind eigene Inhalte und passen grob ins Third Imperium: überwiegend irdisch
  und aus allen Weltgegenden, etwa ein Fünftel erfunden und fremd klingend, angelehnt an den Klang
  der Vilani. In den Daten steht jede Liste nur einmal (`src/data/names.json`); die Spalten
  entstehen beim Laden. Die früheren Platzhalter-Vornamen bleiben ausgeblendet in ihrer Spalte.
- **Einträge austauschen.** Ein Eintrag, der nicht mehr gezogen werden soll, wird nicht gelöscht und
  seine Id nicht neu vergeben, sondern ausgeblendet (`retired`): Ziehen übergeht ihn, alte
  Logeinträge zeigen ihn weiter mit seinem Text. Ob ein Log auf ihn verweist, weiß nur das jeweilige
  Gerät; deshalb wird jeder ausgetauschte Eintrag ausgeblendet. Hat eine Spalte nur ausgeblendete
  Einträge, ist ihr Feld ausgeblendet: Ziehen übergeht es, die Karte zeigt es nicht, und ein
  Bereich ohne sichtbares Feld fehlt auf der Karte ganz. Der Log zeigt alte Einträge daraus weiter.
  Mindestens ein Feld hat einen Eintrag, der nicht ausgeblendet ist.

- **Subsektor.** Jede Kampagne hat einen Subsektor aus 8 Spalten und 10 Zeilen wie TAS Form 6
  (Charts S. 26): 0101 links oben, die Spalten mit gerader Nummer eine halbe Zeile tiefer. Ein
  Hexfeld (`Hex`) gibt es erst, wenn für es gewürfelt wurde; je Spalte und Zeile höchstens eins.
  Ein Feld ist also **nicht erzeugt** (kein `Hex`), **in Erschaffung** (`/step` vor `done`),
  **leer** (`empty`) oder hat eine **Welt**. Nur ein nicht erzeugtes Feld lässt eine neue
  Weltenerschaffung zu: Ihr erster Wurf, das Vorkommen, wird im Subsektor selbst gewürfelt, die
  übrigen auf der Weltkarte. Eine Welt antippen öffnet ihre Weltkarte, ein Feld in Erschaffung setzt
  sie fort. Mehrere Felder dürfen zugleich in Erschaffung sein. Die Kampagnendatei enthält die
  Hexfelder; eine neue Kampagne beginnt mit einem Subsektor ohne Hexfelder.
- **Weltenerschaffung** nach der *World Generation Checklist* (Charts S. 15), jeder Wert einzeln
  gewürfelt wie bei der Charaktererschaffung. **Gespeichert werden die Werte, nicht die Würfe:** Das
  Hexfeld hält, ob es leer ist, die Stellen des UWP (`Uwp`), die Basen, den Gasriesen und den Namen,
  jedes, sobald es feststeht. Der nächste Schritt (`/step`) folgt daraus, welche Werte schon da sind;
  die Handelscodes folgen aus dem UWP. Ein Wurf (`WorldRoll`) ist flüchtig: Er hält Art, Würfel und
  DM, beim Vorkommen den Zielwert, und trägt sein Ergebnis ins Hexfeld ein (`on roll`); danach wird
  er nicht gespeichert. Die Weltkarte zeigt nur die Werte, keine Liste der Würfe: Den gerade
  gemachten Wurf zeigt die Würfelbühne unten, darüber die Welt; an der Stelle der früheren Liste
  steht die Oberfläche. Der Ablauf, in dieser Reihenfolge:
  1. *Vorkommen* (`occurrence`): 1W6, Welt bei 4+. Sonst ist das Feld **leer** und fertig. Mit
     diesem Wurf entsteht das Hexfeld (`empty`).
  2. *Systeminhalt*, je eine Spalte der System Contents Table mit 2W6 (`/row`, Summe + DM, auf 2
     bis 12 begrenzt): Raumhafen; Marinebasis nur bei Raumhafen A oder B; Scoutbasis nicht bei E
     oder X, mit DM −1 bei C, −2 bei B, −3 bei A; Gasriese. Eine Basis, für die nicht gewürfelt
     wird, steht sofort auf „nein“.
  3. *Größe und Atmosphäre*: Größe 2W6 − 2; Atmosphäre 2W6 − 7 + Größe, bei Größe 0 kein Wurf
     und 0.
  4. *Temperatur* (`temperature`), nach Mongoose Traveller 2e (Core Rulebook, S. 251): 2W6 plus
     den Temperatur-DM der Atmosphäre (`UwpDigit.temperatureDm`): 0 oder 1 kein DM, 2 oder 3 −2,
     4, 5 oder E −1, 6 oder 7 ±0, 8 oder 9 +1, A, D oder F +2, B oder C +6. Die Summe wählt die
     Zeile der Tabelle `Temperature` (`from` bis `to`, an den Enden offen): bis 2 *Gefroren*
     (−51 °C oder kälter), 3–4 *Kalt* (−51 bis 0 °C), 5–9 *Gemäßigt* (0 bis 30 °C), 10–11 *Heiß*
     (31 bis 80 °C), ab 12 *Kochend* (81 °C und mehr). Gespeichert wird die Zeile, nicht die Summe.
     Bei Atmosphäre 0 oder 1 sagt die Weltkarte dazu, dass die Temperatur zwischen glühender Hitze
     am Tag und Frost in der Nacht schwankt. Die Texte der Tabelle sind eigene, deutsche
     Beschreibungen, keine Übersetzung des Regeltexts. Den wahlweisen DM für den heißen oder kalten
     Rand der habitablen Zone (+4 bzw. −4) gibt es vorerst nicht; er kommt später mit dem
     Sternsystem.
  5. *Rest des UWP*: Hydrographie 2W6 − 7 + Größe, DM −4 bei Atmosphäre 0, 1 oder A+, dazu der
     Wasser-DM der Temperatur (`Temperature.hydroDm`, nach Mongoose S. 252): −2 bei *Heiß*, −6 bei
     *Kochend*, sonst 0. Er gilt nicht bei Atmosphäre D (dicht, nur in der Höhe atembar), die das
     Wasser auch bei großer Hitze hält. Mongoose nimmt auch eine panthalassische Atmosphäre F aus;
     in Classic Traveller ist F aber dünn und tief liegend (*Thin, Low*), dort gilt der DM.
     Bei Größe 0 oder 1 kein Wurf und 0. Bevölkerung 2W6 − 2; Regierung
     2W6 − 7 + Bevölkerung; Gesetz 2W6 − 7 + Regierung; TL 1W6 plus die DMs der Tech Level Table
     (`UwpDigit.techDm`) von Raumhafen, Größe, Atmosphäre, Hydrographie, Bevölkerung und
     Regierung. Über die Hydrographie wirkt die Temperatur so auch auf TL und Handelscodes.
     Der DM eines Wurfs ist alles außer den Würfeln, also bei der Atmosphäre −7 + Größe. Ein Wert
     unter 0 gilt als 0, die Hydrographie höchstens als A. Sonst begrenzt nichts: Atmosphäre D–F,
     Regierung E–F und Gesetz über A haben in den Charts keinen Text (`UwpDigit.text` fehlt), die
     App zeigt dann nur die Ziffer (Ziffern über F in eHex ohne I und O, der Raumhafen X ist so die
     Ziffer 31).
  6. *Oberfläche* (`surface`): Steht der TL fest, würfelt die App die ganze Oberfläche auf einmal und
     ohne eigenen Knopf (siehe *Oberfläche*). Sie ist kein einzelner Wurf (`WorldRoll`) und hat
     keine Würfelanimation; die Weltkarte zeigt gleich die Werte.
  7. *Name*: Zum Schluss gibt man den Namen ein (nicht leer); dann ist die Welt fertig (`done`).

  **Welten ohne Temperatur.** Welten, deren Hydrographie vor diesem Schritt gewürfelt wurde, haben
  keine Temperatur. Das ist erlaubt: Ihre Erschaffung geht ohne Temperatur weiter, und ist die Welt
  fertig, bietet ihre Weltkarte „Temperatur würfeln“ an, mit derselben Würfelanimation. Die
  Hydrographie bleibt dann, wie sie ist; der Wasser-DM gilt nur, wenn die Temperatur vorher
  feststand.

  **Welten ohne Oberfläche.** Ebenso dürfen Welten, die vor diesem Schritt den TL bekamen, ohne
  Oberfläche sein. Ihre Erschaffung geht mit dem Namen weiter; ist die Welt fertig, bietet ihre
  Weltkarte „Oberfläche würfeln“ an, nach der Temperatur, falls auch die fehlt (die Oberfläche
  braucht sie für das Leben).

  **Verwerfen** geht, solange die Welt in Erschaffung ist, und macht das Feld wieder zu einem nicht
  erzeugten. Ein leeres Feld und eine fertige Welt bleiben, wie sie sind. Die Weltenerschaffung
  steht nicht im Log und hat keinen Verlauf. Beim Import wird jedes Hexfeld gegen diese Regeln
  geprüft: Werte nur in der Reihenfolge des Ablaufs, jeder in dem Bereich, den sein Wurf ergeben
  kann, und die Werte ohne Wurf so, wie die Regeln sie setzen (Atmosphäre 0 bei Größe 0, keine
  Marinebasis bei Raumhafen C). Ausnahmen von der Reihenfolge: Eine Welt mit Hydrographie
  darf ohne Temperatur sein (siehe *Welten ohne Temperatur*); dann gilt für ihre Hydrographie der
  Bereich ohne Wasser-DM. Eine Welt mit Namen darf ohne Oberfläche sein; hat sie eine, hat sie
  auch die Temperatur, und die Oberfläche muss zu den Regeln unter *Oberfläche* passen. Hexfelder aus der Zeit, als die Würfe gespeichert wurden, werden
  beim Laden nachgespielt und als Werte übernommen.
- **Oberfläche** nach dem *World Builder's Handbook* (DGP, 1989; *Hydrosphere Related Details*
  S. 69–70 und *Native Life* S. 68), als Vorarbeit für eine spätere Oberflächenkarte. Es gibt noch
  keine Karte: Gespeichert werden nur Zahlen, nichts wird platziert. Alle Werte entstehen in einem
  Zug, in dieser Reihenfolge; Ergebnisse unter 0 gelten als 0:
  1. *Wasseranteil* (`water`, in %): Hydrographie × 10 + (2W6 − 7); eine 12 auf 2W6 wird neu
     gewürfelt (die Abweichung liegt so zwischen −5 und +4). Begrenzt auf 0 bis 100. Bei Größe 0
     kein Wurf und 0.
  2. *Tektonische Platten* (`plates`): Größe + Hydrographie − 2W6, mindestens 1. Bei Größe 0 kein
     Wurf und 0. Vereinfachung: Das Buch gibt nur Welten mit geschmolzenem oder schwerem Kern
     mehrere Platten und würfelt dafür den Kerntyp; den lassen wir weg.
  3. *Land- und Wassermassen*: Bei einem Wasseranteil von 50 bis 99 % die Kontinente-Tabelle, bei 1
     bis 49 % die Ozeane-Tabelle, jeweils mit 1W6 + Hydrographie × 3 (`/row`); die Zeile sagt, mit
     welchem Würfelausdruck (`DiceExpr`) jede Menge gewürfelt wird:
     - Kontinente-Tabelle: große Kontinente (`major`), kleine Kontinente (`minor`), große Inseln
       (`small`) und Archipele (`scattered`). Ozeane gibt es dann keine. **Hausregel: höchstens 6
       große Kontinente**, denn jeder hat mindestens 15 % der Landfläche; was die Tabelle darüber
       ergibt (sie würfelt bis 2W6 + 1), zählt zu den kleinen Kontinenten.
     - Ozeane-Tabelle: große Ozeane (`major`), kleine Ozeane (`minor`), kleine Meere (`small`) und
       verstreute Seen (`scattered`). Kontinente gibt es dann keine.
     - Sagt die Zeile *nur* Archipele bzw. *nur* verstreute Seen (`onlyScattered`), ist alles Land
       bzw. alles Wasser in dieser Form: (100 − Wasseranteil) × 5 × 2 Archipele bzw.
       Wasseranteil × 5 × 2 Seen, weil die Karte 500 Hexe hat und jedes davon ein halbes Hex ist.
     - Bei 0 % gibt es kein Wasser, bei 100 % kein nennenswertes Land: Alle Mengen sind 0.
  4. *Einheimisches Leben* (`life`): 2W6, Leben bei 10+. DMs: Atmosphäre 0 −3, Atmosphäre 4–9 +4,
     Hydrographie 0 −2, Hydrographie 2–8 +1, Temperatur nicht *Gemäßigt* −1 (das Buch zieht 1 ab
     unter −20 °C und über 30 °C; die Stufen der Temperatur liegen in der Mitte so). Die DMs nach
     dem Sterntyp entfallen, weil es noch kein Sternsystem gibt.

  Was das Buch sonst noch würfelt, kommt erst mit der Oberflächenkarte (Größe der Platten, ihre
  Bewegung, Gebirge, Flüsse, Wüsten, Dschungel, Vergletscherung, die Temperatur je Hexreihe) oder
  braucht ein Sternsystem (Vulkane über den Seismik-Faktor, Achsneigung, Umlauf). Die Weltkarte
  zeigt die Oberfläche an der Stelle, wo bisher die Würfe standen, in Worten, z. B. „59 % Wasser ·
  6 Platten · 1 großer und 4 kleine Kontinente · 5 große Inseln · 7 Archipele · Leben“. Ist alles
  Land Archipel bzw. alles Wasser verstreuter See (die Zahl ist die ganze Fläche in halben Hexen,
  und es gibt keine anderen Land- bzw. Wassermassen), schreibt sie „Land nur als Archipele“ bzw.
  „Wasser nur als verstreute Seen“ statt einer Zahl wie 150.
- **Handelscodes** folgen aus dem UWP (`/trade`): Ein Code gilt, wenn jede seiner Bedingungen
  (`TradeCondition`: Stelle des UWP und erlaubte Ziffern) erfüllt ist. Es sind die elf aus den
  Charts (S. 15): Agricultural, Non-Agricultural, Industrial, Non-Industrial, Rich, Poor, Water
  World, Desert World, Vacuum World, Asteroid Belt, Ice-capped. Subsector Capital vergibt die
  Spielleitung; das kommt später.
- **Die Darstellung auf der Karte** ist die übliche aus Classic Traveller und Sache der Anzeige:
  oben die Nummer des Feldes, darunter der Raumhafen, in der Mitte die Welt (gefüllter Kreis mit
  Wasser, leerer Kreis ohne, Punkte für einen Asteroidengürtel), Stern für die Marinebasis, Dreieck
  für die Scoutbasis, kleiner Kreis rechts oben für den Gasriesen, darunter der Name, in
  Großbuchstaben ab Bevölkerung 9. Ist die Karte groß genug gezoomt, kommen darunter das UWP und
  die Handelscodes dazu, jedes erst, wenn es lesbar ist.
- **Später**, nicht in diesem Schritt: der Rand der habitablen Zone beim Temperaturwurf, Reisezonen (Amber, Red), Notizen zur Welt, Verbindungen
  (communications routes), Subsector Capital, ein Name für den Subsektor, mehrere Subsektoren zu
  einem Sektor und eine fertige Welt wieder löschen.

## Wo der Code noch nicht folgt

Der Code für Version 1 liegt unter `src/` (siehe [ARCHITECTURE.md](../ARCHITECTURE.md)). Er folgt dem
Diagramm mit diesen Ausnahmen:

- **`Gain` in den Daten.** Im Bild bringt eine Zeile ein Attribut über einen Verweis (`changes`);
  in `src/data/services.json` steht das Attribut als Feld `characteristic` neben `change`, weil
  `Characteristic` eine Werteliste ist. Ebenso stehen die DMs eines `Throw` als `characteristic`,
  `atLeast`, `dm`.
- **`Note → LogEntry : interprets`** ist im Code die Stelle des gedeuteten Ergebnisses im Log (eine
  Zahl), weil Logeinträge keine eigene Id haben. Löschen rückt die Stellen nach, sodass jede Deutung
  weiter auf ihr Ergebnis zeigt; damit ist der Verweis erfüllt.
- **`Card → Campaign : in` und `Task → Campaign : in`** sind im Code kein Feld. Der Controller hält
  höchstens eine offene Karte und höchstens eine Probe, beide immer zur offenen Kampagne; beim
  Wechsel der Kampagne verfallen sie. Damit ist die Multiplizität erfüllt.
- **Beispielcharaktere.** Die allererste Kampagne auf einem Gerät beginnt mit Kira Vant und Jonas
  Reyl aus der README (`src/data/examples.json`), damit man gleich etwas ausprobieren kann. Das
  Modell sagt dazu nichts; die beiden lassen sich löschen, solange der Log nicht auf sie verweist.
  Jede weitere Kampagne beginnt leer.
