# Regeln für Handel: Fracht, Passagiere, Post und Spekulation

Dieses Dokument ersetzt beim Entwickeln das Nachschlagen in den PDFs. Es fasst **alle Regeln und
Tabellen zum Handel mit dem eigenen Schiff** zusammen: Fracht als Frachtführer, Passagiere, Post
und Botengänge, Handelsbräuche am Hafen, spekulativer Handel mit Waren, und den Ablauf eines
Hafenbesuchs aus Händlersicht. Quelle ist das *Rules Booklet* der Starter Edition (Kapitel
*Starship Economics* und *Trade and Commerce*, dazu die Handelscodes aus *Worlds*); die Tabellen
stehen im Heft *Charts and Tables* auf S. 9 und S. 22 und sind hier vollständig übertragen.

Es ist ein Nachschlagewerk, kein Modell: Was die App davon baut, kommt wie immer zuerst ins
Domänenmodell ([`domain-model.md`](domain-model.md)). Kauf, Finanzierung, laufende Kosten, Crew
und Pannen des Schiffs stehen in [`regeln-schiffe.md`](regeln-schiffe.md); hier sind sie nur so
weit wiederholt, wie die Rechnung einer Handelsfahrt sie braucht. Das **Reisen als Passagier**
(die Gruppe kauft selbst Tickets) ist in [`modell/reise.md`](modell/reise.md) modelliert; hier
geht es um Passagiere, die das **eigene Schiff** befördert.

## Quellen und Schreibweise

| Kürzel | Buch | Seitenangaben |
|---|---|---|
| **SR** | *Traveller Starter Edition*, Teil 1: *Rules Booklet* (GDW 1983), Kapitel *Travel* (S. 27–28), *Starship Economics* (S. 28–30), *Worlds* (S. 45, *Trade Classifications*), *Trade and Commerce* (S. 52), *Adventures* (S. 62) | gedruckte Seitenzahl; im PDF ist es die Seite + 2 |
| **SE** | *Traveller Starter Edition*, Teil 2: *Charts and Tables* (GDW 1983), S. 9 (*Ship Expenses, Ship Revenues, Passengers, Cargo, Typical Activities*) und S. 22 (*Trade and Speculation, Actual Value, Trade and Speculation DMs*) | gedruckte Seite = PDF-Seite − 2 |

- Regeltexte sind auf Deutsch zusammengefasst, Tabellen vollständig übernommen. Namen der Waren
  bleiben englisch, wie die übrigen Tabellennamen in der App.
- „1D“, „2D“ heißt 1W6, 2W6; „3D−1D“ heißt drei Würfel, davon ein weiterer Würfel abgezogen;
  „3D×5“ heißt drei Würfel mal 5; „8+“ heißt „8 oder mehr“; „DM“ ist ein Würfelmodifikator.
- Preise in Credits (Cr), Ladung in Tonnen (t).
- **⚑** markiert eine Stelle, an der die Quelle offen, widersprüchlich oder verschieden lesbar ist.
  Der Owner hat alle am 27. November 2026 entschieden; die Entscheidungen stehen gesammelt unter
  [Entscheidungen zur Auslegung](#entscheidungen-zur-auslegung) und gelten für die App.

**Stand in der App** je Regel:

| Zeichen | Bedeutung |
|---|---|
| ✔ | umgesetzt |
| ◐ | teilweise umgesetzt |
| ○ | offen |
| ✱ | Hausregel der App |

## Überblick

| Regel | Quelle | App |
|---|---|---|
| [Ablauf eines Hafenbesuchs](#ablauf-eines-hafenbesuchs) | SE 9 | ○ |
| [Fracht](#fracht) | SR 29, SE 9 | ○ |
| [Passagiere](#passagiere) | SR 28–29, SE 9 | ○ |
| [Post und Botengänge](#post-und-botengänge) | SR 30, SE 9 | ○ |
| [Handelsbräuche](#handelsbräuche) | SR 30 | ◐ (Berthing Costs ✔✱, siehe `regeln-schiffe.md`) |
| [Spekulativer Handel](#spekulativer-handel) | SR 52, SE 22 | ○ |
| [Trade and Speculation Table](#trade-and-speculation-table-se-22) | SE 22 | ○ |
| [Actual Value Table](#actual-value-table-se-22) | SE 22 | ○ |
| [DMs beim Handel](#dms-beim-handel) | SR 52, SE 22 | ○ |
| [Handelscodes](#handelscodes) | SR 45, SE 22 | ✔ (aus dem UWP, `/trade`; siehe `modell/sektor.md`) |
| [Rechnung einer Handelsfahrt](#rechnung-einer-handelsfahrt) | SR 28–29, SE 9 | ◐ (laufende Kosten teils, siehe `regeln-schiffe.md`) |

---

## Ablauf eines Hafenbesuchs

*SE 9, „Typical Activities“.* Die Liste gilt vor allem für Händler, regelt aber die meisten
Schiffsreisen. Sie ist die natürliche Reihenfolge für einen Ablauf in der App.

1. **Ankunft im System**
   1. Umgebung absuchen (Gefahren, Probleme, sonstige Daten).
   2. Kurs im System setzen.
   3. Mögliche Schiffsbegegnung.
2. **Örtlicher Gasriese** (wahlweise)
   1. Orbit erreichen.
   2. Tanken.
   3. Kurs zur Hauptwelt oder aus dem System setzen.
3. **Hauptwelt**
   1. Orbit erreichen.
   2. Zum Orbitalhafen (Schiffe ohne Stromlinienform) oder zum Bodenhafen (stromlinienförmige
      Schiffe).
   3. **Landung**, dann in dieser Reihenfolge ausladen:
      1. Hochpassagiere,
      2. Post,
      3. Mittelpassagiere,
      4. Fracht,
      5. Niedrigpassagiere,
      6. Low Lottery auflösen.
   4. **Überholung und Wartung**: am Hafen tanken; Lebenserhaltung des Schiffs erneuern.
   5. **Warengeschäft**: 1. spekulative Ladung verkaufen, 2. spekulative Ladung kaufen.
   6. **Schiffsgeschäfte**: 1. Liegegebühren, 2. Bankrate, 3. Wartungsrücklage, 4. Heuer zahlen.
   7. **Sonstiges**: Patronbegegnungen, Erkundung des Planeten, örtliche Sehenswürdigkeiten, neue
      Crew anheuern.
   8. **Abreise vorbereiten**, in dieser Reihenfolge einladen:
      1. Fracht,
      2. Niedrigpassagiere,
      3. Mittelpassagiere,
      4. Hochpassagiere,
      5. Post,
      6. alle Einnahmen der laufenden Reise kassieren.
4. **Abreise**
   1. Start.
   2. Orbit erreichen.
   3. Kurs aus dem System setzen.
   4. Mögliche Schiffsbegegnung.
   5. Sprung.

**Takt** (SR 27): Handelsschiffe folgen meist dem Rhythmus *eine Woche im Sprung, eine Woche im
System*. Eine Reise sind also **zwei Wochen**; darauf beziehen sich die Lebenserhaltung „je Reise“
und die Charter in 2-Wochen-Blöcken. Wer es eilig hat, tankt sofort und springt gleich weiter –
dann gibt es aber weder Fracht noch Passagiere noch Zwischenhalte.

---

## Fracht

*SR 29, „Revenue: Cargo“; Tabelle SE 9, „Cargo“.*

Das Schiff fährt als **Frachtführer** (common carrier): Es befördert fremde Ladung gegen eine feste
Fracht von **Cr1.000 je Tonne**, unabhängig von der Entfernung – je Sprung zu einem angekündigten
Ziel.

### Ablauf

1. Am Raumhafen nach Zahl, Größe und Ziel wartender Ladungen fragen.
2. Die Spielleitung bestimmt **alle Welten, die das Schiff erreichen kann** (nach seiner
   Sprungzahl), und würfelt **für jede dieser Welten** auf der Cargo-Tabelle.
3. Je Zielwelt wird die **Zahl** der Haupt- (*major*), Neben- (*minor*) und Gelegenheitsladungen
   (*incidental*) gewürfelt: Die Zeile ist die Bevölkerung der **Ursprungswelt**, die DMs kommen von
   der **Zielwelt**.
4. Für jede Ladung **1D** für ihre **Größe**: Hauptladung × 10 t, Nebenladung × 5 t,
   Gelegenheitsladung × 1 t.
5. Jede Ladung ist eine eigene Sendung und **nicht teilbar**. Das Schiff darf einzelne Ladungen
   annehmen oder ablehnen, je nachdem, was am besten in den Laderaum passt.
6. Bezahlt wird Cr1.000 je Tonne; die Ladung gilt als geliefert nach den
   [Handelsbräuchen](#handelsbräuche).

### Cargo-Tabelle (SE 9)

Zahl der verfügbaren Ladungen an der **Ursprungswelt**, nach deren Bevölkerungsziffer:

| Bevölkerung | Major | Minor | Incidental |
|---|---|---|---|
| 0 | – | – | – |
| 1 | 1D−4 | 1D−4 | – |
| 2 | 1D−2 | 1D−1 | – |
| 3 | 1D−1 | 1D | – |
| 4 | 1D | 1D+1 | – |
| 5 | 1D+1 | 1D+2 | – |
| 6 | 1D+2 | 1D+3 | 1D−3 |
| 7 | 1D+3 | 1D+4 | 1D−3 |
| 8 | 1D+4 | 1D+5 | 1D−2 |
| 9 | 1D+5 | 1D+6 | 1D−2 |
| A | 1D+6 | 1D+7 | 1D |

**DMs für die Zielwelt** (auf jeden der drei Würfe):

| Bedingung | DM |
|---|---|
| Bevölkerung 4 oder weniger | −4 |
| Bevölkerung 8 oder mehr | +1 |
| Red Zone | keine Fracht |
| Amber Zone | keine Hauptladungen |
| Tech Level | Unterschied zwischen Ursprung und Ziel addieren bzw. abziehen (Richtung siehe Beispiel: TL Ursprung − TL Ziel) |

Ein Ergebnis unter 0 heißt keine Ladung (– heißt: es gibt diese Art an dieser Welt nicht).

**Beispiel aus SR 29:** Ursprung Bevölkerung 6, Ziel Bevölkerung 3 mit einem Tech Level, der 3
unter dem des Ursprungs liegt. Wurf für Hauptladungen 1D = 4; +2 aus der Tabelle, −4 für die
niedrige Bevölkerung des Ziels, +3 für den TL-Unterschied → **5 Hauptladungen**. Für jede wird 1D ×
10 t gewürfelt. Aus dem Beispiel folgt die Richtung des TL-DMs: **DM = TL Ursprung − TL Ziel**
(ein Ziel mit niedrigerem TL zieht mehr Fracht an, eines mit höherem weniger).

### Eigene Ware

Der Eigner darf auch selbst Ware kaufen und auf eigene Rechnung befördern, in der Hoffnung, sie
anderswo mit Gewinn zu verkaufen – das ist der [Spekulative Handel](#spekulativer-handel).

---

## Passagiere

*SR 29, „Revenue: Passengers“; SR 28, „Travel“; Tabelle SE 9, „Passengers“.*

### Ablauf

1. **Erst Fracht, dann Passagiere:** Hat das Schiff Fracht für ein bestimmtes Ziel angenommen,
   melden sich Passagiere für **genau dieses angekündigte Ziel**.
2. Die Zahl der Reisewilligen je Klasse folgt aus der Passagiertabelle: Zeile nach der
   Bevölkerung der **Ursprungswelt**, DMs nach Bevölkerung und Reisezone der **Zielwelt**.
3. Die angegebenen Würfel werfen (z. B. 3D−1D: drei Würfel, dann das Ergebnis eines weiteren
   Würfels abziehen) und die DMs anwenden.
4. Passagiere zahlen den Standardpreis ihrer Klasse, immer für die Beförderung **zum angekündigten
   Ziel**, nicht nach der Sprungweite.

### Passagiertabelle (SE 9)

Zahl der verfügbaren Passagiere an der **Ursprungswelt**, nach deren Bevölkerungsziffer:

| Bevölkerung | High | Middle | Low |
|---|---|---|---|
| 0 | – | – | – |
| 1 | – | 1D−2 | 2D−6 |
| 2 | 1D−1D | 1D | 2D |
| 3 | 2D−2D | 2D−1D | 2D |
| 4 | 2D−1D | 2D−1D | 3D−1D |
| 5 | 2D−1D | 3D−2D | 3D−1D |
| 6 | 3D−2D | 3D−2D | 3D |
| 7 | 3D−2D | 3D−1D | 3D |
| 8 | 3D−1D | 3D−1D | 4D |
| 9 | 3D−1D | 3D | 5D |
| A | 3D | 4D | 6D |

**DMs für die Zielwelt:**

| Bedingung | DM |
|---|---|
| Bevölkerung 4 oder weniger | −3 |
| Bevölkerung 8 oder mehr | +3 |
| Red Zone | −12; keine Mittel- und Niedrigpassagiere |
| Amber Zone | −6 |
| Tech Level | Unterschied zwischen Ursprung und Ziel addieren bzw. abziehen (wie bei Fracht: TL Ursprung − TL Ziel) |

Ergebnisse unter 0 zählen als 0 (✱ selbstverständlich, nicht ausdrücklich gedruckt).
⚑ Ob die DMs auf jeden der drei Würfe einzeln wirken, sagt die Tabelle nicht ausdrücklich.
**Entschieden:** ja, auf jede Klasse einzeln, wie bei der Cargo-Tabelle (E9).

### Preise und Bedingungen (SR 28–29; SE 9)

| Klasse | Preis | Gepäck | Platz | Lebenserhaltung (Kosten des Schiffs) |
|---|---|---|---|---|
| High Passage | Cr10.000 | bis 1.000 kg | Kabine (Stateroom), mit Steward-Service | Cr2.000 je Reise |
| Middle Passage | Cr8.000 | 100 kg | Kabine, ohne Service, schlichte Küche | Cr2.000 je Reise |
| Low Passage | Cr1.000 | 10 kg | Niedrigpassage-Bett (Kälteschlaf) | Cr100 je Nutzung |
| Working Passage | – (kein Geld, nur Kost und Logis) | 1.000 kg | Kabine | Cr2.000 je Reise |

- **Middle Passage** wird auf Abruf (standby) verkauft, falls nicht genug Hochpassagen weggehen. Ein
  Mittelpassagier kann von einem spät kommenden Hochpassagier **verdrängt** („bumped“) werden; er
  bekommt sein Geld zurück, sonst nichts.
- **Jump-Nummer ändert den Preis nicht:** Ein Jump-3-Schiff verlangt für eine Strecke dasselbe wie
  ein Jump-1-Schiff; das Jump-1-Schiff braucht aber drei Sprünge und drei Tickets (über zwei
  Zwischenziele). Für dasselbe Ziel in einem Sprung verlangen beide denselben Fracht- und
  Passagepreis.
- **Belegung:** normal eine Person je Kabine; Militärschiffe und gecharterte Schiffe dürfen doppelt
  belegen, dann kostet die Lebenserhaltung das Doppelte (SR 29).
- **Steward:** Pflicht, sobald Hochpassagiere an Bord sind, einer je 8 zahlenden Hochpassagieren;
  **Medic** je 120 Passagiere (siehe `regeln-schiffe.md`, *Crew*).
- **Niedrigpassage:** Wiederbelebung 5+ je Passagier nach der Landung; DM +1, wenn ein Medic mit
  Medic-2 oder besser dabei ist; DM −1 bei Endurance 6 oder weniger. Misslingt der Wurf, stirbt der
  Passagier; keine Erstattung, keine Haftung. Die Regel ist für die Gruppe als Passagier schon
  umgesetzt (`modell/reise.md`).
- **Low Lottery** (SR 28): Es ist Brauch, dass der Kapitän **Cr10 je Niedrigpassage** in eine
  Lotterie gibt. Jeder Niedrigpassagier rät, wie viele Niedrigpassagiere die Reise überleben. Wer
  richtig liegt, gewinnt den Topf; überlebt der Gewinner selbst nicht, bekommt ihn der Kapitän. Der
  Steward führt die Lotterie. ⚑ Wer gewinnt, wenn mehrere richtig raten oder keiner, sagt die
  Regel nicht. **Entschieden ✱:** Mehrere überlebende Richtige teilen den Topf; trifft keiner oder
  ist kein Richtiger am Leben, bekommt ihn der Kapitän (E10).
- **Working Passage:** höchstens drei Sprünge, sonst gilt die Person als zum Standardlohn angeheuert;
  sie braucht Fertigkeit im Posten (Jack-of-all-Trades geht zur Not).
- **Blinde Passagiere** (SR 28): Entdeckung 4+ je Tag (DMs nach Ermessen der Spielleitung). Bei
  Entdeckung Reaktionswurf des Kapitäns; bei 6 oder weniger wird der Blinde ohne Vacc Suit aus der
  Schleuse gestoßen, sonst entscheidet die Spielleitung.
- **Entführung** (SR 28–29): 18+ auf 3D je Reise für einen Entführungsversuch (nicht, wenn alle
  Passagiere Spielercharaktere sind); mit laufendem Anti-Hijack-Programm kommen die Entführer nur
  auf 5− auf die Brücke. Steht ausführlich in `regeln-schiffe.md` unter *Piraterie, Entführung und
  Zahlungsausfall*.

---

## Post und Botengänge

*SR 30, „Mail and Incidentals“; SE 9, „Ship Revenues“.*

- **Postvertrag:** nur für **subventionierte Handelsschiffe**, meist entlang ihrer festen Route.
  Bedingungen: **5 t Laderaum** sind dauerhaft für die Post reserviert, das Schiff ist
  **bewaffnet**, und ein **Gunner** gehört zur Crew.
- Vergütung: **Cr25.000 je Reise** (Cr5.000 je Tonne Postraum), **unabhängig** davon, wie viel Post
  tatsächlich an Bord ist; es sind nie mehr als 5 t je Reise.
- **Private Botschaften:** Andere Schiffe werden gelegentlich gebeten, private Nachrichten
  mitzunehmen – über Eigner oder Kapitän, manchmal heimlich über ein Crewmitglied. Sie gehen an
  einen bestimmten Ort (etwa das Haus der Travellers' Aid Society oder einen Wirt) und bringen ein
  Honorar von **Cr20 bis Cr120**. **9+**: eine solche Botschaft wartet; welches Crewmitglied
  angesprochen wird, bestimmt der Zufall. Wer eine Botschaft überbringt, gilt beim Empfänger als
  verlässlich eingeführt (ein Anknüpfungspunkt für Patrone). ⚑ Wie das Honorar zwischen Cr20 und
  Cr120 gewürfelt wird, sagt die Regel nicht. **Entschieden ✱:** 1D × Cr20 (E11).

---

## Handelsbräuche

*SR 30, „Trade Customs“.*

- **Lieferung:** Was im Orbit geladen wurde, gilt als geliefert, sobald es im Orbit des Ziels
  abgesetzt ist; was auf der Oberfläche geladen wurde, sobald es auf der Oberfläche des Ziels
  ausgeladen ist. Gilt für Fracht, Passagiere und Post.
- **Shuttle-Service:** An jedem Hafen der Klasse A, B oder C pendeln Shuttles zwischen Orbit und
  Oberfläche. Übliche Preise: **Cr10 je Tonne Fracht**, **Cr20 bis Cr120 je Passagier**.
- **Charter:** Nicht-Sprungschiffe chartern für **Cr1 je Tonne und Stunde**, meist mindestens 12
  Stunden. Sprungschiffe werden in **2-Wochen-Blöcken** gechartert, nach ihrer Ertragskraft:
  **Cr900 je Tonne Laderaum + Cr9.000 je Kabine (High-Passage-Platz) + Cr900 je
  Niedrigpassage-Bett**. Der Eigner trägt alle laufenden Kosten und stellt die Crew.
- **Liegegebühren** (Berthing Costs, SR 29): etwa **Cr100** für Landung und bis zu sechs Tage
  Liegezeit, danach **Cr100 je weiterem Tag**; örtlich höher, oder durch Zuschüsse niedriger oder
  erlassen. **Stand in der App:** ✔✱, siehe `regeln-schiffe.md`.

---

## Spekulativer Handel

*SR 52, „Trade and Commerce“; Tabellen SE 22.*

Viele Handelsschiffe kaufen nebenbei Ware billig ein, befördern sie im freien Laderaum und
verkaufen sie dort teurer, wo sie gefragt ist. Manche Waren bringen weniger als Cr1.000 je Tonne
(die Frachtrate), lohnen aber immer noch mehr als ein leerer Laderaum.

Jede Ware hat einen **Grundpreis** (Base Price), den absoluten Wert auf einer festen Skala. Die
**Actual Value Table** gibt den tatsächlichen Preis als **Prozentsatz des Grundpreises** – beim
Kauf ebenso wie beim Verkauf. Der Verkaufspreis bezieht sich auf den **Grundpreis**, **nicht** auf
den bezahlten Einkaufspreis.

### Ablauf (SR 52)

Voraussetzung: freier Laderaum und freies Kapital.

1. **Ware finden:** Zwei Würfel nacheinander werfen und als zweistellige Zahl lesen (11 bis 66, der
   erste Würfel ist die Zehnerstelle). Auf den **ersten** Würfel: DM **+1**, wenn die Bevölkerung
   der Welt **9 oder mehr** ist; DM **−1**, wenn sie **5 oder weniger** ist. Ein modifizierter
   erster Würfel unter 1 zählt als 1, über 6 als 6. Das Ergebnis ist die **beste verfügbare
   Ware** für die Zwecke der Händler. **Einmal je Woche** würfeln.
2. **Menge:** nach der Spalte *Quantity* würfeln (3D×5 heißt drei Würfel mal 5). Die Partie
   enthält so viel Ware, in **Tonnen** – außer bei 51 bis 56, dort in **Stück** (siehe
   [Waren in Stück](#waren-in-stück)). Es gibt höchstens so viel, wie gewürfelt wurde.
3. **Teilkauf:** Die Händler dürfen auch nur einen Teil der Partie kaufen; ein Teilkauf kostet eine
   **Bearbeitungsgebühr von 1 %**. ⚑ Wovon, sagt die Regel nicht. **Entschieden:** 1 % vom
   Kaufpreis des gekauften Teils, zusätzlich zu zahlen (E5).
4. **Kaufpreis:** 2D auf die **Actual Value Table**, mit den Purchase DMs der Handelscodes der
   Welt, auf der gekauft wird, und **minus** Admin oder Bribery eines Charakters (E1). Der Prozentsatz × Grundpreis × Menge
   ergibt den Nettopreis der Partie.
5. **Verkaufspreis:** An einem möglichen Markt wieder 2D auf die Actual Value Table, diesmal mit den
   **Resale DMs** der Welt, auf der verkauft wird, **plus** Makler **und** Fertigkeit (E2). Prozentsatz ×
   Grundpreis × Menge ist der Erlös.

⚑ Ob die Händler nach dem Würfeln des Preises noch ablehnen dürfen (nicht kaufen, nicht verkaufen
und weiterfliegen), sagt die Regel für den Kauf nicht ausdrücklich; für den Verkauf setzt sie es
voraus (der Makler wird bezahlt, „auch wenn der Verkäufer sich entscheidet, nicht zu verkaufen“).
**Entschieden:** Verzichten geht beim Kauf wie beim Verkauf. Ware, Menge und Preis gelten an dieser
Welt bis zum Ende der Woche; neu gewürfelt wird erst in der nächsten Woche (E3).

### Waren in Stück

*SR 52, „Trade Goods“.*

- Die Warennamen sind **Abstraktionen**: Eine Ladung *Firearms* kann alles sein von
  Vorderlader-Nachbauten bis zu Laserkarabinern. Zweigen die Charaktere einen Teil für sich ab
  (gegen Bezahlung oder durch Diebstahl), bestimmt die Spielleitung die genaue Art.
- Preis und Gewicht abgleichen: **nach dem Preis** rechnen, das Gewicht ist nur die Grenze.
  Beispiel: Eine Schrotflinte kostet Cr150 und wiegt 3,75 kg; eine Tonne Firearms hat den
  Grundpreis Cr30.000. Nach Gewicht wären es 266 Flinten, nach Preis **200 Flinten zu je Cr150** –
  das übrige Gewicht ist Verpackung und Kisten.
- Die Waren **51 bis 56** werden **einzeln** statt in Tonnen gehandelt: Die Menge ist eine
  Stückzahl; Tonnage und Grundpreis je Stück bestimmen laut SR Spieler oder Spielleitung nach den
  bekannten Preisen der Ausrüstung. ⚑ SR 52 zählt auch **66** (Vacc Suits) dazu, die Tabelle SE 22
  nicht. **Entschieden:** 66 wird wie in der Tabelle in **Tonnen** gehandelt (E6).
- **Entschieden (E7):** Der Grundpreis der Tabelle ist der Preis **je Stück** (SE 22), und jede
  Stückware hat eine feste Tonnage je Stück:

  | Wurf | Ware | Grundpreis je Stück | Tonnen je Stück | Beleg |
  |---|---|---:|---:|---|
  | 51 | Aircraft | Cr1.000.000 | 5 | SR 55, Fixed Wing Aircraft (TL 6) Cr1.000.000, 5 t |
  | 52 | Air/raft | Cr600.000 | 4 | SR 55, Air/raft (TL 8) Cr600.000, 4 t |
  | 53 | Computers | Cr10.000.000 | 1 | ✱ Hausregel, keine Quelle |
  | 54 | All Terrain Vehicles | Cr30.000 | 10 | SR 56, Wheeled/Tracked ATV (TL 6) Cr30.000, 10 t |
  | 55 | Armored Vehicles | Cr70.000 | 1 | ✱ Hausregel, keine Quelle |
  | 56 | Farm Machinery | Cr150.000 | 1 | ✱ Hausregel, keine Quelle |

---

## Trade and Speculation Table (SE 22)

| Wurf | Ware | Grundpreis (Cr) | Purchase DMs | Resale DMs | Menge |
|---|---|---:|---|---|---|
| 11 | Textiles | 3.000 | A −7, NA −5, NI −3 | A −6, NA +1, R +3 | 3D×5 |
| 12 | Polymers | 7.000 | I −2, R −3, P +2 | I −2, R +3 | 4D×5 |
| 13 | Liquor | 10.000 | A −4 | A −3, I +1, R +2 | 1D×5 |
| 14 | Wood | 1.000 | A −6 | A −6, I +1, R +2 | 2D×10 |
| 15 | Crystals | 20.000 | NA −3, I +4 | NA −3, I +3, R +3 | 1D |
| 16 | Radioactives | 1.000.000 | I +7, NI −3, R +5 | I +6, NI −3, R −4 | 1D |
| 21 | Steel | 500 | I −2, R −1, P +1 | I −2, R −1, P +3 | 4D×10 |
| 22 | Copper | 2.000 | I −3, R −2, P +1 | I −3, R −1 | 2D×10 |
| 23 | Aluminum | 1.000 | I −3, R −2, P +1 | I −3, NI +4, R −1 | 5D×10 |
| 24 | Tin | 9.000 | I −3, R −2, P +1 | I −3, R −1 | 3D×10 |
| 25 | Silver | 70.000 | I +5, R −1, P +2 | I +5, R −1 | 1D×5 |
| 26 | Special Alloys | 200.000 | I −3, NI +5, R −2 | I −3, NI +4, R −1 | 1D |
| 31 | Petrochemicals | 10.000 | NA −4, I +1, NI −5 | NA −4, I +3, NI −5 | 1D |
| 32 | Grain | 300 | A −2, NA +1, I +2 | A −2 | 8D×5 |
| 33 | Meat | 1.500 | A −2, NA +2, I +3 | A −2, I +2, P +1 | 4D×5 |
| 34 | Spices | 6.000 | A −2, NA +3, I +2 | A −2, R +2, P +3 | 1D×5 |
| 35 | Fruit | 1.000 | A −3, NA +1, I +2 | A −2, I +3, P +2 | 2D×5 |
| 36 | Pharmaceuticals | 100.000 | NA −3, I +4, P +3 | NA −3, I +5, R +4 | 1D |
| 41 | Gems | 1.000.000 | I +4, NI −8, P −3 | I +4, NI −2, R +8 | 1D |
| 42 | Firearms | 30.000 | I −3, R −2, P +3 | I −2, R −1, P +3 | 2D |
| 43 | Ammunition | 30.000 | I −3, R −2, P +3 | I −2, R −1, P +3 | 2D |
| 44 | Blades | 10.000 | I −3, R −2, P +3 | I −2, R −1, P +3 | 2D |
| 45 | Tools | 10.000 | I −3, R −2, P +3 | I −2, R −1, P +3 | 2D |
| 46 | Body Armor | 50.000 | I −1, R −3, P +3 | I −2, R +1, P +4 | 2D |
| 51 | Aircraft | 1.000.000 | I −4, R −3 | NI +2, P +1 | 1D |
| 52 | Air/raft | 600.000 | I −3, R −2 | NI +2, P +1 | 1D |
| 53 | Computers | 10.000.000 | I −2, R −2 | NI +2, P +1, A −3 | 1D |
| 54 | All Terrain Vehicles | 30.000 | I −2, R −2 | NI +2, P +1, A +1 | 1D |
| 55 | Armored Vehicles | 70.000 | I −5, R −2, P +4 | NA −2, A +2, R +1 | 1D |
| 56 | Farm Machinery | 150.000 | I −5, R −2 | A +5, NA −8, P +1 | 1D |
| 61 | Electronics Parts | 100.000 | I −4, R −3 | NI +2, P +1 | 1D×5 |
| 62 | Mechanical Parts | 70.000 | I −5, R −3 | NI +3, A +2 | 1D×5 |
| 63 | Cybernetic Parts | 250.000 | I −4, R −1 | NI +4, A +1, NA +2 | 1D×5 |
| 64 | Computer Parts | 150.000 | I −5, R −3 | NI +3, A +1, NA +2 | 1D×5 |
| 65 | Machine Tools | 750.000 | I −5, R −4 | NI +3, A +1, NA +2 | 1D×5 |
| 66 | Vacc Suits | 400.000 | NA −5, I −3, R −1 | NA −1, NI +2, P +1 | 1D×5 |

Erläuterung aus SE 22:

- *Wurf*: zwei Würfel nacheinander (siehe [Ablauf](#ablauf-sr-52)).
- *Grundpreis*: der unveränderte Wert der Ware, je Tonne (bei 51–56 je Stück).
- *Purchase DMs* verändern den Wert nach der Welt, auf der gekauft wird; *Resale DMs* nach der
  Welt, auf der zum Weiterverkauf angeboten wird. Sie sind DMs auf den 2D-Wurf der
  [Actual Value Table](#actual-value-table-se-22).
- *Menge*: Umfang der verfügbaren Partie. **11–46 und 61–66 in Tonnen, 51–56 je Stück.**
- **Kürzel:** A = Agricultural, NA = Non-Agricultural, I = Industrial, NI = Non-Industrial,
  R = Rich, P = Poor (siehe [Handelscodes](#handelscodes)).
- Erfüllt eine Welt mehrere Codes (etwa arm **und** nicht industrialisiert), gelten **alle** DMs
  dieser Codes zusammen (SR 52).

Lesehilfe: Ein **negativer** Purchase DM drückt den Wurf und damit den Preis – die Ware ist dort
**billig zu haben** (Textiles auf Agrarwelten, A −7). Ein **positiver** Resale DM hebt den Wurf –
die Ware ist dort **gefragt** (Gems auf reichen Welten, R +8).

---

## Actual Value Table (SE 22)

| 2D (modifiziert) | Prozent des Grundpreises |
|---:|---:|
| 2 oder weniger | 40 % |
| 3 | 50 % |
| 4 | 70 % |
| 5 | 80 % |
| 6 | 90 % |
| 7 | 100 % |
| 8 | 110 % |
| 9 | 120 % |
| 10 | 130 % |
| 11 | 150 % |
| 12 | 170 % |
| 13 | 200 % |
| 14 | 300 % |
| 15 oder mehr | 400 % |

Ergebnisse unter 2 zählen als 2, über 15 als 15.

---

## DMs beim Handel

*SR 52; SE 22, „Trade and Speculation DMs“.* Auf den Wurf der Actual Value Table wirken:

### Makler (Broker's Services)

Makler helfen beim **Verkauf** von Ware, die an eine Welt geliefert wurde. Es gibt vier Sorten:

| DM | Provision (vom Verkaufserlös) |
|---|---|
| +1 | 5 % |
| +2 | 10 % |
| +3 | 15 % |
| +4 | 20 % |

- Je +1 kostet 5 % des Verkaufs; mehr als **+4** gibt es nie.
- **Nur ein Makler** darf bei einem Verkauf helfen.
- Der Makler muss **bezahlt werden, auch wenn der Verkäufer sich entscheidet, nicht zu
  verkaufen**. ⚑ Wovon die Provision dann berechnet wird, sagt die Regel nicht. **Entschieden:**
  vom gewürfelten, aber ausgeschlagenen Erlös (E4).

### Fertigkeiten der Charaktere

- **Bribery** oder **Admin** dürfen als DM in Höhe der Stufe auf den Verkauf angerechnet werden
  (SR 52: „for the sale of goods“; SE 22 und die Einleitung von SR 52 sagen allgemeiner: auf die
  Actual Value Table). ⚑ **Entschieden:** auch beim Kauf; dort wird die Stufe **abgezogen**, damit
  sie den Preis drückt (E1).
- **Nur ein Charakter** darf einen Verkauf (und einen Kauf) beeinflussen.
- ⚑ Ob Makler und Fertigkeit zusammen wirken dürfen, sagt die Regel nicht ausdrücklich: „Only one
  broker“ und „only one character“ stehen getrennt. **Entschieden:** ja, je ein Makler und ein
  Charakter, ihre DMs addieren sich (E2).
- Auch für Geschäftsangebote allgemein gilt Admin oder Bribery als DM auf den Reaktionswurf (SR 52,
  *Reactions*).

### Handelscodes der Welt

Die Purchase und Resale DMs der [Trade and Speculation Table](#trade-and-speculation-table-se-22)
nach den Codes der Welt, auf der gekauft bzw. verkauft wird; alle zutreffenden zusammen.

---

## Handelscodes

*SR 45, „Trade Classifications“; SE 22, „World Types“.* Sechs der Handelscodes wirken auf den
Handel. Die App leitet sie schon aus dem UWP ab (`/trade`, Bedingungen nach Charts S. 15, siehe
`modell/sektor.md`).

| Code | Kürzel | Bedingungen (SR 45) | Bedingungen (SE 22) |
|---|---|---|---|
| Agricultural | A (sonst Ag) | Atmosphäre 4–9, Hydrographie 4–8, Bevölkerung 5–7 | gleich |
| Non-Agricultural | NA (sonst Na) | Atmosphäre 0–3, **Hydrographie 0–3**, Bevölkerung 6+ | Atmosphäre 0–3, Bevölkerung 6+ (⚑ ohne Hydrographie; **entschieden:** es gilt SR 45 mit Hydrographie, E8) |
| Industrial | I (sonst In) | Atmosphäre 0, 1, 2, 4, 7 oder 9, Bevölkerung 9+ | gleich |
| Non-Industrial | NI (sonst Ni) | Bevölkerung 0–6 | gleich |
| Rich | R (sonst Ri) | Regierung 4–9, Atmosphäre 6 oder 8, Bevölkerung 6–8 | gleich |
| Poor | P (sonst Po) | Atmosphäre 2–5, Hydrographie 0–3 | gleich |

Die übrigen Codes (Water World, Desert World, Vacuum World, Asteroid Belt, Ice-capped) haben keinen
Einfluss auf den Handel. Die Spielleitung darf neue Handelscodes einführen, wenn es passt (SR 45).

---

## Rechnung einer Handelsfahrt

*SR 28–29, „Starship Economics“; SE 9, „Ship Expenses“, „Ship Revenues“.* Die Einzelheiten zu den
Kosten stehen in `regeln-schiffe.md` (*Laufende Kosten*, *Crew*, *Schiffskauf und
Finanzierung*); hier die Übersicht für eine Reise.

**Einnahmen (SE 9, „Ship Revenues“):**

| Posten | Betrag |
|---|---|
| je Hochpassage | Cr10.000 |
| je Mittelpassage | Cr8.000 |
| je Niedrigpassage | Cr1.000 |
| je Tonne Fracht | Cr1.000 |
| Post (wenn vorgesehen) | Cr25.000 je Reise |
| Spekulation | Erlös minus Einkauf, Makler und Gebühren |

**Ausgaben (SE 9, „Ship Expenses“):**

| Posten | Betrag | Takt |
|---|---|---|
| Bankrate | 1/240 des Barpreises | monatlich, nur bei Ratenkauf |
| Treibstoff | Cr500/t raffiniert, Cr100/t unraffiniert; frei am Gasriesen oder aus Ozeanen | je Tanken |
| Lebenserhaltung | Cr2.000 je Crewmitglied, Hoch- oder Mittelpassagier; Cr100 je Niedrigpassagier | je Reise (2 Wochen) |
| Wartung | 0,1 % des Barpreises | jährlich, Überholung |
| Heuer | nach Crew-Tabelle (SE 9/11) | monatlich |
| Liegegebühren | etwa Cr100 für bis zu 6 Tage, dann Cr100 je Tag | je Hafen |
| Low Lottery | Cr10 je Niedrigpassagier (Brauch) | je Reise |
| Shuttle (falls nötig) | Cr10/t Fracht, Cr20–120 je Passagier | je Hafen |

**Subventionierte Handelsschiffe** (SR 29): Die Regierung subventioniert größere Handelsschiffe
(ab 600-t-Rumpf), um feste Routen zu 2 bis 12 Welten zu bedienen. Der Charakter zahlt die 20 %
Anzahlung, die Regierung übernimmt die Raten und erhält dafür **50 % der Bruttoeinnahmen**; alle
Kosten des Betriebs trägt der Charakter. Das Schiff kann im Krieg eingezogen werden. Nach 40 Jahren
geht es in sein Eigentum über.

**Vorschlag aus SR 62 (Adventures):** „Try Trade and Commerce“ – mit einem Free Trader im
Subsektor Waren kaufen und weiterverkaufen, Passagiere (High, Middle, Low) und Fracht aufnehmen,
den freien Laderaum für Spekulation nutzen; Gewinne und Verluste festhalten, die Schiffskosten
nicht vergessen – bis das Schiff pleite ist, jemand ein Vermögen gemacht hat oder Spielleitung und
Spieler den Spaß verlieren.

---

## Was die App dafür noch braucht

Stand 27. November 2026, als Grundlage für das Modell:

- **Reisezonen** (Amber, Red): Die Cargo- und Passagiertabellen hängen davon ab; die App kennt
  noch keine Zonen (`modell/sektor.md`, *Später*). Bis dahin zählt jede Welt als grün.
- **Laderaum mit Inhalt:** Das Schiff kennt bisher nur die Tonnage seines Laderaums (und Beiboote
  darin); Fracht, Post und spekulative Ware brauchen Ladungen mit Tonnage, Ziel und Eigentümer
  (`modell/schiffe.md`: „was wirklich im Laderaum liegt, kommt erst mit dem Handel“).
- **Passagiere an Bord**, die nicht zur Gruppe gehören: Kabinen, Kojen, Lebenserhaltung je Kopf,
  Steward-Pflicht, Low Lottery.
- **Ein angekündigtes Ziel** vor der Abreise (Fracht und Passagiere richten sich danach).
- **Wochentakt** für den Warenwurf („einmal je Woche“).
- **Makler** als käufliche Dienstleistung am Hafen.

## Entscheidungen zur Auslegung

Der Owner hat die offenen Stellen (⚑) am 27. November 2026 entschieden (E12 und E13 beim
Modellieren nachgefragt). ✱ heißt: eigene Hausregel,
weil die Quelle nichts dazu sagt; die übrigen sind die Wahl zwischen zwei Lesarten der Quelle.

| Nr. | Frage | Entscheidung |
|---|---|---|
| E1 | Wirken Admin oder Bribery auch beim Kauf? | Ja. Beim Kauf wird die Stufe vom Wurf der Actual Value Table **abgezogen**, beim Verkauf **addiert**. Je Geschäft nur ein Charakter. |
| E2 | Makler und Fertigkeit beim selben Verkauf? | Ja, beides; die DMs addieren sich (Makler höchstens +4, dazu die Stufe eines Charakters). |
| E3 | Verzicht nach dem Preiswurf, neu würfeln? | Verzichten geht beim Kauf und Verkauf. Ware, Menge und Preis gelten an der Welt bis zum Ende der Woche; neuer Warenwurf erst in der nächsten Woche. |
| E4 | Makler bei Verzicht auf den Verkauf | Provision in Prozent des gewürfelten, ausgeschlagenen Erlöses. |
| E5 | Teilkauf-Gebühr 1 % wovon? | Vom Kaufpreis des gekauften Teils, zusätzlich. |
| E6 | Vacc Suits (66): Stück oder Tonnen? | Tonnen, wie die Tabelle SE 22 (SR 52 gilt hier nicht). |
| E7 | Stückwaren 51–56: Preis und Tonnage | Grundpreis = Preis je Stück. Tonnage je Stück fest: Aircraft 5 t, Air/raft 4 t, ATV 10 t (aus SR 55–56); ✱ Computers, Armored Vehicles und Farm Machinery je 1 t. |
| E8 | Non-Agricultural mit oder ohne Hydrographie? | Mit Hydrographie 0–3 (SR 45, Charts S. 15), wie die App es schon rechnet. |
| E9 | Passagier-DMs je Klasse? | Ja, die DMs der Zielwelt wirken auf jede der drei Klassen einzeln. |
| E10 | Low Lottery bei mehreren oder keinen Richtigen | ✱ Mehrere überlebende Richtige teilen den Topf; sonst bekommt ihn der Kapitän. |
| E11 | Honorar für private Post | ✱ 1D × Cr20. |
| E12 | Wer darf einen Postvertrag schließen? | ✱ Jedes Schiff, nicht nur subventionierte; bezahlt wird nur, wenn es beim Abflug bewaffnet ist und ein Gunner auf Posten steht. |
| E13 | Private Botschaften in der App | 9+ je Woche und Welt; Ziel ein System in Sprungweite, Honorar 1D × Cr20, bezahlt bei Lieferung am Ziel. Welches Crewmitglied angesprochen wird, würfelt die App nicht; die Einführung beim Empfänger bleibt Text. |
