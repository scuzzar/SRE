# Konzept: Oberflächenkarte

> **Stand: freigegeben** (14. November 2026) mit den Änderungen 2026-11-14i (Oberflächenkarte) und
> 2026-11-14j (Orte) im [Domänenmodell](domain-model.md). Die Regeln hier gelten als Teil des
> Modells, einschließlich der Hausregeln (⚑).
>
> Abgestimmt: feste Feldgröße von etwa 250 km (Abschnitt 1), Flüsse, Vulkane und alle Städte in der
> ersten Fassung, ein drehbarer Globus als einzige Ansicht (keine flache Karte), das Gelände
> jedes Feldes wird gespeichert, kein Nachbessern von Hand (nur neu würfeln), eigener Bildschirm
> von der Weltkarte aus.

Die **Oberflächenkarte** zeigt die Oberfläche einer Welt: Wasser, Land, Gebirge, Wüsten, Wälder,
Eis, Flüsse, Vulkane und Städte auf einem Hexraster, gezeigt als drehbarer Globus. Sie ist nicht die *Weltkarte*, also die Karte
der App mit dem UWP im Klartext (siehe Begriffe im Domänenmodell).

Dieses Konzept enthält **alle Regeln, die man zum Bauen braucht**, mit allen Tabellen. Das PDF muss
man dafür nicht mehr öffnen. Seitenangaben beziehen sich auf die gedruckten Seitenzahlen des
Buchs. Jede Stelle, an der wir vom Buch abweichen oder etwas ergänzen, trägt das Zeichen **⚑**.

## Quellen

| Quelle | Was daraus kommt |
|---|---|
| *World Builder's Handbook* (Digest Group Publications, 1989, für MegaTraveller), Kapitel *Mapping a World*, S. 87–90 | Raster, Platten, Kontinente und Ozeane platzieren, Gelände, Städte auf der Karte |
| dasselbe Buch, *Hydrosphere Related Details*, S. 69–70, und *Native Life*, S. 68 | Wasseranteil, Platten, Land- und Wassermassen, Leben (in der App schon umgesetzt, siehe `Surface`) |
| dasselbe Buch, *Atmosphere Related Details*, S. 66 | Breitengrad-Zuschläge auf die Temperatur |
| dasselbe Buch, *Population Related Details*, S. 72–74 | Zahl und Größe der Städte, Raumhäfen der Städte, Orbitalstädte |
| dasselbe Buch, Einleitung, S. 1 | Würfelverfahren für Zahlen von 0 bis 9 |
| *Mongoose Traveller 2e*, Core Rulebook S. 251–252 | Temperatur der Welt als Stufe, Wasser-Malus (in der App umgesetzt) |

Book 6 *Scouts* (Classic Traveller) hat keine Regeln für Oberflächenkarten, nur Werte für die ganze
Welt. Nach einer Recherche ist *Grand Survey* (DGP, 1986, für Classic Traveller) die erste Quelle
mit einem vollständigen Verfahren vom UWP zur Hexkarte. Das *World Builder's Handbook* (1989)
führt es mit *Grand Census* (1987) zusammen.

**Rechte:** Die Rechte an den DGP-Büchern sind ungeklärt. Wir übernehmen nur die Mechanik (Würfe,
Tabellenwerte) mit eigenen deutschen Texten, keine Bilder (siehe README, *Rechtlicher Hinweis*).

## Grundsatz: Das Buch würfelt Mengen, die Platzierung ist Handarbeit

Das Buch würfelt, **wie viel** es von etwas gibt: Platten, Kontinente, Gebirgshexe, Flüsse, Wüsten,
Städte. **Wo** etwas liegt, entscheidet die Spielleitung von Hand. Wörtlich heißt es, die
Platzierung „cannot be regulated by rules or random tables“.

⚑ **Im Solo-Spiel gibt es keine Spielleitung, also platziert die App.** Dafür beschreibt dieses
Konzept bei jedem Schritt ein eigenes Verfahren (meist Wachstum von zufälligen Startfeldern aus,
siehe *Wachstum*). Es hält die gewürfelten Mengen und die Leitlinien des Buchs ein. Das ist der
aufwendigste Teil und reiner Eigenbau.

**Würfe und Werte:** Alle Würfe laufen einmal beim Erzeugen der Karte. Gespeichert wird nur das
Ergebnis (siehe *Was gespeichert wird*), nach dem Grundsatz des Modells „Werte, nicht Würfe“.
„Neu würfeln“ ersetzt die ganze Karte.

## Was schon da ist

Diese Werte speichert die App heute schon an jeder neu erschaffenen Welt (siehe Domänenmodell,
*Weltenerschaffung* und *Oberfläche*). Die Tabellen dazu stehen in `src/data/worlds.json`, die
Würfe in `src/model/sector.ts`.

| Wert | Woher | Angepasst |
|---|---|---|
| UWP: Raumhafen, Größe, Atmosphäre, Hydrographie, Bevölkerung, Regierung, Gesetz, TL | Classic Traveller | – |
| Temperatur: Gefroren, Kalt, Gemäßigt, Heiß, Kochend | Mongoose, 2W6 + DM der Atmosphäre | Rand der habitablen Zone (±4) weggelassen, kommt mit einem Sternsystem |
| Hydrographie mit Wasser-Malus | Classic Traveller, Malus nach Mongoose (−2 heiß, −6 kochend, nicht bei Atmosphäre D) | Die Ausnahme „panthalassische Atmosphäre F“ passt nicht zu Classic Traveller und entfällt |
| Wasseranteil in % (`Surface.water`) | Buch S. 69 | – |
| Tektonische Platten (`Surface.plates`) | Buch S. 69 | Ohne Kerntyp: Größe 0 hat keine Platten, sonst Größe + Hydrographie − 2W6, mindestens 1 |
| Bei 50–99 % Wasser: große und kleine Kontinente, große Inseln, Archipele | Buch S. 70, Kontinente-Tabelle | Höchstens 6 große Kontinente, der Rest zählt zu den kleinen |
| Bei 1–49 % Wasser: große und kleine Ozeane, kleine Meere, verstreute Seen | Buch S. 70, Ozeane-Tabelle | – |
| „Nur Archipele“ bzw. „nur Seen“ | Buch S. 70 | Die ganze Fläche als Zahl halber Hexe, z. B. 150 Archipele bei 85 % Wasser |
| Einheimisches Leben (`Surface.life`) | Buch S. 68 | Die DMs nach Sterntyp entfallen. Temperatur-DM −1 für alles außer *Gemäßigt* |

Die Zahlen der Land- und Wassermassen gelten für das Raster des Buchs mit 500 Hexen. Abschnitt 2
rechnet sie auf das feinere Raster um. Ältere Welten ohne Temperatur oder Oberfläche würfeln sie
auf der Weltkarte nach.

## 1. Raster

### Das Raster des Buchs

- Die Karte ist ein flach ausgelegter **Ikosaeder** aus 20 Dreiecken, den *Kartendreiecken*.
- Oben ist Norden. Die fünf oberen Dreiecke treffen sich mit ihren Spitzen am Nordpol, die fünf
  unteren am Südpol, die zehn mittleren bilden ein Band um den Äquator.
- Im Buch hat jede Welt **500 Hexe**, 25 je Dreieck. Der Äquator ist 35 Hexe lang. Ein Hex misst
  also Umfang ÷ 35, bei Terra etwa 1150 km.

### ⚑ Unser Raster: feste Feldgröße von etwa 250 km

Statt fester 500 Hexe hat bei uns **jedes Feld etwa 250 km** Durchmesser. („Feld“ heißt in diesem
Konzept immer *Oberflächenfeld*, siehe Begriffe im Domänenmodell, nie das Hexfeld des Subsektors.) Kleine Welten haben
weniger Felder, große mehr.

- Der Durchmesser einer Welt ist Größe × 1600 km (Classic Traveller).
- Jede Kante eines Kartendreiecks ist **n = 4 × Größe** Felder lang.
  Herleitung: Umfang ÷ 5 Dreiecke ÷ 250 km = π × 1600 × Größe ÷ 1250 ≈ 4,02 × Größe.
- Das Raster ist ein *geodätisches Gitter*: Man teilt jede Kante des Ikosaeders in n Abschnitte,
  teilt so jedes Dreieck in n² kleine Dreiecke und schiebt alle Eckpunkte auf die Kugel. **Jeder
  Eckpunkt ist ein Feld.** Seine Nachbarn sind die Eckpunkte, mit denen er durch eine Kante
  verbunden ist.
- Zahl der Felder: **10 × n² + 2**. Fast alle sind Sechsecke. Die 12 Ecken des Ikosaeders sind immer
  Fünfecke (5 Nachbarn), zwei davon liegen an den Polen.
- Die genaue Feldbreite ist π × 1600 × Größe ÷ (5 × n) = 251 km für jede Größe.

| Größe | Durchmesser | n (Felder je Kante) | Felder gesamt | Umrechnung Fläche f | Umrechnung Länge l |
|---|---|---|---|---|---|
| 0 | – | – | keine Karte | – | – |
| 1 | 1 600 km | 4 | 162 | 0,33 | 0,57 |
| 2 | 3 200 km | 8 | 642 | 1,31 | 1,14 |
| 3 | 4 800 km | 12 | 1 442 | 2,94 | 1,71 |
| 4 | 6 400 km | 16 | 2 562 | 5,22 | 2,29 |
| 5 | 8 000 km | 20 | 4 002 | 8,16 | 2,86 |
| 6 | 9 600 km | 24 | 5 762 | 11,76 | 3,43 |
| 7 | 11 200 km | 28 | 7 842 | 16,00 | 4,00 |
| 8 | 12 800 km | 32 | 10 242 | 20,90 | 4,57 |
| 9 | 14 400 km | 36 | 12 962 | 26,45 | 5,14 |
| A | 16 000 km | 40 | 16 002 | 32,65 | 5,71 |

- **f** sagt, wie viele unserer Felder ein Hex des Buchs an Fläche ausmacht: f = (n ÷ 7)².
- **l** sagt, wie viele unserer Felder ein Hex des Buchs an Länge ausmacht: l = n ÷ 7.
- Die 7 kommt daher, dass das Buch auf jeder Welt 7 Hexe je Dreieckskante hat (35 Hexe am Äquator
  über 5 Dreiecke).

**Größe 0** (Asteroidengürtel) hat keine Kugel und keine Oberflächenkarte.

**Verkehrsmittel als Maßstab:** Grob ist ein Feld eine Tagesreise mit einem Bodenfahrzeug, ein paar
Stunden mit dem Air/Raft und rund eine Woche zu Fuß. ⚑ Die Geschwindigkeiten sind noch nicht aus
den Regeln geprüft. Bevor die App das irgendwo anzeigt, kommen sie aus den Regeln.

### Breitengrad jedes Feldes

Jedes Feld hat einen Punkt auf der Kugel und damit einen **Breitengrad φ** von −90° (Südpol) bis
+90° (Nordpol). Die Kugel liegt so, dass zwei Ecken des Ikosaeders genau auf den Polen sitzen.

Das Buch rechnet die Temperatur in **11 Hexreihen je Halbkugel**, Reihe 1 am Äquator, Reihe 11 am
Pol. ⚑ Wir rechnen stattdessen mit dem Breitengrad. Eine Reihe des Buchs entspricht 90° ÷ 11 ≈
8,2° Breite. Die Reihe eines Feldes als Kommazahl ist:

> **Reihe(φ) = |φ| ÷ 90 × 11 + 0,5**, begrenzt auf 1 bis 11.

Wo das Buch „Reihen“ zählt (Vergletscherung, Abstand zu den Polkappen), gilt: 1 Reihe = 8,2° Breite.

### Nachbarschaft und Abstand

- **Benachbart** heißt: durch eine Kante des Gitters verbunden.
- **Abstand** zweier Felder ist die kleinste Zahl von Schritten von Nachbar zu Nachbar.
- **Zusammenhängend** heißt: Man kommt von jedem Feld der Gruppe zu jedem anderen, ohne die Gruppe
  zu verlassen.

### Wachstum

⚑ Die meisten Schritte setzen eine Fläche bestimmter Größe auf die Karte. Dafür benutzen alle
Schritte dasselbe Verfahren, das *Wachstum*:

1. Man wählt ein Startfeld, das die Bedingungen des Schritts erfüllt.
2. Solange die Fläche zu klein ist: Unter allen freien Nachbarfeldern der Fläche, die die
   Bedingungen erfüllen, nimmt man eines zufällig, gewichtet mit einem Rauschwert. Die Fläche wächst
   um dieses Feld.
3. Findet sich kein passendes Nachbarfeld mehr, ist die Fläche so groß, wie sie werden kann. Der
   Rest geht an die nächste Fläche derselben Art oder verfällt (je nach Schritt).

Der **Rauschwert** ist ein glattes Zufallsfeld auf der Kugel (z. B. mehrere Lagen Wertrauschen). Er
sorgt für zerfranste Küsten statt runder Flecken. Je Karte gibt es einen eigenen Rauschwert.

## 2. Mengen umrechnen

⚑ Das Buch zählt in seinen Hexen. Bei uns gilt:

| Art der Menge im Buch | Bei uns | Beispiel Größe 8 (f = 20,9, l = 4,57) |
|---|---|---|
| Prozent (Wasseranteil, Gebirge, 15 % für große Kontinente) | bleibt Prozent unserer Felder | 33 % Wasser → 3 380 Wasserfelder |
| Fläche in Hexen (Plattengröße, kleines Meer, große Insel, Wüsten, Dschungel, Zahl je Kartendreieck, Schwellen wie „10 zusammenhängende Hexe“) | × f, gerundet, mindestens 1 | 1 kleines Meer → 21 Felder |
| Halbes Hex (Archipel, verstreuter See) | × f ÷ 2, gerundet, mindestens 1 | 1 Archipel → 10 Felder |
| Länge oder Abstand in Hexen (Flusslänge, „höchstens 3 Hexe vom Ozean“, „nur ein Hex auseinander“) | × l, gerundet, mindestens 1 | Fluss von 4 Hexen → 18 Felder |
| Reihen (Vergletscherung, Abstand zu den Polkappen) | × 8,2° Breite | 3 Reihen → 24,5° |

**Kartendreiecke** bleiben bei uns die 20 großen Dreiecke. Jedes Feld gehört zu genau einem davon
(Felder auf Kanten und Ecken dem ersten, in dem sie liegen).

Die Würfe des Buchs bleiben unverändert. Umgerechnet wird erst das Ergebnis.

## 3. Tektonische Platten

**Anzahl:** schon gespeichert (`Surface.plates`).

**Größe je Platte** (S. 87), 1W6 auf die Tabelle, das Ergebnis × f:

| 1W6 | Größe in Hexen des Buchs |
|---|---|
| 1 | 2W6 × 5 |
| 2 | 2W6 × 10 |
| 3 | 2W6 × 15 |
| 4 | 2W6 × 20 |
| 5 | 2W6 × 25 |
| 6 | 2W6 × 30 |

- Die letzte Platte bekommt immer alle übrigen Felder.
- Reichen die Felder nicht für alle Platten, werden die letzten Platten kleiner. Jede Platte hat
  mindestens ein Feld.

⚑ **Platzieren:** Die Startfelder der Platten liegen zufällig, aber jeweils mindestens
(Felder ÷ Platten)^½ Schritte voneinander entfernt. Dann wachsen alle Platten reihum um je ein Feld,
bis jede ihre Größe hat. Die letzte Platte füllt den Rest. Das Ergebnis: Jedes Feld gehört zu genau
einer Platte.

**Grenzen:** Eine *Plattengrenze* ist die Menge aller Kanten zwischen Feldern zweier bestimmter
Platten. Zwei Platten haben höchstens eine Grenze. Auf der fertigen Karte sind die Grenzen nicht zu
sehen. Sie dienen als Vorlage für Kontinente, Gebirge und Vulkane.

**Bewegung je Grenze**, 2W6:

| 2W6 | Bewegung | Folge |
|---|---|---|
| 2–5 | *konvergent*: die Platten schieben sich zusammen | Erdbeben, Gebirgsbildung |
| 6–8 | *seitlich*: die Platten gleiten aneinander vorbei | Verwerfungen wie der San-Andreas-Graben |
| 9–12 | *divergent*: die Platten gehen auseinander | tiefe Gräben |

## 4. Wasser und Land

**Zahl der Felder:**
- Wasserfelder = Wasseranteil ÷ 100 × Felder, gerundet.
- Landfelder = Felder − Wasserfelder.

**Was platziert wird:**

| Wasseranteil | Vorgehen |
|---|---|
| 0 % | Kein freies Wasser. Alles ist Land, weiter mit Abschnitt 6. |
| 1–49 % | Man beginnt mit lauter Land und **setzt die Gewässer**. Das Land ergibt sich als Rest. |
| 50–99 % | Man beginnt mit lauter Wasser und **setzt die Landmassen**. Das Wasser ergibt sich als Rest. |
| 100 % | Alles ist Wasser, höchstens ein paar zufällige Inseln: ⚑ 1W6 − 3 große Inseln. |

### Gewässer setzen (1–49 % Wasser)

In dieser Reihenfolge, jedes von der Zahl der Wasserfelder abgezogen:

1. **Verstreute Seen** (`Surface.scatteredLakes`): je ½ Hex, also f ÷ 2 Felder.
2. **Kleine Meere** (`Surface.smallSeas`): je 1 Hex, also f Felder.
3. **Große Ozeane** (`Surface.majorOceans`): jeder mindestens 15 % der Wasserfläche. ⚑ Die
   Wasserfläche nach Seen und Meeren wird zufällig auf große und kleine Ozeane verteilt: Jeder
   kleine Ozean bekommt (1W6 + 3) % der Wasserfläche (also 4–9 %), die großen Ozeane teilen sich
   den Rest zu gleichen Teilen ±20 %. Liegt ein großer Ozean dadurch unter 15 %, bekommen die
   kleinen Ozeane weniger, bis er 15 % hat.
4. **Kleine Ozeane** (`Surface.minorOceans`): siehe 3, jeder unter 15 %, meist unter 10 %.

- Gibt es nur einen großen und keinen kleinen Ozean, liegt fast alles Wasser in einem Becken.
- **Nur Seen** (alle Gewässer sind verstreute Seen): kein Meer, kein Ozean. Um die Seen liegen dann
  viele Sümpfe. ⚑ Jedes Landfeld neben einem See wird mit 50 % Sumpf (siehe Abschnitt 8).
- Ist das Wasser nicht nur See, gibt es trotzdem 2W6 Hexe verstreute Seen. Diese Zahl ist schon
  gewürfelt (eigene Spalte der Tabelle).

⚑ **Platzieren:** Erst die großen Ozeane, dann die kleinen, dann Meere, dann Seen, jeweils mit
*Wachstum*. Startfelder liegen möglichst weit von den Startfeldern der anderen Ozeane entfernt.
Ozeane dürfen sich nicht berühren (zwischen zwei Ozeanen bleibt mindestens ein Landfeld), außer
über eine Meerenge (Abschnitt 5). Meere und Seen liegen ganz im Land und berühren kein anderes
Wasser.

### Landmassen setzen (50–99 % Wasser)

In dieser Reihenfolge, jedes von der Zahl der Landfelder abgezogen:

1. **Archipele** (`Surface.archipelagos`): je ½ Hex, also f ÷ 2 Felder. Ein Archipel ist eine
   Gruppe kleiner Inseln: ⚑ seine Felder liegen in einem Umkreis von 2 × l Schritten, aber nicht
   zusammenhängend (zwischen den Inselchen liegt Wasser).
2. **Große Inseln** (`Surface.majorIslands`): je 1 Hex, also f Felder, zusammenhängend.
3. **Große Kontinente** (`Surface.majorContinents`): jeder mindestens 15 % der Landfläche (zum
   Vergleich auf Terra: Eurasien 37 %, Afrika 20 %, Nordamerika 16 %).
4. **Kleine Kontinente** (`Surface.minorContinents`): teilen sich den Rest, jeder unter 15 %, meist
   unter 10 %.

⚑ Größen der Kontinente: genau wie bei den Ozeanen oben (kleine je 4–9 % der Landfläche, große
teilen sich den Rest, jeder mindestens 15 %).

- **Nur Archipele** (alles Land ist Archipel): Das ganze Land liegt in Archipelen verteilt.
- Ist das Land nicht nur Archipel, gibt es trotzdem 2W6 Hexe Archipele. Diese Zahl ist schon
  gewürfelt.

### Seen und Inseln in den Massen

- Jede Landmasse darf Binnenmeere (je 1 Hex = f Felder) und verstreute Seen (je ½ Hex) haben.
  ⚑ Je großem Kontinent 1W6 − 3 Binnenmeere, je kleinem 1W6 − 4. Sie zählen zum Wasser.
- Jedes Gewässer darf große Inseln (1 Hex) und Archipele (½ Hex) haben. ⚑ Je großem Ozean 1W6 − 3
  große Inseln, je kleinem 1W6 − 4. Sie zählen zum Land.
- ⚑ Danach gleicht die App die Zahl der Wasser- und Landfelder aus, indem sie Küstenfelder der
  größten Masse umwandelt, bis der Wasseranteil wieder stimmt.

## 5. Kontinente platzieren (S. 88)

- **Verteilung:** möglichst gleichmäßig über die Platten, am besten ein Kontinent je Platte. Gibt es
  mehr Kontinente als Platten, teilen sich manche eine Platte. Gibt es weniger, bleiben manche
  Platten ohne Kontinent.
  ⚑ Die größten Kontinente kommen auf die größten Platten. Das Startfeld liegt nahe der Mitte der
  Platte (das Feld mit dem größten Abstand zur Plattengrenze).
- **Überlappung**, 2W6 je Kontinent:
  - **2–7:** Der Kontinent liegt mitten auf der Platte und reicht nicht auf Nachbarplatten, außer
    er ist zu groß für sie. ⚑ Beim *Wachstum* sind nur Felder seiner Platte erlaubt, bis keine
    mehr frei sind; dann auch Felder der Nachbarplatten.
  - **8+:** Er ragt auf eine Nachbarplatte. ⚑ Eine zufällige Nachbarplatte ist von Anfang an
    erlaubt; das Startfeld liegt nahe der gemeinsamen Grenze, höchstens 3 × l Schritte von ihr
    entfernt.
  - Eine Überlappung zeigt Erdbeben an und zieht Gebirge an (Abschnitt 7).
- Bei 1–49 % Wasser ergeben sich die Kontinente als Rest. ⚑ Jede zusammenhängende Landfläche ist
  dann ein Kontinent; für Überlappung und Flüsse zählt sie wie ein gesetzter.
- **Landenge:** Liegen zwei Landmassen nur ein Hex auseinander (bei uns: höchstens l Felder
  Wasser dazwischen), verbindet sie bei **9+ auf 2W6** eine Landenge. ⚑ Die Wasserfelder auf dem
  kürzesten Weg werden Land.
- **Meerenge:** Liegen zwei Ozeane nur ein Hex auseinander, verbindet sie bei **9+ auf 2W6** eine
  Meerenge. ⚑ Die Landfelder auf dem kürzesten Weg werden Wasser.
- ⚑ Nach Landengen und Meerengen gleicht die App die Zahl der Felder wie in Abschnitt 4 aus.
- **Küstenlinie:** Das Buch nennt das Zeichnen einen kreativen Vorgang zwischen Ästhetik und
  Plausibilität. Fjorde gehören zum Beispiel nicht an den Äquator, weil sie durch Vergletscherung
  entstehen. ⚑ Der Rauschwert macht Küsten nur in der Vergletscherungszone (Abschnitt 7) stark
  zerfranst, sonst glatter.

## 6. Temperatur je Feld

Das Buch nimmt die Temperatur je Hexreihe aus einem Arbeitsblatt, das aus Stern, Umlaufbahn,
Albedo, Treibhauseffekt, Achsneigung und Rotation rechnet.

⚑ **Uns fehlen Stern und Umlaufbahn.** Hausregel (keine Würfe, nichts gespeichert, die Karte rechnet
es aus):

> **Temperatur eines Feldes = Grundtemperatur der Stufe + Breitengrad-Zuschlag**

**Grundtemperatur:** die Mitte der Stufe aus der Weltenerschaffung:

| Stufe | Grundtemperatur |
|---|---|
| Gefroren | −60 °C |
| Kalt | −25 °C |
| Gemäßigt | 15 °C |
| Heiß | 55 °C |
| Kochend | 100 °C |

**Breitengrad-Zuschlag** (Buch S. 66) je Hexreihe und Größe:

| Reihe | Größe 1 | Größe 2, 3 | Größe 4, 5 | Größe 6, 7 | Größe 8, 9 | Größe A |
|---|---|---|---|---|---|---|
| 1 (Äquator) | +9 | +12 | +15 | +18 | +21 | +24 |
| 2 | +6 | +8 | +10 | +12 | +14 | +16 |
| 3 | +3 | +4 | +5 | +6 | +7 | +8 |
| 4 | 0 | 0 | 0 | 0 | 0 | 0 |
| 5 | −3 | −4 | −5 | −6 | −7 | −8 |
| 6 | −6 | −8 | −10 | −12 | −14 | −16 |
| 7 | −9 | −12 | −15 | −18 | −21 | −24 |
| 8 | −12 | −16 | −20 | −24 | −28 | −32 |
| 9 | −15 | −20 | −25 | −30 | −35 | −40 |
| 10 | −18 | −24 | −30 | −36 | −42 | −48 |
| 11 (Pol) | −21 | −28 | −35 | −42 | −49 | −56 |

Die Tabelle folgt der Formel **Zuschlag = Schritt × (4 − Reihe)** mit Schritt 3, 4, 5, 6, 7, 8 je
Spalte. ⚑ Wir setzen die Reihe als Kommazahl aus dem Breitengrad ein (Abschnitt 1) und bekommen so
für jedes Feld einen glatten Wert.

Beispiel: Gemäßigte Welt der Größe 8: am Äquator 15 + 21 = +36 °C (Reihe 0,5, begrenzt auf 1), bei
45° Breite (Reihe 6) 15 − 14 = +1 °C, am Pol 15 − 49 = −34 °C.

⚑ **Jahreszeiten:** Achsneigung und Exzentrizität lassen wir weg. Es gibt nur einen Wert je Feld,
und er gilt auch als „kälteste Jahreszeit“.

⚑ **Gezeitengebundene Welten** brauchen im Buch eine eigene Projektion (Tagseite oben, Nachtseite
unten, das Zwielichtband am Äquator). Ob eine Welt gezeitengebunden ist, hängt an der Rotation, und
die haben wir nicht. Vorerst entfällt das.

## 7. Oberflächenformen (S. 88–89)

Das Buch teilt das Gelände in drei Arten: durch Oberflächenformen (dieser Abschnitt), durch Leben
(Abschnitt 8) und durch Zivilisation (Abschnitt 10). Oberflächenformen sind **Gebirge**,
**zerklüftet** (*rugged*) und **offen**. Tundra ist jedes offene Landfeld direkt an der Frostlinie.

### Frostlinie, Eis und Tundra

- Die **Frostlinie** liegt auf jeder Halbkugel dort, wo die Temperatur das ganze Jahr unter 0 °C
  bleibt. ⚑ Wir haben nur ein Jahresmittel je Feld, keine Jahreszeiten. Bleibt es auch im Sommer
  unter 0 °C, liegt das Jahresmittel etwa unter −10 °C (Grönland, Antarktis; Tundra mit Dauerfrost
  liegt bei −5 bis −10 °C). Deshalb gilt bei uns: **Frostlinie bei −10 °C Jahresmittel.** Mit 0 °C
  läge auf einer gemäßigten erdgroßen Welt schon ab 46° Breite Eis.
- **Eis:** Jedes Feld (Land und Wasser) mit einem Jahresmittel unter −10 °C wird Eis. Wasser bleibt
  darunter Wasser (für die Zählung des Wasseranteils), wird aber als Eis gezeichnet.
- **Tundra:** Jedes offene Landfeld, das an ein Eisfeld grenzt und selbst kein Eis ist.
- Ist die ganze Welt unter −10 °C (z. B. *Gefroren*), ist alles Eis, ohne Tundra.

### Vergletscherung

- Hat sich das Klima stark verändert, hat Vergletscherung Gebirge geformt. **1W6 − 1** Reihen (je
  8,2° Breite) von der Frostlinie Richtung Äquator reichten die Polkappen früher. Das ist die
  **Vergletscherungszone**, auf beiden Halbkugeln gleich breit.
- Land in dieser Zone hat eher Gebirge (siehe unten).
- Ist keine Frostlinie auf der Welt (überall über −10 °C), gibt es keine Vergletscherung.

### Gebirge

- **Menge:** (2W6 − 2) × 1W6 Prozent der Landfelder sind Gebirge oder zerklüftet.
- ⚑ Davon ist die Hälfte (aufgerundet) Gebirge, der Rest zerklüftet.
- **Lage:** Gebirge liegen grob entlang der Plattengrenzen.
  ⚑ Verfahren:
  1. Kandidaten sind Landfelder höchstens l Schritte von einer Plattengrenze entfernt.
     Konvergente Grenzen zählen dreifach, seitliche doppelt, divergente einfach (Gewicht beim
     Ziehen). Felder auf Überlappungen (Abschnitt 5) zählen zusätzlich doppelt.
  2. Man zieht Startfelder nach Gewicht und lässt von dort Gebirgsketten wachsen, bevorzugt
     entlang der Grenze (Nachbarfelder näher an der Grenze bekommen mehr Gewicht).
  3. Zerklüftete Felder legen sich um die Gebirgsketten, bevorzugt direkt daneben.
  4. Reichen die Kandidaten nicht, kommen die übrigen Gebirge auf zufällige Landfelder.
- **Zusätzlich in der Vergletscherungszone:** Jedes Kartendreieck darf zwischen der
  Vergletscherungsgrenze und dem Pol **1W6 × f** weitere zerklüftete Felder und ebenso viele
  Gebirgsfelder haben, solange es dort offene Landfelder gibt. ⚑ Wir würfeln das für jedes
  Kartendreieck, das Land in der Zone hat. ⚑ Zusammen höchstens die Hälfte der offenen Landfelder
  der Zone in diesem Dreieck (je ein Viertel zerklüftet und Gebirge); sonst wird bei breiter Zone
  fast alles Land dort Gebirge.

### Vulkane

Das Buch nimmt die Zahl der großen Vulkane vom *World Detail Sheet*. Sie hängt dort am Seismik-Wert,
der Monde und Stern braucht.

⚑ **Hausregel für die Zahl:**
> **Große Vulkane = 1W6 − 1 + Zahl der konvergenten Plattengrenzen**, höchstens 12.

**Platzierung** der großen Vulkane (Buch):
- Stark bevorzugt an konvergenten oder seitlichen Plattengrenzen (höchstens l Schritte entfernt).
- Erste Wahl: zerklüftetes Gelände, Inseln oder Archipele.
- Zweite Wahl: ein Feld neben einem Gebirge.
- Sind diese Plätze verbraucht, liegen weitere Vulkane frei auf Land.
- ⚑ Zwei große Vulkane liegen mindestens 2 × l Schritte auseinander.

**Vulkanfelder** (Buch: wahlweise, wir nehmen sie): **1W6 − 1** Felder irgendwo auf der Welt, ohne
Rücksicht auf Plattengrenzen, aber sonst mit derselben Wahl wie oben. Ein Vulkanfeld enthält viele
kleine Vulkane.

Ein Vulkan ändert das Gelände seines Feldes nicht, er liegt als Markierung darauf (siehe *Was
gespeichert wird*).

## 8. Gelände durch Leben (S. 89)

**Ohne einheimisches Leben** (`Surface.life` ist falsch) ist jedes Landfeld, das nicht Eis, Tundra,
Gebirge oder zerklüftet ist, **Wüste**. Weiter mit Abschnitt 9.

**Mit Leben** gelten die folgenden Regeln, in dieser Reihenfolge. H ist die Hydrographie-Ziffer des
UWP.

### Wüsten

- **Kontinentale Wüste:** Auf jedem Kontinent, der 10 × f oder mehr *zusammenhängende* offene
  Landfelder hat (nicht Tundra, nicht zerklüftet, nicht Gebirge), würfelt man 2W6. Bei **2W6 ≥ H**
  gibt es eine Wüste aus **(2W6 − 1) × f** Feldern.
  - Wenn möglich nicht an der Küste.
  - Gibt es nur einen Kontinent, prüft man stattdessen einmal je Kartendreieck mit 10 × f
    zusammenhängenden offenen Feldern.
  - ⚑ Die Wüste wächst zusammenhängend (*Wachstum*), bevorzugt fern vom Wasser.
- **Regenschattenwüste:** Gebirge halten feuchte Luft ab. Es gibt **(H − 1W6) × f** Felder
  (bei 0 oder weniger keine).
  - Jedes liegt direkt neben zerklüftetem Gelände oder einem Gebirge, aber nie direkt am Wasser.
  - Sonst keine Bedingungen; die Felder dürfen verteilt sein.
- **Küstenwüste:** Es gibt **(H − 2W6) × f** Felder (bei 0 oder weniger keine).
  - Jedes liegt an der Küste und höchstens 4 Reihen (33° Breite) von der Polkappe entfernt.
  - ⚑ Ohne Polkappe (keine Frostlinie) gibt es keine Küstenwüste.

### Dschungel und Regenwald

- Nur auf Feldern mit **20 bis 40 °C**.
- Gibt es dort eine Gruppe von 10 × f zusammenhängenden Feldern, die weder Wüste noch zerklüftet
  sind (auf einem Kontinent oder, bei nur einem Kontinent, in einem Kartendreieck), entsteht
  Dschungel bei **2W6 ≤ H**.
  - Inseln und Archipele in der Nähe zählen zu den zusammenhängenden Feldern.
- Dann gibt es **(2W6 − 1) × f** Dschungelfelder.
  - Jedes liegt höchstens 3 × l Schritte von einem Ozean oder Meer entfernt.
  - Keines liegt direkt neben einer Wüste.
  - Alle im Temperaturbereich von 20 bis 40 °C.
- ⚑ Der Dschungel wächst zusammenhängend von einem Feld der Gruppe aus.

### Sumpf

⚑ Nur bei „nur Seen“ (Abschnitt 4): Landfelder neben einem See werden mit 50 % Sumpf, wenn sie
offen sind und über 0 °C liegen. Das Buch erwähnt Sümpfe nur dort.

### Offen/Wald

Alles übrige Land ist **offen/Wald**. Ohne Zivilisation ist es dicht bewaldet, manchmal fast wie
Dschungel.

## 9. Flüsse (S. 89)

Flüsse sind im Buch Beiwerk; wir zeichnen sie trotzdem.

- **Zahl:** Je Kontinent **1W6 − 1** große Flüsse. Gibt es nur einen Kontinent, gilt das je
  Kartendreieck mit mindestens 10 × f Landfeldern.
- **Länge:** Jeder Fluss ist **1W6 × l** Felder lang.
- **Quelle:** in Gebirge, zerklüftetem Land, einem See oder einem kleinen Meer.
- **Lauf:** zu größerem Wasser hin (Ozean, Meer, großer See).
- **Dschungel:** Hat ein Kontinent Dschungel, fließt mindestens ein Fluss hindurch.
- Flüsse dürfen in den Feldern oder entlang der Feldkanten gezeichnet werden. ⚑ Wir zeichnen sie
  von Feldmitte zu Feldmitte.

⚑ **Verfahren:**
1. Für jeden Fluss sucht man ein Mündungsfeld: ein Landfeld an der Küste des Kontinents. Das erste
   Mündungsfeld eines Kontinents mit Dschungel liegt so, dass der Weg durch den Dschungel führen
   kann.
2. Vom Mündungsfeld läuft man rückwärts landeinwärts: jeder Schritt zu einem Nachbarn, der weiter
   von der Küste entfernt ist (bei mehreren zufällig, gewichtet mit dem Rauschwert), bis die Länge
   erreicht ist oder ein Gebirge, zerklüftetes Feld oder Binnengewässer kommt. Dort ist die
   Quelle.
3. Ist der Fluss kürzer als gewürfelt, ist das in Ordnung (der Kontinent ist zu klein).
4. Flüsse kreuzen sich nicht. Trifft ein Fluss auf einen anderen, mündet er dort.
5. Flüsse laufen nicht durch Eis.

## 10. Gelände durch Zivilisation (S. 89–90)

Nur mit Bevölkerung (Bevölkerungsziffer ab 1).

### 10a. Zahl und Größe der Städte (S. 72–73)

Die Städte kommen aus den *Population Related Details*. Sie brauchen den
**Bevölkerungsmultiplikator**, den die App noch nicht hat.

⚑ **Bevölkerungsmultiplikator M** (Buch: Teil des erweiterten UWP, 1 bis 9): Bei der Erzeugung der
Karte gewürfelt, wenn die Welt noch keinen hat, und an der Welt gespeichert. Gewürfelt mit dem
Verfahren des Buchs für Zahlen von 0 bis 9 (S. 1), eine 0 wird neu gewürfelt:
> 1W6: Bei gerader Zahl gilt 1W6 − 1 (eine 6 wird neu gewürfelt), also 0–4. Bei ungerader Zahl
> gilt 1W6 + 4 (eine 6 wird neu gewürfelt), also 5–9.

Damit ist jede Ziffer 1 bis 9 gleich wahrscheinlich. **P** ist die Bevölkerungsziffer des UWP.

**Gesamtbevölkerung** T = M × 10^P.

Eine Stadt mit **Bevölkerungsziffer d** und **Multiplikator m** hat m × 10^d Einwohner.

**Schritt 2: Kleine Bevölkerung (P bis 5, also unter 1 000 000 Einwohner):**
1W6 würfeln.
- Ist das Ergebnis **größer als P**, leben alle Einwohner in einem einzigen Ort. Die Welt hat
  genau eine Stadt (die Hauptstadt) mit allen T Einwohnern, keine weiteren. Fertig.
- Sonst, bei **P bis 3**: Es gibt **gar keine Städte**. Fertig. ⚑ Auf der Karte gibt es dann nur den
  Raumhafen, falls vorhanden.
- Sonst (P 4 oder 5): weiter mit Schritt 3.

**Schritt 3: Städte.** A ist die noch nicht verteilte Bevölkerung, am Anfang A = T.

| Schritt | Größe | Bedingung | Wie viele |
|---|---|---|---|
| 3a | sehr große Städte, Ziffer P | **3W6 < P** | Für jede Stadt einen Multiplikator 1–9 würfeln (Verfahren oben). Die Summe aller Multiplikatoren darf M − 1 nicht übersteigen: Ist ein Wurf zu hoch, gilt der verbleibende Rest. So lange, bis die Summe M − 1 erreicht. Bei M = 1 keine. |
| 3b | – | – | A = T − Einwohner aller sehr großen Städte |
| 3c | große Städte, Ziffer P − 1 | **2W6 < P** | Multiplikatoren würfeln, bis die Städte zusammen mindestens die Hälfte von A haben. |
| 3d | – | – | A = A − Einwohner aller großen Städte |
| 3e | mittelgroße Städte, Ziffer P − 2 | **1W6 < P** | **N = A ÷ 10^P × (1W6 + 9)**, gerundet. Jede hat im Schnitt Multiplikator 5. |
| 3f | – | – | A = A − N × 5 × 10^(P−2) |
| 3g | mittlere Städte, Ziffer P − 3 | immer | **N = A ÷ 10^P × (1W6 + 9) × 10**, gerundet, je 5 × 10^(P−3) Einwohner |
| 3h | – | – | A = A − N × 5 × 10^(P−3) |
| 3i | kleine Städte, Ziffer P − 4 | immer | **N = A ÷ 10^P × (1W6 + 9) × 100**, gerundet, je 5 × 10^(P−4) Einwohner |
| 3j | – | – | A = A − N × 5 × 10^(P−4) |
| 3k | sehr kleine Städte, Ziffer P − 5 | immer | **N = A ÷ 10^P × (1W6 + 9) × 1000**, gerundet, je 5 × 10^(P−5) Einwohner |

- Der Rest A lebt auf dem Land, nicht in Städten.
- Bei 3e, 3g, 3i und 3k: Sind es **mehr als 20 Städte**, haben (3W6 − 3) % davon den Multiplikator
  9 statt 5. Bei 100 Städten sind das 0 bis 15 Städte.
- ⚑ Schritte, deren Ziffer unter 1 läge, entfallen (z. B. bei P = 4 entfällt 3k).
- ⚑ Kommt A unter 0 (durch Rundung), setzt man A = 0, die folgenden Schritte ergeben dann keine
  Städte.

Beispiel des Buchs (P = A, M = 8, also 80 Milliarden): 3a: 3W6 = 9 < 10, Multiplikatoren 2 und dann
5 (gewürfelt 9, gekappt auf den Rest), also eine Stadt mit 20 und eine mit 50 Milliarden.

### 10b. Rang der Städte (S. 74)

- **Hauptstädte** (*primary*): die Städte mit der höchsten Bevölkerungsziffer. Man darf mehrere
  der höchsten Ziffern zusammennehmen, solange es höchstens 10 Hauptstädte sind.
  ⚑ Wir nehmen von oben so viele Ziffern dazu, wie es geht, ohne 10 zu überschreiten (mindestens
  die höchste Ziffer, auch wenn das mehr als 10 sind).
- **Nebenstädte** (*secondary*): die Städte mit der Ziffer eins unter der niedrigsten Hauptstadt.
- **Kleinstädte** (*tertiary*): alle übrigen.

### 10c. Raumhäfen der Städte (S. 74)

- Eine Hauptstadt bekommt den **Raumhafen des UWP**.
- Für **jede weitere Hauptstadt**: Bei **2W6 ≤ ihrer Bevölkerungsziffer** bekommt sie einen weiteren
  Hafen derselben Klasse wie der Raumhafen des UWP. Sonst würfelt man 1W6 auf die Tabelle, in der
  Spalte des Raumhafens des UWP. DMs: Bevölkerungsziffer der Stadt 6+: +1, 8+: +2 (höchstens 8).

| 1W6 | A | B | C | D | E | X |
|---|---|---|---|---|---|---|
| 1 | D | F | H | H | Y | Y |
| 2 | C | D | G | H | Y | Y |
| 3 | C | D | F | G | H | Y |
| 4 | B | C | F | G | H | H |
| 5 | B | C | E | G | H | H |
| 6 | B | B | D | E | H | H |
| 7 | B | B | C | E | E | H |
| 8 | A | B | C | D | E | H |

  A–E und X sind Raumhäfen (*starports*), F, G, H und Y Landeplätze (*spaceports*): F gut, G
  einfach, H nur eine Landefläche, Y keiner. ⚑ Das Buch hat auch Spalten für Welten mit einem
  Landeplatz F, G, H oder Y als Haupthafen. Classic Traveller kennt nur A–E und X als Raumhafen
  des UWP, deshalb fehlen sie hier.
- Ab **TL 5** hat jede Stadt (Haupt-, Neben- und Kleinstadt) mindestens einen Landeplatz H.
- Ab **TL 10** hat jede Nebenstadt mindestens einen Landeplatz F.

### 10d. Orbitalstädte (S. 74)

- Hat die Welt **Atmosphäre A, B oder C, kein einheimisches Leben und TL 9+**: Bei **3W6 − 3 ≤ P**
  lebt ein Teil der Bevölkerung dauerhaft im Orbit. ⚑ Das Buch sagt „tech level − 6 of the
  population“. Wir lesen das als (TL − 6) × 10 % der Bevölkerung, höchstens 100 %.
- Sonst:
  - Je Raumhafen A auf dem Boden gibt es mindestens eine Orbitalstadt (mindestens so groß wie
    eine Nebenstadt). Der Raumhafen A kann auch ganz im Orbit liegen.
  - Bei Raumhafen B gibt es mindestens eine Orbitalstadt (mindestens so groß wie eine
    Kleinstadt), egal wie viele Häfen B es am Boden gibt.
  - Bei Raumhafen C und Landeplatz F gibt es eine Orbitalstadt bei **2W6 < TL und < P**. Sie ist
    höchstens so groß wie eine Nebenstadt.
- In jedem Fall leben höchstens 10^(TL − 6) Menschen im Orbit.
- Welten mit Regierung C oder höher haben eher weniger Menschen im Orbit. ⚑ Ohne eigene Regel.
- ⚑ Orbitalstädte liegen nicht auf der Oberfläche. Der Globus zeigt sie als Lichter auf einer
  Umlaufbahn und in der Liste neben dem Globus. Ihre Einwohner kommen aus den Städten
  der Schritte 3a bis 3e: ⚑ Wir verlegen dafür die passende Zahl Nebenstädte (bzw. bei
  Raumhafen B Kleinstädte) in den Orbit, bis die Bedingungen erfüllt sind.

### 10e. Städte platzieren (S. 89)

Die Lage ist im Buch frei, mit Leitlinien nach TL. Wo eine Stadt liegen darf:

| TL | Städte mit Bevölkerungsziffer 5+ erlaubt auf |
|---|---|
| 0–3 | nur offenem Land (nicht Dschungel, Wüste, Ozean, Eis, zerklüftet usw.) |
| 4–6 | zusätzlich zerklüftetem Land und Wüste |
| 7–9 | zusätzlich Dschungel |
| 10+ | zusätzlich Ozean und Eis; ab TL 10 darf ein Feld mehrere Städte haben, so viele wie der TL |

- Städte mit Ziffer unter 5 dürfen überall auf Land liegen, das nicht Eis ist.
- **Sonderfall:** Geht eine Stadt technisch nicht (kein erlaubtes Feld frei), setzt man sie
  trotzdem und erklärt es, z. B. eine Unterwasserstadt einer zurückgefallenen Kultur.

⚑ **Was als einzelne Stadt auf der Karte steht:** Haupt- und Nebenstädte sind einzelne Städte mit
Feld, Ziffer, Multiplikator und Hafen. Kleinstädte gibt es zu Hunderten; sie stehen als **Zahl je
Feld** auf der Karte (auf dem Globus als Lichter). ⚑ Einzeln stehen höchstens **10 Hauptstädte
und 20 Nebenstädte** auf der Karte (die größten); weitere zählen als Kleinstädte. Bei kleiner Bevölkerung ergeben die
Formeln sonst Hunderte von Nebenstädten mit wenigen hundert Einwohnern.

⚑ **Verfahren:**
1. Jedes erlaubte Feld bekommt eine Wertung: +3 an der Küste, +2 an einem Fluss, +2 bei 0 bis
   30 °C, +1 offenes Land, −2 je Hauptstadt im Umkreis von 4 × l Schritten.
2. Die Städte kommen der Größe nach auf das Feld mit der besten Wertung (bei Gleichstand
   zufällig). Unter TL 10 hat jedes Feld höchstens eine Haupt- oder Nebenstadt, ab TL 10 höchstens
   so viele wie der TL.
3. Die erste Hauptstadt ist die Stadt des Raumhafens des UWP.
4. Kleinstädte verteilen sich zufällig auf erlaubte Felder, gewichtet mit der Wertung plus 2 je
   Haupt- oder Nebenstadt im Umkreis von 2 × l Schritten. Die Zahl je Feld wird gespeichert.

### 10f. Raumhäfen platzieren

- Raumhäfen (A–E) liegen in oder neben dem Feld ihrer Stadt.
- Landeplätze (F–H) liegen immer im Feld ihrer Stadt.
- ⚑ Ein Raumhafen kommt in das Feld der Stadt, außer es ist Wasser oder Eis und die Stadt hat
  Land daneben; dann auf das Landfeld daneben.

### 10g. Straßen

- Wichtige Straßen gibt es bei **TL 5 bis 10**. Ab TL 10 machen Gravfahrzeuge sie überflüssig.
- ⚑ Verfahren: Auf jedem Kontinent verbindet die App jede Haupt- und Nebenstadt mit der nächsten
  größeren Stadt desselben Kontinents über den kürzesten Weg auf Land. Gebirge zählen dreifach,
  zerklüftet, Dschungel und Sumpf doppelt, Eis vierfach. Kein Weg über Wasser.

### 10h. Besiedelt

- **Besiedelt** sind offene Felder neben Städten. ⚑ Bei uns: offene Landfelder höchstens l Schritte
  von einer Haupt- oder Nebenstadt.
- Ab **TL 11** ist jedes Feld in diesem Umkreis besiedelt, auch auf dem Ozean.
- Bei **Atmosphäre außerhalb von 4–9** gibt es keine besiedelten Felder.
- Besiedeltes Land ist dünn bewohnt, Ackerland oder Dörfer.

### Terraforming

Das Buch würfelt Terraforming über die Tabelle *Wide Scale Terraforming* (S. 68–69) und verwandelt
damit Gelände stufenweise. ⚑ Gehört nicht zur ersten Fassung.

## 11. Fremdartige Welten (S. 90)

Das Buch geht von erdähnlichen Bedingungen aus und ermuntert dazu, die Regeln für fremde Welten
anzupassen. Beispiele: Dschungel in anderen Temperaturbereichen oder eine „radioaktive“ Wüste nach
einem Atomkrieg. Für die erste Fassung heißt das nichts. Später ließen sich die Grenzwerte als Daten
pflegen.

## Reihenfolge beim Erzeugen

1. Raster aus der Größe (Abschnitt 1); bei Größe 0 keine Karte.
2. Mengen umrechnen (Abschnitt 2).
3. Platten und Grenzen, Bewegung je Grenze (Abschnitt 3).
4. Wasser und Land (Abschnitt 4), Kontinente, Landengen, Meerengen (Abschnitt 5).
5. Temperatur je Feld (Abschnitt 6).
6. Eis, Tundra, Vergletscherung, Gebirge, Vulkane (Abschnitt 7).
7. Wüsten, Dschungel, Sumpf, offen/Wald (Abschnitt 8).
8. Flüsse (Abschnitt 9). Sie kommen nach dem Dschungel, weil ein Fluss hindurch muss.
9. Städte: Zahl, Rang, Häfen, Orbit, Lage, Straßen, besiedelt (Abschnitt 10).

## Was gespeichert wird

So steht es im Domänenmodell (Änderung 2026-11-14i, siehe dort *Oberflächenkarte*):

| Wert | Inhalt |
|---|---|
| Bevölkerungsmultiplikator | 1–9, an der Welt (`Hex.populationMultiplier`) |
| Oberflächenfelder (`SurfaceCell`) | je Feld die Geländeart (Wasser, Eis auf Wasser, Eis auf Land, Tundra, Gebirge, zerklüftet, Wüste, Dschungel, Sumpf, offen/Wald, besiedelt), die Zahl der Kleinstädte und ob ein großer Vulkan oder ein Vulkanfeld darauf liegt |
| Flüsse (`River`) | die Felder von der Quelle zur Mündung |
| Straßen (`Road`) | die Felder der Straße |
| Städte (`City`) | je Haupt- und Nebenstadt: Feld (keins heißt Orbit), Bevölkerungsziffer, Multiplikator, Rang, Hafen; später ein Name |

- **Gepackt:** Im Spielstand steht die Geländeart als Text mit einem Zeichen je Feld in der
  Reihenfolge des Rasters; Kleinstädte und Vulkane nur für Felder, die welche haben; Flüsse,
  Straßen und Städte mit Feldnummern. Objekte je Feld gibt es nur in der Anzeige.
- Die Zahl der Felder folgt aus der Größe und wird nicht gespeichert.
- Platten, Grenzen, Rauschwert und der Startwert des Zufalls werden nicht gespeichert. Sie dienen
  nur dem Erzeugen. Ein gespeicherter Startwert statt der Werte wäre kleiner, aber dann hinge jede
  Karte am Programm: Jede Änderung am Erzeugen, auch eine Fehlerkorrektur, würde bestehende Karten
  verschieben, und Rechenunterschiede zwischen Browsern könnten auf zwei Geräten verschiedene Karten
  ergeben.
- Größe: Bei Terra sind es 10 242 Felder, also etwa 10 KB je Welt. Karten entstehen nur für Welten,
  deren Globus man öffnet.

## Ansichten

Alle Ansichten sind reine Darstellung aus den gespeicherten Werten. Abgestimmt (14. November 2026):
**Es gibt nur den Globus**, keine flache Karte. Nah herangezoomt wirkt er ohnehin wie eine flache
Karte.

### Globus

Wie eine Karten-App (Owner, 14. November 2026):
- **Die Karte füllt den ganzen Bildschirm.** Drehen mit dem Finger. Zoomen wie in einer Karten-App:
  zwei Finger, **Doppeltippen** (eine Stufe hinein, auf die Stelle zu) oder **Doppeltippen und
  Ziehen** (einhändig: nach unten hinein, nach oben heraus). Ein einfaches Tippen wählt das Feld
  erst nach einer kurzen Pause (etwa eine Viertelsekunde), damit es sich nicht mit dem Doppeltippen
  beißt. Mit Maus oder Touchpad zusätzlich Mausrad und die Knöpfe + und − rechts unten; auf
  Touch-Geräten gibt es die Knöpfe nicht. Ganz herausgezoomt sieht man die ganze Halbkugel,
  ganz hineingezoomt etwa 10 Felder über die kürzere Seite.
- **Oben eine Leiste:** Zurück zur Weltkarte, der Name der Welt und zwei aufklappbare Listen:
  - **Orte:** die Gruppe, NSC mit Feld, Städte (mit Einwohnern und Hafen), Orbitalstädte, Vulkane.
    Darunter Hexgitter ein/aus, der Maßstab und „Karte neu würfeln“ (oder warum es nicht geht).
  - **Einträge:** alle Felder mit Logeinträgen, das jüngste zuerst, mit Zahl und Tag des neuesten.
  - Ein Tippen auf eine Zeile dreht die Karte dorthin, zoomt hinein und wählt das Feld.
- **Unten fährt ein Feld herein**, sobald ein Feld angetippt ist: Gelände, Lage, Temperatur, Städte,
  Kleinstädte, Vulkan, Fluss, Straße, Gruppe und NSC dort, die Knöpfe „Gruppe hierher“ und „NSC
  hierher“ und „Was hier geschah“. Schließen mit dem X oder erneutem Antippen des Feldes.
- Gerechnet wie das Weltsymbol (`src/view/sector/world-icon.ts`) Pixel für Pixel aus einer Textur
  nach Breiten- und Längengrad; Feldgrenzen weich, Küsten ausgefranst, Flüsse und Straßen als
  Linien. Zeichen: Städte als Punkte, Vulkane als Dreiecke, Einträge orange mit Zahl, NSC violett,
  die Gruppe blau.
- ⚑ Läuft das auf dem Handy nicht flüssig, wird es mit WebGL gerechnet, ohne zusätzliche
  Bibliothek.

### Weltsymbol

Hat eine Welt eine Oberflächenkarte, zeichnet das Weltsymbol (Sektorkarte, Kopfzeile, Weltkarte)
die echten Felder statt Zufallsrauschen. So sieht das Symbol aus wie die Welt.

### Wo der Globus erscheint

Als eigener Bildschirm über der Weltkarte:
- Das Symbol des Aufenthaltsorts in der Kopfzeile öffnet den Globus direkt.
- Auf der **Weltkarte** einer fertigen Welt lässt sich das große Weltsymbol oben rechts antippen.
- Im Abschnitt **Oberfläche** der Weltkarte steht ein Knopf „Globus“.
- Hat die Welt noch keine Oberflächenkarte, entsteht sie beim ersten Öffnen.
- Ein Knopf „Neu würfeln“ ersetzt die ganze Karte (nach Rückfrage).
- Bei Größe 0 gibt es weder Knopf noch antippbares Symbol.

## Was wir bewusst weglassen

| Was | Warum | Wann vielleicht |
|---|---|---|
| Rand der habitablen Zone (±4 auf die Temperatur) | kein Sternsystem | mit Book 6 *Scouts* |
| Kerntyp (Dichte) | vereinfacht: nur Größe 0 ohne Platten | wenn Dichte, Masse und Schwerkraft dazukommen |
| Seismik-Wert | braucht Monde und Stern; ersetzt durch die Vulkan-Hausregel | mit dem Sternsystem |
| Achsneigung, Exzentrizität, Jahreszeiten | für die Karte nicht nötig | später, 2W6-Tabellen ohne Stern gibt es im Buch (S. 63) |
| Gezeitengebundene Welten | braucht die Rotation | mit Rotation und Stern |
| Terraforming | Beiwerk | später |
| Gesellschaft, Bräuche, Ressourcen (*Population Related Details* ab Schritt 7, *Natural Resources*) | gehört nicht zur Karte | eigenes Thema |
| Von Hand nachbessern | erste Fassung nur „Neu würfeln“ | später |
| Flache Karte (20 Kartendreiecke wie IS Form 21) | auf dem Handy schwer lesbar, der Globus reicht | später als Export zum Ausdrucken, aus denselben Daten |

## Offene Punkte

1. **Geschwindigkeiten der Fahrzeuge** für den Maßstab „ein Feld ist eine Tagesreise“ aus den
   Regeln prüfen.
2. **Namen der Städte:** Die Hauptstadt könnte den Namen der Welt tragen, die übrigen später aus
   den Namenstabellen.
3. **Alle Hausregeln (⚑)** prüft der Owner bei der Freigabe im Domänenmodell.
