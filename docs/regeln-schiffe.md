# Regeln für Schiffe

Dieses Dokument ersetzt beim Entwickeln das Nachschlagen in den PDFs. Es fasst **alle Regeln und
Tabellen zu Spielerschiffen** zusammen: Schiffsarten und -aufbau, Kauf und laufende Kosten, Crew,
Standardentwürfe, Handel und Gewerbe, Raumkampf. Quelle ist das *Rules Booklet* der Starter Edition
(Kapitel *Travel*, *Starship Economics*, *Starships*, *Computers*, *Space Combat*, *Trade and
Commerce*); die zugehörigen Tabellen stehen im Heft *Charts and Tables*, das für dieses Dokument
**nicht vorliegt** — fehlende Tabellen stehen unter [Lücken](#lücken-fehlende-tabellen-aus-se).
Es ist ein Nachschlagewerk, kein Modell: Was die App davon baut, kommt wie immer zuerst ins
Domänenmodell ([`domain-model.md`](domain-model.md)).

**Reisen als Passagier** (High/Middle/Low Passage, Travellers' Aid Society, Low Lottery) ist bereits
modelliert, siehe `domain-model.md` unter *Zeit und Reisen*; hier geht es um das **eigene Schiff**.
Das **Reisen mit eigenem Schiff** ist seit 16. November 2026 modelliert und gebaut (Änderung
2026-11-16d, noch zur Freigabe eingereicht): Sprung bis zur Sprungzahl des Entwurfs, Treibstoffverbrauch
je Sprung als Hausregel, Fehlsprung als Wurf – siehe `domain-model.md` unter *Eigenes Schiff*.

## Quellen und Schreibweise

| Kürzel | Buch | Seitenangaben |
|---|---|---|
| **SR** | *Traveller Starter Edition*, Teil 1: *Rules Booklet* (GDW 1983), Kapitel *Travel* (S. 27–28), *Starship Economics* (S. 29–30), *Starships* (S. 31–37), *Computers* (S. 38–39), *Space Combat* (S. 39–42), *Trade and Commerce* (S. 52) | gedruckte Seitenzahl; im PDF ist es die Seite + 2 |
| **SE** | *Traveller Starter Edition*, Teil 2: *Charts and Tables* (GDW 1983) | liegt als PDF vor (CD-ROM „Classic Traveller“, `CT Traveller Starter Edition 2 Charts.pdf`); gedruckte Seite = PDF-Seite − 2 |

- Regeltexte sind auf Deutsch zusammengefasst, Tabellen (soweit aus SR bekannt) vollständig
  übernommen. Namen aus den Tabellen (Schiffstypen, Komponenten, Programme) bleiben englisch, wie in
  der App.
- „1D“, „2D“ heißt 1W6, 2W6; „8+“ heißt „8 oder mehr auf 2W6“; „DM“ ist ein Würfelmodifikator.
- Preise in Credits (Cr) bzw. Megacredits (MCr, 1 MCr = 1.000.000 Cr), Gewicht/Tonnage in Tonnen
  (1 t = 14 m³).

**Stand in der App** je Regel:

| Zeichen | Bedeutung |
|---|---|
| ✔ | umgesetzt |
| ◐ | teilweise umgesetzt |
| ○ | offen |
| ✱ | Hausregel der App (weicht ab oder ergänzt) |

Da noch nichts davon gebaut ist, steht bei jeder Regel unten **○**; die Spalte ist trotzdem schon da,
für den Tag, an dem es losgeht.

## Überblick

| Regel | Quelle | App |
|---|---|---|
| [Schiffsarten und Begriffe](#schiffsarten-und-begriffe) | SR 31 | ○ |
| [Schiffskauf und Finanzierung](#schiffskauf-und-finanzierung) | SR 29 | ○ |
| [Laufende Kosten](#laufende-kosten) | SR 30 | ○ |
| [Einnahmen](#einnahmen) | SR 30 | ○ |
| [Hafengebühren und Handelsbräuche](#hafengebühren-und-handelsbräuche) | SR 31 | ○ |
| [Schiffspannen](#schiffspannen) | SR 28–29 | ○ |
| [Piraterie, Entführung und Zahlungsausfall](#piraterie-entführung-und-zahlungsausfall) | SR 28–29 | ○ |
| [Schiffsaufbau](#schiffsaufbau) | SR 31–33 | ○ |
| [Optionale Komponenten](#optionale-komponenten) | SR 32–33 | ○ |
| [Crew](#crew) | SR 33 | ○ |
| [Computer und Software](#computer-und-software) | SR 38–39 | ○ |
| [Standardentwürfe](#standardentwürfe) | SR 35–37 | ○ |
| [Kleine Schiffe (Small Craft)](#kleine-schiffe-small-craft) | SR 33–35 | ○ |
| [Schiffsbegegnungen im System](#schiffsbegegnungen-im-system) | SR 42 | ○ |
| [Handel und Gewerbe](#handel-und-gewerbe) | SR 52 | ○ |
| [Raumkampf](#raumkampf) | SR 39–42 | ○ |

---

## Schiffsarten und Begriffe

*SR 31, „Definitions“.*

- **Vessel**: Oberbegriff für jedes interplanetare oder interstellare Fahrzeug.
- **Ship / Starship**: ein Schiff mit Jump Drive, kann zwischen Sternen reisen; mindestens 100 t.
- **Non-Starship**: ein Schiff ohne Jump Drive, nur innerhalb eines Sternsystems unterwegs.
- **Small Craft**: jedes Schiff unter 100 t; immer ohne Jump Drive (siehe
  [Kleine Schiffe](#kleine-schiffe-small-craft)).
- **Hull**: der Rumpf, in Tonnen angegeben; 1 t = 14 m³ (das Volumen von einer Tonne flüssigem
  Wasserstoff). Ein Rumpf gliedert sich in den **Engineering-Bereich** (Antriebe, Energie) und den
  **Hauptbereich** (alles andere: Brücke, Computer, Kabinen, Niedrigpassage-Betten, Treibstoff,
  Laderaum, Bewaffnung).
- Schiffe werden **an Werften** gekauft: eine Klasse-A-Werft kann jedes Schiff mit Jump Drive bauen,
  eine Klasse-B-Werft nur Schiffe und Small Craft ohne Jump Drive.

---

## Schiffskauf und Finanzierung

*SR 29, „Starship Purchase“.*

- **Bankfinanzierung**: 20 % Anzahlung, dann 1/240 des Barpreises je Monat über 480 Monate (40
  Jahre). Zinsen und Gebühren machen die Gesamtsumme auf **220 % des Barpreises**.
- Die Bank verlangt einen **Wirtschaftsplan**, der die monatlichen Raten plausibel sichert; ohne
  gesichertes Einkommen (z. B. Mieteinnahmen) scheitert das meist bei Yachten, Militärschiffen oder
  Forschungsschiffen.
- **Subventionierte Schiffe** (ab 600 t Rumpf): die Regierung sichert dem Schiff eine feste Route
  mit 2 bis 12 Welten zu. Anzahlung wie gewohnt, danach trägt die Regierung 50 % der monatlichen
  Rate. Das Schiff kann im Kriegs- oder Notfall mobilisiert werden; nach 20 Jahren ist es
  schuldenfrei, bleibt aber weiter mobilisierbar.
- **Bauzeit** richtet sich nach dem Rumpf (siehe [Standardentwürfe](#standardentwürfe) für Beispiele,
  9 bis 25 Monate); eine Werft verlangt bei Bestellung **20 % Anzahlung** und einen Nachweis der
  Finanzierung.
- **Naval Architects**: ein eigener Entwurf (statt eines Standardentwurfs) kostet 1 % des
  Schiffspreises und dauert vier Wochen Planung (2 Wochen gegen 1,5 % Aufpreis).
- **Standardentwürfe** sind 10 % günstiger als ein gleichwertiger Eigenentwurf und schneller gebaut;
  gebrauchte Standardschiffe (10–40 Jahre alt) kosten 10–40 % weniger, nach Ermessen der
  Spielleitung.

---

## Laufende Kosten

*SR 30, „Starship Expenses“.*

| Kostenart | Betrag |
|---|---|
| Treibstoff, raffiniert | Cr500 pro Tonne |
| Treibstoff, unraffiniert | Cr100 pro Tonne |
| Lebenserhaltung je besetzter Kabine | Cr2.000 pro zweiwöchiger Reise |
| Lebenserhaltung je belegtem Niedrigpassage-Bett | Cr100 pro Nutzung |
| Routinewartung (jährlich, Klasse-A/B-Hafen, 2 Wochen) | 0,1 % (1/1000) des Barpreises |
| Gehälter der Crew | nach der Gehaltstabelle (NSC; fehlt, siehe [Lücken](#lücken-fehlende-tabellen-aus-se)), + 10 % je Erfahrungsstufe über 1 |

- **Treibstoffverbrauch** hängt von Antriebs- und Energiewerksgröße ab (siehe
  [Schiffsaufbau](#schiffsaufbau), *Fuel*). **Stand in der App:** die Formel braucht
  Energiewerks-Ratings, die die Referenzdaten nicht haben; die App rechnet je Sprung
  `Tank ÷ Sprungzahl` gerundet (`ShipDesign./jumpFuel`, Hausregel).
- Ohne jährliche Wartung steigt das Ausfallrisiko (siehe [Schiffspannen](#schiffspannen)).

---

## Einnahmen

*SR 30, „Revenue“.*

Schiffe verdienen an **Fracht**, **Passagieren** und **Post**.

- **Fracht**: Die Spielleitung würfelt an jedem erreichbaren Zielort Haupt-, Neben- und
  Gelegenheitsfracht (Tabelle fehlt, siehe [Lücken](#lücken-fehlende-tabellen-aus-se)); Fracht wird
  fest zu **Cr1.000 pro Tonne** befördert (unabhängig von der Distanz, pro Sprung). Der
  Schiffseigner kann Fracht auch selbst kaufen und spekulativ weiterverkaufen (siehe
  [Handel und Gewerbe](#handel-und-gewerbe)).
- **Passagiere**: Zahl und Klasse ergeben sich aus einer Passagiertabelle nach Bevölkerung und
  Zielzone (fehlt). Preise: High Cr10.000, Middle Cr8.000, Low Cr1.000 (wie beim eigenen Reisen als
  Passagier). Jump-Nummer beeinflusst den Preis nicht, nur wie viele Tickets für dieselbe Strecke
  nötig sind.
- **Post**: nur für subventionierte Schiffe, gegen feste Vergütung (Cr25.000, mindestens Cr5.000 je
  Tonne Postfracht, höchstens 5 t je Reise); das Schiff muss bewaffnet sein und einen Gunner in der
  Crew führen.
- **Private Post/Botengänge**: 9+ für ein Angebot, Bote erhält ein Honorar nach Würfel.

---

## Hafengebühren und Handelsbräuche

*SR 31, „Trade Customs“.*

- **Lieferung**: Fracht/Passagiere/Post gelten als geliefert, sobald sie im Orbit (für Orbitalfracht)
  oder auf der Oberfläche (bei Lieferung dorthin) abgesetzt sind.
- **Shuttle-Service**: an jedem Klasse-A/B/C-Hafen, Cr10 pro Tonne Fracht, Cr20–120 pro Passagier
  (Zuschlag für Eile).
- **Charter**: Nicht-Schiffe (Small Craft) werden stundenweise gechartert (Cr1 pro Tonne und Stunde,
  12-Stunden-Blöcke); Schiffe werden für zwei Wochen gechartert: Cr900 pro Tonne Laderaum **plus**
  Cr9.000 je High-Passage-Kabine **plus** Cr900 je Low-Passage-Bett. Der Eigner trägt alle Kosten
  und stellt die Crew.
- **Berthing Costs** (Lande- und Standgebühren): Cr100 pauschal für bis zu sechs Tage, danach Cr100
  je weiterem Tag; lokal auch niedriger oder erlassen.

---

## Schiffspannen

*SR 28–29, „Starship Malfunctions“.*

- **Drive Failure**: wöchentlicher Wurf 13+ (Versagen); DMs **+1** bei unraffiniertem Treibstoff,
  **+1** je fehlendem Ingenieur, **+1** je Monat über der fälligen Jahreswartung. Bei Versagen: Wurf
  7+, welcher Antrieb (Jump/Maneuver/Power Plant) ausfällt. Ausgefallene Antriebe liefern keinen
  Schub mehr; ein ausgefallener Jump Drive kann keinen Sprung mehr tragen; ein ausgefallenes
  Energiewerk liefert nur noch Lebenserhaltung und Grundlicht. Batterien halten dabei 1W Tage.
  Reparatur: wöchentlicher Wurf 10+ je Techniker mit Engineering, vollständige Reparatur nur mit
  Ersatzteilen an einem Hafen durch Fachpersonal.
- **Misjump**: bei jedem Sprung Wurf 13+ (Fehlsprung); DMs **+1** bei unraffiniertem Treibstoff,
  **+5** innerhalb 100 Planetendurchmessern eines Himmelskörpers, **+15** innerhalb 10
  Planetendurchmessern. Bei 16+ wird das **Schiff zerstört**. Sonst: zufälliger Fehlsprung
  (1W bestimmt, wie viele Würfel für die Distanz in Hexfeldern geworfen werden; 1W die Richtung von
  sechs; 1W die Wochen im Jump Space, bevor das Schiff wieder auftaucht). **Stand in der App:**
  der Wurf 2W6 je Sprung mit eigenem Schiff ist umgesetzt (`Journey.jump`, `/misjump` bei 13+,
  ohne DMs); die Folgen – zufälliger Zielort, Wochen im Jump Space, Schiff vernichtet bei 16+ –
  entscheidet der Owner im Spiel, die App würfelt sie nicht.

---

## Piraterie, Entführung und Zahlungsausfall

*SR 28–29, „Lesser Known Aspects of Space Travel“, „Hijacking“, „Skipping“, „Piracy“.*

- **Low Lottery**: der Kapitän legt Cr10 je Niedrigpassagier in einen Lotterietopf; wer die Zahl der
  Überlebenden am genauesten trifft, gewinnt den Topf (vom Steward verwaltet).
- **Travellers' Aid Society**: Mitglieder erhalten alle zwei Monate eine High Passage als Dividende
  (kann verfallen, später genutzt oder zu 90 % des Werts verkauft werden). Mitgliedschaft über
  Mustering-out-Vorteil oder Kauf für Cr1.000.000 (Bewerbungsausschuss, 4+, sonst Ablehnung ohne
  zweiten Versuch); lebenslang, nicht übertragbar.
- **Hijacking**: Schiffscomputer bewachen die Kontrollbereiche; Passagiere werden auf Waffen
  kontrolliert. Wurf 18+ (3W) pro Reise für einen Entführungsversuch (nur wenn nicht alle Passagiere
  SC sind). Zugriff auf die Brücke nur bei 5− gegen das Anti-Hijack-Programm.
- **Skipping**: der Eigner/Kapitän veruntreut das finanzierte Schiff. Wurf 12+ je Landung, ob
  Behörden es bemerken; danach drohen Pfändungstrupps (12+ zur Vermeidung, DM **+1** je 5 Parsec
  Entfernung vom Heimatplaneten des Schiffs, **+9**, wenn es zum zweiten Mal binnen zwei Monaten auf
  derselben Welt landet).
- **Piracy**: Schiffe können beim Ein- oder Austritt aus einem System von Piraten angegriffen
  werden, auch Zoll- oder Militärkontrollen samt Blockaden sind möglich; siehe
  [Schiffsbegegnungen im System](#schiffsbegegnungen-im-system).

---

## Schiffsaufbau

*SR 31–32, „Ship Design“, „Required Starship Components“.*

Ein Schiff besteht aus einem **Rumpf** (Hull, in Tonnen) mit Antrieben, Energiewerk, Treibstoff,
Lebenserhaltung, Ausrüstung, Bewaffnung, Steuerung, Computer, Laderaum. Pflichtteile:

- **A. Die Brücke**: mindestens 2 % der Schiffstonnage (min. 20 t) für Grundsteuerung,
  Kommunikation, Avionik, Sensoren. Kostet MCr0,05 pro 100 t.
- **B. Kabinen (Staterooms)**: je eine Person, 4 t, Cr500.000. Doppelbelegung (max. 2 Personen) ist
  bei Forschungs-, Militär- und Privatschiffen möglich, verdoppelt aber den Lebenserhaltungsbedarf.
  Ein kommerzielles Schiff braucht eine Kabine je Crewmitglied.
- **C. Niedrigpassage-Betten**: je 0,5 t, Cr50.000; dienen auch als Notfall-Kälteschlaf. Es gibt
  zusätzlich **Notfall-Niedrigbetten** (1 t, Cr100.000, 4 Personen, keine zahlenden Passagiere).
- **D. Treibstoff**: Formel `0,1 × Jn × M + 10 × Pn` (M = Schiffstonnage, Jn = Jump-Zahl, Pn =
  Energiewerk-Rating) für Energiewerk + Antrieb vier Wochen lang plus einen Sprung; ein niedrigerer
  Treibstoffstand erlaubt nur einen entsprechend niedrigeren Sprung. Der **Tank selbst kostet
  nichts** („there is no cost“, SR 32); bezahlt wird nur der Treibstoff, mit dem man ihn füllt
  (siehe [Laufende Kosten](#laufende-kosten)).
- **E. Laderaum (Cargo Hold)**: **kostenlos** in der Planung („there is no cost“, SR 32); die
  Kapazität begrenzt nur, wie viel Fracht hineinpasst.
- **F. Bewaffnung**: jeder **Hardpoint** kostet Cr100.000 (keine Tonnage), egal ob genutzt. Ein
  **Turret** braucht 1 t Feuerleitung; Single/Double/Triple-Mounts fassen 1/2/3 Waffen. Verfügbare
  Waffen: Pulse Laser, Beam Laser, Missile Rack, Sandcaster (siehe [Raumkampf](#raumkampf)). Waffen
  lassen sich nachträglich aufrüsten (Pulse → Beam → Dreifachturm).

**Antriebe und Energiewerk**: Rumpfgröße bestimmt den Tonnagebedarf je Antriebsbuchstabe (A–Z, ohne
I/O); die Tabelle dazu fehlt (siehe [Lücken](#lücken-fehlende-tabellen-aus-se)). Ein Non-Starship
braucht Maneuver Drive + Power Plant, ein Starship zusätzlich Jump Drive; das Energiewerk muss
mindestens so stark sein wie der höhere Buchstabe von Maneuver und Jump Drive. Aus den
Standardentwürfen (siehe unten) sind einige Werte bekannt: Antrieb-A liefert in einem 100-t-Rumpf
1G bzw. Jump-1; Antrieb-D liefert in einem 800-t-Rumpf Jump-2.

**Computer**: ein Modell-4-Computer oder besser ist Pflicht für Jump-4 und höher (siehe
[Computer und Software](#computer-und-software)).

---

## Optionale Komponenten

*SR 32–33, „Optional Components“.*

- **Atmosphärische Streulinienform (Streamlining)**: MCr1 pro 100 t, erlaubt Landung auf
  Planetenoberflächen und das Auftanken an Gasriesen (Skimming) oder in Gewässern; muss beim Bau
  vorgesehen werden, nicht nachrüstbar.
- **Ship's Locker**: Grundausstattung (Schutzkleidung, Vacc Suits, Handfeuerwaffen, Munition,
  Kompasse, Überlebensausrüstung); Kosten vernachlässigbar, Inhalt liegt im Ermessen der
  Spielleitung.
- **Ship's Vehicles**: zusätzliche Fahrzeuge/Small Craft an Bord, eigene Tonnage für Hangar/Stauraum
  nötig (siehe [Standardentwürfe](#standardentwürfe) für Beispiele: Air/Raft, Ship's Boat, ATV,
  Cutter-Module).

---

## Crew

*SR 33, „Ship Crews“.*

| Position | Pflicht ab | Bedingung |
|---|---|---|
| Pilot | jedes Schiff | mindestens Pilot-1 (Small Craft: Boat-1) |
| Navigator | > 200 t | Pilot kann es bei ≤ 200 t übernehmen |
| Engineer | je 35 t Antrieb + Energiewerk | mindestens Engineer-1; < 200 t nicht zwingend |
| Steward | je 8 zahlende Hochpassagiere | mindestens Steward-0 |
| Medic | Schiff ≥ 200 t, und je 120 Passagiere | mindestens Medic-1 bzw. -0 |
| Gunner | je bestücktem Turret | mindestens Gunnery-1; optional, wenn keine Bedrohung erwartet wird |

- Eine Person kann **zwei Positionen** ausfüllen (Gehalt 75 % je Position, mindestens Stufe 2 in
  beiden außer Steward, der Stufe 1 braucht); mehr als zwei nur im Notfall.
- Schiffe > 1000 t: zusätzlich Captain, Executive Officer, mindestens drei Verwaltungskräfte;
  mindestens 10 Crewmitglieder je 1000 t.
- Die ranghöchste Person einer Sektion mit mehreren Mitgliedern (Chief Engineer, Chief Steward/
  Purser, Chief Medic/Ship's Doctor) erhält 10 % mehr Gehalt.
- Zusätzliche Positionen nach Bedarf (z. B. Laborpersonal, Kontaktspezialist für Alienkontakt).

---

## Computer und Software

*SR 38–39, „Computers“; Tabellen SE 10 und 13.*

Der Computer steuert alle Schiffsfunktionen; **CPU** (gleichzeitig laufende Programme) und
**Storage** (bereitgehaltene Programme, die man in die CPU tauschen kann) sind in *Space*
angegeben. Modelle 1 bis 7, je mit einer „bis"-Version (nächste Sprungstufe, aber Softwarewert
und Ausrüstung des darunterliegenden Modells). Die Modellzahl ist zugleich die höchste
unterstützte Sprungzahl: für Jump-4 braucht das Schiff einen Computer Modell/4 oder besser
*zusätzlich* zum eingebauten Jump Drive.

### Computer (SE 10, „Computers“)

| Modell | Preis MCr | Tonnen | Kapazität CPU/Storage | TL |
|---|---|---|---|---|
| Modell/1 | 2 | 1 | 2/4 | 5 |
| Modell/1bis | 4 | 1 | 4/0 | 6 |
| Modell/2 | 9 | 2 | 3/6 | 7 |
| Modell/2bis | 18 | 2 | 6/0 | 8 |
| Modell/3 | 18 | 3 | 5/9 | 9 |
| Modell/4 | 30 | 4 | 8/15 | A |
| Modell/5 | 45 | 5 | 12/25 | B |
| Modell/6 | 55 | 7 | 15/35 | C |
| Modell/7 | 80 | 9 | 20/50 | D |

Beispiel aus SR 12 (Scout/Courier „Suleiman“): Modell/1 → CPU = 2, Storage = 4; von den
gespeicherten Programmen laufen jederzeit höchstens so viele, wie die CPU fasst; in der
Reprogramming-Phase des Zuges tauscht man um.

**Standard Software Packages** (SE 10/13): Jeder Computer kommt mit einem Softwarepaket, das
der Käufer aus der Liste wählt; sein Wert: **MCr gleich der Modellzahl** (1bis und 2bis zählen
dabei als 1 bzw. 2). Das Kredit ist kein Bargeld („may not be converted to cash“).

### Software List (SE 13)

Space = Platzbedarf in CPU *und* Storage, Preis in MCr. Die letzten Spalten (*Schreiben*) sind
die Anforderungen an Personen, die das Programm selbst schreiben wollen (spart das Geld, kann
aber *Fatal Flaws* geben, SR 39).

**Offensiv** (nur mit Bewaffnung sinnvoll):

| Programm | Space | MCr | Schreiben | Wirkung |
|---|---|---|---|---|
| Predict-1 | 1 | 2 | 1, Navig-1 | DM +1 auf Trefferwurf |
| Predict-2 | 2 | 4 | 1, Navig-2 | DM +2 |
| Predict-3 | 1 | 6 | 1, Navig-3 | DM +2 |
| Predict-4 | 3 | 8 | 1, Navig-4 | DM +3 |
| Predict-5 | 2 | 10 | 2, Navig-5 | DM +3 |
| Gunner Interact | 1 | 1 | 2, Gunnery-2 | Fertigkeit des Gunners wird DM |
| Target | 1 | 1 | 2, Navig-2 | Pflicht für jedes Feuer der Turrets |
| Select-1 | 1 | 0,5 | 1, Gunnery-2 | Zielwahl Hauptbereich/Engineering, DM −2 |
| Select-2 | 2 | 0,8 | 2, Gunnery-3 | wie Select-1, DM −1 |
| Select-3 | 1 | 1 | 3, Gunnery-4 | wie Select-1, ohne DM |
| Multi-Target-2 | 1 | 1 | 2, Gunnery-2 | Turrets auf 2 Ziele zugleich |
| Multi-Target-3 | 2 | 2 | 2, Gunnery-3 | auf 3 Ziele |
| Multi-Target-4 | 4 | 3 | 3, Gunnery-4 | auf 4 Ziele |
| Launch | 1 | 2 | 1, Gunnery-2 | Raketen und Sand abschussfähig |
| Double Fire | 4 | 4 | 2, Engineer-3 | doppelter Laserschuss, Überlastrisiko |

**Defensiv**:

| Programm | Space | MCr | Schreiben | Wirkung |
|---|---|---|---|---|
| Maneuver/Evade-1 | 1 | 1 | 1, Pilot-2 | Verteidigungs-DM −¼ Pilotenstufe |
| Maneuver/Evade-2 | 2 | 2 | 1, Pilot-3 | −½ Pilotenstufe |
| Maneuver/Evade-3 | 3 | 3 | 2, Pilot-4 | −¾ Pilotenstufe |
| Maneuver/Evade-4 | 4 | 4 | 2, Pilot-5 | − volle Pilotenstufe |
| Maneuver/Evade-5 | 5 | 5 | 3, Pilot-6 | − volle Pilotenstufe |
| Maneuver/Evade-6 | 3 | 6 | 3, Pilot-7 | −5 |
| Auto-Evade | 1 | 0,5 | 2, Pilot-4 | wie Maneuver/Evade, schwächer: −2 |
| Return Fire | 1 | 0,5 | 2, Gunnery-3 | automatisches Rückfeuer |
| Anti-Missile | 2 | 1 | 3, Gunnery-3 | Laser gegen Raketen im eigenen Band |
| ECM | 3 | 4 | 4, Electronics-3 | Raketen explodieren folgenlos bei 7+ |

**Routine** (Betrieb ohne Waffen):

| Programm | Space | MCr | Schreiben | Wirkung |
|---|---|---|---|---|
| Maneuver | 1 | 0,1 | 1, Pilot-1 | Pflicht für den Maneuver Drive |
| Jump-1 | 1 | 0,1 | 1, Pilot/Navig-1 | Pflicht für Sprung 1 |
| Jump-2 | 2 | 0,3 | 2, Pilot/Navig-2 | Pflicht für Sprung 2 |
| Jump-3 | 3 | 0,4 | 2, Pilot/Navig-3 | Pflicht für Sprung 3 |
| Jump-4 | 4 | 0,5 | 3, Pilot/Navig-4 | Pflicht für Sprung 4 |
| Jump-5 | 5 | 0,6 | 3, Pilot/Navig-5 | Pflicht für Sprung 5 |
| Jump-6 | 6 | 0,7 | 4, Pilot/Navig-6 | Pflicht für Sprung 6 |
| Navigation | 1 | 0,4 | 3, Navig-3 | führt den Sprung aus |
| Generate | 1 | 0,8 | 3, Navig-4 | erstellt den Flugplan (sonst Kassette Cr10.000) |
| Anti-Hijack | 1 | 0,1 | 1, Tactics-1 | sperrt Kontrollbereiche; Umgehung auf 5− |
| Library | 1 | 0,3 | 1, keine | Nachschlagewerk zu Region/Subsektor |

- **Fatal Flaws**: selbstgeschriebene Programme können einen verborgenen Fehler haben (Wurf 11+,
  Ermessen der Spielleitung).
- **Small Craft**: brauchen keinen Computer; ohne Computer DM −1 auf Waffeneinsatz und keine
  zweite Waffe gleichzeitig nutzbar.

---

## Standardentwürfe

*SR 35–37, „Standard Ship Design Plans“.* Alle zu Cr100 Bauplänen erhältlich, 10 % günstiger als
ein Eigenentwurf.

| Typ | Code | Rumpf | Antrieb | Treibstoff | Computer | Kabinen | Niedrigbetten | Hardpoints | Vehikel | Laderaum | Crew | Preis | Bauzeit |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Scout/Courier | S | 100 t | Jump-A/Maneuver-A/Power-A → Jump-2, 2G | 40 t | Modell/1bis | 4, keine für Fracht | 0 | 1 (Doppelturm, unbestückt) | 1 Air/Raft | 3 t | 1 (Pilot/Engineer) | MCr29,43 | 9 Monate |
| Free Trader | A | 200 t | A/A/A → Jump-1, 1G | 30 t | Modell/1 | 10 | 20 | 2 (unbestückt) | keine | 82 t | 4 (Pilot, Engineer, Medic, Steward) | MCr37,08 | 11 Monate |
| Subsidized Merchant („Fat Trader“) | R | 400 t | C/C/C → Jump-1, 1G | 50 t | Modell/1 | 13 | 9 | 2 (unbestückt) | 1 × 20-t-Launch | 200 t | 5 (+ Pilot für Launch) | MCr101,03 | 14 Monate |
| Subsidized Liner | M | 600 t | J/C/J → Jump-3, 1G | 210 t | Modell/3 | 30 | 20 | 3 (unbestückt) | 1 × 20-t-Launch | 129 t | 9 | MCr236,97 | 22 Monate |
| Yacht | Y | 200 t | A/A/A → Jump-1 (2× in Folge), 1G | 50 t | Modell/1 | 14 (zwei zu Suite verbunden) | 0 | 1 (unbestückt) | Air/Raft, 30-t-Boot, ATV | 11 t | 4 (Pilot, Engineer, Medic, Steward) | MCr51,06 | 11 Monate |
| Mercenary Cruiser | C | 800 t | M/M/M → Jump-3, 3G | 318 t | Modell/5 | 25 | 0 | 8 (8× Dreifachturm, unbestückt) | 2 Modular Cutter, 2 ATV, 1 Air/Raft | 80 t | 8 | MCr445,95 | 25 Monate |
| Patrol Cruiser | T | 400 t (Custom) | F/H/H → Jump-3, 4G | 160 t | Modell/3 | 12 | 4 | 4 (2× Dreifachturm: je 2 Laser + 1 Raketenwerfer) | GCarrier, 30-t-Boot | 50 t | 10 | MCr221,04 | 16 Monate |
| Laboratory Ship | L | 400 t | D/C/F → Jump-2, 1G | 90 t | Modell/2 | 20 | 0 | 2 (unbestückt) | 2 Air/Raft, 1 × 40-t-Pinnace | 23 t (+ 85 t Labor) | 5 | MCr158,98 | 14 Monate |
| Safari Ship | K | 200 t | B/A/B → Jump-2, 1G | 60 t | Modell/1bis | 11 | 0 | 1 (Doppelturm, unbestückt) | Air/Raft, 20-t-Launch | 6 t (+ 2 × 7 t Fangtank, 7 t Trophäenraum) | 5 | MCr81,08 | 11 Monate |

Besatzungen in der Spalte „Crew“ sind das Minimum; Gunner und einzelne Zusatzpositionen (Navigator
ab > 200 t usw.) kommen nach den Regeln unter [Crew](#crew) hinzu, wo nicht schon genannt.

---

## Kleine Schiffe (Small Craft)

*SR 33–35, „Small Craft“, „Standard Small Craft“.* Alle Entwürfe streamlined, alle mit Fuel Scoops
(Auftanken an Gasriesen). Crew: Pilot + Rider (außer Fighter: nur Pilot), der Rider kann Gunner,
Passagier oder Co-Pilot sein.

| Typ | Rumpf | Beschleunigung | Treibstoff | Bewaffnung (max.) | Computer (max.) | Exzess-Tonnage | Preis |
|---|---|---|---|---|---|---|---|
| Launch (Lifeboat) | 20 t | 1G | 1 t | nur Raketen/Sandcaster | Modell/2bis | 13 t | MCr14 |
| Ship's Boat | 30 t | 6G | 1,8 t | 1 Beam/Pulse Laser + Rest Raketen/Sand | Modell/3 | 13,7 t | MCr16 |
| Slow Boat | 30 t | 3G | 1 t | 1 Beam/Pulse Laser + Rest Raketen/Sand | Modell/3 | 19,9 t | MCr15 |
| Pinnace | 40 t | 5G | 2 t | 2 Laser + Rest Raketen/Sand | Modell/4 | 22,4 t | MCr20 |
| Slow Pinnace | 40 t | 2G | 1 t | 1 Beam/Pulse Laser + Rest Raketen/Sand | Modell/3 | 31,6 t | MCr18 |
| Modular Cutter | 50 t | 2G | 2 t | bis 2 Laser + Rest Raketen/Sand | Modell/4 | 2,5 t (+ austauschbare Module) | MCr28 (ohne Module) |
| Shuttle | 95 t | 3G | 2,85 t | nur Raketen/Sandcaster (max. Modell/4, dann keine Laser) | Modell/4 | 71 t | MCr33 |
| Fighter | 10 t | 6G | 1 t | 1 Laser **oder** bis 3 Raketen/Sandcaster | Modell/1 (eingebaut) | 1 t | MCr18 |

- **Fittings** (Exzess-Tonnage frei wählbar): Kabine (4 t), Passagiersitz (1 t je Person, kein
  eigenes Gewicht nötig für Pilot/Rider), Cargo (1 t = 1 t Fracht), Fuel (1 t = 1 t Treibstoff, trägt
  vier Wochen Betrieb je Einheit), Low Berth, Notfall-Niedrigbett (wie beim großen Schiff).
- **Module für den Modular Cutter** (je 30 t): **ATV-Modul** (MCr1,8, verstaut/landet ein ATV),
  **Fuel-Modul** (MCr1, 30 t Treibstofftank + Skimming-Ausrüstung), **Open-Modul** (MCr2, frei
  einteilbar: Sitze, Treibstoff, Fracht, Kabine).
- Bewaffnung: 1 t je installierter Waffe, bis zu drei Waffen (außer Fighter: fest zwei eingebaute
  Halterungen).

---

## Schiffsbegegnungen im System

*SR 42, „Starship Encounters“.*

Beim Eintritt in ein System würfelt die Spielleitung auf der **Starship Encounter Table** (fehlt,
siehe [Lücken](#lücken-fehlende-tabellen-aus-se)), die nach Hafenklasse gestaffelt ist; zwei Würfel,
DM je nach vorhandener Scout- oder Navy-Basis. Ein Strich bedeutet: keine Begegnung. Die
Tabelleneinträge nennen einen Schiffstyp (Buchstabencode der Standardentwürfe); ein angehängtes
**P** bedeutet Pirat (greift an oder versucht, in Angriffsposition zu kommen); ein **\*** bedeutet,
dass zusätzlich ein Small Craft nach der **Standard Small Craft Table** (fehlt) begegnet, vor oder
nach dem großen Schiff. Die Reaktion des begegneten Schiffs/der Crew kann nach der allgemeinen
Reaktionstabelle gewürfelt werden (siehe `regeln-kampf.md`, *Reaktion*).

---

## Handel und Gewerbe

*SR 52, „Trade and Commerce“.*

- Fracht wird meist pauschal zu **Cr1.000 pro Tonne** befördert. Spekulativer Handel: ein Schiff
  kauft Waren günstig und verkauft sie anderswo teurer, auf eigenes Risiko und eigene Rechnung.
- **Procedure**:
  1. Mit freiem Kapital und Laderaum: 2W würfeln, DM **+1**, wenn das Ursprungsvolk 9+ ist, DM
     **−1**, wenn 5− ist. Das modifizierte Ergebnis (unter 1 → 1, über 6 → 6) zeigt in der **Trade
     and Speculation Table** (fehlt) die beste verfügbare Warenart.
  2. **Menge**: 3W × 5 Tonnen (bei den Posten 51–56 der Tabelle: in Einzelstücken statt Tonnen,
     Menge und Grundpreis nach Ermessen der Spielleitung/Tabelle).
  3. **Einkaufspreis**: Grundpreis aus der Tabelle (konstant) nach einem DM-Wurf auf die **Actual
     Value Table** (fehlt), als Prozentsatz des Grundpreises.
  4. **Verkaufspreis**: am Zielort erneuter Wurf auf die Actual Value Table (andere DMs möglich),
     wieder als Prozentsatz des Grundpreises; Teilverkäufe sind mit 1 % Bearbeitungsgebühr auf die
     verkaufte Menge möglich.
- **Broker's Services**: ein Makler verlangt 5 % des Verkaufspreises (2 Makler: 20 %) und gibt dafür
  DM +1 bis +4 auf den Verkaufswurf; auch wenn der Verkäufer selbst nicht verkaufen will, muss der
  Makler bezahlt werden. Nur **ein** Makler darf je Verkauf helfen.
- **Character Skills**: Bribery- oder Admin-Fertigkeit gibt denselben DM wie ein Makler, nur **ein**
  Charakter darf je Verkauf mitwirken, auch nicht zusätzlich zu einem Makler.
- **Trade Classifications** (Handelscodes, siehe auch `domain-model.md` unter *Handelscode*):
  Agricultural, Non-Agricultural, Industrial, Non-Industrial, Rich, Poor; sie geben DMs auf Ein- und
  Verkaufswürfe nach der Trade and Speculation Table.

---

## Raumkampf

*SR 39–42, „Space Combat“.* Jede Spielrunde entspricht **1.000 Sekunden**; ein vollständiger
Spielzug besteht aus zwei Spielerzügen (je einer Seite), jeder in mehrere Phasen gegliedert.

### Turn Sequence und Bewegung

- Entfernungen werden in **Range Bands** gemessen, je Band ≈ 10.000 km; Schiffe bewegen sich nur vor
  oder zurück (kein seitliches Ausweichen).
- Jedes Schiff hat eine **Geschwindigkeit** (vorwärts oder rückwärts, als Zahl von Bands/Runde); in
  der Bewegungsphase darf sie um bis zu den Maneuver-Drive-Wert geändert werden, danach bewegt sich
  das Schiff um die neue Geschwindigkeit.
- **Boarding**: Ist der Maneuver Drive eines Schiffs ausgefallen, kann es von jedem Schiff im selben
  Band mit gleicher Geschwindigkeit geentert werden.

### Laserfeuer

1. Der aktive Spieler wählt für jedes Turret ein Ziel (alle Laser eines Turrets feuern gemeinsam auf
   ein Ziel, außer mit Multi-Target).
2. Angriffs-DMs werden zu einem Gesamt-DM summiert (meist aus Computerprogrammen, teils aus
   Schiffsschäden).
3. Das Ziel summiert seine Verteidigungs-DMs (Ausweichprogramme, Sand, Entfernung, Beschädigung).
4. 2W6 + Angriffs-DM − bzw. + Verteidigungs-DM ≥ 8 ⇒ Treffer; jeder feuernde Laser wird einzeln
   gewürfelt.
5. Für jeden Treffer wird die **Hit Location Table** (fehlt) konsultiert und der Schaden markiert.
- **Pulse Laser**: DM −1 beim Treffen, dafür bei Treffer **zwei** Schadenswürfe statt einem.
- **Shifting Fire**: ein Ziel darf nach der Zielwahl noch gewechselt werden (DM −6 zusätzlich zu
  allen anderen DMs), solange noch nicht gefeuert wurde.

### Laser Return Fire

- Nur Schiffe, die in der vorigen Laserfeuer-Phase selbst Ziel waren, dürfen zurückfeuern, und nur
  auf Schiffe, die auf sie gefeuert haben (Target- und Return-Fire-Programm nötig).
- **Anti-Missile Fire**: ebenfalls in dieser Phase, nur gegen Raketen im eigenen Band, kein
  Zielprogramm nötig.

### Ordnance Launch

- Raketen/Sand werden in dieser Phase **ausgelöst**, bewegen sich aber erst in der folgenden
  Bewegungsphase (mit der Geschwindigkeit des startenden Schiffs; danach wie ein Schiff mit
  Maneuver-Drive-6).
- Jeder Launcher/Sandcaster hält 3 Einheiten bereit; Nachladen dauert 3 Runden für einen vollen
  Launcher (durch den Turret-Gunner).
- **Missile Detonation**: trifft eine Rakete ihr Ziel (in der Bewegungsphase), detoniert sie in der
  folgenden Ordnance-Phase: 1W Treffer, je Treffer eine eigene Schadenslokalisierung.

### Detection und Tracking

- Zivile Schiffe entdecken auf bis zu einer halben Lichtsekunde (15 Bands), militärische/Scout-Schiffe
  auf zwei Lichtsekunden (60 Bands).
- Schiffe in völligem Funkstille/Orbit-Verstecken sind schwerer zu entdecken (halbe bzw. ein Achtel
  der normalen Reichweite).
- Einmal entdeckt, kann ein Schiff von **jedem** bis drei Lichtsekunden (90 Bands) weiter verfolgt
  werden (Tracking).

### Damage Definitions

| Treffer auf | Wirkung |
|---|---|
| Hull | dekomprimiert das Schiff; weitere Hull-Treffer ohne Zusatzeffekt |
| Hold | zerstört zufällig 10 t Fracht, ein Fahrzeug oder ein Small Craft |
| Fuel | entlässt ~10 t Treibstoff; reicht der Rest nicht mehr für einen Sprung, kann nicht gesprungen werden |
| Computer | DM −1 je Treffer auf den wöchentlichen (im Kampf: je Phase) Betriebswurf 1+; bei 12 Treffern dauerhaft ausgefallen |
| Drive/Power Plant | senkt den Buchstaben um eine Stufe; unter dem niedrigsten Tabellenwert zerstört, muss ersetzt werden |
| Turret | das getroffene Turret fällt komplett aus |
| Small Craft Cabin | Treffer entspricht einem Hull-Treffer (Dekompression), weitere ohne Zusatzeffekt |
| Small Craft Weaponry | zerstört die Bewaffnung des Small Craft |
| Small Craft Drive | das Small Craft kann sich nicht mehr bewegen/beschleunigen/feuern |

Mit dem **Selective**-Programm kann der Angreifer statt eines zufälligen Treffers (Wurf 1W: 1–2
Hauptbereich oder Engineering nach Wahl, 3+ normale Zufallslokalisierung) gezielt schießen.

### Special Situations

- **Decompression**: Schiffe dekomprimieren vorsorglich vor dem Kampf; einzelne Bereiche können
  gezielt druckbeaufschlagt bleiben. Repressurisierung dauert eine Runde. Ohne Vacc Suit bei
  Dekompression: Tod (außer bei sofort angelegtem Anzug, DEX+ auf 2W6, DM × 2 mit Vacc-Suit-Skill).
- **Abandon Ship**: militärische Schiffe können ihre Vehikel/Crew in einer Ordnance-Phase vollständig
  evakuieren; zivile Schiffe brauchen 1W Runden für alle Vehikel. Personen in Vacc Suits können
  einzeln evakuieren (6+ bzw. automatisch in der Folgerunde).
- **Damage Control**: Reparaturversuch während des Kampfs, 9+ (DM + Fertigkeit) je 1000-Sekunden-
  Runde und Reparaturversuch; völlig zerstörte Teile sind nicht reparierbar.
- **Repair Parts**: provisorische Reparatur aus dem Ship's Locker; volle Reparatur/Ersatz nur an
  einer Werft, Kosten ca. 10–120 % des Neuwerts der Baugruppe je nach Fall (2W, in 10 %-Schritten),
  DM −2 bei Reparatur durch die eigene Crew statt einer Werft.

### Starship Encounters (im Kampf)

Siehe [Schiffsbegegnungen im System](#schiffsbegegnungen-im-system).

---

## Lücken (fehlende Tabellen aus SE)

Das Heft *Charts and Tables* liegt inzwischen als PDF vor (siehe *Quellen*). Die meisten
Tabellen fehlen damit nicht mehr, sie sind nur noch **nicht übertragen** – sie kommen, wenn das
jeweilige Thema an der Reihe ist, vollständig hierher (Software List und Computer sind oben
schon übertragen). Als Fundstellen in SE sind bestätigt:

- **Standard Hulls**, **Drives and Power Plants**, **Drive Potential**, **Computers**,
  **Software List**, **Weapons and Mounts**, **Fittings**, **Bridge**, **Armaments** (SE 10)
- **Crew Requirements** mit Monatsgehältern (Cr6.000 Pilot, Cr5.000 Navigator, Cr4.000 Engineer,
  Cr3.000 Steward, Cr2.000 Medic, Cr1.000 Gunner; Mehrfachposition: Stufe −1, Gehalt 75 % beider
  Positionen) (SE 11)
- **Attacker’s/Defender’s DMs**, **Hit Locations**, **Critical Hits**, **Scales**, Beispiel einer
  Schiffs-Datenkarte (SE 12)
- **Starship Encounters**, **Standard Small Craft**, **Detection**, **Special Rules** (SE 13)
- **Technological Levels** (SE 16)
- **Trade and Speculation** (SE 22; die *Actual Value Table* und die *Cargo-* und
  *Passagiertabellen* sind noch zu suchen, vermutlich SE 9/22–23)

Wird eines dieser Themen für die App gebraucht, die Tabelle aus dem PDF vollständig hier
eintragen, erst danach ins Domänenmodell übernehmen.
