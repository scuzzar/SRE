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
> Ebenfalls am 3. November 2026 auf ausdrücklichen Wunsch des Owners freigegeben: Deutungen und
> Notizen auch in der Charaktererschaffung (siehe *Deutungen und Notizen*) und eine Notiz zu jeder
> fertigen Welt (siehe *Notiz zur Welt*). Neu im Bild: `Hex.note`.
>
> Ebenfalls am 3. November 2026 freigegeben: drei **Wurffelder** auf der Karte nach dem GMA2e:
> die **Glockenzahl** (1–10, meist 4–7), der **Streuwürfel** (8 Richtungen, Volltreffer,
> Fehlschlag) und das **Kartensymbol** (ein Raum mit Wegen nach N, O, S, W und nach oben und
> unten, je Weg eine Wegart); siehe *Wurffelder der Karte*. Neu im Bild: `Card.bell`,
> `Card.scatter`, `Card.pickedRolls`, `Card.map`, `CardPick.bell`, `CardPick.scatter`,
> `CardPick.map`, die Werte `MapIcon`, `PathKind`, `Scatter`, `CardRoll`; ein `CardPick` braucht
> keinen `PickedItem` mehr (`items` jetzt `*`). Dazu die **Namen auf der Tafel NSC** (sechs Felder,
> je weiblich, männlich und neutral, einmal irdisch und einmal spacig; siehe *Namen*) und **Name
> von der Karte** beim Benennen von Charakteren und Welten (siehe dort); dafür ändert sich das Bild
> nicht. Damit alles auf einen Bildschirm passt, fallen auf der Tafel *Handlung* *Gegenstand* und
> *Fund* weg (ausgeblendet). Der UI-Entwurf dazu liegt unter
> [`ui-entwurf/kartensymbol/`](ui-entwurf/kartensymbol/).
>
> Ebenfalls am 3. November 2026 freigegeben: der **Angriff** im neuen Reiter *Kampf* (siehe
> *Waffen*, *Angriff* und *Schaden*). Neu im Bild: als Referenzdaten `Weapon` mit `ArmorDm` und
> `RangeDm`, die Werte `AttackKind`, `ArmorClass` und `Range`, `Item.weapon`; `Item.uses` ist jetzt
> abgeleitet (`/uses`, aus der Waffe). Am Charakter die Waffe in der Hand (`Character.wields`),
> flüchtig der Angriff in Vorbereitung (`Attack`), im Log das Angriffsergebnis (`AttackResult`)
> und der Schadenswurf (`DamageRoll`).
>
> **Entwurf, noch nicht freigegeben** (3. November 2026): **Heilung** (siehe *Heilung*). Neu im Bild:
> der Logeintrag `Recovery` mit `RecoveryKind` (Aufwachen, Behandlung, Ruhe), Patient (`for` bzw.
> `npc`) und Behandelnder (`by`).
>
> Ebenfalls am 3. November 2026 freigegeben: **Begegnungen mit NSC, Angriffe in beide Richtungen
> und Wunden** (siehe *Begegnung*, *NSC*, *Wunden*, *Getragene Rüstung*). Neu im Bild:
> `Encounter`, `Npc`, `Wounds`, `WoundState`, als Referenzdaten `EncounterType`, flüchtig
> `Wounding`; `Character.npc`, `Character.wears`, `Character./wounds`, `Character./state`,
> `Item.armor`, `DamageRoll.to`; der Angriff kennt Angreifer und Ziel als SC oder NSC (`for`/`by`,
> `against`/`victim`).
>
> Ebenfalls am 3. November 2026 freigegeben: **Verkaufen** im Shop (siehe *Shop*). Neu im Bild: die Buchungsart `sale` und der Verweis `Booking.sold`.
>
> Ebenfalls am 3. November 2026 freigegeben: **Aufenthaltsort, Gruppenkasse, Shop und Munition**
> (siehe dort), mit dem neuen Reiter *Shop*. Neu im Bild: `Campaign.location`, `Campaign./funds`, `Booking` mit
> `BookingKind`, `Hex./offer`, `Possession.rounds` und an der Waffe `rounds`, `law` und `ammo`.
>
> **Zurzeit** hat die Karte nur die Felder mit Einträgen aus Mythic und die Namen, alle als Paar: Aktion und
> Beschreibung des Zufallsereignisses, Hören und Riechen, dazu die drei Wurffelder sowie die Themen-Tafeln NSC
> (mit den sechs Namen), NSC-Aktionen, Welt (mit Schiff), Wesen und Handlung mit Mythics Elements-Tabellen. Alle übrigen Felder und Bereiche sind ausgeblendet, bis es
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
| Ergebnis | `OracleAnswer`, `DiceRoll`, `CardPick`, `TaskResult`, `AttackResult`, `DamageRoll` | Ein Logeintrag, den das Orakel, die Würfel oder die Karte liefert; nur ihn kann man deuten |
| Schreibzeile | (Fragefeld) | Das eine Textfeld über den Knöpfen; was der Text wird, entscheidet der Knopf |
| Würfelwurf (2W6) | `DiceRoll` | Ein einfacher Wurf mit zwei Würfeln |
| Inspirationskarte | `Card` | Eine gezogene Karte, solange sie offen ist |
| Kartenauswahl | `CardPick` | Was man von einer Karte in den Log übernimmt, mit der Frage |
| Ausgewählter Eintrag | `PickedItem` | Ein übernommenes Feld: welches Feld, welcher Eintrag |
| Wurffeld | `CardRoll` | Ein Feld der Karte, das würfelt statt aus einer Liste zu ziehen: Glockenzahl, Streuwürfel, Kartensymbol |
| Glockenzahl | `Card.bell`, `CardPick.bell` | Eine Zahl von 1 bis 10 nach einer Glockenkurve, meist 4–7; im GMA2e der *Difficulty Generator*. Nicht zu verwechseln mit der Stufe, die für Proben die Schwierigkeit setzt |
| Streuwürfel | `Scatter` | Eine von 8 Richtungen (N, NO, O, SO, S, SW, W, NW), Volltreffer oder Fehlschlag; im GMA2e der *Scatter Die* |
| Volltreffer, Fehlschlag | `Scatter.hit`, `Scatter.miss` | Der Streuwürfel trifft genau bzw. geht ganz daneben |
| Kartensymbol | `MapIcon` | Ein Raum auf einer Ebene mit Wegen nach N, O, S, W und nach oben und unten; im GMA2e das *Map Icon* |
| Wegart | `PathKind` | Was in eine Richtung führt: kein Weg, Weg, Sackgasse, verborgener Weg, Hindernis |
| Entwurf | Paket `draft` | Was später ein Logeintrag wird, solange es noch offen ist |
| Probe | `Task` | Eine Probe, solange sie für den Charakter oben vorbereitet wird |
| Probenergebnis | `TaskResult` | Eine gewürfelte Probe |
| Waffe | `Weapon` | Die Kampfwerte einer Waffe aus den Charts (S. 4 und 6), z. B. Rifle: DEX 6 (−2) bzw. 8 (+1), 3W6, DMs gegen Rüstung und je Reichweite; dazu die Hände |
| Hände | `Weapon` *Hands* | Die Waffe, die jeder hat; sie gehört zu keinem Gegenstand |
| Art des Angriffs | `AttackKind` | Schlag (*blow*, Hände), Hieb (*swing*, Klingen) oder Schuss (*shot*, Schusswaffen) |
| Nötiges Attribut | `Weapon.required`, `requiredDm` | Darunter gibt es den DM, z. B. Cutlass unter STR 7: −2 |
| Vorteilhaftes Attribut | `Weapon.advantageous`, `advantageousDm` | Ab da gibt es den DM, z. B. Cutlass ab STR 11: +2 |
| Schaden | `Weapon.wounds` | Wie viele W6 ein Treffer verursacht, z. B. Rifle 3W6 |
| Rüstungsklasse | `ArmorClass` | Was das Ziel trägt: Nothing, Jack, Mesh, Cloth, Reflec, Ablat, Combat |
| Reichweite | `Range` | Close, Short, Medium, Long, Very Long |
| Waffe in der Hand | `Character.wields` | Die Waffe, die ein Charakter gerade führt; keine heißt Hände |
| Aufenthaltsort | `Campaign.location` | Die Welt, auf der die Gruppe gerade ist; dort kauft sie ein |
| Gruppenkasse | `Campaign./funds` | Das gemeinsame Geld der Gruppe in Cr, die Summe aller Buchungen |
| Buchung | `Booking` | Eine Bewegung der Gruppenkasse: Einnahme, Ausgabe, Einzahlung, Auszahlung oder Kauf |
| Art der Buchung | `BookingKind` | income (Einnahme, z. B. Belohnung), expense (Ausgabe), deposit (Einzahlung eines Charakters), payout (Auszahlung an einen Charakter), purchase (Kauf), sale (Verkauf) |
| Angebot | `Hex./offer` | Was man auf der Welt kaufen kann: nach TL und Gesetz der Welt |
| Shop | (Reiter „Shop“) | Der Screen für Kasse und Einkauf auf dem Aufenthaltsort |
| Magazin | `Weapon.ammo` | Der Gegenstand, der eine Schusswaffe lädt, z. B. Rifle Ammo (20 rds) oder LC Power Pack |
| Schuss im Magazin | `Possession.rounds`, `Weapon.rounds` | Wie viele Schuss eine Schusswaffe gerade geladen hat bzw. voll fasst |
| Verboten ab Gesetz | `Weapon.law` | Ab dieser Gesetzesstufe ist die Waffe verboten (S. 14), z. B. Body Pistol ab 1 |
| Begegnung | `Encounter` | Eine Gruppe von NSC, auf die die Gruppe trifft, z. B. „5 Thugs“; gewürfelt nach der Random Encounter List (S. 21) |
| Art der Begegnung | `EncounterType` | Eine Zeile der Random Encounter List: Anzahl in W6, Name, TL-Abweichung, Anführer (L), Schusswaffen (G), Rüstung (A), Fahrzeug (V) |
| Reaktion | `Encounter.reaction` | 2W6 auf die Reactions-Tabelle (S. 21): 2 sofortiger Angriff … 12 freundlich |
| NSC der Begegnung | `Npc` | Ein Gegner oder Fremder in einer Begegnung, mit UPP, Waffe, Rüstung, Fertigkeit und Wunden |
| Anführer | `Npc.leader` | Der NSC mit der besten Ausrüstung, wenn die Begegnung einen hat (L) |
| Übernehmen | `Npc.became` | Ein NSC wird zum Charakter der Kampagne, als SC oder als dauerhafter NSC |
| Dauerhafter NSC | `Character` mit `npc` | Ein Charakter, der kein SC ist; er steht im Charakter-Screen unter „NSC“ |
| Getragene Rüstung | `Character.wears`, `Npc.wears` | Die Rüstung, die jemand gerade anhat; sie zählt, wenn er angegriffen wird |
| Rüstungsklasse einer Rüstung | `Item.armor` | Wie eine Rüstung in der Matrix zählt, z. B. Vacc Suit als Cloth, Battle Dress als Combat |
| Wunden | `/wounds`, `Wounds` | Wie viel STR, DEX und END jemand durch Treffer verloren hat |
| Zustand | `/state`, `WoundState` | unverletzt, verwundet, bewusstlos (ein Attribut auf 0), schwer verwundet (zwei), tot (drei) |
| Heilung | `Recovery` | Ein Logeintrag, der Wunden zurücknimmt: Aufwachen, Behandlung oder Ruhe (S. 7) |
| Aufwachen | `RecoveryKind.wake` | Ein Bewusstloser kommt zu sich; die Wunden gehen zur Hälfte zurück, bei einer schweren Wunde nur auf mindestens 1 |
| Behandlung | `RecoveryKind.treatment` | Ein SC mit Medical heilt die Wunden ganz: leichte mit Medical-1 und Medical Kit in 30 Minuten, schwere mit Medical-3 in einer medizinischen Einrichtung in 5W6 Tagen |
| Ruhe | `RecoveryKind.rest` | Leichte Wunden heilen ohne Behandlung in 3 Tagen ganz |
| Leichte und schwere Wunde | `/severity` | Schwer, wenn seit der letzten vollen Heilung zwei Attribute zugleich auf 0 standen; sonst leicht |
| Schaden verteilen | `Wounding` | Ein gewürfelter Schaden an einem SC, solange der Spieler die Würfel auf Attribute verteilt |
| Angriff | `Attack` | Ein Angriff, solange er für den Charakter oben vorbereitet wird |
| Angriffsergebnis | `AttackResult` | Ein gewürfelter Angriff: Treffer oder nicht |
| Schadenswurf | `DamageRoll` | Der Wurf auf den Schaden eines Treffers, z. B. 3W6 = 11 |
| Kampf | (Reiter „Kampf“) | Der Screen für Angriffe: Charakter oben, Waffe in der Hand, Tabelle der Waffe |
| Bereich der Karte, Themen-Tafel | `Section` | Zufallsereignis, Sinneseindrücke, …; NSC, Welt, … |
| Feld der Karte | `Slot` | Aktion, Hören, Aussehen, Name, Auslöser, … |
| Spalte | `Column` | Eine Liste von Einträgen in einem Feld; ein Feld hat eine oder zwei |
| Klangart der Namen | (Felder der Tafel NSC) | Irdisch (Namen von der Erde) oder spacig (erfunden, fremd klingend) |
| Name von der Karte | (Knopf „Karte“ neben einem Namensfeld) | Zeigt Vor- und Nachnamen von der Tafel NSC getrennt zur Wahl und schreibt den gewählten Namen ins Feld; kein Logeintrag |
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
| Notiz zur Welt | `Hex.note` | Freier Text auf der Weltkarte einer fertigen Welt, z. B. „Halveks Werft am Südpol“; lässt sich jederzeit ändern |
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
  Karte, der Probe und dem Angriff in Vorbereitung. Der Controller hält, welcher Screen offen ist, ob das
  Ergebnis-Popup zu sehen ist und welche Weltkarte offen ist. Ob die Leiste mit dem Charakter oben
  eingeklappt ist, merkt sich das Gerät über einen Neustart hinweg, wie die offene Kampagne; zum
  Spielstand gehört das nicht. Reine Darstellung bleibt in der View: wie Felder und Tafeln angeordnet sind, ob das Menü offen ist, der
  Text im Fragefeld während des Tippens, Farben, die Hex-Schreibweise der UPP und das Format der
  Uhrzeit.
- **Entwürfe.** Im Paket `draft` liegen die Entwürfe eines Logeintrags: die offene Karte (`Card`,
  wird beim Bestätigen zum `CardPick`) die Probe in Vorbereitung (`Task`, wird beim Würfeln zum
  `TaskResult`) und der Angriff in Vorbereitung (`Attack`, wird beim Würfeln zum `AttackResult`).
  Je Kampagne gibt es höchstens eine offene Karte, höchstens eine Probe und höchstens einen Angriff. Pfeile
  führen nur aus `draft` heraus, nie hinein: Der gespeicherte Stand weiß nichts von seinen
  Entwürfen. Entwürfe werden nie gespeichert; beendet das Handy die App, sind sie weg. Ebenso flüchtig ist der Wurf
  der Weltenerschaffung (`WorldRoll`, siehe dort): Gespeichert wird nur, was er ins Hexfeld einträgt.
- **Mehrere Kampagnen.** Die Kampagne ist die oberste Ebene: Alles, was gespeichert wird, hängt an
  genau einer Kampagne, und Kampagnen wissen nichts voneinander. Es gibt immer mindestens eine;
  die letzte lässt sich nicht löschen. Jede hat einen Namen, der nicht leer ist und sich ändern
  lässt; zwei Kampagnen dürfen gleich heißen. Gespielt wird immer in genau einer, der **offenen
  Kampagne**. Welche das ist, merkt sich das Gerät über einen Neustart hinweg; zum Spielstand gehört
  das nicht. Wechselt man die Kampagne, sind offene Karte, Probe und Angriff in Vorbereitung weg. Eine neue
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
  der Karte. Die Werte der Wurffelder hält die Kartenauswahl selbst (siehe *Wurffelder der Karte*). Logeinträge werden angehängt und nie geändert. Ein einzelner Eintrag lässt sich löschen,
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
    eine Kartenauswahl, eine Probe, einen Angriff oder einen Schadenswurf, nie auf eine Notiz oder Deutung, und immer auf einen
    früheren Eintrag. Vorgeschlagen ist das neueste Ergebnis; Antippen eines anderen Ergebnisses im
    Log macht es zum Ziel. Ein Ergebnis kann mehrere Deutungen haben.
  - Eine **Notiz** verweist auf nichts; sie steht für sich im Log.
  - Wie jeder Logeintrag wird ein `Note` angehängt und nie geändert. Wer sich verschrieben hat,
    löscht ihn und schreibt neu.
  - Der Log zeigt eine Deutung direkt unter ihrem Ergebnis, im selben Kasten, auch wenn sie später
    geschrieben wurde; ihre eigene Zeit behält sie. Das ist Sache der Anzeige: Die Reihenfolge im Log
    bleibt die der Ereignisse.
  - **Ein Ergebnis löschen löscht seine Deutungen mit.** Die Rückfrage sagt das („Eintrag mit
    1 Deutung endgültig löschen?“). Eine Deutung allein lässt sich löschen, ihr Ergebnis bleibt. Außer
    dem Schadenswurf (siehe *Angriff*) ist das die einzige Stelle, an der ein Logeintrag auf einen
    anderen verweist; die Regel *Worauf der
    Log verweist, wird nie gelöscht* gilt für Charaktere und Referenzdaten, nicht für den Log selbst.
  - Die **Kampagnendatei** enthält Deutungen und Notizen; beim Import muss jede Deutung auf ein
    früheres Ergebnis derselben Datei verweisen, sonst wird nichts importiert.
  - Auch die Leiste der Charaktererschaffung hat *Deuten* und *Notiz*. Weil sie den Log nicht
    zeigt, gilt eine Deutung dort immer dem neuesten Ergebnis; die Leiste sagt, welchem.
- **Karte ziehen.** Ziehen legt eine `Card` an: für jedes Feld aller Bereiche aus jeder seiner
  Spalten einen nicht ausgeblendeten Eintrag zufällig (`drawn`), die Themen-Tafeln eingeschlossen,
  in der Reihenfolge der Bereiche, Felder und Spalten. Ein Feld mit zwei Spalten zieht so ein
  **Paar**. Ausgeblendete Felder übergeht es (siehe *Einträge austauschen*).
  Eine gestellte Frage geht auf die Karte über. Die Namen stehen auf der Themen-Tafel *NSC* in
  sechs Feldern; jedes zieht ein Paar aus Vor- und Nachname (siehe *Namen*).
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
- **Waffen.** Die Kampfwerte der Waffen sind Referenzdaten (`Weapon`), aus den Charts der Starter
  Edition: *Weapons and Equipment* (S. 4) und *Weapons and Range Matrix* (S. 6).
  - Je Waffe: die Art des Angriffs (`attack`), das nötige und das vorteilhafte Attribut mit ihren
    DMs (`required`, `requiredDm`, `advantageous`, `advantageousDm`), der Schaden in W6 (`wounds`),
    je Rüstungsklasse ein DM (`vsArmor`, sieben, in der Reihenfolge der Matrix) und je Reichweite
    ein DM (`atRange`, fünf). Steht in der Matrix „no“, hat die Reichweite keinen DM: Auf diese
    Reichweite geht mit der Waffe kein Angriff (Body Pistol auf Long, alle Klingen ab Medium).
  - Bei Schlägen und Hieben (Hände, Klingen) zählt STR, bei Schüssen DEX.
  - Jeder Gegenstand der Art *weapon* hat genau eine Waffe (`Item.weapon`), und jede Waffe gehört
    zu höchstens einem Gegenstand. Dazu kommen die **Hände** (*Hands*), die zu keinem Gegenstand
    gehören und die jeder hat.
  - Jede Waffe nutzt genau eine Fertigkeit (`uses`): Klingen und Schusswaffen ihre eigene aus Blade
    bzw. Gun Combat, Hände und Club Brawling. Die Fertigkeit eines Gegenstands folgt aus seiner
    Waffe (`Item./uses`); die Abmusterung findet darüber weiter den Gegenstand zu einer Waffe aus
    Blade oder Gun Combat.
  - Tierwaffen (Claws, Teeth, Horns, …), Zubehör (Sights, Stocks, Silencer), Länge und Munition
    kommen später.
- **Rüstungsklasse und Reichweite.** Die sieben Rüstungsklassen (`ArmorClass`) sind die Spalten der
  Matrix: Nothing, Jack, Mesh, Cloth, Reflec, Ablat, Combat. Vacc Suit zählt als Cloth, Battle
  Dress als Combat (S. 4). Die fünf Reichweiten (`Range`) sind Close (Berührung), Short (1–5 m),
  Medium (6–50 m), Long (51–250 m) und Very Long (251–500 m), nach S. 7.
- **Waffe in der Hand.** Jeder Charakter führt gerade höchstens eine Waffe (`wields`); keine heißt:
  Hände. Infrage kommt nur die Waffe eines Gegenstands aus seinem Besitz. Sie wird gespeichert,
  übersteht also einen Neustart und steht in der Kampagnendatei. Entfernt man den Gegenstand aus dem
  Besitz, hat der Charakter wieder die Hände. Im Angriff wechselt man sie, im Editor auch.
- **Angriff.** Es gilt: 2W6 + DM ≥ 8 (*Basic Throw to Hit*, S. 6), mit
  DM = Fertigkeit + Rüstung + Reichweite + Attribut.
  - *Fertigkeit*: die Stufe in der Fertigkeit der Waffe. Ohne diese Fertigkeit zählt Stufe 0, also
    ±0: In allen Waffen hat jede Figur Stufe 0 (siehe README). „Ohne Fertigkeit“ mit −3 gibt es
    hier nicht, und Jack-of-all-Trades ändert nichts.
  - *Rüstung*: der DM der Waffe gegen die Rüstungsklasse des Ziels, z. B. Rifle gegen Jack +3,
    gegen Reflec +2, gegen Combat −5.
  - *Reichweite*: der DM der Waffe auf diese Reichweite. Ohne DM („no“) gibt es den Angriff nicht.
  - *Attribut*: STR bzw. DEX des Angreifers unter dem nötigen Wert gibt `requiredDm`, ab dem
    vorteilhaften Wert `advantageousDm`, dazwischen ±0. Das ist nicht die Hausregel ±1 der Probe;
    die Hausregeln und die gewählte Stufe (`odds`) zählen beim Angriff nicht.
  - Angriffe würfelt man im Reiter **Kampf**. Oben steht dort dieselbe Leiste wie im Orakel-Screen,
    mit dem Charakter oben; Wischen wählt den Charakter, für den man angreift. Statt der
    Fertigkeiten zeigt die Leiste dort die Waffen: die Hände und die Waffen aus seinem Besitz, die
    Waffe in der Hand hervorgehoben; antippen wechselt sie.
  - Der Angriff in Vorbereitung ist ein `Attack`, flüchtig im Paket `draft` wie die Probe. Er gilt
    immer dem Charakter oben (`/for`) und seiner Waffe in der Hand (`/with`). Man wählt Rüstung
    und Reichweite des Ziels; erst mit beiden gibt es DM, nötigen Wurf (8 − DM) und Chance, exakt
    aus den 36 Kombinationen. Wechselt der Charakter oben, endet der Angriff; wechselt die Waffe in
    der Hand, bleiben Rüstung und Reichweite, außer die Reichweite geht mit der neuen Waffe nicht.
  - Die Ansicht zeigt dazu die klassische Tabelle der Waffe: Rüstung × Reichweite, in jeder Zelle
    der nötige Wurf mit allen DMs des Charakters; eine Zelle antippen wählt Rüstung und Reichweite.
  - Gewürfelt wird ein Angriff als `AttackResult` in den Log übernommen. Es verweist auf
    Charakter, Waffe und, wenn er sie hat, seine Fertigkeitsstufe darin; es hält Rüstung,
    Reichweite, die zwei Würfel sowie DM und Zielwert fest. Der Erfolg (`/success`: Würfel + `dm` ≥
    `target`) folgt allein daraus. Der Angriff bleibt danach offen, sodass man gleich noch einmal
    angreifen kann.
  - Ein Angriffsergebnis ist ein Ergebnis wie das Probenergebnis: Man kann es deuten, und die
    Fertigkeitsstufe und der Charakter, auf die es verweist, werden nicht gelöscht, sondern
    ausgeblendet (siehe *Löschen und Ausblenden*).
  - **Schaden.** Nach einem Treffer bietet der Reiter Kampf an, den Schaden zu würfeln: so viele W6,
    wie die Waffe `wounds` hat. Er wird ein eigener Logeintrag, der Schadenswurf (`DamageRoll`), der
    auf seinen Treffer verweist (`of`) und die Würfel einzeln festhält; `/damage` ist ihre Summe. Für
    jeden Treffer gibt es höchstens einen Schadenswurf, für einen Fehlschlag keinen. Angeboten wird
    er für den neuesten Treffer im Log, solange es dafür noch keinen gibt; der Log zeigt ihn unter
    seinem Treffer, im selben Kasten. Ein Angriffsergebnis löschen löscht seinen Schadenswurf mit,
    wie seine Deutungen; den Schadenswurf allein zu löschen lässt den Treffer stehen, und man kann
    neu würfeln. In der Kampagnendatei muss jeder Schadenswurf auf einen früheren Treffer derselben
    Datei verweisen, auf den kein anderer verweist, und so viele Würfel haben, wie die Waffe
    `wounds` hat.
  - **Später**: DMs des Verteidigers (Parieren, Ausweichen, Deckung), Zubehör, Dunkelheit,
    Überraschung, Autofeuer, Schrot, geschwächte Hiebe, die eigene Rüstung eines Charakters, Angriffe
    auf Charaktere und Schaden an Attributen verteilen (Bewusstlosigkeit, Tod), Munition.
- **Aufenthaltsort.** Die Gruppe, also alle Charaktere der Kampagne, ist immer an höchstens einem
  Ort (`location`): einer fertigen Welt des Subsektors. Man setzt ihn auf der Weltkarte („Gruppe ist
  hier“); die Karte zeigt ihn. Eine neue Kampagne hat keinen. Ohne Aufenthaltsort gibt es keinen
  Einkauf. Wird die Welt verworfen (das geht heute nicht), fällt er weg.
- **Gruppenkasse.** Die Gruppe hat ein gemeinsames Konto. Sein Stand (`/funds`) ist die Summe aller
  Buchungen (`bookings`), in der Reihenfolge, in der sie entstanden sind; eine neue Kampagne beginnt
  mit Cr 0 und ohne Buchung.
  - Jede Buchung hält Zeitpunkt, Art (`kind`) und Betrag (`amount`, ganze Cr, positiv für Geld in
    die Kasse, negativ für Geld hinaus) fest, dazu freiwillig einen Text (`text`, z. B. „Belohnung
    von Dr. Halvek“).
  - *Einnahme* (`income`) und *Ausgabe* (`expense`) gibt man frei ein, mit Betrag und Text.
  - *Einzahlung* (`deposit`) nimmt Credits eines Charakters (`for`) in die Kasse, *Auszahlung*
    (`payout`) gibt Geld aus der Kasse an einen Charakter; seine `credits` ändern sich um denselben
    Betrag. Ein Charakter zahlt nie mehr ein, als er hat.
  - *Kauf* (`purchase`) und *Verkauf* (`sale`) siehe *Shop*.
  - Die Kasse wird nie negativ: Ausgabe, Auszahlung und Kauf gehen nur bis zum Stand. Einnahme,
    Einzahlung und Verkauf bringen Geld in die Kasse.
  - Buchungen werden nur angehängt, nie geändert oder gelöscht; einen Fehler bucht man zurück
    (eine Gegenbuchung mit dem umgekehrten Betrag).
  - Die Kampagnendatei enthält Aufenthaltsort und Buchungen; beim Import muss jede Buchung zu ihrer
    Art passen und die Kasse nach keiner Buchung negativ sein.
- **Shop.** Im Reiter *Shop* kauft die Gruppe auf ihrem Aufenthaltsort ein, aus der Gruppenkasse.
  - **Angebot** (`/offer`): jeder Gegenstand aus der Liste mit Preis, dessen TL höchstens der TL der
    Welt ist (S. 23: „TL is the minimum technological level at which the item is available“), ohne
    Schiffe und Mitgliedschaften. Auch Waffen, die auf der Welt verboten sind, kann man kaufen, aber
    der Shop warnt: Eine Waffe ist verboten, wenn das Gesetz der Welt mindestens `law` ist (S. 14);
    ihr Magazin ebenso. Der Shop zeigt das bei der Waffe („verboten ab Gesetz 5“) und fragt beim Kauf
    nach.
  - Die Verbote nach S. 14: ab 1 Body Pistol; ab 2 Laser Carbine und Laser Rifle; ab 3 Automatic
    Rifle; ab 4 Submachinegun; ab 5 Automatic Pistol und Revolver; ab 6 alle übrigen Schusswaffen
    außer der Shotgun (Carbine, Rifle); ab 7 Shotgun; ab 8 alle Klingen außer dem Dagger; ab 9
    (Waffen außerhalb der eigenen Wohnung verboten) auch Dagger, Club und Cudgel. Rüstungen und alles
    andere verbietet das Gesetz nicht.
  - **Preis** ist der Preis aus den Charts, ohne Aufschlag: Classic Traveller kennt für Ausrüstung
    keine Preisänderung je Welt; die Preis-DMs auf S. 22 gelten nur für Handelsgüter in Tonnen.
  - **Kaufen**: Man wählt einen Gegenstand, eine Anzahl (1 oder mehr; mit `once` genau 1) und den
    Charakter, der ihn bekommt (einen Lebenden). Der Kauf ist eine Buchung `purchase` mit
    `amount` = −Preis × Anzahl, `bought` (Gegenstand), `count` (Anzahl), `for` (Charakter) und
    `in` (die Welt); der Gegenstand kommt in seinen Besitz. Er geht nur, wenn die Kasse reicht.
  - **Verkaufen**: Auf dem Aufenthaltsort verkauft ein Lebender Gegenstände aus seinem Besitz, die
    einen Preis haben (ohne Schiffe und Mitgliedschaften), auch verbotene und solche über dem TL der
    Welt. Man wählt Charakter, Gegenstand und Anzahl (höchstens, was er hat) und den Erlös je Stück:
    vorgeschlagen ist der halbe Preis der Charts, abgerundet auf ganze Cr; man kann ihn ändern
    (ganze Cr, mindestens 1). Der Verkauf ist eine Buchung `sale` mit `amount` = +Erlös × Anzahl,
    `sold`, `count`, `for` und `in`; der Gegenstand geht aus dem Besitz (beim letzten Stück ist der
    Besitz weg). Verkauft er die Waffe in der Hand ganz, hat er wieder die Hände; eine geladene
    Schusswaffe geht mit ihren Schuss.
  - **Später**: Preisänderungen nach Hausregel, die Industrie einer Welt, Schiffe kaufen,
    Leistungen (Recharge, Refill) und Zubehör.
- **Munition.** Eine Schusswaffe fasst `rounds` Schuss und lädt mit ihrem Magazin (`ammo`), nach
  S. 4 und 23: Body Pistol 6, Automatic Pistol 15, Revolver 6, Carbine 10, Rifle 20, Automatic Rifle
  20, Shotgun 10, Submachinegun 30 Schuss je Magazin; Laser Carbine 50 und Laser Rifle 100 Schuss je
  Power Pack. Klingen und Hände haben keine.
  - Wie viele Schuss eine Schusswaffe im Besitz gerade geladen hat, steht am Besitz (`rounds`, 0 bis
    `Weapon.rounds`); fehlt das Feld, ist sie voll. Hat ein Charakter dieselbe Schusswaffe mehrfach,
    gilt die Zahl für die in der Hand.
  - Eine gekaufte Schusswaffe kommt leer (`rounds` 0), wenn der Charakter sie noch nicht hatte;
    Magazine kauft man dazu. Waffen aus der Abmusterung kommen geladen.
  - Jeder Angriff mit einer Schusswaffe verbraucht einen Schuss. Mit 0 Schuss gibt es keinen Angriff.
  - **Nachladen** im Reiter Kampf nimmt ein Magazin aus dem Besitz (Anzahl − 1, beim letzten ist der
    Besitz weg) und setzt `rounds` auf voll; ein angebrochenes Magazin geht dabei verloren. Ohne
    Magazin gibt es kein Nachladen.
  - Der Angriff im Log bleibt, wie er ist; welcher Schuss es war, hält er nicht fest.
  - **Später**: Automatisches Feuer (mehrere Schuss), angebrochene Magazine aufheben, Recharge der
    Power Packs.
- **Begegnung.** Im Reiter Kampf würfelt man auf dem Aufenthaltsort eine **Begegnung** (`Encounter`),
  ohne weitere Eingabe; man kann die Art auch aus der Liste wählen, die Anzahl wird dann trotzdem
  gewürfelt, außer man gibt sie vor.
  - *Art*: 1W6 und 1W6 auf die Random Encounter List (S. 21), z. B. 14 = 3W6 Rowdies (L). Die Zeilen
    61–66 sind leer: keine Begegnung, nichts wird angelegt.
  - *Anzahl*: so viele W6, wie die Art angibt (mindestens 1 NSC).
  - *TL der Gruppe*: TL der Welt plus die Abweichung der Art (z. B. +1 bei Soldiers), mindestens 0.
  - *Jeder NSC* (`Npc`) bekommt 2W6 je Attribut, einen Namen von der Tafel NSC (Vor- und Nachname,
    irdisch oder spacig zufällig), eine Waffe (`wields`) und mit A eine Rüstung (`wears`): Ohne G
    eine zufällige Klinge bis zum TL der Gruppe (Club, Cudgel, Spear, Dagger, Blade …, nach
    *Available Weapons by TL*), mit G eine zufällige Schusswaffe bis zum TL; mit A eine zufällige
    Rüstung bis zum TL. Die Fertigkeit in seiner Waffe (`skill`) ist 1. Munition zählen NSC nicht.
  - *Anführer* (L): der erste NSC; er bekommt die beste Ausrüstung bis zum TL (die Waffe mit dem
    höchsten TL, bei Gleichstand die teuerste, ebenso die Rüstung, auch ohne A) und Fertigkeit 2.
  - *Fahrzeug* (V) hält die Art fest; im Kampf zählt es vorerst nicht.
  - *Reaktion* (`reaction`): 2W6, DM −1 auf einer Welt mit Bevölkerung 9+; eine echte 2 oder 12
    bleibt, sonst begrenzt auf 3 bis 11. Der Text (`/reactionText`) kommt aus der Tabelle.
  - Es gibt höchstens **eine laufende Begegnung**. Sie bleibt gespeichert, bis man sie beendet
    (`ended`); beendete Begegnungen bleiben in der Kampagne, weil der Log auf ihre NSC verweist,
    und werden nicht mehr gezeigt. Eine Begegnung, auf die der Log nicht verweist, wird beim Beenden
    gelöscht.
- **NSC.** Ein NSC lebt in seiner Begegnung, getrennt von den Charakteren.
  - **Übernehmen**: Man kann einen NSC als SC oder als dauerhaften NSC in die Kampagne übernehmen.
    Er wird ein Charakter mit seinem Namen, seinem UPP (die vollen Werte, ohne Wunden), seiner
    Fertigkeit in der Waffe, Waffe und Rüstung im Besitz, Waffe in der Hand und getragener Rüstung,
    Herkunft = Art der Begegnung. Als dauerhafter NSC hat er `npc`. Der NSC der Begegnung verweist
    danach auf ihn (`became`), kämpft nicht mehr in der Begegnung und lässt sich nicht noch einmal
    übernehmen.
  - **Dauerhafte NSC** (`Character` mit `npc`) stehen im Charakter-Screen unter „NSC“, nicht in der
    Leiste oben, nicht unter den SC im Shop, und lassen sich im Editor zum SC machen und umgekehrt.
    Proben und Angriffe würfelt man für SC.
- **Getragene Rüstung.** Jeder Charakter trägt höchstens eine Rüstung (`wears`), einen Gegenstand
  mit Rüstungsklasse aus seinem Besitz; keine heißt Nothing. Wie er in der Matrix zählt, steht an
  ihm (`Item.armor`): Jack, Mesh, Cloth, Reflec, Ablat, Combat Armor als Combat, Battle Dress als
  Combat (S. 4), Vacc Suit als Cloth (S. 4), Protective Suit (jack) als Jack und Protective Suit
  (cloth) als Cloth. NSC bekommen in Begegnungen nur Rüstungen der Art *armor*. Man wählt sie im Kampf und im Editor; geht sie aus dem Besitz,
  trägt er Nothing.
- **Angriff in beide Richtungen.**
  - *SC gegen NSC*: Der Charakter oben greift einen NSC der laufenden Begegnung an (`against`), der
    weder tot noch übernommen ist. Die Rüstung ist die, die der NSC trägt; man wählt nur die
    Reichweite. Wie bisher geht auch ein Ziel ohne NSC, mit frei gewählter Rüstung.
  - *NSC gegen SC*: Ein NSC der Begegnung, der nicht bewusstlos oder tot ist, greift den Charakter
    oben an (`by`, `victim`). Es zählen die Fertigkeit des NSC (`skill`), seine Waffe, seine
    STR/DEX mit Wunden, die getragene Rüstung des SC und die Reichweite.
  - Angreifer mit Wunden: STR bzw. DEX zählen mit ihrem verwundeten Wert. Bewusstlose und Tote
    greifen nicht an.
  - Das Angriffsergebnis verweist auf Angreifer (`for` = SC oder `by` = NSC, genau einer) und, wenn
    es eines gibt, auf das Ziel (`against` = NSC oder `victim` = SC, höchstens einer); es hält wie
    bisher Rüstung, Reichweite, Würfel, DM und Zielwert fest.
- **Wunden.** Nach S. 7. Der Schaden eines Treffers wird auf STR, DEX und END verteilt; jeder Würfel
  ist ein Block, der ganz auf ein Attribut geht und nicht geteilt wird (`DamageRoll.to`, je Würfel
  das Attribut). Was über 0 hinausgeht, verfällt.
  - *Erster Treffer* (kritisch): Der erste Schaden, den jemand bekommt, geht ganz auf ein zufällig
    gewähltes Attribut.
  - *Weitere Treffer*: Bei einem NSC verteilt die App jeden Würfel zufällig auf ein Attribut über 0;
    bei einem SC wählt der Spieler für jeden Würfel das Attribut (`Wounding`, flüchtig, bis alle
    verteilt sind; erst dann steht der Schadenswurf im Log). Ist kein Attribut mehr über 0, verfällt
    der Würfel.
  - Die Wunden (`/wounds`) folgen aus den Schadenswürfen im Log, die auf Treffer gegen diesen SC bzw.
    NSC verweisen. Ein Schadenswurf löschen nimmt seine Wunden zurück.
  - *Zustand* (`/state`): kein Attribut auf 0 und keine Wunde: unverletzt; Wunden, aber keins auf 0:
    verwundet; eins auf 0: bewusstlos (10 Minuten); zwei: schwer verwundet (3 Stunden
    bewusstlos); drei: tot. Stirbt ein SC so, markiert ihn die App als tot (`dead`); das lässt sich
    im Editor zurücknehmen.
  - Ein Treffer ohne Ziel (frei gewählte Rüstung) würfelt seinen Schaden wie bisher, verteilt ihn
    aber nicht (`to` fehlt).
  - **Später**: Medical Drugs, Wunden mit Zeit, Munition der NSC, Fahrzeuge, Überraschung, Entfernung,
    Moral und Kampfrunden.
- **Heilung.** Nach S. 7. Eine Heilung ist ein Logeintrag (`Recovery`) für einen verwundeten SC
  (`for`) oder NSC der laufenden Begegnung (`npc`), nie für einen Toten. Die Wunden (`/wounds`)
  folgen aus Schadenswürfen und Heilungen im Log, der Reihe nach; eine Heilung löschen nimmt sie
  zurück.
  - **Leicht oder schwer** (`/severity`): Eine Wunde ist *schwer*, wenn seit der letzten vollen
    Heilung zwei Attribute zugleich auf 0 standen, sonst *leicht*. Aufwachen macht eine schwere
    Wunde nicht leicht.
  - **Aufwachen** (`wake`): nur für Bewusstlose und schwer Verwundete. Bei einem Attribut auf 0 (10
    Minuten bewusstlos) steht jedes verwundete Attribut danach in der Mitte zwischen verwundetem und
    vollem Wert, abgerundet. Bei zwei auf 0 (3 Stunden bewusstlos) bleiben die Werte verwundet, aber
    mindestens 1.
  - **Behandlung** (`treatment`): Ein lebender SC, der nicht bewusstlos ist (`by`, auch der Patient
    selbst, wenn er wach ist), heilt alle Wunden ganz. Bei einer leichten Wunde braucht er Medical-1
    und ein Medical Kit im Besitz; es dauert 30 Minuten. Bei einer schweren Wunde braucht er
    Medical-3 und eine medizinische Einrichtung (Krankenstation, Sick Bay eines Schiffs); ob es eine
    gibt, bestätigt der Spieler. Die Dauer sind 5W6 Tage (`dice`, `/days`).
  - **Ruhe** (`rest`): heilt eine leichte Wunde ganz nach 3 Tagen, ohne Behandelnden. Eine schwere
    Wunde heilt ohne Behandlung nicht.
  - Nach einer vollen Heilung (Behandlung oder Ruhe) zählt der nächste Treffer wieder als erster
    (er geht ganz auf ein zufälliges Attribut).
  - Die App führt keine Spielzeit; Dauern stehen nur im Log.
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
    Klinge und Schusswaffe hat ihre Kampfwerte als Waffe (siehe *Waffen*) und nutzt über sie genau
    ihre Fertigkeit (`/uses`).
  - **TL, Gewicht und Preis** (`tl`, `weight`, `price`) stehen, wie in den Charts angegeben. Das
    Gewicht ist immer in kg (S. 4 nennt Gramm, S. 23 bei Fahrzeugen Tonnen = 1000 kg), der Preis
    immer in Cr (KCr und MCr umgerechnet). Steht im Chart ein offensichtlicher Druckfehler (Grav Belt
    „10 tons“), gilt trotzdem das Chart; die Daten vermerken es. Was die Charts nicht angeben, fehlt (Club und die
    Travellers' Aid Society haben keinen Preis, Passagen und Mitgliedschaft kein Gewicht). Bei Schiffen und Small Craft sind „tons“
    Verdrängung, kein Gewicht; sie haben deshalb keins. Gibt es einen Gegenstand in mehreren TL
    (Vacc Suit TL 8 bis 13), ist jede Zeile ein eigener Gegenstand mit eigener Id. Keine Gegenstände sind
    Accessories („10 % of price“) und Recharge (eine Leistung).
  - **Später**, mit Handel: Verkaufen, die Rüstungsklasse einer Rüstung als Gegenstand, Länge der Waffen,
    Kaufen und Verkaufen, Gesamtgewicht. Schiffe sind vorerst nur ein
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
- **Namen.** Die Namen gehören zur Themen-Tafel *NSC*. Sie hat sechs Namensfelder, je weiblich,
  männlich und neutral wie auf der GMA-Karte, und jedes zweimal: **irdisch** (Namen aus allen
  Weltgegenden der Erde) und **spacig** (erfunden und fremd klingend, angelehnt an den Klang der
  Vilani). Auf der Tafel stehen sie in zwei Reihen: oben irdisch, unten spacig, jeweils weiblich,
  männlich, neutral. Jedes Feld hat zwei Spalten, Vornamen und Nachnamen; irdische Vornamen bekommen
  irdische Nachnamen, spacige spacige. Die Nachnamen einer Klangart kommen aus einer gemeinsamen
  Liste; jedes Feld hat sie als eigene Spalte mit eigenen Einträgen, sodass jeder Eintrag zu genau
  einer Spalte gehört, wie bei den Elements-Tabellen. Die Namen sind eigene Inhalte. In den Daten
  steht jede Liste nur einmal (`src/data/names.json`), je Name mit seiner Klangart; die Spalten
  entstehen beim Laden.
  - Der frühere Bereich *Namen* mit drei Feldern bleibt mit allen Einträgen ausgeblendet in den
    Daten, damit alte Logeinträge ihre Namen behalten; auf der Karte fehlt er. Die sechs neuen Felder
    haben neue Ids.
- **Name von der Karte.** Wo man einen Namen eintippt, für einen Charakter (letzter Schritt der
  Charaktererschaffung, Charakter-Editor) oder für eine Welt (letzter Schritt der
  Weltenerschaffung), steht neben dem Feld ein Knopf **Karte**. Er öffnet die Namenswahl mit
  Vornamen und Nachnamen getrennt: Jedes der sechs Namensfelder der Tafel NSC wird zweimal gezogen,
  nach denselben Regeln wie *Karte ziehen*, mit zwei verschiedenen Vornamen und zwei verschiedenen
  Nachnamen je Feld. Oben stehen die zwölf Vornamen (erst irdisch, dann spacig, je weiblich,
  männlich, neutral), darunter die Nachnamen (erst irdisch, dann spacig; derselbe Nachname steht nur
  einmal da). Man tippt höchstens einen Vornamen und höchstens einen Nachnamen an; *Übernehmen*
  schreibt „Vorname Nachname“ ins Feld, oder nur den einen, wenn nur einer gewählt ist. Das gilt für
  Charakter und Welt gleich: Wer will, nimmt für eine Welt nur einen Namen. Danach lässt sich der
  Text wie getippt ändern. *Neu ziehen* zeigt neue Namen, *Abbrechen* lässt das Feld, wie es war.
  Gespeichert wird nur der Name, so wie er am Ende im Feld steht; die Wahl selbst ist kein
  Logeintrag und verweist auf nichts.
- **Einträge austauschen.** Ein Eintrag, der nicht mehr gezogen werden soll, wird nicht gelöscht und
  seine Id nicht neu vergeben, sondern ausgeblendet (`retired`): Ziehen übergeht ihn, alte
  Logeinträge zeigen ihn weiter mit seinem Text. Ob ein Log auf ihn verweist, weiß nur das jeweilige
  Gerät; deshalb wird jeder ausgetauschte Eintrag ausgeblendet. Hat eine Spalte nur ausgeblendete
  Einträge, ist ihr Feld ausgeblendet: Ziehen übergeht es, die Karte zeigt es nicht, und ein
  Bereich ohne sichtbares Feld fehlt auf der Karte ganz. Der Log zeigt alte Einträge daraus weiter.
  Mindestens ein Feld hat einen Eintrag, der nicht ausgeblendet ist.
- **Wurffelder der Karte.** Neben den Feldern mit Einträgen hat jede Karte drei Wurffelder, wie die
  GMA2e-Karte. Sie ziehen keinen Eintrag aus einer Liste, sondern würfeln einen Wert; deshalb sind
  sie keine `Slot`s, haben keine Einträge und werden nie ausgeblendet. Die Werte und die Gewichte
  sind eigene, nicht die der GMA2e-Karten.
  - **Glockenzahl** (`bell`): 1 bis 10 mit diesen Gewichten (von 200): 1 · 6 · 16 · 30 · 47 · 47 ·
    30 · 16 · 6 · 1. Also 4–7 in 77 % der Fälle, 1 und 10 je 0,5 %. Gedacht für zwischendurch:
    Reaktion eines NSC (1 sehr freundlich, 10 feindselig), Spannung, wie schwer etwas ist.
  - **Streuwürfel** (`scatter`): jeder der zehn Werte gleich wahrscheinlich (10 %): die acht
    Richtungen, Volltreffer und Fehlschlag. Norden ist oben, wie auf der Sektorkarte.
  - **Kartensymbol** (`map`): ein Raum, von oben gesehen, mit sechs Richtungen: Norden, Osten,
    Süden, Westen auf der Ebene, dazu oben und unten (Treppe, Schacht, Leiter, Lift). Je Richtung
    eine Wegart:

    | Wegart | Code | N, O, S, W (von 20) | Oben, unten (von 20) | Als Ortskarte | Als Beziehungskarte |
    |---|---|---|---|---|---|
    | Kein Weg | `none` | 7 | 15 | Kein Weg in diese Richtung | Keine Beziehung |
    | Weg | `path` | 7 | 2 | Klarer Weg | Neutrale oder gute Verbindung |
    | Sackgasse | `deadEnd` | 2 | 1 | Weg endet bald | Scheinbar gute Option, beendete Beziehung |
    | Verborgen | `hidden` | 2 | 1 | Geheimgang | Versteckte Möglichkeit oder Beziehung |
    | Hindernis | `obstacle` | 2 | 1 | Versperrt, bewacht | Option mit Hürden, angespannte Beziehung |

    Ein Kartensymbol hat mindestens zwei Richtungen mit einer Wegart außer *kein Weg*; hat es
    weniger, wird es ganz neu gewürfelt.
  - Ziehen würfelt alle drei, *Neu ziehen* ebenso. Die Wurffelder stehen auf der Karte unter den
    Sinneseindrücken, wo bisher die Namen standen, in der Reihenfolge Glockenzahl, Streuwürfel,
    Kartensymbol (auf der Karte knapp „Wege“ beschriftet). In der Reihenfolge der Karte (für den Log) kommen sie vor allen Feldern.
  - Damit die ganze Karte weiter auf einen Bildschirm passt, fallen auf der Tafel *Handlung* die
    Mythic-Tabellen *Gegenstand* (`plot.object`) und *Fund* (`plot.salvage`) weg: Ihre Einträge
    werden ausgeblendet (siehe *Einträge austauschen*), alte Logeinträge zeigen sie weiter. Die
    Tafel *Handlung* hat danach eine Reihe: Wendung, Stimmung, Botschaft.
  - Antippen nimmt ein Wurffeld in die Auswahl (`pickedRolls`) auf oder wieder heraus, wie ein Feld.
    *Bestätigen* geht, sobald ein Feld oder ein Wurffeld ausgewählt ist. Der `CardPick` hält den Wert
    jedes ausgewählten Wurffelds selbst (`bell`, `scatter`, `map`), weil es nichts gibt, worauf er
    verweisen könnte; nicht ausgewählte bleiben leer. Ein `CardPick` hat also mindestens einen
    `PickedItem` oder einen Wert eines Wurffelds. Ältere `CardPick`s ohne Wurffelder bleiben gültig.
  - Im Log stehen die Wurffelder vor den ausgewählten Feldern, in derselben Reihenfolge wie auf der
    Karte, mit Bild: Glockenzahl als Zahl, Streuwürfel als Windrose mit Pfeil, Kartensymbol als
    Raum mit seinen Wegen. Wie sie gezeichnet werden, ist Sache der Anzeige (siehe UI-Entwurf).

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
- **Notiz zur Welt.** Eine fertige Welt (mit Namen, nicht leer) kann eine Notiz haben (`note`):
  freier Text, auch über mehrere Zeilen. Anders als ein Logeintrag lässt sie sich jederzeit ändern,
  wie die Notiz eines Charakters; Leerraum am Rand fällt weg, eine leere Notiz gibt es nicht (dann
  fehlt das Feld). Eine Welt in Erschaffung und ein leeres Feld haben keine Notiz. Die Weltkarte
  zeigt die Notiz unter der Oberfläche zum Bearbeiten; die Liste der Welten im Sektor zeigt ihre
  erste Zeile.
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
- **Später**, nicht in diesem Schritt: der Rand der habitablen Zone beim Temperaturwurf, Reisezonen (Amber, Red), Verbindungen
  (communications routes), Subsector Capital, ein Name für den Subsektor, mehrere Subsektoren zu
  einem Sektor und eine fertige Welt wieder löschen.

## Wo der Code noch nicht folgt

Der Code für Version 1 liegt unter `src/` (siehe [ARCHITECTURE.md](../ARCHITECTURE.md)). Er folgt dem
Diagramm mit diesen Ausnahmen:

- **`Gain` in den Daten.** Im Bild bringt eine Zeile ein Attribut über einen Verweis (`changes`);
  in `src/data/services.json` steht das Attribut als Feld `characteristic` neben `change`, weil
  `Characteristic` eine Werteliste ist. Ebenso stehen die DMs eines `Throw` als `characteristic`,
  `atLeast`, `dm`. In `src/data/weapons.json` stehen die DMs einer Waffe (`vsArmor`, `atRange`) knapp
  als Liste in der Reihenfolge der Matrix, „no“ als `null`; das Schema macht daraus beim Laden
  `ArmorDm` bzw. `RangeDm` mit Rüstungsklasse bzw. Reichweite, wie im Bild.
- **`Note → LogEntry : interprets`** ist im Code die Stelle des gedeuteten Ergebnisses im Log (eine
  Zahl), weil Logeinträge keine eigene Id haben. Löschen rückt die Stellen nach, sodass jede Deutung
  weiter auf ihr Ergebnis zeigt; damit ist der Verweis erfüllt. Ebenso ist **`DamageRoll →
  AttackResult : of`** die Stelle des Treffers im Log.
- **`Card → Campaign : in`, `Task → Campaign : in` und `Attack → Campaign : in`** sind im Code
  kein Feld. Der Controller hält höchstens eine offene Karte, höchstens eine Probe und höchstens
  einen Angriff, alle immer zur offenen Kampagne; beim Wechsel der Kampagne verfallen sie. Damit ist die Multiplizität erfüllt.
- **Beispielcharaktere.** Die allererste Kampagne auf einem Gerät beginnt mit Kira Vant und Jonas
  Reyl aus der README (`src/data/examples.json`), damit man gleich etwas ausprobieren kann. Das
  Modell sagt dazu nichts; die beiden lassen sich löschen, solange der Log nicht auf sie verweist.
  Jede weitere Kampagne beginnt leer.
