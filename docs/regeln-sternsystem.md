# Regeln für Sternsysteme: Monde, Ringe, Gasriesen

Dieses Dokument ersetzt beim Entwickeln das Nachschlagen im PDF. Es fasst die Regeln aus **Book 6
*Scouts*** (GDW 1983) zusammen, die die **Raumkarte** braucht: Monde und Ringe einer Welt,
Gasriesen und ihre Monde, Größe, Masse und Schwerkraft von Welten. Die volle Erschaffung eines
Sternsystems (Sterne, Bahnen um den Stern, weitere Planeten, Zonen) steht in Book 6 ebenfalls, ist
hier aber nur so weit übertragen, wie es für Monde und Gasriesen nötig ist.

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
| [Zahl der Monde](#zahl-der-monde) | B6 24, 36 | ○ |
| [Größe der Monde](#größe-der-monde) | B6 24, 36 | ○ |
| [Bahnen der Monde](#bahnen-der-monde) | B6 28, 36–37 | ○ |
| [UWP der Monde](#uwp-der-monde) | B6 24, 37 | ○ |
| [Gasriesen](#gasriesen) | B6 28, 36, 39, 48 | ○ |
| [Kleine Welten, Ringe, Gürtel](#kleine-welten-ringe-gürtel) | B6 36, 39 | ○ |
| [Masse und Schwerkraft](#masse-und-schwerkraft) | B6 43, 48–49; SR 22 | ◐ (Schwerkraft nach SR 22 für die Traglast) |
| [Was Book 6 sonst noch hat](#was-book-6-sonst-noch-hat) | B6 24–49 | ○ |

---

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

- Sterne: Art, Größe, Begleitsterne, Leuchtkraft, Temperatur, Radius, Masse.
- Bahnen um den Stern (*Planetary Orbits*, 0 bis 15, mit AU und Mio. km), Zonen (innen,
  bewohnbar, außen), verfügbare Bahnen, eingefangene Planeten, leere Bahnen.
- Weitere Planeten und Planetoidengürtel mit UWP, Bestimmung der Hauptwelt.
- Temperatur aus Albedo, Treibhauseffekt, Exzentrizität und Achsneigung; Jahreslänge.
- Sprunggrenze am Stern: Fehlsprünge sind innerhalb von 20 und 200 Sternradien wahrscheinlicher.

Diese Regeln kommen, wenn die App ganze Sternsysteme erzeugt.
