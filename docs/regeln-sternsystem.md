# Regeln für Sternsysteme: Sterne, Bahnen, Monde, Ringe, Gasriesen

Dieses Dokument ersetzt beim Entwickeln das Nachschlagen im PDF. Es fasst die Regeln aus **Book 6
*Scouts*** (GDW 1983) zusammen, die die **Raumkarte** braucht: die Sterne eines Systems, die
Bahnen und Zonen um den Hauptstern, wo Hauptwelt und Gasriesen kreisen, Planetoidengürtel, leere
und eingefangene Bahnen, die weiteren Welten des Systems, Monde und Ringe, Größe, Masse und
Schwerkraft von Welten. Was Book 6 darüber hinaus hat, steht unter *Was Book 6 sonst noch hat*.

Es ist ein Nachschlagewerk, kein Modell: Was die App davon baut, kommt zuerst ins Domänenmodell
([`domain-model.md`](domain-model.md)); das Konzept dazu ist
[`konzept-raumkampf.md`](konzept-raumkampf.md).

## Quellen und Schreibweise

| Kürzel | Buch | Seitenangaben |
|---|---|---|
| **B6** | *Book 6: Scouts* (GDW 1983), Kapitel *Star System Generation* und *Astronomical Data* | gedruckte Seitenzahl; im PDF ist es die Seite + 2 |
| **SR** | *Starter Edition*, *Rules Booklet* | wie in [`regeln-schiffe.md`](regeln-schiffe.md) |

- „1D“, „2D“ heißt 1W6, 2W6; „DM“ ist ein Würfelmodifikator.
- **Größe** ist die Ziffer des UWP: Durchmesser in Einheiten von 1.600 km. Dazu kommen in Book 6
  die Codes **S** (kleine Welt, unter 1.600 km Durchmesser) und **R** (Ring).
- **Planetenradien**: Bahnen von Monden zählen in Radien des Planeten, um den sie laufen.

**Stand in der App** je Regel: ✔ umgesetzt, ◐ teilweise, ○ offen, ✱ Hausregel der App.

## Überblick

| Regel | Quelle | App |
|---|---|---|
| [Sterne](#sterne) | B6 26–28 | ✔ (ferne Begleiter ohne eigenen Begleiter) |
| [Bahnen und Zonen](#bahnen-und-zonen) | B6 26–31, 34 | ✔ |
| [Gasriesen und Hauptwelt platzieren](#gasriesen-und-hauptwelt-platzieren) | B6 24, 28, 34–35 | ✔ (✱ Hauptwelt immer in die bewohnbare Bahn) |
| [Planetoidengürtel, leere und eingefangene Bahnen](#planetoidengürtel-leere-und-eingefangene-bahnen) | B6 28–29, 34–35 | ✔ |
| [Weitere Welten](#weitere-welten) | B6 24, 35–36 | ✔ (DMs des Kapitels; Regierung, Gesetz, TL, Raumhafen offen) |
| [Zahl der Monde](#zahl-der-monde) | B6 24, 36 | ✔ |
| [Größe der Monde](#größe-der-monde) | B6 24, 36 | ✔ |
| [Bahnen der Monde](#bahnen-der-monde) | B6 28, 36–37 | ✔ (Umlauf nach Kepler auf der Raumkarte) |
| [UWP der Monde](#uwp-der-monde) | B6 24, 37 | ✔ (DMs des Kapitels) |
| [Gasriesen](#gasriesen) | B6 28, 36, 39, 48 | ✔ (✱ Radius gewürfelt) |
| [Kleine Welten, Ringe, Gürtel](#kleine-welten-ringe-gürtel) | B6 36, 39 | ✔ (✱ Ring als Band auf der Raumkarte) |
| [Masse und Schwerkraft](#masse-und-schwerkraft) | B6 43, 48–49; SR 22 | ✔ (nach der Formel; Monde und Gasriesen ziehen auf der Raumkarte) |
| [Was Book 6 sonst noch hat](#was-book-6-sonst-noch-hat) | B6 24–49 | ○ |

---

## Sterne

*B6 26–28 („System Nature“, „Primary Star Type“, „Spectral Decimal Classification“, „Companion …“),
Tabelle „System Features“ S. 28.* Für eine schon erschaffene Hauptwelt gilt die *Continuation*
(B6 24): DM **+4** auf Typ und Größe des Hauptsterns, wenn die Hauptwelt Atmosphäre 4–9 oder
Bevölkerung 8+ hat.

| Wurf | Art des Systems | Hauptstern Typ | Hauptstern Größe | Begleiter Typ | Begleiter Größe | Bahn des Begleiters | Höchste Bahn | Gasriesen (Anzahl) |
|---|---|---|---|---|---|---|---|---|
| 0 | einzeln | B | Ia | – | Ia | nah | 0 | – |
| 1 | einzeln | B | Ib | B | Ib | nah | 1 | 1 |
| 2 | einzeln | A | II | A | II | nah | 2 | 1 |
| 3 | einzeln | M | III | F | III | nah | 3 | 1 |
| 4 | einzeln | M | IV | F | IV | 1 | 4 | 2 |
| 5 | einzeln | M | V | G | D | 2 | 5 | 2 |
| 6 | einzeln | M | V | G | D | 3 | 6 | 3 |
| 7 | einzeln | M | V | K | V | 4 + 1D | 7 | 3 |
| 8 | doppelt | K | V | K | V | 5 + 1D | 8 | 4 |
| 9 | doppelt | G | V | M | VI | 6 + 1D | 9 | 4 |
| 10 | doppelt | F | V | M | D | 7 + 1D | 10 | 4 |
| 11 | doppelt | F | VI | M | D | 8 + 1D | 11 | 5 |
| 12 | dreifach | F | D | M | D | fern | 12 | 5 |

- **Art des Systems**: 2D. Doppelt heißt ein Begleiter, dreifach zwei.
- **Hauptstern**: Typ 2D, Größe 2D (je mit dem DM oben; über 12 gilt die Zeile 12). **Zehntel**: 1D,
  3 oder weniger 0, 4 oder mehr 5 (B6 26: „0“ steht für 0–4, „5“ für 5–9). Weiße Zwerge (D) haben
  keine Zehntel; ihr Typ ist D plus Buchstabe (DF, DG …).
- **Begleiter**: Typ 2D + der Wurf für den Typ des Hauptsterns; Größe 2D + der Wurf für die Größe
  des Hauptsterns (über 12: Zeile 12). Bahn: 2D, der zweite Begleiter mit DM +4. *Nah* heißt: er
  berührt den Hauptstern fast und stört keine Bahnen; eine Zahl ist die Bahn des Begleiters; liegt
  sie im Hauptstern (Zone „–“), wird sie *nah*. *Fern*: 1D × 1.000 AU entfernt, ein eigenes System
  (kann selbst einen Begleiter haben, DM −4 auf dessen Bahn).
- Größe IV gibt es nicht für K5 bis M9, Größe VI nicht für B0 bis F4: dann Größe V.
- Typ O und B sind ohne DM nicht zu erreichen (B6 26); die Spielleitung setzt sie, wenn sie will.
- Mit diesen Würfen kommen Größe Ia und Ib nie vor (Hauptstern ab Zeile 2, Begleiter ab Zeile 4).

## Bahnen und Zonen

*B6 27–31, 34 („Maximum Orbits“, „Zones“, Table of Zones).*

- **Höchste Bahn**: 2D auf die Spalte *Höchste Bahn* oben, DM **+4** bei Größe III, **+8** bei Ia,
  Ib, II, **−4** bei Typ M, **−2** bei Typ K. Nach oben offen. Verfügbar sind die Bahnen 0 bis zu
  dieser Zahl.
- **Begleiter in Bahn n** sperren: Bahnen innerhalb von n dürfen höchstens n ÷ 2 (abgerundet) sein,
  Bahnen außerhalb mindestens n + 2. Beispiel: Begleiter in Bahn 2 → Bahn 0 und ab Bahn 4 frei.
- **Zonen** je Bahn: *im Stern* oder *unverfügbar* (zu heiß, „–“), *innen* (I), *bewohnbar* (H),
  *außen* (O). In jeder Spalte der Table of Zones liegen von innen nach außen erst die
  unverfügbaren Bahnen, dann innere, dann höchstens eine bewohnbare, dann äußere. Darum reicht je
  Stern: die **erste verfügbare Bahn** und die **bewohnbare Bahn**; was dazwischen liegt, ist innen,
  was darüber liegt, außen. Ohne bewohnbare Bahn ist alles Verfügbare außen.

**Table of Zones**, verdichtet (B6 29–31), je Typ: erste verfügbare Bahn / bewohnbare Bahn
(„–“: keine):

| Größe | B0 | B5 | A0 | A5 | F0 | F5 | G0 | G5 | K0 | K5 | M0 | M5 | M9 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| II | 7 / 12 | 5 / 11 | 3 / 9 | 2 / 8 | 2 / 8 | 2 / 8 | 2 / 8 | 2 / 8 | 2 / 9 | 3 / 9 | 4 / 10 | 6 / 11 | 6 / 11 |
| III | 7 / 12 | 5 / 10 | 1 / 8 | 1 / 7 | 1 / 6 | 1 / 6 | 1 / 6 | 1 / 7 | 1 / 7 | 1 / 8 | 2 / 8 | 4 / 9 | 5 / 9 |
| IV | 7 / 12 | 3 / 9 | 1 / 7 | 0 / 6 | 0 / 6 | 0 / 5 | 0 / 5 | 0 / 5 | 0 / 4 | (V) | (V) | (V) | (V) |
| V | 6 / 12 | 3 / 9 | 0 / 7 | 0 / 6 | 0 / 5 | 0 / 4 | 0 / 3 | 0 / 2 | 0 / 2 | 0 / 0 | 0 / 0 | 0 / – | 0 / – |
| VI | (V) | (V) | (V) | (V) | (V) | 0 / 3 | 0 / 2 | 0 / 1 | 0 / 1 | 0 / – | 0 / – | 0 / – | 0 / – |

Weiße Zwerge (D): DB 0 / 0; DA, DF, DG, DK, DM 0 / – (alles außen). Bei Größe II und III beginnt
die Tabelle bei Bahn 1; Bahn 0 ist dort unverfügbar. Ia und Ib stehen in B6 30, kommen aber nicht
vor (siehe oben).

**Planetary Orbits** (B6 28): Abstand jeder Bahn vom Stern.

| Bahn | Mio. km | AU |
|---|---|---|
| 0 | 29,9 | 0,2 |
| 1 | 59,8 | 0,4 |
| 2 | 104,7 | 0,7 |
| 3 | 149,6 | 1,0 |
| 4 | 239,3 | 1,6 |
| 5 | 418,9 | 2,8 |
| 6 | 777,9 | 5,2 |
| 7 | 1.495,9 | 10 |
| 8 | 2.932 | 19,6 |
| 9 | 5.804 | 38,8 |
| 10 | 11.548 | 77,2 |
| 11 | 23.038 | 154 |
| 12 | 46.016 | 307,4 |
| 13 | 91.972 | 614,8 |
| 14 | 183.885 | 1.229,2 |
| 15 | 367.711 | 2.458 |

## Gasriesen und Hauptwelt platzieren

*B6 24 (Checklist, Schritt 11), 28 („Gas Giant“), 34–35 („Gas Giants“, „Place Known Components“).*

- **Zahl der Gasriesen**: Ob es welche gibt, sagt bei einer schon erschaffenen Welt das UWP
  (`Hex.gasGiant`); wie viele, 2D auf die Spalte *Gasriesen (Anzahl)* der Tabelle *System
  Features*. Höchstens so viele, wie es verfügbare (nicht leere) Bahnen in der bewohnbaren und
  äußeren Zone gibt; fehlt eine Bahn, entsteht eine neue in der äußeren Zone.
- **Reihenfolge**: erst die Gasriesen, dann die Planetoidengürtel, zuletzt die Hauptwelt.
- **Gasriesen** kommen zufällig in verfügbare Bahnen der bewohnbaren und äußeren Zone; in innere
  nur, wenn sonst keine frei ist. Zufällig heißt: jede infrage kommende Bahn gleich
  wahrscheinlich (bei mehr als sechs in Gruppen zu höchstens sechs würfeln).
- **Hauptwelt** in die bewohnbare Zone. Sitzt dort schon ein Gasriese, ist die Hauptwelt **ein Mond
  dieses Gasriesen**. Ein Asteroidengürtel als Hauptwelt darf in jede verfügbare Bahn. Mit
  Atmosphäre 1 oder weniger oder A und mehr muss sie nicht in der bewohnbaren Zone liegen.
- Monde haben keine eigenen Monde (B6 36: Monde gibt es für Planeten und Gasriesen).

## Planetoidengürtel, leere und eingefangene Bahnen

*B6 28 (Tabelle System Features), 29 (Captured Planets and Empty Orbits), 34–35.*

- **Planetoidengürtel**: 2D auf die Spalte *vorhanden* mit DM − Zahl der Gasriesen; bei „ja“ 2D
  auf die Spalte *Anzahl*, ebenfalls mit DM − Zahl der Gasriesen. Höchstens so viele, wie nach den
  Gasriesen Bahnen frei sind. Sie kommen in freie Bahnen, wenn möglich in die Bahn direkt innerhalb
  eines Gasriesen (Gasriese in Bahn 8 → Gürtel in Bahn 7).

| Wurf | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| vorhanden | ja | ja | ja | ja | ja | ja | ja | nein | nein | nein | nein | nein | nein |
| Anzahl | 3 | 2 | 2 | 2 | 2 | 2 | 2 | 1 | 1 | 1 | 1 | 1 | 1 |

- **Leere und eingefangene Bahnen** (B6 29), je 1D, DM +1 auf alle Spalten bei Sterntyp B oder A:

| 1W6 | eingefangen? | Anzahl | leer? | Anzahl |
|---|---|---|---|---|
| 1 | nein | 1 | nein | 1 |
| 2 | nein | 1 | nein | 1 |
| 3 | nein | 2 | nein | 2 |
| 4 | nein | 2 | nein | 3 |
| 5 | ja | 3 | ja | 3 |
| 6 | ja | 3 | ja | 3 |

- **Leere Bahn**: 2D ergibt die Nummer der leeren Bahn; ist sie nicht verfügbar oder schon leer,
  neu würfeln. Leere Bahnen haben keinen Planeten (ein Begleitstern dort bleibt).
- **Eingefangener Planet**: 2D ergibt die Bahn, der er am nächsten liegt; 2D − 7, mal 10 %, ist
  die Abweichung davon (z. B. 40 % hinter Bahn 5 = Bahn 5,4; −10 % von Bahn 2 = Bahn 1,9). Er
  liegt so auf einer Zwischenbahn außerhalb der Standardbahnen.

## Weitere Welten

*B6 35–36 („World Generation“); Checklist B6 24, Schritt 12.* Jede verfügbare, nicht leere Bahn
ohne Gasriese, Gürtel oder Hauptwelt bekommt eine Welt, dazu jeder eingefangene Planet; man
beginnt bei der innersten Bahn.

| Wert | Wurf | DMs |
|---|---|---|
| Größe | 2D − 2 | Bahn 0: −5; Bahn 1: −4; Bahn 2: −3 (Checklist: −2); um einen Stern des Typs M: −2. 0 oder weniger: kleine Welt S (Größe 0 steht nur Asteroiden- und Planetoidengürteln zu) |
| Atmosphäre | 2D − 7 + Größe | innere Zone −2; äußere Zone −4 (Checklist: −2); Größe 0 oder S: 0; mindestens zwei Bahnen jenseits der bewohnbaren Zone und genau 12 auf 2D: Atmosphäre A |
| Hydrographie | 2D − 7 + Größe | innere Zone: 0; äußere Zone −2 (Checklist: −4); Größe 1 oder weniger (auch S): 0; Atmosphäre 1 oder weniger oder A und mehr: −4 |
| Bevölkerung | 2D − 2 | innere Zone −5; äußere Zone −3 (Checklist: −5); Atmosphäre nicht 0, 5, 6 oder 8: −2; ist sie so groß wie die der Hauptwelt oder größer: Hauptwelt − 1 |

Werte unter 0 gelten als 0, die Hydrographie höchstens als A. Wo Kapitel und Checklist
verschiedene DMs nennen, steht die Checklist in Klammern. Danach bekommt jede Welt Monde (siehe
unten), und B6 38–39 gibt Regierung, Gesetz, Einrichtungen, Tech-Level und Raumhafen der
Nebenwelten (hier nicht übertragen).

## Zahl der Monde

*B6 24 (Checklist, Schritt 13) und 36 („Satellites“).*

| Körper | Monde |
|---|---|
| Planet (Größe 1 oder mehr) | 1D − 3 |
| kleiner Gasriese | 2D − 4 |
| großer Gasriese | 2D |

- Ergebnis 0 oder weniger: keine Monde.
- Keine Monde für Welten der Größe S, für Planetoiden- und Asteroidengürtel (Größe 0).
- Monde haben mindestens 200 km Durchmesser; kleinere Brocken (eingefangene Planetoiden) kann
  jede Welt haben, sie zählen nicht.

## Größe der Monde

*B6 24 (Schritt 14 A) und 36 („Satellite Size“).*

| Körper | Größe des Mondes |
|---|---|
| Planet | Größe des Planeten − 1D |
| großer Gasriese | 2D − 4 |
| kleiner Gasriese | 2D − 6 |

- Ergebnis **0**: der „Mond“ ist ein **Ring** (Code R).
- Ergebnis **unter 0**: eine **kleine Welt** (Code S).

## Bahnen der Monde

*B6 28 („Satellite Orbits“) und 36–37 („Satellite Orbits“).*

1. **Art der Bahn**: 2D; **7 oder weniger: nah** (close), **8 oder mehr: fern** (far). Nur bei
   Gasriesen: **12 oder mehr: extrem fern** (extreme).
2. Jeder weitere Mond desselben Körpers bekommt auf diesen Wurf einen DM: der zweite −1, der
   dritte −2 usw. (DM = Nummer des Wurfs − 1).
3. **Abstand**: 2D auf die Spalte der Bahnart. Ein **Ring** würfelt stattdessen 1D auf die Spalte
   *Ring*.
4. Landet ein Mond auf der Bahn eines anderen, wird neu gewürfelt.

Abstand in **Radien des Planeten**:

| Wurf | Ring (1D) | Nah (2D) | Fern (2D) | Extrem (2D) |
|---|---|---|---|---|
| 1 | 1 | – | – | – |
| 2 | 1 | 3 | 15 | 75 |
| 3 | 1 | 4 | 20 | 100 |
| 4 | 2 | 5 | 25 | 125 |
| 5 | 2 | 6 | 30 | 150 |
| 6 | 3 | 7 | 35 | 175 |
| 7 | – | 8 | 40 | 200 |
| 8 | – | 9 | 45 | 225 |
| 9 | – | 10 | 50 | 250 |
| 10 | – | 11 | 55 | 275 |
| 11 | – | 12 | 60 | 300 |
| 12 | – | 13 | 65 | 325 |

Beispiel: Eine Welt der Größe 8 hat 6.400 km Radius. Ein naher Mond liegt 19.200 bis 83.200 km
von ihrer Mitte entfernt (2 bis 8 Raumbänder), ein ferner 96.000 bis 416.000 km (10 bis 42
Raumbänder). Die Sprunggrenze von 100 Durchmessern liegt bei 1,28 Mio. km.

**Umlaufzeit** (B6 43): nach Kepler aus Masse und Abstand; Book 6 gibt die Formel in Erde-Mond-
Massen, Erde-Mond-Abständen (400.000 km) und Mondmonaten (28 Tage). Mit G·M aus der Masse ist das
dasselbe wie T = 2π · √(r³ ÷ G·M).

## UWP der Monde

*B6 24 (Schritt 14 C–E) und 37.* Die Zone (innen, bewohnbar, außen) kommt aus der Lage zum Stern.

| Wert | Wurf | DMs |
|---|---|---|
| Atmosphäre | 2D − 7 + Größe des Mondes | innere Zone −4; äußere Zone −4 (Checklist: dazu „äußere Zone +2, 12 werfen für A“); Größe 1 oder weniger (auch S und R): 0 |
| Hydrographie | 2D − 7 + Größe des Mondes | innere Zone −4 (Checklist: dann 0); äußere Zone −2 (Checklist: −4); Größe 1 oder weniger: 0 (Checklist: 0 oder weniger); Atmosphäre 1 oder weniger oder A und mehr: −4 |
| Bevölkerung | 2D − 2 | innere Zone −6 (Checklist: −5); äußere Zone −5 (Checklist: −4); Größe 4 oder weniger −2 (fehlt in der Checklist); Atmosphäre nicht 5, 6 oder 8: −2; Ring: 0; ist sie so groß wie die der Hauptwelt oder größer: Hauptwelt − 1 |

Das Kapitel und die Checklist (S. 24) nennen für dieselben Würfe zum Teil verschiedene DMs; die
Tabelle gibt das Kapitel (S. 37) wieder, die Abweichungen der Checklist stehen in Klammern.

Danach (B6 38–39, *Additional Planet and Satellite Characteristics*): Regierung, Gesetz,
Einrichtungen (Farming, Mining, Colony, Research Laboratory, Military Base), Tech-Level und
Raumhafen (*Spaceport*) für jeden Mond außer Ringen. Für die Raumkarte vorerst nicht nötig.

## Gasriesen

*B6 28 („Gas Giant“), 36, 39 („Gas Giants“), 48 („Gas Giants“).*

- **Größe**: 1D; **3 oder weniger: großer Gasriese** (LGG), **4 oder mehr: kleiner** (SGG).
- **Radius**: groß mindestens 60.000 km (bis etwa 120.000 km), klein 20.000 bis unter 60.000 km.
  Einen Wurf für den genauen Radius gibt Book 6 nicht.
- **Dichte**: K ≈ 0,2 (B6 43), also ein Fünftel der Erddichte.
- **Monde**: siehe oben (kleiner Gasriese 2D − 4, großer 2D; Größen 2D − 6 bzw. 2D − 4; extrem
  ferne Bahnen bei 12+).
- Gasriesen haben keine weiteren Werte (kein UWP). Man kann aus ihrer Atmosphäre Treibstoff
  schöpfen (*skimming*, unraffiniert).
- Wie viele Gasriesen ein System hat und wo sie um den Stern laufen, würfelt die volle
  Systemerschaffung (B6 28, *System Features*). Book 3 und die Starter Edition sagen nur, ob es im
  System mindestens einen gibt (in der App `Hex.gasGiant`).

## Kleine Welten, Ringe, Gürtel

*B6 36, 39.*

- **Kleine Welt (S)**: eine einzelne Welt unter 1.600 km Durchmesser, 500 bis 1.500 km
  ((2D + 3) × 100 km), wie Größe 0 behandelt (Atmosphäre und Hydrographie 0). Die Tabelle der
  Weltdaten (S. 48) rechnet sie mit 200 km Durchmesser.
- **Ring (R)**: Teilchen unter 500 mm in einer Bahn um die Welt; Bevölkerung 0, selten Basen oder
  eine kleine Siedlung. Abstand 1 bis 3 Planetenradien (Spalte *Ring*).
- **Asteroiden- und Planetoidengürtel** (Größe 0): 1.000 bis 10.000 Brocken in einem Gürtel um den
  **Stern**. *Asteroidengürtel* heißt er, wenn er die Hauptwelt ist, sonst *Planetoidengürtel*.
  Gürtel haben keine Monde.

## Masse und Schwerkraft

*B6 43 und 48–49 („World Data“); SR 22 („Different Gravity“).*

- **Volumen**: V = (R ÷ 8)³ in Erdvolumen (R = Größe). (Book 6 schreibt 4,188 · (R ÷ 8)³; der
  Faktor 4,188 = 4π ÷ 3 hebt sich gegen das Erdvolumen weg, die Tabelle rechnet ohne ihn.)
- **Masse**: M = K · (R ÷ 8)³ in Erdmassen; K = 1 für Erddichte, etwa 0,2 für Gasriesen.
- **Schwerkraft an der Oberfläche**: G = M · 64 ÷ R², also **K · R ÷ 8** in G. Das ist dieselbe
  Regel wie SR 22 (Größe 8 = 1 G, je Stufe 12,5 %).
- Für Gasriesen setzt man für R den Durchmesser in Einheiten von 1.600 km ein. Beispiel: großer
  Gasriese mit 70.000 km Radius → R = 87,5 → Schwerkraft 0,2 × 87,5 ÷ 8 ≈ 2,2 G.

**World Data** (B6 48):

| Größe | Volumen | Masse | Oberfläche | Schwerkraft (G) | Fluchtgeschwindigkeit (km/s) |
|---|---|---|---|---|---|
| S | 0,000015 | 0,000015 | 0,0006 | 0,024 | 0,26 |
| 1 | 0,0019 | 0,0019 | 0,015 | 0,122 | 1,35 |
| 2 | 0,015 | 0,015 | 0,063 | 0,240 | 2,69 |
| 3 | 0,053 | 0,053 | 0,141 | 0,377 | 4,13 |
| 4 | 0,125 | 0,125 | 0,250 | 0,500 | 5,49 |
| 5 | 0,244 | 0,244 | 0,391 | 0,625 | 6,87 |
| 6 | 0,472 | 0,472 | 0,563 | 0,840 | 8,72 |
| 7 | 0,670 | 0,670 | 0,766 | 0,875 | 9,62 |
| 8 | 1,000 | 1,000 | 1,000 | 1,000 | 11,00 |
| 9 | 1,420 | 1,420 | 1,266 | 1,120 | 12,35 |
| A | 1,950 | 1,950 | 1,563 | 1,250 | 13,73 |

Die Tabelle weicht an einigen Stellen von der eigenen Formel ab (Größe 6: Formel 0,75 G, Tabelle
0,84 G; Masse bei 6 und 9 ebenso). Die App rechnet mit der Formel (wie SR 22), nicht mit der
Tabelle.

## Was Book 6 sonst noch hat

Nicht übertragen, weil die Raumkarte es noch nicht braucht (B6 24–49):

- Sterndaten: Leuchtkraft, Temperatur, Radius, Masse (B6 42–46).
- Regierung, Gesetz, Einrichtungen, Tech-Level und Raumhafen der Nebenwelten und Monde (B6 38–39).
- Bestimmung der Hauptwelt in einem ganz neu erschaffenen System (B6 37).
- Bahnen und Welten um Begleitsterne und Systeme um ferne Begleiter.
- Temperatur aus Albedo, Treibhauseffekt, Exzentrizität und Achsneigung; Jahreslänge.
- Sprunggrenze am Stern: Fehlsprünge sind innerhalb von 20 und 200 Sternradien wahrscheinlicher.

Die App würfelt das System einer schon erschaffenen Hauptwelt (`model/star-system.ts`, Tabellen in
`src/data/stars.json`); diese Regeln kommen, wenn sie gebraucht werden.
