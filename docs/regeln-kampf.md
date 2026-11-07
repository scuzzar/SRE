# Regeln für Kampf und Begegnungen

Dieses Dokument ersetzt beim Entwickeln das Nachschlagen in den PDFs. Es fasst **alle Regeln und
Tabellen zum Kampf und zu den Systemen drumherum** (Begegnungen, die zum Kampf führen können,
Überraschung, Entfernung, Entkommen, Moral, Umstände, Wunden, Heilung, Waffen) aus zwei Büchern
zusammen, jede mit Quelle und Seite, und sagt
je Regel, wie weit die App sie schon umsetzt. Es ist ein Nachschlagewerk, kein Modell: Was die App
davon baut, kommt wie immer zuerst ins Domänenmodell ([`domain-model.md`](domain-model.md)).

## Quellen und Schreibweise

| Kürzel | Buch | Seitenangaben |
|---|---|---|
| **SE** | *Traveller Starter Edition*, Teil 2: *Charts and Tables* (GDW 1983) | gedruckte Seitenzahl; im PDF ist es die Seite + 2 |
| **B4** | *Traveller Book 4: Mercenary* (GDW 1978) | gedruckte Seitenzahl; im PDF ist es die Seite + 6 |
| **B1** | *Traveller Book 1: Characters and Combat* | liegt nicht vor; nur genannt, wo SE oder B4 darauf verweisen |

- Regeltexte sind auf Deutsch zusammengefasst, Tabellen vollständig übernommen. Namen aus den
  Tabellen (Waffen, Rüstungen, Reaktionen, Reichweiten) bleiben englisch, wie in der App.
- „1D“, „2D“ heißt 1W6, 2W6; „8+“ heißt „8 oder mehr auf 2W6“; „DM“ ist ein Würfelmodifikator.
- Gewichte in Gramm, Längen in Millimetern, Preise in Credits (Cr), wenn nicht anders angegeben.
- Was eines der Bücher nur erwähnt und in B1 regelt, steht unter [Lücken](#lücken-was-nur-in-book-1-steht).

**Stand in der App** je Regel:

| Zeichen | Bedeutung |
|---|---|
| ✔ | umgesetzt |
| ◐ | teilweise umgesetzt |
| ○ | offen |
| ✱ | Hausregel der App (weicht ab oder ergänzt) |

## Überblick

| Regel | Quelle | App |
|---|---|---|
| [Ablauf eines Kampfes](#ablauf-eines-kampfes) | SE 6 | ◐ |
| [Häufigkeit von Begegnungen](#häufigkeit-von-begegnungen) | SE 20 | ○ |
| [Zufallsbegegnungen mit Personen](#zufallsbegegnungen-mit-personen) | SE 21 | ✔ ✱ |
| [Reaktion](#reaktion) | SE 21 | ✔ |
| [Waffen nach TL, Verbote nach Gesetz](#waffen-nach-tl-und-verbote-nach-gesetzesstufe) | SE 21 | ✔ |
| [Überraschung](#überraschung) | SE 5 | ✔ (ohne Tiere) |
| [Anfangsentfernung und Gelände](#anfangsentfernung-und-gelände) | SE 5 | ✔ |
| [Reichweiten, Range Bands, Geschwindigkeiten](#reichweiten-range-bands-und-geschwindigkeiten) | SE 7, 24 | ✔ ✱, Geschwindigkeiten ◐ |
| [Entkommen und Ausweichen](#entkommen-und-ausweichen) | SE 5 | ○ |
| [Moral (einfach)](#moral-einfach) | SE 5 | ○ |
| [Angriff: Grundwurf und DMs](#angriff-grundwurf-und-erlaubte-dms) | SE 6 | ◐ |
| [Feuerstoß und Schrot nach Book 1](#feuerstoß-und-schrot-nach-book-1) | B1 | ○ |
| [Waffen- und Reichweitenmatrix](#waffen--und-reichweitenmatrix) | SE 6 | ✔ (ohne Tierwaffen und Zubehör) |
| [Waffen und Ausrüstung](#waffen-und-ausrüstung) | SE 4, 23 | ✔ (ohne Zubehör) |
| [Rüstung](#rüstung) | SE 4 | ✔ |
| [Deckung, Verbergen, Dunkelheit](#deckung-und-verbergen) | SE 5 | ○ |
| [Schwerelosigkeit](#schwerelosigkeit) | SE 5, B4 16 | ○ |
| [Traglast und Schwerkraft](#traglast-und-schwerkraft) | SE 5 | ○ |
| [Typische Aktionen](#typische-aktionen) | SE 5 | ◐ |
| [Wunden und Tod](#wunden-und-tod) | SE 7 | ✔ |
| [Medizinische Versorgung](#medizinische-versorgung) | SE 7 | ✔, Drogen ○ |
| [Moral nach Book 4](#moral-nach-book-4) | B4 28–31 | ○ |
| [Feuerregeln aus Book 4](#feuerregeln-aus-book-4) | B4 31–32 | ○ |
| [Waffen aus Book 4](#waffen-aus-book-4) | B4 36–41, 50–52 | ○ |
| [Fertigkeiten aus Book 4 im Kampf](#fertigkeiten-aus-book-4-im-kampf) | B4 10–16, 26 | ○ |
| [Abstraktes Schlachtsystem](#abstraktes-schlachtsystem) | B4 32–35 | ○ |
| [Feldartillerie](#feldartillerie) | B4 48–49 | ○ |
| [Tierbegegnungen](#tierbegegnungen) | SE 18–19 | ○ |

---

## Ablauf eines Kampfes

*SE 6, „Combat Procedure“.* App: ◐ (1A, 1B, 2B, 2C, 2E; 1C, 2A, 2D offen)

1. Die Fakten der Begegnung feststellen:
   - A. Wer hat Überraschung?
   - B. Anfangsentfernung?
   - C. Entkommen oder Ausweichen?
2. Kampfrunde beginnen:
   - A. Bewegungsstatus jedes Einzelnen.
   - B. Ziele und Angriffe jedes Einzelnen: 1) DMs des Angreifers, 2) DMs des Verteidigers.
   - C. Gelingt ein Angriff, die Wunden am **Ende der Runde** bestimmen.
   - D. Moral würfeln, wenn die Einheit 25 % Verluste hat.
   - E. Neue Runde (weiter mit 2).
3. Nach dem Kampf: Verwundete versorgen, Kräfte sammeln.

*Referee's Discretion (SE 6):* Die Spielleitung darf weitere DMs ansagen oder verdeckt anwenden.

> App: Wunden wirken sofort nach dem Treffer, nicht erst am Ende der Runde (siehe
> `domain-model.md`, *Kampfsimulation*).

---

## Begegnungen

### Häufigkeit von Begegnungen

*SE 20, „Encounters“ und „Encounter Checklist“.* App: ○ (man würfelt eine Begegnung, wann man will)

SE kennt sieben Arten von Begegnungen. Zum Kampf führen können diese beiden:

| Art | Wann | Was |
|---|---|---|
| Random | täglich, bei 5+ auf 1W6 | eine Zufallsbegegnung mit Personen ([Liste](#zufallsbegegnungen-mit-personen)) |
| Animal | zweimal täglich nach der Tierbegegnungstabelle des Geländes, außerhalb von Städten | [Tierbegegnungen](#tierbegegnungen) |

Die übrigen (Routine, Legal, Patron, Rumor, Adventure) stehen unter
[Nicht aufgenommen](#nicht-aufgenommen).

*SE 5, „Encounters“:* Die Spielleitung arbeitet (ohne es zu verraten) mit: Was oder wer? Wie viele?
Warum? Wie? Wann? Wo?

### Zufallsbegegnungen mit Personen

*SE 21, „Random Encounters Matrix“ und „Random Encounter List“.* App: ✔

Gewürfelt wird 1W6 (erste Ziffer) und 1W6 (zweite Ziffer), 11 bis 66. Die Anzahl („Qty“) ist so viele
W6, wie angegeben.

| Wurf | Qty | Type | Remarks |
|---|---|---|---|
| 11 | 1D | Peasants | −3 |
| 12 | 2D | Peasants | −2 |
| 13 | 2D | Workers | −1 |
| 14 | 3D | Rowdies | L |
| 15 | 2D | Thugs | L |
| 16 | 4D | Riotous Mob | −1 |
| 21 | 2D | Soldiers | +1 LGA |
| 22 | 2D | Soldiers | LGAV |
| 23 | 1D | Police Patrol | +1 GA |
| 24 | 2D | Marines | LGA |
| 25 | 3D | Security Troops | +1 GA |
| 26 | 2D | Soldiers on Patrol | LGA |
| 31 | 1D | Adventurers | +2 GAV |
| 32 | 2D | Noble with Retinue | LGAV |
| 33 | 2D | Hunters and Guides | +1 LGV |
| 34 | 2D | Tourists | +2 |
| 35 | 1D | Researchers | +3 V |
| 36 | 1D | Police Patrol | VG |
| 41 | 1D | Fugitives | −2 |
| 42 | 2D | Fugitives | V |
| 43 | 3D | Fugitives | G |
| 44 | 2D | Vigilantes | G |
| 45 | 3D | Bandits | L |
| 46 | 3D | Ambushing Brigands | LGA |
| 51 | 1D | Merchants | +1 LA |
| 52 | 2D | Traders | GV |
| 53 | 2D | Religious Group | |
| 54 | 1D | Beggars | L |
| 55 | 5D | Pilgrims | A |
| 56 | 3D | Guards | A |
| 61–66 | | (leer) | |

**Bemerkungen (SE 21):**
- Alle Begegneten haben die nötige Überlebensausrüstung (Vakuumanzug, Filtermaske, Atemgerät), egal
  welcher TL; sie gilt notfalls als eingeführt.
- Ohne andere Angabe tragen alle **Klingen** (keine Schusswaffen), **keine Rüstung** und sind **zu Fuß**.
- **L**: Ein Anführer ist dabei; er hat die beste Ausrüstung, die der TL hergibt.
- **G**: Die Gruppe hat Schusswaffen. **A**: Die Gruppe trägt Rüstung. **V**: Die Gruppe hat ein
  Fahrzeug passend zum TL (auch Reittiere).
- **−N** / **+N**: Der TL der Gruppe ist N niedriger bzw. höher als der der Welt.

> ✱ App: Der Würfel der Anzahl ist einstellbar (W6 nach der Regel, W4 oder W3 zum Ausgleichen).
> Welche Waffe und Rüstung ein NSC bekommt, legt die App fest: zufällig bis zum TL der Gruppe, der
> Anführer das Beste. Das Merkmal „militärisch“ (`EncounterType.military`) ist eine Ergänzung der App.

### Reaktion

*SE 21, „Reactions“.* App: ✔

| 2W6 | Reaction |
|---|---|
| 2 | Violent. Immediate attack. |
| 3 | Hostile. Attack on 5+. |
| 4 | Hostile. Attack on 8+. |
| 5 | Hostile. May attack. |
| 6 | Unreceptive. |
| 7 | Non-committal. |
| 8 | Interested. |
| 9 | Intrigued. |
| 10 | Responsive. |
| 11 | Enthusiastic. |
| 12 | Genuinely friendly. |

- Eine echte 2 oder 12 auf den Würfeln gilt ohne DMs. Mit DMs wird unter 3 zu 3 und über 12 zu 12.
- DM +1, wenn ein Charakter 5 oder mehr Terms in Army, Navy, Scouts oder Marines gedient hat.
- DM −1, wenn die Bevölkerung der Welt 9 oder mehr ist.

### Waffen nach TL und Verbote nach Gesetzesstufe

*SE 21, „Available Weapons by TL“ und „Prohibited Weapons by LL“.* App: ✔

| TL | Waffen | Rüstung |
|---|---|---|
| 0 | club, cudgel, spear | |
| 1 | dagger, pike, sword | jack |
| 2 | halberd, broadsword | |
| 3 | foil, cutlass, blade, bayonet | |
| 4 | revolver, shotgun | |
| 5 | carbine, rifle, pistol, SMG | |
| 6 | automatic rifle | cloth |
| 7 | body pistol | mesh |
| 8 | laser carbine | vacc suit |
| 9 | laser rifle | ablat |
| 10 | | reflec |
| 11 | | combat armor |
| 12 | | |
| 13 | | battle dress |

| Law | Verboten |
|---|---|
| 0 | nichts |
| 1 | body pistol, bombs, grenades |
| 2 | laser rifle, laser carbine |
| 3 | automatic rifles |
| 4 | submachineguns |
| 5 | pistols, revolvers |
| 6 | rifles, carbines |
| 7 | shotguns |
| 8 | alle Klingen außer Dagger |
| 9 | alle Waffen außerhalb des Hauses |
| A | alle Waffen |

Ein Verbot gilt ab dieser Stufe und für alle höheren.

---

## Vor dem Kampf

### Überraschung

*SE 5, „Surprise“.* App: ✔ (die beiden Tier-DMs fehlen, es gibt noch keine Tierbegegnungen)

Jede Partei würfelt 1W6 mit DMs. Liegt ein Wurf **3 oder mehr** über dem anderen, hat die höhere
Partei Überraschung.

| Bedingung | DM |
|---|---|
| Jemand trägt Battle Dress | +2 |
| Jemand hat Leader | +1 |
| Jemand hat Tactics | +1 |
| Jemand hat militärische Erfahrung (Army oder Marines) | +1 |
| Jemand ist in einem Fahrzeug | −1 |
| Die Gruppe hat 8 oder mehr Personen | −1 |
| Die Gruppe hat 10 oder mehr Tiere | −1 |
| Die Gruppe besteht aus Pouncer-Tieren | +1 |

*Schläge und Hiebe mit Überraschung (SE 6, „Attacks“):* volle Stärke, unbegrenzt, solange die
Überraschung anhält.

### Anfangsentfernung und Gelände

*SE 5, „Encounter Range“.* App: ✔

2W6 plus DM des Geländes; über 12 gilt als 12, unter 1 als 1.

| Gelände | DM |
|---|---|
| Clear, Road, Open | +3 |
| Prairie, Plain, Steppes | +3 |
| Rough, Hills, Foothills | +2 |
| Broken, Highlands | +2 |
| Mountain, Alpine | +3 |
| Forest, Woods | +1 |
| Jungle, Rainforest | — |
| River, Stream, Creek | +1 |
| Swamp, Bog, Marsh | −4 |
| Desert, Dune, Sand Sea | +4 |
| Maritime Surface | +2 |
| Maritime Subsurface | −1 |
| Arctic | +2 |
| City | −4 |
| Building Interior, Cave | −5 |

| Wurf | Range |
|---|---|
| 1 | Short |
| 2 | Close |
| 3 | Short |
| 4 | Medium |
| 5 | Short |
| 6 | Medium |
| 7 | Medium |
| 8 | Long |
| 9 | Medium |
| 10 | Very Long |
| 11 | Long |
| 12 | Very Long |

### Entkommen und Ausweichen

*SE 5, „Escape and Avoidance“.* App: ○

- **Ausweichen:** Eine NSC-Partei, die **in der Unterzahl** ist und **Überraschung** hat, weicht der
  Begegnung bei **7+** aus.
- **Tiere** fliehen nach ihren Eigenschaften und den Begegnungstabellen (siehe
  [Tierverhalten](#tierverhalten)).
- **Entkommen:** Eine Partei **ohne Überraschung** entkommt bei **9+**, mit DM nach Reichweite:

| Reichweite | DM |
|---|---|
| Close oder Short | −1 |
| Medium | +1 |
| Long | +2 |
| Very Long | +3 |

> In der App sind die Parteien außerdem **entkommen**, wenn sie mehr als 20 Bands auseinander sind
> (B1 S. 33, über `domain-model.md`).

### Moral (einfach)

*SE 5, „Morale“.* App: ○. Für Zufallsbegegnungen; Book 4 hat eine genauere
[Moral für Militär](#moral-nach-book-4).

Sobald **25 %** einer Partei bewusstlos oder tot sind, würfelt sie **jede Kampfrunde** auf die Moral:
**7+**, um standzuhalten (nicht zu fliehen).

| Bedingung | DM |
|---|---|
| Militärische oder Söldnereinheit | +1 |
| Jemand hat Leader | +1 |
| Der Anführer hat Tactics | +1 |
| Verluste (bewusstlos oder tot) über 50 % | −2 |
| Anführer bewusstlos oder tot | −2, nur für 2 Kampfrunden; dann übernimmt ein neuer Anführer |

---

## Entfernung

### Reichweiten, Range Bands und Geschwindigkeiten

*SE 7, „Ranges“, „Range Bands“, „Speeds“; gleiche Reichweiten SE 24, „Range Descriptions“.*
App: Reichweiten und Bands ✔, Geschwindigkeiten ◐ (die Parteien rücken mit ◀ ▶ ohne Zug)

| Range | Bedeutung |
|---|---|
| Close | In Berührung |
| Short | Auf Schwert- oder Speerlänge, 1 bis 5 m |
| Medium | Pistolenreichweite, 6 bis 50 m |
| Long | Gewehrreichweite, 51 bis 250 m |
| Very Long | Extreme Reichweite, 251 bis 500 m |
| Distant | Außer normaler Reichweite, 500 bis 5000 m |
| Very Distant | Außer Sicht, 5 bis 50 km |
| Regional | 50 bis 500 km |
| Continental | 500 bis 5000 km |
| Planetary | 5000 bis 50 000 km |

| Bands | Range |
|---|---|
| 0 | Close oder Short |
| 1–2 | Medium |
| 3–10 | Long |
| 11–20 | Very Long |

Ein Band sind etwa 17 Felder zu 1,5 m (etwa 25 m).

| Geschwindigkeit | Bands | Felder |
|---|---|---|
| Stand | 0 | 0 |
| Walking | 1 | 17 |
| Running (double) | 2 | 33 |
| Running (triple) | 3 | 50 |
| Running (quadruple) | 4 | 67 |

Schneller als doppelt laufen geht meist nicht lange.

> ✱ App: Auf Band 0 unterscheidet sie Close (Berührung) und Short. Das Startband innerhalb einer
> Reichweite ist gleichverteilt gewürfelt (Medium 1W2, Long 1W8, Very Long 1W10).

---

## Angriff

### Angriff: Grundwurf und erlaubte DMs

*SE 6, „Basic Throw to Hit“, „Allowed Die Modifiers“, „Attacks“.* App: ◐

**Grundwurf: 8+** für jeden Schlag, Hieb oder Schuss.

| Erlaubter DM | App |
|---|---|
| Vorteilhafte Stärke (Klingen) | ✔ |
| Vorteilhafte Geschicklichkeit (Schusswaffen) | ✔ |
| Nötige Stärke (Klingen) | ✔ |
| Nötige Geschicklichkeit (Schusswaffen) | ✔ |
| Waffenfertigkeit des Angreifers | ✔ |
| Klingenfertigkeit des Verteidigers (Parieren) | ○ (Regel in B1) |
| Rüstung | ✔ |
| Reichweite | ✔ |
| Verteidiger weicht aus (Evading) | ○ (Regel in B1) |
| Verteidiger in Deckung | ○ ([Deckung](#deckung-und-verbergen)) |
| Gruppentreffer durch Schrotflinte | ○ ([B1](#feuerstoß-und-schrot-nach-book-1), im Modell entworfen) |
| Gruppentreffer durch Autofeuer | ○ ([B1](#feuerstoß-und-schrot-nach-book-1), [B4](#feuerregeln-aus-book-4), im Modell entworfen) |
| Geschwächte Schläge | ○ (DM in der [Waffentabelle](#klingen-und-nahkampf), Regel unten) |
| Waffe ziehen | ○ (Regel in B1) |
| Geworfene Klinge | ○ (Regel in B1) |
| Schlechte Sicht, Dunkelheit | ○ ([Dunkelheit](#dunkelheit)) |

**Arten von Angriffen (SE 6):**
- **Blows** (Schläge) mit Händen, **Swings** (Hiebe) mit Klingen, **Shots** (Schüsse) mit Schusswaffen.
- Schläge und Hiebe:
  - *Surprise:* volle Stärke, unbegrenzt, solange die Überraschung anhält.
  - *Combat:* volle Stärke, aber begrenzt durch die Ausdauer (END) des Einzelnen.
  - *Weakened:* mit dem negativen DM „Weakened Blow or Swing“ der Waffe, sobald die vollen Schläge
    aufgebraucht sind oder wenn man sie bewusst spart.
  - *Special:* wo Stärke keine Rolle spielt, etwa gegen Bewusstlose oder Wehrlose.
- Schüsse:
  - *Combat:* gewöhnliches Feuer.
  - *Coup de Grace:* gegen Bewusstlose oder Wehrlose.

> Wie viele volle Schläge die Ausdauer erlaubt, steht in B1, nicht in SE.

### Feuerstoß und Schrot nach Book 1

*B1 (Ausgabe 1981), „Special Considerations“: „Full Automatic Fire“, „Group Hits by Shotgun“.*
App: ○ (im Modell entworfen, siehe `domain-model.md`, *Feuerstoß und Schrot*)

> B1 liegt nicht als PDF vor. Der Wortlaut unten stammt aus einem Auszug von B1, den eine Websuche am
> 7. November 2026 fand; die Seite ist nicht bekannt.

- **Full Automatic Fire:** „Submachineguns and automatic rifles fire four round bursts instead of
  single shots. The higher ammunition usage results in the hit probabilities shown on the table
  (auto rifle uses the rifle row on the table when firing single shots). In addition, automatic fire
  allows rolling to hit twice against the same target.“ Also: Feuerstöße zu 4 Schuss, die DMs der
  Matrix gelten für den Feuerstoß, das Automatic Rifle schießt einzeln mit der Zeile des Rifle, und
  ein Feuerstoß würfelt **zweimal** auf das Ziel.
- **Gruppentreffer durch Autofeuer:** „Regardless of the designated target for automatic fire,
  non-evading individuals adjacent to the target are also attacked by the burst of automatic fire.“
  Ohne DM und ohne Grenze; Book 4 begrenzt es auf 2 Nachbarn bei 4 Schuss mit DM −3
  ([Feuerregeln aus Book 4](#feuerregeln-aus-book-4)).
- **Group Hits by Shotgun:** „Each shot by a shotgun may attack up to three individuals adjacent to
  the original target, provided they are in a group (herd, pack, band, etc) and are each human-sized
  or smaller.“ Ein DM für die Nachbarn steht nicht dabei.

> ✱ App: Feuerstoß nach B1 mit der Grenze aus B4 (2 Nachbarn, DM −3); Schrot nach B1 (3 Nachbarn,
> ohne DM). Die Parteien haben keine Plätze, nur eine Liste: Beim Feuerstoß sind die Nachbarn der
> darüber und der darunter in der Liste, bei der Schrotflinte lost die App sie aus der Partei des
> Ziels aus.

### Waffen- und Reichweitenmatrix

*SE 6, „Weapons and Range Matrix“.* App: ✔ für die 23 Waffen (`src/data/weapons.json`, abgeglichen);
Tierwaffen und Zubehör ○

DM des Angreifers gegen die **Rüstung des Verteidigers** und nach **Reichweite**; „no“ heißt: auf diese
Reichweite kein Angriff. Rechts der Schaden („Wound Inflicted“) in W6.

| Weapon | Nothing | Jack | Mesh | Cloth | Reflec | Ablat | Combat | Close | Short | Medium | Long | Very Long | Wound |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Hands | +1 | −1 | −4 | −4 | 0 | −1 | −6 | +2 | +1 | no | no | no | 1D |
| Claws | +3 | 0 | 0 | +1 | −1 | −3 | −7 | +1 | +2 | no | no | no | 2D |
| Teeth | +2 | +1 | −1 | 0 | −2 | −4 | −7 | +2 | 0 | no | no | no | 2D |
| Horns | +2 | +1 | 0 | −1 | +2 | −2 | −5 | −1 | +1 | no | no | no | 2D |
| Hooves | +3 | +3 | +2 | +2 | +3 | +2 | −6 | −1 | +2 | no | no | no | 2D |
| Stinger | +4 | +3 | 0 | +1 | +2 | 0 | −6 | +4 | +2 | no | no | no | 3D |
| Thrasher | +7 | +7 | +4 | +4 | +7 | +4 | 0 | +5 | +1 | no | no | no | 2D |
| Club | 0 | 0 | −2 | −3 | 0 | −2 | −7 | +1 | +2 | no | no | no | 2D |
| Dagger | 0 | −1 | −4 | −4 | 0 | −2 | −7 | +1 | +2 | no | no | no | 2D |
| Blade | +1 | 0 | −4 | −4 | +1 | −3 | −5 | +1 | +1 | no | no | no | 2D |
| Foil | +2 | 0 | −4 | −3 | +2 | −2 | −8 | −1 | 0 | no | no | no | 1D |
| Cutlass | +4 | +3 | −2 | −3 | +4 | −2 | −6 | −4 | +2 | no | no | no | 3D |
| Sword | +3 | +3 | −3 | −3 | +3 | −2 | −6 | −2 | +1 | no | no | no | 2D |
| Broadsword | +5 | +5 | +1 | 0 | +5 | +1 | −4 | −8 | +3 | no | no | no | 4D |
| Bayonet | +2 | +1 | 0 | −1 | +2 | −2 | −6 | −1 | +2 | no | no | no | 3D |
| Spear | +1 | 0 | −2 | −2 | −1 | −3 | −6 | −2 | +1 | no | no | no | 2D |
| Halberd | +4 | +3 | −2 | −3 | +4 | −2 | −5 | 0 | +1 | no | no | no | 3D |
| Pike | +1 | 0 | −2 | −2 | −1 | −3 | −6 | −4 | +4 | no | no | no | 3D |
| Cudgel | 0 | 0 | −2 | −3 | 0 | −2 | −7 | 0 | 0 | no | no | no | 2D |
| Body Pistol | 0 | 0 | −2 | −4 | −4 | −2 | −7 | +2 | +1 | −6 | no | no | 3D |
| Automatic Pistol | +1 | +1 | −1 | −3 | +1 | −1 | −5 | +1 | +2 | −4 | −6 | no | 3D |
| Revolver | +1 | +1 | −1 | −3 | +1 | −1 | −5 | +1 | +2 | −3 | −5 | no | 3D |
| Carbine | +2 | +2 | 0 | −3 | +2 | −1 | −5 | −4 | +1 | −2 | −4 | −5 | 3D |
| Rifle | +3 | +3 | 0 | −3 | +2 | +1 | −5 | −4 | +1 | 0 | −1 | −3 | 3D |
| Automatic Rifle | +6 | +6 | +2 | −1 | +6 | +3 | −3 | −8 | 0 | +2 | +1 | −2 | 3D |
| Shotgun | +5 | +5 | −1 | −3 | +5 | +2 | −5 | −8 | +1 | +3 | −6 | no | 4D |
| Submachinegun | +5 | +5 | 0 | −3 | +5 | +2 | −4 | −4 | +3 | +3 | −3 | −9 | 3D |
| Laser Carbine | +2 | +2 | +1 | +1 | −8 | −7 | −6 | −2 | +1 | +1 | +1 | 0 | 4D |
| Laser Rifle | +3 | +3 | +2 | +2 | −8 | −7 | −6 | −4 | +2 | +2 | +2 | +1 | 5D |
| Telescopic Sights | — | — | — | — | — | — | — | — | — | — | +4 | +4 | — |
| Electronic Sights | — | — | — | — | — | — | — | — | — | — | +4 | +4 | — |
| Shoulder Stock | — | — | — | — | — | — | — | −1 | −1 | +1 | +1 | — | — |
| Folding Stock | — | — | — | — | — | — | — | — | — | −1 | −1 | −1 | — |

Die Spalte „Combat“ gilt für Combat Armor und Battle Dress; Vacc Suit zählt als Cloth
([Rüstung](#rüstung)).

### Waffen und Ausrüstung

*SE 4, „Weapons and Equipment“.* App: ✔ (Zubehör ○)

#### Klingen und Nahkampf

| Item | Base Weight | Length | Price | Required STR | DM | Advantageous STR | DM | Weakened Blow/Swing DM | TL |
|---|---|---|---|---|---|---|---|---|---|
| Hands | — | — | — | 6 | −2 | 9 | +1 | −2 | — |
| Claws, Teeth, Horns, Hooves, Stinger, Thrasher | — | — | — | — | — | — | — | — | — |
| Club | 1000 | 800 | — | 5 | −4 | 8 | +2 | −1 | 0 |
| Dagger | 250* | 200 | 10 | 4 | −2 | 8 | +2 | −2 | 1 |
| Blade | 350 | 300 | 50 | 5 | −2 | 9 | +1 | −2 | 3 |
| Foil | 500 | 800 | 100 | 5 | −1 | 10 | +1 | −2 | 3 |
| Cutlass | 1250 | 800 | 100 | 7 | −2 | 11 | +2 | −4 | 3 |
| Sword | 1000 | 800 | 150 | 6 | −2 | 10 | +1 | −3 | 1 |
| Broadsword | 2500 | 1200 | 300 | 8 | −4 | 12 | +2 | −4 | 2 |
| Bayonet | 250 | (+) 200 | 10 | 5 | −2 | 9 | +2 | −2 | 3 |
| Spear | 2000 | 3000 | 10 | 5 | −1 | 9 | +2 | −3 | 0 |
| Halberd | 2500 | 2500 | 75 | 6 | −2 | 10 | +2 | −3 | 2 |
| Pike | 3000 | 4000 | 40 | 7 | −3 | 10 | +2 | −3 | 1 |
| Cudgel | 1000 | 1500 | 10 | 5 | −1 | 8 | +2 | −1 | 0 |

#### Schusswaffen und Zubehör

| Item | Base Weight | Ammo Weight | Rds/Clip | Length | Price | Ammo Price | Required DEX | DM | Advantageous DEX | DM | Max. Effective Range | TL |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Body Pistol | 250 | 50 | 6 | 100 | 500 | 20 | 8 | −3 | 11 | +1 | Medium | 7 |
| Automatic Pistol | 750 | 250 | 15 | 175 | 200 | 10 | 7 | −2 | 10 | +1 | Long | 5 |
| Revolver | 900 | 100 | 6 | 200 | 150 | 5 | 7 | −2 | 9 | +1 | Long | 4 |
| Carbine | 3000 | 125 | 10 | 750 | 200 | 10 | 5 | −1 | 9 | +1 | Very Long | 5 |
| Rifle | 4000 | 500 | 20 | 1000 | 200 | 20 | 6 | −2 | 8 | +1 | Very Long | 5 |
| Automatic Rifle | 5000 | 500 | 20 | 1000 | 1000 | 20 | 7 | −2 | 10 | +2 | Very Long | 6 |
| Shotgun | 3750 | 750 | 10 | 1000 | 150 | 10 | 4 | −1 | 9 | +1 | Very Long | 4 |
| Submachinegun | 2500 | 500 | 30 | 450 | 500 | 20 | 6 | −2 | 9 | +2 | Long | 5 |
| Laser Carbine | 5000 | — | — | 800 | 2500 | — | 6 | −3 | 10 | +2 | Very Long | 8 |
| LC Power Pack | 3000 | — | 50 | — | 1000 | 200 | — | — | — | — | — | 8 |
| Laser Rifle | 6000 | — | — | 1000 | 3500 | — | 7 | −3 | 11 | +2 | Very Long | 9 |
| LR Power Pack | 4000 | — | 100 | — | 1500 | 300 | — | — | — | — | — | 9 |
| Telescopic Sights | 800 | — | — | — | 200 | — | — | — | — | — | — | 6 |
| Electronic Sights | 1500 | — | — | — | 2000 | — | — | — | — | — | — | 9 |
| Silencer | 600 | — | — | (+) 200 | 200 | — | — | — | — | — | — | 6 |
| Shoulder Stock | 1000 | — | — | (+) 350 | 75 | — | — | — | — | — | — | 5 |
| Folding Stock | 500 | — | — | (−) 300 | 100 | — | — | — | — | — | — | 6 |

\* Gehört zur persönlichen Kleidung und hat kein spürbares Gewicht. (+)/(−): verlängert bzw.
verkürzt die Waffe um so viel.

*SE 23, „Weaponry“:* dieselben Waffen mit TL, kg und Cr, Munition je Magazin („6 rds ammo“ usw.)
und Zubehör; zusätzlich: **Recharge** eines Power Packs LC 200 Cr (TL 8), LR 300 Cr (TL 9), und
**Accessories** kosten 10 % des Waffenpreises. Abweichungen zu S. 4: Club 1 kg ohne Preis, Halberd
75 Cr, Pike 40 Cr; sonst gleich.

### Rüstung

*SE 4, „Body Armor“; SE 23.* App: ✔

| Body Armor | Weight | Price | Beschreibung | TL |
|---|---|---|---|---|
| Nothing | — | — | Gewöhnliche Kleidung | — |
| Jack | 1000* | 50 | Jacke oder Anzug aus Leder oder Kunststoff | 1 |
| Mesh | 2000* | 150 | Anzug aus Leder oder Kunststoff mit Metallgeflecht | 7 |
| Cloth | 2000* | 250 | Ballistisches Tuch (kugelsichere Jacke) | 6 |
| Reflec | 1000* | 1500 | Reflektierender Anzug gegen Laser | 10 |
| Ablat | 2000* | 75 | Ablative (verdampfende) Jacke gegen Laser | 9 |
| Vacc Suit | 10000* | 10000 | Raumanzug mit Funk und Sauerstoff für 6 Stunden; **zählt als Cloth**; braucht Vacc Suit-0; 2 kg leichter je TL über 8 (bei TL 13 ohne Gewicht) | 8 |
| Combat Armor | 6000* | 20000 | Militärische Rüstung aus Metall und Kunststoff; auch als Vakuumanzug nutzbar; braucht Vacc Suit-1 | 11 |
| Battle Dress | 20000* | 200000 | Wie Combat Armor, dazu **doppelte Stärke**, unbegrenzte Ausdauer und **DM +2 auf Überraschung**; braucht Vacc Suit-1 | 13 |

\* Gehört zur persönlichen Kleidung und hat kein spürbares Gewicht.

*B4 43:* Mesh und Cloth sind in der TL-Tabelle (Book 3, S. 10) **vertauscht**; richtig ist Mesh
früher als Cloth. SE 21 und SE 23 nennen trotzdem Cloth TL 6 und Mesh TL 7.

---

## Umstände

### Deckung und Verbergen

*SE 5, „Cover“ und „Concealment“.* App: ○

- **Deckung:** Ein Ziel ist in Deckung hinter einem festen Gegenstand, den ein Schuss nicht
  durchschlägt (Mauer, Fels, schweres Schott).
  - Wer **aus der Deckung angegriffen hat**, bekommt als Verteidiger **DM −4**.
  - Wer in Deckung ist und **nicht angegriffen hat**, ist nicht zu sehen und **kann nicht angegriffen
    werden**.
- **Verbergen:** Ein Ziel ist verborgen, wenn der Angreifer es nicht sehen kann.
  - Ganz verborgen: **kein Angriff**.
  - Teilweise verborgen: durch Mauern, Gegenstände, Wetter oder Dunkelheit; einen DM nennt SE nicht
    (Ermessen der Spielleitung).

### Dunkelheit

*SE 5, „Darkness“.* App: ○

| Licht | Wirkung |
|---|---|
| Völlige Dunkelheit | Kampf nur auf Close und Short; Schusswaffen über Short **DM −9** |
| Teilweise Dunkelheit | Sicht bis Medium; Schusswaffen über Medium **DM −6** |

**Electronic Sights** heben die negativen DMs für Dunkelheit und schlechtes Licht auf.

### Schwerelosigkeit

*SE 5, „Zero Gravity“; B4 16, „Zero-G Combat“; B4 32, „Zero-G Firing“.* App: ○

Jede Waffe mit Rückstoß (alle Schusswaffen außer Laser Carbine und Laser Rifle) kann in
Schwerelosigkeit die Kontrolle kosten.

- **Kontrolle behalten:** jede Kampfrunde **10+**, mit DMs:

| Bedingung | SE 5 | B4 16 |
|---|---|---|
| Schießt mit einer Waffe | −4 | −4 |
| Schießt mit einer Waffe mit wenig Rückstoß (Zero-G-Waffe) | — | −2 |
| Hält sich an einem Griff fest | +5 | +5 |
| Schlägt oder haut (Klinge, Stangenwaffe, Faust) | −6 | −6 |
| DEX 9+ | +2 | +2 |
| DEX 11+ | weitere +2 (zusammen +4) | +4 |
| Je Stufe Zero-G Combat | — | +4 |
| Battle Dress, je Stufe Battle Dress | — | +2 |

- Laser haben **keinen Rückstoß** (B4 16).
- Ein Griff senkt die DEX um 4, für diese DMs und für nötige oder vorteilhafte DEX beim Angriff.
- **Kontrolle verloren:** Man schießt nicht, bis man sich neu ausgerichtet hat; jede folgende Runde
  **10+**, um die Kontrolle zurückzugewinnen, mit denselben DMs, aber ohne Griff und ohne Waffe.
- **Zielen in Schwerelosigkeit (B4 32):** Geschosswaffen verlieren mit der Entfernung weniger. Auf
  Medium, Long und Very Long nimmt man den DM für Short oder Medium, was günstiger ist.

### Traglast und Schwerkraft

*SE 5, „Weight Limitations“ und „Gravitational Effects“.* App: ○

| Last | Erlaubt | Wirkung |
|---|---|---|
| Normal Load | bis STR in kg | keine |
| Double Load | bis 2 × STR in kg | belastet: STR, DEX, END je −1 |
| Triple Load | bis 3 × STR in kg | belastet: STR, DEX, END je −2; nur für Mitglieder einer militärischen Einheit |

Erlaubte Last je Größe der Welt in Prozent der Normallast:

| Größe der Welt | Normal | Double | Triple |
|---|---|---|---|
| 0 | 200,0 % | 400,0 % | 600,0 % |
| 1 | 187,5 % | 375,0 % | 562,5 % |
| 2 | 175,0 % | 350,0 % | 525,0 % |
| 3 | 162,5 % | 325,0 % | 487,5 % |
| 4 | 150,0 % | 300,0 % | 450,0 % |
| 5 | 137,5 % | 275,0 % | 412,5 % |
| 6 | 125,0 % | 250,0 % | 375,0 % |
| 7 | 112,5 % | 225,0 % | 337,5 % |
| 8 | 100,0 % | 200,0 % | 300,0 % |
| 9 | 87,5 % | 175,0 % | 262,5 % |
| A | 75,0 % | 150,0 % | 225,0 % |

### Typische Aktionen

*SE 5, „Typical Actions“.* App: ◐ (Schießen, Schlagen, Hauen, Nachladen, Waffe wechseln, Aussetzen)

Run. Walk. Close Range. Open Range. Stand. Evade. Shoot. Switch (semi or full auto). Reload. Throw.
Draw. Swing. Hit.

---

## Wunden und Heilung

### Wunden und Tod

*SE 7, „Physical Characteristics“, „Wounding and Death“.* App: ✔

- Die **physischen Attribute** sind Strength, Dexterity, Endurance. Wunden senken sie vorübergehend.
- **Jeder Schadenswürfel ist eine Gruppe**, die nicht geteilt wird: Eine 5 auf 1W6 sind 5 Punkte auf
  **ein** Attribut.
- Das **erste** Attribut für eine Wunde wird **zufällig** bestimmt; danach wählt der verwundete
  Spielercharakter.
- **Critical Hits:** Die **erste Wunde** eines Charakters geht **ganz** auf ein zufällig bestimmtes
  physisches Attribut.
- **Minor Wounds:** Bringen die Wunden höchstens **ein** Attribut auf 0, sind es leichte Wunden; die
  gesenkten Werte bleiben bis zur Versorgung oder Erholung.
- **Unconsciousness:** **Ein** Attribut auf 0: **10 Minuten** bewusstlos. Danach stehen die
  verwundeten Attribute in der Mitte zwischen verwundetem und vollem Wert, abgerundet.
- **Serious Wound:** **Zwei** Attribute auf 0: schwere Wunde und **3 Stunden** bewusstlos. Danach
  bleiben die Attribute auf dem verwundeten Wert (mindestens 1), bis zur ärztlichen Versorgung oder
  Erholung.
- **Death:** **Drei** Attribute auf 0: Der Charakter ist tot.

### Medizinische Versorgung

*SE 7, „Medical Care“.* App: ✔ (Behandlung, Ruhe, Aufwachen); Drogen ○

| Wunde | Mit Versorgung | Ohne Versorgung |
|---|---|---|
| Minor | Medical Kit, Medical-1, 30 Minuten | 3 Tage Ruhe |
| Serious | Medizinische Einrichtung (Krankenhaus, Sanitätsstation, Krankenstation eines Schiffs), Medical-3, 5 bis 30 Tage | keine Erholung möglich |

- **Recovery** bringt alle Attribute auf den ursprünglichen Wert.
- **Drugs:** Medizinische Drogen helfen bei der Erholung; **Medical Slow Drug** verkürzt die
  Erholung auf etwa einen Tag.

---

## Book 4: Mercenary

### Moral nach Book 4

*B4 28–31, „Experience and Morale“, „Morale Bonuses“, „Medics“, „Gaining Experience“, „Unit Senior
NCO's“; B4 31, „Morale“.* App: ○

B4 31: Die einfache Moral aus B1 (S. 33, entspricht [SE 5](#moral-einfach)) gilt weiter für **kleine
Zufallsbegegnungen**. Parteien in rein **militärischen** Aufgaben (auch Militäreinheiten, auf die
die SC treffen) nutzen diese Moral.

**Erfahrungspunkte eines Einzelnen (B4 28):**

| Wer | Erfahrungspunkte |
|---|---|
| Rekrut ohne Grundausbildung | 0 |
| Rekrut mit Grundausbildung | 1 |
| Veteran (auch Offizier) | Terms + 1, dazu je Stufe Tactics 1 |
| Söldner aus der Erschaffung nach B4 | je Combat Service Ribbon, Purple Heart, Stufe Tactics und MCUF 1; je MCG 2; je SEH 3 |

**Moralzahl (B4 29):** Erfahrungspunkte + 1W6. Geschrieben als Zahl mit Minus, z. B. „8-“.

**Moralprobe (B4 29, 31):** 2W6 **gleich oder unter** der Moralzahl, sonst Panik.

**Moral eines Teams (B4 29):**
- Erfahrungspunkte je Mitglied wie oben. Die Punkte des **ranghöchsten** Mitglieds sind die
  Obergrenze für alle anderen (Beispiel: Lieutenant mit 5, Gunnery Sergeant mit 10, Lance Corporal
  mit 2; der Sergeant zählt nur 5).
- Ist der Ranghöchste ein NCO, bekommt er zusätzlich 1 je Combat Command (nur ehemalige Offiziere
  aus der Erschaffung nach B4).
- Summe durch Zahl der Mitglieder, abgerundet; dazu 1W6: Das ist die Moralzahl des Teams.

**Moralbonus (B4 29):**
- Kommandeure ab Gruppenführer haben einen Moralbonus gleich ihrer **Leader-Stufe**. Er zählt nicht
  für ihre eigene Moral und nicht für ihr eigenes Team.
- Müssen Einheiten in ihrer Nähe eine Moralprobe machen, kann der Kommandeur den Bonus darauf
  geben.
- Muss der Anführer oder sein Team selbst eine Probe machen, kommt sie zuerst; der Bonus gilt für die
  anderen nur, wenn der Anführer besteht. **Fällt er durch, zählt seine Leader-Stufe als negativer
  DM** für alle Einheiten in der Nähe.

**Wann eine Moralprobe fällig ist (B4 31):**
1. **Unerwarteter Beschuss:** Wird ein Einzelner oder Team unerwartet beschossen (Hinterhalt, von
   jemandem, den man nicht für gefährlich hielt), entscheidet eine Moralprobe, ob er zurückschießt und
   Befehlen folgt. Durchgefallen: Deckung suchen, sich in Deckung zerstreuen, fliehen oder sich
   ergeben, je nach Lage.
2. **Verluste:** Hat eine Einheit von Zuggröße oder kleiner Verluste, machen alle Teile der Einheit in
   der Nähe eine Moralprobe. Durchgefallen: in Deckung gehen, Vormarsch anhalten, Rückzug oder
   Kapitulation. Die Spielleitung gibt DMs nach Schwere (eine leichte Wunde wirkt weniger als ein
   Tod). Der **Tod eines Offiziers oder NCO** gibt einen negativen DM in Höhe seines Moralbonus.
- Ob man sich ergibt, hängt davon ab, wie aussichtslos die Lage scheint, wie knapp die Probe
  verfehlt wurde und ob der Gegner Gefangene nimmt.

**Weitere Einflüsse auf die Moral:**
- *Medics (B4 29–30):* Jeder Zug braucht Medical-Fertigkeitspunkte von mindestens 10 % seiner Stärke;
  ein ausgewiesener Sanitäter zählt seine Stufe doppelt. Jede Kompanie braucht zusätzlich eine
  Verwundetensammelstelle mit mindestens einem Sanitäter mit Medical-2. Fehlt die Versorgung, sinkt
  die Moral nach Ermessen, um **mindestens 1**.
- *Heavy Weapons Teams (B4 30):* Moral aus dem Durchschnitt der Erfahrung der Mitglieder.
- *Gaining Experience (B4 30):* Wer nach einem Auftrag unter Beschuss stand, bekommt **1
  Erfahrungspunkt**.
- *Unit Senior NCO (B4 30):* Arbeitet er eng mit dem Kommandeur (Berührung), zählt dessen Tactics
  als eigene Stufe plus die des NCO (höchstens doppelt), und beide addieren ihre Leader-Stufen zum
  Moralbonus. Getrennt hat jeder seinen eigenen Bonus.

### Feuerregeln aus Book 4

*B4 31–32, „The Traveller Combat System“.* App: ○

- **Full Automatic Fire:** Manche Waffen haben in den [Tabellen](#reichweitenmatrix-book-4) zwei DMs,
  getrennt durch „/“: der erste für **halbautomatisch**, der zweite für **Dauerfeuer**. Jeder
  Feuerstoß gibt zusätzlich zu den besseren DMs **zwei Chancen** auf einen Treffer am gewählten Ziel.
  Gauss-Gewehre mit Stößen von 10 Schuss haben **drei**, ebenso Waffen, die nur Dauerfeuer schießen
  (LMG, Auto-Cannon, VRF Gauss Gun).
- **Group Hits by Automatic Fire:** Nicht ausweichende Ziele neben dem gewählten Ziel werden mit
  **DM −3** ebenfalls angegriffen. Bei einem Stoß von 4 Schuss höchstens **2** Nachbarn, bei 10 Schuss
  oder mehr höchstens **4**.
- **Additional Damage from HE Rounds:** Nach den normalen Treffern (auch Gruppentreffern) kann die
  Explosion Nachbarn des getroffenen Ziels schaden: Treffer würfeln wie normal, aber **halber
  Schaden**.
- **Flechettes:** auf Long, Very Long und extremer Reichweite gilt die Regel **Gruppentreffer durch
  Schrotflinte** (B1 S. 39).
- **High Energy Weapons:** PGMP und FGMP auf Very Long und extremer Reichweite ebenso.
- **Zero-G Firing:** siehe [Schwerelosigkeit](#schwerelosigkeit).
- **Panic Fire:** Bis Medium dürfen Spieler mit Geschosswaffen freiwillig Panikfeuer schießen: alle
  Schuss der Waffe, als stünde sie auf der höchsten Feuerstufe (Stöße von 4 Schuss usw.). Man hat bis
  zu **drei** normale Schüsse (je nach Restmunition), jeden mit **DM −2**. Gewehre gelten dabei als
  Assault Rifles auf Dauerfeuer, Karabiner als Maschinenpistolen.
- **Extreme Range Firing:** Manche Waffen schießen weiter als Very Long (Reichweite bei der Waffe).
  DMs wie Very Long, dazu **−4**. Nur mit Fertigkeit in der Waffe, im Stehen und aufgelegt (Baumstamm,
  Ast, Schießscharte). Fahrzeuge müssen stehen. FGMP und PGMP machen auf extremer Reichweite **ein
  Viertel** Schaden.
- **Hand Grenades:** nur auf Ziele auf **Medium**; eine je Kampfrunde, wer wirft, gilt als
  **ausweichend**. Weder Fertigkeit noch Reichweite zählen; als Ziel-DMs die einer 4 cm RAM HE Grenade
  (B4 32). Splitter nach der HE-Regel oben. Abweichende Angaben auf B4 41 unter
  [Handgranaten](#verschiedene-ausrüstung-book-4).

### Waffen aus Book 4

*B4 36–40 (Beschreibungen), B4 50–52 (Tabellen).* App: ○

#### Beschreibungen und Sonderregeln

Geschosswaffen (Slug Throwers), B4 36–37:

| Waffe | TL | Regeln |
|---|---|---|
| Assault Rifle | 7 | 6 mm; Magazin 30. Dauerfeuer (4 Schuss je Abzug) oder halbautomatisch, umschalten am Ende der Runde. Nachladen dauert eine Runde, dabei gilt man als ausweichend. |
| Advanced Combat Rifle (ACR) | 10 | 9 mm HE oder 9/6 mm Discarding Sabot (DS); Magazin 20; Feuerarten wie Assault Rifle; Nachladen eine Runde, ausweichend. Elektronisches Visier (IR, Restlicht, Laser-Entfernungsmesser), stabilisiert, Adapter für 4 cm RAM-Granaten. Mit gewöhnlicher Munition: Reichweiten-DMs der ACR, Ziel-DMs und Schaden der Assault Rifle. Extreme Reichweite 1000 m. |
| Gauss Rifle | 12 | 4 mm Nadel; Magazin 40; je Abzug 1, 4 oder 10 Schuss, umschalten am Ende der Runde. Visier wie ACR, RAM-Adapter, stabilisiert. Nachladen (Magazin oder RAM-Granate) eine Runde, ausweichend. Extreme Reichweite 1260 m. |
| Snub Pistol | 8 | Revolver für Schiffe und Schwerelosigkeit, 10 mm, 6 Patronen einzeln geladen; Nachladen eine Runde, **zwei**, wenn man ausweicht. Munition: Tranquilizer, Gas, HE, HEAP. Teurere Ausführung als Automatikpistole mit Magazinen bis 20. |
| Accelerator Rifle | 9 | Für Schwerelosigkeit; 6 mm, verlässt den Lauf langsam und beschleunigt dann; Stöße von 3 je Abzug oder Einzelschuss; Magazin 15; Nachladen eine Runde. |

Energiewaffen (High Energy Weapons), B4 37–38:

| Waffe | TL | Regeln |
|---|---|---|
| PGMP-12 | 12 | Plasma; Energiepack auf dem Rücken für 40 Schuss, Aufladen 4 Stunden. Wegen des Rückstoßes nur **jede zweite Runde**. Extreme Reichweite 750 m. |
| PGMP-13 | 13 | Nur mit **Battle Dress**, im Stehen und fest abgestützt; jede Runde. Fusionsreaktor als Energie. Extreme Reichweite 1000 m. |
| PGMP-14 | 14 | Mit Gravitationsfeld, **ohne** Battle Dress nutzbar; sonst wie PGMP-13. Extreme Reichweite 1000 m. |
| FGMP-14 | 14 | Fusion, nur mit Battle Dress; stärker als Plasma. Extreme Reichweite 1500 m. |
| FGMP-15 | 15 | Fusion mit Gravitationsfeld wie PGMP-14; die stärkste tragbare Waffe. Extreme Reichweite 1500 m. |

Unterstützungswaffen (Support Weapons), B4 38–39; sie brauchen **Heavy Weapons**:

| Waffe | TL | Regeln |
|---|---|---|
| Light Assault Gun (LAG) | 8 | 20 mm; Magazin 5; ein Schuss je Abzug; HE, Flechette, 20/9 DS. Mit STR unter 9 (ohne Battle Dress) **DM −2**. Nachladen eine Runde, ausweichend. |
| Light Machine Gun (LMG) | 6 | Gurte zu 100. Je Abzug ein **Stoß von 10**, bis zu **5 Stöße je Runde**, jeder auf ein anderes Ziel innerhalb von 45°. Ab dem dritten Stoß in einer Runde **Ladehemmung**: 2W6 13+, DM +1 je weiterem Stoß; die DMs addieren sich über Runden (4 Stöße: DM +2, nächste Runde wieder 4: DM +4) und sinken um 1 je Runde ohne Feuer. Hemmung beheben: 10+, DM +1 je Stufe Heavy Weapons, einmal je Runde. Nachladen 3 Runden allein, 1 mit Ladeschützen. Zweibein; mit Dreibein extreme Reichweite 1000 m und 90°. *TL 5:* wassergekühlte Vorform, 6000 g, nur mit Dreibein, höchstens 4 Stöße, Hemmung schon ab dem zweiten Stoß. |
| Auto-Cannon | 8 | 20 mm (frühere Formen 20–60 mm ab TL 6); Trommeln zu 200, zwei angebaut; HE oder 20/9 DS, jeder zehnte HE-Schuss Brandmunition. Stöße von 10, bis zu 5 je Runde auf Ziele im Schusswinkel (Turm 180°, sonst 90°). Trommel wechseln 4 Runden, 1 mit Ladeschützen. Extreme Reichweite 2000 m (Pintle 1000 m). |
| VRF Gauss Gun | 10 | 4 mm; Stöße von 100, bis zu 10 je Runde auf eigene Ziele im Schusswinkel; nur im Turm. Ab dem fünften Stoß Störung: 2W6 12+ leicht, 15+ schwer; DM +1 je weiterem Stoß, −1 je Stufe Heavy Weapons. Leicht: 1 bis 12 Runden kein Feuer (2W6 minus Fertigkeit des Schützen). Schwer: kein Feuer bis zur Wartung. Magazin 1000 Schuss. |

Granatwerfer (Grenade Launchers), B4 40:

| Waffe | TL | Regeln |
|---|---|---|
| Early Grenade Launcher | 7 | 40 mm, nur HE; ein Schuss; Ziel-DMs der RAM-Granate **halbautomatisch**, aber nur **6D** Schaden; höchstens 500 m, keine extreme Reichweite. Nachladen eine Runde, ausweichend. |
| Auto-Grenade Launcher | 7 | 40 mm; Stöße von 4, bis zu 6 je Runde, jeder auf ein eigenes Ziel im Schusswinkel (Pintle 90°, Turm 180°); nur HE, DMs der RAM-Granate **Dauerfeuer**, 6D; nicht über 500 m. Trommel wechseln 3 Runden allein, 1 mit Ladeschützen. |
| RAM Grenade Launcher | 8 | 40 mm mit Raketenantrieb; Magazin 3; HE, Flechette, HEAP (HEAP mit Folgeladungen gegen Panzer); DMs **halbautomatisch**; Visier mit IR und Laser. Nachladen eine Runde, ausweichend. Extreme Reichweite 1000 m. |
| RAM Grenade Auto-Launcher | 8 | Wie Auto-Grenade Launcher mit RAM-Granaten; zwei Zuführungen mit verschiedener Munition, je Stoß wählbar. Extreme Reichweite 1000 m. |

#### Reichweitenmatrix (Book 4)

*B4 50, „Range Matrix“.* „x/y“: halbautomatisch / Dauerfeuer.

| Weapon | Close | Short | Medium | Long | Very Long | Wound |
|---|---|---|---|---|---|---|
| Assault Rifle | −4/−4 | +1/+1 | −1/+2 | −2/0 | −4/−3 | 3D |
| LAG Discarding Sabot | −8 | 0 | +2 | +1 | −2 | 4D |
| LAG High Explosive | −4¹ | +1¹ | +1 | 0 | −1 | 4D |
| LAG Flechette | −4¹ | +1¹ | +3 | +2 | −1 | 2D |
| ACR Discarding Sabot | −4/−4 | +1/+1 | 0/+2 | −1/+1 | −2/0 | 3D |
| ACR High Explosive | −4² | +1² | −1/+1 | −2/0 | −4/−2 | 4D |
| Gauss Rifle | −4/−4 | +1/+1 | +2/+4 | +3/+5 | 0/+1 | 4D |
| Accelerator Rifle | −8/−8 | −6/−6 | +2/+4 | +1/+2 | no | 3D |
| Snub Pistol High Explosive | no | +2 | −8 | no | no | 4D |
| Snub Pistol HEAP | +1 | +2 | −8 | no | no | 4D |
| Snub Pistol Tranq | +1 | +2 | −8 | no | no | variable |
| 4 cm RAM Grenade High Explosive | no | no | +3/+6 | +2/+6 | −4/+1 | 8D |
| 4 cm RAM Grenade Flechette | no | no | +3/+6 | +2/+5 | −4/0 | 3D |
| 4 cm RAM Grenade HEAP | no | no | +2/+4 | 0/+2 | −6/−4 | 8D |
| LMG | no | −6 | +4 | +2 | 0 | 3D |
| Auto-Cannon Discarding Sabot | no | no | +6 | +4 | +2 | 6D |
| Auto-Cannon High Explosive | no | no | +6 | +4 | +2 | 8D |
| PGMP-12 | no | no | +2 | +1 | 0 | 10D³ |
| PGMP-13 and 14 | no | no | +3 | +3 | +2 | 12D³ |
| FGMP-14 and 15 | no | no | +4 | +3 | +3 | 16D³ |
| VRF Gauss Gun | no | no | +8 | +5 | +2 | 10D⁴ |

1. HE- und Flechette-Schüsse der LAG auf Close und Short zählen für Rüstung und Treffer wie Schüsse
   eines Rifle.
2. HE-Schüsse der ACR auf Close und Short zählen für Rüstung und Wunden wie Schüsse eines Carbine.
3. Schaden auf Very Long halbiert, auf extremer Reichweite geviertelt.
4. Schaden auf extremer Reichweite halbiert.

#### Waffenmatrix (Book 4)

*B4 51, „Weapons Matrix“.* DM gegen die Rüstung des Verteidigers; „x/y“: halbautomatisch /
Dauerfeuer. Die letzte Spalte heißt hier **Battle** (statt Combat in SE).

| Weapon | Nothing | Jack | Mesh | Cloth | Reflec | Ablat | Battle |
|---|---|---|---|---|---|---|---|
| Assault Rifle | +2/+4 | +2/+4 | −1/+2 | −3/−1 | +2/+4 | 0/+2 | −5/−4 |
| LAG Discarding Sabot | +3 | +3 | +2 | +1 | +3 | +3 | 0 |
| LAG High Explosive | +3 | +3 | 0 | −2 | +3 | +1 | −4 |
| LAG Flechette | +5 | +5 | 0 | −3 | +5 | +2 | −5 |
| ACR Discarding Sabot | +3/+5 | +3/+5 | 0/+3 | −2/0 | +3/+5 | +1/+5 | −3/−1 |
| ACR High Explosive | +2/+4 | +2/+4 | 0/+2 | −3/−1 | +2/+4 | +2/+4 | −4/−3 |
| Gauss Rifle | +4/+7 | +4/+7 | +2/+5 | +1/+3 | +4/+7 | +4/+7 | −2/0 |
| Accelerator Rifle | +3/+4 | +3/+4 | 0/+1 | −2/−1 | +3/+4 | +1/+2 | −5/−4 |
| Snub Pistol High Explosive | +2 | +2 | −1 | −3 | +2 | 0 | −8 |
| Snub Pistol HEAP | +2 | +2 | +1 | −1 | +3 | +2 | −3 |
| Snub Pistol Tranq | −1 | −1 | −4 | −6 | −1 | −4 | no |
| 4 cm RAM Grenade HE | +4/+6 | +4/+6 | +2/+4 | +1/+3 | +4/+6 | +4/+6 | −2/0 |
| 4 cm RAM Grenade Flechette | +7/+9 | +7/+9 | +3/+5 | −2/0 | +7/+9 | +3/+5 | −6/−4 |
| 4 cm RAM Grenade HEAP | +2/+4 | +2/+4 | +2/+4 | +2/+4 | +2/+4 | +2/+4 | 0/+2 |
| LMG | +6 | +6 | +2 | −1 | +6 | +3 | −3 |
| Auto-Cannon Discarding Sabot | +6 | +6 | +6 | +6 | +6 | +6 | +4 |
| Auto-Cannon High Explosive | +6 | +6 | +6 | +6 | +6 | +6 | +2 |
| PGMP-12 | +2 | +2 | +2 | +1 | +2 | +2 | 0 |
| PGMP-13¹ and 14 | +4 | +4 | +4 | +4 | +4 | +4 | +1 |
| FGMP-14¹ and 15 | +4 | +4 | +4 | +4 | +4 | +4 | +3 |
| VRF Gauss Gun | +7 | +7 | +7 | +7 | +7 | +7 | +5 |

1. Um PGMP-13 und FGMP-14 abzufeuern, braucht man Battle Dress.

#### Geschicklichkeit (Book 4)

*B4 51, „Dexterity Requirements“.*

| Weapon | Required DEX | DM | Advantageous DEX | DM |
|---|---|---|---|---|
| Hand Grenade | 7 | −2 | 11 | +1 |
| Assault Rifle | 5 | −1 | 8 | +2 |
| Light Assault Gun | 7 | −2 | 10 | +2 |
| ACR | 6 | −2 | 8 | +2 |
| Gauss Rifle | 7 | −2 | 10 | +2 |
| Accelerator Rifle | 6 | −1 | 9 | +1 |
| Snub Pistol | 7 | −2 | 10 | +1 |
| Grenade Launcher | 8 | −3 | 11 | +1 |
| LMG | 7 | −2 | 10 | +2 |
| Auto-Cannon | 7 | −2 | 10 | +2 |
| PGMP-12 and 14 | 8 | −2 | 11 | +1 |
| PGMP-13 | 7 | −1 | 10 | +1 |
| FGMP-14 | 7 | −1 | 10 | +1 |
| FGMP-15 | 8 | −2 | 11 | +1 |

#### Gewichte und Preise (Book 4)

*B4 52, „Weapons and Equipment – Weights and Prices“.* Gewicht in g (k = 1000 g), Länge in mm,
Preise in Cr. Bei Plasma- und Fusionswaffen: Gewicht nach dem Schrägstrich mit eingeschaltetem
Gravitationsfeld; Munitionspreis ist das Energiepack, nach dem Schrägstrich das Aufladen.

| Item | Base Weight | Ammo Weight | Rds/Clip | Length | Base Price | Ammo Price | TL |
|---|---|---|---|---|---|---|---|
| Assault Rifle | 3000 | 330 | 30 | 850 | 300 | 20 | 7 |
| ACR | 3500 | 500 | 20 | 750 | 1000 | 15 | 10 |
| Gauss Rifle | 3500 | 400 | 40 | 750 | 1500 | 30 | 12 |
| Snub Pistol | 250 | 30 | 6 | 100 | 150 | 10 | 8 |
| Accelerator Rifle | 2500 | 500 | 15 | 800 | 900 | 25 | 9 |
| PGMP-12 | 6000 | 3000 | 40 | 800 | 10000 | 2500/50 | 12 |
| PGMP-13 | 900 | 7000 | — | 900 | 65000 | 50000/20 | 13 |
| PGMP-14 | 9000/50 | 1600/90 | — | 800 | 300000 | 250000/50 | 14 |
| FGMP-14 | 1000 | 9000 | — | 900 | 100000 | 65000/50 | 14 |
| FGMP-15 | 1000/50 | 2000/110 | — | 800 | 400000 | 300000/70 | 15 |
| LAG | 4000 | 500 | 5 | 900 | 600 | 20 | 8 |
| Lt Machinegun | 5500 | 2500 | 100 | 1100 | 1200 | 120 | 6 |
| Auto-Cannon | 300k | 100k | 200 | 1500 | 10000 | 1000 | 8 |
| VRF Gauss Gun | 2000k | 10k | 1000 | 1500 | 200000 | 200 | 10 |
| GL | 3000 | 200 | 1 | 750 | 200 | 5 | 7 |
| Auto-GL | 6000 | 200 | 16 | 900 | 1400 | 85 | 7 |
| RAM GL | 4000 | 1400 | 3 | 900 | 400 | 50 | 8 |
| RAM Auto-GL | 6500 | 9000 | 20 | 900 | 2200 | 350 | 8 |

Abweichende Einzelangaben im Text (B4 36–40): Auto-Cannon 400 kg im Turm, 300 kg gezogen, 1000 kg auf
Pintle; Turm 12000 Cr, gezogen 10000, Pintle 7500, Trommel zu 200 1000 Cr; Snub Pistol als
Automatik 150 Cr, Magazin zu 20 Cr 40; LMG Dreibein 3500 g, 250 Cr, Gurt 120 Cr.

| Body Armor (B4 52) | Price | TL |
|---|---|---|
| Flak Jacket | 100 | 7 |
| Combat Environment Suit | 1000 | 10 |
| Combat Armor | 20000 | 11 |

#### Verschiedene Ausrüstung (Book 4)

*B4 41–43, „Miscellaneous Equipment“.*

- **Hand Grenades** (TL 5+): nur auf Ziele auf Medium; eine je Runde, wer wirft, gilt als
  ausweichend; wer **nicht ausweicht**, bekommt **DM +1**. Keine Waffenfertigkeit nötig, aber DEX
  nach der [Tabelle](#geschicklichkeit-book-4). Grundwurf **7+**, keine Reichweiten-DMs, als Ziel-DMs
  die der **LAG Flechette** (B4 41; auf B4 32 heißt es: die der 4 cm RAM HE Grenade). Dazu nach TL:
  TL 5–6 DM −2 (4D Schaden), TL 7–8 DM −1 (6D), TL 9+ DM 0 (8D). Splitter nach der HE-Regel. 1 kg,
  20 Stück 200 Cr. Daneben Rauchgranaten in Farben und Spezialgranaten (Gas, Panzerabwehr) nach
  Ermessen.
- **Flak Jacket** (TL 7, 100 Cr): militärische Form von Cloth, bedeckt Rumpf und Leiste. Zählt als
  **Cloth +1**, außer wenn das sie schlechter als Mesh machen würde; dann zählt sie als Cloth ohne
  Zuschlag.
- **Combat Environment Suit** (TL 10, 1000 Cr): ballistisches Tuch, abdichtbar gegen Chemie,
  Atmosphäre, Biologie, etwas Strahlung; verbirgt die Wärmesignatur bis auf 45 Minuten bis 2 Stunden.
  Zählt als **Cloth −1**. Ab TL 12 als Chameleon-Ausführung für 1500 Cr, für IR-Sensoren unsichtbar.
- **Combat Armor** (TL 11, 20000 Cr): zählt beim Beschuss als **Battle Dress** (Spalte „Battle“);
  ohne Antrieb, darum keine PGMP-13 und FGMP-14. Ab TL 12 als Chameleon für 25000 Cr.
- **Anti-Laser Aerosols** (ab TL 8, 1 kg, 10 Cr): Schutz für ein Team oder Fahrzeug gegen Laser für
  **8 Kampfrunden** gegen Feuer, Zielmarkierung und Entfernungsmessung. Ab TL 9 durchdringen
  Mehrfrequenzlaser Aerosol und Rauch weitgehend: Laser machen **halben Schaden**, konventionelle
  Waffen mit Entfernungsmesser oder Zielmarkierung **DM −2**. Ab TL 10 prismatische Aerosole: voller
  Schutz vor allen Lasern für **4 Kampfrunden**. Schutz nur für eine Runde, wenn das Ziel sich bewegt;
  Wind schwächt.
- Weitere Ausrüstung ohne Kampfregeln (Preise und TL in B4 41–42): Radio Jammers (TL 6+), Tac
  Missiles (200 Cr je Rakete, Werfer 1000; bis TL 12 steigend auf 1000 bzw. 10000), Recon Drones (TL 9+, 2 MCr), Computer
  Fire Control System (TL 8+), Light Air Defense Missiles (TL 8+), Map Box (TL 9, 2500 Cr), Battle
  Computer (TL 9+, 100000 Cr), Nuclear Dampers (TL 13+).

**Preise und TL (B4 43):** Preiskorrekturen für Fahrzeuge in Book 3 (eine Stelle weniger: Ground Car,
Hovercraft, Primitive Biplane, Helicopter, Air/Raft, Grav Belts; zwei Stellen weniger: ATV, AFV).
Preise sinken um 5–15 % je TL nach der Einführung. Mengenrabatt für Militärgüter auf Welten mit
Bevölkerung 9+: Handwaffen 20/100/1000 Stück 20/40/60 %, Fahrzeuge 10/50/100, Munition
500/1000/10000.

#### Standardbewaffnung nach TL

*B4 43–44, „Part II: Overview of Equipment“.* Zum Ausstatten militärischer NSC; die Fahrzeuge und
Artillerie je TL beschreibt B4 44–47 als Fließtext.

| TL | Infanterie: Handwaffen und Ausrüstung | Unterstützungswaffen |
|---|---|---|
| 5 | Repetiergewehr (Rifle aus B1), langsamer; Gasmasken, Stahlhelme; Stahl-Körperpanzer zu schwer; Handgranaten | Maschinengewehr, Mörser (HE, Rauch) |
| 6 | Halbautomatisches Gewehr; Carbine und SMG verbreitet; Gewehrgranaten | LMG, Automatic Rifle; leichtere Mörser mit Chemie; Panzerabwehr-Granatwerfer und Raketenwerfer (HEAP) |
| 7 | **Assault Rifle**; Ballistic Cloth Flak Jackets (teuer); Gewehrgranate durch Unterstützungswaffen ersetzt | erste taktische Raketen (2–3 km, HEAP); Early Grenade Launcher |
| 8 | Assault Rifle bleibt (im Text „assault gun“), dazu **Laser Carbine** (Zielmarkierer, Entfernungsmesser); Flak Jacket überall | RAM-Granate ersetzt Early GL; Mörser mit Bomblets |
| 9 | **Laser Rifle**; Laser mehrfrequent gegen Rauch und Aerosol; Ablat für Infanterie (teuer); Helmfunk, Restlicht, passives IR | Tac Missiles 4 km mit IR-Folgesensor; RAM mit Folgesensor |
| 10 | **ACR** mit 4 cm RAM; Combat Environment Suit; Helme mit Funk und IR/Restlicht | Tac Missiles 5 km, HE/Flechette/Chemie; Mörser mit kleinen Atomgranaten (selten) |
| 11 | **Combat Armor** (druckfest) | Tac Missiles 6 km mit Atomsprengkopf; LMG fast verschwunden; Wegwerf-Raketenwerfer (MRL) |
| 12 | **Gauss Rifle** als Scharfschützenwaffe; Grav Belt für Späher | **PGMP-12** ersetzt den Granatwerfer |
| 13 | Infanterie in Combat Armor mit Gauss Rifles; Battle Dress für Sturmtruppen | **PGMP-13** für Battle Dress; Wegwerfrakete mit Fernsehlenkung |
| 14 | mehr Battle Dress mit PGMP-13 | PGMP-14 statt PGMP-12; Battle Dress mit FGMP-14 |
| 15 | meist Battle Dress mit **FGMP-14**; Gauss Rifle für Truppen ohne Antrieb | FGMP-15 |

### Fertigkeiten aus Book 4 im Kampf

*B4 10–16, „Skills“; B4 26, „Training the Recruit“.* App: ○ (die App hat die Fertigkeiten aus SE)

- **Gun Combat** (B4 12–13) gilt je Kategorie; die erste muss **Combat Rifleman** sein:

| Kategorie | Gilt für |
|---|---|
| Combat Rifleman | Rifle, Carbine, Assault Rifle, ACR, Gauss Rifle |
| Pistol | Revolver, Automatic Pistol |
| Submachinegun | Submachinegun |
| Laser Weapons | Laser Carbine, Laser Rifle |
| Zero-G Weapons | Accelerator Rifle, Snub Pistol; nur mit Zero-G Combat |
| High Energy Weapons | alle PGMP und FGMP; PGMP-13 und FGMP-14 nur mit Battle Dress |
| Auto Weapons | Automatic Rifle, LMG, schweres MG |

- **Heavy Weapons** (B4 13): für ein bestimmtes Unterstützungssystem; Kavallerie wählt eine
  Fahrzeugwaffe. Indirektes Feuer wie FA Gunnery. Direktes Feuer braucht einen Schützen mit
  Fertigkeit.
- **FA Gunnery** (B4 11–12): für ein Artilleriesystem. Zwei Stufen geben Stufe 1 für alle Systeme
  einen TL früher, drei Stufen Stufe 2 dort und Stufe 1 zwei TL früher usw. Effizienz der Mannschaft =
  Summe der Fertigkeiten durch Zahl der Leute. Beim Korrigieren: unter 1 −2, je Stufe über 1 +3
  (Korrektur nach Forward Observer in B1).
- **Battle Dress** (B4 10): zählt wie Vacc Suit. Wer PGMP-13 oder FGMP-14 **ohne** Battle Dress-Fertigkeit
  abfeuert, hat bei **7+** (DM −2 je Stufe Vacc Suit über 1) einen Unfall, 1W6: 1–2 umgeworfen und eine
  Runde betäubt; 3–4 rechte Schulter verletzt, **DEX −1W6**, bis zur Behandlung unbrauchbar; 5–6
  bewusstlos mit inneren Verletzungen, **DEX −2W6**, braucht bald ärztliche Hilfe.
- **Demolitions** (B4 11): Ungeübte haben bei Sprengstoffen bei **10+** einen Unfall, DM −2 je Stufe,
  weitere DMs für Erschütterung, Hitze, Funk, Hast; Unfälle sind meist tödlich.
- **Combat Engineering** (B4 11): Feldbefestigungen, Minen, Sensoren; senkt die Entdeckung eigener
  und gibt DMs, fremde zu entdecken (Ermessen).
- **Recon** (B4 15): Die Spielleitung legt fest, welchen Wurf jede Seite zum Entdecken braucht; Recon
  senkt die eigene Entdeckung und erhöht die Chance, den Feind vorher zu sehen.
- **Zero-G Combat** (B4 16): siehe [Schwerelosigkeit](#schwerelosigkeit).
- **Vehicle** (B4 15): Wheeled, Tracked oder Grav; Unfälle wie Air/Raft in B1, im Kampf auch
  Kettenriss, Achsbruch, Zusammenstoß.
- **Grundausbildung** (B4 26): Rekruten danach mit 1 Erfahrungspunkt und Handwaffen-Vertrautheit;
  die zählt nicht als Fertigkeit, vermeidet aber den negativen DM für fehlendes Gun Combat.

### Abstraktes Schlachtsystem

*B4 32–35, „The Abstract System“.* App: ○. Für Söldnereinsätze mit vielen Truppen, in denen die SC
nicht im Mittelpunkt stehen. Zwei Teile: Vorbereitung und Auflösung.

**Vorbereitung (B4 34):**
1. *Mission:* einmal auf die Mission Table für die Einheit der Spieler. Gegner: 1W6, 1–3 einheimische
   Militäreinheit, 4–6 eine andere Söldnereinheit; dann deren Mission würfeln.
2. *Tech Level:* 1W6 je Seite; Söldner (außer Cadre) +6, Cadre +5, Einheimische +4.
3. *Größe:* 1W6 auf die Unit Size Table; Commando −1, Striker +1, Cadre +2, Einheimische +4. Die Zahl
   in Klammern ist die Kampfstärke. Ein Squad kann nicht als ganze Einheit antreten. **Erhaltungsgrenze**
   = 40 % der Stärke: So viele Verluste, dann ergibt sich die Einheit oder zieht ab (Bataillon 452 →
   181).
4. *Efficiency:* 1W6 + 2 für Söldner außer Cadre, +1 für Cadre, unverändert für Einheimische.

| Mission Table (1W6) | |
|---|---|
| 1 | Commando |
| 2 | Cadre |
| 3 | Striker |
| 4–6 | Security |

| Unit Size Table | Einheit | Stärke |
|---|---|---|
| — | Fire team | 4 |
| — | Squad | 9 |
| 0 | Section | 19 |
| 1–2 | Platoon | 41 |
| 3–5 | Company | 127 |
| 6–7 | Battalion | 452 |
| 8 | Reinforced Bn | 635 |
| 9 | Brigade | 1500 |

**Auflösung (B4 34–35):** eine Reihe von Gefechten, bis eine Seite die Erhaltungsgrenze erreicht.
1. *Element Engaged:* 1W6 je Seite; Commando oder Security +2, Einheimische −2.

| Element Engaged | |
|---|---|
| 1–2 | down 3 |
| 3–4 | down 2 |
| 5–6 | down 1 |
| 7+ | full |

   „down N“: so viele Größenstufen kleiner tritt an (Bataillon „down 2“ schickt einen Zug, Zug „down 3“
   einen Einzelnen).
2. *Encounter Type:* 1W6; eigenes Element kleiner +1, feindliches kleiner −1; eigene Efficiency höher:
   + Differenz, feindliche höher: − Differenz; selbst Security +1, Feind Security −1, selbst Striker −1,
   Feind Striker +1.

| Encounter Type | |
|---|---|
| −3 | Own Surprised |
| −2 bis 1 | Own Attacking |
| 2–5 | Firefight |
| 6–9 | Enemy Attacking |
| 10 | Enemy Surprised |

3. *Combat Resolution:* Bei Firefight und Angriff würfelt jede Seite einmal 1W6 auf die Fire Results
   Table; wer überrascht ist, schießt nicht. DMs: aus der Firing Matrix (schießende Einheit links,
   Ziel oben), **−2** für den Angreifer, und die **TL-Differenz** (TL 7 auf TL 6: +1, umgekehrt −1).
   Verluste in Prozent des eingesetzten Elements; Bruchteile ab ,5 aufrunden, sonst abrunden
   (Section 19 Mann, 10 % = 1,9 → 2).

| Firing Matrix | Indiv | Fire Team | Sqd | Sect | Plt | Co | Bn | Rein. Bn | Bde |
|---|---|---|---|---|---|---|---|---|---|
| **Indiv** | E | −1 | −2 | −4 | −6 | −7 | −7 | −7 | −8 |
| **Fire Tm** | +4 | E | −1 | −2 | −4 | −5 | −6 | −7 | −8 |
| **Sqd** | +5 | +1 | E | −1 | −2 | −4 | −5 | −6 | −7 |
| **Sect** | +6 | +2 | +1 | E | −1 | −2 | −4 | −5 | −6 |
| **Plt** | +7 | +3 | +2 | +1 | E | −1 | −2 | −4 | −6 |
| **Co** | +8 | +5 | +4 | +2 | +2 | E | −1 | −2 | −4 |
| **Bn** | +9 | +8 | +6 | +4 | +3 | +2 | E | −1 | −2 |
| **Rein. Bn** | +10 | +10 | +8 | +6 | +5 | +3 | +1 | E | −1 |
| **Bde** | +11 | +11 | +10 | +8 | +7 | +5 | +3 | +2 | E |

E = gleich groß, kein DM.

| Fire Results (1W6 + DMs) | Verluste |
|---|---|
| −2 | keine |
| −1 | 1 % |
| 0 | 1 % |
| 1 | 5 % |
| 2 | 5 % |
| 3 | 10 % |
| 4 | 10 % |
| 5 | 20 % |
| 6 | 20 % |
| 7 | 30 % |
| 8 | 40 % |
| 9+ | 50 % |

4. *Personal Casualties:* Hat die Einheit eines SC **5 %** Verluste oder mehr, würfelt er 2W6
   gegen die Tabelle. Weniger als die Zahl: **genau eins darunter getötet**, noch weniger
   **verwundet**.

| Verluste | Wurf, um unverletzt zu bleiben |
|---|---|
| 5 % | 3+ |
| 10 % | 4+ |
| 20 % | 5+ |
| 30 % | 6+ |
| 40 % | 7+ |
| 50 % | 8+ |

**Free-Form System (B4 35):** größere Kämpfe mit SC im freien Spiel; keine festen Regeln.

### Feldartillerie

*B4 48–49, „Field Artillery“.* App: ○

- **Tabelle:** TL der Einführung bis zum Ende der allgemeinen Nutzung; Crew; Preis in KCr / Preis je
  Schuss in Cr; Gewicht in kg / je Schuss in kg; Reichweite in km; ROF (Schuss je Kampfrunde für eine
  geübte Crew); Burst (Radius in m).
- **Mörser:** Grundchance **7+** auf jede Person im Explosionsradius, mit den Ziel-DMs der **4 cm RAM
  HE**-Granate, **6D** Schaden. ROF gilt die ersten drei Minuten, danach je Minute. Je TL nach der
  Einführung: leichte und mittlere Mörser Radius +1, schwere und sehr schwere +2; Reichweite +10 %.
- **Haubitzen:** wie Mörser, gleiche ROF-Grenzen bis zum Autolader. Auch als Flachfeuerkanone:
  anderthalbfache Reichweite, doppeltes Gewicht und Preis, Schuss 50 % teurer.
- **Mass Driver Guns:** ohne ROF-Grenze; treffen wie Mörser; je TL Radius +2, Reichweite +10 %.
- **High Energy Weapons (A, B, C, X, Y, Z):** bei Einführung etwa 4000 kg, einen TL später 2000 kg,
  dann 500 kg und ROF 5. Treffen bei **8+**. Im Radius Ziel-DMs der **PGMP-12**, Treffer **10D**; im
  halben Radius Ziel-DMs der **FGMP-14 und 15**, Treffer **20D**.
- **Meson Accelerator:** Alles im Radius wird zerstört.
- **MRL:** wie Mörser und Haubitzen; ROF ist die Zahl der Rohre, alle in einer Runde abfeuerbar.
- **Cluster Bomblets:** Mörser, MD Guns und MRL ab dem passenden TL: doppelter Radius, Ziel-DMs der
  4 cm RAM Flechette.

| System | TL | Crew | Price | Weight | Range | ROF | Burst |
|---|---|---|---|---|---|---|---|
| Lt Mortar | 6–10 | 3 | .3/20 | 20/4 | 1.5 | 5 | 3 |
| Md Mortar | 5–10 | 6 | 7.5/35 | 40/6 | 2.5 | 4 | 5 |
| Hvy Mortar | 5–10 | 9 | 15/50 | 300/15 | 4.5 | 3 | 10 |
| Very Hvy Mortar | 5–10 | 12 | 40/100 | 3500/100 | 6 | 1 | 20 |
| Lt Howitzer | 5–9 | 6 | 5/50 | 1000/6 | 7 | 4 | 2 |
| Field Howitzer | 5–9 | 8 | 10/75 | 1800/15 | 11 | 3 | 4 |
| Med Howitzer | 5–9 | 10 | 20/100 | 4000/40 | 11.5 | 2 | 9 |
| Hvy Howitzer | 5–8 | 12 | 40/200 | 18000/100 | 12 | 1 | 18 |
| Lt Mass Driver | 11 | 8 | 500/35 | 18000/15 | 20 | 10 | 25 |
| Med Mass Driver | 10–11 | 10 | 1500/50 | 30000/40 | 22 | 10 | 30 |
| Hvy Mass Driver | 9–11 | 12 | 4000/150 | 70000/150 | 24 | 10 | 35 |
| A Gun | 10–15 | 5/3/1 | 1000 | 4000 | 5 | 2 | 5 |
| B Gun | 11–15 | 5/3/1 | 1500 | 4000 | 8 | 2 | 8 |
| C Gun | 12–15 | 5/3/1 | 2000 | 4000 | 12 | 2 | 10 |
| X Gun | 12–15 | 5/3/1 | 3000 | 4000 | 18 | 2 | 12 |
| Y Gun | 13–15 | 5/3/1 | 5000 | 4000 | 21 | 2 | 15 |
| Z Gun | 14–15 | 5/3/1 | 10000 | 4000 | 31 | 2 | 21 |
| Meson Acc. | 15 | 12 | 30000 | 60000 | 50 | 2 | 50 |
| Lt MRL | 11–15 | 1 | .5/30 | 60/5 | 10 | 100 | 3 |
| MRL | 6–11 | 10 | 5/50 | 1800/50 | 12 | 40 | 10 |
| Remote MRL | 10–11 | 3 | 5/60 | 1000/20 | 20 | 100 | 20 |

---

## Tierbegegnungen

*SE 18–19, „Animal Encounters“.* App: ○. Die Tierwaffen stehen schon in der
[Waffenmatrix](#waffen--und-reichweitenmatrix).

### Gelände

*SE 18, „Terrain Types“.* DM auf die Tierart und auf die Größe.

| Terrain | Equivalent | Type DM | Size DM |
|---|---|---|---|
| Clear | Road, Open | +3 | — |
| Prairie | Plain, Steppe | +4 | — |
| Rough | Hills, Foothills | — | — |
| Broken | Badlands | −3 | −3 |
| Mountain | Alpine | — | — |
| Forest | Woods | −4 | −4 |
| Jungle | Rainforest | −3 | −2 |
| River | Stream, Creek | +1 | +1 |
| Swamp | Bog | −2 | +4 |
| Marsh | Wetland | — | −1 |
| Desert | Dunes | +3 | −3 |
| Beach | Shore, Sea Edge | +3 | +2 |
| Surface | Ocean, Sea | +2 | +3 |
| Shallows | Ocean, Sea | +2 | +2 |
| Depths | Ocean, Sea | +2 | +4 |
| Bottom | Ocean, Sea | −4 | — |
| Sea Cave | Sea Cavern | −2 | — |
| Sargasso | Seaweed | −4 | −2 |
| Ruins | Old City | −3 | — |
| Cave | Cavern | −4 | +1 |
| Chasm | Crevasse, Abyss | −1 | −3 |
| Crater | Hollow | — | −1 |

### Spalten der Begegnungstabelle

*SE 18, „Encounter Columns“.* Zwei Vorschläge; andere Aufteilungen sind erlaubt. Je Gelände jeder
Welt eine Tabelle anlegen.

| 2W6 | Kategorie | | 1W6 | Kategorie |
|---|---|---|---|---|
| 2 | S Scavenger | | 1 | S Scavenger |
| 3 | O Omnivore | | 2 | H Herbivore |
| 4 | S Scavenger | | 3 | H Herbivore |
| 5 | O Omnivore | | 4 | H Herbivore |
| 6 | H Herbivore | | 5 | O Omnivore |
| 7 | H Herbivore | | 6 | C Carnivore |
| 8 | H Herbivore | | | |
| 9 | C Carnivore | | | |
| 10 | E Event | | | |
| 11 | C Carnivore | | | |
| 12 | C Carnivore | | | |

### Tierarten

*SE 18, „Animal Types“.* 2W6 plus Type DM des Geländes, je Kategorie; in Klammern die Anzahl.

| Wurf | Herbivore | Omnivore | Carnivore | Scavenger |
|---|---|---|---|---|
| 0 | Filter (1D) | Gatherer | Siren | Carrion-eater (1D) |
| 1 | Filter | Gatherer | Pouncer | Carrion-eater (2D) |
| 2 | Filter | Eater | Siren | Reducer (1D) |
| 3 | Intermittent | Gatherer | Pouncer | Hijacker (1D) |
| 4 | Intermittent | Eater (2D) | Killer (1D) | Carrion-eater (2D) |
| 5 | Intermittent (1D) | Gatherer | Trapper | Intimidator (1D) |
| 6 | Intermittent | Hunter | Pouncer | Reducer |
| 7 | Grazer | Hunter (1D) | Chaser | Carrion-eater (1D) |
| 8 | Grazer (1D) | Hunter | Chaser (3D) | Reducer (3D) |
| 9 | Grazer (2D) | Gatherer | Chaser | Hijacker |
| 10 | Grazer (3D) | Eater (1D) | Killer | Intimidator (2D) |
| 11 | Grazer (2D) | Hunter (1D) | Chaser (2D) | Reducer (1D) |
| 12 | Grazer (4D) | Gatherer | Siren | Hijacker |
| 13 | Grazer (5D) | Gatherer | Chaser (1D) | Intimidator (1D) |

### Besondere Eigenschaften

*SE 18, „Animal Attributes“.* 2W6 je Tier; DMs: Größe der Welt 9+ −1, 5 oder 4 +1, 3 oder weniger +2;
Atmosphäre 8+ +2, 5 oder weniger −1. A = Amphibian, F = Flyer, S = Swimmer, T = Triphibian; die Zahl
ist ein Größen-DM zusätzlich zu dem des Geländes (bei Fliegern nur dieser).

| 2W6 | Beach | Marsh | River | Sea | Swamp | Other |
|---|---|---|---|---|---|---|
| 2 | S +1 | S −6 | S +1 | S +2 | S −3 | — |
| 3 | A +2 | A +2 | A +1 | S +2 | A +1 | — |
| 4 | A +2 | A +1 | — | S +2 | A +1 | — |
| 5 | — | — | — | A +2 | — | — |
| 6 | — | — | — | A | — | — |
| 7 | — | — | — | S +1 | — | — |
| 8 | — | — | — | S −1 | — | — |
| 9 | — | — | — | T −7 | — | — |
| 10 | — | — | — | T −6 | — | F −6 |
| 11 | F −6 | F −6 | F −6 | F −6 | F −6 | F −5 |
| 12 | F −5 | F −5 | F −5 | F −5 | F −5 | F −3 |

### Größe und Bewaffnung

*SE 18, „Animal Sizes and Weaponry“.* 2W6 einmal für Größe/Hits/Wounds (mit Size DMs) und einmal
für Weapons und einmal für Armor. Bei „(+6)“ noch einmal mit DM +6 würfeln; eine zweite „(+6)“ neu
würfeln.

- *Size DMs:* aus Eigenschaften und Gelände; Größe der Welt 8+ −1, 4 oder weniger +1.
- *Weaponry DMs:* Carnivore +8, Omnivore +4, Herbivore −3.
- *Armor DMs:* Carnivore −1, Scavenger +1, Herbivore +2. Flieger und Triphibien haben nie Rüstung.

| Wurf | Weight (kg) | Hits | Wounds | Weapons | Armor |
|---|---|---|---|---|---|
| 1 | 1 | 1D/0 | −2D | hooves and horns | (+6) |
| 2 | 3 | 1D/1D | −2D | horns | — |
| 3 | 6 | 1D/2D | −1D | hooves and teeth | — |
| 4 | 12 | 2D/2D | — | hooves | jack |
| 5 | 25 | 3D/2D | — | horns and teeth | — |
| 6 | 50 | 4D/2D | — | thrasher | — |
| 7 | 100 | 5D/2D | — | claws and teeth | — |
| 8 | 200 | 5D/3D | +1D | teeth | — |
| 9 | 400 | 6D/3D | +2D | claws | — |
| 10 | 800 | 7D/3D | +3D | claws | jack |
| 11 | 1600 | 8D/3D | +4D | thrasher | — |
| 12 | 3200 | 8D/4D | +5D | claws and teeth | (+6) |
| 13 | (+6) | 9D/4D | (+6) | claws +1 | mesh +1 |
| 14 | 6000 | 10D/5D | ×2 | stinger | cloth +1 |
| 15 | 12000 | 10D/5D | ×2 | claws +1 and teeth +1 | mesh |
| 16 | 24000 | 12D/6D | ×3 | teeth +1 | cloth |
| 17 | 30000 | 14D/7D | ×4 | as blade | combat +4 |
| 18 | 36000 | 15D/7D | ×4 | as pike | reflec |
| 19 | 40000 | 16D/8D | ×5 | as broadsword | ablat |
| 20 | 44000 | 17D/9D | ×6 | as body pistol | battle |

„Hits“ steht wie in der Beispieltabelle als zwei Zahlen (etwa 18/11). „Wounds“ ändert den Schaden der
Waffe (−2D, +1D, ×2 …).

### Tierverhalten

*SE 19, „Animal Characteristics“.* Je Tier einmal 1W6 je Spalte; das Ergebnis ist der Wurf auf 2W6,
den das Tier zum Angreifen bzw. Fliehen braucht (sonst tut es nichts). Speed ist das Vielfache der
gewöhnlichen Geschwindigkeit.

| Kategorie / Typ | To Attack | To Flee | Typical Speed |
|---|---|---|---|
| **Herbivore** Filter | If possible | 1D+2 (3–8) | 1D−5 (0–1; mindestens 0) |
| Intermittent | 1D+3 (4–9) | 1D+3 (4–9) | 1D−4 (1–2; mindestens 1) |
| Grazer | 1D+2 (3–8) | 1D−1 (0–5) | 1D−2 (2–4; mindestens 2) |
| **Omnivore** Gatherer | 1D+3 (4–9) | 1D+2 (3–8) | 1D−3 (1–3; mindestens 1) |
| Hunter | 1D+0 (1–6) | 1D+2 (3–8) | 1D−4 (1–2; mindestens 1) |
| Eater | 1D+0 (1–6) | 1D+3 (4–9) | 1D−3 (1–3; mindestens 1) |
| **Carnivore** Pouncer | If surprise | If surprised | 1D−4 (1–2; mindestens 1) |
| Chaser | If more | 1D+3 (4–9) | 1D−2 (2–4; mindestens 2) |
| Trapper | If surprise | 1D+2 (3–8) | 1D−5 (0–1; mindestens 0) |
| Siren | If surprise | 1D+3 (4–9) | 1D−4 (0–2; mindestens 0) |
| Killer | 1D+0 (1–6) | 1D+3 (4–9) | 1D−3 (1–3; mindestens 1) |
| **Scavenger** Hijacker | 1D+1 (2–7) | 1D+2 (3–8) | 1D−4 (1–2; mindestens 1) |
| Intimidator | 1D+2 (3–8) | 1D+1 (2–7) | 1D−4 (1–2; mindestens 1) |
| Carrion-Eater | 1D+3 (4–9) | 1D+2 (3–8) | 1D−3 (1–3; mindestens 1) |
| Reducer | 1D+3 (4–9) | 1D+2 (3–8) | 1D−4 (1–2; mindestens 1) |

- *If possible:* greift an, wenn es irgend kann. *If surprise:* greift an, wenn es Überraschung hat.
  *If surprised:* flieht, wenn es überrascht wird. *If more:* greift an, wenn es mehr Tiere als
  mögliche Beute sind.
- Kodiert wird je Tier als **A** (Angriff), **F** (Flucht), **S** (Geschwindigkeit), z. B. „A6 F7 S2“:
  greift bei 6+ an, flieht bei 7+, wenn es nicht schon angegriffen wurde, doppelte Geschwindigkeit.
  Fleischfresser greifen meist zuerst an (A F S), Pflanzenfresser fliehen zuerst (F A S). Wo ein
  Wort statt einer Zahl steht, ist die Zahl 0.

### Beispieltabelle

*SE 19, „Typical Animal Encounter Table“:* CLEAR Terrain, Regina (A788899-A).

| 2W6 | Anzahl | Animal | Weight | Hits | Armor | Wounds & Weapons | Verhalten |
|---|---|---|---|---|---|---|---|
| 2 | 1 | Hijacker | 200 kg | 18/11 | jack | 11 teeth | A5 F7 S2 |
| 3 | 2 | Hunters | 12 kg | 3/7 | none | 4 claws | A5 F4 S1 |
| 4 | 1 | Reducer | 12 kg | 7/8 | none | 6 horns | A8 F4 S2 |
| 5 | 1 | Flying Gatherer | 3 kg | 1/3 | none | 1 claws | A4 F7 S1 |
| 6 | 8 | Grazers | 400 kg | 25/15 | none | 14 hooves | F1 A7 S4 |
| 7 | 7 | Flying Grazers | 6 kg | 5/7 | none | 1 teeth | F4 A8 S2 |
| 8 | 1 | Grazer | 1600 kg | 33/11 | cmbt+4 | 21 thrasher | F5 A5 S2 |
| 9 | 1 | Chaser | 50 kg | 11/9 | none | 6 claws+1 | A0 F7 S2 |
| 10 | | Event | | | | | Heulende Fleischfresser außer Sicht (Wurf 11 unten); übernachtet die Gruppe in der Nähe, greifen sie bei 7+ an |
| 11 | 6 | Chasers | 25 kg | 6/11 | jack | 9 teeth+1 | A0 F5 S2 |
| 12 | 1 | Killer | 200 kg | 21/12 | none | 17 as pike | A1 F9 S1 |

### Ablauf beim Anlegen einer Tabelle

*SE 19, „Encounter Table Generation Checklist“.*

1. UPP der Welt und ihre Geländearten bestimmen.
2. Je Gelände eine Tabelle:
   - A. Type DM und Size DM aus den Geländearten.
   - B. Spaltenaufteilung wählen oder eine eigene anlegen.
   - C. Tierart und Anzahl aus der Tierartentabelle.
   - D. Besondere Eigenschaften je Tier.
   - E. Einzelheiten: 1) Gewicht und Hits, 2) Waffe und Wunden mit der Wundänderung, 3) Rüstung,
     4) Verhalten.
3. Gesunden Menschenverstand anwenden.

---

## Lücken: was nur in Book 1 steht

Beide Bücher nennen diese Regeln, beschreiben sie aber nicht. Fehlt B1, legen wir sie als Hausregel
fest und schreiben das hier dazu.

| Regel | Genannt in | Verweis |
|---|---|---|
| Parieren mit Klingenfertigkeit | SE 6 | B1 |
| Ausweichen (Evading), sein DM | SE 6, B4 32, 36–41 | B1 |
| Gruppentreffer durch Schrotflinte | SE 6, B4 32 | B1 S. 39; Wortlaut aus einem Auszug unter [Feuerstoß und Schrot](#feuerstoß-und-schrot-nach-book-1) |
| Dauerfeuer von Automatic Rifle und SMG (SE-Waffen) | SE 5, 6 („Switch semi or full auto“) | B1; Wortlaut aus einem Auszug unter [Feuerstoß und Schrot](#feuerstoß-und-schrot-nach-book-1) |
| Wie viele volle Schläge die Ausdauer erlaubt | SE 6 | B1 |
| Waffe ziehen, geworfene Klinge | SE 6 | B1 |
| Entkommen über 20 Bands | `domain-model.md` | B1 S. 33 |
| Einfache Moral | B4 31 | B1 S. 33 (entspricht SE 5) |
| Forward Observer, Korrektur des Feuers | B4 12 | B1 |
| Unfälle mit Fahrzeugen (Air/Raft) | B4 15 | B1 |
| Leadership-4 beim Anwerben | B4 15 | B1 |

## Nicht aufgenommen

Aus beiden Büchern nicht in diesem Dokument, weil sie nicht zum Kampf gehören:

- **SE, Begegnungen ohne Kampf (S. 20–21):** Routine (bei Bedarf), Legal (täglich Gesetzesstufe oder
  mehr auf 2W6, sonst Verhör), Patron (wöchentlich 5+ auf 1W6, *Patron Encounters Matrix* mit zwei
  Listen), Rumor (wöchentlich 7+ auf 2W6, *Rumors Matrix* und *Rumor List*), Adventure (führt die
  Spielleitung).
- **SE:** Charaktererschaffung (S. 1–3), Reisen und Schiffe (S. 8–11), Raumkampf (S. 12–13), Welten
  (S. 14–17), Handel (S. 22), sonstige Ausrüstung (S. 23 außer Waffen und Rüstung), Psionik (S. 24).
- **B4:** Erschaffung von Söldnern in Army und Marines (S. 3–9, 16), Fertigkeiten ohne Kampfbezug
  (Instruction, Interrogation, Recruiting, Survival; S. 13–15), Tickets und Anheuern (S. 17–24),
  Anwerben, Ausbildung und Organisation von Einheiten (S. 25–28, außer Erfahrung und Moral), Fahrzeuge
  und Artillerie je TL als Fließtext (S. 44–47).
