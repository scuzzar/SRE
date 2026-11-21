# Regeln für Schiffe

Dieses Dokument ersetzt beim Entwickeln das Nachschlagen in den PDFs. Es fasst **alle Regeln und
Tabellen zu Spielerschiffen** zusammen: Schiffsarten und -aufbau, Kauf und laufende Kosten, Crew,
Standardentwürfe, Handel und Gewerbe, Raumkampf. Quelle ist das *Rules Booklet* der Starter Edition
(Kapitel *Travel*, *Starship Economics*, *Starships*, *Computers*, *Space Combat*, *Trade and
Commerce*); die zugehörigen Tabellen stehen im Heft *Charts and Tables* (SE 10–13 sind übertragen,
was noch fehlt, steht unter [Lücken](#lücken-fehlende-tabellen-aus-se)).
Es ist ein Nachschlagewerk, kein Modell: Was die App davon baut, kommt wie immer zuerst ins
Domänenmodell ([`domain-model.md`](domain-model.md)).

**Reisen als Passagier** (High/Middle/Low Passage, Travellers' Aid Society, Low Lottery) ist bereits
modelliert, siehe `domain-model.md` unter *Zeit und Reisen*; hier geht es um das **eigene Schiff**.
Das **Reisen mit eigenem Schiff** ist seit 16. November 2026 modelliert und gebaut (Änderung
2026-11-16d, freigegeben): Sprung bis zur Sprungzahl des Entwurfs, Treibstoffverbrauch
je Sprung als Hausregel, Fehlsprung als Wurf – siehe `domain-model.md` unter *Eigenes Schiff*.

## Quellen und Schreibweise

| Kürzel | Buch | Seitenangaben |
|---|---|---|
| **SR** | *Traveller Starter Edition*, Teil 1: *Rules Booklet* (GDW 1983), Kapitel *Travel* (S. 27–28), *Starship Economics* (S. 29–30), *Starships* (S. 31–37), *Computers* (S. 38–39), *Space Combat* (S. 39–42), *Trade and Commerce* (S. 52) | gedruckte Seitenzahl; im PDF ist es die Seite + 2 |
| **SE** | *Traveller Starter Edition*, Teil 2: *Charts and Tables* (GDW 1983) | liegt als PDF vor (CD-ROM „Classic Traveller“, `CT Traveller Starter Edition 2 Charts.pdf`); gedruckte Seite = PDF-Seite − 2 |
| **MD** | *Mayday* (GDW 1978, Game 1), Regelheft; Brettspielfassung der Vektorbewegung aus Book 2 | Seite des PDF `CT_G01_Game_01a_Mayday_Game_Complete.pdf` (das Heft hat keine gedruckten Seitenzahlen) |
| **SS3** | *Special Supplement 3: Missiles*, überarbeitete Fassung (GDW 1984/1986) | gedruckte Seitenzahl |
| **HG** | *Book 5: High Guard* (GDW 1980) | gedruckte Seitenzahl; noch nicht ausgewertet |

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

Was noch nicht gebaut ist, steht unten mit **○**; wo die App eine Regel umsetzt, steht ihr Stand
dabei.

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
| [Schiffsbegegnungen im System](#schiffsbegegnungen-im-system) | SR 42 | ◐ (im Systemflug auf Knopfdruck, ohne Small Craft; 2026-11-21h) |
| [Handel und Gewerbe](#handel-und-gewerbe) | SR 52 | ○ |
| [Raumkampf](#raumkampf) | SR 39–42 | ◐ ✱ (Laserfeuer, Rückfeuer, Trefferzonen, Schaden, ein fremdes Schiff mit Absicht; 2026-11-21h) |
| [Vektorbewegung (Mayday, Supplement 3)](#vektorbewegung-mayday-supplement-3) | MD, SS3 4–11 | ◐ ✱ (Bewegung mit echter Schwerkraft als Systemflug, 2026-11-18c; Waffen, Raketen, Sand offen) |

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
| Gehälter der Crew | Heuer je Position nach SE 11 (siehe [Crew](#crew)), + 10 % je Erfahrungsstufe über 1 |

- **Treibstoffverbrauch** hängt von Antriebs- und Energiewerksgröße ab (siehe
  [Schiffsaufbau](#schiffsaufbau), *Fuel*). **Stand in der App:** die Formel braucht
  Energiewerks-Ratings, die die Referenzdaten nicht haben; die App rechnet je Sprung
  `Tank ÷ Sprungzahl` gerundet (`ShipDesign./jumpFuel`, Hausregel).
- Ohne jährliche Wartung steigt das Ausfallrisiko (siehe [Schiffspannen](#schiffspannen)).
- **Stand in der App** (2026-11-17b, `model/upkeep.ts`): Treibstoff ◐ (gekauft nur raffiniert, Cr500/t;
  unraffiniert kostenlos am Gasriesen geschöpft, 2026-11-21f);
  Lebenserhaltung je Kabine ✔✱ als Cr2.000 je Reisendem und Sprung mit dem eigenen Schiff
  (Doppelbelegung verdoppelt die Kosten; die Gruppe darf zur Not zu zweit in eine Kabine, für
  jeden Entwurf); Lebenserhaltung je Koje ○ (auf dem eigenen Schiff reist noch niemand in
  Kälteschlaf); Routinewartung ○; Gehälter ○ (kommen mit den Hirelings). Ein Monat ist ✱ vier
  Wochen; an jedem Monatsende werden die Raten gebucht, und eine Monatsabrechnung mit allen
  laufenden Kosten steht im Log.

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
  je weiterem Tag; lokal auch niedriger oder erlassen. **Stand in der App:** ✔✱ an Welten mit
  Raumhafen A bis E (2026-11-17b); ✱ das Schiff liegt dort, wo die Gruppe ist, solange es keinen
  eigenen Ort hat; niedrigere oder erlassene Gebühren ○.

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
  der Wurf 2W6 je Sprung mit eigenem Schiff ist umgesetzt (`Journey.jump`, `/misjump` bei 13+);
  DM +1 bei unraffiniertem Treibstoff ✔ seit 2026-11-21f (`Journey.jumpDm`, der Sprung
  verbraucht unraffinierten Treibstoff zuerst); die DMs für die Nähe zu Himmelskörpern kommen
  erst, wenn die App sie abbildet (Entscheidung des Owners,
  16. November 2026). Die Folgen – zufälliger Zielort, Wochen im Jump Space, Schiff vernichtet
  bei 16+ – entscheidet der Owner im Spiel, die App würfelt sie nicht.

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
  Kommunikation, Avionik, Sensoren. Kostet MCr0,5 pro 100 t (SR 32, SE 10; hier stand früher
  irrtümlich MCr0,05).
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

**Antriebe und Energiewerk**: Jeder Antrieb hat einen Buchstaben (A–Z, ohne I und O). Der
Buchstabe legt Masse und Preis fest (*Drives and Power Plants*), die Leistung ergibt sich erst
zusammen mit dem Rumpf (*Drive Potential*). Ein Non-Starship braucht Maneuver Drive + Power Plant,
ein Starship zusätzlich Jump Drive; das Energiewerk muss mindestens denselben Buchstaben haben wie
Maneuver und Jump Drive, sonst arbeiten sie nicht (SR 41).

### Standard Hulls (SE 10)

| Tonnen | Hauptbereich (t) | Antriebsbereich (t) | MCr | Bauzeit (Monate) |
|---|---|---|---|---|
| 100 | 85 | 15 | 2 | 9 |
| 200 | 185 | 15 | 8 | 11 |
| 400 | 350 | 50 | 16 | 14 |
| 600 | 515 | 85 | 48 | 22 |
| 800 | 635 | 165 | 80 | 25 |
| 1000 | 835 | 165 | 100 | 27 |

Diese Standardrümpfe gibt es zu den genannten Preisen und Zeiten; jede andere Größe wird eigens
gefertigt und kostet MCr0,1 je Tonne.

### Drives and Power Plants (SE 10)

Masse in Tonnen und Preis in MCr je Buchstabe:

| Buchstabe | Jump Drive t | MCr | Maneuver Drive t | MCr | Power Plant t | MCr |
|---|---|---|---|---|---|---|
| A | 10 | 10 | 1 | 4 | 4 | 8 |
| B | 15 | 20 | 3 | 8 | 7 | 16 |
| C | 20 | 30 | 5 | 12 | 10 | 24 |
| D | 25 | 40 | 7 | 16 | 13 | 32 |
| E | 30 | 50 | 9 | 20 | 16 | 40 |
| F | 35 | 60 | 11 | 24 | 19 | 48 |
| G | 40 | 70 | 13 | 28 | 22 | 56 |
| H | 45 | 80 | 15 | 32 | 25 | 64 |
| J | 50 | 90 | 17 | 36 | 28 | 72 |
| K | 55 | 100 | 19 | 40 | 31 | 80 |
| L | 60 | 110 | 21 | 44 | 34 | 88 |
| M | 65 | 120 | 23 | 48 | 37 | 96 |
| N | 70 | 130 | 25 | 52 | 40 | 104 |
| P | 75 | 140 | 27 | 56 | 43 | 112 |
| Q | 80 | 150 | 29 | 60 | 46 | 120 |
| R | 85 | 160 | 31 | 64 | 49 | 128 |
| S | 90 | 170 | 33 | 68 | 52 | 136 |
| T | 95 | 180 | 35 | 72 | 55 | 144 |
| U | 100 | 190 | 37 | 76 | 58 | 152 |
| V | 105 | 200 | 39 | 80 | 61 | 160 |
| W | 110 | 210 | 41 | 84 | 64 | 168 |
| X | 115 | 220 | 43 | 88 | 67 | 176 |
| Y | 120 | 230 | 45 | 92 | 70 | 184 |
| Z | 125 | 240 | 47 | 96 | 73 | 192 |

### Drive Potential (SE 10)

Leistung eines Antriebs je Rumpfgröße: G beim Maneuver Drive, Sprungzahl beim Jump Drive,
Energiewerkszahl beim Power Plant. Für Zwischengrößen gilt die nächstgrößere Zeile. „–“ heißt:
Der Antrieb arbeitet in diesem Rumpf nicht. Die letzte Spalte ist die Bauzeit des Schiffs in
Monaten.

| Rumpf | A | B | C | D | E | F | G | H | J | K | L | M | N | P | Q | R | S | T | U | V | W | X | Y | Z | Bauzeit |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 100 | 2 | 4 | 6 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 10 |
| 200 | 1 | 2 | 3 | 4 | 5 | 6 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 12 |
| 400 | – | 1 | 1 | 2 | 2 | 3 | 3 | 4 | 4 | 5 | 5 | 6 | 6 | – | – | – | – | – | – | – | – | – | – | – | 16 |
| 600 | – | – | 1 | 1 | 1 | 2 | 2 | 2 | 3 | 3 | 3 | 4 | 4 | 4 | 5 | 5 | 5 | 6 | 6 | 6 | – | – | – | – | 24 |
| 800 | – | – | – | 1 | 1 | 1 | 1 | 2 | 2 | 2 | 2 | 3 | 3 | 3 | 3 | 4 | 4 | 4 | 4 | 5 | 5 | 6 | 6 | 6 | 28 |
| 1000 | – | – | – | – | 1 | 1 | 1 | 1 | 1 | 2 | 2 | 2 | 2 | 2 | 3 | 3 | 3 | 3 | 3 | 4 | 5 | 6 | 6 | 6 | 30 |
| 2000 | – | – | – | – | – | – | – | – | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 2 | 2 | 3 | 4 | 6 | 32 |
| 3000 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 2 | 2 | 4 | 34 |
| 4000 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 1 | 1 | 1 | 2 | 3 | 35 |
| 5000 | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | – | 1 | 1 | 1 | 2 | 36 |

Beispiel: Ein A-Antrieb gibt einem 100-t-Rumpf 2 G, einem 200-t-Rumpf 1 G. Fällt ein Buchstabe
durch Treffer auf ein Feld mit „–“, arbeitet der Antrieb nicht mehr (SR 41).

### Weapons and Mounts, Fittings, Armaments (SE 10)

| Bewaffnung | Preis (Cr) |
|---|---|
| Hardpoint | 100.000 |
| Single Turret | 200.000 |
| Double Turret | 500.000 |
| Triple Turret | 1.000.000 |
| Pulse Laser | 500.000 |
| Beam Laser | 1.000.000 |
| Missile Rack | 750.000 |
| Sandcaster | 250.000 |

- **Armaments**: ein Hardpoint je 100 t Schiff; jeder Hardpoint trägt ein Turret und braucht 1 t
  für die Feuerleitung.
- **Stand in der App** (2026-11-21g, `model/armament.ts`): Turrets und Waffen ✔ mit den Preisen
  dieser Tabelle, eingebaut in der Werft an einem Raumhafen A oder B (SR 29), ausgebaut ohne Erlös
  (✱); Hardpoints stecken im Preis des Entwurfs, zusätzliche gibt es nicht; die Tonne Feuerleitung
  ist im Entwurf eingeplant (✱). Turrets ab Werft: Scout/Courier und Safari Ship ein leerer Double
  Turret, Mercenary Cruiser acht leere Triple Turrets, Patrol Cruiser zwei Triple Turrets mit je
  2 Beam Lasern (✱, SR 37: „Laser“) und einem Missile Rack.

| Ausstattung (Fittings) | Tonnen | Preis (Cr) |
|---|---|---|
| Stateroom | 4,0 | 500.000 |
| Low Berth | 0,5 | 50.000 |
| Emergency Low Berth | 1,0 | 100.000 |
| Small Craft Stateroom | 2,0 | 50.000 |
| Small Craft Couch | 0,5 | 25.000 |
| Cargo | nach Bedarf | – |
| Fuel | nach Bedarf | – |

**Computer**: ein Modell-4-Computer oder besser ist Pflicht für Jump-4 und höher (siehe
[Computer und Software](#computer-und-software)).

---

## Optionale Komponenten

*SR 32–33, „Optional Components“.*

- **Atmosphärische Streulinienform (Streamlining)**: MCr1 pro 100 t, erlaubt Landung auf
  Planetenoberflächen und das Auftanken an Gasriesen (Skimming) oder in Gewässern; muss beim Bau
  vorgesehen werden, nicht nachrüstbar. **Stand in der App** (2026-11-21f): `ShipDesign.streamlined`
  ✔ (Scout/Courier, Free Trader, Subsidized Merchant, Yacht, Patrol Cruiser, Safari Ship; aus Book 2
  nach Kenntnis von Claude, nicht am PDF geprüft); Schöpfen am Gasriesen im Systemflug ✔ (✱
  Eintauchen mit höchstens 5 km/s, 22 Raumrunden); Landen dürfen vorerst alle ✱; in Gewässern ○.
- **Ship's Locker**: Grundausstattung (Schutzkleidung, Vacc Suits, Handfeuerwaffen, Munition,
  Kompasse, Überlebensausrüstung); Kosten vernachlässigbar, Inhalt liegt im Ermessen der
  Spielleitung.
- **Ship's Vehicles**: zusätzliche Fahrzeuge/Small Craft an Bord, eigene Tonnage für Hangar/Stauraum
  nötig (siehe [Standardentwürfe](#standardentwürfe) für Beispiele: Air/Raft, Ship's Boat, ATV,
  Cutter-Module).

---

## Crew

*SR 33, „Ship Crews“.*

| Position | Heuer im Monat (SE 11) | Pflicht ab | Bedingung |
|---|---|---|---|
| Pilot | Cr6.000 | jedes Schiff | mindestens Pilot-1 (Small Craft: Ship's Boat-1, oder Pilot mit Stufe −1) |
| Navigator | Cr5.000 | > 200 t | Pilot kann es bei ≤ 200 t übernehmen |
| Engineer | Cr4.000 | je 35 t Antrieb + Energiewerk | mindestens Engineer-1; < 200 t nicht zwingend |
| Steward | Cr3.000 | je 8 zahlende Hochpassagiere | mindestens Steward-0; Pflicht, sobald Hochpassagiere an Bord sind |
| Medic | Cr2.000 | Schiff ≥ 200 t, und je 120 Passagiere | mindestens Medic-1 bzw. -0; nicht auf Non-Starships und Small Craft |
| Gunner | Cr1.000 | je bestücktem Turret oder Small Craft | mindestens Gunnery-1; optional, wenn keine Bedrohung erwartet wird |

- Eine Person kann **zwei Positionen** ausfüllen (SR: mindestens Stufe 2 in beiden außer Steward,
  der Stufe 1 braucht; mehr als zwei nur im Notfall). SE 11 sagt dazu: Jede der beiden Positionen
  wird mit Stufe −1 ausgeübt, die Heuer ist 75 % der beiden Heuern zusammen.
- Schiffe > 1000 t: zusätzlich Captain, Executive Officer, mindestens drei Verwaltungskräfte;
  mindestens 10 Crewmitglieder je 1000 t.
- Die ranghöchste Person einer Sektion mit mehreren Mitgliedern (Chief Engineer, Chief Steward/
  Purser, Chief Medic/Ship's Doctor) erhält 10 % mehr Gehalt.
- Zusätzliche Positionen nach Bedarf (z. B. Laborpersonal, Kontaktspezialist für Alienkontakt).

**Standard Vehicles** (SE 11), Tonnage an Bord: ATV 10, Air/Raft 4, Speeder 6, G-Carrier 8,
Launch 20, Ship's Boat 30, Slow Boat 30, Pinnace 40, Slow Pinnace 40, Cutter 50 (Module je 30:
Fuel, ATV, Open), Shuttle 95, Fighter 10.

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
die Anforderungen an Personen, die das Programm selbst schreiben wollen, *Wurf* der Wurf dafür
(SE 13). Selbst schreiben spart das Geld, kann aber *Fatal Flaws* geben (SR 39).

**Offensiv** (nur mit Bewaffnung sinnvoll):

| Programm | Space | MCr | Schreiben | Wurf | Wirkung |
|---|---|---|---|---|---|
| Predict-1 | 1 | 2 | 1, Navig-1 | 10+ | DM +1 auf Trefferwurf |
| Predict-2 | 2 | 4 | 1, Navig-2 | 10+ | DM +2 |
| Predict-3 | 1 | 6 | 1, Navig-3 | 10+ | DM +2 |
| Predict-4 | 3 | 8 | 1, Navig-4 | 11+ | DM +3 |
| Predict-5 | 2 | 10 | 2, Navig-5 | 10+ | DM +3 |
| Gunner Interact | 1 | 1 | 2, Gunnery-2 | 11+ | Fertigkeit des Gunners wird DM |
| Target | 1 | 1 | 2, Navig-2 | 10+ | Pflicht für jedes Feuer der Turrets |
| Select-1 | 1 | 0,5 | 1, Gunnery-2 | 9+ | Zielwahl Hauptbereich/Engineering, DM −2 |
| Select-2 | 2 | 0,8 | 2, Gunnery-3 | 9+ | wie Select-1, DM −1 |
| Select-3 | 1 | 1 | 3, Gunnery-4 | 9+ | wie Select-1, ohne DM |
| Multi-Target-2 | 1 | 1 | 2, Gunnery-2 | 9+ | Turrets auf 2 Ziele zugleich |
| Multi-Target-3 | 2 | 2 | 2, Gunnery-3 | 10+ | auf 3 Ziele |
| Multi-Target-4 | 4 | 3 | 3, Gunnery-4 | 8+ | auf 4 Ziele |
| Launch | 1 | 2 | 1, Gunnery-2 | 11+ | Raketen und Sand abschussfähig |
| Double Fire | 4 | 4 | 2, Engineer-3 | 11+ | doppelter Laserschuss, Überlastrisiko |

**Defensiv**:

| Programm | Space | MCr | Schreiben | Wurf | Wirkung |
|---|---|---|---|---|---|
| Maneuver/Evade-1 | 1 | 1 | 1, Pilot-2 | 10+ | Verteidigungs-DM −¼ Pilotenstufe |
| Maneuver/Evade-2 | 2 | 2 | 1, Pilot-3 | 11+ | −½ Pilotenstufe |
| Maneuver/Evade-3 | 3 | 3 | 2, Pilot-4 | 10+ | −¾ Pilotenstufe |
| Maneuver/Evade-4 | 4 | 4 | 2, Pilot-5 | 11+ | − volle Pilotenstufe |
| Maneuver/Evade-5 | 5 | 5 | 3, Pilot-6 | 10+ | − volle Pilotenstufe |
| Maneuver/Evade-6 | 3 | 6 | 3, Pilot-7 | 11+ | −5 |
| Auto-Evade | 1 | 0,5 | 2, Pilot-4 | 11+ | wie Maneuver/Evade, schwächer: −2 |
| Return Fire | 1 | 0,5 | 2, Gunnery-3 | 12+ | automatisches Rückfeuer |
| Anti-Missile | 2 | 1 | 3, Gunnery-3 | 10+ | Laser gegen Raketen im eigenen Band |
| ECM | 3 | 4 | 4, Electronics-3 | 9+ | Raketen explodieren folgenlos bei 7+ |

**Routine** (Betrieb ohne Waffen):

| Programm | Space | MCr | Schreiben | Wurf | Wirkung |
|---|---|---|---|---|---|
| Maneuver | 1 | 0,1 | 1, Pilot-1 | 9+ | Pflicht für den Maneuver Drive |
| Jump-1 | 1 | 0,1 | 1, Pilot/Navig-1 | 10+ | Pflicht für Sprung 1 |
| Jump-2 | 2 | 0,3 | 2, Pilot/Navig-2 | 11+ | Pflicht für Sprung 2 |
| Jump-3 | 3 | 0,4 | 2, Pilot/Navig-3 | 12+ | Pflicht für Sprung 3 |
| Jump-4 | 4 | 0,5 | 3, Pilot/Navig-4 | 11+ | Pflicht für Sprung 4 |
| Jump-5 | 5 | 0,6 | 3, Pilot/Navig-5 | 12+ | Pflicht für Sprung 5 |
| Jump-6 | 6 | 0,7 | 4, Pilot/Navig-6 | 11+ | Pflicht für Sprung 6 |
| Navigation | 1 | 0,4 | 3, Navig-3 | 10+ | führt den Sprung aus |
| Generate | 1 | 0,8 | 3, Navig-4 | 10+ | erstellt den Flugplan (sonst Kassette Cr10.000) |
| Anti-Hijack | 1 | 0,1 | 1, Tactics-1 | 9+ | sperrt Kontrollbereiche; Umgehung auf 5− |
| Library | 1 | 0,3 | 1, keine | 4+ | Nachschlagewerk zu Region/Subsektor |

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

Beim Eintritt in ein System und beim Verlassen würfelt die Spielleitung auf der **Starship
Encounter Table** (SE 13), gestaffelt nach der Raumhafenklasse; 2W6, DM **+2** mit Marinebasis
im System, **+1** mit Scoutbasis. Ein Strich bedeutet: keine Begegnung. Die Einträge nennen einen
Schiffstyp (Buchstabe der Standardentwürfe); ein angehängtes **P** bedeutet Pirat (greift an oder
versucht, in Angriffsposition zu kommen); ein **\*** bedeutet, dass zusätzlich ein Small Craft
begegnet, vor oder nach dem großen Schiff.

| 2W6 | A | B | C | D | E | X |
|---|---|---|---|---|---|---|
| 2 | – | – | – | – | – | – |
| 3 | – | – | – | – | – | – |
| 4 | – | – | – | – | K | – |
| 5 | – | – | – | – | – | L |
| 6 | S | A | – | L | – | – |
| 7 | A | S | R | K | – | – |
| 8 | R | A | A | S | – | – |
| 9 | M\* | R\* | R\* | SP | S | T |
| 10 | Y | M | TP | A | A | TP |
| 11 | T | R | T | R | TP | CP |
| 12 | R\* | C\* | Y | M | CP | C |
| 13 | M\* | Y\* | A | Y | – | – |
| 14 | C\* | T\* | S\* | TP | – | – |
| 15 | T\* | C\* | Y\* | – | – | – |

Schiffstypen: A 200-t Free Trader, K 200-t Safari Ship, L 400-t Laboratory Ship, C 800-t Mercenary
Cruiser, M 600-t Subsidized Liner, R 400-t Subsidized Merchant, S 100-t Scout/Courier, T 400-t
Patrol Cruiser, Y 200-t Yacht.

**Standard Small Craft** (SE 13), 1W6, DM **+1** mit Marinebasis, **−1** mit Scoutbasis:

| 1W6 | Small Craft |
|---|---|
| 0 | 20-t Launch |
| 1 | 30-t Ship's Boat |
| 2 | 30-t Slow Boat |
| 3 | 40-t Pinnace |
| 4 | 40-t Slow Pinnace |
| 5 | 50-t Cutter |
| 6 | 95-t Shuttle |
| 7 | 10-t Fighter | Die Reaktion des begegneten Schiffs/der Crew kann nach der allgemeinen
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

*SR 39–42, „Space Combat“; Tabellen SE 12–13.* Jede Spielrunde entspricht **1.000 Sekunden**; ein
vollständiger Spielzug besteht aus zwei Spielerzügen (je einer Seite), jeder in mehrere Phasen
gegliedert.

**Scales** (SE 12): Runde 1.000 Sekunden; ein Range Band 10.000 km; **ein 1-G-Vektor entspricht
einem Range Band**: 1.000 Sekunden Schub mit 1 G ändern die Geschwindigkeit um 10.000 km (je
Runde); Einheiten sind einzelne Starships, Non-Starships und Small Craft.

**Game Turn Sequence** (SE 12), je Spielerzug: A. Bewegung (auch Raketen und Sand aus früheren
Runden), B. Laserfeuer, C. Rückfeuer des Gegners (und Anti-Missile), D. Ordnance Launch (Raketen,
Sand; Raketen, die Kontakt hatten, explodieren; Rettungsboote und Fahrzeuge starten), E. Computer
umprogrammieren. Nach beiden Spielerzügen die Interphase.

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
5. Für jeden Treffer wird mit 2W6 die **Trefferzone** gewürfelt (Tabelle unten) und der Schaden
   markiert.
- **Pulse Laser**: DM −1 beim Treffen, dafür bei Treffer **zwei** Schadenswürfe statt einem.
- **Shifting Fire**: ein Ziel darf nach der Zielwahl noch gewechselt werden (DM −6 zusätzlich zu
  allen anderen DMs), solange noch nicht gefeuert wurde. SE 13: Wer in einer Runde das Ziel
  wechselt, hat DM −6 für den Rest der Runde.

**Attacker's DMs** (SE 12):

| Grund | DM |
|---|---|
| Predict-1 | +1 |
| Predict-2 | +2 |
| Predict-3 | +2 |
| Predict-4 | +3 |
| Predict-5 | +3 |
| Gunner Interact | + Gunnery-Stufe des Gunners |
| Select-1 | −2 |
| Select-2 | −1 |
| Pulse Laser feuert | −1 |

**Defender's DMs** (SE 12):

| Grund | DM |
|---|---|
| Maneuver/Evade-1 | −¼ Pilot-Stufe |
| Maneuver/Evade-2 | −½ Pilot-Stufe |
| Maneuver/Evade-3 | −¾ Pilot-Stufe |
| Maneuver/Evade-4 | − Pilot-Stufe |
| Maneuver/Evade-5 | − Pilot-Stufe |
| Maneuver/Evade-6 | −5 |
| Auto/Evade | −2 |
| Entfernung über 25 Range Bands | −2 |
| Entfernung über 50 Range Bands | −5 |
| Sand im Weg (je Range Band) | −3 |

### Laser Return Fire

- Nur Schiffe, die in der vorigen Laserfeuer-Phase selbst Ziel waren, dürfen zurückfeuern, und nur
  auf Schiffe, die auf sie gefeuert haben (Target- und Return-Fire-Programm nötig).
- **Anti-Missile Fire**: ebenfalls in dieser Phase, nur gegen Raketen im eigenen Band, kein
  Zielprogramm nötig.

### Ordnance Launch

- Raketen/Sand werden in dieser Phase **ausgelöst**, bewegen sich aber erst in der folgenden
  Bewegungsphase (mit der Geschwindigkeit des startenden Schiffs; danach wie ein Schiff mit
  Maneuver-Drive-6).
- Jeder Launcher/Sandcaster hält 3 Raketen bzw. Ladungen bereit (ein Triple Turret mit drei
  Launchern also 9). Ist er leer, lädt der Gunner des Turrets ihn in einer Runde nach; drei Launcher
  dauern drei Runden. Wer nachlädt, kann mit dem Turret nicht feuern. (Hier stand früher
  irrtümlich „3 Runden für einen Launcher“.) Je Launcher oder Sandcaster startet höchstens eine
  Rakete bzw. Ladung je Phase; nötig sind die Programme Launch und Target.
- **Missile Detonation**: trifft eine Rakete ihr Ziel (in der Bewegungsphase; bei Range Bands: sie
  erreicht dasselbe Band) und übersteht die Abwehr, detoniert sie in der folgenden Ordnance-Phase:
  1W Treffer, je Treffer eine eigene Trefferzone (SE 13).

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
| Maneuver, Jump, Power Plant | senkt den Buchstaben um eine Stufe (C wird B); die Leistung folgt aus dem neuen Buchstaben ([Drive Potential](#drive-potential-se-10)). Landet er auf „–“, arbeitet der Antrieb nicht; unter A ist er zerstört und muss ersetzt werden |
| Hull | dekomprimiert das Schiff; weitere Hull-Treffer ohne Zusatzeffekt |
| Hold | zerstört zufällig 10 t Fracht, ein Fahrzeug oder ein Small Craft |
| Fuel | entlässt ~10 t Treibstoff; reicht der Rest nicht mehr für einen Sprung, kann nicht gesprungen werden; ist aller Treibstoff weg, arbeiten Maneuver Drive und Laser nicht mehr |
| Computer | DM −1 je Treffer auf den Betriebswurf 1+ (im Kampf je Phase; Computer-Fertigkeit als DM); misslingt er, fällt der Computer für die Phase aus und lähmt das Schiff; bei 12 Treffern dauerhaft ausgefallen. Small Craft ohne Computer: zählt als Drive-Treffer |
| Critical | kritischer Treffer: 1W auf die Tabelle *Critical Hits*; das genannte Teil ist ganz zerstört bzw. außer Gefecht (bei *Crew*: die Crew ist nicht unbedingt tot, aber handlungsunfähig) |
| Turret | das getroffene Turret fällt komplett aus |
| Small Craft Cabin | Treffer entspricht einem Hull-Treffer (Dekompression), weitere ohne Zusatzeffekt |
| Small Craft Weaponry | zerstört die Bewaffnung des Small Craft |
| Small Craft Drive | das Small Craft kann sich nicht mehr bewegen/beschleunigen/feuern |

**Stand in der App** (2026-11-21h, `model/space-combat.ts`, alles weitere unter *Raumkampf, Stufe 2*
in `domain-model.md`): Laserfeuer ✔ (8+, Pulse −1, Entfernung über 25 und 50 Raumbänder) und
Rückfeuer ✔ gleichzeitig nach der Bewegung, ✱ ohne Programme und ohne Schiffspositionen; Trefferzonen
und kritische Treffer ✔; Schaden ✱ ohne Antriebsbuchstaben (je Treffer −1 G bzw. −1 Sprung,
kritisch 0); Hull ohne Folgen; Turret-Treffer legt ein zufälliges Turret still; Crew: das Schiff
handelt nicht mehr; Explode: zerstört. Raketen, Sand, Ortung, Schadenskontrolle, Entern ○.
Schiffsbegegnungen im System ✔ als Knopf im Systemflug (SE 13 mit Reaktion nach SE 21).

**Hit Locations** (SE 12), 2W6 je Treffer:

| 2W6 | Starship | Non-Starship | Small Craft |
|---|---|---|---|
| 2 | Power Plant | Power Plant | Drive |
| 3 | Maneuver | Maneuver | Drive |
| 4 | Jump | Maneuver | Drive |
| 5 | Fuel | Fuel | Drive |
| 6 | Hull | Hull | Cabin |
| 7 | Hull | Hull | Computer |
| 8 | Hold | Hold | Cabin |
| 9 | Computer | Computer | Cabin |
| 10 | Turret | Turret | Weapons |
| 11 | Turret | Turret | Weapons |
| 12 | Critical | Critical | Critical |

**Critical Hits** (SE 12), 1W6:

| 1W6 | Starship | Non-Starship | Small Craft |
|---|---|---|---|
| 1 | Power Plant | Power Plant | Drive |
| 2 | Maneuver | Maneuver | Drive |
| 3 | Jump | Maneuver | Drive |
| 4 | Crew | Crew | Crew |
| 5 | Computer | Computer | Computer |
| 6 | Explode | Explode | Explode |

Hat ein Small Craft keinen Computer, zählt ein Computer-Treffer als Drive. *Explode* nennen die
SR nicht eigens; gemeint ist die Zerstörung des Schiffs.

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

### Ship's Data Card (SR 39–40, SE 12)

Jedes Schiff im Kampf hat eine Datenkarte: Name und Typ; 1. M-Drive (Buchstabe, G), 2. J-Drive
(Buchstabe, Sprungzahl), 3. Power Plant (Buchstabe), 4. Fuel (Tonnen), 5. Hold (Tonnen und
Fahrzeuge), 6. Bridge (Pilot-Stufe); darunter die Turrets (T-1, T-2, …) mit ihren Waffen (B Beam
Laser, P Pulse Laser, M Missile Rack, S Sandcaster), der Gunnery-Stufe des Gunners und den Raketen
im Rack; rechts Computer, CPU, Storage und die Programme an Bord. Beispiel aus SE 12, *Suleiman*
(Type S): M-Drive A (2 G), J-Drive A (Jump-2), Power Plant A, Fuel 40, Hold 3 t plus Air/Raft,
Bridge Pilot-1, T-1 (B, M) Gunner-1, fünf Raketen an Bord; Model/1 mit CPU 2 und Storage 4,
Programme Target, Auto/Evade, Return Fire, Anti-Missile (2), Launch, Jump-1, Predict-1, Jump-2
(2), Navigate, Library.

### Starship Encounters (im Kampf)

Siehe [Schiffsbegegnungen im System](#schiffsbegegnungen-im-system).

---

## Vektorbewegung (Mayday, Supplement 3)

Die SR bewegen Schiffe in Range Bands. Book 2 und das Brettspiel *Mayday* bewegen sie mit Vektoren
auf einer Karte; *Supplement 3* schreibt die Raketen für beide Systeme. Gebraucht wird das für das
[Konzept Raumkampf](konzept-raumkampf.md) (Entwurf); dort steht auch, was die App davon übernehmen
soll.

### Maßstäbe

| | Book 2 / Supplement 3 (SS3 4) | Mayday (MD 3) |
|---|---|---|
| Runde | 1.000 Sekunden | 100 Minuten |
| Entfernung | 100 mm = 10.000 km | 1 Hexfeld = 1 Lichtsekunde (300.000 km) |
| Schub | 1 G eine Runde lang verschiebt die Bahn um 100 mm | 1 G verschiebt den Zukunftsmarker um 1 Feld |
| 1 G | – | 9,8 m/s² |

### Ablauf eines Spielerzugs (MD 4; SS3 13)

Die Seiten ziehen abwechselnd, jede Runde hat zwei Spielerzüge: **A. Bewegung** (eigene Schiffe,
Raketen, Small Craft), **B. Laserfeuer**, **C. Rückfeuer** des Gegners (und Anti-Missile),
**D. Ordnance Launch** (Raketen, Sand, Small Craft starten; Raketen, die abgefangen haben, zünden),
**E. Computer umprogrammieren**. Zwischen den Runden bewegen sich Welten und Wracks, wenn das
Szenario es will.

### Bewegung (MD 4–6)

- Jedes Schiff, jede Rakete, jedes Small Craft hat **drei Marker**: Vergangenheit, Gegenwart,
  Zukunft.
- Bewegung: Vergangenheitsmarker auf den Gegenwartsmarker, Gegenwartsmarker auf den Zukunftsmarker;
  den neuen Zukunftsmarker legt man auf die Verlängerung der Linie von Vergangenheit zu Gegenwart,
  gleich lang. Das ist der Kurs ohne Schub.
- **Kursänderung**: den Zukunftsmarker um 1 Feld je G des Maneuver Drive verschieben, in beliebige
  Richtung.
- **Schwerkraft**: Die sechs Felder um eine Welt sind Schwerkraftfelder mit je einem Pfeil von einem
  Feld zur Mitte der Welt. Jedes Schwerkraftfeld, das ein Schiff in seiner Bewegung betritt,
  verschiebt dessen Zukunftsmarker um 1 Feld in Pfeilrichtung; Pflicht und kumulativ, für alle
  Schiffe.
- **Umlaufbahn**: Wer sich genau ein Feld weit von einem Schwerkraftfeld ins benachbarte derselben
  Welt bewegt, ist im Orbit und umrundet sie ohne weiteren Schub in zehn Stunden (sechs Runden).
- **Landen**: mit 1 Feld Geschwindigkeit auf die Welt ziehen. Schneller ist ein **Aufschlag**, das
  Schiff ist zerstört. **Starten**: von der Welt in ein Nachbarfeld beschleunigen.
- **Abfangen**: Stehen am Ende der Bewegung zwei Gegenwartsmarker im selben Feld, haben sich die
  beiden abgefangen (Raketen können zünden, Schiffe zusammenstoßen). Stehen zwei Zukunftsmarker im
  selben Feld, ist das Abfangen im nächsten Zug unvermeidlich.
- **Angeglichener Kurs**: Gegenwarts- und Zukunftsmarker zweier Schiffe jeweils im selben Feld;
  dann ist Entern möglich.
- **Maneuver/Evade**: Läuft ein solches Programm, hat das Schiff 1 G weniger, auch bis auf 0 G.

### Waffen in Mayday (MD 6–12)

- **Laser**: alle Laser eines Schiffs auf dasselbe Ziel; Treffer werden sofort angerechnet.
  *Shifting Fire* in Mayday: DM +1 je Laser nach dem ersten, oder ohne diesen DM Zielwechsel, wenn
  das erste Ziel zerstört ist. Laser gegen Raketen im eigenen Laserfeuer durch Wahl als Ziel, im
  Rückfeuer nur mit Anti-Missile und nur gegen Raketen ohne Annäherungszünder.
- **Ordnance Launch**: höchstens eine Rakete je Schiff und Phase; wer Sand ausstößt, startet keine
  Rakete. Neue Raketen und Small Craft übernehmen alle drei Marker des startenden Schiffs, ihr
  Zukunftsmarker darf gleich verschoben werden.
- **Raketen** aus Lenkung (Homing, Guided, Responsive, Unguided), Antrieb (Constant, Limited,
  Discretionary, Unpowered) und Zünder (Contact: dreifacher Schaden; Proximity: doppelter, nicht
  durch Anti-Missile abzuwehren; Intelligent; Command). **Standardrakete in Mayday**: 6G6 Limited,
  Homing, Contact, Cr5.600.
- **Sand**: Die Wolke umgibt das Schiff, solange es den Kurs nicht ändert. Laser hinein DM −3, Laser
  hinaus DM −1, Raketen gegen das Schiff DM −1. Vorrat: so viele Ladungen wie das Schiff Tonnen hat.
  Schützt nur das eigene Schiff.
- **Schaden** (MD 9, 12): Ergebnisse No Effect, Weaponry, Computer, M-Drive, J-Drive, Detonate (bei
  Raketen). Zerstört bei vier Treffern in einem Spielerzug (Laser 1, Proximity 2, Contact 3) oder je
  mindestens drei Treffern in drei Runden hintereinander. Das Wrack fliegt auf seinem Kurs weiter.
- **Schadenskontrolle** (MD 12): zu Beginn des eigenen Zugs, höchstens 1 G Schub, ein Bereich, 8+.
- **Handsteuerung** ohne Computer: Laser DM −4, keine Raketen und kein Sand, Schub nur 1 G und eine
  Runde vorher angesagt. Small Craft haben keinen Computer und keine DMs dafür.
- **Small Craft** (MD 14) mit G und Brennstufen (höchste Kursänderung je Zug, gesamte Kursänderung):
  Lifeboat 1G5, Ship's Boat 6G9 (1 Laser), Pinnace 5G12 (1 Laser), Cutter 4G15 (1 Laser), Shuttle
  3G9, Fighter 4G12 (1 Laser). Starships haben unbegrenzten Treibstoff.
- **Sprung** in Mayday: frühestens 40 Felder von jeder Welt entfernt.
- **High Guard mit Vektorbewegung** (MD 14): angeglichener Kurs = Enterreichweite, bis 5 Felder
  kurze, bis 15 Felder lange Reichweite, darüber außer Reichweite.

### Raketen nach Supplement 3 (SS3 4–11)

- **Antrieb** als *xGy*: höchstens x G je Runde, Treibstoff für y Runden bei vollem Schub (gesamt
  x·y G-Runden; *3G3* also 3 G drei Runden lang oder 1 G neun Runden lang).
  - **Continuous Burn** (TL 8): brennt ab dem Start mit vollem Schub, bis der Treibstoff leer ist;
    keine Kursänderung. Trifft nur, wenn er in der ersten Runde abfängt.
  - **Limited Burn** (TL 9): Start auch mit weniger als vollem Schub, der dann fest bleibt;
    Kursänderung je Runde bis zur Hälfte des Unterschieds zum Höchstwert (abgerundet), 2 Brennstufen
    je G Kursänderung. Ab der zweiten Runde fängt er nur bei 4+ ab, DM + verbleibender Treibstoff;
    nach der dritten Runde gar nicht mehr.
  - **Discretionary Burn** (TL 10): frei wie ein Schiff, solange Treibstoff da ist.
  - **Ohne Antrieb** (TL 5): treibende Mine mit dem Vektor des startenden Schiffs.
- Ohne Treibstoff fliegt jede Rakete ballistisch weiter; **Schwerkraft** wirkt auf sie wie auf
  Schiffe.
- **Lenkung**: Steuergerät plus Sensor (Funk: Fernlenkung, aktive oder passive Zielsuche; Infrarot;
  Masse; Neutrino); Ausweichmodul DM +1 je G gegen Abwehr.
- **Zünder**: Contact (doppelte Treffer, nur bei Aufprall), Proximity (beim Abfangen, durch ECM zu
  stören), Intelligent (wie Proximity, immun gegen ECM), Command (auf Befehl, über eine Lichtsekunde
  2+ mit DM −1 je Lichtsekunde).
- **Gefechtsköpfe**: High Explosive 2 Treffer je 10 kg; Focused Force 4 je 10 kg; Nuklear,
  Enhanced Radiation, Fusion mit Treffern je 0,1 kt plus Strahlungstreffer. Nuklear-, Fusions- und
  Strahlungsköpfe ab Gesetz 4 verboten, alle Gefechtsköpfe ab Gesetz 8.
- **Standardrakete** nach SS3: 5G6 Continuous Burn, Massesensor, Proximity, High Explosive; 48 kg,
  Cr5.600. Ein Standardbehälter fasst 50 kg.
- **Abfangen**: auf 25 mm (2.500 km) ans Ziel, gemessen von der Spitze seines Vektorpfeils. Aufprall
  braucht Steuerbarkeit: in der ersten Runde immer, danach nur Limited und Discretionary, wenn ihr
  Vektor durch das Ziel geht.
- **Geschwindigkeit**: beim Aufprall ein Treffer mehr je volle 300 mm (30.000 km je Runde) der
  Summe beider Vektoren.
- **ECM** (im Rückfeuer, vor der Zündung): gegen Raketen mit Funksensor 9+; die Rakete fliegt dann
  unbrauchbar weiter. Contact-Zünder und Treffer aus Geschwindigkeit wirken trotzdem, Intelligent
  ist immun.
- **Sand gegen Raketen**: je 25 mm Sand auf dem Weg 12+, dann ist die Rakete unbrauchbar.
- **Magazine**: ein Rack hält eine Rakete schussbereit und zwei weitere; ein Turret lagert 12 dazu.
  Nachladen der Racks nebenbei; Auffüllen des Turrets aus dem Laderaum dauert eine Runde für eine
  Person (ein Gunner kann dann in der nächsten Runde nicht feuern). Ein Gunner baut in einer Runde
  eine Rakete aus Bauteilen um.
- Tabellen der Treffer: SS3 verweist auf die von *High Guard*.

---

## Lücken (fehlende Tabellen aus SE)

Die Tabellen aus SE 10–13 (Schiffsbau, Crew, Raumkampf, Schiffsbegegnungen) sind seit
18. November 2026 vollständig oben übertragen. Noch nicht übertragen:

- **Technological Levels** (SE 16)
- **Trade and Speculation** (SE 22; die *Actual Value Table* und die *Cargo-* und
  *Passagiertabellen* sind noch zu suchen, vermutlich SE 9/22–23)

Wird eines dieser Themen für die App gebraucht, die Tabelle aus dem PDF vollständig hier
eintragen, erst danach ins Domänenmodell übernehmen.
