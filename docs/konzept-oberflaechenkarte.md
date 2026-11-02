# Konzept: Oberflächenkarte

> **Stand: Konzept, nicht abgestimmt** (2. November 2026). Noch nichts davon steht im
> [Domänenmodell](domain-model.md) oder im Code. Bevor etwas gebaut wird, kommt es nach den Regeln
> in `CLAUDE.md` erst ins Modell und wird freigegeben.

Die **Oberflächenkarte** zeigt die Oberfläche einer Welt: Wasser, Land, Gebirge, Wüsten, Wälder,
Eis und Städte auf einem Hexraster. Sie ist nicht die *Weltkarte*, also die Karte der App mit dem
UWP im Klartext (siehe Begriffe im Domänenmodell).

Dieses Konzept schreibt die Regeln für die Kartenerstellung ab und markiert jede Stelle, an der wir
eingreifen müssen. Solche Stellen tragen das Zeichen **⚑**.

## Quellen

| Quelle | Was daraus kommt |
|---|---|
| *World Builder's Handbook* (Digest Group Publications, 1989, für MegaTraveller), Kapitel *Mapping a World*, S. 87–90 | Raster, Platten, Kontinente und Ozeane platzieren, Gelände, Städte |
| dasselbe Buch, *Hydrosphere Related Details*, S. 69–70, und *Native Life*, S. 68 | Wasseranteil, Platten, Land- und Wassermassen, Leben (in der App schon umgesetzt, siehe `Surface`) |
| dasselbe Buch, *Atmosphere Related Details*, S. 64–68 | Temperatur je Hexreihe (Temperatur-Arbeitsblatt, Breitengrad-Zuschläge S. 66) |
| *Mongoose Traveller 2e*, Core Rulebook S. 251–252 | Temperatur der Welt als Stufe, Wasser-Malus (in der App umgesetzt) |

Book 6 *Scouts* (Classic Traveller) hat keine Regeln für Oberflächenkarten, nur Werte für die ganze
Welt. Nach einer Recherche ist *Grand Survey* (DGP, 1986) die erste Quelle mit einem vollständigen
Verfahren vom UWP zur Hexkarte. Das *World Builder's Handbook* (1989) übernimmt es mit
Würfeltabellen.

**Rechte:** Die Rechte an den DGP-Büchern sind ungeklärt. Wir übernehmen nur die Mechanik (Würfe,
Tabellenwerte) mit eigenen deutschen Texten, keine Bilder (siehe README, *Rechtlicher Hinweis*).

## Grundsatz: Das Buch würfelt Mengen, die Platzierung ist Handarbeit

Das Buch würfelt, **wie viel** es von etwas gibt: Platten, Kontinente, Gebirgshexe, Flüsse, Wüsten.
**Wo** etwas liegt, entscheidet die Spielleitung von Hand. Wörtlich heißt es, die Platzierung
„cannot be regulated by rules or random tables“.

⚑ **Im Solo-Spiel gibt es keine Spielleitung, also muss die App platzieren.** Dafür brauchen wir
einen eigenen Algorithmus, z. B. Flutfüllung von zufälligen Startpunkten auf dem Hexraster. Er muss
die gewürfelten Mengen und die Leitlinien des Buchs einhalten. Das ist der aufwendigste Teil und
reiner Eigenbau.

## Was schon da ist

Diese Werte speichert die App heute schon an jeder neu erschaffenen Welt (siehe Domänenmodell,
*Weltenerschaffung* und *Oberfläche*):

| Wert | Woher | Angepasst |
|---|---|---|
| UWP: Größe, Atmosphäre, Hydrographie, Bevölkerung, TL | Classic Traveller | – |
| Temperatur: Gefroren, Kalt, Gemäßigt, Heiß, Kochend | Mongoose, 2W6 + DM der Atmosphäre | Rand der habitablen Zone (±4) weggelassen, kommt mit einem Sternsystem |
| Hydrographie mit Wasser-Malus | Classic Traveller, Malus nach Mongoose (−2 heiß, −6 kochend, nicht bei Atmosphäre D) | Die Ausnahme „panthalassische Atmosphäre F“ passt nicht zu Classic Traveller und entfällt |
| Wasseranteil in % | Buch S. 69 | – |
| Tektonische Platten | Buch S. 69 | Ohne Kerntyp: Größe 0 hat keine Platten, sonst Größe + Hydrographie − 2W6, mindestens 1 |
| Große und kleine Kontinente, große Inseln, Archipele bzw. große und kleine Ozeane, kleine Meere, verstreute Seen | Buch S. 70 (Kontinente- bzw. Ozeane-Tabelle) | Höchstens 6 große Kontinente, der Rest zählt zu den kleinen. „Nur Archipele“ bzw. „nur Seen“ als ganze Fläche in halben Hexen |
| Einheimisches Leben | Buch S. 68 | Die DMs nach Sterntyp entfallen. Temperatur-DM −1 für alles außer *Gemäßigt* |

Ältere Welten ohne Temperatur oder Oberfläche würfeln sie auf der Weltkarte nach.

## Die Regeln Schritt für Schritt

### 1. Raster

- Die Karte ist ein flach ausgelegter **Ikosaeder** aus 20 Dreiecken, den *Kartendreiecken*, mit je
  25 Hexen. Das sind **500 Hexe**.
- Der Äquator ist 35 Hexe lang und liegt in der Mitte; oben ist Norden. Zusätzlich gibt es Linien
  bei 30° Nord und 30° Süd.
- Ein Hex misst etwa 9° von Nord nach Süd. Seine Breite ist der Umfang geteilt durch 35, der Umfang
  ist der Durchmesser × π.

⚑ **Wie die 11 Hexreihen des Temperatur-Arbeitsblatts auf das Raster fallen, ist noch zu klären.**
Das Arbeitsblatt zählt je Halbkugel von Reihe 1 am Äquator bis Reihe 11 am Pol.

⚑ **Darstellung auf dem Handy:** 500 Hexe in 20 Dreiecken brauchen Zoom und Verschieben. Das gibt es
im Sektor-Screen schon und lässt sich wohl übernehmen.

### 2. Tektonische Platten

- **Anzahl:** schon gespeichert (`Surface.plates`).
- **Größe je Platte:** 1W6 auf die Tabelle:

  | 1W6 | Größe in Hexen |
  |---|---|
  | 1 | 2W6 × 5 |
  | 2 | 2W6 × 10 |
  | 3 | 2W6 × 15 |
  | 4 | 2W6 × 20 |
  | 5 | 2W6 × 25 |
  | 6 | 2W6 × 30 |

  Die letzte Platte bekommt immer alle übrigen Hexe.
- **Grenzen:** Im Buch zeichnet die Spielleitung sie von Hand, nach „Logik und Vorstellungskraft“.
  Auf der fertigen Karte sind sie nicht zu sehen, sie dienen nur als Vorlage für Kontinente,
  Erdbeben und Gebirge.
- **Bewegung je Grenze**, 2W6:
  - 2–5: *konvergent*, die Platten schieben sich zusammen: Erdbeben, Gebirgsbildung.
  - 6–8: *seitlich*, die Platten gleiten aneinander vorbei: Verwerfungen wie der San-Andreas-Graben.
  - 9–12: *divergent*, die Platten gehen auseinander: tiefe Gräben.

⚑ Die Grenzen zieht der Algorithmus (siehe Grundsatz).

⚑ Wie viele Grenzen es gibt, steht erst nach dem Zeichnen fest. Deshalb lässt sich die Bewegung
nicht im Voraus würfeln, sondern erst mit der Karte.

### 3. Wasser und Land

- **Zahl der Hexe:**
  - Wasserhexe = Wasseranteil × 5, z. B. 33 % → 165 Hexe.
  - Landhexe = 500 − Wasserhexe, z. B. 83 % → 85 Hexe.
- **Was platziert wird:**
  - Bei 1–49 % Wasser platziert man die Gewässer; das Land ergibt sich als Rest.
  - Bei 50–100 % Wasser platziert man die Landmassen; das Wasser ergibt sich als Rest.
  - Bei 0 % gibt es kein freies Wasser, es geht gleich zum Gelände.
  - Bei 100 % gibt es höchstens ein paar zufällige Inseln.
- **Gewässer**, in dieser Reihenfolge von der Wasserfläche abgezogen:
  - Verstreute Seen: je ½ Hex.
  - Kleine Meere: je 1 Hex.
  - Große Ozeane: jeder mindestens 15 % der Wasserfläche. Gibt es nur einen großen und keinen
    kleinen Ozean, liegt fast alles Wasser in einem Becken.
  - Kleine Ozeane: teilen sich den Rest, jeder unter 15 %, meist unter 10 %. Die genaue Größe
    legt man fest.
- **Landmassen**, in dieser Reihenfolge von der Landfläche abgezogen:
  - Archipele: je ½ Hex.
  - Große Inseln: je 1 Hex.
  - Große Kontinente: jeder mindestens 15 % der Landfläche (zum Vergleich auf Terra: Eurasien
    37 %, Afrika 20 %, Nordamerika 16 %).
  - Kleine Kontinente: teilen sich den Rest, jeder unter 15 %, meist unter 10 %. Die genaue Größe
    legt man fest.
- **Seen in Landmassen:** Jede Landmasse darf Binnenmeere (etwa 1 Hex) und verstreute Seen
  (½ Hex) haben.
- **Archipele und Seen ohne eigene Zeile:** Ist das Land nicht nur Archipel, gibt es trotzdem 2W6
  Hexe Archipele. Ist das Wasser nicht nur See, gibt es trotzdem 2W6 Hexe verstreute Seen. Diese
  Zahl ist in der App schon gewürfelt: Die Tabellen haben dafür eine eigene Spalte.
- **Nur Seen:** Besteht das ganze Wasser aus verstreuten Seen, gibt es kein Meer und keinen Ozean.
  Um die Seen herum liegen dann wahrscheinlich viele Sümpfe.

⚑ **Höchstens 6 große Kontinente** (Hausregel, schon umgesetzt). Die Tabelle würfelt bis 2W6 + 1,
obwohl jeder große Kontinent 15 % des Landes braucht. In einer Probe mit 20.000 Welten hatten
danach 25 % der Kontinent-Welten genau 6 große Kontinente. Das ist so gewollt.

⚑ Bei **„nur Archipele“ bzw. „nur Seen“** speichert die App die ganze Fläche in halben Hexen, z. B.
150 Archipele bei 85 % Wasser. Auf der Karte heißt das: Alles Land wird in Halbhex-Stücken
verteilt.

### 4. Kontinente und Ozeane platzieren

- **Verteilung:** möglichst gleichmäßig über die Platten, am besten ein Kontinent je Platte. Gibt es
  mehr Kontinente als Platten, teilen sich manche eine Platte. Gibt es weniger, bleiben manche
  Platten ohne Kontinent.
- **Überlappung**, 2W6 je Kontinent:
  - 2–7: mitten auf der Platte, ohne auf die Nachbarplatten zu reichen (außer er ist zu groß).
  - 8+: er ragt auf eine Nachbarplatte; wie weit, legt man fest. Eine Überlappung zeigt Erdbeben
    an und beeinflusst das Gelände, vor allem Gebirge.
- **Landenge:** Liegen zwei Kontinente nur ein Hex auseinander, verbindet sie bei 9+ auf 2W6 eine
  Landenge.
- **Meerenge:** Liegen zwei Ozeane nur ein Hex auseinander, verbindet sie bei 9+ eine Meerenge.
- **Küstenlinie:** Das Buch nennt das Zeichnen einen kreativen Vorgang zwischen Ästhetik und
  Plausibilität. Fjorde gehören zum Beispiel nicht an den Äquator, weil sie durch Vergletscherung
  entstehen.

⚑ Die genaue Lage ist im Buch „up to you“. Der Algorithmus muss diese Leitlinien als Regeln
umsetzen: Kontinente nicht über Plattengrenzen bei 2–7, Überlappung bei 8+, keine Fjorde in
warmen Reihen.

### 5. Temperatur je Hexreihe

Das Buch braucht für Eis, Tundra, Wüsten und Dschungel die Temperatur **je Hexreihe**. Es nimmt
sie aus dem Temperatur-Arbeitsblatt. Das rechnet aus Sternleuchtkraft, Umlaufbahn, Albedo,
Treibhauseffekt, Achsneigung, Rotation und Exzentrizität für jede Reihe die höchste und die
tiefste Temperatur aus.

⚑ **Uns fehlen dafür Stern und Umlaufbahn.** Wir haben nur die Stufe nach Mongoose. Vorschlag
(Hausregel):
- **Grundtemperatur:** die Mitte der Stufe, z. B.:

  | Stufe | Grundtemperatur |
  |---|---|
  | Gefroren | −60 °C |
  | Kalt | −25 °C |
  | Gemäßigt | 15 °C |
  | Heiß | 55 °C |
  | Kochend | 100 °C |

- **Dazu die Breitengrad-Zuschläge des Buchs** (S. 66) je Reihe und Größe. Reihe 1 liegt am
  Äquator, Reihe 4 hat ±0, Reihe 11 liegt am Pol. Der Schritt je Reihe ist 3 °C bei Größe 1, 4 bei
  Größe 2–3, 5 bei Größe 4–5, 6 bei Größe 6–7, 7 bei Größe 8–9 und 8 bei Größe A. Bei Größe 8
  sind das +21 °C am Äquator und −49 °C am Pol.
- Das braucht keinen Wurf und wird nicht gespeichert. Die Karte rechnet es aus der gespeicherten
  Stufe aus.

⚑ **Jahreszeiten:** Achsneigung und Exzentrizität lassen wir vorerst weg. Das Buch nimmt für die
Vergletscherung die Frostlinie „zur kältesten Jahreszeit“. Ohne Achsneigung gibt es nur einen
Wert.

⚑ **Gezeitengebundene Welten** brauchen im Buch eine eigene Projektion: Tagseite oben, Nachtseite
unten, das Zwielichtband am Äquator. Ob eine Welt gezeitengebunden ist, hängt an der Rotation, und
die haben wir nicht. Vorerst entfällt das.

### 6. Gelände

Das Buch teilt das Gelände in drei Arten ein: durch Oberflächenformen (Gebirge, Flüsse), durch
Leben (Dschungel, Steppe) und durch Zivilisation (Städte, Straßen).

**Oberflächenformen:** Gebirge, zerklüftet (*rugged*) und offen. Tundra ist jedes offene Hex direkt
an der Frostlinie.

- **Frostlinie:** Auf der Nordhalbkugel liegt sie nördlich der Hexreihe, deren Temperatur das ganze
  Jahr unter 0 °C bleibt; im Süden entsprechend.
  - Jenseits der Linie liegt Eis auf Land und Wasser.
  - In der Reihe direkt davor wird jedes offene Landhex Tundra.
- **Vergletscherung:** 1W6 − 1 Reihen von der Frostlinie Richtung Äquator. So weit reichten die
  Polkappen einmal. Land in diesem Bereich hat eher Gebirge.
- **Gebirge:** Sie entstehen an Plattengrenzen oder durch Vergletscherung.
  - (2W6 − 2) × 1W6 % der Landhexe sind Gebirge oder zerklüftet. Wie viele davon was sind und wo
    sie genau liegen, legt man fest. Sie folgen grob den Plattengrenzen.
  - Zusätzlich darf jedes Kartendreieck von der Vergletscherungslinie aus 1W6 zerklüftete Hexe und
    ebenso viele Gebirgshexe haben (solange es Landhexe gibt).
- **Vulkane:** Bevorzugt an konvergenten oder seitlichen Plattengrenzen.
  - Zuerst auf zerklüftetem Gelände, auf Inseln oder Archipelen, danach neben einer Gebirgskante.
  - Sind diese Plätze voll, liegen weitere Vulkane frei.
  - Dazu kommen wahlweise 1W6 − 1 Vulkanfelder irgendwo.
- **Flüsse** sind wahlweise, auf dieser Skala nur Beiwerk.
  - Je Kontinent gibt es 1W6 − 1 große Flüsse. Bei nur einem Kontinent gilt das je Kartendreieck
    mit mindestens 10 Landhexen.
  - Jeder Fluss ist 1W6 Hexe lang.
  - Er entspringt in Gebirgen, zerklüftetem Land, Seen oder kleinen Meeren und fließt zu größerem
    Wasser.
  - Hat ein Kontinent Dschungel, fließt mindestens ein Fluss hindurch.

⚑ **Vulkane:** Ihre Zahl hängt im Buch am Seismik-Faktor. Der braucht Monde und Stern, die es nicht
gibt. Vorschlag: nur 1W6 − 3 plus Kerntyp, oder ganz weglassen.

**Gelände durch Leben:**

- **Ohne einheimisches Leben** ist alles Land Wüste. Das ist in der App schon gewürfelt
  (`Surface.life`).
- **Mit Leben** gibt es drei Arten von Wüste:
  - *Kontinentale Wüste:* auf einem Kontinent mit 10 oder mehr zusammenhängenden offenen Hexen, die
    weder Tundra noch zerklüftet sind. Bei 2W6 ≥ Hydrographie gibt es 2W6 − 1 Wüstenhexe, wenn
    möglich nicht an der Küste. Gibt es nur einen Kontinent, prüft man einmal je Kartendreieck mit
    10 offenen Hexen.
  - *Regenschattenwüste:* Hydrographie − 1W6 Hexe direkt neben zerklüftetem Land oder einer
    Gebirgskante, aber nie direkt am Wasser.
  - *Küstenwüste:* Hydrographie − 2W6 Hexe an der Küste, höchstens 4 Hexe von den Polkappen
    entfernt.
- **Dschungel und Regenwald:**
  - Nur in Reihen mit 20–40 °C.
  - Gibt es dort eine Gruppe von 10 zusammenhängenden Hexen, die weder Wüste noch zerklüftet sind
    (auf einem Kontinent oder, bei nur einem Kontinent, in einem Kartendreieck), entsteht Dschungel
    bei 2W6 ≤ Hydrographie.
  - Dann gibt es 2W6 − 1 Dschungelhexe.
  - Sie liegen höchstens 3 Hexe von Ozean oder Meer entfernt und nie neben Wüste.
  - Inseln und Archipele zählen zu den zusammenhängenden Hexen.
- **Offen/Wald:** Alles übrige Land. Ohne Zivilisation ist es dicht bewaldet, manchmal fast wie
  Dschungel.

⚑ Wüsten und Dschungel hängen an der Temperatur je Reihe aus Schritt 5, also an der Hausregel dort.

**Gelände durch Zivilisation** (nur mit intelligentem Leben):

- **Städte** nach TL:
  - TL 0–3: Städte mit Bevölkerungsziffer 5+ nur auf offenem Land.
  - TL 4–6: auch auf zerklüftetem Land und in der Wüste.
  - TL 7–9: auch im Dschungel.
  - TL 10+: auch auf dem Ozean und auf Eis. Ab TL 10+ darf ein Hex mehrere Städte haben.
  - Geht eine Stadt technisch nicht, setzt man sie trotzdem und erklärt es, z. B. eine
    Unterwasserstadt einer zurückgefallenen Kultur.
- **Straßen** bei TL 5–10. Ab TL 10 machen Gravfahrzeuge sie überflüssig.
- **Besiedelt:** offene Hexe neben Städten. Ab TL 11 ist jedes Hex neben einer Stadt besiedelt,
  auch auf dem Ozean. Bei Atmosphäre außerhalb von 4–9 gibt es keine besiedelten Hexe.
- **Raumhäfen** liegen in oder neben ihrer Stadt. Spaceports liegen immer in der Stadt.
- **Terraforming** verwandelt Gelände in mehreren Stufen, z. B. Wüste → Prärie → offen → bewaldet.
  Ab TL 12 geht das großflächiger.

⚑ **Städte:** Zahl und Größe der Städte kommen im Buch aus den *Population Related Details*
(S. 72 ff.). Die haben wir nicht. Entweder kommen sie vorher als neue Werte an die Welt, oder die
Karte setzt vorerst nur die Hauptstadt mit dem Raumhafen.

⚑ **Terraforming** würfelt das Buch über die Tabelle *Wide Scale Terraforming* (S. 68–69).
Vorerst weglassen.

### 7. Fremdartige Welten

Das Buch geht von erdähnlichen Bedingungen aus und ermuntert dazu, die Regeln für fremde Welten
anzupassen. Beispiele: Dschungel in anderen Temperaturbereichen oder eine „radioaktive“ Wüste nach
einem Atomkrieg. Für die App heißt das vorerst nichts. Später ließen sich die Grenzwerte als Daten
pflegen.

## Was wir bewusst weglassen

| Was | Warum | Wann vielleicht |
|---|---|---|
| Rand der habitablen Zone (±4 auf die Temperatur) | kein Sternsystem | mit Book 6 *Scouts* |
| Kerntyp (Dichte) | vereinfacht: nur Größe 0 ohne Platten | wenn Dichte, Masse und Schwerkraft dazukommen |
| Seismik-Faktor, damit die Zahl der Vulkane | braucht Monde und Stern | mit dem Sternsystem |
| Achsneigung, Exzentrizität, Jahreszeiten | für eine erste Karte nicht nötig | später, 2W6-Tabellen ohne Stern gibt es im Buch (S. 63) |
| Gezeitengebundene Welten | braucht die Rotation | mit Rotation und Stern |
| Stadtgrößen und -zahl | braucht die Bevölkerungsdetails | eigener Schritt |
| Terraforming | Beiwerk | später |

## Offene Entscheidungen

1. **Algorithmus für die Platzierung:** Flutfüllung von Startpunkten oder etwas anderes? Wie
   prüfen wir, dass das Ergebnis den Leitlinien des Buchs folgt?
2. **Temperatur je Reihe:** Ist die Hausregel aus Schritt 5 so recht (Mitte der Stufe plus
   Breitengrad-Zuschläge)?
3. **Was wird gespeichert:** das Gelände jedes der 500 Hexe als Wert, nach dem Grundsatz „Werte,
   nicht Würfe“? Oder nur ein Startwert für den Zufall, aus dem die Karte jedes Mal gleich neu
   entsteht? Das erste passt zum Modell, das zweite spart Platz und Export-Größe.
4. **Von Hand nachbessern:** Darf man auf der Karte einzelne Hexe ändern, wie im Buch die
   Spielleitung? Oder nur neu würfeln?
5. **Vulkane, Flüsse, Städte:** Was davon gehört in die erste Version der Karte?
6. **Wo erscheint die Karte:** als eigener Bildschirm von der Weltkarte aus?
