# Verlauf der Freigaben

Was am [Domänenmodell](../domain-model.md) wann freigegeben wurde, in der Reihenfolge, in der es
beschlossen wurde. Das ist Nachweis, keine geltende Regel: Was gilt, steht im Bild und in den
Regeln der Bereiche. Die Bedienung, die hier noch vorkommt, ist die von damals.

> **Stand: Freigegeben für Version 1** (23. Oktober 2026). Änderungen nur noch auf dem oben
> beschriebenen Weg: erst hier, abgestimmt, dann im Code. Seitdem freigegeben: `Entry.retired`
> (24. Oktober 2026, siehe [Einträge austauschen](karte.md#einträge-austauschen)); ausgeblendete Felder und Bereiche (ebenso);
> Spalten und Paare (24. Oktober 2026, siehe [Karte ziehen](karte.md#karte-ziehen), [Paare aus Mythic](karte.md#paare-aus-mythic)).
> Am 25. Oktober 2026 freigegeben: mehrere Kampagnen mit Namen, Export und Import als Datei,
> Logeinträge löschen (siehe [Mehrere Kampagnen](kampagne.md#mehrere-kampagnen), [Kampagnendatei](kampagne.md#kampagnendatei), *Der Log verweist, er kopiert
> nicht*), dafür ändert sich das Bild nicht: `Campaign` war schon die oberste Ebene und hat schon
> einen Namen. Neu im Bild: `Character.dead` (siehe [Tot](charakter.md#tot)).
>
> Ebenfalls am 25. Oktober 2026 freigegeben: Jack-of-all-Trades zählt in Proben als Stufe 0 und
> ersetzt „ohne Fertigkeit“ (siehe [Probe](probe.md#probe)); das Bild ändert sich dadurch nicht. Am 27. Oktober 2026
> ergänzt: Jack-of-all-Trades zeigt keine Stufe, und ein zweites JoT in der Erschaffung gibt einen
> weiteren Fertigkeitswurf (siehe *Zugewinne*); auch das ändert das Bild nicht.
>
> Ebenfalls am 25. Oktober 2026 freigegeben: Charaktererschaffung nach den Regeln von Classic
> Traveller, mit Lebenslauf am Charakter (siehe [Charaktererschaffung](erschaffung.md#charaktererschaffung)), und Gegenstände mit Besitz
> (siehe [Gegenstände](shop.md#gegenstände)).
> Neu im Bild: `Generation`, `Career`, `CareerRoll`, `Character.career`, Gegenstände
> (`Item`, `Possession`, siehe [Gegenstände](shop.md#gegenstände)) und die Laufbahnen als Referenzdaten (`Service`,
> `Throw`, `Rank`, `Table`, `Gain`, `Cascade`, `Aging`).
>
> Am 27. Oktober 2026 freigegeben: Namen auf der Karte als Paar aus Vor- und Nachname (siehe
> *Namen*); das Bild ändert sich dadurch nicht.
>
> Am 31. Oktober 2026 freigegeben: der Subsektor mit Weltenerschaffung (siehe [Subsektor](sektor.md#subsektor) und
> [Weltenerschaffung](sektor.md#weltenerschaffung)).
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
> (`/for`). Der UI-Entwurf dazu liegt unter [`ui-entwurf/charakter-leiste/`](../ui-entwurf/charakter-leiste/).
>
> Am 2. November 2026 freigegeben: die Temperatur als zusätzlicher Wurf der
> Weltenerschaffung nach Mongoose Traveller 2e, nach der Atmosphäre und vor der Hydrographie, die
> bei heißen Welten einen Malus bekommt (siehe [Weltenerschaffung](sektor.md#weltenerschaffung), Schritt 4 und 5). Neu im Bild:
> `Hex.temperature`, `WorldRollKind.temperature`, `UwpDigit.temperatureDm` und als Referenzdaten
> `Temperature` mit `hydroDm`.
>
> Ebenfalls am 2. November 2026 freigegeben: die **Oberfläche** einer Welt nach dem
> *World Builder's Handbook* (DGP), als Vorarbeit für eine spätere Oberflächenkarte (siehe
> *Weltenerschaffung*, Schritt 6, und *Oberfläche*). Neu im Bild: `Surface` am `Hex`, der Schritt
> `surface` und als Referenzdaten `SurfaceRow` mit `SurfaceTable` und `DiceExpr`.
> Nach einer Probe mit 20.000 Welten ergänzt (ebenfalls 2. November 2026 freigegeben): höchstens
> 6 große Kontinente, und die Weltkarte nennt „nur Archipele“ bzw. „nur Seen“ ohne die große
> Zahl (siehe [Oberfläche](oberflaeche.md#oberfläche)). Das Bild ändert sich dadurch nicht.
>
> Am 3. November 2026 freigegeben: Deutungen und Notizen im Log (siehe [Deutungen und Notizen](karte.md#deutungen-und-notizen)).
> Neu im Bild: `Note` mit `text` und dem Verweis `interprets`. Der UI-Entwurf dazu liegt unter
> [`ui-entwurf/deutung/`](../ui-entwurf/deutung/).
>
> Ebenfalls am 3. November 2026 auf ausdrücklichen Wunsch des Owners freigegeben: Deutungen und
> Notizen auch in der Charaktererschaffung (siehe [Deutungen und Notizen](karte.md#deutungen-und-notizen)) und eine Notiz zu jeder
> fertigen Welt (siehe [Notiz zur Welt](sektor.md#notiz-zur-welt)). Neu im Bild: `Hex.note`.
>
> Ebenfalls am 3. November 2026 freigegeben: drei **Wurffelder** auf der Karte nach dem GMA2e:
> die **Glockenzahl** (1–10, meist 4–7), der **Streuwürfel** (8 Richtungen, Volltreffer,
> Fehlschlag) und das **Kartensymbol** (ein Raum mit Wegen nach N, O, S, W und nach oben und
> unten, je Weg eine Wegart); siehe [Wurffelder der Karte](karte.md#wurffelder-der-karte). Neu im Bild: `Card.bell`,
> `Card.scatter`, `Card.pickedRolls`, `Card.map`, `CardPick.bell`, `CardPick.scatter`,
> `CardPick.map`, die Werte `MapIcon`, `PathKind`, `Scatter`, `CardRoll`; ein `CardPick` braucht
> keinen `PickedItem` mehr (`items` jetzt `*`). Dazu die **Namen auf der Tafel NSC** (sechs Felder,
> je weiblich, männlich und neutral, einmal irdisch und einmal spacig; siehe [Namen](karte.md#namen)) und **Name
> von der Karte** beim Benennen von Charakteren und Welten (siehe dort); dafür ändert sich das Bild
> nicht. Damit alles auf einen Bildschirm passt, fallen auf der Tafel *Handlung* *Gegenstand* und
> *Fund* weg (ausgeblendet). Der UI-Entwurf dazu liegt unter
> [`ui-entwurf/kartensymbol/`](../ui-entwurf/kartensymbol/).
>
> Ebenfalls am 3. November 2026 freigegeben: der **Angriff** im neuen Bereich *Kampf* (siehe
> *Waffen*, *Angriff* und *Schaden*). Neu im Bild: als Referenzdaten `Weapon` mit `ArmorDm` und
> `RangeDm`, die Werte `AttackKind`, `ArmorClass` und `Range`, `Item.weapon`; `Item.uses` ist jetzt
> abgeleitet (`/uses`, aus der Waffe). Am Charakter die Waffe in der Hand (`Character.wields`),
> flüchtig der Angriff in Vorbereitung (`Attack`), im Log das Angriffsergebnis (`AttackResult`)
> und der Schadenswurf (`DamageRoll`).
>
> Ebenfalls am 3. November 2026 auf ausdrücklichen Wunsch des Owners freigegeben: Die Begegnung hält
> die Würfel ihrer Reaktion (`reactionDice`), damit die App sie zeigen kann; nach dem Würfeln zeigt
> sie, wer kommt (siehe [Begegnung](begegnung.md#begegnung)).
>
> Ebenfalls am 3. November 2026 freigegeben: **Kampfsimulation** getrennt von der
> **Waffentabelle** (siehe [Begegnungsarten und zwei Modi im Kampf](kampf.md#begegnungsarten-und-zwei-modi-im-kampf) und [Kampfsimulation](kampf.md#kampfsimulation)). Neu im Bild: an der
> `Encounter` Entfernung (`rangeDice`, `range`, `terrain`), Überraschung (`pcSurprise`,
> `npcSurprise`, `/surprise`, `/first`), Runde und Zug (`round`, `acted`, `/turn`); `Side`,
> `SurpriseRoll`, als Referenzdaten `Terrain`, `EncounterRange` und `EncounterType.military`.
>
> Ebenfalls am 3. November 2026 freigegeben: **Heilung** (siehe [Heilung](kampf.md#heilung)). Neu im Bild:
> der Logeintrag `Recovery` mit `RecoveryKind` (Aufwachen, Behandlung, Ruhe), Patient (`for` bzw.
> `npc`) und Behandelnder (`by`).
>
> Ebenfalls am 3. November 2026 freigegeben: **Begegnungen mit NSC, Angriffe in beide Richtungen
> und Wunden** (siehe [Begegnung](begegnung.md#begegnung), [NSC](begegnung.md#nsc), [Wunden](kampf.md#wunden), [Getragene Rüstung](kampf.md#getragene-rüstung)). Neu im Bild:
> `Encounter`, `Npc`, `Wounds`, `WoundState`, als Referenzdaten `EncounterType`, flüchtig
> `Wounding`; `Character.npc`, `Character.wears`, `Character./wounds`, `Character./state`,
> `Item.armor`, `DamageRoll.to`; der Angriff kennt Angreifer und Ziel als SC oder NSC (`for`/`by`,
> `against`/`victim`).
>
> Ebenfalls am 3. November 2026 freigegeben: **Verkaufen** im Shop (siehe [Shop](shop.md#shop)). Neu im Bild: die Buchungsart `sale` und der Verweis `Booking.sold`.
>
> Ebenfalls am 3. November 2026 freigegeben: **Aufenthaltsort, Gruppenkasse, Shop und Munition**
> (siehe dort), mit dem neuen Bereich *Shop*. Neu im Bild: `Campaign.location`, `Campaign./funds`, `Booking` mit
> `BookingKind`, `Hex./offer`, `Possession.rounds` und an der Waffe `rounds`, `law` und `ammo`.
>
> **Zurzeit** hat die Karte nur die Felder mit Einträgen aus Mythic und die Namen, alle als Paar: Aktion und
> Beschreibung des Zufallsereignisses, Hören und Riechen, dazu die drei Wurffelder sowie die Themen-Tafeln NSC
> (mit den sechs Namen), NSC-Aktionen, Welt (mit Schiff), Wesen und Handlung mit Mythics Elements-Tabellen. Alle übrigen Felder und Bereiche sind ausgeblendet, bis es
> Einträge für sie gibt.

> Am 4. November 2026 freigegeben: **Primär- und Sekundärwaffe** (siehe
> dort, *Waffe in der Hand*, *Kauf einer Waffe*), damit die Charakterleiste im Kampf kompakt wird (siehe
> *Angriff*). Neu im Bild: `Character.primary` und `Character.secondary`. Der UI-Entwurf dazu
> liegt unter [`ui-entwurf/waffen-leiste/`](../ui-entwurf/waffen-leiste/).
>
> Am 4. November 2026 freigegeben: die **Entfernung in Range Bands** (siehe
> *Kampfsimulation*). Neu im Bild: an der `Encounter` statt `range` das Band (`band`), die Berührung
> (`close`), der Würfel für das Startband (`bandDie`), abgeleitet die Reichweite (`/range`) und
> `/escaped`; als Referenzdaten `RangeBand`. Der UI-Entwurf dazu (freigegeben am 4. November 2026)
> liegt unter [`ui-entwurf/range-bands/`](../ui-entwurf/range-bands/).
>
> Am 6. November 2026 freigegeben: der **Würfel für die Anzahl** einer
> Begegnung, W6 nach den Regeln oder W4 bzw. W3 zum Ausgleichen, statt einer festen Anzahl; dazu der
> **DM +1 auf die Reaktion** für 5 oder mehr Terms in Army, Navy, Scouts oder Marines (siehe
> *Begegnung*). Neu im Bild: `Campaign.quantityDie`, `Encounter.quantityDie` und
> `Encounter.reactionDm`. Dazu begrenzt die Reaktion wie in der Quelle auf 3 bis 12 statt 3 bis 11.
> Der Ausschnitt dazu liegt unter
> [`changes/2026-11-06-wuerfel-der-anzahl.png`](../changes/2026-11-06-wuerfel-der-anzahl.png).
>
> Am 7. November 2026 freigegeben: **Überraschung bis zum Alarm, Ausdauer (mit Laufen) und Parade**
> nach dem Regelheft (SR 20–22; siehe [Kampfsimulation](kampf.md#kampfsimulation), [Ausdauer](kampf.md#ausdauer), [Parade](kampf.md#parade)). Im Bild:
> `Encounter.alarm` und `/surprising`, `Encounter.pcRuns` und `npcRuns`, `DamageRoll.alarmDice`, `AttackResult.strike` mit `Strike`,
> `Attack.weakened`, `Weapon.weakened` und `/blows` an `Character` und `Npc`. Der Ausschnitt dazu
> liegt unter
> [`changes/2026-11-07-ueberraschung-ausdauer-parade.png`](../changes/2026-11-07-ueberraschung-ausdauer-parade.png).
>
> Am 12. November 2026 freigegeben: der **Patron** (Kennzeichen 2026-11-12; siehe [Patron](begegnung.md#patron)). Im
> Bereich Begegnung würfelt man in einem eigenen kleinen Bereich unter dem für NSC-Begegnungen einen
> Patron nach der Patron Encounters Matrix (SE, Charts S. 20). Neu im Bild: der Logeintrag
> `PatronRoll` und als Referenzdaten `Patron`. Der Ausschnitt dazu liegt unter
> [`changes/2026-11-12-patron.png`](../changes/2026-11-12-patron.png).
>
> Ebenfalls am 12. November 2026 freigegeben: das **Gerücht** (Kennzeichen 2026-11-12b; siehe
> *Gerücht*, *Test*), eine weitere Begegnungsart im Bereich Begegnung: der Wurf auf die Rumors Matrix
> (SE, Charts S. 21). Neu im Bild: der Logeintrag `RumorRoll` und als Referenzdaten `Rumor`. Der
> Ausschnitt dazu liegt unter [`changes/2026-11-12-geruecht.png`](../changes/2026-11-12-geruecht.png).
> Dazu, ohne Änderung am Bild: der **Test** vor jeder Begegnungsart und die Liste des Patrons per
> Würfel.
>
> Ebenfalls am 13. November 2026 freigegeben: die **Beute** (Kennzeichen 2026-11-13; siehe [Beute](begegnung.md#beute)):
> Überlebensausrüstung und Kredite der NSC, Beute nehmen, zerstörte Tiere, Ausweiden mit Fleisch und
> Fell als Jagdbeute, Preise aus Marktwurf und DMs. Neu im Bild: der Logeintrag `Butchering`,
> `EncounterType.credits`, `Terrain.huntDm`, `AnimalRow.market`, `edible`, `/furValue`, `/meatValue`,
> `WoundState.destroyed`, `ItemKind.game` und `Possession.from`. Der Ausschnitt dazu liegt unter
> [`changes/2026-11-13-beute.png`](../changes/2026-11-13-beute.png).
>
> Am 13. November 2026 freigegeben: die **Tiere** (Kennzeichen 2026-11-12c; siehe [Tiere](begegnung.md#tiere),
> [Gelände](begegnung.md#gelände)): Tiertabellen je Welt und Gelände, bei Bedarf erzeugt; die Tierbegegnung würfelt auf
> ihnen und wird eine Begegnung mit Kampfsimulation, mit besonderen Angriffen, Geschwindigkeit und
> Ereignissen mit Rettungswurf. Ein Gelände für alle Begegnungsarten, gespeichert an der Kampagne.
> Neu im Bild: `AnimalTable`, `AnimalRow`, `AnimalAttack`, `AnimalTrait`, `AnimalCategory`,
> `AnimalSpecial`, `Behavior`, die Logeinträge `EventResult` und `SaveRoll`, als Referenzdaten
> `AnimalType`, `AnimalTypeRow`, `AnimalTraitRow`, `AnimalSizeRow`, `AnimalEvent`; dazu
> `Campaign.terrain`, `Terrain.typeDm`, `sizeDm`, `traits`, `/animals`, `Hex.animals`,
> `Character.animal` und `/hurt`, `Encounter.animal`, `tableDice`, `attackDice`, `fleeDice`,
> `lureDice`, `/behavior`, `Distance.trapDice`, `held`, `struggles`, `DamageRoll.fixed` und `after`.
> `Encounter.of`, `reaction`, `reactionDice`, `DamageRoll.dice` und `DamageRoll.of` dürfen fehlen.
> Der Ausschnitt dazu liegt unter [`changes/2026-11-12-tiere.png`](../changes/2026-11-12-tiere.png).
>
> Am 8. November 2026 freigegeben: **NSC der Begegnung als vollständige Charaktere** (Kennzeichen
> 2026-11-08c; siehe [Begegnung](begegnung.md#begegnung), [NSC](begegnung.md#nsc), [Angriff in beide Richtungen](kampf.md#angriff-in-beide-richtungen), [Heilung](kampf.md#heilung)). Es gibt nur noch
> eine Klasse für alle, die kämpfen: Die NSC einer Begegnung werden beim Würfeln als vollständige
> `Character` erzeugt (UPP, Fertigkeit als echte Stufe, Waffe und Rüstung im Besitz, Primärwaffe,
> Waffe in der Hand, getragene Rüstung) und hängen an der Begegnung (`Encounter.npcs`), nicht an der
> Kampagne. Im Bild: `Npc` entfällt mit allen Pfeilen; neu `Encounter.npcs`, `leader`, `acted` und `/turn` als
> Verweise auf `Character`; Angriff und Angriffsergebnis verweisen nur noch auf Angreifer (`for`,
> immer einer) und Ziel (`against`) statt auf vier Arten; die Heilung nur noch auf einen Charakter
> (`for`); `became` entfällt, Übernehmen heißt Umhängen. NSC zählen jetzt Munition wie SC (geladen
> und 1W4 Magazine); dafür ändert sich das Bild nicht. Der Ausschnitt dazu liegt unter
> [`changes/2026-11-08-nsc-als-charaktere.png`](../changes/2026-11-08-nsc-als-charaktere.png).
>
> Am 8. November 2026 freigegeben (Kennzeichen 2026-11-08d), mit dem UI-Entwurf unter
> [`ui-entwurf/entfernung-je-sc/`](../ui-entwurf/entfernung-je-sc/): **Entfernung je SC, NSC als Gruppe,
> Ausweichen** nach SR 20 (siehe [Kampfsimulation](kampf.md#kampfsimulation), *Range Bands*, *Bewegen*, *Ausweichen*). Jeder SC
> hat seine eigene Entfernung zur NSC-Gruppe und bewegt sich in seinem Zug für sich; die NSC bleiben
> zusammen als fester Bezugspunkt auf Band 0, bewegt werden nur die SC: Ein Schritt der Gruppe
> verschiebt alle SC zugleich um ein Band. Wer am Zug
> ist, kann statt anzugreifen ausweichen. Im Bild: neu `Distance` (je SC `band`, `close`, `moved`,
> `runs`, `/range`, `/escaped`) mit `Encounter.distances` und `Distance.of`, neu `Encounter.evading`;
> an der `Encounter` werden `band` und `close` zum Startband (`startBand`, `startClose`), und
> `/range`, `/escaped`, `pcMoved` und `pcRuns` entfallen. Der Ausschnitt dazu liegt unter
> [`changes/2026-11-08-abstand-je-sc.png`](../changes/2026-11-08-abstand-je-sc.png).
>
> Am 8. November 2026 freigegeben: **Überraschung als erster Wurf im Kampf** (siehe
> *Kampfsimulation*, *Überraschung*). Sie wird nicht mehr beim Anlegen der Begegnung gewürfelt,
> sondern zu Beginn des Kampfs, als eigener Wurf mit zwei Würfeln (SC weiß, NSC schwarz) und ihren
> DMs. Im Bild: `pcSurprise` und `npcSurprise` sind `0..1` (fehlen, bis gewürfelt ist). Der
> Ausschnitt dazu liegt unter
> [`changes/2026-11-08-ueberraschung-als-erster-wurf.png`](../changes/2026-11-08-ueberraschung-als-erster-wurf.png).
>
> Am 8. November 2026 auf ausdrücklichen Wunsch des Owners freigegeben: zwei Korrekturen nach dem
> Regelheft und der Errata zu *The Traveller Book* (siehe [Angriff in beide Richtungen](kampf.md#angriff-in-beide-richtungen) und
> [Wunden](kampf.md#wunden)): Im laufenden Kampf zählen für die DMs STR und DEX ohne dessen Wunden, und die Regel für
> den ersten Treffer gilt in jeder Begegnung neu. Das Bild ändert sich dadurch nicht.
>
> Am 8. November 2026 auf ausdrücklichen Wunsch des Owners freigegeben: Nach dem **Laufen** zieht
> die Partei von selbst weiter (siehe [Kampfsimulation](kampf.md#kampfsimulation), *Bewegen*): Ihre Kämpfer setzen aus, ein
> NSC mit leerer Waffe und Magazin lädt nach; nur ein SC, der nachladen könnte, bleibt am Zug. Das
> Bild ändert sich dadurch nicht.
>
> Am 7. November 2026 auf ausdrücklichen Wunsch des Owners freigegeben: die **Ausrüstung der NSC**
> nach SR 50 (siehe [Begegnung](begegnung.md#begegnung)): Ein Anführer trägt immer eine Schusswaffe und Rüstung, Combat Armor
> und Battle Dress tragen nur Soldaten und Anführer. Das Bild ändert sich dadurch nicht.
>
> Am 7. November 2026 freigegeben: der **Überlauf der Wunden** nach SR 21 (siehe
> *Wunden*). Was über 0 hinausgeht, verfällt nicht mehr, sondern geht auf die anderen Attribute
> über, bei jedem Treffer. Im Bild: `DamageRoll.to` hält nicht mehr ein Attribut je Würfel, sondern
> je **Block** (`to`, dazu die Punkte `points`); `Wounding.to` ebenso. Der Ausschnitt dazu liegt unter
> [`changes/2026-11-07-ueberlauf-der-wunden.png`](../changes/2026-11-07-ueberlauf-der-wunden.png).

> Am 7. November 2026 freigegeben: **Flächenschaden** mit Feuerstoß (Automatic Rifle,
> Submachinegun) und Schrotflinte (siehe [Feuerstoß und Schrot](kampf.md#feuerstoß-und-schrot)); beim Feuerstoß treffen die
> Nachbarn darüber und darunter in der Liste, die Schrotflinte lost sie aus. Neu im Bild:
> an der Waffe `burst`, `neighbours` und der Verweis `single`; am Angriff in Vorbereitung `burst`;
> am Angriffsergebnis der Verweis `volley` und abgeleitet `/neighbour`. Der Ausschnitt dazu liegt
> unter [`changes/2026-11-07-flaechenschaden.png`](../changes/2026-11-07-flaechenschaden.png).
>
> Ebenfalls am 7. November 2026 auf ausdrücklichen Wunsch des Owners freigegeben, nach seinen
> Antworten: **Bewegung nach den Regeln**, je Partei und Runde 1 Band gehend oder 2 laufend, Laufen
> statt Angriff; langes Drücken auf die Entfernung setzt sie frei (siehe [Kampfsimulation](kampf.md#kampfsimulation),
> *Bewegen*). Dazu tragen die Beispiel-Charaktere ihre Rüstung, und nach dem Kauf einer Rüstung
> fragt die App, ob man sie anlegt (siehe [Getragene Rüstung](kampf.md#getragene-rüstung), [Kauf einer Rüstung](shop.md#kauf-einer-rüstung)). Neu im Bild:
> `Encounter.pcMoved` und `Encounter.npcMoved`. Der Ausschnitt dazu liegt unter
> [`changes/2026-11-07-bewegung-und-ruestung.png`](../changes/2026-11-07-bewegung-und-ruestung.png).
>
> Am 13. November 2026 freigegeben, nach den Antworten des Owners:
> **Gruppengepäck** (siehe [Gruppengepäck und Traglast](shop.md#gruppengepäck-und-traglast)). Die Gegenstände der SC liegen im Gepäck
> der Gruppe; am SC bleibt nur, was er ausgerüstet hat (Primärwaffe, Sekundärwaffe, Rüstung). Die
> Traglast ist die Summe der STR der lebenden SC; ist das Gepäck schwerer, sind alle SC belastet
> (Hausregel). Im Shop rüstet der gewählte SC eine gekaufte Waffe oder Rüstung gleich aus, was er
> vorher hatte, kommt ins Gepäck. Neu im Bild: `Campaign.stash`, `Campaign./load`,
> `Campaign./capacity`, `Campaign./burden`; entfallen: `Butchering.for` (die Jagdbeute geht ins
> Gepäck). Der Ausschnitt dazu liegt unter
> [`changes/2026-11-13-gruppengepaeck.png`](../changes/2026-11-13-gruppengepaeck.png).
>
> Am 13. November 2026 freigegeben: **Abgleich mit OneDrive** (siehe *Abgleich mit
> OneDrive*). Nach den Antworten des Owners: automatisch, im App-Ordner, bei einem Konflikt fragt
> die App, auf Wunsch bleiben beide Stände. Neu im Bild: `Campaign.key`, `Campaign.changedAt` und der flüchtige `Conflict`. Der
> Ausschnitt dazu liegt unter
> [`changes/2026-11-13-abgleich-onedrive.png`](../changes/2026-11-13-abgleich-onedrive.png).

> Am 13. November 2026 freigegeben (Kennzeichen 2026-11-13d): **Zeit und Reisen** (siehe [Spielzeit](reise.md#spielzeit), *Zeit
> vergehen lassen*, [Test](begegnung.md#test), [Reise](reise.md#reise), [Low Passage](reise.md#low-passage), [Low Lottery](reise.md#low-lottery)). Nach den Antworten des Owners:
> Imperialer Kalender mit Wochentagen, „Woche beenden“ springt zum nächsten Sonntag; Reise mit
> High, Middle oder Low Passage bis Sprung 2, immer eine Woche; Low Lottery mit 1W6 NSC; Zeit und
> Begegnungen getrennt, aber die Tests stehen im Log, damit die Knöpfe zählen können. Neu im Bild:
> `Campaign.day`, `/date`, `/weekday`, `LogEntry.day`, die Logeinträge `TimePassed`, `CheckRoll`
> (mit `CheckKind`, auch dem neuen Test **Polizei** `legal`) und `Journey` (mit `Passenger` und `LowBerth`), die Buchungsart `lottery` und
> der Verweis `Booking.won`. Der Ausschnitt dazu liegt unter
> [`changes/2026-11-13-zeit-und-reisen.png`](../changes/2026-11-13-zeit-und-reisen.png).

> Am 14. November 2026 freigegeben (Kennzeichen 2026-11-14): **NSC am Ort** (siehe *Patron als NSC*, *Ort
> eines NSC*, *Bereich NSC*). Zu einem gewürfelten Patron entsteht auf Knopfdruck ein zufälliger
> dauerhafter NSC; jeder dauerhafte NSC hat eine Welt, auf der er lebt, und ein eigener Bereich
> **NSC** zeigt die NSC des Aufenthaltsorts, nach Rolle gruppiert. Neu im Bild: das Feld
> `Character.role` mit der Werteliste `NpcRole`, die Verweise `Character.place` (auf `Hex`) und
> `Character.patron` (auf `Patron`), als Referenzdaten Fertigkeiten und Ausrüstung je Patron
> (`Patron.skills` mit `PatronSkill`, `Patron.gear`; Inhalt als Hausregel in
> [`patron-nsc.md`](../patron-nsc.md); feste Werte als Startpunkt, später ein richtiger NSC-Generator). Der Ausschnitt dazu liegt unter
> [`changes/2026-11-14-nsc-am-ort.png`](../changes/2026-11-14-nsc-am-ort.png).

> Am 14. November 2026 freigegeben (Kennzeichen 2026-11-14b): **Patron-NSC mit Laufbahn** (siehe *Patron als
> NSC*). Statt fester Fertigkeiten und Ausrüstung je Beruf verweist jeder Patron auf eine Laufbahn
> (`Patron.career`), und der Patron-NSC entsteht durch eine zufällig durchlaufene
> Charaktererschaffung in dieser Laufbahn. Im Bild entfallen `PatronSkill`, `Patron.skills` und
> `Patron.gear`; neu ist `Patron → Service : career`. Die Zuordnung der Patrons zu den sechs
> Laufbahnen steht in [`patron-nsc.md`](../patron-nsc.md). Der Ausschnitt dazu liegt unter
> [`changes/2026-11-14-patron-mit-laufbahn.png`](../changes/2026-11-14-patron-mit-laufbahn.png).

> Am 14. November 2026 freigegeben (Kennzeichen 2026-11-14c): **NSC aus einer Laufbahn und Waffen
> erzeugter NSC** (siehe *NSC aus einer Laufbahn*, *Waffen erzeugter NSC*). Neu im Bild:
> `Weapon.minSoc` und `Patron.criminal`. Der Ausschnitt dazu liegt unter
> [`changes/2026-11-14-nsc-aus-laufbahn-und-waffen.png`](../changes/2026-11-14-nsc-aus-laufbahn-und-waffen.png).

> Am 14. November 2026 freigegeben (Kennzeichen 2026-11-14d): **Orakel auf der Karte** (siehe *Orakel auf
> der Karte*). Die Inspirationskarte trägt die Antwort für alle drei Stufen, mit Ja!, Ja?, Nein?
> und Nein!; den Knopf „Ja/Nein“ gibt es nicht mehr, die Antwort steht in der Kartenauswahl. Neu
> im Bild: `Card.oracle`, `Card → Odds : pickedOdds`, `Answer`, `CardPick.oracle`, `.chance`,
> `./answer` und `CardPick → Odds : odds`; `OracleAnswer` entfällt. Der Ausschnitt dazu
> liegt unter [`changes/2026-11-14-orakel-auf-der-karte.png`](../changes/2026-11-14-orakel-auf-der-karte.png).

> Am 14. November 2026 freigegeben (Kennzeichen 2026-11-14e): **Notiz und Deutung ändern** (siehe *Deutungen
> und Notizen*). Neu im Bild: `Note.editedAt`. Der Ausschnitt dazu liegt unter
> [`changes/2026-11-14-notiz-aendern.png`](../changes/2026-11-14-notiz-aendern.png).

> Am 14. November 2026 freigegeben (Kennzeichen 2026-11-14f): **Zufallsereignis** (siehe [Zufallsereignis](karte.md#zufallsereignis)).
> Neu im Bild: `EventFocus` (Referenzdaten), `Card.eventFocus`, `CardPick.eventFocus`,
> `/randomEvent` und `/focus`. Der Ausschnitt dazu liegt unter
> [`changes/2026-11-14-zufallsereignis.png`](../changes/2026-11-14-zufallsereignis.png).

> Am 14. November 2026 freigegeben (Kennzeichen 2026-11-14g): **Kampf mit dauerhaften NSC** (siehe [Begegnung](begegnung.md#begegnung),
> *Dazugenommene NSC*). Nach den Antworten des Owners: In der Karte Zufallsbegegnung nimmt man vor
> dem Würfeln dauerhafte NSC vom Aufenthaltsort dazu, z. B. Tenzin und dazu 1W6 Polizisten; sie
> kämpfen immer auf der Seite der NSC, und der erste von ihnen ist der Anführer. Neu im Bild nur der
> Verweis `Encounter.joined` (geordnet) auf `Character`; die dazugenommenen NSC bleiben in der
> Kampagne, die Begegnung verweist nur auf sie. Der Ausschnitt dazu liegt unter
> [`changes/2026-11-14-kampf-mit-dauerhaften-nsc.png`](../changes/2026-11-14-kampf-mit-dauerhaften-nsc.png).
> Am 14. November 2026 freigegeben (Kennzeichen 2026-11-14i): die **Oberflächenkarte** einer Welt
> mit Gelände, Flüssen, Straßen, Vulkanen und Städten, gezeigt als drehbarer Globus (siehe
> *Oberflächenkarte*). Neu im Bild: `Hex.populationMultiplier`, `Hex.map`, `SurfaceMap`, `SurfaceCell`,
> `Landform`, `Volcano`, `River`, `Road`, `City`, `CityRank`, `Port` und der Bereich *Oberflächenkarte*.
> Der Ausschnitt dazu liegt unter
> [`changes/2026-11-14-oberflaechenkarte.png`](../changes/2026-11-14-oberflaechenkarte.png).

> Am 14. November 2026 freigegeben (Kennzeichen 2026-11-14j, baut auf 2026-11-14i auf): **Orte**
> (siehe [Orte](oberflaeche.md#orte)). Logeinträge, die Gruppe und NSC stehen auf einer Welt, wahlweise genauer auf
> einem Oberflächenfeld oder in einer Stadt. Neu im Bild: `Place`, `LogEntry.place`; `Campaign.location`
> und `Character.place` zeigen auf einen `Place` statt direkt auf ein `Hex`. Der Ausschnitt dazu
> liegt unter [`changes/2026-11-14-orte.png`](../changes/2026-11-14-orte.png).

> Am 14. November 2026 freigegeben (Kennzeichen 2026-11-14k): **Städtenamen** (siehe
> *Oberflächenkarte*). Jede Haupt- und Nebenstadt hat einen Namen. Neu im Bild: `City.name`. Der
> Ausschnitt dazu liegt unter [`changes/2026-11-14-staedtenamen.png`](../changes/2026-11-14-staedtenamen.png).

> Am 15. November 2026 freigegeben (Kennzeichen 2026-11-15), nach den Antworten des Owners: **Fahrzeuge** und **Fahrt** (siehe dort).
> Jedes Fahrzeug hat eine Tabelle, auf welchen Geländearten und Wegen (Straße, Fluss, Siedlung) es
> wie schnell fährt; wo kein Eintrag steht, fährt es nicht. Fluggeräte fliegen gerade von
> Landepunkt zu Landepunkt: auf ihren Geländearten oder in Städten mit passendem Hafen. Eine
> **Fahrt** über die Oberfläche wird gespeichert und rückt Tag für Tag vor; gemietete Fahrzeuge
> kosten einen Anteil des Kaufpreises je Tag; eigene Fahrzeuge, die nicht mitfahren, bleiben am Ort
> des Wechsels stehen. Neu im Bild: `Vehicle`, `VehicleSpeed`, `Way`,
> `Item.vehicle`, `Trip`, `Leg`, `TripDay`, `Campaign.trip`, `BookingKind.rent`, `Booking.rentFor`,
> `Possession.parked` und der Bereich *Fahrzeuge und Wege*. Der Ausschnitt dazu liegt unter
> [`changes/2026-11-15-fahrzeuge-und-gelaende.png`](../changes/2026-11-15-fahrzeuge-und-gelaende.png).

> Am 15. November 2026 freigegeben (Kennzeichen 2026-11-15b): **Gelände aus dem Aufenthaltsort**
> (siehe [Gelände](begegnung.md#gelände)). Kommt die Gruppe auf ein Feld oder in eine Stadt, belegt die App das Gelände
> der Begegnungen vor: je Geländeart der Oberflächenkarte ein Gelände, in einer Stadt City. Von Hand
> ändern geht weiter. Neu im Bild: `Landform → Terrain : terrain`. Der Ausschnitt dazu liegt unter
> [`changes/2026-11-15-gelaende-aus-dem-aufenthaltsort.png`](../changes/2026-11-15-gelaende-aus-dem-aufenthaltsort.png).

> Am 15. November 2026 freigegeben (Kennzeichen 2026-11-15c, nach den Empfehlungen, denen der Owner
> zugestimmt hat): **Linienflug** (siehe [Fahrzeuge](logistik.md#fahrzeuge), Linienverkehr). Ein Fahrzeug des Linienverkehrs
> hat einen Fahrpreis je Person und Flugstunde und keinen Gegenstand; es fliegt zwischen Städten mit
> Raumhafen A–C oder Landeplatz F, ab TL 6 und Atmosphäre 4, ohne Fahrplan. Neu im Bild:
> `Vehicle.tl`, `Vehicle.fare`, `Leg./fare`, `TripDay.fare`, `BookingKind.fare`. Der Ausschnitt dazu
> liegt unter [`changes/2026-11-15-linienflug.png`](../changes/2026-11-15-linienflug.png).
>
> Am 16. November 2026 freigegeben (Kennzeichen 2026-11-16): **Schiffe als Basis der Gruppe** (siehe
> *Schiffe*, RAW-Regeln in [`regeln-schiffe.md`](../regeln-schiffe.md)). Erster von drei Schritten
> (danach Handel, dann Raumkampf). Neu im Bild: `Ship` (mit `price`, eigener gezahlter Preis,
> getrennt vom `basePrice` des Entwurfs), `ShipDesign`, `Campaign.ship`, `BookingKind.ship`,
> `Booking.forShip`, `Gain.ship`, `Gain.shipDebtFree`, `CareerRoll.shipChoice`, `ShipChoice`. Der
> Ausschnitt dazu liegt unter
> [`changes/2026-11-16-schiffe-basis.png`](../changes/2026-11-16-schiffe-basis.png).
>
> Ebenfalls am 16. November 2026 freigegeben (Kennzeichen 2026-11-16b): **Software,
> Rechner und Deckpläne zu den Schiffen** (Regeln in [`regeln-schiffe.md`](../regeln-schiffe.
> md) unter *Computer und Software*). Neu im Bild: `Software` und `SoftwareKind` (die
> Software-Liste aus SE 13 mit Space und MCr), `ComputerModel` (SE 10; die Modellzahl
> ist höchste Sprungzahl und Wert des Softwarepakets), `ShipSoftware` (was ein
> konkretes Schiff dabeihat) und `DeckPlan` als **Geräte-Daten** (orange: das Gerät
> hält sie je Entwurf über Kampagnen hinweg, Export und OneDrive holen sie nicht).
> `Ship` bekommt `retired` (Ausblenden statt Löschen, damit Buchungen mit `forShip`
> nicht ins Leere zeigen); `ShipDesign.computer` ist Verweis auf ein Rechnermodell
> statt Text. Der Ausschnitt dazu liegt unter
> [`changes/2026-11-16b-schiff-retired-und-deckplaene.png`](../changes/2026-11-16b-schiff-retired-und-deckplaene.png).
>
> Ebenfalls am 16. November 2026 freigegeben (2026-11-16c): **Die Kampagne hält alle ihre Schiffe.** Der
> Inhalt ist mit 16b schon freigegeben (ausgediente Schiffe bleiben mit `retired` in der
> Kampagne, Buchungen mit `forShip` zeigen weiter auf sie) – die Zeichnung war dazu
> unvollständig: Ein einzelnes `ship`-Feld kann kein ausgeblendetes Schiff aufnehmen, und
> `forShip` brauchte eine stabile Id. Neu im Bild: die Komposition `Campaign.ships` (0..*,
> alle Schiffe auch mit `retired`) und das abgeleitete `/ship` am `Campaign` – das aktive
> Schiff, wie `focus` beim Charakter; die Schiffs-Id (s1, s2, …) ist wie bei Charakteren
> nicht gezeichnet. Der Ausschnitt dazu liegt unter
> [`changes/2026-11-16c-schiffe-der-kampagne.png`](../changes/2026-11-16c-schiffe-der-kampagne.png).
>
> Am 16. November 2026 freigegeben (2026-11-16d): **Reisen mit eigenem Schiff.** Neben die Passage
> (High, Middle, Low) tritt die Reise im eigenen Schiff: Sie erreicht in einer Woche jedes Ziel
> innerhalb der Sprungzahl des Entwurfs, ohne Raumhafen zu verlangen, und kostet keinen Passagen-
> preis, sondern Treibstoff. Neu im Bild: der Verweis `Journey.ship` auf das Schiff der Reise, der
> Sprungwurf `Journey.jump` (2W6) mit dem abgeleiteten `/misjump` (Fehlsprung bei 13+, SR 28) und
> das abgeleitete `ShipDesign./jumpFuel` – der Verbrauch je Sprung als Hausregel: Tankinhalt durch
> Sprungzahl, gerundet. `Journey.passengers` wird von 1..* auf 0..* geöffnet: mit eigenem Schiff
> reist niemand als Passagier, es gibt keine Passagen, keine Kojen und keine Lotterie. Der
> Ausschnitt dazu liegt unter
> [`changes/2026-11-16d-reisen-mit-eigenem-schiff.png`](../changes/2026-11-16d-reisen-mit-eigenem-schiff.png).
>
> Am 17. November 2026 freigegeben (Kennzeichen 2026-11-17): **Deckpläne mit
> OneDrive abgleichen** (siehe [Abgleich mit OneDrive](kampagne.md#abgleich-mit-onedrive), *Deckpläne*). Bisher blieben die Deckpläne
> auf dem Gerät; nach dem Wunsch des Owners gleicht der Abgleich sie jetzt mit OneDrive ab, über
> Kampagnen und Geräte hinweg. Neu im Bild: `DeckPlan.key`, der Schlüssel, an dem der Abgleich ein
> Bild wiedererkennt. Orange heißt in der Legende jetzt „über Kampagnen hinweg“ statt „Geräte-Daten“:
> nicht im Spielstand einer Kampagne, mit OneDrive abgeglichen, nicht exportiert. Der Ausschnitt dazu
> liegt unter
> [`changes/2026-11-17-deckplaene-abgleich.png`](../changes/2026-11-17-deckplaene-abgleich.png).
>
> Am 17. November 2026 freigegeben (Kennzeichen 2026-11-17b): **Monat und Monatsabrechnung** (siehe
> *Schiffe*, *Laufende Kosten und Monatsabrechnung*). Ein Monat sind 4 Wochen; an jedem
> Monatsende bucht die App die Raten und schreibt eine Monatsabrechnung mit den laufenden
> Schiffskosten in den Log. Neu dazu: Liegegebühren, Lebenserhaltung und die Kabinenprüfung mit
> Doppelbelegung. Neu im Bild: `MonthEnd`
> (mit `costs`, `/month` und `/total`), `Booking.shipCost` mit `ShipCost` und
> `Ship.berthedSince`. Der Ausschnitt dazu liegt unter
> [`changes/2026-11-17b-monatsabrechnung.png`](../changes/2026-11-17b-monatsabrechnung.png).
>
> Am 18. November 2026 freigegeben (Kennzeichen 2026-11-18): **Missionen** (siehe [Missionen](mission.md#missionen)). Eine Mission
> hat Titel, Text, Zustand (offen, erledigt, gescheitert), höchstens einen Auftraggeber (einen
> dauerhaften NSC) und Orte mit Etikett; sie stehen in einem eigenen, fünften Bereich. Die offenen
> Missionen sind die Handlungsfäden des Orakels: Fällt ein Fadenfokus, lost die Karte eine aus.
> Neu im Bild: `Mission`, `MissionPlace`, `MissionState`, `Campaign.missions`, `EventFocus.thread`
> und `thread` an Karte und Kartenauswahl. Der Ausschnitt dazu liegt unter
> [`changes/2026-11-18-missionen.png`](../changes/2026-11-18-missionen.png). Ebenfalls am 18. November
> 2026 auf Wunsch des Owners: Ein Missionsort ist immer ein Feld der Oberfläche (oder eine Stadt auf
> einem Feld), nie eine ganze Welt (siehe [Missionen](mission.md#missionen), [Orte](oberflaeche.md#orte)); das Bild ändert sich dadurch nicht.
>
> Ebenfalls am 18. November 2026 freigegeben (Kennzeichen 2026-11-18b): **Beteiligte einer Mission** (siehe [Missionen](mission.md#missionen)).
> Eine Mission verknüpft beliebig viele Charaktere der Kampagne, NSC oder SC, je mit einem freien
> Etikett wie „Opfer“, „Fahrer“ oder „Informant“. Neu im Bild: `MissionPerson` mit `label` und
> `Mission.people`. Der Ausschnitt dazu liegt unter
> [`changes/2026-11-18b-beteiligte.png`](../changes/2026-11-18b-beteiligte.png).
>
> Am 18. November 2026 freigegeben (Kennzeichen 2026-11-18c): **Systemflug**, Stufe 1 des Raumkampfs: mit dem eigenen
> Schiff um eine Welt fliegen, noch ohne Gegner, nach dem [Konzept Raumkarte und
> Raumkampf](../konzept-raumkampf.md) (siehe [Systemflug](raum.md#systemflug)). Der Owner hat entschieden, den Raumkampf
> vor dem Handel zu bauen. Neu im Bild: `SystemFlight` an der Kampagne (`flight`, mit Welt,
> Raumrunde und `/elapsed`), `SpaceUnit` (Ort, Geschwindigkeit,
> Schubvektor, Aufschlag, `/maxG`, Verweis auf das Schiff), `TrackPoint` für die Spur und der Wert
> `Vec`. Der Ausschnitt dazu liegt unter
> [`changes/2026-11-18-systemflug.png`](../changes/2026-11-18-systemflug.png).
>
> Ebenfalls am 18. November 2026 freigegeben (Kennzeichen 2026-11-18d): **Sternsystem nach Book 6** *Scouts* (siehe
> *Sternsystem, Monde und Gasriesen*, Regeln in [`regeln-sternsystem.md`](../regeln-sternsystem.md)):
> Sterne, Bahnen und Zonen, Hauptwelt und Gasriesen auf ihren Bahnen, Monde und Ringe, damit die
> Raumkarte nicht leer ist (Owner: Stern und Bahnen bestimmen und speichern). Neu im Bild:
> `StarSystem` an der Welt (`Hex.system`), `Star` mit `StarType` und `StarSize`, `Zone`, die
> Referenzdaten `StarZones` (verdichtete Table of Zones), `GasGiant` mit Bahn, `Satellite` mit
> `SatelliteKind`, `StarSystem.host` (die Hauptwelt als Mond eines Gasriesen) und `SystemFlight.at`
> für den Systemflug am Gasriesen. Der Ausschnitt dazu liegt unter
> [`changes/2026-11-18b-sternsystem.png`](../changes/2026-11-18b-sternsystem.png).
>
> Am 20. November 2026 freigegeben (Kennzeichen 2026-11-20): **Sternsystem in der Weltenerschaffung** (Wunsch
> des Owners): Das Sternsystem wird nicht mehr beim ersten Öffnen der Raumkarte gewürfelt, sondern
> als eigener Schritt der Weltenerschaffung nach der Oberfläche, mit einem Knopf, alles auf einmal;
> fertige Welten ohne Sternsystem bekommen es beim Öffnen der Kampagne. Neu im Bild:
> `WorldStep.system`. Der Ausschnitt dazu liegt unter
> [`changes/2026-11-20-sternsystem-in-der-erschaffung.png`](../changes/2026-11-20-sternsystem-in-der-erschaffung.png).
>
> Ebenfalls am 20. November 2026 freigegeben (Kennzeichen 2026-11-20b): **Welten getrennt vom Hexfeld** (Wunsch des
> Owners, siehe [Welten und Hexfeld](sektor.md#welten-und-hexfeld)). Das Hexfeld ist das System; jede Welt darin ist eine eigene
> `World`: die Hauptwelt, weitere Planeten, Planetoidengürtel, Gasriesen, kleine Welten, Monde und
> Ringe. Monde hängen an der Welt, die sie umkreisen (`moonOf`); eine Welt ist die Hauptwelt
> (`Hex.main`). UWP, Name, Notiz, Temperatur, Oberfläche, Oberflächenkarte, Tiertabellen, Angebot und
> Handelscodes wandern vom Hexfeld zur Welt; Orte, Heimatwelten, Welten der Terms, Buchungen,
> Begegnungen und der Systemflug zeigen auf eine Welt. Mit dem Knopf „Sternsystem würfeln“ entstehen
> auch Planetoidengürtel, leere und eingefangene Bahnen und die weiteren Welten mit Größe,
> Atmosphäre, Hydrographie, Bevölkerung und Monden. `Satellite`, `SatelliteKind` und `GasGiant`
> entfallen, ebenso die Bahn der Hauptwelt am `StarSystem`. Der Ausschnitt dazu liegt unter
> [`changes/2026-11-20b-welten-getrennt.png`](../changes/2026-11-20b-welten-getrennt.png).
>
> Am 20. November 2026 freigegeben (Kennzeichen 2026-11-20c): **Nebenwelten nach Book 6** (Owner, 20. November 2026:
> „Macht es Sinn, auch die UWP der weiteren Welten zu würfeln?“). Jede weitere Welt und jeder Mond
> außer Ringen bekommt Regierung, Gesetz und Tech-Level im UWP, einen Raumhafen (`World.spaceport`,
> `Spaceport`: F, G, H oder Y) und Einrichtungen (`World.facilities`, `Facility`: Farming, Mining,
> Colony, Research Laboratory, Military Base); dazu Marine- und Scoutbasen im ganzen System
> (`World.bases`, `BaseKind`); siehe *Nebenwelten*. Neu im Bild: `World.spaceport`,
> `World.facilities`, `World.bases`, `Spaceport`, `Facility`, `BaseKind`. Der Ausschnitt dazu liegt unter
> [`changes/2026-11-20c-nebenwelten.png`](../changes/2026-11-20c-nebenwelten.png).
>
> Am 20. November 2026 freigegeben (Kennzeichen 2026-11-20d): **Reise im System und Nebenwelten mit Globus** (Owner,
> 20. November 2026). Die Weltkarte und der Globus hängen an der Welt statt am Hexfeld: Nebenwelten
> bekommen Namen, Notiz, Oberfläche und Globus wie die Hauptwelt; der Globus jeder Welt entsteht nur
> auf ausdrücklichen Knopfdruck („Globus erzeugen“). Zwischen Welten desselben Systems reist man mit
> Ticket oder dem eigenen Schiff, die Dauer nach T = 2·√(D/A). Neu im Bild: der Logeintrag
> `SystemJourney` mit `from`, `to`, `travellers`, `ship`, die Buchungsart `ticket` und
> `Booking.ticketFor`. Der Ausschnitt dazu liegt unter
> [`changes/2026-11-20d-reise-im-system.png`](../changes/2026-11-20d-reise-im-system.png).
>
> Am 21. November 2026 freigegeben (Kennzeichen 2026-11-21): **Landeplatz** (Owner, 21. November 2026). Kommt die
> Gruppe auf eine Welt mit Globus, wählt sie zuerst ein Feld: einen Raumhafen oder, mit eigenem
> Schiff, einen beliebigen Ort. Das Schiff hat einen eigenen Ort; abfliegen kann es nur, wenn die
> Gruppe bei ihm ist, und Passagen gibt es nur in einer Stadt mit Hafen. Neu im Bild: `Ship.place`.
> Der Ausschnitt dazu liegt unter [`changes/2026-11-21-landeplatz.png`](../changes/2026-11-21-landeplatz.png).
>
> Am 21. November 2026 freigegeben (Kennzeichen 2026-11-21b): **Small Craft ohne
> Kampf** (Owner, 21. November 2026: „Jetzt wo wir Systemreisen haben, wäre da nicht die Zeit die
> Small Craft einzubauen?“; Umfang, Modellform, Reichweite und Demo-Schiff vom Owner gewählt). Small
> Craft werden eigene Entwürfe und eigene Schiffe, die ein Mutterschiff an Bord trägt; im Systemflug
> setzt man sie aus und dockt sie wieder an, man landet mit ihnen und reist mit ihnen im System. Das
> Mutterschiff kann dabei in der Umlaufbahn bleiben. Waffen, Rotten und Entern kommen später mit
> Stufe 4 des Raumkampfs. Neu im Bild: `ShipDesign.kind`, `ShipKind`, `ShipDesign.craft`,
> `ShipDesign.months` und `ShipDesign.computer` optional, `Ship.mother`, `Ship.aboard`,
> `Ship.inOrbit`, `SystemFlight.party`; siehe [Small Craft](schiffe.md#small-craft). Der Ausschnitt dazu liegt unter
> [`changes/2026-11-21b-small-craft.png`](../changes/2026-11-21b-small-craft.png).
>
> Am 21. November 2026 freigegeben (Kennzeichen 2026-11-21c): **Small Craft einzeln
> kaufen** (Owner, 21. November 2026: „Man sollte die Boote auf jeden Fall auch einzeln kaufen
> können“; Zugehörigkeit, Platz, Bezahlung und das alte Boot beim Schiffskauf vom Owner gewählt). In
> der Werft, bar oder über die Bank; mit Schiff wird es ein Beiboot im Laderaum, ohne Schiff gehört
> es der Gruppe eigenständig. Neu im Bild: `Ship.inHold`; siehe *Small Craft einzeln kaufen*. Der
> Ausschnitt dazu liegt unter
> [`changes/2026-11-21c-small-craft-kaufen.png`](../changes/2026-11-21c-small-craft-kaufen.png).
>
> Am 21. November 2026 freigegeben (Kennzeichen 2026-11-21f): **Treibstoff am Gasriesen schöpfen** (Owner,
> 21. November 2026). Ein stromlinienförmiges Schiff, das im Systemflug langsam in einen Gasriesen
> eintaucht, füllt den Tank mit unraffiniertem Treibstoff und fliegt weiter; unraffinierter
> Treibstoff gibt DM +1 auf den Sprungwurf. Neu im Bild: der Logeintrag `Skimming` mit `at` und
> `ship`, `Ship.unrefined` und `Journey.jumpDm`. Der Ausschnitt dazu liegt unter
> [`changes/2026-11-21f-gasriese-schoepfen.png`](../changes/2026-11-21f-gasriese-schoepfen.png).
>
> Am 21. November 2026 freigegeben (Kennzeichen 2026-11-21g, Owner: „Bau mal“): **Bewaffnung in der Werft** (Owner, 21. November
> 2026). Auf jedem Hardpoint des eigenen Schiffs kann ein Turret sitzen, bestückt mit bis zu drei
> Waffen; eingebaut und ausgebaut wird in der Werft an einem Raumhafen A oder B. Neu im Bild:
> `Turret`, `DesignTurret`, `TurretType`, `ShipWeapon`, `Ship.turrets`, `ShipDesign.turrets` und die
> Schiffskosten `armament`. Der Ausschnitt dazu liegt unter
> [`changes/2026-11-21g-bewaffnung.png`](../changes/2026-11-21g-bewaffnung.png).
>
> Am 21. November 2026 freigegeben (Kennzeichen 2026-11-21h, nach dem Ausprobieren in der App):
> **Raumkampf, Stufe 2: Gegner und Laser** (Owner, 21. November 2026: „Bau mal bis einschließlich
> Stufe 2“). Im Systemflug kann ein fremdes Schiff auftauchen; es fliegt nach seiner Absicht,
> beide Seiten feuern mit Lasern, Treffer gehen auf Trefferzonen, der Schaden bleibt am eigenen
> Schiff. Neu im Bild: `ShipDamage`, `HitZone`, `Intent`, `BattleOutcome`, die Logeinträge
> `SpaceBattle`, `SpaceAttack` und `SpaceBattleEnd`, an `SpaceUnit` `name`, `intent`, `design`,
> `damage` und `aim` (`ship` wird optional), `Ship.damage` und die Schiffskosten `repair`. Der
> Ausschnitt dazu liegt unter
> [`changes/2026-11-21h-raumkampf-gegner-laser.png`](../changes/2026-11-21h-raumkampf-gegner-laser.png).
>
> Am 21. November 2026 freigegeben (Kennzeichen 2026-11-21i): **Feuer auslösen statt vormerken** (Owner,
> 21. November 2026). Jede Einheit feuert einmal je Raumrunde nach der Bewegung; das eigene Schiff,
> wenn man „Feuer auf …“ tippt, mit Würfelanimation. Die DMs stehen mit ihren Gründen auf dem
> Knopf, im Blatt, bei den Würfen und im Log. Neu im Bild: `SpaceUnit.fired`, `SpaceAttack.bands` und
> `SpaceAttack.computerHits`; `aim` entfällt.
> Der Ausschnitt dazu liegt unter
> [`changes/2026-11-21i-feuer-ausloesen.png`](../changes/2026-11-21i-feuer-ausloesen.png).
>
> Am 22. November 2026 freigegeben (Kennzeichen 2026-11-22): **Bewaffnung der Small Craft** (Owner,
> 22. November 2026: „implementieren dieses System. Die Small Craft kommen mit Lasern. Der Rest
> existiert ja auch noch nicht in der App“). Small Craft haben statt Hardpoints eine Bewaffnung mit
> bis zu drei Waffen (SR 34) und kommen ab Werft mit so vielen Lasern, wie ihr Typ erlaubt; im
> Raumkampf feuern sie, werden auf der Tabelle der Small Craft getroffen und schießen ohne Computer
> mit DM −1. Neu im Bild: `ShipDesign.lasers`, `TurretType.smallCraft`, die Trefferzonen `drive`,
> `cabin`, `weapons`, `criticalDrive` und `SpaceAttack.noComputer`; siehe *Bewaffnung der Small
> Craft*. Der Ausschnitt dazu liegt unter
> [`changes/2026-11-22-bewaffnung-small-craft.png`](../changes/2026-11-22-bewaffnung-small-craft.png).
>
> Am 22. November 2026 freigegeben (Kennzeichen 2026-11-22b): **Schiffsbegegnungen bei Abreise und Ankunft**
> (Owner, 22. November 2026: „Wäre nicht die Raum Begegnung beim Verlassen und betreten des Sektors
> etc der nächste Schritt? Weil aktuell fehlen Begegnungen. Völlig“). Wer mit dem eigenen Schiff
> springt oder im System reist, würfelt beim Start von der Welt und bei der Ankunft auf der
> *Starship Encounter Table* (SR 42); ein Angreifer öffnet die Raumkarte, eine friedliche Sichtung
> fragt, und aus dem Systemflug geht die geplante Reise weiter. Neu im Bild: `SpaceBattle.occasion`
> mit `EncounterOccasion`, `SpaceBattle.jumpTo` und `travelTo`, `SystemFlight.departure`,
> `BattleOutcome.departed`, `departureRoll` und `arrivalRoll` an `Journey` und `SystemJourney`, und
> flüchtig `EncounterCheck` (der Dialog vor dem Wurf, mit Zielwert, „Würfeln“ und „Abbrechen“ zum
> Auslassen des Wurfs, lang gedrückt; auch von Hand im Bereich Begegnung); siehe [Schiffsbegegnungen bei Abreise und Ankunft](schiffe.md#schiffsbegegnungen-bei-abreise-und-ankunft). Der Ausschnitt dazu
> liegt unter
> [`changes/2026-11-22b-raumbegegnungen-reise.png`](../changes/2026-11-22b-raumbegegnungen-reise.png).
>
> Am 22. November 2026 freigegeben (Kennzeichen 2026-11-22c): **Reise Tag für Tag** (Owner, 22. November 2026:
> „Die Zeit der Reise sollte ich selbst vergehen lassen. Also wie bei einer Reise auf dem Globus. Das
> Ankunftswürfeln folgt nach einer Woche.“). Jede Reise (Sprung und Reise im System, mit Passage,
> Ticket oder eigenem Schiff) läuft wie eine Fahrt: Beim Abflug beginnt sie, „Weiterreisen“ im Bereich
> Begegnung lässt je einen Tag vergehen, nach ihrer Dauer kommt die Gruppe an. Neu im Bild: `Voyage`
> mit `days` und `/left`, `Campaign.voyage`, die Verweise `jump` und `inSystem`; siehe [Unterwegs](reise.md#unterwegs).
> Der Ausschnitt dazu liegt unter
> [`changes/2026-11-22c-reise-tag-fuer-tag.png`](../changes/2026-11-22c-reise-tag-fuer-tag.png).
>
> Am 23. November 2026 freigegeben (Kennzeichen 2026-11-22d): **Raumkampf, Stufe 2b: Crew und Programme** (Owner,
> 22. November 2026: „Ja, crew und Programme. Wir müssen da auch auf jeden Fall dann ein ui für die
> Zuweisung der crew und eines für die Software entwerfen.“). SC und NSC besetzen die
> Schiffspositionen aus SR 33, ihre Fertigkeiten werden DMs. Jedes Programm an Bord liegt in CPU,
> Speicher oder Archiv; nur was in der CPU läuft, wirkt, und *Target* und *Maneuver* sind Pflicht.
> Programme kauft man in der Werft. Antriebe haben Buchstaben, Treffer senken sie. Der Engineer
> versucht die Schadenskontrolle. Neu im Bild: `CrewPost`, `CrewRole`, `ShipSoftware.slot`,
> `SoftwareSlot`, `DrivePotential`, die Antriebsbuchstaben am `ShipDesign`, `ShipDamage.patched`,
> `SpaceUnit.returned` und `/evading`, an `SpaceAttack` `predict`, `gunnery`, `evade`, `returnFire`
> und `gunner`, der Logeintrag `DamageControl` und die Schiffskosten `software`; siehe *Crew und
> Programme*. Der Ausschnitt dazu liegt unter
> [`changes/2026-11-22d-crew-und-programme.png`](../changes/2026-11-22d-crew-und-programme.png).
>
> Am 23. November 2026 freigegeben (Kennzeichen 2026-11-23a, nachgetragen am 24. November 2026): **Raumkampf-Interface** (nach der Skizze des Owners
> und dem Modell [`mock/raumkampf-ui.html`](../mock/raumkampf-ui.html)). Die Raumrunde bekommt im
> Raumkampf zwei Phasen: **Schub** und **Feuer** – „Bewegen“ führt die Bewegung aus und lässt die
> Raumrunde stehen, „End Turn“ lässt die fremden Schiffe feuern und rückt weiter. Neu im Bild:
> `SystemFlight.phase` mit `BattlePhase`. Gefeuert wird je **Hardpoint**: `SpaceUnit.fired` entfällt,
> stattdessen `firedTurrets` – jeder Hardpoint feuert einmal je Raumrunde. Die Wirkungen der Programme
> in der CPU (Target, Predict, Gunner Interact, Maneuver/Evade, Auto-Evade, Return Fire) und der
> Pflichtprogramme rechnet jetzt der Code; siehe *Raumkampf*. Der Ausschnitt dazu liegt unter
> [`changes/2026-11-23a-raumkampf-interface.png`](../changes/2026-11-23a-raumkampf-interface.png).
>
> Am 23. November 2026 freigegeben (Kennzeichen 2026-11-23c, nachgetragen am 24. November 2026; es ersetzt
> die Andock-Regel aus 2026-11-23b, die nur im Regeltext stand): **Andockflug** – „Andocken“ ist nicht mehr der
> Augenblick an der Nahgrenze, sondern ein Flug. Ein Small Craft darf andocken, wenn das Mutterschiff
> **Platz** hat (Liegeplatz des Entwurfs, sonst freier Laderaum für den Rumpf) und das Small Craft
> genug **Schub** hat, um den Ort zu erreichen, an dem sein Mutterschiff nach der nächsten Bewegung
> steht – dieselbe Rechnung wie beim Schub wählen: 5.000 km je G vom Punkt „ohne Schub“ aus. Ist das
> Mutterschiff schon näher als 100 km, dockt es sofort an; ist es weiter weg, setzt der Knopf den
> neuen Wert `SpaceUnit.docking`: den **Andockflug**, der in der nächsten Bewegung ausgeflogen und
> beendet wird, sonst weiter geflogen wird. Nähe (100 km) und Geschwindigkeit (0,1 km/s, beim
> Anfliegen 2 km/s) als eigene Bedingungen entfallen. Der Knopf „Andocken“ steht in der Knopfreihe des
> Blatts am Platz von **Launch**. Siehe *Andocken* und *Andockflug* unter *Systemflug*. Der Ausschnitt
> dazu liegt unter [`changes/2026-11-23c-andockflug.png`](../changes/2026-11-23c-andockflug.png).
>
> Am 24. November 2026 freigegeben (Kennzeichen 2026-11-24a): **Laufbahnen des Bürgers** – die zwölf
> Laufbahnen aus Supplement 4 *Citizens of the Imperium* (Regeln und Tabellen in
> [`regeln-laufbahnen.md`](../regeln-laufbahnen.md)). Sie bringen keine neue Schicht, nur Felder an den
> Referenzdaten: `Service` bekommt `startAge` (Belterer und Barbar beginnen mit 14), `retirement`
> (ein Barbar tritt nie in den Ruhestand – seit 2026-11-24e: ohne Bezüge), `freeExit` (ein Bürokrat darf nur mit gelungener
> Weiterverpflichtung weg) und `naturalGunSkill` (Barbar, Bürokrat und Arzt haben keine natürliche
> Schusswaffenkunde), und mit `Qualification` eine neue Referenzklasse für den **Einstieg ohne
> Wurf** (`needs`, beim Adligen Stand 10+). `draft` wird **optional**: eine Laufbahn ohne
> Einberufungszahl würfelt keine *Einberufung*, sondern lässt die Person **weiterbewerben**.
> `Throw.dmPerTerm` ist der Überleben-DM des Belters (+1 je Term), `ThrowDm.atMost` die Bedingung
> „Stand 7−“ und „Stä 8−“. An den sechs gebauten Laufbahnen ändert sich nichts: `draft` gesetzt,
> `startAge` leer, die drei Schalter wahr. Der Ausschnitt dazu liegt unter
> [`changes/2026-11-24a-laufbahnen-des-buergers.png`](../changes/2026-11-24a-laufbahnen-des-buergers.png).
>
> Am 24. November 2026 freigegeben (Kennzeichen **2026-11-24b**): **Name der Ranglaufbahn**.
> `Service.commissionTitle` `[0..1]` gibt den Wurf, der Rang 1 gibt, in den Worten der Laufbahn: Der
> Bürokrat steigt in den **gehobenen Dienst**, nicht in ein Offizierspatent. Ohne das Feld heißt der
> Wurf „Offizierspatent“, was bei Navy, Marines, Army und bei den Merchants passt (deren Ränge sind
> Schiffsoffiziere). Siehe *Rangwurf* unter *Begriffe* und die Erschaffung unter *Charakter anlegen*.
> Der Ausschnitt dazu liegt unter
> [`changes/2026-11-24b-name-der-ranglaufbahn.png`](../changes/2026-11-24b-name-der-ranglaufbahn.png).
>
> Am 24. November 2026 freigegeben (Kennzeichen **2026-11-24c**): **Rangstufen und Bogenwaffen** – was die
> zwölf Laufbahnen an den beiden bestehenden Klassen brauchen. `Rank.level` ist die Rangstufe,
> und eine Laufbahn muss **nicht jede Stufe haben**: die Tafel des Barbars kennt nur **Warrior
> (Stufe 2)** und **Chief (Stufe 5)**, die Stufen 1, 3 und 4 gibt es dort nicht. Der Rangwurf gibt
> die **unterste Stufe der Laufbahn**, die Beförderung die **nächste vorhandene**; der höchste Rang
> einer Laufbahn ist die höchste Stufe ihrer Tafel. Und `Weapon.rounds` ist das Magazin der
> Schusswaffen – die **Bogenwaffen** aus Supplement 4 (B4 S. 16) sind Schusswaffen **ohne Magazin**:
> Bogen, Langbogen und Schleuder laden automatisch, der Sport-, Militär- und Wiederholcrosser laden
> mit einer eigenen Runde, der Wiederholer nimmt die Bolzen aus seinem Magazin von zehn. Wie Hände
> und Tierwaffen haben sie **kein `minSoc`**: ein erzeugter NSC bekommt sie nie, ein Charakter aus
> Barbar oder Hunter wohl (Sachwerte und Kaskaden fragen das Feld nicht ab). Kein Feld kommt neu
> dazu, nur diese beiden Lesarten. Der Ausschnitt dazu liegt unter
> [`changes/2026-11-24c-rangstufen-und-bogenwaffen.png`](../changes/2026-11-24c-rangstufen-und-bogenwaffen.png).
>
> Am 24. November 2026 freigegeben (Kennzeichen **2026-11-24d**): **Der Adelsrang des Adligen**. `Rank.standing`
> `[0..1]` nennt den **Stand, ab dem ein Rang gilt** – beim Adel die Buchstaben der Rangtafel:
> Stand **B (11) = Knight, C (12) = Baron, D (13) = Marquis, E (14) = Count, F (15) = Duke**.
> Nennt die Rangtafel einer Laufbahn solche Stände, steht die Person **gleich bei der Musterung auf
> dem höchsten Rang, den ihr Stand erreicht**, und der **Rangwurf entfällt** – wer mit Stand 13
> eingezogen oder angenommen wird, ist Marquis, nicht Knight. **Beförderung hebt den Rang auf die
> nächste Stufe** der Tafel, und **jede Beförderung auf so einen Rang gibt +1 Stand** (über 15 geht
> es nicht) – der Aufstand ist der Preis des Titels, der Rang kann dem Stand voraussein. Der höchste
> Rang der Tafel schließt sie. Mit einem Stand **unter der untersten Stufe** (der Adlige mit 10) gibt es keinen Standesrang,
> und die Person würfelt den Rangwurf wie jede andere. Der Adel ist die einzige Laufbahn mit
> Standesrängen; an den übrigen ändert sich nichts, ihr `standing` ist leer.

> Am 24. November 2026 freigegeben (Kennzeichen **2026-11-24e**): **Der Barbar ohne Ruhestand und der NSC-Lauf mit Qualifikation**. `Service.retirement` sagt künftig nur noch aus, ob es für die Laufbahn einen **Ruhestand mit Bezügen** gibt: `false` (der Barbar, B4 S. 9 „Barbarians cannot retire“) heißt **keine Ruhestandsbezüge**, sein Ende ist sonst das übliche. Bis jetzt hieß `retirement === false` „die Person geht nie weg“ – und weil das vor der Obergrenze von sieben Terms griff, kam ein Barbar nie zur Abmusterung: ein NSC in dieser Laufbahn war unmöglich. Neu gefasst auch das Ende nach dem **siebenten Term**: dort bleibt nur, wer eine **12** würfelt (B1 S. 7: “retirement is mandatory … persons who throw 12 may continue“); bis jetzt blieb, wer sieben Terme gedient hatte, unabhängig vom Wurf. Ein **Lauf** (die zufällig durchlaufene Erschaffung eines NSC) würfelt **von vorn**, wenn die Werte die `needs`-Qualifikation nicht erfüllen – beim Adligen Stand 10+ – statt abzubrechen, wie das bei abgelehnter Musterung schon heute geschieht. Und die **Patron-Reihen** (`Patron.career`) wählen jetzt aus **allen achtzehn** Laufbahnen statt nur aus sechs: Schmuggler und Pirat → Pirate, Schurke/Swindler/Unterwelt/Brandstifter → Rogue, Gelehrter/Forscher/Professor/Wissenschaftler → Scientist, Noble/Playboy/Émigré → Noble, Clerk/Administrator/Gouverneur/Government Official/Bürokrat → Bureaucrat, Belter → Belter, Hunter → Hunter, Pilot → Flyer, Barbarian → Barbarian, Doctor → Doctor, Diplomat → Diplomat, Crewmember → Sailor; die übrigen Zeilen bleiben, wo sie waren. Beim *Durchlaufen* schließlich wählt der Zufall nur
> eine Laufbahn, deren Qualifikation die gewürfelten Werte erfüllen – die Liste graut dieselben
> aus. Der Ausschnitt dazu liegt unter [`changes/2026-11-24e-der-barbar-ohne-ruhestand.png`](../changes/2026-11-24e-der-barbar-ohne-ruhestand.png).

> Am 25. November 2026 freigegeben (Kennzeichen **2026-11-25a**): **Der
> Knight aus dem Rangwurf, der Bürokrat im Ruhestand und die übrigen Patron-Reihen.** Das Bild
> ändert sich dadurch nicht; es sind drei Regeln im Text.
> 1. **Der Rangwurf hebt den Stand auf den Standesrang.** Gibt der Rangwurf einen Rang mit
>    `Rank.standing` und liegt der eigene Stand darunter, steigt er auf diesen Wert: der Adlige mit
>    Stand 10 wird Knight **und** hat Stand 11. Bis jetzt blieb er bei 10, und Rang und Stand lagen
>    danach dauerhaft eine Stufe auseinander (ein Baron mit Stand 11). Beförderungen geben weiter
>    +1 Stand.
> 2. **Der Bürokrat (`freeExit` false) nur vor dem Ruhestand.** Wer bleiben will, bleibt; wer weg
>    will, braucht die gelungene Weiterverpflichtung – aber nur unter fünf Terms. Ab fünf Terms (dem
>    Ruhestand, ab dem es Bezüge gibt) gilt für ihn das Übliche. Der alte Text „gleich was man
>    wollte“ ist damit klargestellt: Er hieß wörtlich, dass auch gehen muss, wer bleiben will und den
>    Wurf schafft; so war es nie gemeint.
> 3. **Die übrigen verbrecherischen Patron-Reihen → Rogue.** Zu Schurke, Swindler, Unterwelt und
>    Brandstifter (2026-11-24e) kommen **Cutthroat, Assassin und Embezzler** (bisher Other) und
>    **Hijacker** (bisher Marines). Die Daten stehen schon so; 2026-11-24e hatte sie nicht genannt.
>
> Am 24. November 2026 freigegeben (Kennzeichen **2026-11-24f**): **Das Dienstalter der NSC**. `Generation` bekommt das Flüchtig-Feld `/termsGoal` – im Ablauf das **Dienstalter**: wie viele Terms der Lauf eines NSC würfeln soll (1 bis 7, die Termgrenze der Regel; leer = so lange er kann). **Mit Dienstalter** würfelt der Lauf genau so viele Terms: **Überleben und Weiterverpflichtung entfallen**, Rangwurf, Beförderung, Fertigkeiten, Altern und Abmusterung bleiben – und **nichts kann ihn töten**: Misslingt die Krise nach dem Altern, steht das Attribut auf 1 und der Lauf geht weiter. **Ohne Dienstalter** will der NSC bleiben, so lange es geht – die Weiterverpflichtung wird immer mit *will bleiben* gewürfelt, der Zufall über das Wollen fällt weg; überleben wird weiter gewürfelt, stirbt er, beginnt der Lauf von vorn (beim Patron-NSC ebenso wie beim erzeugten). Das Feld steht in beiden Dialogen, die einen NSC aus einer Laufbahn erzeugen: „+ Neuer NSC“ und, lange gedrückt, „NSC platzieren → Neuer NSC“. An der Erschaffung einer **Spielfigur** ändert sich nichts – dort sagt der Spieler, ob er bleibt. Der Ausschnitt dazu liegt unter [`changes/2026-11-24f-das-dienstalter-der-nsc.png`](../changes/2026-11-24f-das-dienstalter-der-nsc.png).
>
> Am 24. November 2026 freigegeben (Kennzeichen **2026-11-24g**): **Was der Lauf verschluckt**. `Generation` meldet das Flüchtig-Feld `/discarded` – die Liste `RunEnd` sagt, *warum* ein verworfener Lauf endete: `dead` (gestorben), `drafted` (er wäre eingezogen worden), `unqualified` (die Qualifikation fehlte, der Adlige mit Stand unter 10). Beim Erzeugen eines NSC erscheint eine **Wartenscheibe**: oben die Drehung, darunter die Zahl der Versuche und darunter, wie viele davon gestorben sind – beides zählt hoch, weil zwischen den Läufen ans Bild übergeben wird (ein Lauf dauert wenige Millisekunden, ohne Abgabe wäre nie etwas zu sehen). Ist einer gefunden, **bleibt das Ganze eine Sekunde stehen**, dann erscheint der neue NSC. Scheibe und Zahlen sind flüchtig: nichts davon wird gespeichert und nichts kommt ins Log. Der Ausschnitt dazu liegt unter [`changes/2026-11-24g-was-der-lauf-verschluckt.png`](../changes/2026-11-24g-was-der-lauf-verschluckt.png).

> Am 26. November 2026 freigegeben (Kennzeichen **2026-11-26**): **Beide
> Hände, keine Wahl im Angriff.** Neu an der Waffe `twoHanded` (zweihändig): Gewehre (Carbine, Rifle,
> Automatic Rifle, Shotgun, Submachinegun, Laser Carbine, Laser Rifle), Bögen und Armbrüste sowie die
> Stangenwaffen Halberd und Pike. Wer eine zweihändige Primärwaffe hat, greift in der Kampfsimulation
> nur mit ihr an – Sekundärwaffe und Hände entfallen als Angriff (Owner: „man kann bei Gewehr keine
> zweite Waffe in die Hand nehmen“). Am Angriff in Vorbereitung entfallen zwei Wahlen: `burst` –
> beim Automatic Rifle sind **Feuerstoß** und **Einzelschuss** zwei Angriffe mit je eigenem nötigem
> Wurf statt einer Feuerart, die man vorher wählt; und `weakened` – ein Schlag oder Hieb ist
> **geschwächt** nur noch, wenn die Combat-Schläge aufgebraucht sind, freiwillig schwächen geht
> nicht mehr (Hausregel, SR 22 erlaubt es). Der Ausschnitt dazu liegt unter
> [`changes/2026-11-26-beide-haende-keine-wahl.png`](../changes/2026-11-26-beide-haende-keine-wahl.png).
> Ist die zweihändige Waffe leer und kein Magazin mehr da, greift er wieder mit Sekundärwaffe bzw.
> Händen an (Owner).

> Am 27. November 2026 freigegeben (Kennzeichen **2026-11-27**): **Die Stufe beim Würfeln.** Die Kampagne merkt
> sich keine gewählte Stufe mehr (`Campaign → Odds : odds` entfällt). Das Orakel braucht sie seit
> 2026-11-14d nicht mehr, die Karte zeigt alle drei Antworten; die Probe wählt sie erst beim
> Würfeln: Auf der Detailseite *Probe* stehen in der Aktionsleiste Leicht 6+, Mittel 8+ und Schwer 10+, jeder
> Knopf würfelt sofort (Owner, 27. November 2026). Dafür bekommt die Stufe ihren Namen als
> Schwierigkeit (`difficulty`: Leicht, Mittel, Schwer); fürs Orakel heißt sie weiter Hoch, Mittel, Gering. Darum rechnet die Probe in Vorbereitung `/need`
> und `/chance` für alle drei Stufen. Das Ergebnis im Log (`TaskResult → Odds`) hält seine Stufe wie
> bisher fest. Alte Kampagnen und Dateien mit gewählter Stufe laden weiter; die Stufe wird
> übergangen. Der Ausschnitt dazu liegt unter
> [`changes/2026-11-27-die-stufe-beim-wuerfeln.png`](../changes/2026-11-27-die-stufe-beim-wuerfeln.png).

> Am 27. November 2026 freigegeben (Kennzeichen **2026-11-27**): **Handel, Schritt 1.** Spekulation mit einem
> Markt je Welt und Woche (Warenwurf und Preiswürfe als Logeinträge, Makler und Fertigkeit),
> Ladungen im Laderaum statt einer freien Tonnenzahl, Fracht- und Passagierangebote je Ziel, das
> angekündigte Ziel am Schiff, zahlende Passagiere an der Reise, Postvertrag und private Botschaften, Reisezonen am Hex, die Tabellen
> aus SE 9 und SE 22 als Referenzdaten. Regeln in [`handel.md`](handel.md). Der Ausschnitt dazu
> liegt unter [`changes/2026-11-27-handel.png`](../changes/2026-11-27-handel.png).

> Am 27. November 2026 freigegeben (Kennzeichen **2026-11-27b**): **Mehrere Warenwürfe je Markt** (Hausregel).
> Statt eines Warenwurfs je Woche (SR 52) darf jeder Charakter der Gruppe je Markt 1 + seine Stufe
> in Admin oder Streetwise würfeln. `Market.goods` wird eine Liste, `Market.purchase` wird
> `purchases` (je Warenwurf ein Kaufpreis), und der Warenwurf verweist auf den Charakter, der
> gewürfelt hat (`by`). Regeln in [`handel.md`](handel.md). Der Ausschnitt dazu liegt unter
> [`changes/2026-11-27b-mehrere-warenwuerfe.png`](../changes/2026-11-27b-mehrere-warenwuerfe.png).

> Am 27. November 2026 freigegeben (Kennzeichen **2026-11-27c**): **Aufträge zu mehreren Zielen.** Mit dem
> UI-Vorschlag des Owners: Das angekündigte Ziel entfällt (`Ship.destination`). Fracht, Fahrgäste
> und private Botschaften zu verschiedenen Welten dürfen zugleich an Bord sein, Umwege sind
> erlaubt, bezahlt wird bei Ankunft am Ziel. Neu sind die Fahrgäste an Bord (`Fare`, `Ship.fares`)
> und `Journey.low`; private Botschaften gibt es je Ziel statt je Markt. Alle Lose eines Ziels und
> alle Warenwürfe eines Markts würfelt die App beim ersten Blick auf einmal. Regeln in
> [`handel.md`](handel.md). Der Ausschnitt dazu liegt unter
> [`changes/2026-11-27c-auftraege-zu-mehreren-zielen.png`](../changes/2026-11-27c-auftraege-zu-mehreren-zielen.png).

> Am 27. November 2026 freigegeben (Kennzeichen **2026-11-27d**): **Reparatur außerhalb des Kampfs.**
> Eine Detailseite *Schaden* im Bereich Schiff und in der Werft. Unterwegs flickt ein Charakter
> einen Treffer (2W6 + Engineering 10+, einmal je Woche); in der Werft repariert ein Engineer mit
> Engineering-1 oder mehr selbst ganz (8+, Material zum halben Werftpreis, beim Fehlschlag eine
> Gebühr; ein Treffer je Tag oder ein kritischer je Woche); die Werft repariert, was man auswählt.
> Neu im Bild: der Logeintrag `ShipRepair`. Regeln in [`schiffe.md`](schiffe.md) unter *Reparatur
> außerhalb des Kampfs*. Der Ausschnitt dazu liegt unter
> [`changes/2026-11-27d-reparatur.png`](../changes/2026-11-27d-reparatur.png).
