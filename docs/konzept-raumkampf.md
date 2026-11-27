# Konzept: Raumkarte und Raumkampf mit Vektorbewegung

> **Stand: Entwurf, Plan aktualisiert am 22. November 2026.** Gebaut und freigegeben sind die
> Stufen 1, 1b, 2, 4a und der Begegnungsteil von Stufe 5 (siehe *Stufenplan*), jede als eigene
> Änderung im [Domänenmodell](domain-model.md). Was dort noch nicht steht, ist weiter Vorschlag: Erst
> wenn der Owner eine Stufe freigibt, kommen ihre Begriffe in die Tabelle „Begriffe“ und ihre Klassen
> als Änderung mit Ausschnitt in `docs/changes/` ins Diagramm.
>
> **Entschieden** am 18. November 2026 (Owner): 2D, gleichzeitige Bewegung, ein Schubvektor je
> Raumrunde nur durch Tippen oder Ziehen im Schubkreis (stufenlos, mit Einrasten, ohne Auswählen,
> jede Runde zurück auf 0 G), Raumkarte über einen Knopf „Raum“, Dichte K = 1, Weltsymbol der App
> ohne angedeutete Umlaufbahnen, Ausweichen kostet 1 G, Standardrakete 5G6, ECM 9+, Small Craft nach
> Mayday, **Raumkampf vor dem Handel**. Siehe *Entscheidungen* am Ende.
>
> Zum Ausprobieren des Bewegungsmodells gibt es einen Prototyp ohne die App:
> [`docs/mock/raumkarte-bewegung.html`](mock/raumkarte-bewegung.html) (direkt im Browser öffnen).
> Für die Stufe 2b (Änderung 2026-11-22d) liegen zwei Klick-Modelle bereit:
> [`docs/mock/crew-zuweisen.html`](mock/crew-zuweisen.html) – Posten als Felder, Zuweisung über das
> Blatt am Feld, Umziehen und Tauschen durch Ziehen zwischen den Feldern, mit den zwei Posten je
> Charakter und dem Small Craft. Und
> [`docs/mock/computer-programme.html`](mock/computer-programme.html) – Programme in CPU, Speicher
> und Archiv, Umstecken durch Ziehen (im Raumkampf nur zwischen CPU und Speicher und nur vor dem
> eigenen Schuss), Warnung ohne *Maneuver* und ohne *Target* in der CPU, Kauf in der Werft.
> Was davon im Kampf läuft und was fehlt, zeigt das Kampf-Interface selbst; ein eigenes Modell
> dafür gibt es nicht (Owner, 23. November 2026). Software kosten **MCr, unter 0,2 MCr in Cr**
> (Owner, 23. November 2026) – also „MCr 2,00“, aber „Cr 100.000“ für *Maneuver*; die Kasse steht
> auf der Oberfläche in MCr. Der Unterreiter heißt **Computer**, die **Werft** öffnet sich aus diesem
> Unterreiter heraus (Owner, 23. November 2026).

Die Idee des Owners in einem Satz: **Der Raumkampf bleibt rundenbasiert, und in jeder Runde legt man
fest, wie viel Schub jedes Schiff in welche Richtung gibt. Wie sich das Schiff dann bewegt, rechnet
eine Simulation der Schwerkraft aus, nicht ein gerader Vektor.** Gespielt wird auf einer eigenen
Grundkarte, der **Raumkarte**, die zwischen Subsektor und Globus liegt, mit dem Kampf in einem
hochziehbaren Blatt darüber.

Wie im Konzept der Oberflächenkarte trägt jede Stelle, an der wir von den Regeln abweichen oder
etwas ergänzen, das Zeichen **⚑**.

## Quellen

| Quelle | Was daraus kommt |
|---|---|
| *Starter Edition*, *Rules Booklet* (SR) 39–42, *Space Combat*; zusammengefasst in [`regeln-schiffe.md`](regeln-schiffe.md) unter *Raumkampf* | Runde von 1.000 Sekunden, Ablauf der Phasen, Laser, Rückfeuer, Raketen, Sand, Ortung, Schaden, Sondersituationen |
| *Starter Edition*, *Charts and Tables* (SE) 10–13; in `regeln-schiffe.md` übertragen | Antriebe und Rümpfe, Waffen und Lafetten, Angriffs- und Verteidigungs-DMs, Trefferzonen, kritische Treffer, Maßstäbe, Schiffsbegegnungen, Small Craft, Ortung |
| SR 38–39 und SE 13, *Software List*; in `regeln-schiffe.md` übertragen | Target, Predict, Gunner Interact, Select, Multi-Target, Launch, Maneuver/Evade, Return Fire, Anti-Missile, ECM |
| SR 33–35, *Small Craft*; in `regeln-schiffe.md` übertragen | Jäger (Fighter), Ship's Boat, Pinnace usw. mit Beschleunigung und Bewaffnung |
| SR 22, *Different Gravity* | Schwerkraft einer Welt nach ihrer Größe (Größe 8 = 1 G, Erddichte) |
| *Mayday* (GDW 1978, Game 1), Regelheft | Vektorbewegung mit Vergangenheits-, Gegenwarts- und Zukunftsmarker, Schwerkraftfelder um Welten, Umlaufbahn, Landen und Aufschlag, Abfangen, angeglichener Kurs, Raketenarten, Sand, Small Craft mit Brennstufen, Szenarien |
| *Special Supplement 3: Missiles* (GDW 1984, überarbeitet 1986), S. 4–11 | Raketen in der Vektorbewegung bei den Standardmaßstäben (1.000 s, 10.000 km): Antriebsarten mit G und Brennstufen, Lenkung, Zünder, Gefechtsköpfe, Abfangen auf 2.500 km, ECM, Sand gegen Raketen, Magazine |
| *Book 5: High Guard* (GDW 1980) | Flottenkampf ohne Karte (Entfernung wird gewählt, Agility statt Bewegung); Trefferzonen mit Panzerung. Für dieses Konzept nur am Rand, siehe *Was wir bewusst weglassen* |
| Physik (Newton) | Schwerkraft, Bahnen, Integration |

Die Regeln aus Mayday und Supplement 3 stehen zusammengefasst in
[`regeln-schiffe.md`](regeln-schiffe.md) unter *Vektorbewegung (Mayday, Supplement 3)*.

**Vektorbewegung gab es in Traveller schon.** Book 2 spielt den Raumkampf mit Figuren auf dem Tisch,
*Mayday* ist laut eigenem Regelheft die Brettspielfassung davon. Die *Starter Edition*, nach der die
App sonst geht, hat stattdessen Range Bands, in denen sich Schiffe nur vor und zurück bewegen.
Selbst die *Starter Edition* rechnet in Vektoren (SE 12, *Scales*): „Ein 1-G-Vektor entspricht
einem Range Band; 1.000 Sekunden Schub mit 1 G ändern die Geschwindigkeit um 10.000 km.“
Supplement 3 ist ausdrücklich für beide geschrieben und nennt die **Standardmaßstäbe der
Vektorbewegung**: eine Runde 1.000 Sekunden, 100 mm auf dem Tisch = 10.000 km, und 1 G eine Runde
lang verschiebt die Bahn um 100 mm, also 10.000 km. Das sind genau die Maßstäbe der SR.

So bewegt sich ein Schiff dort (Mayday, Abschnitt 4): Jedes Schiff hat drei Marker, wo es war, wo es
ist und wo es nächste Runde sein wird. In der Bewegung rückt jeder Marker eine Stelle vor, und der
neue Zukunftsmarker liegt so weit vor dem Schiff, wie es in der letzten Runde geflogen ist. Mit
Schub darf man ihn um 1 Feld je G verschieben. Schwerkraft gibt es nur in den sechs Feldern um eine
Welt: Jedes dieser Felder, durch das ein Schiff fliegt, schiebt den Zukunftsmarker um ein Feld zur
Welt hin. Wer von einem dieser Felder ins nächste fliegt, ist in der Umlaufbahn.

Dieses Konzept ist also **die Vektorbewegung von Book 2 und Mayday, mit echter statt gestufter
Schwerkraft** ⚑. Alles Übrige nehmen wir aus den SR (Runde, Phasen, Würfe, DMs, Schaden), die
Raketen aus Supplement 3. Wo Mayday und die SR sich widersprechen, gelten die SR; Mayday füllt die
Lücken, die die Range Bands lassen (Schwerkraft, Bahnen, angeglichener Kurs, Landen).

**Rechte:** Wie bei der Oberflächenkarte übernehmen wir nur die Mechanik, mit eigenen deutschen
Texten, ohne Bilder, Karten oder Spielsteine aus Mayday.

## Grundsatz: Physik bewegt, Würfel entscheiden

- **Die Bewegung ist reine Physik, ohne Würfel.** Gleicher Stand und gleiche Schubbefehle ergeben
  immer dieselbe Bahn. Deshalb ist die Vorschau, die man beim Planen sieht, genau das, was passiert,
  solange sich die anderen nicht anders bewegen als gedacht.
- **Treffen und Schaden sind Würfe nach den SR**, wie bisher im Personenkampf: 2W6 + DMs gegen 8+,
  dann die Trefferzone. Die Entfernung für die DMs kommt aus der echten Entfernung auf der Karte.
- **Werte, nicht Würfe**: Gespeichert wird nach jeder Runde der Stand (Orte, Geschwindigkeiten,
  Schäden, Munition), nicht die Rechnung dahin. So lässt sich ein Kampf nach dem Neuladen oder auf
  einem anderen Gerät fortsetzen, auch wenn sich die Physik der App später ändert.

## 1. Die Raumkarte

### Wo sie liegt

Die App hat heute zwei Grundkarten: den **Subsektor** (Parsec, Hexfelder) und den **Globus** einer
Welt (Oberflächenfelder von 250 km). Die Raumkarte liegt dazwischen: **der Raum um eine Welt**, von
ein paar tausend bis zu einigen Millionen Kilometern.

**Der Weg dorthin** (Owner, 18. November 2026): Ein Tippen auf eine Welt im Subsektor öffnet wie bisher ihren
Globus. Die Raumkarte erreicht man über einen eigenen Knopf **„Raum“** (⚑ am Globus und an der
Welt im Subsektor), und sie öffnet sich von selbst, wenn ein Raumkampf beginnt. ✕ führt zurück
dorthin, woher man kam.

```
Subsektor ──Welt antippen──▶ Globus
    │                          │
    └──Knopf „Raum“──▶ Raumkarte der Welt ◀──Knopf „Raum“──┘
                       (auch von selbst beim Raumkampf)
```

### Was darauf ist

- **Himmelskörper**: die Welt selbst, in späteren Stufen ihre Monde und der Gasriese des Systems.
  Jeder Körper hat Radius und Masse und läuft auf einer festen Bahn (siehe Abschnitt 2).
- **Einheiten**: alles, was sich frei bewegt und von der Simulation geschoben wird: Schiffe, Small
  Craft (Beiboote, Jäger), Raketen, Sandwolken. Später auch Wracks und Rettungskapseln.
- **Orte am Himmel**: die Orbitalstädte der Welt (gibt es schon, `City` ohne `cell`) und der
  Highport, auf festen Bahnen wie die Monde.
- **Hilfslinien**: Bahnen (siehe Abschnitt 3), Kreise der Raumbänder um die zuletzt berührte Einheit
  (alle 10.000 km), die **Sprunggrenzen** bei 10 und 100 Durchmessern der Welt (SR 28: DM +15 bzw.
  +5 auf den Fehlsprung), und der **Schatten** der Welt, wo sie die Sichtlinie verdeckt.

### Maßstab und Darstellung

- **2D** (Owner, 18. November 2026): Alles liegt in einer Ebene. Auf dem Handy ist das lesbar und mit dem Finger
  steuerbar; echte Bahnen in 3D wären auf dem kleinen Bildschirm kaum zu planen.
- Die Karte zoomt stufenlos über drei Größenordnungen: von „Schiff neben Station“ bis „ganze
  Sprunggrenze im Bild“. Mit zwei Fingern ziehen und zoomen, wie auf dem Globus.
- Gezeichnet mit Canvas 2D (für ein paar Dutzend Einheiten reicht das, der Globus braucht WebGL,
  die Raumkarte nicht).
- **Himmelskörper zeichnet die Planetendarstellung der App** (Entscheidung des Owners,
  18. November 2026): das **Weltsymbol** (`drawWorld` in `view/sector/world-icon.ts`) aus UWP,
  Temperatur und Leben, mit der echten Oberflächenkarte, wenn es eine gibt. So sieht eine Welt auf
  Subsektor, Raumkarte und Globus gleich aus.
  - Auf der Raumkarte in **echter Größe**: Das Bild wird so skaliert, dass der Radius der Welt auf
    der Karte stimmt (Aufschlag, Schatten und Sichtlinie rechnen mit demselben Radius). Ganz
    herausgezoomt bleibt sie mindestens ein paar Pixel groß.
  - Das Licht kommt wie im Symbol von links, für alle Körper gleich.
  - Ohne die angedeuteten Umlaufbahnen, die das Symbol ab TL 8 zeichnet (Owner, 18. November 2026): Die Raumkarte zeigt
    echte Bahnen, Stationen und Orbitalstädte. Dafür braucht `drawWorld` eine Einstellung.
  - Monde nehmen dasselbe Symbol mit ihren eigenen Werten. **Gasriesen** kann das Weltsymbol noch
    nicht; sie brauchen eine eigene Darstellung im selben Stil (mit dem Sternsystem).

## 2. Das Bewegungsmodell

### Die Runde

- ⚑ Eine **Raumrunde** dauert **1.000 Sekunden**, wie in den SR. (Eigener Begriff, damit sie nicht
  mit der *Runde* des Personenkampfs verwechselt wird.)
- **Alle bewegen sich gleichzeitig** (Owner, 18. November 2026): Erst gibt jede Partei ihre Schubbefehle (die SC von Hand,
  die NSC aus der App, siehe Abschnitt 6), dann rechnet die Simulation die 1.000 Sekunden für alle
  zugleich. Die SR lassen die Seiten abwechselnd ziehen; auf einer Vektorkarte ist das gleichzeitige
  Ziehen gerechter, weil keiner auf die fertige Bewegung des anderen reagieren kann.

### Der Schubbefehl

Je Raumrunde bekommt jede steuerbare Einheit einen **Schubbefehl**: einen **Schubvektor**, also
Richtung und Stärke. Er gilt unverändert für die ganze Runde, als feste Richtung im Raum.

- **Stärke** in G, von 0 bis zur Beschleunigung des Maneuver Drive (z. B. 2 G beim Scout, 6 G beim
  Jäger). Stufenlos in Schritten von 0,1 G (Owner, 18. November 2026); die SR kennen nur ganze G.
- **Eingabe nur durch Ziehen** (Entscheidung des Owners, 18. November 2026): Man zieht den Vektor
  mit dem Finger aus dem Schiff heraus. Seine Länge ist die Stärke, beim höchsten Schub ist Schluss:
  Ein Kreis um das Schiff zeigt die Grenze, und weiter als bis zum Kreis wächst der Pfeil nicht,
  egal wie weit man zieht. Ein kurzer Zug, der im Schiff endet, heißt „kein Schub“.
  - **Ohne Auswählen** (Entscheidung des Owners, 18. November 2026): Man zieht direkt aus jeder
    eigenen Einheit heraus, ohne sie vorher anzutippen. Der Kreis erscheint, sobald der Finger auf
    der Einheit liegt. Bei mehreren Einheiten zieht man nacheinander aus jeder ihren Pfeil.
    ⚑ Liegen Einheiten so dicht, dass der Finger nicht klar trifft, gewinnt die nächste; zoomt man
    hinein, trennen sie sich.
  - ⚑ Der Kreis hat auf dem Bildschirm immer dieselbe Größe (etwa 90 px), egal wie weit gezoomt
    ist. So ist der Schub immer gleich fein einzustellen.
  - **Jeder Klick im Kreis setzt den Schub** (Entscheidung des Owners, 18. November 2026): Tippt
    man irgendwo in den Kreis, zeigt der Pfeil sofort vom Schiff zu dieser Stelle; zieht man weiter,
    folgt er dem Finger. Man muss also nicht im Schiff ansetzen. Ein Tipp in die Mitte heißt kein
    Schub. Ein Zug, der außerhalb jedes Kreises beginnt, verschiebt die Karte. Neben dem Pfeil steht
    der Wert, z. B. „1,4 G“. ⚑ Überlappen sich die Kreise mehrerer Einheiten, gilt der Kreis des
    nächsten Schiffs.
  - **Einrasten** (Owner, 18. November 2026): Am Kreis sind die nützlichen Richtungen als kleine Marken eingezeichnet: in
    Flugrichtung (prograd), gegen die Flugrichtung (retrograd), auf das Ziel (⚑ das Waffenziel der Einheit, sonst der nächste
    geortete Gegner), vom Ziel weg
    und *Angleichen* (gegen die Geschwindigkeit relativ zum Ziel). Kommt der Pfeil einer Marke auf
    wenige Grad nahe, rastet er dort ein. Mehr Hilfe gibt es nicht, keine Knöpfe und kein Regler.
- **Jede Runde beginnt ohne Schub** (Entscheidung des Owners, 18. November 2026): Nach der
  Bewegung fällt der Schubbefehl jeder Einheit auf 0 G zurück. Wer weiter beschleunigen will, zieht
  den Vektor neu. Wer nichts tut, treibt ballistisch, und die Vorschau zeigt diese Bahn gleich zu
  Beginn der Planung. Im Blatt steht ein Knopf „Kein Schub“, um einen gezogenen Vektor vor dem
  Ausführen wieder zu verwerfen.

Weil die Richtung über die Runde fest bleibt, krümmt sich die eigene Bahn nah an einer Welt
anders, als der Pfeil zeigt. In einer niedrigen Umlaufbahn dreht sich die Flugrichtung in einer
Runde um gut 70°. Das ist gewollt: Die Vorschau zeigt beim Ziehen sofort, wo man landet, und genau
das ist die Kunst des Fliegens nah am Körper. **Ein Vektor je Runde** (Owner, 18. November 2026): Teilvektoren
(etwa zwei halbe Runden mit verschiedenem Schub) und kürzere Runden gibt es nicht.

Ein Schubvektor, der sich während der Runde mitdreht (immer prograd, immer aufs Ziel), bleibt der
App vorbehalten: Raketen lenken sich so, und die NSC-Schiffe dürfen beim Planen dieselben festen
Vektoren nehmen wie der Spieler.

**Ausweichen kostet Schub** (Mayday, Abschnitt 4): Läuft ein Maneuver/Evade-Programm, hat das Schiff
1 G weniger; ein 1-G-Schiff kann dann gar nicht mehr steuern. Die SR geben für die Programme nur den
DM. **Übernommen** (Owner, 18. November 2026): Ausweichen ist damit eine echte Entscheidung zwischen Bahn und
Deckung. Auf der Karte wird der Schubkreis um 1 G kleiner, solange das Programm läuft.

### Schwerkraft

Die Idee des Owners ist eine echte Simulation der Schwerkraft. Für ein Spiel heißt das genauer:

- **Die Himmelskörper laufen auf festen Bahnen** ⚑ (Kreisbahnen, „auf Schienen“). Eine echte
  N-Körper-Simulation der Monde und Planeten untereinander bringt im Kampf nichts, die Körper würden
  sich in ein paar Stunden kaum anders bewegen, sie wäre aber schwer stabil zu halten und zu
  speichern. Wo ein Körper zu einem Zeitpunkt ist, ergibt sich aus Bahnradius, Umlaufzeit und
  Startwinkel, ohne Rechnung über die Runden.
- **Jede Einheit spürt die Schwerkraft aller Körper**, jeden einzeln nach Newton:
  a = G·M ÷ r², zur Mitte des Körpers hin. Das ist das *eingeschränkte N-Körper-Problem*: Die
  Einheiten sind so leicht, dass sie die Körper nicht ziehen, und so klein, dass sie sich gegenseitig
  nicht ziehen.
- **Rechnung**: Die Simulation teilt jede Raumrunde in kleine Schritte (⚑ 10 Sekunden, nahe an einem
  Körper kürzer) und rechnet mit einem symplektischen Verfahren (*Velocity Verlet*), damit Bahnen
  über viele Runden stabil bleiben und nicht von selbst wachsen oder schrumpfen. Die Schritte sind
  fest vorgegeben, damit jedes Gerät exakt dieselbe Bahn rechnet.
- **Aufschlag**: Kommt eine Einheit unter die Oberfläche eines Körpers, schlägt sie auf und ist
  zerstört. ⚑ Landen, Atmosphäre und Luftbremsung gibt es in der ersten Fassung nicht.

### Masse der Körper

Die SR geben die Schwerkraft einer Welt über ihre Größe an (SR 22, *Different Gravity*): Größe 8
hat normale Schwerkraft, jede Stufe darüber oder darunter 12,5 % mehr oder weniger, bei Erddichte.
Das ist **g = Größe ÷ 8 G**, dieselbe Regel, nach der die App schon die Traglast auf einer Welt
rechnet (`regeln-kampf.md`, *Traglast und Schwerkraft*). Für eine andere Dichte nennen die SR einen Faktor K (meist 1, nach
Ermessen der Spielleitung); wir nehmen immer K = 1 (Owner, 18. November 2026), bis Book 6 *Scouts* Dichten bringt. Die Masse
folgt daraus: G·M = g · R². ⚑ Ein Gasriese bekommt feste Werte, bis Book 6 die Sternsysteme bringt.
⚑ Für die Rechnung gilt 1 G = 10 m/s², wie im Maßstab von Supplement 3 (Mayday nennt 9,8 m/s²).

| Körper | Radius | Schwerkraft an der Oberfläche | G·M in km³/s² | Niedrige Bahn | Fluchtgeschwindigkeit |
|---|---|---|---|---|---|
| Größe 2 | 1 600 km | 0,25 G | 6 400 | 2,0 km/s, Umlauf 1,4 h | 2,8 km/s |
| Größe 5 | 4 000 km | 0,63 G | 100 000 | 5,0 km/s, Umlauf 1,4 h | 7,1 km/s |
| Größe 8 | 6 400 km | 1,0 G | 409 600 | 8,0 km/s, Umlauf 1,4 h | 11,3 km/s |
| Größe A | 8 000 km | 1,25 G | 800 000 | 10,0 km/s, Umlauf 1,4 h | 14,1 km/s |
| ⚑ Kleiner Gasriese | 25 000 km | 1,2 G | 7 500 000 | 17 km/s, Umlauf 2,5 h | 24 km/s |
| ⚑ Großer Gasriese | 70 000 km | 2,5 G | 122 500 000 | 42 km/s, Umlauf 2,9 h | 59 km/s |

(Bei gleicher Dichte ist die Umlaufzeit dicht an der Oberfläche für jede Größe gleich, rund 85
Minuten, also etwa fünf Raumrunden.)

### Wie stark wirkt die Schwerkraft im Spiel? (ehrlich gerechnet)

Ein Schiff mit 1 G gewinnt in einer Raumrunde 10 km/s und kommt bei vollem Schub 5.000 km weit, ein
halbes Raumband. Die Schwerkraft einer Welt der Größe 8 fällt mit dem Quadrat der Entfernung:

| Abstand zur Mitte | Raumbänder | Schwerkraft | Wirkung in einer Raumrunde |
|---|---|---|---|
| 6 400 km (Oberfläche) | 0,6 | 1 G | so stark wie ein Free Trader |
| 12 800 km | 1,3 | 0,25 G | deutlich, Bahnen krümmen sich sichtbar |
| 20 000 km | 2 | 0,10 G | 1 km/s, 500 km Versatz |
| 50 000 km | 5 | 0,016 G | 160 m/s; erst über viele Runden spürbar |
| 100 000 km | 10 | 0,004 G | vernachlässigbar gegen jeden Antrieb |

Am **großen Gasriesen** ist es zehnmal weiter: In 200.000 km Abstand zieht er noch mit 0,3 G.

(In Book 2 und Supplement 3 verschiebt 1 G die Bahn um volle 10.000 km je Runde, weil der Schub dort
wie ein Stoß wirkt, der erst in der nächsten Runde zählt. Die Geschwindigkeit danach, 10 km/s, ist
dieselbe. Mayday rechnet mit Runden von 100 Minuten und Feldern von einer Lichtsekunde, und seine
Schwerkraftfelder ziehen auf 300.000 km so stark wie ein 1-G-Antrieb. Das ist eine Vereinfachung
für das Brettspiel, in echt wäre es dort einige hundert Mal schwächer.)

Daraus folgt für das Spiel:

- **Nah an einer Welt** (bis etwa drei Raumbänder) und **überall am Gasriesen** prägt die
  Schwerkraft die Bahnen: Umlaufbahnen, Schwung um den Körper herum, Verstecken im Schatten, ein
  angeschlagenes Schiff, das in die Atmosphäre zu stürzen droht. Dort finden die meisten Kämpfe in
  Traveller ohnehin statt: beim Anflug, im Orbit, beim Auftanken am Gasriesen.
- **Weit draußen** fliegen Schiffe mit Antrieb fast gerade. Die Schwerkraft wirkt dort vor allem auf
  alles **ohne Schub**: treibende Wracks, Schiffe mit ausgefallenem Maneuver Drive, Raketen nach
  Brennschluss, Sandwolken, Rettungskapseln.
- ⚑ Damit Schubpausen auch für gesunde Schiffe einen Sinn haben, schlägt das Konzept vor: **Wer
  schubt, leuchtet.** Ein Schiff mit laufendem Antrieb ist auf die doppelte Reichweite zu orten
  (siehe Abschnitt 5). Wer still auf einer ballistischen Bahn treibt, wird später gesehen. So wird es
  zur Taktik, die Schwerkraft die Arbeit machen zu lassen. (Entscheiden wir mit der Ortung in
  Stufe 5.)

## 3. Bahnen und Vorschau

Was die Karte beim Planen zeigt, ist der Kern des Spielgefühls. Es sind die drei Marker aus Mayday
(war, ist, wird sein), nur als Linien statt Spielsteine:

- **Spur**: wo jede Einheit in den letzten Runden war, verblassend.
- **Eigene Bahn dieser Runde**: durchgezogen, mit dem gerade eingestellten Schubbefehl, und am Ende
  ein Umriss der Einheit, wo sie nach 1.000 Sekunden sein wird. Sie ändert sich sofort, während man
  am Schub zieht.
- **Bahn danach**: gestrichelt, wie es ohne weiteren Schub weiterginge (⚑ fünf Runden voraus).
  Daran sieht man, ob man in eine Umlaufbahn kommt, an der Welt vorbeischwingt oder aufschlägt.
- **Fremde Einheiten**: ihre Bahn ohne Schub (gestrichelt) und ihr **Reichweitenfächer**: die Fläche,
  die sie in dieser Runde mit vollem Schub in irgendeine Richtung erreichen könnten. Wohin der Gegner
  wirklich zieht, sieht man erst nach der Runde.
- **Nächste Annäherung**: Kreuzen sich zwei Bahnen, markiert die Karte den Punkt der geringsten
  Entfernung in dieser Runde, mit Abstand und Zeitpunkt (wichtig für Raketen und Rammen).
- **Sichtlinie**: zwischen der zuletzt berührten Einheit und ihrem Ziel; rot, wenn ein Körper sie verdeckt.

### Ablauf auf dem Bildschirm

1. **Planen**: In den Schubkreis einer Einheit tippen oder darin ziehen, ohne sie vorher
   auszuwählen; der Pfeil zeigt vom Schiff zum Finger (Länge = Stärke, gekappt am Kreis). Ziele für Waffen wählen.
   Antippen braucht man nur, um eine Einheit im Blatt anzuzeigen. Ein Zug, der woanders
   auf der Karte beginnt, verschiebt die Karte; zwei Finger zoomen.
2. **„Runde ausführen“**: Die NSC entscheiden, dann spielt die Karte die 1.000 Sekunden in etwa zwei
   Sekunden ab, alle Einheiten zugleich. ⚑ Man kann die Wiedergabe anhalten und mit einem Regler
   zurück- und vorspulen.
3. **Feuer**: Die Würfe der Runde erscheinen nacheinander im Blatt mit rollenden Würfeln, wie auf
   der Würfelbühne der Begegnung, und gehen ins Log.

## 4. Ablauf einer Raumrunde

Nach den SR (*Turn Sequence*), angepasst an gleichzeitige Bewegung ⚑:

| Phase | Was passiert | Nach SR |
|---|---|---|
| 1. Planen | Schubbefehle, Ziele der Turrets, Starts von Raketen, Sand und Small Craft festlegen | Teil jeder Phase |
| 2. Bewegung | Simulation der 1.000 Sekunden für alle Einheiten; Raketen, die ihr Ziel erreichen, sind „dran“ | *Movement* |
| 3. Laserfeuer | alle geplanten Schüsse beider Seiten, an den Orten am Ende der Bewegung; Schaden erst nach allen Würfen (gleichzeitig) | *Laser Fire* |
| 4. Rückfeuer und Abwehr | Return Fire auf Schützen, Anti-Missile gegen Raketen im eigenen Raumband | *Laser Return Fire* |
| 5. Detonation und Start | Raketen, die in Phase 2 ihr Ziel erreicht haben, detonieren (1W Treffer); neue Raketen, Sandwolken und Small Craft lösen sich mit Ort und Geschwindigkeit ihres Schiffs, sie fliegen ab der nächsten Bewegung | *Ordnance Launch*, *Missile Detonation* |
| 6. Schiffsbetrieb | Schadenskontrolle (9+), Nachladen (3 Runden je Launcher), Repressurisieren | *Special Situations* |

⚑ **Gebaut ist die Raumrunde in zwei Knöpfen** (2026-11-23a, Modell
[`mock/raumkampf-ui.html`](mock/raumkampf-ui.html)): Der eine Knopf unten heißt in der Schubphase
**Bewegen** (Phase 1 und 2 – Schub wählen und Bewegung, die Raumrunde rückt *nicht* weiter) und in der
Feuerphase **End Turn** (Phase 3 bis 6 – eigene Salven werden getippt, am Ende feuern die fremden
Schiffe und das Rückfeuer, dann rückt die Raumrunde weiter). Die Schadenskontrolle
(seit 27. November 2026) tippt man in der Feuerphase im Blatt unter den Hardpoints; Raketen, Sand und
Nachladen folgen in den nächsten Stufen; `SystemFlight.phase` (`thrust`, `fire`) hält die Phase im
Spielstand.

### Waffen

- **Laser** (Pulse, Beam): Trefferwurf nach den SR. ⚑ Das **Raumband** für die Entfernungs-DMs ist
  die echte Entfernung am Ende der Bewegung, geteilt durch 10.000 km, aufgerundet. Ein Laser braucht
  freie Sichtlinie: Liegt ein Körper dazwischen, kann man nicht schießen. DMs nach SE 12: über 25
  Raumbänder −2, über 50 Raumbänder −5. Die übrigen DMs (Predict, Gunner Interact, Select, Pulse
  Laser, Maneuver/Evade, Auto/Evade) stehen in `regeln-schiffe.md`.
- **Raketen** nach Supplement 3: Eine Rakete ist eine eigene Einheit mit einem **Antrieb aus
  G und Brennstufen**, geschrieben etwa *5G6*: höchstens 5 G je Runde, Treibstoff für sechs Runden
  bei vollem Schub (oder entsprechend länger bei weniger, *3G3* reicht für 1 G neun Runden lang).
  Ist der Treibstoff verbraucht, fliegt sie ballistisch weiter, und nur noch die Schwerkraft lenkt
  sie; so kann man ihr davonfliegen oder sie an einer Welt vorbeischwingen lassen. Die SR sagen
  schlicht „wie ein Schiff mit 6 G“, ohne Treibstoff.
  - **Standardrakete 5G6** nach Supplement 3 (Owner, 18. November 2026): höchstens 5 G, Treibstoff für sechs
    Runden bei vollem Schub (30 G-Runden, also 300 km/s). ⚑ Anders als in Supplement 3 (Dauerbrand,
    nicht steuerbar) ist sie frei steuerbar wie ein Schiff (*Discretionary Burn*) und lenkt sich
    in jedem Schritt selbst auf das Ziel. So hat sie auch nach der ersten Runde eine Chance, und
    man braucht für den Anfang keine Bauteile.
  - **Abfangen**: Kommt die Rakete ihrem Ziel während der Bewegung auf **2.500 km** nahe (25 mm in
    Supplement 3), hat sie es abgefangen und kann in Phase 5 zünden. Trifft sie es genau (Kontakt),
    gibt es doppelt so viele Treffer. ⚑ Kontakt heißt bei uns: nächste Annäherung unter 100 km.
  - **Geschwindigkeit**: Je volle 30 km/s Relativgeschwindigkeit beim Kontakt ein Treffer mehr
    (Supplement 3: je 300 mm Vektor).
  - **ECM** lässt sie folgenlos verpuffen, bei **9+** nach Supplement 3 (Owner, 18. November 2026) (die SR sagen
    7+).
  - **Später** (eigene Stufe): Raketen aus Bauteilen wie in Supplement 3, mit Antrieb (Dauerbrand,
    begrenzt, frei), Lenkung (Funk, Infrarot, Masse, Neutrino), Zünder (Kontakt, Annäherung,
    intelligent, auf Befehl) und Gefechtskopf, zu kaufen im Shop. Auch Minen (ohne Antrieb, treiben
    mit der Schwerkraft), Leuchtraketen und Nachrichtentorpedos.
- **Sand**: In Mayday umgibt die Sandwolke das Schiff, solange es den Kurs nicht ändert: −3 auf
  Laser, die hineinschießen, −1 auf Laser, die hinausschießen, −1 auf Raketen. Supplement 3: Je
  2.500 km Sand, durch die eine Rakete fliegt, wird sie bei 12+ unschädlich. ⚑ In der Simulation ist
  die Wolke eine eigene Einheit, die mit der Geschwindigkeit des Schiffs beim Ausstoß davontreibt
  und sich langsam ausdehnt. Damit ergibt sich die Regel aus Mayday von selbst: Wer keinen Schub
  gibt, bleibt in seiner Wolke; wer schubt, fliegt aus ihr heraus. Der DM kommt aus SE 12: **−3 je
  Raumband Sand**, durch das der Schuss geht. ⚑ Eine Wolke, die die Sichtlinie schneidet, zählt
  mindestens als ein Raumband.
- **Rammen** gibt es nicht ⚑ (die SR kennen es nicht).

### Small Craft und Jäger

- Ein Schiff trägt Small Craft im Laderaum (heute sind sie einfache Gegenstände der Art `ship`, siehe
  Domänenmodell). Im Raumkampf brauchen sie eigene Werte: Rumpf, Beschleunigung, Bewaffnung aus der
  Tabelle *Small Craft* (SR 33–35), etwa der **Fighter** mit 10 t, 6 G und einem Laser oder drei
  Raketen.
- **Aussetzen** in Phase 5 (militärische Schiffe alle in einer Runde, zivile eines je Runde ⚑, nach
  *Abandon Ship* in den SR). Danach sind sie eigene Einheiten mit eigenem Schubbefehl.
- ⚑ Damit man bei sechs Jägern nicht sechs Schübe ziehen muss: **Rotte**. Mehrere Einheiten einer
  Seite lassen sich zusammenfassen und fliegen mit einem gemeinsamen Schubvektor, den man einmal
  zieht. ⚑ Alternativ „Begleiten“: Die App hält die Rotte neben dem Mutterschiff, ohne eigenen Zug.
- **Aufnehmen**: Ist ein Small Craft dem Mutterschiff auf ⚑ 100 km nahe und langsamer als 0,1 km/s
  relativ zu ihm, kann es in der nächsten Phase 5 andocken.
- Small Craft ohne Computer: DM −1 auf Waffen und keine zweite Waffe zugleich (SE 13).
- **Small Craft ganz nach Mayday** (Owner, 18. November 2026): Beschleunigung und Treibstoff kommen aus Mayday,
  geschrieben als *G und gesamte G-Runden* (Abschnitt 8 in Mayday): Lifeboat *1G5*, Ship's Boat
  *6G9*, Pinnace *5G12*, Cutter *4G15*, Shuttle *3G9*, Fighter *4G12* (höchstens 4 G, zusammen 12
  G-Runden). Ist der Treibstoff verbraucht, treibt das Small Craft ballistisch. Große Schiffe haben
  im Kampf unbegrenzten Treibstoff. Die SR-Werte (z. B. Fighter 6 G, Treibstoff in Tonnen für vier
  Wochen) gelten außerhalb des Kampfs weiter. ⚑ Typen, die Mayday nicht kennt (Slow Boat, Slow
  Pinnace, Modular Cutter), bekommen die G der SR und so viele G-Runden wie der nächste
  Mayday-Typ.

### Schaden

Nach den SR (*Damage Definitions*), mit der Trefferzonen-Tabelle aus SE 12. Was das
Bewegungsmodell direkt spürt:

- **Drive-Treffer** senkt den Buchstaben des Maneuver Drive, damit sinkt die höchste Stärke im
  Schubbefehl. Bei null treibt das Schiff ballistisch, nur noch die Schwerkraft bewegt es.
- **Power-Plant-Treffer** wirkt ebenso auf den Antrieb (⚑ Antrieb höchstens so stark wie das
  Energiewerk).
- **Treibstoff-Treffer** zählen für den Sprung danach; ⚑ für den Schub im Kampf verbraucht die App
  keinen Treibstoff (ein Kampf dauert Stunden, der Tank reicht nach SR für Wochen).
- **Turret-Treffer** legen ein Turret still, **Computer-Treffer** geben DM −1 auf den Betriebswurf
  je Phase.

### Entern und Übergang zum Personenkampf

Ein Schiff mit ausgefallenem Maneuver Drive kann geentert werden (SR). In Mayday geht Entern, wenn
die Kurse angeglichen sind (Gegenwarts- und Zukunftsmarker beider Schiffe im selben Feld). ⚑ Auf der
Raumkarte heißt das: Das enternde Schiff ist ihm auf 100 km nahe und langsamer als 0,1 km/s relativ zu ihm (die Marke *Angleichen* am Schubkreis
hilft dabei). Dann bietet das Blatt „Entern“ an. Das öffnet eine **Begegnung** mit der
Crew des anderen Schiffs als NSC und führt in die vorhandene **Kampfsimulation** des Personenkampfs.
Danach kehrt man auf die Raumkarte zurück, mit dem geenterten Schiff als Beute oder Wrack.

### Kampf verlassen

- **Fliehen**: aus der Ortung verschwinden (über die Tracking-Reichweite von 90 Raumbändern hinaus
  oder in den Schatten eines Körpers, siehe Abschnitt 5).
- **Springen**: Das geht jederzeit, aber innerhalb der Sprunggrenzen mit DM +5 (100 Durchmesser)
  bzw. +15 (10 Durchmesser) auf den Fehlsprung (SR 28). Die Karte zeigt beide Ringe. Bei einer Welt
  der Größe 8 liegt die 100-D-Grenze bei 1,28 Mio. km, also 128 Raumbändern; ein 2-G-Scout braucht
  dafür aus dem Stand rund 8 Raumrunden. Das ist der Wettlauf eines fliehenden Händlers gegen einen
  Piraten. Der Sprung selbst ist die vorhandene **Reise** mit eigenem Schiff (`Journey.jump`); mit
  dem Raumkampf kämen dann die DMs der Nähe zum Körper hinzu, die die App heute noch weglässt.
- **Aufgeben**: Eine Seite stellt den Schub ein und lässt sich entern; das ist ein Logeintrag.

## 5. Ortung

Nach den SR (*Detection and Tracking*):

- Zivile Schiffe orten bis 15 Raumbänder (eine halbe Lichtsekunde), militärische und Scouts bis 60.
  Einmal geortet, kann jeder das Ziel bis 90 Raumbänder verfolgen.
- ⚑ Ein Körper zwischen zwei Einheiten verdeckt die Ortung wie die Sichtlinie.
- *Wer schubt, leuchtet* (siehe Abschnitt 2): Eine Einheit, die in dieser Runde Schub gibt, wäre
  auf doppelte Reichweite zu orten, wer still treibt, nur auf die einfache. Ob das gilt, entscheiden
  wir mit dieser Stufe.
- ⚑ Nicht geortete Einheiten der anderen Seite zeigt die Karte gar nicht oder als zuletzt bekannten
  Ort mit verblassendem Zeitstempel („vor 3 Runden hier“). Ihre Bahn und ihr Fächer erscheinen erst
  mit der Ortung.

Die Ortung kommt erst in Stufe 5 (siehe *Stufenplan*). Davor sehen sich alle Einheiten immer.

## 6. Die NSC-Schiffe

Im Solo-Spiel steuert die App die andere Seite. Das braucht zwei Ebenen:

- **Was will der Gegner?** Kommt aus der Begegnung: Die *Starship Encounter Table* (SE 13) liefert Schiffstyp und ob es ein Pirat ist; die Reaktionstabelle
  (`regeln-kampf.md`, *Reaktion*) oder eine Frage ans Orakel bestimmt die Haltung. ⚑ Daraus wird eine
  von wenigen **Absichten**: *Angreifen* (auf Waffenreichweite halten, Raketen schießen), *Entern*
  (Antrieb zerschießen, dann angleichen), *Abfangen* (Zoll, Patrouille: heranfliegen und angleichen),
  *Fliehen* (zur Sprunggrenze), *Ignorieren* (Bahn halten). Ändern kann sie sich, wenn das Schiff
  schwer getroffen ist (⚑ ab der Hälfte der Treffer auf Antrieb oder Turrets eine Frage ans Orakel:
  „Bricht es ab?“).
- **Wie fliegt er das?** ⚑ Weil die Physik ohne Zufall ist, kann die App einfach ausprobieren: Sie
  rechnet für ein paar Dutzend Schubbefehle (Richtungen × Stärken) die nächsten zwei bis
  drei Runden durch und nimmt den, der der Absicht am besten dient (Abstand zum Wunschband, keine
  Aufschläge, weg von Raketen, freie Sichtlinie). Das läuft in Millisekunden und braucht keine
  eigene KI. Der Prototyp tut genau das.

## 7. Das Blatt (Kampfschirm)

Auf der Raumkarte zeigt das Ziehblatt (bzw. im Desktop-Modus die linke Spalte) den Raumkampf. Es
rastet auf denselben vier Stufen ein wie heute (`TrayStop`):

| Stufe | Inhalt |
|---|---|
| versteckt | nur der Griff; die Karte hat den ganzen Bildschirm, zum Zuschauen bei der Wiedergabe |
| eingeklappt | Raumrunde und Uhrzeit, die zuletzt berührte Einheit (zuletzt gezogen oder angetippt) mit ihrem Schub (z. B. „1,4 G“) und dem Knopf „Kein Schub“, darunter groß **Runde ausführen**; den Schub selbst zieht man auf der Karte |
| halb | dazu die Waffen dieser Einheit: je Turret Ziel, Entfernung in Raumbändern, Gesamt-DM, Munition, Nachladen; Starts von Raketen, Sand und Small Craft |
| voll | dazu der Zustand des Schiffs (Treffer je Zone, Drive- und Power-Plant-Buchstabe, Hull, Dekompression), die Schiffspositionen der SC (Pilot, Gunner, Engineer) mit ihren DMs, und das Log der laufenden Runde |

Die Navigationsleiste unten (Log, Begegnung, Charaktere, Schiff) bleibt erreichbar. ⚑ Solange ein Raumkampf
läuft, zeigt der Bereich Begegnung oben „Raumkampf“ statt „Kampf“.

⚑ **Gebaut ist das Blatt anders** (2026-11-23a, nach der Skizze des Owners und
[`mock/raumkampf-ui.html`](mock/raumkampf-ui.html)): oben zwei Karten nebeneinander – mein Schiff
(▲/▼ durch die eigenen) und das Ziel (▲/▼ durch die fremden, ein Tipp auf der Karte wählt es) –,
darunter die **Hardpoints über alle eigenen Schiffe** mit Schiffsnummer, Waffen und nötigem Wurf; ein
Tipp feuert sofort. Der Zustand des Schiffs (Treffer je Zone) steht in den Karten und im Bereich Schiff,
die Schiffspositionen im Unterreiter Crew. Das Log der laufenden Runde folgt mit Stufe 3.

## 8. Was ins Domänenmodell käme (Skizze)

Nur zur Orientierung. Stufe 1 steht als Änderung 2026-11-18c im Domänenmodell, freigegeben am 18. November 2026
und gebaut ([Ausschnitt](changes/2026-11-18-systemflug.png), Regeln unter *Systemflug* in
[`domain-model.md`](domain-model.md)). Was auf der Raumkarte läuft, heißt dort **Systemflug**
(`SystemFlight`, Owner), auch wenn gekämpft wird. Die übrigen Stufen kommen als eigene Änderungen.

- **`SystemFlight`** (Systemflug), an der Kampagne wie die laufende `Encounter`: Welt (`Hex`), Zeitpunkt,
  Raumrunde, Körper, Einheiten, Ortungsstand. Nach jeder Raumrunde gespeichert.
- **`Body`** (Himmelskörper): Name, Radius, G·M, Bahn (Mittelpunkt-Körper, Radius, Umlaufzeit,
  Startwinkel). Abgeleitet aus der Welt (`Hex.size`), nicht gewürfelt, solange es keine Monde gibt.
- **`SpaceUnit`** (Einheit): Art (Schiff, Small Craft, Rakete, Sand), Partei, Ort und Geschwindigkeit,
  Schubbefehl (`Thrust`: Richtung und Stärke), Spur; beim eigenen Schiff ein Verweis
  auf `Ship`, bei fremden ein Schiffsentwurf und eigene Schäden.
- **Bewaffnung am Schiff**: Turrets mit Lafette (Single, Double, Triple) und Waffen (Pulse Laser,
  Beam Laser, Missile Rack, Sandcaster), Munition. Heute sind die Hardpoints nur eine Zahl.
- **Schaden am Schiff**: Treffer je Zone, bleibt nach dem Kampf am `Ship` und kostet Reparatur
  (SR, *Repair Parts*).
- **Schiffspositionen**: welcher SC Pilot, Gunner, Engineer ist (heute bewusst noch nicht im Modell,
  für die DMs aber nötig).
- **Logeinträge**: Raumkampf begonnen, je Raumrunde ein Eintrag mit Schüssen und Schäden (wie
  `AttackResult` und `DamageRoll`), Raumkampf beendet (Sieg, Flucht, Sprung, Entern, Aufgabe).
- **Physik** liegt als reine Funktionen im Model (`model/orbit.ts` o. ä.): Schwerkraft, Integration,
  Vorschau, Fächer, nächste Annäherung. Ohne React, ohne Zufall, gut testbar.

**Neue Begriffe** für die Tabelle „Begriffe“: Raumkarte, Raumkampf, Raumrunde, Raumband, Himmelskörper,
Einheit, Schubbefehl, Schubvektor, Schubkreis, Einrasten, Bahn, Bahnvorschau, Reichweitenfächer, Nächste Annäherung,
Sprunggrenze, Schatten, Rotte, Absicht (eines NSC-Schiffs).

## 9. Was vorher fehlt

1. ~~Tabellen aus SE 10–13 übertragen~~: erledigt am 18. November 2026, siehe `regeln-schiffe.md`.
2. ~~Bewaffnung kaufen und einbauen~~: erledigt mit Änderung 2026-11-21g (Werft), für Small Craft
   mit 2026-11-22.
3. **Schiffspositionen der SC** (wer ist Pilot, wer Gunner): offen, gehört jetzt zu Stufe 2b.
4. ~~Small Craft mit Werten~~: erledigt mit Änderung 2026-11-21b (eigene Entwürfe und Schiffe).

## 10. Stufenplan

Jede Stufe ist für sich spielbar und bekommt ihre eigene Änderung im Modell. Stand: 22. November 2026.

### Gebaut

| Stufe | Inhalt | Änderung |
|---|---|---|
| 1 | **Raumkarte und Bewegung**: Welt als Körper, Schubvektor durch Ziehen, Vorschau, Wiedergabe, Sprunggrenzen, Knopf „Raum“ | 2026-11-18c |
| 1b | **Sternsystem, Monde und Gasriesen** nach Book 6, eine Raumkarte je Gasriese; Treibstoff schöpfen | 2026-11-18d, 2026-11-20 bis 20d, 2026-11-21f |
| 2 | **Gegner und Laser**: fremdes Schiff mit Absicht (angreifen, fliehen, ignorieren) und Planer, Laserfeuer und Rückfeuer gleichzeitig, Trefferzonen, Schaden bleibt am Schiff, Reparatur, Ende des Kampfs; Feuer auslösen statt vormerken | 2026-11-21h, 2026-11-21i |
| 4a | **Small Craft ohne Kampf**: Beiboote als eigene Schiffe, aussetzen, andocken, landen, im System reisen; einzeln kaufen | 2026-11-21b, 2026-11-21c |
| 4b (Teil) | **Waffen der Small Craft**: Laser ab Werft, eigene Trefferzonen, DM −1 ohne Computer | 2026-11-22 |
| 5 (Teil) | **Begegnungen**: Wurf auf der Starship Encounter Table bei Abreise und Ankunft, Sichtung, Weiterreise aus dem Systemflug, Flucht per Sprung mit DM +5/+15; Reise Tag für Tag | 2026-11-22b, 2026-11-22c |
| 2b | **Crew und Programme**: Schiffspositionen der SC, wirkende Programme (Target, Predict, Gunner Interact, Maneuver/Evade, Auto-Evade, Return Fire), Ausweichen kostet 1 G, Antriebsschaden über den Buchstaben (Drive Potential), Schadenskontrolle 9+ (auch für fremde Schiffe), Software in der Werft, Oberflächen für Crew und Computer; Dekompression bleibt für später | 2026-11-22d (Schadenskontrolle und Antriebsbuchstaben gebaut am 27. November 2026) |

**Was Stufe 2 bewusst vereinfacht hat** (✱ in `regeln-schiffe.md`): keine Programme (jedes Schiff
schießt, als liefe *Target*), keine Schiffspositionen und damit keine Fertigkeits-DMs, kein
Ausweichen, Antriebsschaden als −1 G je Treffer statt über den Buchstaben, Hull-Treffer ohne
Folgen, keine Schadenskontrolle (bis auf die Hull-Treffer mit Stufe 2b nachgeholt). Nur die Gruppe kämpft (`SystemFlight.party`), ein Mutterschiff ohne
Gruppe nicht. Von den fünf Absichten im Konzept gibt es drei; *Entern* und *Abfangen* fehlen, weil es
das Entern noch nicht gibt.

### Offen (Reihenfolge vom Owner bestätigt am 22. November 2026)

| Stufe | Inhalt | Ergebnis |
|---|---|---|
| **3** | **Raketen und Sand**: Standardrakete 5G6 als eigene Einheit mit Brennschluss, Abfangen auf 2.500 km, Kontakt, Detonation 1W Treffer, Anti-Missile, ECM 9+, Nachladen, Munition in der Werft kaufen; Sandwolke als treibende Einheit, −3 je Raumband | Das volle Waffenprogramm der SR |
| **4b** | **Small Craft im Kampf und Entern**: Aussetzen während des Kampfs, Brennstufen nach Mayday, Rotten (ein Schub für mehrere), alle eigenen Einheiten kämpfen; Entern unter 100 km und 0,1 km/s mit Übergang in die Kampfsimulation; Absichten *Entern* und *Abfangen* für NSC | Träger, Enterkommandos, Piraten, die wirklich entern |
| **5** | **Ortung**: Reichweiten 15/60/90 Raumbänder, Schatten der Körper, *Wer schubt, leuchtet* (offen), nicht geortete Einheiten als zuletzt bekannter Ort | Verstecken und Überraschen werden möglich |

Danach (keine eigene Stufe des Raumkampfs): Raketen aus Bauteilen nach Supplement 3, Minen,
Zoll und Patrouille mit dem Handel, Bergung von Wracks.

## Weiteres Gameplay auf der Raumkarte

Der Owner hat gefragt, was dort noch Platz hätte. Ideen, keine davon ist Teil dieses Konzepts.
Die Szenarien aus Mayday (Abschnitt 9) passen fast alle in eine Kampagne:

- **Grand Prix**: Wettflug über mehrere Welten, landen und zurück. In der App als **Flugschule** zum
  Lernen der Bahnen, ohne Waffen.
- **Piraterie**: Ein Free Trader muss mit Fracht durch, ein Korsar versucht, den Kurs anzugleichen
  und zu entern.
- **Schmuggel**: Zollkutter müssen jedes ankommende Schiff anhalten und durchsuchen; mit dem Handel.
- **Angriff** auf eine Basis mit Raketen gegen Jäger, **Schlacht** zweier Welten.

Weitere Ideen:

- **Anflug und Andocken** am Highport oder an einer Orbitalstadt, mit Liegegebühr (gibt es schon).
- **Auftanken am Gasriesen**: Fuel Scoops, unraffinierter Treibstoff, DM +1 auf Antriebspannen; der
  klassische Ort für Piratenüberfälle.
- **Zoll und Patrouille**: Anhalten, Durchsuchung, Schmuggelgut (mit dem Handel).
- **Bergung und Rettung**: ein treibendes Wrack oder eine Rettungskapsel auf ballistischer Bahn
  einholen (*Angleichen*), Beute nach den Regeln der Beute.
- **Asteroidenbergbau** in einem Gürtel (Größe 0).
- **Schiffspannen unterwegs**: Ein Antrieb fällt aus (SR 28), das Schiff treibt und muss mit der
  Schwerkraft eine sichere Bahn finden.

## Was wir bewusst weglassen

| Weggelassen | Warum |
|---|---|
| Echte 3D-Bahnen | auf dem Handy nicht planbar (Owner: 2D) |
| N-Körper-Simulation der Himmelskörper untereinander | im Zeitraum eines Kampfs ohne Wirkung, schwer stabil zu halten |
| Atmosphäre, Luftbremsung, Landen im Kampf | eigener großer Bereich; Landen bleibt beim Raumhafen |
| Drehung und Trägheit des Schiffs um sich selbst | Traveller kennt keine Ausrichtung des Rumpfs; der Schub zeigt sofort in jede Richtung |
| Treibstoff für den Schub im Kampf | nach SR reicht der Tank Wochen; ein Kampf dauert Stunden |
| Relativistische Effekte, Lichtlaufzeit | bei 90 Raumbändern höchstens drei Sekunden, bei 1.000-Sekunden-Runden egal |
| Flottenkampf nach *High Guard* | ohne Karte: Die Entfernung wird gewählt, Bewegung ist nur ein Agility-Wert. Das Gegenteil dieses Konzepts. Brauchbar wären später die Trefferzonen mit Panzerung (Supplement 3 empfiehlt sie) und eigene Schiffsentwürfe; das gehört zu eigenen Schiffsentwürfen, nicht hierher |
| Zerstört nach vier Treffern in einem Zug (Mayday) | die SR haben Trefferzonen; Mayday vereinfacht das für das Brettspiel |
| Sprung erst 40 Felder von einer Welt (Mayday) | in den SR gelten die Sprunggrenzen mit DMs auf den Fehlsprung |
| Programme laden und tauschen je Phase (Mayday, erweiterte Computerregel) | eigener Schritt mit dem Computer; vorerst laufen alle Programme an Bord |

## Entscheidungen

Vom Owner getroffen, am 18. November 2026, wo nicht anders angegeben.

| Frage | Entscheidung |
|---|---|
| Eingabe des Schubs | Ein Schubvektor je Raumrunde, fest im Raum, nur durch Tippen oder Ziehen im Schubkreis; Grenze am Kreis; ohne die Einheit auszuwählen; jede Runde zurück auf 0 G |
| 2D oder 3D | 2D |
| Zugfolge | gleichzeitig |
| Feinheit des Schubs | stufenlos, 0,1 G |
| Einrasten | ja, an prograd, retrograd, Ziel, weg, angleichen |
| Teilvektoren oder kürzere Runden | nein, ein Vektor je 1.000-Sekunden-Runde |
| Weg zur Raumkarte | Globus bleibt beim Tippen auf eine Welt; Raumkarte über den Knopf „Raum“ und von selbst beim Raumkampf |
| Dichte der Welten | immer K = 1, bis Book 6 kommt |
| Himmelskörper | Weltsymbol der App in echter Größe, ohne angedeutete Umlaufbahnen |
| Ausweichen | Maneuver/Evade kostet 1 G (Mayday) |
| Standardrakete | 5G6 (Supplement 3), frei steuerbar |
| ECM | 9+ (Supplement 3) |
| Small Craft | G und Treibstoff ganz nach Mayday |
| Reihenfolge | Raumkampf vor dem Handel |
| Offene Stufen (23. November 2026) | 2b Crew und Programme (gebaut am 23. November 2026, die Wirkung der Programme im Laserkampf folgt als Nächstes) → 3 Raketen und Sand → 4b Small Craft im Kampf und Entern → 5 Ortung |
| Hausregeln (22. November 2026) | werden je Stufe am Ausschnitt der Änderung abgenickt, nicht alle auf einmal |
| Wer schubt, leuchtet (22. November 2026) | bleibt offen bis Stufe 5 |

## Offene Fragen

1. **Wer schubt, leuchtet**: als Hausregel übernehmen? Entscheiden wir mit der Ortung (Stufe 5).
2. **Book 2 (1981)** selbst fehlt noch. Mayday ist seine Brettspielfassung und Supplement 3 nennt
   die Maßstäbe, das reicht für das Konzept. Liegt es doch vor, prüfen wir die Abweichungen.
3. **Hausregeln zum Abnicken** (mit ⚑ markiert), noch offen, je mit der Stufe zu entscheiden, die sie braucht: Abfangen auf 2.500 km und Kontakt
   unter 100 km, Entern unter 100 km und 0,1 km/s, Sand als treibende Wolke, kein Rammen, kein Landen
   im Kampf, Rotten, feste Werte für Gasriesen. (Die Absichten und der Planer der NSC-Schiffe sind
   mit Stufe 2 freigegeben, das Andocken der Small Craft mit 4a.)
