# Regeln für Laufbahnen: die Laufbahnen der Charakter- und NSC-Erstellung

Dieses Dokument ersetzt beim Entwickeln das Nachschlagen im PDF. Es sammelt die **Laufbahnen**, mit
denen die App Charaktere und NSC erzeugt: die sechs, die gebaut sind, und die **zwölf weiteren aus
Supplement 4 *Citizens of the Imperium***, die der Owner nachlesen will (Angabe vom 23. November 2026).

Es ist ein Nachschlagewerk, kein Modell: Was die App davon baut, kommt zuerst ins Domänenmodell
([`domain-model.md`](domain-model.md)); die Erschaffung selbst ist dort unter
„Charaktererschaffung und Laufbahnen“ (`docs/views/erschaffung.png`) beschrieben.

## Quellen und Schreibweise

| Kürzel | Buch | Seitenangaben |
|---|---|---|
| **SE Charts** | *Starter Edition 2: Charts* | wie in [`regeln-schiffe.md`](regeln-schiffe.md) |
| **B1** | *Book 1: Characters & Combat* (1981) | gedruckte Seitenzahl |
| **B4** | Supplement 4 *Citizens of the Imperium* (GDW 1979) | gedruckte Seitenzahl; **im PDF ist es die Seite + 5** |

- „2D“ heißt 2W6; „DM“ ist ein Würfelmodifikator. „7+“ ist der Zielwert, „Soc 7−“ gilt, wenn
  Social Standing **7 oder weniger** ist (in B4 mit Gedankenstrich geschrieben).
- **Position** (*position*) ist bei B4, was bei den sechs gebauten Laufbahnen die **Offizierstelle**
  (`commission`) ist: der erste Rang; Promotionen bauen darauf auf.
- **Term** = vier Jahre Dienst; Alter 18 zu Beginn, außer Belterer und Barbar (14).

**Stand in der App** je Regel: ✔ umgesetzt, ◐ teilweise, ○ offen, ✱ Hausregel der App.

## Überblick

| Regel | Quelle | App |
|---|---|---|
| [Die sechs gebauten Laufbahnen](#die-sechs-gebauten-laufbahnen) | SE Charts 2–3 | ✔ |
| [Die zwölf Laufbahnen von B4](#die-zwölf-laufbahnen-von-b4) | B4 1–9 | ✔ |
| [Ablauf nach B4](#ablauf-nach-b4) | B4 2–5 | ◐ (Ablauf gebaut, vier Abweichungen) |
| [Würfe der zwölf Laufbahnen](#würfe-der-zwölf-laufbahnen) | B4 6, 8 | ✔ |
| [Ränge der zwölf Laufbahnen](#ränge-der-zwölf-laufbahnen) | B4 6, 8 | ✔ |
| [Fertigkeitstabellen und Automatik-Fertigkeiten](#fertigkeitstabellen-und-automatik-fertigkeiten) | B4 6–7, 8–9 | ✔ |
| [Sachwerte und Geld der zwölf](#sachwerte-und-geld-der-zwölf) | B4 6–7, 8–9 | ✔ |
| [Sonderregeln einzelner Laufbahnen](#sonderregeln-einzelner-laufbahnen) | B4 2, 6, 8, 12 | ✔ |
| [Neue Fertigkeiten und Waffen](#neue-fertigkeiten-und-waffen) | B4 10–12, 16–17 | ✔ (Heavy Weapons fehlt, keine Tabelle braucht ihn) |
| [Fertig gewürfelte NSC](#fertig-gewürfelte-nsc) | B4 18–41 | ○ |
| [Helden und Schurken](#helden-und-schurken) | B4 42–43 | ○ |

**Was B4 sonst noch hat:** die Notiz zu Geschlecht und Rasse (B4 5: keine Regel schreibt beides vor);
Bogenwaffen mit Tabelle (B4 16–17); die Schiffsbeschreibungen der Sachwerte (B4 13–15);
Querverweise auf Recon, Recruiting, Ship Tactics (B4 12–13).

## Die sechs gebauten Laufbahnen

**Navy, Marines, Army, Scouts, Merchants, Other** (SE Charts 2–3) stehen in `src/data/services.json`
und sind fertig: Musterung, Einberufung, Überleben, Offizierstelle, Beförderung, Ränge mit
Fertigkeitsgaben, vier Fertigkeitstabellen, Sachwerte und Geld, Alterung. Die **Einberufung** würfelt
unter genau diesen sechs (1W6, je Laufbahn eine Zahl).

## Die zwölf Laufbahnen von B4

B4 bringt zwölf **Charaktertypen** (B4 5) – je eine eigene Laufbahn mit denselben Würfen wie die
sechs gebauten, aber ohne Einberufungszahl. **Alle zwölf stehen in `src/data/services.json`**
(Kennzeichen **2026-11-24a** und **2026-11-24c**): Musterung, Überleben, Rangwurf und Beförderung
mit den DMs der Tabellen, Ränge mit ihren Gaben, die vier Fertigkeitstabellen, Sachwerte und Geld,
dazu die neue Bogenwaffengruppe, die Luft- und Wasserfahrzeuge-Gruppen und der Seeker als Entwurf.
Zusammen mit den sechs des Regelwerks sind es **18 Laufbahnen** in der Wahl; die Einberufung
würfelt weiterhin nur die sechs mit Einberufungszahl, die zwölf anderen lassen weiterbewerben.

| Laufbahn | B4 | Wer das ist |
|---|---|---|
| **Pirate** (Piraten) | 18 | Besatzungen interplanetarer und interstellarer Schiffe, die Handel überfallen, kapern, plündern |
| **Belter** (Gürtelleute) | 20 | schürfen und bauen in Asteroidengürteln: Erz, Artefakte, Bergungsgut |
| **Sailor** (Seefahrer, *Surface Navy*) | 22 | Angehörige der *Nautical Force Command*, der „nassen“ Flotte einer Welt |
| **Diplomat** (Diplomaten) | 24 | Angehörige des Auswärtigen Dienstes einer Regierung |
| **Doctor** (Ärzte) | 26 | ausgebildete Heilerinnen und Heiler im Praktizieren |
| **Flyer** (Flieger) | 28 | Angehörige der *Close Orbit and Airspace Control Command*, der Luftstreitkräfte einer Welt |
| **Barbarian** (Barbaren) | 30 | harte Menschen von primitiven Welten, kundig in Wildnis und Überleben |
| **Bureaucrat** (Bürokraten) | 32 | Verwaltungs- und Führungspersonen einer Regierung oder Organisation |
| **Rogue** (Gauner) | 34 | kriminelle Elemente, heimlich wie offen |
| **Noble** (Adlige) | 36 | obere Schicht ohne festen Beruf, oft viel bares Geld |
| **Scientist** (Wissenschaftler) | 38 | Techniker und Forschende, Untersuchungen an Materialien, Lagen und Phänomenen |
| **Hunter** (Jäger) | 40 | verfolgen und erlegen Tiere aller Größen, aus Gewinn oder Vergnügen |

Jedes dieser zwölf Kapitel (B4 18–41) enthält **fertig gewürfelte Beispiel-NSC** mit UPP, Alter,
Termen, Geld, Fertigkeiten und Sachwerten.

## Ablauf nach B4

Der Ablauf ist der bekannte (B1, SE Charts) mit vier Abweichungen:

| Schritt | B4 | App |
|---|---|---|
| Attribute | 2W6 je Attribut: Stärke, Gewandtheit, Ausdauer, Intelligenz, **Bildung**, Stand | ✔ (dieselben sechs, `EDU` schon dabei) |
| Alter zu Beginn | 18; **Belterer und Barbar 14** | ✔ (`Service.startAge`, 2026-11-24a) |
| Musterung misslingt | *Rejection*: die Person **sucht eine andere Laufbahn** und bewirbt sich dort | ✔ bei den zwölf ohne Einberufungszahl (✱ weiterbewerben); bei den sechs des Regelwerks entscheidet weiterhin die **Einberufung** (2026-11-24a) |
| Fertigkeiten je Term | erster Term 2, jeder weitere 1, +1 bei Position, +1 bei Beförderung; aus **vier Tabellen**, die vierte nur bei **Bildung 8+** | ✔ (`skillsPerTerm`, vierte Tabelle mit `minEdu`) |
| Weiterverpflichtung | jeder Term; 12 genau → ein Term Zwangsdienst; misslingt sie → Ende | ✔ |
| Retirement | Dienst bis 7 Terme; **Ruhestand ab dem 5. Term möglich, nach dem 7. Pflicht**; Rentenzahlung je nach Dienstzeit und Laufbahn | ○ (die App kennt `MAX_TERMS = 7`, aber keinen Ruhestand und keine Rentenzahlung) |
| Abmusterung | ein Wurf je Term, +1 Wurf bei Rang 1–2, +2 bei Rang 3–4, +2 und +1 DM auf Tabelle 1 bei Rang 5–6; Gamblen +1 DM auf Tabelle 2; **Tabelle 2 höchstens dreimal** | ✔ (`musterRollsOf`, `MAX_CASH_ROLLS`) |
| Alterung | ab Alter 34 und alle vier Jahre, Alterungstabelle auf Stärke, Gewandtheit, Ausdauer, Intelligenz; Attribut auf 0 → krank, Grundwurf 8+, sonst Ende ohne Weiterverpflichtung | ✔ (Alterungstabellen der Referenzdaten) |

## Würfe der zwölf Laufbahnen

Zwei Tabellen („Prior Service Table“), B4 6 und B4 8. Ein DM gilt, wenn das Attribut den genannten
Wert hat; sind beide Bedingungen erfüllt, **zählen beide DM zusammen**.

**B4 6** – erste Gruppe:

| Wurf | Pirate | Belter | Sailor | Diplomat | Doctor | Flyer |
|---|---|---|---|---|---|---|
| Musterung | 7+ | 8+ | 6+ | 8+ | 9+ | 6+ |
| +1 bei | Stand 7− | Gew 9+ | Aus 10+ | Bil 8+ | Int 8+ | Stä 7+ |
| +2 bei | Aus 9+ | Int 6+ | Stä 8+ | Stand 9+ | Gew 9+ | Gew 9+ |
| Überleben | 6+ | 9+ | 5+ | 3+ | 3+ | 5+ |
| +2 bei | Int 8+ | *(nach Termen)* | Aus 8+ | Bil 9+ | Int 8+ | Gew 8+ |
| Position | 9+ | — | 5+ | 5+ | — | 5+ |
| +1 bei | Stä 10+ | — | Int 9+ | Int 8+ | — | Bil 6+ |
| Beförderung | 8+ | — | 6+ | 10+ | — | 8+ |
| +1 bei | Int 9+ | — | Bil 8+ | Stand 10+ | — | Bil 8+ |
| Weiterverpflichtung | 7+ | 7+ | 6+ | 5+ | 4+ | 6+ |

Belter haben beim Überleben **kein festes DM, sondern +1 je geleisteten Term** (erster Term +1,
zweiter +2, …, siebenter +7).

**B4 8** – zweite Gruppe:

| Wurf | Barbarian | Bureaucrat | Rogue | Noble | Scientist | Hunter |
|---|---|---|---|---|---|---|
| Musterung | 5+ | 5+ | 6+ | *(besonders)* | 6+ | 9+ |
| +1 bei | Aus 9+ | Bil 8+ | Stand 8− | — | Int 9+ | Gew 10+ |
| +2 bei | Stä 10+ | Stä 8− | Aus 7+ | — | Bil 10+ | Aus 9+ |
| Überleben | 6+ | 4+ | 6+ | 3+ | 5+ | 6+ |
| +2 bei | Stä 8+ | Bil 10+ | Int 9+ | — | Bil 9+ | Stä 10+ |
| Position | 6+ | 6+ | — | 5+ | — | — |
| +1 bei | Stä 10+ | Stand 9+ | — | Bil 9+ | — | — |
| Beförderung | 9+ | 7+ | — | 12+ | — | — |
| +1 bei | Int 6+ | Int 9+ | — | Int 10+ | — | — |
| Weiterverpflichtung | 6+ | 3+\* | 5+ | 4+ | 5+ | 5+ |

Adlige stehen **nur** Menschen mit Stand 10+ offen, und zwar automatisch (kein Wurf); ihr Rang folgt
dem Adelsrang des Stands, sobald sie eine Position erreicht haben. \* Bürokraten müssen ihre
Weiterverpflichtung würfeln, um vor dem Ruhestand ausscheiden zu dürfen.

## Ränge der zwölf Laufbahnen

„Table of Ranks“, B4 6 und B4 8. „—“ heißt: diesen Rang gibt es in der Laufbahn nicht.

| Rang | Pirate | Belter | Sailor | Diplomat | Doctor | Flyer |
|---|---|---|---|---|---|---|
| 1 | Henchman | — | Ensign | 3d Secretary | — | Pilot |
| 2 | Corporal | — | Lieutenant | 2d Secretary | — | Flight Leader |
| 3 | Sergeant | — | Lt Cmdr | 1st Secretary | — | Sqdrn Leader |
| 4 | Lieutenant | — | Commander | Counselor | — | Staff Major |
| 5 | Leader | — | Captain | Minister | — | Group Leader |
| 6 | — | — | Admiral | Ambassador | — | Air Marshal |

| Rang | Barbarian | Bureaucrat | Rogue | Noble | Scientist | Hunter |
|---|---|---|---|---|---|---|
| 1 | — | Clerk | — | B Knight | — | — |
| 2 | Warrior | Supervisor | — | C Baron | — | — |
| 3 | — | Asst Manager | — | D Marquis | — | — |
| 4 | — | Manager | — | E Count | — | — |
| 5 | Chief | Executive | — | F Duke | — | — |
| 6 | — | Director | — | — | — | — |

Die Buchstaben beim Adel sind die **Standswerte** (B1/Book 3): Stand B = Knight, C = Baron,
D = Marquis, E = Count, F = Duke.

## Fertigkeitstabellen und Automatik-Fertigkeiten

Je Gruppe vier Tabellen (B4 6–7 und B4 8–9), die man je Fertigkeit mit 1W6 würfelt, genau wie bei den sechs
gebauten Laufbahnen: **Personal Development**, **Service Skills**, **Advanced Education** und
**Advanced Education (nur bei Bildung 8+)**. Blade Combat, Gun Combat, Air Craft und Vehicle
verlangen sofort die Festlegung auf eine Waffe bzw. ein Fahrzeug (bei Barbarian, Bureaucrat, Rogue,
Noble, Scientist, Hunter ohne Air Craft).

**Automatik-Fertigkeiten** (B4 7 und B4 9) – die Laufbahn gibt sie zusätzlich, Rang-Fertigkeiten
zusätzlich zum Rang:

| Laufbahn | Automatik |
|---|---|
| Belter | Vacc Suit-1 |
| Pirate | Brawling-1 |
| Pirate *Lieutenant* (Rang 4) | Pilot-1 |
| Doctor | Medical-1 |
| Diplomat | Liaison-1 |
| Flyer | Air Craft-1 |
| Barbarian | Sword-1 |
| Barbarian *Warrior* (Rang 2) | Blade Combat-1 |
| Barbarian *Chief* (Rang 5) | Leader-1 |
| Rogue | Streetwise-1 |
| Scientist | Computer-1 |
| Hunter | Hunting-1 |

Die Fertigkeitstabellen selbst (6 Zeilen je Tabelle und Laufbahn) werden beim Bauen je Laufbahn aus
B4 6–7 und B4 8–9 abgeschrieben; sie hier abzudrucken wäre eine zweite Quelle.

## Sachwerte und Geld der zwölf

Je Gruppe zwei Sachwertetabellen („Benefits Tables“, B4 6–7 und B4 8–9): **Tabelle 1** Sachwerte,
**Tabelle 2** Geld (höchstens drei Würfe, +1 DM für Gamblen oder im Ruhestand; Rang 5–6 gibt +1 DM
auf Tabelle 1). Der erste Waffen-Sachwert ist ein Stück Waffe aus B1, jeder weitere darf als
Fertigkeit darin genommen werden. Neu sind die Sachwerte der Laufbahn selbst:

| Sachwert | Für | Was |
|---|---|---|
| **Instruments** | Doctor | ärztliches Besteck: Instrumente, Diagnosezeug, Drogen; Cr 5.000 (B4 13) |
| **Watch** | Bureaucrat | Uhr der Kollegen als Ehrengabe, Cr 50; Wurf 7+ → 2D × Cr 100 (B4 13) |
| **Corsair** | Pirate | Piratenschiff (B4 13–14), einmalig |
| **Seeker** | Belter | Schürfschiff (B4 14), einmalig |
| **Yacht** | Noble | Jacht (B4 14–15), einmalig |
| **Lab Ship** | Scientist | Laborschiff (B4 15), einmalig |
| **Safari Ship** (Typ K) | Hunter | Typ-K-Rumpf, 1 G konstant, 11 Kabinen, 6 + 8 Besatzung, 50 t Treibstoff, 2 t Ladung, Modell-Ibis-Rechner, ein Hardpoint (B4 15), einmalig |

## Sonderregeln einzelner Laufbahnen

| Laufbahn | Sonderregel | Quelle |
|---|---|---|
| **Belterer**, **Barbar** | beginnen mit **14** statt 18 | B4 2 |
| **Belter** | Überleben-DM **+1 je Term** statt fester DM | B4 6 |
| **Adliger** | nur für Stand 10+, automatisch; Rang aus dem Stand (ab Position) | B4 8 |
| **Barbar** | kann **nicht in den Ruhestand** | B4 9 |
| **Bürokrat** | muss die **Weiterverpflichtung würfeln**, um vor dem Ruhestand wegzudürfen | B4 8 |
| **Barbar, Bürokrat, Arzt** | haben **keine natürliche Waffenkunde** an Schusswaffen: gelten als völlig ungebildet (DM −5 beim Schießen, B1 30) | B4 11 |
| **Arzt** | Medical 3+ heißt **Doctor**, Gewandtheit 8+ zusätzlich **Surgeon**; unter Medical 3 ist es Ordnungsperson, Sanitäter oder Pfleger | B4 26 |
| **alle zwölf** | jedes Kapitel setzt voraus, dass die Person **abgemustert** hat; der SL darf sie trotzdem im Dienst verwenden | B4 18 ff. |

## Neue Fertigkeiten und Waffen

B4 benutzt **Waffen-Gruppen** statt einzelner Waffen: *Blade Combat*, *Gun Combat*, *Bow Combat*
(je mit sofortiger Festlegung auf ein Stück), *Brawling* und *Gunnery* ohne Festlegung. Die App
kennt dafür **Kaskaden**; seit **2026-11-24c** sind alle gebraichten Gruppen da:

| Gruppe | Quelle | Optionen |
|---|---|---|
| **Bow Combat** (`bow-combat`) | B4 16–17 | Sling, Short Bow, Long Bow, Sporting Crossbow, Military Crossbow, Repeating Crossbow |
| **Air Craft** (`air-craft`) | B4 12–13 | Prop Fixed Wing, Jet Fixed Wing, Helicopter (die Einzelfertigkeiten gab es schon) |
| **Water Craft** (`water-craft`) | B4 12–13 | Large Watercraft, Small Watercraft, Hovercraft, Submersible |

**Neue Fertigkeiten** in `skills.json`: Interrogation, Instruction, Recruiting, Liaison, Ship
Tactics, Zero-G Combat (schon zu **2026-11-24a**) und jetzt Commo, Battle Dress, Prospecting,
Gravitics, Demolition, Survival, Recon, Hunting sowie je eine Fertigkeit pro Bogenwaffe
(Sling … Repeating Crossbow, geführt über die Gruppe). **Vorhanden und in den Tabellen benutzt:**
Brawling, Gambling, Carousing, Vacc Suit, Streetwise, Electronics, Computer, Mechanical,
Engineering, Navigation, Pilot, Ship's Boat, Vehicle, Gunnery, Leader, Jack-of-all-Trades, Medical,
Administration, Bribery, Forgery, Forward Observer, Steward, Tactics.

**Die sechs Bogenwaffen** (`weapons.json`, B4 16–17) sind Schusswaffen **ohne Magazin**
(Kennzeichen **2026-11-24c**): Schleuder, Short Bow, Long Bow und Repeating Crossbow laden
automatisch ein Schuss je Runde, Sporting und Military Crossbow brauchen zum Spannen eine eigene
Runde und gelten dabei als ausweichend (Military: zwei Runden beim Ausweichen). Der Repeating
Crossbow hat zehn Bolzen im Magazin. Reichweiten- und Rüstungsmatrix stehen Wort für Wort in den
Tabellen von B4; Gewichte und Preise aus der Gewichtstabelle (B4 17).

- ✱ **Hausregel:** B4 nennt für Bogenwaffen **kein Gesetz** und kein Mindest-SOC. Die App lässt sie
  deshalb überall erlaubt (wie Hände und Tierwaffen) und gibt sie **keinem erzeugten NSC** – ein
  Charakter aus Barbar oder Hunter erhält sie über Sachwerte und Kaskaden, die das Feld nicht
  abfragen.
- **Heavy Weapons** (B4 11) braucht keine der zwölf Tabellen; er fehlt weiterhin.

Die Waffentabellen mit begünstigten und benachteiligten Attributswerten und dem Schaden
(Klingen B4 10, Schusswaffen B4 10–11, Bogen B4 16–17) stehen für die Bogenwaffen jetzt in
`weapons.json`; die übrigen B4-Tabellen wiederholen nur B1 und sind nicht übertragen.

## Fertig gewürfelte NSC

B4 18–41 würfelt je Laufbahn rund zehn NSC vor: Name mit Rang, **UPP** (sechs Attributswerte in
Hex), Alter, Terme, Geld, Fertigkeiten mit Stufen, Sachwerte. Die App erzeugt ihre NSC selbst aus
einer Laufbahn (*NSC aus einer Laufbahn*, `docs/domain-model.md`); mit den zwölf Laufbahnen kann sie
diese NSC **selbst würfeln** – die Beispiele bleiben dann als Vergleich und als Vorrat für den
Abend.

## Helden und Schurken

B4 42–43 zeigt acht Ausnahme-NSC aus der Science Fiction (Farm boy, Special Agent, Sergeant Major,
Doctor/Surgeon, Diplomat, Imperial Leader, Scoundrel, …). Sie sind **nicht** das Ergebnis der
Erschaffung („certainly do not meet any normal requirements“) und dürfen Werte außerhalb der Regeln
haben – Vorlagen für NSC, die niemand erzeugen soll, sondern die man aufstellt.

## Wo der Code noch nicht folgt

- Die **sechs Laufbahnen des Regelwerks** und die **zwölf aus B4** stehen in `services.json` und
  folgen dem Modell (Kennzeichen **2026-11-24a** und **2026-11-24c**): Gegenprobe („Stand 7−“,
  „Stä 8−“), Term-DM, Weiterbewerbung, Ausstieg nur über die gelungene Weiterverpflichtung,
  kein Ruhestand, natürliche Waffenkunde, Beginnsalter, Einstieg allein aus dem Stand und die
  Rangtafel mit fehlenden Stufen (Barbar nur Warrior und Chief) sind gebaut und erprobt
  (Tests in `model/career-b4.test.ts` und `data/data.test.ts`).
- Der **Name des Rangwurfs** (`Service.commissionTitle`, Kennzeichen **2026-11-24b**) steht nur beim
  Bürokraten („Gehobener Dienst“). B4 selbst nennt den Wurf überall nur *position*; ob Diplomat,
  Barbar und Adliger eigene Worte bekommen, ist offen. Ohne das Feld heißt er „Offizierspatent“.
- Die **Rente** nach dem Ruhestand kennt die App noch nicht (Notiz statt Zahlung), bei den neuen
  Laufbahnen wie bei den alten.
- Die **Beispiel-NSC** aus B4 18–41 sind nicht in der App: sie erzeugt ihre Läufe selbst. Die
  Beispiele taugen als Vergleich für eigene Würfe.
